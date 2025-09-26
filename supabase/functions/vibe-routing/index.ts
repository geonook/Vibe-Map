import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type VibeDimension = 'greenery' | 'quietness' | 'culture' | 'scenery'

type VibeWeights = Record<VibeDimension, number>

interface RoutePoint {
  lat: number
  lng: number
}

interface RouteRequest {
  start: RoutePoint
  end: RoutePoint
  vibeWeights: VibeWeights
  avoidHighways?: boolean
  preferBikeRoutes?: boolean
  alternatives?: number
}

interface RouteCandidatePlan {
  id: string
  label: string
  description: string
  weights: VibeWeights
}

interface RouteCandidateResponse {
  id: string
  label: string
  description: string
  vibe_weights: VibeWeights
  route: {
    path: string
    total_distance: number
    estimated_duration: number
    vibe_summary: VibeSummary
  }
  segments: RouteSegment[]
  highlights: RouteHighlight[]
  geojson: {
    type: 'Feature'
    geometry: {
      type: 'LineString'
      coordinates: [number, number][]
    }
    properties: Record<string, unknown>
  }
  coordinates: [number, number][]
}

interface RouteHighlight {
  id: string
  name: string
  description: string
  coordinate: [number, number]
  vibe: VibeDimension
}

interface RouteSegment {
  index: number
  start: RoutePoint
  end: RoutePoint
  distance: number
  duration: number
  vibeScores: VibeWeights
  summary: string
  dominantVibe: VibeDimension
}

interface VibeSummary {
  normalizedWeights: VibeWeights
  segmentAverages: VibeWeights
  weightedScore: number
  dominantVibe: VibeDimension
}

interface CalculatedRoute {
  path: string
  points: [number, number][]
  distance: number
  duration: number
  segments: RouteSegment[]
  vibeSummary: VibeSummary
  geojson: {
    type: 'Feature'
    geometry: {
      type: 'LineString'
      coordinates: [number, number][]
    }
    properties: Record<string, unknown>
  }
  highlights: RouteHighlight[]
}

function buildCandidatePlans(request: RouteRequest): RouteCandidatePlan[] {
  const normalizedBase = normalizeWeights(request.vibeWeights)
  const basePlan: RouteCandidatePlan = {
    id: 'custom-blend',
    label: 'Your mix',
    description: 'Mirrors the vibe weights you selected.',
    weights: normalizedBase,
  }

  const requestedAlternatives =
    typeof request.alternatives === 'number' && Number.isFinite(request.alternatives)
      ? Math.floor(request.alternatives)
      : 0
  const maxAlternatives = Math.max(0, Math.min(requestedAlternatives, 4))
  if (maxAlternatives === 0) {
    return [basePlan]
  }

  const alternatives: RouteCandidatePlan[] = []
  let remainingSlots = maxAlternatives

  if (remainingSlots > 0) {
    const balancedWeights: VibeWeights = {
      greenery: 0.25,
      quietness: 0.25,
      culture: 0.25,
      scenery: 0.25,
    }

    alternatives.push({
      id: 'balanced-explorer',
      label: 'Balanced explorer',
      description: 'Smoothly redistributes vibes for a varied stroll.',
      weights: blendWeights(normalizedBase, balancedWeights, 0.5),
    })
    remainingSlots -= 1
  }

  if (remainingSlots > 0) {
    const rankedDimensions = (Object.entries(normalizedBase) as [VibeDimension, number][]).sort(
      (a, b) => b[1] - a[1]
    )

    for (const [dimension] of rankedDimensions) {
      if (remainingSlots <= 0) break
      alternatives.push({
        id: `${dimension}-focus`,
        label: `${capitalize(dimension)} focus`,
        description: `Boosts ${dimension} segments for stronger moments along the walk.`,
        weights: emphasizeDimension(normalizedBase, dimension),
      })
      remainingSlots -= 1
    }
  }

  return [basePlan, ...alternatives]
}

function blendWeights(base: VibeWeights, target: VibeWeights, factor: number): VibeWeights {
  const ratio = clamp(factor, 0, 1)
  const blended = (Object.keys(base) as VibeDimension[]).reduce((acc, key) => {
    acc[key] = base[key] * (1 - ratio) + target[key] * ratio
    return acc
  }, {} as VibeWeights)

  return normalizeWeights(blended)
}

function emphasizeDimension(weights: VibeWeights, dimension: VibeDimension): VibeWeights {
  const boosted = { ...weights }
  const boostAmount = Math.min(0.35, 1 - boosted[dimension])
  boosted[dimension] = boosted[dimension] + boostAmount

  const remainingKeys = (Object.keys(boosted) as VibeDimension[]).filter((key) => key !== dimension)
  const originalRemainingTotal = remainingKeys.reduce((sum, key) => sum + weights[key], 0)
  const remainingShare = 1 - boosted[dimension]

  remainingKeys.forEach((key) => {
    if (originalRemainingTotal <= 0) {
      boosted[key] = remainingShare / remainingKeys.length
    } else {
      boosted[key] = Math.max(0.05, (weights[key] / originalRemainingTotal) * remainingShare)
    }
  })

  return normalizeWeights(boosted)
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? undefined

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const routeRequest: RouteRequest = await req.json()

    const candidatePlans = buildCandidatePlans(routeRequest)
    const calculatedRoutes = await Promise.all(
      candidatePlans.map((plan) =>
        calculateVibeRoute({
          start: routeRequest.start,
          end: routeRequest.end,
          vibeWeights: plan.weights,
          avoidHighways: routeRequest.avoidHighways,
          preferBikeRoutes: routeRequest.preferBikeRoutes,
        })
      )
    )

    const candidateResponses: RouteCandidateResponse[] = candidatePlans.map((plan, index) => {
      const route = calculatedRoutes[index]

      return {
        id: plan.id,
        label: plan.label,
        description: plan.description,
        vibe_weights: plan.weights,
        route: {
          path: route.path,
          total_distance: route.distance,
          estimated_duration: route.duration,
          vibe_summary: route.vibeSummary,
        },
        segments: route.segments,
        highlights: route.highlights,
        geojson: route.geojson,
        coordinates: route.points,
      }
    })

    if (!candidateResponses.length) {
      throw new Error('Unable to generate vibe route candidates')
    }

    const recommendedRoute = candidateResponses.reduce((best, candidate) => {
      if (!best) return candidate
      return candidate.route.vibe_summary.weightedScore > best.route.vibe_summary.weightedScore ? candidate : best
    }, null as RouteCandidateResponse | null)

    const recommendedRouteId = recommendedRoute?.id ?? candidateResponses[0]?.id

    const routeForPersistence =
      candidateResponses.find((candidate) => candidate.id === recommendedRouteId) ?? candidateResponses[0]

    let storedRoute: Record<string, unknown> | null = null

    if (authHeader) {
      try {
        const authedClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          {
            global: {
              headers: { Authorization: authHeader },
            },
          }
        )

        const {
          data: { user },
        } = await authedClient.auth.getUser()

        if (user) {
          const { data, error } = await supabaseAdmin
            .from('routes')
            .insert({
              user_id: user.id,
              start_point: `POINT(${routeRequest.start.lng} ${routeRequest.start.lat})`,
              end_point: `POINT(${routeRequest.end.lng} ${routeRequest.end.lat})`,
              vibe_weights: routeForPersistence.vibe_weights ?? routeRequest.vibeWeights,
              path: routeForPersistence.route.path,
              total_distance: routeForPersistence.route.total_distance,
              estimated_duration: routeForPersistence.route.estimated_duration
            })
            .select()
            .single()

          if (error) {
            console.error('Failed to persist route', error)
          } else {
            storedRoute = data
          }
        }
      } catch (storeError) {
        console.error('Error storing route', storeError)
      }
    }

    return new Response(
      JSON.stringify({
        storedRoute,
        routes: candidateResponses,
        recommendedRouteId,
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

async function calculateVibeRoute(request: RouteRequest): Promise<CalculatedRoute> {
  const { start, end, vibeWeights } = request

  const normalizedWeights = normalizeWeights(vibeWeights)
  const segmentCount = 4
  const points: [number, number][] = []

  for (let i = 0; i <= segmentCount; i++) {
    const t = i / segmentCount
    const baseLat = interpolate(start.lat, end.lat, t)
    const baseLng = interpolate(start.lng, end.lng, t)
    const offset = calculateOffset(normalizedWeights, t)

    points.push([baseLng + offset.lng, baseLat + offset.lat])
  }

  const segments: RouteSegment[] = []
  let totalDistance = 0

  for (let i = 0; i < points.length - 1; i++) {
    const [startLng, startLat] = points[i]
    const [endLng, endLat] = points[i + 1]
    const distance = haversineDistance({ lat: startLat, lng: startLng }, { lat: endLat, lng: endLng })
    totalDistance += distance

    const vibeProfile = calculateSegmentVibes(normalizedWeights, i, segmentCount)
    const dominantVibe = getDominantVibe(vibeProfile)
    const duration = calculateDuration(distance, dominantVibe)

    segments.push({
      index: i,
      start: { lat: startLat, lng: startLng },
      end: { lat: endLat, lng: endLng },
      distance,
      duration,
      vibeScores: vibeProfile,
      summary: buildSegmentSummary(vibeProfile),
      dominantVibe,
    })
  }

  const totalDuration = segments.reduce((sum, segment) => sum + segment.duration, 0)
  const vibeSummary = buildVibeSummary(normalizedWeights, segments)

  return {
    path: createLinestring(points),
    points,
    distance: Math.round(totalDistance),
    duration: Math.round(totalDuration),
    segments,
    vibeSummary,
    geojson: {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: points,
      },
      properties: {
        weightedScore: vibeSummary.weightedScore,
        dominantVibe: vibeSummary.dominantVibe,
      },
    },
    highlights: buildHighlights(points, normalizedWeights),
  }
}

function interpolate(start: number, end: number, t: number) {
  return start + (end - start) * t
}

function normalizeWeights(weights: VibeWeights): VibeWeights {
  const entries = Object.entries(weights) as [VibeDimension, number][]
  const total = entries.reduce((sum, [, value]) => sum + (isFinite(value) ? Math.max(value, 0) : 0), 0)
  if (total <= 0) {
    return {
      greenery: 0.25,
      quietness: 0.25,
      culture: 0.25,
      scenery: 0.25,
    }
  }

  return entries.reduce((acc, [key, value]) => {
    acc[key] = Math.max(value, 0) / total
    return acc
  }, {} as VibeWeights)
}

function calculateOffset(weights: VibeWeights, t: number) {
  const sway = Math.sin(Math.PI * t)
  const drift = Math.cos(Math.PI * t)

  const latInfluence = (weights.greenery - weights.culture) * 0.0025
  const lngInfluence = (weights.scenery - weights.quietness) * 0.0025

  return {
    lat: latInfluence * sway,
    lng: lngInfluence * drift,
  }
}

function calculateSegmentVibes(weights: VibeWeights, index: number, segmentCount: number): VibeWeights {
  const baseProfiles: VibeWeights[] = [
    { greenery: 0.75, quietness: 0.6, culture: 0.4, scenery: 0.55 },
    { greenery: 0.55, quietness: 0.7, culture: 0.6, scenery: 0.45 },
    { greenery: 0.45, quietness: 0.5, culture: 0.8, scenery: 0.65 },
    { greenery: 0.65, quietness: 0.45, culture: 0.55, scenery: 0.8 },
  ]

  const base = baseProfiles[index % baseProfiles.length]
  const blend = 0.55
  const variation = 0.12 * Math.sin(((index + 1) / segmentCount) * Math.PI)

  return {
    greenery: clamp(base.greenery * blend + weights.greenery * (1 - blend) + variation, 0, 1),
    quietness: clamp(base.quietness * blend + weights.quietness * (1 - blend) + variation * 0.8, 0, 1),
    culture: clamp(base.culture * blend + weights.culture * (1 - blend) + variation * 1.1, 0, 1),
    scenery: clamp(base.scenery * blend + weights.scenery * (1 - blend) + variation * 1.2, 0, 1),
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getDominantVibe(vibes: VibeWeights): VibeDimension {
  return (Object.entries(vibes) as [VibeDimension, number][]).sort((a, b) => b[1] - a[1])[0][0]
}

function calculateDuration(distance: number, dominantVibe: VibeDimension) {
  const baseWalkingSpeed = 1.35 // meters per second
  const paceAdjustment: Record<VibeDimension, number> = {
    greenery: 0.92,
    quietness: 0.95,
    culture: 0.85,
    scenery: 0.88,
  }

  return distance / (baseWalkingSpeed * paceAdjustment[dominantVibe])
}

function buildSegmentSummary(vibes: VibeWeights) {
  const ordered = (Object.entries(vibes) as [VibeDimension, number][]).sort((a, b) => b[1] - a[1])
  const [primary, secondary] = ordered
  const descriptions: Record<VibeDimension, string> = {
    greenery: 'lush greenery and shaded paths',
    quietness: 'calm streets with minimal traffic',
    culture: 'artistic landmarks and cultural spots',
    scenery: 'panoramic viewpoints and scenic vistas',
  }

  return `Primarily ${primary[0]} with ${descriptions[primary[0]]}, complemented by ${secondary[0]} influences.`
}

function buildVibeSummary(weights: VibeWeights, segments: RouteSegment[]): VibeSummary {
  const totals: Record<VibeDimension, number> = {
    greenery: 0,
    quietness: 0,
    culture: 0,
    scenery: 0,
  }

  segments.forEach((segment) => {
    ;(Object.entries(segment.vibeScores) as [VibeDimension, number][]).forEach(([key, value]) => {
      totals[key] += value
    })
  })

  const segmentAverages = (Object.keys(totals) as VibeDimension[]).reduce((acc, key) => {
    acc[key] = totals[key] / segments.length
    return acc
  }, {} as VibeWeights)

  const weightedScore = (Object.entries(weights) as [VibeDimension, number][]).reduce(
    (score, [key, value]) => score + value * segmentAverages[key],
    0
  )

  return {
    normalizedWeights: weights,
    segmentAverages,
    weightedScore,
    dominantVibe: getDominantVibe(segmentAverages),
  }
}

function createLinestring(points: [number, number][]) {
  const coordinates = points.map(([lng, lat]) => `${lng} ${lat}`).join(', ')
  return `LINESTRING(${coordinates})`
}

function buildHighlights(points: [number, number][], weights: VibeWeights): RouteHighlight[] {
  const ranking = (Object.entries(weights) as [VibeDimension, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.min(3, points.length - 1))

  const descriptions: Record<VibeDimension, string[]> = {
    greenery: [
      'Tree-lined promenade with pockets of urban nature',
      'Pocket park filled with native plants and birdsong',
      'Botanical courtyard blending city and nature',
    ],
    quietness: [
      'Secluded side street perfect for a mindful pause',
      'Hidden courtyard shielded from city noise',
      'Pedestrian walkway with gentle ambient sounds',
    ],
    culture: [
      'Local mural celebrating neighborhood history',
      'Indie gallery showcasing rotating exhibits',
      'Historic facade with storytelling plaques',
    ],
    scenery: [
      'Rooftop vista overlooking the skyline',
      'Waterfront outlook with sweeping views',
      'Architectural gem with intricate details',
    ],
  }

  return ranking.map(([vibe, weight], index) => {
    const pointIndex = Math.min(points.length - 2, Math.max(1, Math.floor(((index + 1) / (ranking.length + 1)) * points.length)))
    const [lng, lat] = points[pointIndex]
    const vibeDescriptions = descriptions[vibe]
    const description = vibeDescriptions[index % vibeDescriptions.length]

    return {
      id: `${vibe}-${index}`,
      name: `${capitalize(vibe)} highlight`,
      description: `${description}. Weighted preference: ${(weight * 100).toFixed(0)}%.`,
      coordinate: [lng, lat] as [number, number],
      vibe,
    }
  })
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function haversineDistance(a: RoutePoint, b: RoutePoint) {
  const R = 6371000 // meters
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)
  const deltaLat = toRadians(b.lat - a.lat)
  const deltaLng = toRadians(b.lng - a.lng)

  const sinLat = Math.sin(deltaLat / 2)
  const sinLng = Math.sin(deltaLng / 2)

  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))

  return R * c
}

function toRadians(value: number) {
  return (value * Math.PI) / 180
}
