import { create } from 'zustand';
import { FireworkEffect } from '../types';

interface LibraryState {
  effects: FireworkEffect[];
  selectedEffect: FireworkEffect | null;
  selectEffect: (effect: FireworkEffect | null) => void;
  addEffect: (effect: FireworkEffect) => void;
  updateEffect: (id: string, updates: Partial<FireworkEffect>) => void;
  deleteEffect: (id: string) => void;
}

// Professional firework effect library
const defaultEffects: FireworkEffect[] = [
  // Peony Effects (牡丹 - Classic spherical bursts)
  {
    id: 'peony-red-3',
    name: 'Red Peony 3"',
    color: '#ff0000',
    height: 80,
    duration: 2.5,
    type: 'peony',
    intensity: 0.9,
    particleCount: 100,
    spread: 360,
    trailLength: 0.3,
  },
  {
    id: 'peony-blue-4',
    name: 'Blue Peony 4"',
    color: '#0088ff',
    height: 100,
    duration: 3,
    type: 'peony',
    intensity: 0.95,
    particleCount: 150,
    spread: 360,
    trailLength: 0.4,
  },
  {
    id: 'peony-gold-5',
    name: 'Golden Peony 5"',
    color: '#ffd700',
    height: 110,
    duration: 3.5,
    type: 'peony',
    intensity: 1,
    particleCount: 200,
    spread: 360,
    trailLength: 0.5,
  },

  // Willow Effects (柳树 - Long trailing effects)
  {
    id: 'willow-gold-4',
    name: 'Golden Willow 4"',
    color: '#ffaa00',
    height: 90,
    duration: 4,
    type: 'willow',
    intensity: 0.85,
    particleCount: 120,
    spread: 360,
    trailLength: 0.9,
  },
  {
    id: 'willow-silver-5',
    name: 'Silver Willow 5"',
    color: '#c0c0c0',
    height: 105,
    duration: 4.5,
    type: 'willow',
    intensity: 0.9,
    particleCount: 150,
    spread: 360,
    trailLength: 0.95,
  },

  // Crossette Effects (十字 - Splitting effects)
  {
    id: 'crossette-red-4',
    name: 'Red Crossette 4"',
    color: '#ff1744',
    height: 95,
    duration: 3,
    type: 'crossette',
    intensity: 0.9,
    particleCount: 80,
    spread: 90,
    trailLength: 0.4,
    splitDelay: 0.5,
  },
  {
    id: 'crossette-green-5',
    name: 'Green Crossette 5"',
    color: '#00ff00',
    height: 105,
    duration: 3.5,
    type: 'crossette',
    intensity: 0.95,
    particleCount: 100,
    spread: 90,
    trailLength: 0.5,
    splitDelay: 0.6,
  },

  // Burst Effects (快速爆炸)
  {
    id: 'burst-purple-3',
    name: 'Purple Burst 3"',
    color: '#9b59b6',
    height: 75,
    duration: 2,
    type: 'burst',
    intensity: 0.85,
    particleCount: 80,
    spread: 360,
    trailLength: 0.2,
  },
  {
    id: 'burst-cyan-4',
    name: 'Cyan Burst 4"',
    color: '#00ffff',
    height: 90,
    duration: 2.5,
    type: 'burst',
    intensity: 0.9,
    particleCount: 100,
    spread: 360,
    trailLength: 0.3,
  },

  // Fountain Effects (喷泉)
  {
    id: 'fountain-silver-ground',
    name: 'Silver Fountain',
    color: '#e0e0e0',
    height: 15,
    duration: 5,
    type: 'fountain',
    intensity: 0.7,
    particleCount: 60,
    spread: 45,
    trailLength: 0.6,
  },

  // Rocket Effects (火箭)
  {
    id: 'rocket-orange-3',
    name: 'Orange Rocket 3"',
    color: '#ff6b35',
    height: 85,
    duration: 2.5,
    type: 'rocket',
    intensity: 0.85,
    particleCount: 90,
    spread: 360,
    trailLength: 0.7,
  },

  // Sparkler Effects (烟花棒)
  {
    id: 'sparkler-white',
    name: 'White Sparkler',
    color: '#ffffff',
    height: 20,
    duration: 2,
    type: 'sparkler',
    intensity: 1,
    particleCount: 50,
    spread: 360,
    trailLength: 0.8,
  },

  // Special Effects
  {
    id: 'peony-pink-finale',
    name: 'Pink Finale 6"',
    color: '#ff1493',
    height: 120,
    duration: 4,
    type: 'peony',
    intensity: 1,
    particleCount: 250,
    spread: 360,
    trailLength: 0.6,
  },
];

export const useLibraryStore = create<LibraryState>((set) => ({
  effects: defaultEffects,
  selectedEffect: null,

  selectEffect: (effect) => set({ selectedEffect: effect }),

  addEffect: (effect) =>
    set((state) => ({
      effects: [...state.effects, effect],
    })),

  updateEffect: (id, updates) =>
    set((state) => ({
      effects: state.effects.map((effect) =>
        effect.id === id ? { ...effect, ...updates } : effect
      ),
    })),

  deleteEffect: (id) =>
    set((state) => ({
      effects: state.effects.filter((effect) => effect.id !== id),
      selectedEffect: state.selectedEffect?.id === id ? null : state.selectedEffect,
    })),
}));
