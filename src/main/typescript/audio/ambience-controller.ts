/**
 * Ambience Audio Controller - 修正後版本
 * 平滑淡入淡出的環境音景系統
 */

import type { SegmentFeatures, AmbienceType } from '@models/index';
import { Howl, Howler } from 'howler';

interface AmbienceConfig {
  src: string[];
  volume: number;
  fadeInDuration: number;
  fadeOutDuration: number;
}

export class AmbienceController {
  private players: Map<AmbienceType, Howl> = new Map();
  private currentAmbient: AmbienceType = null;
  private isEnabled: boolean = true;

  constructor() {
    this.initializePlayers();
  }

  /**
   * 初始化所有音景播放器
   */
  private initializePlayers() {
    const configs: Record<Exclude<AmbienceType, null>, AmbienceConfig> = {
      birds: {
        src: ['/audio/birds.mp3', '/audio/birds.webm'],
        volume: 0,
        fadeInDuration: 2000,
        fadeOutDuration: 1500,
      },
      water: {
        src: ['/audio/water.mp3', '/audio/water.webm'],
        volume: 0,
        fadeInDuration: 2500,
        fadeOutDuration: 2000,
      },
      wind: {
        src: ['/audio/wind.mp3', '/audio/wind.webm'],
        volume: 0,
        fadeInDuration: 3000,
        fadeOutDuration: 2000,
      },
      cafe: {
        src: ['/audio/cafe.mp3', '/audio/cafe.webm'],
        volume: 0,
        fadeInDuration: 2000,
        fadeOutDuration: 1500,
      },
    };

    for (const [type, config] of Object.entries(configs)) {
      this.players.set(type as AmbienceType, new Howl({
        src: config.src,
        loop: true,
        volume: 0,
        preload: true,
        html5: true, // 使用 HTML5 Audio 以節省記憶體
      }));
    }
  }

  /**
   * 根據路段特徵更新環境音景
   * 修正：平滑淡入淡出切換
   */
  updateAmbience(features: SegmentFeatures) {
    if (!this.isEnabled) return;

    let targetAmbient: AmbienceType = null;
    let targetVolume = 0;

    // 決定音景類型與音量（依特徵優先級）
    if (features.green_cover > 0.7) {
      targetAmbient = 'birds';
      // 音量隨綠覆率調整（最高 0.4）
      targetVolume = Math.min(features.green_cover * 0.5, 0.4);
    } else if (features.water_proximity > 0.8) {
      targetAmbient = 'water';
      targetVolume = Math.min(features.water_proximity * 0.45, 0.35);
    } else if (features.cafe_density > 0.6) {
      targetAmbient = 'cafe';
      targetVolume = Math.min(features.cafe_density * 0.4, 0.3);
    } else if (features.tree_canopy > 0.6 && features.traffic_volume < 0.3) {
      targetAmbient = 'wind';
      targetVolume = 0.25;
    }

    // 只在音景改變時執行切換
    if (targetAmbient !== this.currentAmbient) {
      this.switchAmbience(targetAmbient, targetVolume);
    } else if (targetAmbient && this.currentAmbient) {
      // 相同音景但音量需要調整
      this.adjustVolume(targetAmbient, targetVolume);
    }
  }

  /**
   * 切換環境音景（平滑淡入淡出）
   */
  private switchAmbience(newAmbient: AmbienceType, targetVolume: number) {
    // 1. 淡出舊音景
    if (this.currentAmbient) {
      const oldPlayer = this.players.get(this.currentAmbient);
      if (oldPlayer && oldPlayer.playing()) {
        const currentVolume = oldPlayer.volume();
        oldPlayer.fade(currentVolume, 0, 1500);

        // 淡出完成後暫停
        setTimeout(() => {
          oldPlayer.pause();
        }, 1500);
      }
    }

    // 2. 淡入新音景
    if (newAmbient) {
      const newPlayer = this.players.get(newAmbient);
      if (newPlayer) {
        // 確保從 0 開始
        newPlayer.volume(0);
        newPlayer.play();

        // 平滑淡入到目標音量
        newPlayer.fade(0, targetVolume, 2000);

        console.log(`音景切換: ${this.currentAmbient} → ${newAmbient} (音量: ${targetVolume.toFixed(2)})`);
      }
    }

    this.currentAmbient = newAmbient;
  }

  /**
   * 調整目前音景音量（無切換）
   */
  private adjustVolume(ambient: AmbienceType, targetVolume: number) {
    const player = this.players.get(ambient);
    if (player && player.playing()) {
      const currentVolume = player.volume();

      // 只在音量差異 > 0.05 時調整
      if (Math.abs(currentVolume - targetVolume) > 0.05) {
        player.fade(currentVolume, targetVolume, 1000);
      }
    }
  }

  /**
   * 停止所有音景
   */
  stopAll() {
    for (const [type, player] of this.players.entries()) {
      if (player.playing()) {
        player.fade(player.volume(), 0, 1000);
        setTimeout(() => player.stop(), 1000);
      }
    }
    this.currentAmbient = null;
  }

  /**
   * 啟用/停用音景
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stopAll();
    }
  }

  /**
   * 設定全域音量
   */
  setMasterVolume(volume: number) {
    Howler.volume(Math.max(0, Math.min(1, volume)));
  }

  /**
   * 取得目前音景
   */
  getCurrentAmbient(): AmbienceType {
    return this.currentAmbient;
  }

  /**
   * 預載所有音檔
   */
  async preloadAll(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const player of this.players.values()) {
      promises.push(new Promise((resolve) => {
        if (player.state() === 'loaded') {
          resolve();
        } else {
          player.once('load', () => resolve());
        }
      }));
    }

    await Promise.all(promises);
    console.log('所有音景已預載');
  }

  /**
   * 清理資源
   */
  dispose() {
    this.stopAll();
    for (const player of this.players.values()) {
      player.unload();
    }
    this.players.clear();
  }
}

/**
 * 建立全域單例
 */
export const ambienceController = new AmbienceController();
