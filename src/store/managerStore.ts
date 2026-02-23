import { create } from 'zustand';
import {
  FireworkTypeProfile,
  MusicTrack,
  RackTemplate,
  RackConfig,
  ShowControlSettings,
} from '../types';

interface ManagerState {
  musicTracks: MusicTrack[];
  selectedTrackId: string | null;
  selectTrack: (id: string | null) => void;
  addTrack: (track: MusicTrack) => void;
  updateTrack: (id: string, updates: Partial<MusicTrack>) => void;
  deleteTrack: (id: string) => void;

  rackTemplates: RackTemplate[];
  selectedRackTemplateId: string | null;
  selectRackTemplate: (id: string | null) => void;
  addRackTemplate: (template: RackTemplate) => void;
  updateRackTemplate: (id: string, updates: Partial<RackTemplate>) => void;
  deleteRackTemplate: (id: string) => void;

  typeProfiles: FireworkTypeProfile[];
  selectedTypeProfileId: string | null;
  selectTypeProfile: (id: string | null) => void;
  addTypeProfile: (profile: FireworkTypeProfile) => void;
  updateTypeProfile: (id: string, updates: Partial<FireworkTypeProfile>) => void;
  deleteTypeProfile: (id: string) => void;

  showSettings: ShowControlSettings;
  updateShowSettings: (updates: Partial<ShowControlSettings>) => void;
  resetShowSettings: () => void;
}

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const defaultTracks: MusicTrack[] = [
  {
    id: 'track-starlight',
    title: 'Starlight Overture',
    artist: 'Skyline Ensemble',
    bpm: 96,
    duration: 178,
    url: '',
    offset: 0,
    tags: ['opening', 'orchestral'],
  },
  {
    id: 'track-ember',
    title: 'Ember Rise',
    artist: 'Nova Sound',
    bpm: 120,
    duration: 214,
    url: '',
    offset: 0,
    tags: ['finale', 'electronic'],
  },
];

const defaultRackTemplates: RackTemplate[] = [
  {
    id: 'rack-straight-8',
    name: 'Straight Rack 8',
    type: 'straight',
    tubeCount: 8,
    rotation: 0,
    config: { type: 'straight', tilt: 90 },
  },
  {
    id: 'rack-fan-5',
    name: 'Fan Rack 5',
    type: 'fan',
    tubeCount: 5,
    rotation: 0,
    config: { type: 'fan', startAngle: -30, endAngle: 30, tilt: 82 },
  },
  {
    id: 'rack-matrix-5x5',
    name: 'Matrix Rack 5x5',
    type: 'matrix',
    tubeCount: 25,
    rotation: 0,
    config: { type: 'matrix', rows: 5, columns: 5, spacing: 0.5, tilt: 90 },
  },
];

const defaultTypeProfiles: FireworkTypeProfile[] = [
  {
    id: 'profile-peony',
    name: 'Peony',
    type: 'peony',
    description: 'Full spherical burst with balanced trail.',
    defaultHeight: 90,
    defaultDuration: 2.6,
    defaultIntensity: 0.9,
    defaultSpread: 360,
    defaultTrailLength: 0.4,
  },
  {
    id: 'profile-willow',
    name: 'Willow',
    type: 'willow',
    description: 'Long trailing droop with wide spread.',
    defaultHeight: 110,
    defaultDuration: 4.2,
    defaultIntensity: 0.9,
    defaultSpread: 360,
    defaultTrailLength: 0.92,
  },
  {
    id: 'profile-crossette',
    name: 'Crossette',
    type: 'crossette',
    description: 'Split cross pattern with sharp edges.',
    defaultHeight: 100,
    defaultDuration: 3.2,
    defaultIntensity: 0.85,
    defaultSpread: 90,
    defaultTrailLength: 0.5,
  },
  {
    id: 'profile-burst',
    name: 'Burst',
    type: 'burst',
    description: 'Quick impact burst.',
    defaultHeight: 85,
    defaultDuration: 2.2,
    defaultIntensity: 0.85,
    defaultSpread: 360,
    defaultTrailLength: 0.3,
  },
];

const DEFAULT_SHOW_SETTINGS: ShowControlSettings = {
  gravity: -9.8,
  airResistance: 0.98,
  dragVariation: 0.03,
  velocityScale: 0.75,
  burstHeightScale: 0.45,
  airBurstMin: 40,
  airBurstMax: 70,
  groundBurstMin: 6,
  groundBurstMax: 20,
  shellDrag: 0.992,
  shellSize: 0.75,
  shellTrail: 0.98,
  shellMinFlightTime: 0.6,
  shellFallDistance: 2,
  shellFallTime: 0.25,
  burstFallFadeTime: 2,
};

const ensureRackConfig = (template: RackTemplate): RackConfig => {
  if (template.type === 'fan') {
    return {
      type: 'fan',
      startAngle: template.config.type === 'fan' ? template.config.startAngle : -30,
      endAngle: template.config.type === 'fan' ? template.config.endAngle : 30,
      tilt: template.config.type === 'fan' ? template.config.tilt : 82,
    };
  }
  if (template.type === 'matrix') {
    return {
      type: 'matrix',
      rows: template.config.type === 'matrix' ? template.config.rows : 5,
      columns: template.config.type === 'matrix' ? template.config.columns : 5,
      spacing: template.config.type === 'matrix' ? template.config.spacing : 0.5,
      tilt: template.config.type === 'matrix' ? template.config.tilt : 90,
    };
  }
  return {
    type: 'straight',
    tilt: template.config.type === 'straight' ? template.config.tilt : 90,
  };
};

export const useManagerStore = create<ManagerState>((set) => ({
  musicTracks: defaultTracks,
  selectedTrackId: defaultTracks[0]?.id ?? null,
  selectTrack: (id) => set({ selectedTrackId: id }),
  addTrack: (track) =>
    set((state) => ({
      musicTracks: [...state.musicTracks, track],
      selectedTrackId: track.id,
    })),
  updateTrack: (id, updates) =>
    set((state) => ({
      musicTracks: state.musicTracks.map((track) =>
        track.id === id ? { ...track, ...updates } : track
      ),
    })),
  deleteTrack: (id) =>
    set((state) => ({
      musicTracks: state.musicTracks.filter((track) => track.id !== id),
      selectedTrackId: state.selectedTrackId === id ? null : state.selectedTrackId,
    })),

  rackTemplates: defaultRackTemplates,
  selectedRackTemplateId: defaultRackTemplates[0]?.id ?? null,
  selectRackTemplate: (id) => set({ selectedRackTemplateId: id }),
  addRackTemplate: (template) =>
    set((state) => ({
      rackTemplates: [...state.rackTemplates, template],
      selectedRackTemplateId: template.id,
    })),
  updateRackTemplate: (id, updates) =>
    set((state) => ({
      rackTemplates: state.rackTemplates.map((template) => {
        if (template.id !== id) return template;
        const next = { ...template, ...updates };
        return { ...next, config: ensureRackConfig(next) };
      }),
    })),
  deleteRackTemplate: (id) =>
    set((state) => ({
      rackTemplates: state.rackTemplates.filter((template) => template.id !== id),
      selectedRackTemplateId:
        state.selectedRackTemplateId === id ? null : state.selectedRackTemplateId,
    })),

  typeProfiles: defaultTypeProfiles,
  selectedTypeProfileId: defaultTypeProfiles[0]?.id ?? null,
  selectTypeProfile: (id) => set({ selectedTypeProfileId: id }),
  addTypeProfile: (profile) =>
    set((state) => ({
      typeProfiles: [...state.typeProfiles, profile],
      selectedTypeProfileId: profile.id,
    })),
  updateTypeProfile: (id, updates) =>
    set((state) => ({
      typeProfiles: state.typeProfiles.map((profile) =>
        profile.id === id ? { ...profile, ...updates } : profile
      ),
    })),
  deleteTypeProfile: (id) =>
    set((state) => ({
      typeProfiles: state.typeProfiles.filter((profile) => profile.id !== id),
      selectedTypeProfileId:
        state.selectedTypeProfileId === id ? null : state.selectedTypeProfileId,
    })),

  showSettings: { ...DEFAULT_SHOW_SETTINGS },
  updateShowSettings: (updates) =>
    set((state) => ({
      showSettings: { ...state.showSettings, ...updates },
    })),
  resetShowSettings: () => set({ showSettings: { ...DEFAULT_SHOW_SETTINGS } }),
}));

export const createManagerId = createId;
export const DEFAULT_MANAGER_SETTINGS = DEFAULT_SHOW_SETTINGS;

