import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { VibeSummary } from '../hooks/useVibeRoute';
import { vibeDimensions } from '../types/vibe';

interface Props {
  title: string;
  subtitle?: string;
  rationale?: string;
  distance: number;
  duration: number;
  summary: VibeSummary;
}

function formatDistance(distance: number) {
  if (!Number.isFinite(distance)) return '—';
  const kilometers = distance / 1000;
  return `${kilometers.toFixed(kilometers >= 10 ? 0 : 1)} km`;
}

function formatDuration(duration: number) {
  if (!Number.isFinite(duration)) return '—';
  const minutes = Math.round(duration / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) {
    return `${minutes} min`;
  }
  return `${hours}h ${remainingMinutes.toString().padStart(2, '0')}m`;
}

export function RouteSummaryCard({ title, subtitle, rationale, distance, duration, summary }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{Math.round(summary.weightedScore * 100)}%</Text>
          <Text style={styles.badgeLabel}>Match</Text>
        </View>
      </View>

      {rationale ? <Text style={styles.rationale}>{rationale}</Text> : null}

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Distance</Text>
          <Text style={styles.metricValue}>{formatDistance(distance)}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Duration</Text>
          <Text style={styles.metricValue}>{formatDuration(duration)}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Dominant vibe</Text>
          <Text style={styles.metricValue}>{summary.dominantVibe}</Text>
        </View>
      </View>

      <View style={styles.vibeBreakdown}>
        {vibeDimensions.map((dimension) => {
          const score = summary.segmentAverages[dimension.key];
          return (
            <View key={dimension.key} style={styles.vibeRow}>
              <View style={styles.vibeLabelContainer}>
                <Text style={styles.vibeEmoji}>{dimension.emoji}</Text>
                <Text style={styles.vibeLabel}>{dimension.label}</Text>
              </View>
              <View style={styles.vibeMeter}>
                <View
                  style={[
                    styles.vibeFill,
                    {
                      width: `${Math.round(score * 100)}%`,
                      backgroundColor: dimension.color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.vibeValue}>{Math.round(score * 100)}%</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    gap: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2430',
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  rationale: {
    fontSize: 14,
    color: '#4b5563',
  },
  badge: {
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4338ca',
  },
  badgeLabel: {
    fontSize: 11,
    color: '#4338ca',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#f4f6fb',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 6,
  },
  metricLabel: {
    fontSize: 12,
    color: '#667085',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2430',
  },
  vibeBreakdown: {
    gap: 12,
  },
  vibeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  vibeLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 110,
    gap: 6,
  },
  vibeEmoji: {
    fontSize: 20,
  },
  vibeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#27303f',
  },
  vibeMeter: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  vibeFill: {
    height: 8,
    borderRadius: 4,
  },
  vibeValue: {
    width: 42,
    textAlign: 'right',
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '600',
  },
});
