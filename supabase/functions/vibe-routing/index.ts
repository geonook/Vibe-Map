import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VibeWeights {
  greenery: number
  quietness: number
  culture: number
  scenery: number
}

interface RouteRequest {
  start: { lat: number; lng: number }
  end: { lat: number; lng: number }
  vibeWeights: VibeWeights
  avoidHighways?: boolean
  preferBikeRoutes?: boolean
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user from JWT
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      throw new Error('Not authenticated')
    }

    const routeRequest: RouteRequest = await req.json()

    // Calculate vibe-optimized route
    // This is a simplified example - in production, you'd integrate with
    // routing services like OSRM, Valhalla, or GraphHopper

    const route = await calculateVibeRoute(routeRequest, supabaseClient)

    // Store route in database
    const { data: savedRoute, error: saveError } = await supabaseClient
      .from('routes')
      .insert({
        user_id: user.id,
        start_point: `POINT(${routeRequest.start.lng} ${routeRequest.start.lat})`,
        end_point: `POINT(${routeRequest.end.lng} ${routeRequest.end.lat})`,
        vibe_weights: routeRequest.vibeWeights,
        path: route.path,
        total_distance: route.distance,
        estimated_duration: route.duration,
      })
      .select()
      .single()

    if (saveError) {
      throw saveError
    }

    return new Response(
      JSON.stringify({
        route: savedRoute,
        segments: route.segments
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

async function calculateVibeRoute(request: RouteRequest, supabase: any) {
  // Simplified vibe routing algorithm
  // In production, this would:
  // 1. Query POIs near the route
  // 2. Calculate vibe scores for route segments
  // 3. Use weighted pathfinding to optimize for vibes
  // 4. Return optimized route with segments

  // For now, return a mock route
  return {
    path: `LINESTRING(${request.start.lng} ${request.start.lat}, ${request.end.lng} ${request.end.lat})`,
    distance: 5000, // meters
    duration: 1200, // seconds
    segments: [
      {
        index: 0,
        vibeScores: request.vibeWeights,
        distance: 5000,
        duration: 1200,
      }
    ]
  }
}