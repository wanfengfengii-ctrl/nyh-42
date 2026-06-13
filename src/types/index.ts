export type GearType = 'sun' | 'planet' | 'shaft';
export type RotationDirection = 'cw' | 'ccw';
export type MeshType = 'mesh' | 'shaft';

export interface Gear {
  id: string;
  name: string;
  type: GearType;
  teeth: number;
  x: number;
  y: number;
  initialAngle: number;
  direction: RotationDirection;
  isDriver: boolean;
  shaftId?: string;
  color: string;
}

export interface Shaft {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface MeshRelation {
  id: string;
  sourceId: string;
  targetId: string;
  type: MeshType;
}

export interface GearState {
  gearId: string;
  angularVelocity: number;
  direction: RotationDirection;
  currentAngle: number;
  isValid: boolean;
}

export type ValidationErrorType =
  | 'teeth_invalid'
  | 'shaft_conflict'
  | 'chain_broken'
  | 'self_lock'
  | 'direction_conflict'
  | 'no_driver'
  | 'duplicate_driver_on_shaft';

export interface BreakpointInfo {
  gearId: string;
  neighborIds: string[];
  expectedConnectionType: 'mesh' | 'shaft';
}

export interface ValidationError {
  type: ValidationErrorType;
  gearIds: string[];
  message: string;
  breakpointInfo?: BreakpointInfo;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ShaftGroup {
  shaftId: string;
  shaftName: string;
  x: number;
  y: number;
  gearIds: string[];
  hasDriver: boolean;
  driverId: string | null;
}

export interface ConflictItem {
  type: ValidationErrorType;
  severity: 'error' | 'warning';
  message: string;
  gearIds: string[];
  shaftId?: string;
}

export interface ConflictReport {
  timestamp: number;
  conflicts: ConflictItem[];
  totalErrors: number;
  totalWarnings: number;
  canSave: boolean;
}

export interface ChainRecommendation {
  sourceGearId: string;
  targetGearId: string;
  connectionType: 'mesh' | 'shaft';
  reason: string;
  estimatedRatio: number;
}

export interface Scheme {
  id: string;
  name: string;
  gears: Gear[];
  shafts: Shaft[];
  meshes: MeshRelation[];
  driverId: string;
  driverSpeed: number;
  createdAt: number;
  updatedAt: number;
}

export interface CurvePoint {
  time: number;
  angle: number;
}

export type TimePeriod = 'day' | 'year';

export interface AnimationState {
  isPlaying: boolean;
  timeScale: number;
  elapsedTime: number;
}

export interface SnapTarget {
  shaftId: string;
  x: number;
  y: number;
  distance: number;
}

export type CelestialBody =
  | 'sun'
  | 'moon'
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'custom';

export interface CelestialPeriod {
  body: CelestialBody;
  name: string;
  periodDays: number;
  description: string;
}

export interface ReverseSearchParams {
  targetPeriodDays: number;
  targetDirection: RotationDirection;
  errorTolerancePercent: number;
  maxStages: number;
  minTeeth: number;
  maxTeeth: number;
  maxDiameter: number;
  driverSpeedRpm: number;
  preferFewerStages: boolean;
  preferSmallerSize: boolean;
  avoidSelfLock: boolean;
}

export interface GearStage {
  driverTeeth: number;
  drivenTeeth: number;
  ratio: number;
}

export interface CandidateScheme {
  id: string;
  stages: GearStage[];
  totalRatio: number;
  actualPeriodDays: number;
  theoreticalErrorPercent: number;
  stageCount: number;
  totalGearCount: number;
  estimatedDiameter: number;
  hasSelfLock: boolean;
  directionConflict: boolean;
  outputDirection: RotationDirection;
  score: number;
  gears: Gear[];
  shafts: Shaft[];
  meshes: MeshRelation[];
  driverId: string;
  driverSpeed: number;
}

export interface ReverseSearchState {
  isOpen: boolean;
  isSearching: boolean;
  searchProgress: number;
  params: ReverseSearchParams;
  candidates: CandidateScheme[];
  selectedCandidateIds: string[];
  sortBy: 'error' | 'stages' | 'size' | 'score';
  filterSelfLock: boolean;
  filterDirectionConflict: boolean;
  maxResults: number;
}

export const CELESTIAL_PERIODS: CelestialPeriod[] = [
  { body: 'sun', name: '太阳日', periodDays: 1, description: '地球自转一周（24小时）' },
  { body: 'moon', name: '月球朔望月', periodDays: 29.53059, description: '月相变化周期' },
  { body: 'mercury', name: '水星公转', periodDays: 87.9691, description: '水星绕太阳一周' },
  { body: 'venus', name: '金星公转', periodDays: 224.701, description: '金星绕太阳一周' },
  { body: 'earth', name: '地球回归年', periodDays: 365.2422, description: '地球绕太阳一周' },
  { body: 'mars', name: '火星公转', periodDays: 686.98, description: '火星绕太阳一周' },
  { body: 'jupiter', name: '木星公转', periodDays: 4332.59, description: '木星绕太阳一周（约11.86年）' },
  { body: 'saturn', name: '土星公转', periodDays: 10759.22, description: '土星绕太阳一周（约29.46年）' },
];
