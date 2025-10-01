/**
 * Vibe Scoring Engine - 修正後版本
 * 包含空值安全與信心度評分
 */

import type { EmotionState, SegmentFeatures, Segment, RouteCandidate } from '@models/index';
import vibeWeightsConfig from '@config/vibe-weights.json';

/**
 * 評分單一路段（空值安全版本）
 *
 * 修正：
 * - 加入 undefined/null 檢查
 * - 計算信心度（依可用資料比例）
 * - 資料不足時降低評分權重
 */
export function scoreSegment(
  features: SegmentFeatures,
  weights: Partial<SegmentFeatures>
): { score: number; confidence: number } {
  let score = 0;
  let validCount = 0;
  const totalWeights = Object.keys(weights).length;

  for (const [key, weight] of Object.entries(weights)) {
    const value = features[key as keyof SegmentFeatures];

    // 空值檢查
    if (value !== undefined && value !== null && !isNaN(value)) {
      score += value * weight;
      validCount++;
    }
  }

  // 計算信心度（可用資料比例）
  const confidence = totalWeights > 0 ? validCount / totalWeights : 0;

  // 低於閾值時警告
  const threshold = vibeWeightsConfig.missing_data_confidence_threshold;
  if (confidence < threshold) {
    console.warn(
      `路段資料不足：信心度 ${(confidence * 100).toFixed(1)}% (閾值 ${(threshold * 100).toFixed(1)}%)`
    );
  }

  // 信心度加權
  return {
    score: score * confidence,
    confidence,
  };
}

/**
 * 評分整條路徑
 *
 * 修正：
 * - 加入繞路時間懲罰
 * - 夜間模式安全檢查
 * - 聚合各路段的信心度
 */
export function scorePath(
  segments: Segment[],
  emotion: EmotionState,
  penalties: {
    detourMinutes: number;
    nightMode: boolean;
  }
): { vibeScore: number; avgConfidence: number } {
  const weights = vibeWeightsConfig.emotions[emotion] as Partial<SegmentFeatures>;

  if (!weights) {
    throw new Error(`未定義的情緒狀態: ${emotion}`);
  }

  // 評分所有路段
  const segmentScores = segments.map(seg => scoreSegment(seg.features, weights));

  // 計算平均分數與平均信心度
  const avgScore = segmentScores.reduce((sum, s) => sum + s.score, 0) / segments.length;
  const avgConfidence = segmentScores.reduce((sum, s) => sum + s.confidence, 0) / segments.length;

  // 繞路懲罰
  let penalty = 0;
  penalty += penalties.detourMinutes * vibeWeightsConfig.detour_penalty_per_minute;

  // 夜間模式：檢查是否有低安全路段
  if (penalties.nightMode) {
    const hasUnsafeSegments = segments.some(
      seg => seg.features.light_safety_night < vibeWeightsConfig.night_mode_safety_threshold
    );
    if (hasUnsafeSegments) {
      penalty += vibeWeightsConfig.night_mode_penalty;
    }
  }

  return {
    vibeScore: Math.max(0, avgScore - penalty),
    avgConfidence,
  };
}

/**
 * 路徑差異化標籤生成
 * 依主要特徵自動命名
 */
export function generateRouteLabel(segments: Segment[]): string {
  // 計算各特徵的平均值
  const avgFeatures: Partial<Record<keyof SegmentFeatures, number>> = {};

  for (const seg of segments) {
    for (const [key, value] of Object.entries(seg.features)) {
      if (typeof value === 'number') {
        avgFeatures[key as keyof SegmentFeatures] =
          (avgFeatures[key as keyof SegmentFeatures] || 0) + value / segments.length;
      }
    }
  }

  // 依主導特徵命名
  if ((avgFeatures.green_cover || 0) > 0.7) {
    return '🌳 綠蔭療癒';
  } else if ((avgFeatures.water_proximity || 0) > 0.8) {
    return '🌊 臨水靜謐';
  } else if ((avgFeatures.cafe_density || 0) > 0.6) {
    return '☕ 城市綠走';
  } else if ((avgFeatures.cultural_nodes || 0) > 0.5) {
    return '🎨 文化漫步';
  } else if ((avgFeatures.pedestrian_friendly || 0) > 0.8) {
    return '🚶 步行友善';
  } else {
    return '🧭 推薦路線';
  }
}

/**
 * 取得情緒對應的權重
 */
export function getEmotionWeights(emotion: EmotionState): Partial<SegmentFeatures> {
  return (vibeWeightsConfig.emotions[emotion] || vibeWeightsConfig.emotions.neutral) as Partial<SegmentFeatures>;
}

/**
 * 重排路線（依 vibe 分數）
 */
export function rerankRoutes(
  routes: Array<RouteCandidate & { baseScore?: number }>,
  emotion: EmotionState,
  context: { nightMode: boolean }
): RouteCandidate[] {
  const scored = routes.map((route, index) => {
    const { vibeScore, avgConfidence } = scorePath(
      route.segments,
      emotion,
      {
        detourMinutes: route.detourMinutes,
        nightMode: context.nightMode,
      }
    );

    return {
      ...route,
      vibeScore,
      label: route.label || generateRouteLabel(route.segments),
      // 儲存信心度供 UI 顯示
      metadata: {
        confidence: avgConfidence,
        originalIndex: index,
      },
    };
  });

  // 依 vibe 分數降序排序
  scored.sort((a, b) => b.vibeScore - a.vibeScore);

  return scored;
}
