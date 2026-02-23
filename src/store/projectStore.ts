import { create } from 'zustand';
import {
  Project,
  Position,
  Rack,
  Tube,
  ShowEvent,
  FireworkEffect,
  FanRackConfig,
  StraightRackConfig,
  MatrixRackConfig,
} from '../types/domain';
import { generateEpicShow } from '../utils/showGenerator';
import { generateSymmetricShow } from '../utils/symmetricShowGenerator';
import { generateGrandShow } from '../utils/grandShowGenerator';
import { generateSpectacularShow } from '../utils/spectacularShowGenerator';

interface ProjectState {
  project: Project | null;
  selectedPosition: Position | null;
  selectedRack: Rack | null;
  selectedEvent: ShowEvent | null;
  currentTime: number;
  isPlaying: boolean;
  replayToken: number;
  history: Project[];

  // Actions
  setProject: (project: Project) => void;
  updateProject: (updates: Partial<Project>) => void;
  loadDemoProject: () => void;
  loadEpicShow: () => void;
  loadGrandShow: () => void;
  loadSpectacularShow: () => void;
  createNewProject: () => void;
  undo: () => void;

  // Position management
  addPosition: (position: Position) => void;
  updatePosition: (id: string, updates: Partial<Position>) => void;
  deletePosition: (id: string) => void;
  selectPosition: (position: Position | null) => void;

  // Rack management
  addRackToPosition: (positionId: string, rack: Rack) => void;
  updateRack: (positionId: string, rackId: string, updates: Partial<Rack>) => void;
  deleteRack: (positionId: string, rackId: string) => void;
  selectRack: (rack: Rack | null) => void;

  // Tube management
  loadTube: (positionId: string, rackId: string, tubeIndex: number, effect: FireworkEffect) => void;
  unloadTube: (positionId: string, rackId: string, tubeIndex: number) => void;
  refillTubes: () => void;
  fireTube: (positionId: string, rackId: string, tubeIndex: number) => void;

  // Event management
  addEvent: (event: ShowEvent) => void;
  updateEvent: (id: string, updates: Partial<ShowEvent>) => void;
  deleteEvent: (id: string) => void;
  selectEvent: (event: ShowEvent | null) => void;

  // Playback
  setCurrentTime: (time: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  requestReplay: () => void;

  // Legacy compatibility
  selectedCue: ShowEvent | null;
  selectCue: (event: ShowEvent | null) => void;
  updateCue: (id: string, updates: Partial<ShowEvent>) => void;
}

// ============================================================================
// FACTORY FUNCTIONS - Build professional pyrotechnics hardware
// ============================================================================

const MAX_HISTORY = 30;
let idSequence = 0;

const nextId = (prefix: string) => {
  idSequence += 1;
  return `${prefix}-${Date.now()}-${idSequence}`;
};

const pushHistory = (history: Project[], project: Project | null) => {
  if (!project) return history;
  const next = [...history, project];
  return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
};

/** Create a tube with physical properties */
function createTube(index: number, angle: number, tilt: number): Tube {
  return {
    id: nextId('tube'),
    index,
    angle,
    tilt,
    loaded: false,
    effect: null,
    isFired: false,
  };
}

/** Create a Fan Rack (tubes spread in an arc) */
export function createFanRack(
  name: string,
  tubeCount: number = 5,
  startAngle: number = -30,
  endAngle: number = 30,
  tilt: number = 82
): Rack {
  const tubes: Tube[] = [];
  const angleStep = tubeCount > 1 ? (endAngle - startAngle) / (tubeCount - 1) : 0;

  for (let i = 0; i < tubeCount; i++) {
    const angle = startAngle + angleStep * i;
    tubes.push(createTube(i, angle, tilt));
  }

  return {
    id: nextId('rack'),
    name,
    type: 'fan',
    tubeCount,
    tubes,
    rotation: 0,
    config: {
      type: 'fan',
      startAngle,
      endAngle,
      tilt,
    } as FanRackConfig,
  };
}

/** Create a Straight Rack (all tubes parallel) */
export function createStraightRack(
  name: string,
  tubeCount: number = 10,
  tilt: number = 90
): Rack {
  const tubes: Tube[] = [];

  for (let i = 0; i < tubeCount; i++) {
    tubes.push(createTube(i, 0, tilt));
  }

  return {
    id: nextId('rack'),
    name,
    type: 'straight',
    tubeCount,
    tubes,
    rotation: 0,
    config: {
      type: 'straight',
      tilt,
    } as StraightRackConfig,
  };
}

/** Create a Matrix Rack (grid for pixel effects) */
export function createMatrixRack(
  name: string,
  rows: number = 5,
  columns: number = 5,
  spacing: number = 0.5,
  tilt: number = 90
): Rack {
  const tubes: Tube[] = [];
  const tubeCount = rows * columns;

  for (let i = 0; i < tubeCount; i++) {
    tubes.push(createTube(i, 0, tilt));
  }

  return {
    id: nextId('rack'),
    name,
    type: 'matrix',
    tubeCount,
    tubes,
    rotation: 0,
    config: {
      type: 'matrix',
      rows,
      columns,
      spacing,
      tilt,
    } as MatrixRackConfig,
  };
}

/** Create a Position (launch site) */
export function createPosition(
  name: string,
  x: number,
  z: number,
  racks: Rack[] = []
): Position {
  return {
    id: nextId('pos'),
    name,
    coordinate: { x, y: 0, z },
    racks,
    color: '#DC2626',
  };
}

// ============================================================================
// DEMO DATA - Professional show setup
// ============================================================================

/** Create demo project with professional hardware setup */
function createDemoProject(): Project {
  return generateGrandShow();
}

function createEmptyProject(): Project {
  return {
    id: nextId('project'),
    name: '新建烟花方案',
    activityName: '新建阵地方案',
    activityDetail: '从空白阵地布局开始创建新的烟花编排。',
    positions: [],
    events: [],
    duration: 60,
    createdAt: new Date(),
    updatedAt: new Date(),
    groundHeight: 0,
    mapBounds: {
      minX: -60,
      maxX: 60,
      minZ: -40,
      maxZ: 40,
    },
  };
}

// ============================================================================
// ZUSTAND STORE
// ============================================================================

export const useProjectStore = create<ProjectState>((set) => ({
  project: createDemoProject(),
  selectedPosition: null,
  selectedRack: null,
  selectedEvent: null,
  currentTime: 0,
  isPlaying: false,
  replayToken: 0,
  history: [],

  // Legacy compatibility
  selectedCue: null,
  selectCue: (event) => set({ selectedEvent: event, selectedCue: event }),
  updateCue: (id, updates) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          events: state.project.events.map((evt) =>
            evt.id === id ? { ...evt, ...updates } : evt
          ),
          updatedAt: new Date(),
        },
        history: pushHistory(state.history, state.project),
      };
    }),

  setProject: (project) =>
    set((state) => ({
      project,
      history: pushHistory(state.history, state.project),
      replayToken: 0,
    })),

  updateProject: (updates) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: { ...state.project, ...updates, updatedAt: new Date() },
        history: pushHistory(state.history, state.project),
      };
    }),

  loadDemoProject: () =>
    set((state) => ({
      project: createDemoProject(),
      history: pushHistory(state.history, state.project),
      selectedPosition: null,
      selectedRack: null,
      selectedEvent: null,
      selectedCue: null,
      currentTime: 0,
      isPlaying: false,
      replayToken: 0,
    })),

  loadEpicShow: () =>
    set((state) => ({
      project: generateEpicShow(),
      history: pushHistory(state.history, state.project),
      selectedPosition: null,
      selectedRack: null,
      selectedEvent: null,
      selectedCue: null,
      currentTime: 0,
      isPlaying: false,
      replayToken: 0,
    })),

  loadGrandShow: () =>
    set((state) => ({
      project: generateSymmetricShow(),
      history: pushHistory(state.history, state.project),
      selectedPosition: null,
      selectedRack: null,
      selectedEvent: null,
      selectedCue: null,
      currentTime: 0,
      isPlaying: false,
      replayToken: 0,
    })),

  loadSpectacularShow: () =>
    set((state) => ({
      project: generateSpectacularShow(),
      history: pushHistory(state.history, state.project),
      selectedPosition: null,
      selectedRack: null,
      selectedEvent: null,
      selectedCue: null,
      currentTime: 0,
      isPlaying: false,
      replayToken: 0,
    })),

  createNewProject: () =>
    set((state) => ({
      project: createEmptyProject(),
      history: pushHistory(state.history, state.project),
      selectedPosition: null,
      selectedRack: null,
      selectedEvent: null,
      selectedCue: null,
      currentTime: 0,
      isPlaying: false,
      replayToken: 0,
    })),

  undo: () =>
    set((state) => {
      if (state.history.length === 0) return state;
      const previous = state.history[state.history.length - 1];
      const history = state.history.slice(0, -1);
      const selectedPosition = state.selectedPosition
        ? previous.positions.find((pos) => pos.id === state.selectedPosition?.id) ?? null
        : null;
      const selectedRack = state.selectedRack
        ? previous.positions
            .flatMap((pos) => pos.racks)
            .find((rack) => rack.id === state.selectedRack?.id) ?? null
        : null;
      const selectedEvent = state.selectedEvent
        ? previous.events.find((evt) => evt.id === state.selectedEvent?.id) ?? null
        : null;

      return {
        project: previous,
        history,
        selectedPosition,
        selectedRack,
        selectedEvent,
        selectedCue: selectedEvent ?? null,
        currentTime: Math.min(state.currentTime, previous.duration),
        isPlaying: false,
      };
    }),

  // Position management
  addPosition: (position) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          positions: [...state.project.positions, position],
          updatedAt: new Date(),
        },
        history: pushHistory(state.history, state.project),
      };
    }),

  updatePosition: (id, updates) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          positions: state.project.positions.map((pos) =>
            pos.id === id ? { ...pos, ...updates } : pos
          ),
          updatedAt: new Date(),
        },
        history: pushHistory(state.history, state.project),
      };
    }),

  deletePosition: (id) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          positions: state.project.positions.filter((pos) => pos.id !== id),
          events: state.project.events.filter((evt) => evt.positionId !== id),
          updatedAt: new Date(),
        },
        history: pushHistory(state.history, state.project),
        selectedPosition: state.selectedPosition?.id === id ? null : state.selectedPosition,
      };
    }),

  selectPosition: (position) => set({ selectedPosition: position }),

  // Rack management
  addRackToPosition: (positionId, rack) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          positions: state.project.positions.map((pos) =>
            pos.id === positionId ? { ...pos, racks: [...pos.racks, rack] } : pos
          ),
          updatedAt: new Date(),
        },
        history: pushHistory(state.history, state.project),
      };
    }),

  updateRack: (positionId, rackId, updates) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          positions: state.project.positions.map((pos) =>
            pos.id === positionId
              ? {
                  ...pos,
                  racks: pos.racks.map((rack) =>
                    rack.id === rackId ? { ...rack, ...updates } : rack
                  ),
                }
              : pos
          ),
          updatedAt: new Date(),
        },
        history: pushHistory(state.history, state.project),
      };
    }),

  deleteRack: (positionId, rackId) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          positions: state.project.positions.map((pos) =>
            pos.id === positionId
              ? { ...pos, racks: pos.racks.filter((rack) => rack.id !== rackId) }
              : pos
          ),
          events: state.project.events.filter((evt) => evt.rackId !== rackId),
          updatedAt: new Date(),
        },
        history: pushHistory(state.history, state.project),
        selectedRack: state.selectedRack?.id === rackId ? null : state.selectedRack,
      };
    }),

  selectRack: (rack) => set({ selectedRack: rack }),

  // Tube management
  loadTube: (positionId, rackId, tubeIndex, effect) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          positions: state.project.positions.map((pos) =>
            pos.id === positionId
              ? {
                  ...pos,
                  racks: pos.racks.map((rack) =>
                    rack.id === rackId
                      ? {
                          ...rack,
                          tubes: rack.tubes.map((tube) =>
                            tube.index === tubeIndex
                              ? { ...tube, loaded: true, effect, isFired: false }
                              : tube
                          ),
                        }
                      : rack
                  ),
                }
              : pos
          ),
          updatedAt: new Date(),
        },
        history: pushHistory(state.history, state.project),
      };
    }),

  unloadTube: (positionId, rackId, tubeIndex) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          positions: state.project.positions.map((pos) =>
            pos.id === positionId
              ? {
                  ...pos,
                  racks: pos.racks.map((rack) =>
                    rack.id === rackId
                      ? {
                          ...rack,
                          tubes: rack.tubes.map((tube) =>
                            tube.index === tubeIndex
                              ? { ...tube, loaded: false, effect: null, isFired: false }
                              : tube
                          ),
                        }
                      : rack
                  ),
                }
              : pos
          ),
          updatedAt: new Date(),
        },
        history: pushHistory(state.history, state.project),
      };
    }),
  refillTubes: () =>
    set((state) => {
      if (!state.project) return state;
      const nextPositions = state.project.positions.map((pos) => ({
        ...pos,
        racks: pos.racks.map((rack) => ({
          ...rack,
          tubes: rack.tubes.map((tube) => ({
            ...tube,
            loaded: !!tube.effect,
            isFired: false,
          })),
        })),
      }));
      return {
        project: {
          ...state.project,
          positions: nextPositions,
          updatedAt: new Date(),
        },
        history: pushHistory(state.history, state.project),
      };
    }),
  fireTube: (positionId, rackId, tubeIndex) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          positions: state.project.positions.map((pos) =>
            pos.id === positionId
              ? {
                  ...pos,
                  racks: pos.racks.map((rack) =>
                    rack.id === rackId
                      ? {
                          ...rack,
                          tubes: rack.tubes.map((tube) =>
                            tube.index === tubeIndex
                              ? { ...tube, loaded: false, isFired: true }
                              : tube
                          ),
                        }
                      : rack
                  ),
                }
              : pos
          ),
          updatedAt: new Date(),
        },
        history: pushHistory(state.history, state.project),
      };
    }),

  // Event management
  addEvent: (event) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          events: [...state.project.events, event],
          updatedAt: new Date(),
        },
        history: pushHistory(state.history, state.project),
      };
    }),

  updateEvent: (id, updates) =>
    set((state) => {
      if (!state.project) return state;
      let nextSelectedEvent = state.selectedEvent;
      let nextSelectedCue = state.selectedCue;
      return {
        project: {
          ...state.project,
          events: state.project.events.map((evt) => {
            if (evt.id !== id) return evt;
            const nextEvent = { ...evt, ...updates };
            if (state.selectedEvent?.id === id) {
              nextSelectedEvent = nextEvent;
            }
            if (state.selectedCue?.id === id) {
              nextSelectedCue = nextEvent;
            }
            return nextEvent;
          }),
          updatedAt: new Date(),
        },
        history: pushHistory(state.history, state.project),
        selectedEvent: nextSelectedEvent,
        selectedCue: nextSelectedCue,
      };
    }),

  deleteEvent: (id) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          events: state.project.events.filter((evt) => evt.id !== id),
          updatedAt: new Date(),
        },
        history: pushHistory(state.history, state.project),
        selectedEvent: state.selectedEvent?.id === id ? null : state.selectedEvent,
      };
    }),

  selectEvent: (event) => set({ selectedEvent: event }),

  // Playback
  setCurrentTime: (time) =>
    set((state) => ({
      currentTime: Math.max(0, Math.min(time, state.project?.duration ?? time)),
    })),

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  requestReplay: () => set((state) => ({ replayToken: state.replayToken + 1 })),
}));

