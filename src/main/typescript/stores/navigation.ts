/**
 * Navigation State Management (Zustand)
 */

import { create } from 'zustand';
import type {
  NavigationState,
  RouteCandidate,
  EmotionState,
  MapViewport,
} from '@models/index';

interface NavigationStore extends NavigationState {
  // 動作
  setRoute: (route: RouteCandidate) => void;
  updatePosition: (position: NavigationState['currentPosition'], heading: number) => void;
  setNavigating: (isNavigating: boolean) => void;
  setOffRoute: (isOffRoute: boolean) => void;
  nextTurn: () => void;
  reset: () => void;
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  // 初始狀態
  isNavigating: false,
  currentRoute: null,
  currentPosition: null,
  currentHeading: 0,
  nextTurnIndex: 0,
  distanceToNextTurn: 0,
  isOffRoute: false,

  // 動作
  setRoute: (route) => set({ currentRoute: route, nextTurnIndex: 0 }),

  updatePosition: (position, heading) =>
    set({ currentPosition: position, currentHeading: heading }),

  setNavigating: (isNavigating) => set({ isNavigating }),

  setOffRoute: (isOffRoute) => set({ isOffRoute }),

  nextTurn: () =>
    set((state) => ({ nextTurnIndex: state.nextTurnIndex + 1 })),

  reset: () =>
    set({
      isNavigating: false,
      currentRoute: null,
      currentPosition: null,
      currentHeading: 0,
      nextTurnIndex: 0,
      distanceToNextTurn: 0,
      isOffRoute: false,
    }),
}));

/**
 * Emotion State Store
 */
interface EmotionStore {
  currentEmotion: EmotionState;
  intensity: number;
  setEmotion: (emotion: EmotionState, intensity?: number) => void;
}

export const useEmotionStore = create<EmotionStore>((set) => ({
  currentEmotion: 'neutral',
  intensity: 0.5,

  setEmotion: (emotion, intensity = 0.5) =>
    set({ currentEmotion: emotion, intensity }),
}));

/**
 * Map Viewport Store
 */
interface MapStore {
  viewport: MapViewport;
  setViewport: (viewport: Partial<MapViewport>) => void;
  routes: RouteCandidate[];
  selectedRouteIndex: number;
  setRoutes: (routes: RouteCandidate[]) => void;
  selectRoute: (index: number) => void;
}

export const useMapStore = create<MapStore>((set) => ({
  viewport: {
    latitude: parseFloat(import.meta.env.VITE_DEFAULT_CENTER_LAT || '25.0330'),
    longitude: parseFloat(import.meta.env.VITE_DEFAULT_CENTER_LNG || '121.5654'),
    zoom: parseFloat(import.meta.env.VITE_DEFAULT_ZOOM || '14'),
    bearing: 0,
    pitch: 0,
  },

  routes: [],
  selectedRouteIndex: 0,

  setViewport: (newViewport) =>
    set((state) => ({
      viewport: { ...state.viewport, ...newViewport },
    })),

  setRoutes: (routes) =>
    set({ routes, selectedRouteIndex: routes.length > 0 ? 0 : -1 }),

  selectRoute: (index) => set({ selectedRouteIndex: index }),
}));
