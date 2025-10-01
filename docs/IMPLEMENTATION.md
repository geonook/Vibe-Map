# VibeNav 實作指南

> 完整的實作文件，包含所有技術細節與修正

## 📋 目錄

- [架構概覽](#架構概覽)
- [核心實作](#核心實作)
- [技術修正](#技術修正)
- [部署指南](#部署指南)
- [開發工作流](#開發工作流)

---

## 🏗 架構概覽

### 系統架構圖

```
┌─────────────┐
│   使用者    │
│  (Web App)  │
└──────┬──────┘
       │
       ├──► Service Worker ──► Local Cache (tiles, routes)
       │
       ├──► CDN (CloudFlare)
       │    ├─ Vector Tiles (.pbf)
       │    ├─ Map Style JSON
       │    └─ Audio Assets (birds.mp3, water.mp3)
       │
       ├──► Supabase Edge Functions
       │    ├─ POST /rerank-routes (vibe scoring)
       │    ├─ GET /user-preferences
       │    └─ WebSocket /realtime (社群路線)
       │         │
       │         └──► Supabase Postgres + PostGIS
       │              ├─ users, emotions, routes, feedback
       │              └─ pois (咖啡館、公園、水域)
       │
       └──► Valhalla / GraphHopper (路徑引擎)
            └─ POST /route (基礎路徑計算)
```

### 核心模組

```
src/main/typescript/
├── core/                 # 核心邏輯
│   ├── vibe-scoring.ts   # ✅ 修正後的評分引擎（含空值安全）
│   └── navigation-engine.ts # ✅ 修正後的導航引擎（含方位檢查）
├── services/
│   ├── routing.ts        # ✅ Valhalla post-ranking
│   └── supabase.ts       # Supabase 客戶端
├── models/
│   └── index.ts          # TypeScript 型別定義
├── stores/
│   └── navigation.ts     # Zustand 狀態管理
└── audio/
    └── ambience-controller.ts # ✅ 平滑淡入淡出音景
```

---

## 🔧 核心實作

### 1. Vibe 評分系統

#### 修正重點
- ❌ **原方案**：Valhalla 直接注入 `green_penalty: -0.5`
- ✅ **修正後**：前端 post-ranking

```typescript
// src/main/typescript/core/vibe-scoring.ts

/**
 * 修正：加入空值安全與信心度評分
 */
export function scoreSegment(
  features: SegmentFeatures,
  weights: Partial<SegmentFeatures>
): { score: number; confidence: number } {
  let score = 0;
  let validCount = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const value = features[key as keyof SegmentFeatures];

    // 空值檢查
    if (value !== undefined && value !== null && !isNaN(value)) {
      score += value * weight;
      validCount++;
    }
  }

  // 信心度：可用資料比例
  const confidence = validCount / Object.keys(weights).length;

  // 信心度加權
  return { score: score * confidence, confidence };
}
```

### 2. Valhalla 整合

#### 修正重點
- ❌ **原方案**：修改 Valhalla costing 模組
- ✅ **修正後**：取 3 條基礎路線 → 附加特徵 → 重排

```typescript
// src/main/typescript/services/routing.ts

export async function generateVibeRoutes(
  origin: LatLng,
  destination: LatLng,
  emotion: EmotionState,
  context: { timeOfDay: 'day' | 'night'; supabaseClient: any }
): Promise<RouteCandidate[]> {
  // 1. 從 Valhalla 取得 3 種不同策略的路線
  const baseRoutes = await getBaseRoutesFromValhalla(origin, destination);

  // 2. 從 Supabase/PostGIS 附加空間特徵
  const enriched = await Promise.all(
    baseRoutes.map(route => enrichWithFeatures(route, context.supabaseClient))
  );

  // 3. 計算 vibe 分數並重排
  const reranked = rerankRoutes(enriched, emotion, {
    nightMode: context.timeOfDay === 'night'
  });

  // 4. 取前 3 名
  return reranked.slice(0, 3);
}
```

### 3. PostGIS 優化查詢

#### 修正重點
- ❌ **原方案**：直接用 `geography` 全表掃描
- ✅ **修正後**：bbox 預篩 + geography 精算

```sql
-- supabase/migrations/001_init_schema.sql

CREATE OR REPLACE FUNCTION get_nearby_routes(
  point_lat FLOAT,
  point_lon FLOAT,
  radius_meters INT DEFAULT 500
)
RETURNS TABLE (...)
AS $$
BEGIN
  RETURN QUERY
  WITH nearby AS (
    -- 1. bbox 預篩（快速，使用 GIST 索引）
    SELECT r.id, r.geometry
    FROM routes r
    WHERE r.geometry && ST_Expand(
      search_point::geography,
      radius_meters
    )::geometry
  )
  -- 2. geography 精算距離
  SELECT ...
  FROM nearby n
  WHERE ST_DWithin(
    n.geometry::geography,
    search_point::geography,
    radius_meters
  )
  ORDER BY vibe_score DESC
  LIMIT 10;
END;
$$;
```

### 4. 導航偏航偵測

#### 修正重點
- ❌ **原方案**：只看距離
- ✅ **修正後**：距離 + 方位角 + 連續性

```typescript
// src/main/typescript/core/navigation-engine.ts

private isOffRoute(position: Feature<Point>, heading: number): boolean {
  const nearest = this.findNearestSegmentWithBearing(position);

  // 1. 垂直距離
  const perpDistance = this.perpendicularDistance(position, nearest.line);

  // 2. 方位角差異
  const bearingDiff = Math.abs(
    this.normalizeBearing(heading - nearest.bearing)
  );

  // 3. 判定：距離 > 30m 且方向偏差 > 45° → 偏航
  return (perpDistance > 30 && bearingDiff > 45) || perpDistance > 50;
}
```

### 5. 音景控制器

#### 修正重點
- ❌ **原方案**：直接切換，無淡入淡出
- ✅ **修正後**：平滑 fade 轉場

```typescript
// src/main/typescript/audio/ambience-controller.ts

private switchAmbience(newAmbient: AmbienceType, targetVolume: number) {
  // 1. 淡出舊音景
  if (this.currentAmbient) {
    const oldPlayer = this.players.get(this.currentAmbient);
    oldPlayer?.fade(oldPlayer.volume(), 0, 1500);
    setTimeout(() => oldPlayer?.pause(), 1500);
  }

  // 2. 淡入新音景
  if (newAmbient) {
    const newPlayer = this.players.get(newAmbient);
    newPlayer?.volume(0);
    newPlayer?.play();
    newPlayer?.fade(0, targetVolume, 2000);
  }
}
```

---

## ⚙️ 技術修正總覽

### 已修正的關鍵問題

| 項目 | 原方案 | 修正方案 | 檔案位置 |
|------|--------|----------|---------|
| **Valhalla 權重** | 直接注入 costing | 前端 post-ranking | `services/routing.ts` |
| **PostGIS 查詢** | 直接用 geography | bbox 預篩 + geography | `supabase/migrations/001_init_schema.sql` |
| **評分函式** | 無空值檢查 | 加入信心度評分 | `core/vibe-scoring.ts` |
| **偏航偵測** | 只看距離 | 距離 + 方位 + 連續性 | `core/navigation-engine.ts` |
| **音景切換** | 直接切換 | 平滑淡入淡出 | `audio/ambience-controller.ts` |
| **向量磚** | 直接引用 .mbtiles | 解包或 tile server | 見部署指南 |
| **Service Worker** | 只有 runtime 快取 | precache + runtime | `vite.config.ts` |
| **隱私保護** | 直接存 timestamp | 匿名化到小時 | `supabase/migrations/001_init_schema.sql` |

---

## 🚀 部署指南

### 1. 環境準備

```bash
# 複製環境變數範例
cp .env.example .env

# 編輯環境變數
nano .env
```

```.env
# Valhalla
VITE_VALHALLA_URL=http://localhost:8002

# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-key

# Map
VITE_MAP_STYLE_URL=https://cdn.example.com/style.json
VITE_DEFAULT_CENTER_LAT=25.0330
VITE_DEFAULT_CENTER_LNG=121.5654
```

### 2. Valhalla 部署（Docker）

```bash
# 下載台灣圖資
wget https://download.geofabrik.de/asia/taiwan-latest.osm.pbf

# 啟動 Valhalla
docker run -d \
  -p 8002:8002 \
  -v $(pwd)/valhalla_tiles:/data/valhalla \
  -v $(pwd)/taiwan-latest.osm.pbf:/data/osm/taiwan.pbf \
  --name valhalla \
  ghcr.io/gis-ops/docker-valhalla/valhalla:latest
```

### 3. Supabase 初始化

```bash
# 安裝 Supabase CLI
brew install supabase/tap/supabase

# 初始化專案
npx supabase init

# 啟動本地 Supabase
npx supabase start

# 執行 migrations
npx supabase db push
```

### 4. 向量磚部署

```bash
# 安裝 Tippecanoe
brew install tippecanoe

# 匯出綠地資料（從 OSM）
ogr2ogr -f GeoJSON green-spaces.geojson \
  PG:"dbname=gis" \
  -sql "SELECT way, name FROM planet_osm_polygon WHERE leisure='park'"

# 切磚
tippecanoe -o tiles/green.mbtiles \
  -zg -Z10 -z16 \
  --drop-densest-as-needed \
  green-spaces.geojson

# 解包（供 HTTP 訪問）
npm install -g @mapbox/mbutil
mb-util tiles/green.mbtiles public/tiles/

# 或使用 tileserver-gl
docker run -p 8080:8080 \
  -v $(pwd)/tiles:/data \
  maptiler/tileserver-gl green.mbtiles
```

### 5. 前端建置

```bash
# 安裝依賴
npm install

# 開發模式
npm run dev

# 建置生產版本
npm run build

# 預覽建置
npm run preview
```

---

## 👨‍💻 開發工作流

### 安裝依賴

```bash
npm install
```

### 開發模式

```bash
# 啟動開發伺服器
npm run dev

# 同時啟動 Valhalla（另一終端）
docker start valhalla

# 同時啟動 Supabase（另一終端）
npx supabase start
```

### 測試

```bash
# 單元測試
npm run test

# E2E 測試
npm run test:e2e

# 覆蓋率報告
npm run test:coverage
```

### 型別檢查

```bash
npm run type-check
```

### Lint 與格式化

```bash
# ESLint
npm run lint

# Prettier
npm run format
```

---

## 📊 效能目標

| 指標 | 目標 | 測量方式 |
|------|------|---------|
| 冷啟動時間 | <2s | Performance API |
| 互動延遲 | <50ms | pointerdown → update |
| 地圖 FPS | 穩定 60fps | Chrome DevTools |
| 路徑重算 | <800ms | offRoute → rendered |
| 向量磚載入 | <200ms/tile | Network waterfall |
| Service Worker 快取命中率 | >90% | Application tab |

---

## 🔐 隱私與安全

### 已實作的保護機制

1. **匿名化時間戳**
   ```sql
   recorded_hour TIMESTAMPTZ GENERATED ALWAYS AS
     (date_trunc('hour', recorded_at)) STORED
   ```

2. **Row Level Security (RLS)**
   ```sql
   CREATE POLICY "Users can view own data" ON users
     FOR SELECT USING (auth.uid() = id);
   ```

3. **本地優先**
   - 匿名使用者的情緒記錄僅存本地
   - Service Worker 離線快取路線

---

## 🐛 已知問題與解決方案

### 1. Valhalla 冷啟動慢
**解決**：使用 Docker 持久化容器 + 預載台灣圖資

### 2. PostGIS 查詢逾時
**解決**：bbox 預篩 + 空間索引 + 查詢限制 10 筆

### 3. Service Worker 快取過期
**解決**：設定 7 天過期 + 最多 500 entries

### 4. 音景記憶體洩漏
**解決**：元件卸載時呼叫 `dispose()` 清理

---

## 📚 相關文件

- [核心型別定義](../src/main/typescript/models/index.ts)
- [Vibe 權重設定](../src/main/resources/config/vibe-weights.json)
- [Supabase Schema](../supabase/migrations/001_init_schema.sql)
- [Vite 設定](../vite.config.ts)

---

## 🤝 貢獻指南

1. Fork 專案
2. 建立 feature branch (`git checkout -b feature/amazing-feature`)
3. 確保遵循 [CLAUDE.md](../CLAUDE.md) 規範
4. 提交變更 (`git commit -m 'feat: add amazing feature'`)
5. Push 到分支 (`git push origin feature/amazing-feature`)
6. 開啟 Pull Request

---

**Navigate by feeling, not just destination** 🧭💙
