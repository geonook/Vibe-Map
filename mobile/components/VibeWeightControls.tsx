import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { clampWeight, vibeDimensions, VibeDimension, VibeWeights } from '../types/vibe';

interface Props {
  weights: VibeWeights;
  onChange: (weights: VibeWeights) => void;
}

const STEP = 0.1;

export function VibeWeightControls({ weights, onChange }: Props) {
  const handleAdjust = (key: VibeDimension, delta: number) => {
    const nextValue = clampWeight(Number((weights[key] + delta).toFixed(2)));
    onChange({
      ...weights,
      [key]: nextValue,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Tune your vibe</Text>
      {vibeDimensions.map((dimension) => {
        const value = weights[dimension.key];
        return (
          <View key={dimension.key} style={styles.row}>
            <View style={styles.labelContainer}>
              <View style={[styles.emojiBadge, { backgroundColor: dimension.color }]}>
                <Text style={styles.emoji}>{dimension.emoji}</Text>
              </View>
              <View>
                <Text style={styles.label}>{dimension.label}</Text>
                <Text style={styles.description}>{dimension.description}</Text>
              </View>
            </View>
            <View style={styles.controls}>
              <TouchableOpacity
                accessibilityLabel={`Decrease ${dimension.label}`}
                onPress={() => handleAdjust(dimension.key, -STEP)}
                style={styles.adjustButton}
              >
                <Text style={styles.adjustButtonText}>−</Text>
              </TouchableOpacity>
              <View style={styles.weightMeter}>
                <View
                  style={[
                    styles.weightFill,
                    {
                      backgroundColor: dimension.color,
                      width: `${Math.round(value * 100)}%`,
                    },
                  ]}
                />
              </View>
              <TouchableOpacity
                accessibilityLabel={`Increase ${dimension.label}`}
                onPress={() => handleAdjust(dimension.key, STEP)}
                style={styles.adjustButton}
              >
                <Text style={styles.adjustButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.weightValue}>{Math.round(value * 100)}%</Text>
          </View>
        );
      })}
      <Text style={styles.helperText}>Weights are independent — experiment to find your perfect mix.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },
  row: {
    backgroundColor: '#f8f9fb',
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emojiBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  description: {
    fontSize: 13,
    color: '#5f6570',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  adjustButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d0d6e0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  adjustButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#3d4653',
  },
  weightMeter: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e4e9f1',
    overflow: 'hidden',
  },
  weightFill: {
    height: 10,
    borderRadius: 5,
  },
  weightValue: {
    alignSelf: 'flex-end',
    fontSize: 13,
    color: '#3d4653',
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: '#6c7382',
  },
});
