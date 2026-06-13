import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  Gear,
  GearType,
  MeshRelation,
  MeshType,
  Scheme,
  Shaft,
  ShaftGroup,
  TimePeriod,
  ValidationResult,
  ConflictReport,
  ChainRecommendation,
  SnapTarget,
  ReverseSearchParams,
  ReverseSearchState,
  CandidateScheme,
} from '@/types';
import { validateAll, generateConflictReport } from '@/engine/validation';
import { computeShaftGroups, findSnapTarget, canMountGearToShaft } from '@/engine/shaftAssembly';
import { recommendChains } from '@/engine/chainRecommender';
import { runReverseSearch, sortCandidates, filterCandidates } from '@/engine/reverseGearSearch';
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
  shaftGroups: ShaftGroup[];
  conflictReport: ConflictReport | null;
  chainRecommendations: ChainRecommendation[];
  activeSnapTarget: SnapTarget | null;
  reverseSearch: ReverseSearchState;

  addGear: (type: GearType, x: number, y: number) => void;
  updateGear: (id: string, updates: Partial<Gear>) => void;
  removeGear: (id: string) => void;
  selectGear: (id: string | null) => void;
  moveGear: (id: string, x: number, y: number) => void;

  addShaft: (x: number, y: number) => void;
  removeShaft: (id: string) => void;

  mountGearToShaft: (gearId: string, shaftId: string) => void;
  unmountGearFromShaft: (gearId: string) => void;
  updateSnapTarget: (gearId: string, x: number, y: number) => void;

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
  generateReport: () => ConflictReport;
  getChainRecommendations: () => ChainRecommendation[];
  applyChainRecommendation: (rec: ChainRecommendation) => void;

  newScheme: () => void;
  loadScheme: (id: string) => void;
  saveCurrentScheme: () => boolean;
  deleteSavedScheme: (id: string) => void;
  setSchemeName: (name: string) => void;
  refreshSavedSchemes: () => void;

  setReverseSearchOpen: (open: boolean) => void;
  setReverseSearchParams: (params: Partial<ReverseSearchParams>) => void;
  runReverseGearSearch: () => Promise<void>;
  setReverseSearchSortBy: (sortBy: ReverseSearchState['sortBy']) => void;
  setReverseSearchFilter: (filter: 'filterSelfLock' | 'filterDirectionConflict', value: boolean) => void;
  toggleCandidateSelection: (candidateId: string) => void;
  clearCandidateSelection: () => void;
  applyCandidateScheme: (candidate: CandidateScheme) => void;
}

function recomputeShaftGroups(gears: Gear[], shafts: Shaft[]): ShaftGroup[] {
  return computeShaftGroups(gears, shafts);
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
  shaftGroups: [],
  conflictReport: null,
  chainRecommendations: [],
  activeSnapTarget: null,
  reverseSearch: {
    isOpen: false,
    isSearching: false,
    searchProgress: 0,
    params: {
      targetPeriodDays: 365.2422,
      targetDirection: 'cw',
      errorTolerancePercent: 1,
      maxStages: 4,
      minTeeth: 10,
      maxTeeth: 120,
      maxDiameter: 800,
      driverSpeedRpm: 60,
      preferFewerStages: true,
      preferSmallerSize: false,
      avoidSelfLock: true,
      maxResults: 30,
    },
    allCandidates: [],
    candidates: [],
    selectedCandidateIds: [],
    sortBy: 'score',
    filterSelfLock: false,
    filterDirectionConflict: false,
    maxResults: 30,
  },

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
    set({
      gears: newGears,
      driverId: newDriverId,
      shaftGroups: recomputeShaftGroups(newGears, state.shafts),
    });
    get().validate();
  },

  updateGear: (id, updates) => {
    set((s) => {
      const newGears = s.gears.map((g) => (g.id === id ? { ...g, ...updates } : g));
      return {
        gears: newGears,
        shaftGroups: recomputeShaftGroups(newGears, s.shafts),
      };
    });
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
        shaftGroups: recomputeShaftGroups(newGears, s.shafts),
      };
    });
    get().validate();
  },

  selectGear: (id) => {
    set({ selectedGearId: id, selectedMeshId: null });
  },

  moveGear: (id, x, y) => {
    set((s) => {
      const newGears = s.gears.map((g) => (g.id === id ? { ...g, x, y } : g));
      return {
        gears: newGears,
        shaftGroups: recomputeShaftGroups(newGears, s.shafts),
      };
    });
  },

  addShaft: (x, y) => {
    const state = get();
    const index = state.shafts.length;
    const newShafts = [
      ...state.shafts,
      { id: uuidv4(), name: `传动轴 ${index + 1}`, x, y },
    ];
    set((s) => ({
      shafts: newShafts,
      shaftGroups: recomputeShaftGroups(s.gears, newShafts),
    }));
  },

  removeShaft: (id) => {
    set((s) => {
      const newShafts = s.shafts.filter((sh) => sh.id !== id);
      const newGears = s.gears.map((g) => (g.shaftId === id ? { ...g, shaftId: undefined } : g));
      return {
        shafts: newShafts,
        gears: newGears,
        shaftGroups: recomputeShaftGroups(newGears, newShafts),
      };
    });
    get().validate();
  },

  mountGearToShaft: (gearId, shaftId) => {
    const state = get();
    const gear = state.gears.find((g) => g.id === gearId);
    if (!gear) {
      set({ activeSnapTarget: null });
      return;
    }

    const check = canMountGearToShaft(gear, shaftId, state.gears, state.driverId);
    if (!check.allowed) {
      set({ activeSnapTarget: null });
      return;
    }

    const shaft = state.shafts.find((s) => s.id === shaftId);
    if (!shaft) {
      set({ activeSnapTarget: null });
      return;
    }

    set((s) => {
      const newGears = s.gears.map((g) => {
        if (g.id === gearId) {
          return { ...g, shaftId, x: shaft.x, y: shaft.y };
        }
        return g;
      });
      return {
        gears: newGears,
        shaftGroups: recomputeShaftGroups(newGears, s.shafts),
        activeSnapTarget: null,
      };
    });
    get().validate();
  },

  unmountGearFromShaft: (gearId) => {
    set((s) => {
      const newGears = s.gears.map((g) => {
        if (g.id === gearId) {
          const copy = { ...g };
          delete copy.shaftId;
          return copy;
        }
        return g;
      });
      return {
        gears: newGears,
        shaftGroups: recomputeShaftGroups(newGears, s.shafts),
      };
    });
    get().validate();
  },

  updateSnapTarget: (gearId, x, y) => {
    const state = get();
    const gear = state.gears.find((g) => g.id === gearId);
    const snap = findSnapTarget(x, y, state.shafts, gear?.shaftId);
    set({ activeSnapTarget: snap });
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

  generateReport: () => {
    const s = get();
    const report = generateConflictReport(s.gears, s.meshes, s.driverId, s.driverSpeed);
    set({ conflictReport: report });
    return report;
  },

  getChainRecommendations: () => {
    const s = get();
    const recs = recommendChains(s.gears, s.meshes, s.driverId);
    set({ chainRecommendations: recs });
    return recs;
  },

  applyChainRecommendation: (rec) => {
    const state = get();
    const exists = state.meshes.some(
      (m) =>
        (m.sourceId === rec.sourceGearId && m.targetId === rec.targetGearId) ||
        (m.sourceId === rec.targetGearId && m.targetId === rec.sourceGearId)
    );
    if (!exists) {
      set((s) => ({
        meshes: [
          ...s.meshes,
          {
            id: uuidv4(),
            sourceId: rec.sourceGearId,
            targetId: rec.targetGearId,
            type: rec.connectionType,
          },
        ],
        chainRecommendations: s.chainRecommendations.filter(
          (r) => !(r.sourceGearId === rec.sourceGearId && r.targetGearId === rec.targetGearId)
        ),
      }));
      get().validate();
    }
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
      shaftGroups: [],
      conflictReport: null,
      chainRecommendations: [],
      activeSnapTarget: null,
    });
  },

  loadScheme: (id) => {
    const scheme = get().savedSchemes.find((s) => s.id === id);
    if (scheme) {
      const shaftGroups = computeShaftGroups(scheme.gears, scheme.shafts);
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
        shaftGroups,
        conflictReport: null,
        chainRecommendations: [],
        activeSnapTarget: null,
      });
      get().validate();
    }
  },

  saveCurrentScheme: () => {
    const s = get();
    const report = s.generateReport();
    if (!report.canSave) return false;
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

  setReverseSearchOpen: (open) => {
    set((s) => ({ reverseSearch: { ...s.reverseSearch, isOpen: open } }));
  },

  setReverseSearchParams: (params) => {
    set((s) => ({
      reverseSearch: {
        ...s.reverseSearch,
        params: { ...s.reverseSearch.params, ...params },
      },
    }));
  },

  runReverseGearSearch: async () => {
    const s = get();
    set({ reverseSearch: { ...s.reverseSearch, isSearching: true, searchProgress: 0, candidates: [] } });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const results = runReverseSearch(s.reverseSearch.params, (progress) => {
      set((st) => ({ reverseSearch: { ...st.reverseSearch, searchProgress: progress } }));
    });

    const filtered = filterCandidates(results, s.reverseSearch.filterSelfLock, s.reverseSearch.filterDirectionConflict);
    const sorted = sortCandidates(filtered, s.reverseSearch.sortBy);

    set((st) => ({
      reverseSearch: {
        ...st.reverseSearch,
        isSearching: false,
        searchProgress: 100,
        allCandidates: results,
        candidates: sorted,
        selectedCandidateIds: [],
      },
    }));
  },

  setReverseSearchSortBy: (sortBy) => {
    set((s) => {
      const filtered = filterCandidates(
        s.reverseSearch.allCandidates,
        s.reverseSearch.filterSelfLock,
        s.reverseSearch.filterDirectionConflict
      );
      const sorted = sortCandidates(filtered, sortBy);
      return {
        reverseSearch: {
          ...s.reverseSearch,
          sortBy,
          candidates: sorted,
        },
      };
    });
  },

  setReverseSearchFilter: (filter, value) => {
    set((s) => {
      const newFilters = { ...s.reverseSearch, [filter]: value };
      const filtered = filterCandidates(
        s.reverseSearch.allCandidates,
        newFilters.filterSelfLock,
        newFilters.filterDirectionConflict
      );
      const sorted = sortCandidates(filtered, s.reverseSearch.sortBy);
      return {
        reverseSearch: {
          ...s.reverseSearch,
          [filter]: value,
          candidates: sorted,
        },
      };
    });
  },

  toggleCandidateSelection: (candidateId) => {
    set((s) => {
      const selected = s.reverseSearch.selectedCandidateIds;
      const newSelected = selected.includes(candidateId)
        ? selected.filter((id) => id !== candidateId)
        : [...selected, candidateId];
      return {
        reverseSearch: { ...s.reverseSearch, selectedCandidateIds: newSelected },
      };
    });
  },

  clearCandidateSelection: () => {
    set((s) => ({ reverseSearch: { ...s.reverseSearch, selectedCandidateIds: [] } }));
  },

  applyCandidateScheme: (candidate) => {
    const shaftGroups = computeShaftGroups(candidate.gears, candidate.shafts);
    set({
      gears: candidate.gears,
      shafts: candidate.shafts,
      meshes: candidate.meshes,
      driverId: candidate.driverId,
      driverSpeed: candidate.driverSpeed,
      selectedGearId: null,
      selectedMeshId: null,
      isPlaying: false,
      elapsedTime: 0,
      isCreatingMesh: false,
      meshSourceId: null,
      schemeName: `反推方案 ${candidate.stageCount}级`,
      currentSchemeId: null,
      shaftGroups,
      conflictReport: null,
      chainRecommendations: [],
      activeSnapTarget: null,
      reverseSearch: { ...get().reverseSearch, isOpen: false },
    });
    get().validate();
  },
}));
