/**
 * Supabase Client Configuration
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('缺少 Supabase 環境變數：VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'vibenav',
    },
  },
});

/**
 * 取得附近路線（使用優化的 PostGIS 函式）
 */
export async function getNearbyRoutes(
  lat: number,
  lon: number,
  radiusMeters: number = 500,
  minVibeScore: number = 0.7
) {
  const { data, error } = await supabase.rpc('get_nearby_routes', {
    point_lat: lat,
    point_lon: lon,
    radius_meters: radiusMeters,
    min_vibe_score: minVibeScore,
  });

  if (error) {
    console.error('取得附近路線失敗:', error);
    throw error;
  }

  return data;
}

/**
 * 取得路徑特徵（PostGIS 查詢）
 */
export async function getPathFeatures(lineWkt: string) {
  const { data, error } = await supabase.rpc('get_path_features', {
    line_geom: lineWkt,
  });

  if (error) {
    console.error('取得路徑特徵失敗:', error);
    throw error;
  }

  return data;
}

/**
 * 提交路線回饋
 */
export async function submitFeedback(
  routeId: string,
  helpful: boolean,
  tags: string[]
) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('需要登入才能提交回饋');
  }

  const { data, error } = await supabase.from('feedback').insert({
    user_id: user.id,
    route_id: routeId,
    helpful,
    tags,
  });

  if (error) {
    console.error('提交回饋失敗:', error);
    throw error;
  }

  return data;
}

/**
 * 記錄情緒狀態
 */
export async function recordEmotion(
  state: string,
  intensity: number
) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // 匿名使用者：不記錄到資料庫
    console.log('匿名使用者，情緒僅在本地記錄');
    return null;
  }

  const { data, error } = await supabase.from('emotions').insert({
    user_id: user.id,
    state,
    intensity,
  });

  if (error) {
    console.error('記錄情緒失敗:', error);
    throw error;
  }

  return data;
}
