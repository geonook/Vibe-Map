import { useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { VibeWeights } from '../types/vibe';

export interface RouteFeedbackPayload {
  routeId: string;
  routeLabel: string;
  rating: number;
  comment?: string;
  vibeWeights: VibeWeights;
  storedRouteId?: string | null;
}

async function submitRouteFeedback(payload: RouteFeedbackPayload) {
  const { error } = await supabase.from('route_feedback').insert({
    route_identifier: payload.routeId,
    route_label: payload.routeLabel,
    rating: payload.rating,
    comment: payload.comment?.trim() ? payload.comment.trim() : null,
    vibe_weights: payload.vibeWeights,
    stored_route_id: payload.storedRouteId ?? null,
  });

  if (error) {
    throw error;
  }

  return true;
}

export function useRouteFeedback() {
  return useMutation({
    mutationFn: submitRouteFeedback,
  });
}
