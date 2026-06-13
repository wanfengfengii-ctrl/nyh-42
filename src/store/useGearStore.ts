import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  Gear,
  GearType,
  MeshRelation,
  MeshType,
  RotationDirection,
  Scheme,
  Shaft,
  TimePeriod,
  ValidationResult,
} from '@/types';
import { validateAll } from '@/engine/validation';
import { loadSchemes, saveSingleScheme, deleteScheme } from '@/utils/storage';

const GEAR_COLORS = [
  '#d4753c',
  '#4a90a4',
  '#8b5cf6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
];

function pickColor(index: number): string {
  return GEAR_COLORS[index % GEAR_COLORS.length];
}

interface GearStore {
  gears: Gear[];
  shafts: Shaft[];
  meshes: MeshRelation[];
  selectedGearId: string | null;
  selectedMeshId: string | null;
  driverId: string;
  driverSpeed: number;
  timePeriod: TimePeriod;
  isPlaying: boolean;
  timeScale: number;
  elapsedTime: number;
  isCreatingMesh: boolean;
  meshSourceId: string | null;
  pendingMeshType: MeshType;
  mousePos: { x: number; y: number };
  savedSchemes: Scheme[];
  validation: ValidationResult;
  schemeName: string;
  currentSchemeId: string | null;

  addGear: (type: GearType, x: number, y: number) => void;
  updateGear: (id: string, updates: Partial<Gear>) => void;
  removeGear: (id: string) => void;
  selectGear: (id: string | null) => void;
  moveGear: (id: string, x: number, y: number) => void;

  addShaft: (x: number, y: number) => void;
  removeShaft: (id: string) => void;

  startCreatingMesh: (sourceId: string, type: MeshType) => void;
  cancelCreatingMesh: () => void;
  completeMesh: (targetId: string) => void;
  removeMesh: (id: string) => void;
  selectMesh: (id: string | null) => void;
  setMousePos: (pos: { x: number; y: number }) => void;

  setDriver: (id: string) => void;
  setDriverSpeed: (speed: number) => void;
  setTimePeriod: (period: TimePeriod) => void;

  setPlaying: (playing: boolean) => void;
  setTimeScale: (scale: number) => void;
  setElapsedTime: (time: number) => void;
  tick: (deltaSeconds: number) => void;
  resetTime: () => void;

  validate: () => void;

  newScheme: () => void;
  loadScheme: (id: string) => void;
  saveCurrentScheme: () => boolean;
  deleteSavedScheme: (id: string) => void;
  setSchemeName: (name: string) => void;
  refreshSavedSchemes: () => void;
}

export const useGearStore = create<GearStore>((set, get) => ({
  gears: [],
  shafts: [],
  meshes: [],
  selectedGearId: null,
  selectedMeshId: null,
  driverId: '',
  driverSpeed: 60,
  timePeriod: 'day',
  isPlaying: false,
  timeScale: 1,
  elapsedTime: 0,
  isCreatingMesh: false,
  meshSourceId: null,
  pendingMeshType: 'mesh',
  mousePos: { x: 0, y: 0 },
  savedSchemes: loadSchemes(),
  validation: { isValid: false, errors: [] },
  schemeName: '未命名方案',
  currentSchemeId: null,

  addGear: (type, x, y) => {
    const state = get();
    const index = state.gears.length;
    const id = uuidv4();
    const nameMap: Record<GearType, string> = {
      sun: '太阳轮',
      planet: '行星轮',
      shaft: '传动齿轮',
    };
    const newGear: Gear = {
      id,
      name: `${nameMap[type]} ${index + 1}`,
      type,
      teeth: type === 'shaft' ? 20 : 30,
      x,
      y,
      initialAngle: 0,
      direction: 'cw',
      isDriver: index === 0,
      color: pickColor(index),
    };
    const newGears = [...state.gears, newGear];
    const newDriverId = state.driverId || (index === 0 ? id : state.driverId);
    set({ gears: newGears, driverId: newDriverId });
    get().validate();
  },

  updateGear: (id, updates) => {
    set((s) => ({
      gears: s.gears.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    }));
    get().validate();
  },

  removeGear: (id) => {
    set((s) => {
      const newGears = s.gears.filter((g) => g.id !== id);
      const newMeshes = s.meshes.filter((m) => m.sourceId !== id && m.targetId !== id);
      const newDriverId = s.driverId === id ? (newGears[0]?.id || '') : s.driverId;
      const newSelected = s.selectedGearId === id ? null : s.selectedGearId;
      if (newDriverId && newGears.length > 0) {
        newGears.forEach((g) => {
          if (g.id === newDriverId) g.isDriver = true;
        });
      }
      return {
        gears: newGears,
        meshes: newMeshes,
        driverId: newDriverId,
        selectedGearId: newSelected,
      };
    });
    get().validate();
  },

  selectGear: (id) => {
    set({ selectedGearId: id, selectedMeshId: null });
  },

  moveGear: (id, x, y) => {
    set((s) => ({
      gears: s.gears.map((g) => (g.id === id ? { ...g, x, y } : g)),
    }));
  },

  addShaft: (x, y) => {
    const state = get();
    const index = state.shafts.length;
    set((s) => ({
      shafts: [
        ...s.shafts,
        { id: uuidv4(), name: `传动轴 ${index + 1}`, x, y },
      ],
    }));
  },

  removeShaft: (id) => {
    set((s) => ({
      shafts: s.shafts.filter((sh) => sh.id !== id),
      gears: s.gears.map((g) => (g.shaftId === id ? { ...g, shaftId: undefined } : g)),
    }));
  },

  startCreatingMesh: (sourceId, type) => {
    set({
      isCreatingMesh: true,
      meshSourceId: sourceId,
      pendingMeshType: type,
    });
  },

  cancelCreatingMesh: () => {
    set({ isCreatingMesh: false, meshSourceId: null });
  },

  completeMesh: (targetId) => {
    const state = get();
    if (!state.meshSourceId || state.meshSourceId === targetId) {
      set({ isCreatingMesh: false, meshSourceId: null });
      return;
    }
    const exists = state.meshes.some(
      (m) =>
        (m.sourceId === state.meshSourceId && m.targetId === targetId) ||
        (m.sourceId === targetId && m.targetId === state.meshSourceId)
    );
    if (!exists) {
      set((s) => ({
        meshes: [
          ...s.meshes,
          {
            id: uuidv4(),
            sourceId: s.meshSourceId!,
            targetId,
            type: s.pendingMeshType,
          },
        ],
        isCreatingMesh: false,
        meshSourceId: null,
      }));
    } else {
      set({ isCreatingMesh: false, meshSourceId: null });
    }
    get().validate();
  },

  removeMesh: (id) => {
    set((s) => ({
      meshes: s.meshes.filter((m) => m.id !== id),
      selectedMeshId: s.selectedMeshId === id ? null : s.selectedMeshId,
    }));
    get().validate();
  },

  selectMesh: (id) => {
    set({ selectedMeshId: id, selectedGearId: null });
  },

  setMousePos: (pos) => {
    set({ mousePos: pos });
  },

  setDriver: (id) => {
    set((s) => ({
      driverId: id,
      gears: s.gears.map((g) => ({ ...g, isDriver: g.id === id })),
    }));
    get().validate();
  },

  setDriverSpeed: (speed) => {
    set({ driverSpeed: speed });
    get().validate();
  },

  setTimePeriod: (period) => {
    set({ timePeriod: period });
  },

  setPlaying: (playing) => {
    set({ isPlaying: playing });
  },

  setTimeScale: (scale) => {
    set({ timeScale: scale });
  },

  setElapsedTime: (time) => {
    set({ elapsedTime: time });
  },

  tick: (deltaSeconds) => {
    set((s) => ({
      elapsedTime: s.elapsedTime + deltaSeconds * s.timeScale,
    }));
  },

  resetTime: () => {
    set({ elapsedTime: 0 });
  },

  validate: () => {
    const s = get();
    const result = validateAll(s.gears, s.meshes, s.driverId, s.driverSpeed);
    set({ validation: result });
  },

  newScheme: () => {
    set({
      gears: [],
      shafts: [],
      meshes: [],
      selectedGearId: null,
      selectedMeshId: null,
      driverId: '',
      driverSpeed: 60,
      isPlaying: false,
      elapsedTime: 0,
      isCreatingMesh: false,
      meshSourceId: null,
      schemeName: '未命名方案',
      validation: { isValid: false, errors: [] },
      currentSchemeId: null,
    });
  },

  loadScheme: (id) => {
    const scheme = get().savedSchemes.find((s) => s.id === id);
    if (scheme) {
      set({
        gears: scheme.gears,
        shafts: scheme.shafts,
        meshes: scheme.meshes,
        driverId: scheme.driverId,
        driverSpeed: scheme.driverSpeed,
        selectedGearId: null,
        selectedMeshId: null,
        isPlaying: false,
        elapsedTime: 0,
        isCreatingMesh: false,
        meshSourceId: null,
        schemeName: scheme.name,
        currentSchemeId: scheme.id,
      });
      get().validate();
    }
  },

  saveCurrentScheme: () => {
    const s = get();
    if (!s.validation.isValid) return false;
    const schemes = loadSchemes();
    let schemeId = s.currentSchemeId;
    if (!schemeId) {
      const existingByName = schemes.find((sc) => sc.name === s.schemeName);
      schemeId = existingByName?.id || uuidv4();
    }
    const existingScheme = schemes.find((sc) => sc.id === schemeId);
    const scheme: Scheme = {
      id: schemeId,
      name: s.schemeName,
      gears: s.gears,
      shafts: s.shafts,
      meshes: s.meshes,
      driverId: s.driverId,
      driverSpeed: s.driverSpeed,
      createdAt: existingScheme?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    saveSingleScheme(scheme);
    set({ savedSchemes: loadSchemes(), currentSchemeId: schemeId });
    return true;
  },

  deleteSavedScheme: (id) => {
    deleteScheme(id);
    set({ savedSchemes: loadSchemes() });
  },

  setSchemeName: (name) => {
    set({ schemeName: name });
  },

  refreshSavedSchemes: () => {
    set({ savedSchemes: loadSchemes() });
  },
}));
