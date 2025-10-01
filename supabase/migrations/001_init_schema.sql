-- VibeNav Supabase Schema
-- 包含 PostGIS 空間查詢優化與隱私保護

-- 啟用 PostGIS 擴展
CREATE EXTENSION IF NOT EXISTS postgis;

-- ==================== 使用者表 ====================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  privacy_mode TEXT DEFAULT 'pseudonym' CHECK (privacy_mode IN ('full_anonymous', 'pseudonym', 'public')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 政策：使用者只能查看自己的資料
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- ==================== 情緒記錄表 ====================

CREATE TABLE emotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  state TEXT NOT NULL CHECK (state IN ('sad_low_energy', 'anxious', 'lonely', 'burnt_out', 'neutral')),
  intensity FLOAT CHECK (intensity >= 0 AND intensity <= 1),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),

  -- 隱私保護：模糊化時間（精確到小時）
  recorded_hour TIMESTAMPTZ GENERATED ALWAYS AS (date_trunc('hour', recorded_at)) STORED
);

CREATE INDEX idx_emotions_user_time ON emotions(user_id, recorded_at DESC);
CREATE INDEX idx_emotions_hour ON emotions(recorded_hour);

-- RLS 政策
ALTER TABLE emotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own emotions" ON emotions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own emotions" ON emotions
  FOR SELECT USING (auth.uid() = user_id);

-- ==================== POI 表（咖啡館、公園等） ====================

CREATE TABLE pois (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location GEOMETRY(Point, 4326) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cafe', 'park', 'cultural', 'water', 'green_space')),
  name TEXT,
  green_score FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 空間索引
CREATE INDEX idx_pois_location ON pois USING GIST(location);
CREATE INDEX idx_pois_type ON pois(type);

-- POI 公開可讀
GRANT SELECT ON pois TO anon, authenticated;

-- ==================== 路線表（社群共享路線） ====================

CREATE TABLE routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  geometry GEOMETRY(LineString, 4326) NOT NULL,
  vibe_vector JSONB, -- {green_cover: 0.8, water_proximity: 0.6, ...}
  label TEXT,
  avg_rating FLOAT DEFAULT 0,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 空間索引
CREATE INDEX idx_routes_geom ON routes USING GIST(geometry);
CREATE INDEX idx_routes_rating ON routes(avg_rating DESC);

-- 路線公開可讀
GRANT SELECT ON routes TO anon, authenticated;

-- ==================== 路線候選表（每次請求產生） ====================

CREATE TABLE route_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID,
  emotion_state TEXT,
  route_geom GEOMETRY(LineString, 4326),
  vibe_score FLOAT,
  duration_minutes INT,
  features JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_route_candidates_geom ON route_candidates USING GIST(route_geom);

-- ==================== 回饋表 ====================

CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  helpful BOOLEAN,
  tags TEXT[], -- {'平靜', '安全', '分心', '無感'}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_route ON feedback(route_id);
CREATE INDEX idx_feedback_user ON feedback(user_id);

-- RLS 政策
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit feedback" ON feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback" ON feedback
  FOR SELECT USING (auth.uid() = user_id);

-- ==================== 向量磚清單 ====================

CREATE TABLE tiles_manifest (
  z INT,
  x INT,
  y INT,
  url TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (z, x, y)
);

-- ==================== 優化的空間查詢函式 ====================

/**
 * 取得附近路線（優化版本）
 * 修正：使用 bbox 預篩 + geography 精算
 */
CREATE OR REPLACE FUNCTION get_nearby_routes(
  point_lat FLOAT,
  point_lon FLOAT,
  radius_meters INT DEFAULT 500,
  min_vibe_score FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  geom_json TEXT,
  vibe_score FLOAT,
  label TEXT,
  distance_meters FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
  search_point GEOMETRY;
BEGIN
  -- 建立搜尋點
  search_point := ST_SetSRID(ST_MakePoint(point_lon, point_lat), 4326);

  RETURN QUERY
  WITH nearby AS (
    -- 1. bbox 預篩（快速）
    SELECT
      r.id,
      r.geometry,
      r.vibe_vector,
      r.label
    FROM routes r
    WHERE r.geometry && ST_Expand(
      search_point::geography,
      radius_meters
    )::geometry
  )
  -- 2. geography 精算距離
  SELECT
    n.id,
    ST_AsGeoJSON(n.geometry)::TEXT as geom_json,
    (n.vibe_vector->>'avg_score')::FLOAT as vibe_score,
    n.label,
    ST_Distance(
      n.geometry::geography,
      search_point::geography
    ) as distance_meters
  FROM nearby n
  WHERE ST_DWithin(
    n.geometry::geography,
    search_point::geography,
    radius_meters
  )
  AND (n.vibe_vector->>'avg_score')::FLOAT >= min_vibe_score
  ORDER BY vibe_score DESC, distance_meters ASC
  LIMIT 10;
END;
$$;

/**
 * 取得路徑沿途的空間特徵
 * 用於附加 vibe 特徵到 Valhalla 路線
 */
CREATE OR REPLACE FUNCTION get_path_features(
  line_geom TEXT  -- WKT format: 'LINESTRING(...)'
)
RETURNS TABLE (
  green_cover FLOAT,
  water_proximity FLOAT,
  tree_canopy FLOAT,
  cafe_density FLOAT,
  cultural_nodes FLOAT,
  traffic_volume FLOAT,
  noise_level FLOAT,
  pedestrian_friendly FLOAT,
  slope FLOAT,
  light_safety_night FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
  path GEOMETRY;
  buffer_distance INT := 50; -- 50m buffer
BEGIN
  -- 解析 WKT
  path := ST_GeomFromText(line_geom, 4326);

  RETURN QUERY
  SELECT
    -- 綠覆率（附近綠地面積比例）
    COALESCE(
      SUM(CASE WHEN p.type = 'green_space' THEN 1 ELSE 0 END)::FLOAT /
      GREATEST(COUNT(*), 1),
      0.3
    ) as green_cover,

    -- 臨水距離（反向：越近越高）
    COALESCE(
      1.0 - (MIN(ST_Distance(path, p.location)) / 1000.0),
      0.2
    ) as water_proximity,

    -- 樹蔭（綠地的 green_score 平均）
    COALESCE(AVG(p.green_score) FILTER (WHERE p.type = 'green_space'), 0.25) as tree_canopy,

    -- 咖啡館密度
    COALESCE(
      SUM(CASE WHEN p.type = 'cafe' THEN 1 ELSE 0 END)::FLOAT /
      GREATEST(ST_Length(path::geography) / 1000, 0.1),
      0.1
    ) as cafe_density,

    -- 文化節點
    COALESCE(
      SUM(CASE WHEN p.type = 'cultural' THEN 1 ELSE 0 END)::FLOAT,
      0.0
    ) as cultural_nodes,

    -- 車流量（TODO: 從交通資料計算，暫時預設）
    0.5 as traffic_volume,

    -- 噪音（TODO: 從噪音模型，暫時預設）
    0.5 as noise_level,

    -- 行人友善度（TODO: 從 OSM sidewalk 標籤，暫時預設）
    0.6 as pedestrian_friendly,

    -- 坡度（TODO: 從 DEM 計算，暫時預設）
    0.1 as slope,

    -- 夜間安全（TODO: 從照明資料，暫時預設）
    0.5 as light_safety_night

  FROM pois p
  WHERE ST_DWithin(
    p.location::geography,
    path::geography,
    buffer_distance
  );
END;
$$;

/**
 * 聚合某情緒下的高評分路線
 */
CREATE OR REPLACE FUNCTION get_top_routes_for_emotion(
  emotion_state TEXT,
  min_feedback_count INT DEFAULT 5,
  limit_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  label TEXT,
  avg_helpful FLOAT,
  feedback_count INT,
  geom_json TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.label,
    AVG(f.helpful::int)::FLOAT as avg_helpful,
    COUNT(f.id)::INT as feedback_count,
    ST_AsGeoJSON(r.geometry)::TEXT as geom_json
  FROM routes r
  JOIN route_candidates rc ON ST_Equals(r.geometry, rc.route_geom)
  LEFT JOIN feedback f ON f.route_id = r.id
  WHERE rc.emotion_state = emotion_state
  GROUP BY r.id, r.label, r.geometry
  HAVING COUNT(f.id) >= min_feedback_count
  ORDER BY avg_helpful DESC
  LIMIT limit_count;
END;
$$;

-- ==================== 觸發器：更新 updated_at ====================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
