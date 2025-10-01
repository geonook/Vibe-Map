/**
 * Routing Service - Valhalla 整合
 * 修正版：使用 post-ranking 而非直接 costing 注入
 */

import type {
  RouteCandidate,
  ValhallaRouteRequest,
  ValhallaRouteResponse,
  EmotionState,
  Segment,
  SegmentFeatures,
} from '@models/index';
import { rerankRoutes } from '@core/vibe-scoring';
import * as polyline from '@mapbox/polyline';

const VALHALLA_ENDPOINT = import.meta.env.VITE_VALHALLA_URL || 'http://localhost:8002';

/**
 * 從 Valhalla 取得基礎路線
 * 策略：取得 3 種不同類型的路線作為候選
 */
async function getBaseRoutesFromValhalla(
  origin: { lat: number; lon: number },
  destination: { lat: number; lon: number }
): Promise<ValhallaRouteResponse[]> {
  // 策略 1: 最快路線（預設行人模式）
  const fastestRequest: ValhallaRouteRequest = {
    locations: [origin, destination],
    costing: 'pedestrian',
    alternates: 1,
  };

  // 策略 2: 較安全路線（偏好人行道）
  const saferRequest: ValhallaRouteRequest = {
    locations: [origin, destination],
    costing: 'pedestrian',
    costing_options: {
      pedestrian: {
        walkway_factor: 1.5,      // 偏好專用步道
        sidewalk_factor: 1.3,     // 偏好有人行道
        alley_factor: 0.5,        // 避開小巷
        use_hills: 0.3,           // 降低坡度影響
      },
    },
  };

  // 策略 3: 單車友善路線（作為備選）
  const bicycleRequest: ValhallaRouteRequest = {
    locations: [origin, destination],
    costing: 'bicycle',
  };

  try {
    const [fastest, safer, bicycle] = await Promise.all([
      fetch(`${VALHALLA_ENDPOINT}/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fastestRequest),
      }).then(res => res.json()),
      fetch(`${VALHALLA_ENDPOINT}/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saferRequest),
      }).then(res => res.json()),
      fetch(`${VALHALLA_ENDPOINT}/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bicycleRequest),
      }).then(res => res.json()),
    ]);

    return [fastest, safer, bicycle].filter(Boolean);
  } catch (error) {
    console.error('Valhalla 路徑請求失敗:', error);
    throw new Error('無法取得路徑，請檢查 Valhalla 服務');
  }
}

/**
 * 附加空間特徵到路線
 * 從 Supabase/PostGIS 查詢沿途路段的 vibe 特徵
 */
async function enrichWithFeatures(
  route: ValhallaRouteResponse,
  supabaseClient: any
): Promise<RouteCandidate> {
  const leg = route.trip.legs[0];

  // 解碼 Valhalla 的 encoded polyline
  const coordinates = polyline.decode(leg.shape);
  const geometry = {
    type: 'LineString' as const,
    coordinates: coordinates.map(([lat, lng]) => [lng, lat]),
  };

  // 呼叫 Supabase RPC 取得路段特徵
  // 注意：這個函式需要在 Supabase 中定義（見 schema 部分）
  const { data: features, error } = await supabaseClient.rpc('get_path_features', {
    line_geom: `LINESTRING(${geometry.coordinates.map(c => c.join(' ')).join(',')})`,
  });

  if (error) {
    console.warn('無法取得路段特徵，使用預設值:', error);
  }

  // 將路線分段（每個 maneuver 一段）
  const segments: Segment[] = leg.maneuvers.map((maneuver, idx) => {
    // 從特徵資料中找對應的路段
    const segmentFeatures: SegmentFeatures = features?.[idx] || {
      green_cover: 0.3,
      water_proximity: 0.2,
      tree_canopy: 0.25,
      cafe_density: 0.1,
      cultural_nodes: 0.1,
      traffic_volume: 0.5,
      noise_level: 0.5,
      pedestrian_friendly: 0.6,
      slope: 0.1,
      light_safety_night: 0.5,
    };

    return {
      id: `seg-${idx}`,
      geometry: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: geometry.coordinates.slice(
            maneuver.begin_shape_index,
            maneuver.end_shape_index
          ),
        },
      },
      features: segmentFeatures,
      streetName: maneuver.instruction,
      distance: maneuver.length * 1000, // km → m
    };
  });

  return {
    id: `route-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    path: {
      type: 'Feature',
      properties: {},
      geometry,
    },
    vibeScore: 0, // 待後續計算
    duration: leg.summary.time,
    distance: leg.summary.length * 1000,
    segments,
    turns: leg.maneuvers.map((m, idx) => ({
      distance: m.length * 1000,
      direction: mapManeuverType(m.type),
      streetName: m.instruction,
      geometry: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: geometry.coordinates[m.begin_shape_index],
        },
      },
    })),
    label: '',
    emotion: 'neutral',
    detourMinutes: 0,
  };
}

/**
 * 將 Valhalla maneuver type 轉為簡化方向
 */
function mapManeuverType(type: number): 'left' | 'right' | 'straight' | 'arrive' {
  // Valhalla maneuver types: https://valhalla.github.io/valhalla/api/turn-by-turn/api-reference/
  if (type === 4) return 'arrive';
  if (type >= 7 && type <= 9) return 'right';
  if (type >= 10 && type <= 12) return 'left';
  return 'straight';
}

/**
 * 主要路徑生成函式（完整 post-ranking 流程）
 */
export async function generateVibeRoutes(
  origin: { lat: number; lon: number },
  destination: { lat: number; lon: number },
  emotion: EmotionState,
  context: {
    timeOfDay: 'day' | 'night';
    supabaseClient: any;
  }
): Promise<RouteCandidate[]> {
  // 1. 從 Valhalla 取得基礎路線
  const baseRoutes = await getBaseRoutesFromValhalla(origin, destination);

  if (baseRoutes.length === 0) {
    throw new Error('無法生成任何路線');
  }

  // 2. 附加空間特徵
  const enrichedRoutes = await Promise.all(
    baseRoutes.map(route => enrichWithFeatures(route, context.supabaseClient))
  );

  // 計算繞路時間（相對於最快路線）
  const fastestDuration = Math.min(...enrichedRoutes.map(r => r.duration));
  enrichedRoutes.forEach(route => {
    route.detourMinutes = (route.duration - fastestDuration) / 60;
    route.emotion = emotion;
  });

  // 3. 使用 vibe 評分重排
  const reranked = rerankRoutes(enrichedRoutes, emotion, {
    nightMode: context.timeOfDay === 'night',
  });

  // 4. 取前 3 名
  return reranked.slice(0, 3);
}

/**
 * 快速重算路線（偏航時使用）
 * 優先從本地快取載入
 */
export async function recalculateRoute(
  currentPosition: { lat: number; lon: number },
  destination: { lat: number; lon: number },
  emotion: EmotionState,
  context: {
    timeOfDay: 'day' | 'night';
    supabaseClient: any;
    localCache?: any;
  }
): Promise<RouteCandidate> {
  // 嘗試從快取載入
  if (context.localCache) {
    const cached = await context.localCache.getNearby(currentPosition, 100); // 100m 範圍
    if (cached) {
      console.log('使用快取路線');
      return cached;
    }
  }

  // 快取未命中，重新計算
  const routes = await generateVibeRoutes(
    currentPosition,
    destination,
    emotion,
    context
  );

  return routes[0]; // 返回最佳路線
}
