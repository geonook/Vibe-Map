import { useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { VibeWeights } from '../types/vibe';

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface RouteSegment {
  index: number;
  start: Coordinate;
  end: Coordinate;
  distance: number;
  duration: number;
  summary: string;
  dominantVibe: string;
  vibeScores: VibeWeights;
}

export interface RouteHighlight {
  id: string;
  name: string;
  description: string;
  coordinate: [number, number];
  vibe: string;
}

export interface VibeSummary {
  normalizedWeights: VibeWeights;
  segmentAverages: VibeWeights;
  weightedScore: number;
  dominantVibe: string;
}

export interface RouteCandidate {
  id: string;
  label: string;
  description: string;
  vibe_weights: VibeWeights;
  route: {
    path: string;
    total_distance: number;
    estimated_duration: number;
    vibe_summary: VibeSummary;
  };
  segments: RouteSegment[];
  highlights: RouteHighlight[];
  geojson: {
    type: 'Feature';
    geometry: {
      type: 'LineString';
      coordinates: [number, number][];
    };
    properties: Record<string, unknown>;
  };
  coordinates: [number, number][];
}

export interface VibeRouteResponse {
  storedRoute: Record<string, unknown> | null;
  routes: RouteCandidate[];
  recommendedRouteId?: string;
}

export interface RouteRequestPayload {
  start: Coordinate;
  end: Coordinate;
  vibeWeights: VibeWeights;
  avoidHighways?: boolean;
  preferBikeRoutes?: boolean;
  alternatives?: number;
}

async function fetchVibeRoute(payload: RouteRequestPayload) {
  const { data, error } = await supabase.functions.invoke<VibeRouteResponse>('vibe-routing', {
    body: payload,
  });

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('No data returned from vibe-routing function.');
  }

  return data;
}

export function useVibeRoute() {
  return useMutation({
    mutationFn: fetchVibeRoute,
  });
}
