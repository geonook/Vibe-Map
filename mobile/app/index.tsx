import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { RouteSummaryCard } from '../components/RouteSummaryCard';
import { RouteFeedbackForm } from '../components/RouteFeedbackForm';
import { VibeWeightControls } from '../components/VibeWeightControls';
import {
  defaultVibeWeights,
  normalizeWeights,
  vibeDimensions,
  VibeDimension,
  VibeWeights,
} from '../types/vibe';
import { RouteCandidate, useVibeRoute } from '../hooks/useVibeRoute';

const isWeb = Platform.OS === 'web';

type EditingPoint = 'start' | 'end' | null;

if (!isWeb) {
  MapLibreGL.setAccessToken(null);
  MapLibreGL.setTelemetryEnabled(false);
  (MapLibreGL as typeof MapLibreGL & { setWellKnownTileServer?: (server: string) => void }).setWellKnownTileServer?.(
    'MapLibre'
  );
}

interface RoutePreset {
  id: string;
  title: string;
  city: string;
  description: string;
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
}

const routePresets: RoutePreset[] = [
  {
    id: 'nyc-central',
    title: 'Central Park to Chelsea',
    city: 'New York',
    description: 'Leafy traverse from the park to vibrant galleries.',
    start: { lat: 40.785091, lng: -73.968285 },
    end: { lat: 40.746439, lng: -74.004241 },
  },
  {
    id: 'sf-waterfront',
    title: 'Ferry Building to Fort Mason',
    city: 'San Francisco',
    description: 'Waterfront stroll with skyline panoramas.',
    start: { lat: 37.7955, lng: -122.3937 },
    end: { lat: 37.8067, lng: -122.4307 },
  },
  {
    id: 'ldn-southbank',
    title: 'Southbank loop',
    city: 'London',
    description: 'Culture-rich Thames walk packed with landmarks.',
    start: { lat: 51.5076, lng: -0.0994 },
    end: { lat: 51.5095, lng: -0.1357 },
  },
];

const vibeLookup = vibeDimensions.reduce<Record<VibeDimension, typeof vibeDimensions[number]>>((acc, dimension) => {
  acc[dimension.key] = dimension;
  return acc;
}, {} as Record<VibeDimension, typeof vibeDimensions[number]>);

const dominantRouteColors: Record<VibeDimension, string> = {
  greenery: '#16a34a',
  quietness: '#0ea5e9',
  culture: '#f97316',
  scenery: '#facc15',
};

function formatDistance(distance: number) {
  if (!Number.isFinite(distance)) return '—';
  const kilometers = distance / 1000;
  return `${kilometers.toFixed(kilometers >= 10 ? 0 : 1)} km`;
}

function formatDuration(duration: number) {
  if (!Number.isFinite(duration)) return '—';
  const minutes = Math.round(duration / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h ${remaining.toString().padStart(2, '0')}m`;
}

function formatCoordinate(value: number) {
  return value.toFixed(4);
}

function getCenterCoordinate(points: [number, number][]) {
  if (!points?.length) {
    return [0, 0] as [number, number];
  }

  const { sumLat, sumLng } = points.reduce(
    (acc, [lng, lat]) => ({
      sumLat: acc.sumLat + lat,
      sumLng: acc.sumLng + lng,
    }),
    { sumLat: 0, sumLng: 0 }
  );

  return [sumLng / points.length, sumLat / points.length] as [number, number];
}

function getRouteColor(candidate?: RouteCandidate) {
  if (!candidate) return '#4a90e2';
  const dominant = candidate.route.vibe_summary.dominantVibe as VibeDimension;
  return dominantRouteColors[dominant] ?? '#4a90e2';
}

export default function HomeScreen() {
  const [presetIndex, setPresetIndex] = useState(0);
  const [vibeWeights, setVibeWeights] = useState<VibeWeights>(defaultVibeWeights);
  const [startPoint, setStartPoint] = useState(routePresets[0].start);
  const [endPoint, setEndPoint] = useState(routePresets[0].end);
  const [editingPoint, setEditingPoint] = useState<EditingPoint>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const { mutate, data, isPending, isSuccess, error, reset } = useVibeRoute();
  const storedRouteId = (data?.storedRoute as { id?: string } | null)?.id ?? null;

  const preset = routePresets[presetIndex];
  const nextPreset = routePresets[(presetIndex + 1) % routePresets.length];

  useEffect(() => {
    const presetData = routePresets[presetIndex];
    setStartPoint(presetData.start);
    setEndPoint(presetData.end);
    setEditingPoint(null);
    setSelectedRouteId(null);
    reset();
  }, [presetIndex, reset]);

  useEffect(() => {
    if (!data?.routes?.length) return;

    if (data.recommendedRouteId) {
      setSelectedRouteId(data.recommendedRouteId);
      return;
    }

    setSelectedRouteId((current) => {
      if (current && data.routes.some((route) => route.id === current)) {
        return current;
      }
      return data.routes[0].id;
    });
  }, [data?.recommendedRouteId, data?.routes]);

  const selectedRoute = useMemo(() => {
    if (!data?.routes?.length) return undefined;
    if (!selectedRouteId) return data.routes[0];
    return data.routes.find((route) => route.id === selectedRouteId) ?? data.routes[0];
  }, [data?.routes, selectedRouteId]);

  const centerCoordinate = useMemo(() => {
    if (selectedRoute?.coordinates?.length) {
      return getCenterCoordinate(selectedRoute.coordinates);
    }

    return [
      (startPoint.lng + endPoint.lng) / 2,
      (startPoint.lat + endPoint.lat) / 2,
    ] as [number, number];
  }, [selectedRoute?.coordinates, startPoint, endPoint]);

  const handleGenerateRoute = useCallback(() => {
    setSelectedRouteId(null);
    mutate({
      start: startPoint,
      end: endPoint,
      vibeWeights,
      alternatives: 2,
    });
  }, [endPoint, mutate, startPoint, vibeWeights]);

  const handleMapLongPress = useCallback(
    (event: any) => {
      if (!editingPoint) return;
      const coordinates = event?.geometry?.coordinates ?? event?.coordinates;
      if (!Array.isArray(coordinates) || coordinates.length < 2) return;
      const [lng, lat] = coordinates as [number, number];

      if (editingPoint === 'start') {
        setStartPoint({ lat, lng });
      } else {
        setEndPoint({ lat, lng });
      }
    },
    [editingPoint]
  );

  const handleSwapPoints = useCallback(() => {
    setStartPoint(endPoint);
    setEndPoint(startPoint);
  }, [endPoint, startPoint]);

  const resetToPreset = useCallback(() => {
    setStartPoint(preset.start);
    setEndPoint(preset.end);
    setEditingPoint(null);
  }, [preset.end, preset.start]);

  const hasRoutes = Boolean(data?.routes?.length);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Vibe Map</Text>
            <Text style={styles.subtitle}>Navigate by how you want to feel</Text>
          </View>
          <TouchableOpacity
            style={styles.presetButton}
            onPress={() => setPresetIndex((index) => (index + 1) % routePresets.length)}
          >
            <Text style={styles.presetButtonLabel}>Try another vibe</Text>
            <Text style={styles.presetButtonValue}>{nextPreset.title}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.routeMetaCard}>
          <Text style={styles.routeMetaTitle}>{preset.title}</Text>
          <Text style={styles.routeMetaSubtitle}>{preset.city}</Text>
          <Text style={styles.routeMetaDescription}>{preset.description}</Text>
        </View>

        <View style={styles.pointControls}>
          <View style={styles.pointButtonsRow}>
            <TouchableOpacity
              style={[styles.pointButton, editingPoint === 'start' && styles.pointButtonActive]}
              onPress={() => setEditingPoint((current) => (current === 'start' ? null : 'start'))}
            >
              <Text style={styles.pointButtonLabel}>Start point</Text>
              <Text style={styles.pointButtonValue}>
                {formatCoordinate(startPoint.lat)}, {formatCoordinate(startPoint.lng)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pointButton, editingPoint === 'end' && styles.pointButtonActive]}
              onPress={() => setEditingPoint((current) => (current === 'end' ? null : 'end'))}
            >
              <Text style={styles.pointButtonLabel}>End point</Text>
              <Text style={styles.pointButtonValue}>
                {formatCoordinate(endPoint.lat)}, {formatCoordinate(endPoint.lng)}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.pointActionsRow}>
            <TouchableOpacity style={styles.secondaryAction} onPress={handleSwapPoints}>
              <Text style={styles.secondaryActionText}>Swap A ↔ B</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryAction} onPress={resetToPreset}>
              <Text style={styles.secondaryActionText}>Reset to preset</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.pointHelperText}>
            {editingPoint
              ? 'Long-press the map to reposition the selected point.'
              : 'Select a point above, then long-press on the map to move it.'}
          </Text>
        </View>

        <View style={styles.mapWrapper}>
          {isWeb ? (
            <View style={styles.webPlaceholder}>
              <Text style={styles.webPlaceholderText}>Map preview available on mobile builds.</Text>
            </View>
          ) : (
            <MapLibreGL.MapView
              style={styles.map}
              styleURL="https://demotiles.maplibre.org/style.json"
              onLongPress={handleMapLongPress}
            >
              <MapLibreGL.Camera
                centerCoordinate={centerCoordinate}
                zoomLevel={13}
                animationMode="flyTo"
                animationDuration={1500}
              />
              <MapLibreGL.PointAnnotation id="start" coordinate={[startPoint.lng, startPoint.lat]}>
                <View
                  style={[
                    styles.annotation,
                    styles.annotationStart,
                    editingPoint === 'start' && styles.annotationActive,
                  ]}
                >
                  <Text style={styles.annotationText}>A</Text>
                </View>
              </MapLibreGL.PointAnnotation>
              <MapLibreGL.PointAnnotation id="end" coordinate={[endPoint.lng, endPoint.lat]}>
                <View
                  style={[
                    styles.annotation,
                    styles.annotationEnd,
                    editingPoint === 'end' && styles.annotationActive,
                  ]}
                >
                  <Text style={styles.annotationText}>B</Text>
                </View>
              </MapLibreGL.PointAnnotation>

              {data?.routes?.map((candidate) => {
                const isActive = candidate.id === selectedRoute?.id;
                const lineColor = isActive ? getRouteColor(candidate) : '#94a3b8';
                return (
                  <MapLibreGL.ShapeSource key={candidate.id} id={`route-${candidate.id}`} shape={candidate.geojson}>
                    <MapLibreGL.LineLayer
                      id={`route-line-${candidate.id}`}
                      style={{
                        lineColor,
                        lineWidth: isActive ? 6 : 4,
                        lineCap: 'round',
                        lineJoin: 'round',
                        lineOpacity: isActive ? 0.9 : 0.45,
                      }}
                    />
                  </MapLibreGL.ShapeSource>
                );
              })}

              {selectedRoute?.highlights.map((highlight) => {
                const dimension = vibeLookup[highlight.vibe as VibeDimension];
                return (
                  <MapLibreGL.PointAnnotation key={highlight.id} id={highlight.id} coordinate={highlight.coordinate}>
                    <View style={styles.highlightAnnotation}>
                      <Text style={styles.highlightEmoji}>{dimension?.emoji ?? '⭐️'}</Text>
                    </View>
                  </MapLibreGL.PointAnnotation>
                );
              })}
            </MapLibreGL.MapView>
          )}
        </View>

        {isPending && (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#4a90e2" />
            <Text style={styles.loadingLabel}>Calibrating your vibe-friendly paths…</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>We hit a bump</Text>
            <Text style={styles.errorDescription}>{error.message}</Text>
          </View>
        )}

        {hasRoutes ? (
          <View style={styles.routePickerSection}>
            <Text style={styles.sectionTitle}>Compare route vibes</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.routeChipRow}>
              {data!.routes.map((candidate) => {
                const isActive = candidate.id === selectedRoute?.id;
                return (
                  <TouchableOpacity
                    key={candidate.id}
                    style={[styles.routeChip, isActive && styles.routeChipActive]}
                    onPress={() => setSelectedRouteId(candidate.id)}
                  >
                    <Text style={[styles.routeChipLabel, isActive && styles.routeChipLabelActive]}>
                      {candidate.label}
                    </Text>
                    <Text style={[styles.routeChipMeta, isActive && styles.routeChipMetaActive]}>
                      {formatDistance(candidate.route.total_distance)} · {formatDuration(candidate.route.estimated_duration)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {isSuccess && selectedRoute && (
          <RouteSummaryCard
            title={selectedRoute.label}
            subtitle={`Dominant vibe: ${selectedRoute.route.vibe_summary.dominantVibe}`}
            rationale={selectedRoute.description}
            distance={selectedRoute.route.total_distance}
            duration={selectedRoute.route.estimated_duration}
            summary={selectedRoute.route.vibe_summary}
          />
        )}

        <VibeWeightControls
          weights={vibeWeights}
          onChange={(weights) => setVibeWeights(normalizeWeights(weights))}
        />

        <TouchableOpacity style={styles.generateButton} onPress={handleGenerateRoute} disabled={isPending}>
          <Text style={styles.generateButtonText}>
            {isPending ? 'Calculating vibe routes…' : 'Generate vibe-rich routes'}
          </Text>
        </TouchableOpacity>

        {isSuccess && selectedRoute?.segments.length ? (
          <View style={styles.segmentSection}>
            <Text style={styles.sectionTitle}>Segment breakdown</Text>
            {selectedRoute.segments.map((segment) => {
              const primary = vibeLookup[segment.dominantVibe as VibeDimension];
              return (
                <View key={segment.index} style={styles.segmentCard}>
                  <Text style={styles.segmentTitle}>
                    Segment {segment.index + 1} · {primary?.label ?? segment.dominantVibe}
                  </Text>
                  <Text style={styles.segmentSummary}>{segment.summary}</Text>
                  <View style={styles.segmentMetaRow}>
                    <Text style={styles.segmentMeta}>{formatDistance(segment.distance)}</Text>
                    <Text style={styles.segmentMeta}>{formatDuration(segment.duration)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {isSuccess && selectedRoute?.highlights.length ? (
          <View style={styles.highlightSection}>
            <Text style={styles.sectionTitle}>Route highlights</Text>
            {selectedRoute.highlights.map((highlight) => {
              const meta = vibeLookup[highlight.vibe as VibeDimension];
              return (
                <View key={highlight.id} style={styles.highlightCard}>
                  <View style={styles.highlightHeader}>
                    <Text style={styles.highlightEmojiLarge}>{meta?.emoji ?? '⭐️'}</Text>
                    <View>
                      <Text style={styles.highlightName}>{highlight.name}</Text>
                      <Text style={styles.highlightVibe}>{meta?.label ?? highlight.vibe}</Text>
                    </View>
                  </View>
                  <Text style={styles.highlightDescription}>{highlight.description}</Text>
                </View>
              );
            })}
          </View>
        ) : null}

        {isSuccess && selectedRoute ? (
          <RouteFeedbackForm
            routeId={selectedRoute.id}
            routeLabel={selectedRoute.label}
            vibeWeights={selectedRoute.vibe_weights}
            storedRouteId={storedRouteId}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f2f4f8',
  },
  container: {
    padding: 20,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#5b616e',
    marginTop: 4,
  },
  presetButton: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'flex-start',
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  presetButtonLabel: {
    fontSize: 12,
    color: '#6c7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  presetButtonValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  routeMetaCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  routeMetaTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2430',
  },
  routeMetaSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  routeMetaDescription: {
    fontSize: 14,
    color: '#4b5563',
  },
  pointControls: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  pointButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pointButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d6dae3',
    backgroundColor: '#f8f9fb',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 6,
  },
  pointButtonActive: {
    borderColor: '#4a90e2',
    backgroundColor: '#eaf1fe',
  },
  pointButtonLabel: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  pointButtonValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2430',
  },
  pointActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryAction: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#eef1f7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  pointHelperText: {
    fontSize: 12,
    color: '#6c7280',
  },
  mapWrapper: {
    borderRadius: 22,
    overflow: 'hidden',
    height: 280,
    backgroundColor: '#dfe4ec',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  map: {
    flex: 1,
  },
  webPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webPlaceholderText: {
    color: '#4b5563',
  },
  annotation: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  annotationStart: {
    backgroundColor: '#16a34a',
  },
  annotationEnd: {
    backgroundColor: '#ef4444',
  },
  annotationActive: {
    transform: [{ scale: 1.1 }],
  },
  annotationText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  highlightAnnotation: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  highlightEmoji: {
    fontSize: 14,
  },
  loadingState: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  loadingLabel: {
    fontSize: 14,
    color: '#4b5563',
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 18,
    padding: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991b1b',
  },
  errorDescription: {
    fontSize: 14,
    color: '#b91c1c',
  },
  routePickerSection: {
    gap: 12,
  },
  routeChipRow: {
    gap: 12,
  },
  routeChip: {
    backgroundColor: '#f3f4f6',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  routeChipActive: {
    backgroundColor: '#1d4ed8',
  },
  routeChipLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  routeChipLabelActive: {
    color: '#f8fafc',
  },
  routeChipMeta: {
    fontSize: 12,
    color: '#4b5563',
  },
  routeChipMetaActive: {
    color: '#e0e7ff',
  },
  generateButton: {
    backgroundColor: '#4a90e2',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  generateButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  segmentSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2430',
  },
  segmentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  segmentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  segmentSummary: {
    fontSize: 14,
    color: '#4b5563',
  },
  segmentMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  segmentMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  highlightSection: {
    gap: 12,
  },
  highlightCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  highlightEmojiLarge: {
    fontSize: 28,
  },
  highlightName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2430',
  },
  highlightVibe: {
    fontSize: 13,
    color: '#6b7280',
  },
  highlightDescription: {
    fontSize: 14,
    color: '#4b5563',
  },
});
