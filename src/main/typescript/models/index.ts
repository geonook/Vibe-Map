/**
 * VibeNav Core Type Definitions
 * 核心型別定義
 */

import type { Feature, LineString, Point } from 'geojson';

/**
 * 情緒狀態列舉
 */
export enum EmotionState {
  SAD_LOW_ENERGY = 'sad_low_energy',    // 低落/低能量
  ANXIOUS = 'anxious',                   // 焦慮
  LONELY = 'lonely',                     // 孤獨
  BURNT_OUT = 'burnt_out',               // 疲憊/倦怠
  NEUTRAL = 'neutral',                   // 中性
}

/**
 * 路段空間特徵向量
 * 每個路段的 vibe 屬性（0-1 標準化）
 */
export interface SegmentFeatures {
  green_cover: number;          // 綠覆率
  water_proximity: number;      // 臨水距離（越近越高）
  tree_canopy: number;          // 樹蔭指數
  cafe_density: number;         // 咖啡館密度（POI/km²）
  cultural_nodes: number;       // 文化節點數（書店/藝廊/公園）
  traffic_volume: number;       // 車流量（越高越吵）
  noise_level: number;          // 噪音分貝（標準化）
  pedestrian_friendly: number;  // 行人友善度（人行道寬度/安全）
  slope: number;                // 坡度百分比
  light_safety_night: number;   // 夜間照明與安全
  open_space?: number;          // 開放空間（for anxious）
}

/**
 * 路段（包含幾何與特徵）
 */
export interface Segment {
  id: string;
  geometry: Feature<LineString>;
  features: SegmentFeatures;
  streetName?: string;
  distance: number;  // 公尺
}

/**
 * 轉彎指示
 */
export interface TurnInstruction {
  distance: number;              // 距離轉彎點公尺數
  direction: 'left' | 'right' | 'straight' | 'arrive';
  streetName?: string;
  geometry: Feature<Point>;
  bearing?: number;              // 方位角（0-360）
}

/**
 * 路線候選
 */
export interface RouteCandidate {
  id: string;
  path: Feature<LineString>;
  vibeScore: number;            // vibe 評分
  duration: number;             // 秒數
  distance: number;             // 公尺
  segments: Segment[];
  turns: TurnInstruction[];
  label: string;                // 如「綠蔭療癒」「臨水靜謐」
  emotion: EmotionState;
  detourMinutes: number;        // 相較最快路線的繞路時間
}

/**
 * 情緒記錄
 */
export interface EmotionRecord {
  id: string;
  userId?: string;
  state: EmotionState;
  intensity: number;            // 0-1
  timestamp: Date;
}

/**
 * 使用者偏好向量
 * 從回饋學習而來
 */
export interface UserPreferences {
  userId: string;
  preferenceVector: Partial<SegmentFeatures>;
  lastUpdated: Date;
}

/**
 * 路線回饋
 */
export interface RouteFeedback {
  id: string;
  userId?: string;
  routeId: string;
  helpful: boolean;
  tags: string[];  // ['平靜', '安全', '分心', '無感']
  emotionAtStart: EmotionState;
  createdAt: Date;
}

/**
 * 導航狀態
 */
export interface NavigationState {
  isNavigating: boolean;
  currentRoute: RouteCandidate | null;
  currentPosition: Feature<Point> | null;
  currentHeading: number;       // 方位角
  nextTurnIndex: number;
  distanceToNextTurn: number;
  isOffRoute: boolean;
}

/**
 * 地圖視口
 */
export interface MapViewport {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
}

/**
 * Valhalla 路徑請求
 */
export interface ValhallaRouteRequest {
  locations: Array<{ lat: number; lon: number }>;
  costing: 'pedestrian' | 'bicycle' | 'auto';
  alternates?: number;
  units?: 'kilometers' | 'miles';
}

/**
 * Valhalla 路徑回應（簡化）
 */
export interface ValhallaRouteResponse {
  trip: {
    legs: Array<{
      shape: string;              // encoded polyline
      summary: {
        length: number;           // km
        time: number;             // seconds
      };
      maneuvers: Array<{
        instruction: string;
        type: number;
        length: number;
        time: number;
        begin_shape_index: number;
        end_shape_index: number;
      }>;
    }>;
  };
}

/**
 * 環境音景類型
 */
export type AmbienceType = 'birds' | 'water' | 'wind' | 'cafe' | null;

/**
 * 觸覺回饋強度
 */
export type HapticIntensity = 'light' | 'medium' | 'heavy';
