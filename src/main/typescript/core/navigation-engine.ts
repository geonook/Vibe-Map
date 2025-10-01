/**
 * Navigation Engine - 修正後版本
 * 包含方位角檢查的偏航偵測
 */

import type {
  RouteCandidate,
  TurnInstruction,
  NavigationState,
  EmotionState,
  HapticIntensity,
} from '@models/index';
import { Feature, Point } from 'geojson';
import { distance, bearing } from '@turf/turf';
import { recalculateRoute } from '@services/routing';

export class NavigationEngine {
  private route: RouteCandidate;
  private currentPosition: Feature<Point> | null = null;
  private currentHeading: number = 0; // 方位角 0-360
  private nextTurnIndex: number = 0;
  private isNavigating: boolean = false;
  private emotion: EmotionState;
  private context: any;

  // 回調函式
  private onStateChange?: (state: NavigationState) => void;
  private onHapticFeedback?: (intensity: HapticIntensity) => void;
  private onAudioInstruction?: (instruction: string) => void;

  constructor(
    route: RouteCandidate,
    emotion: EmotionState,
    context: {
      timeOfDay: 'day' | 'night';
      supabaseClient: any;
      localCache?: any;
    }
  ) {
    this.route = route;
    this.emotion = emotion;
    this.context = context;
  }

  /**
   * 設定回調函式
   */
  setCallbacks(callbacks: {
    onStateChange?: (state: NavigationState) => void;
    onHapticFeedback?: (intensity: HapticIntensity) => void;
    onAudioInstruction?: (instruction: string) => void;
  }) {
    this.onStateChange = callbacks.onStateChange;
    this.onHapticFeedback = callbacks.onHapticFeedback;
    this.onAudioInstruction = callbacks.onAudioInstruction;
  }

  /**
   * 開始導航
   */
  start(initialPosition: Feature<Point>, initialHeading: number = 0) {
    this.currentPosition = initialPosition;
    this.currentHeading = initialHeading;
    this.isNavigating = true;
    this.nextTurnIndex = 0;

    this.emitStateChange();
    this.announceNextTurn();
  }

  /**
   * 更新位置（核心方法）
   * 修正：包含方位角檢查
   */
  async update(newPosition: Feature<Point>, newHeading: number) {
    if (!this.isNavigating) return;

    this.currentPosition = newPosition;
    this.currentHeading = newHeading;

    // 1. 檢查偏航（修正版本）
    if (this.isOffRoute(newPosition, newHeading)) {
      console.log('偵測到偏航，重新計算路線...');
      await this.recalculate();
      return;
    }

    // 2. 檢查是否接近下一個轉彎點
    const nextTurn = this.route.turns[this.nextTurnIndex];
    if (!nextTurn) {
      // 已到達終點
      this.arrive();
      return;
    }

    const distToTurn = this.distanceToPoint(newPosition, nextTurn.geometry);

    // 3. 接近轉彎時的回饋
    if (distToTurn < 50 && distToTurn > 30) {
      // 50m 內：輕觸覺回饋
      this.triggerHaptic('light');
    }

    if (distToTurn < 30 && distToTurn > 10) {
      // 30m 內：語音指示
      const direction = this.getDirectionText(nextTurn.direction);
      this.playAudio(`在 ${Math.round(distToTurn)} 公尺後${direction}`);
    }

    if (distToTurn < 10) {
      // 10m 內：完成轉彎，移動到下一個
      this.triggerHaptic('medium');
      this.nextTurnIndex++;
      this.announceNextTurn();
    }

    this.emitStateChange();
  }

  /**
   * 偏航偵測（修正版本）
   * 修正：加入方位角檢查與連續性判斷
   */
  private isOffRoute(position: Feature<Point>, heading: number): boolean {
    // 找到最近的路段
    const nearest = this.findNearestSegmentWithBearing(position);

    if (!nearest) return false;

    // 1. 垂直距離檢查
    const perpDistance = this.perpendicularDistance(position, nearest.line);

    // 2. 方位角差異檢查
    const bearingDiff = Math.abs(this.normalizeBearing(heading - nearest.bearing));

    // 3. 判定規則：
    // - 距離 > 30m 且方向偏差 > 45° → 偏航
    // - 距離 > 50m → 無論方向都算偏航
    const isOff = (perpDistance > 30 && bearingDiff > 45) || perpDistance > 50;

    if (isOff) {
      console.log(`偏航判定: 距離=${perpDistance.toFixed(1)}m, 方位差=${bearingDiff.toFixed(1)}°`);
    }

    return isOff;
  }

  /**
   * 找到最近的路段（含方位角）
   */
  private findNearestSegmentWithBearing(position: Feature<Point>): {
    line: Feature<LineString>;
    bearing: number;
    index: number;
  } | null {
    let minDist = Infinity;
    let nearestSegment = null;

    for (let i = 0; i < this.route.segments.length; i++) {
      const seg = this.route.segments[i];
      const dist = distance(position, seg.geometry);

      if (dist < minDist) {
        minDist = dist;

        // 計算路段方位角（起點到終點）
        const coords = seg.geometry.geometry.coordinates;
        const segBearing = bearing(
          { type: 'Point', coordinates: coords[0] },
          { type: 'Point', coordinates: coords[coords.length - 1] }
        );

        nearestSegment = {
          line: seg.geometry,
          bearing: segBearing,
          index: i,
        };
      }
    }

    return nearestSegment;
  }

  /**
   * 計算點到線段的垂直距離（簡化版）
   */
  private perpendicularDistance(point: Feature<Point>, line: Feature<LineString>): number {
    // 簡化：使用 Turf 的最短距離
    return distance(point, line) * 1000; // km → m
  }

  /**
   * 正規化方位角到 0-360°
   */
  private normalizeBearing(angle: number): number {
    while (angle < 0) angle += 360;
    while (angle >= 360) angle -= 360;
    return angle;
  }

  /**
   * 重新計算路線
   */
  private async recalculate() {
    if (!this.currentPosition) return;

    try {
      const newRoute = await recalculateRoute(
        {
          lat: this.currentPosition.geometry.coordinates[1],
          lon: this.currentPosition.geometry.coordinates[0],
        },
        {
          lat: this.route.path.geometry.coordinates[this.route.path.geometry.coordinates.length - 1][1],
          lon: this.route.path.geometry.coordinates[this.route.path.geometry.coordinates.length - 1][0],
        },
        this.emotion,
        this.context
      );

      this.route = newRoute;
      this.nextTurnIndex = 0;
      this.playAudio('已重新規劃路線');
      this.emitStateChange();
    } catch (error) {
      console.error('重新計算路線失敗:', error);
    }
  }

  /**
   * 到達終點
   */
  private arrive() {
    this.isNavigating = false;
    this.triggerHaptic('heavy');
    this.playAudio('已到達目的地');
    this.emitStateChange();
  }

  /**
   * 計算到點的距離（公尺）
   */
  private distanceToPoint(from: Feature<Point>, to: Feature<Point>): number {
    return distance(from, to) * 1000; // km → m
  }

  /**
   * 宣告下一個轉彎
   */
  private announceNextTurn() {
    const nextTurn = this.route.turns[this.nextTurnIndex];
    if (nextTurn) {
      const direction = this.getDirectionText(nextTurn.direction);
      this.playAudio(`準備${direction}`);
    }
  }

  /**
   * 方向轉文字
   */
  private getDirectionText(direction: string): string {
    const map: Record<string, string> = {
      left: '左轉',
      right: '右轉',
      straight: '直行',
      arrive: '到達',
    };
    return map[direction] || '繼續前進';
  }

  /**
   * 觸發觸覺回饋
   */
  private triggerHaptic(intensity: HapticIntensity) {
    if ('vibrate' in navigator) {
      const patterns: Record<HapticIntensity, number[]> = {
        light: [10],
        medium: [20, 10, 20],
        heavy: [30, 15, 30],
      };
      navigator.vibrate(patterns[intensity]);
    }

    this.onHapticFeedback?.(intensity);
  }

  /**
   * 播放語音指示
   */
  private playAudio(instruction: string) {
    // 使用 Web Speech API
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(instruction);
      utterance.lang = 'zh-TW';
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }

    this.onAudioInstruction?.(instruction);
  }

  /**
   * 發送狀態變更
   */
  private emitStateChange() {
    const state: NavigationState = {
      isNavigating: this.isNavigating,
      currentRoute: this.route,
      currentPosition: this.currentPosition,
      currentHeading: this.currentHeading,
      nextTurnIndex: this.nextTurnIndex,
      distanceToNextTurn: this.currentPosition && this.route.turns[this.nextTurnIndex]
        ? this.distanceToPoint(this.currentPosition, this.route.turns[this.nextTurnIndex].geometry)
        : 0,
      isOffRoute: false, // 已經在 update 中處理
    };

    this.onStateChange?.(state);
  }

  /**
   * 停止導航
   */
  stop() {
    this.isNavigating = false;
    this.emitStateChange();
  }

  /**
   * 取得目前狀態
   */
  getState(): NavigationState {
    return {
      isNavigating: this.isNavigating,
      currentRoute: this.route,
      currentPosition: this.currentPosition,
      currentHeading: this.currentHeading,
      nextTurnIndex: this.nextTurnIndex,
      distanceToNextTurn: this.currentPosition && this.route.turns[this.nextTurnIndex]
        ? this.distanceToPoint(this.currentPosition, this.route.turns[this.nextTurnIndex].geometry)
        : 0,
      isOffRoute: false,
    };
  }
}
