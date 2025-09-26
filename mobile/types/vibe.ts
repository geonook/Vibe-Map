export type VibeDimension = 'greenery' | 'quietness' | 'culture' | 'scenery';

export type VibeWeights = Record<VibeDimension, number>;

export interface VibeDimensionMetadata {
  key: VibeDimension;
  label: string;
  emoji: string;
  color: string;
  description: string;
}

export const vibeDimensions: VibeDimensionMetadata[] = [
  {
    key: 'greenery',
    label: 'Greenery',
    emoji: '🌳',
    color: '#a8e6a3',
    description: 'Parks, trees, and natural pockets along the way.',
  },
  {
    key: 'quietness',
    label: 'Quietness',
    emoji: '🔇',
    color: '#b3e5fc',
    description: 'Softer soundscapes with lower traffic and noise.',
  },
  {
    key: 'culture',
    label: 'Culture',
    emoji: '🎨',
    color: '#ffcdd2',
    description: 'Museums, murals, and cultural touchpoints.',
  },
  {
    key: 'scenery',
    label: 'Scenery',
    emoji: '🏞️',
    color: '#fff9c4',
    description: 'Scenic vistas, waterfront views, and striking architecture.',
  },
];

export const defaultVibeWeights: VibeWeights = {
  greenery: 0.4,
  quietness: 0.3,
  culture: 0.15,
  scenery: 0.15,
};

export function clampWeight(value: number, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

export function normalizeWeights(weights: VibeWeights): VibeWeights {
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  if (total === 0) {
    return {
      greenery: 0.25,
      quietness: 0.25,
      culture: 0.25,
      scenery: 0.25,
    };
  }

  return Object.entries(weights).reduce((acc, [key, value]) => {
    acc[key as VibeDimension] = value / total;
    return acc;
  }, {} as VibeWeights);
}
