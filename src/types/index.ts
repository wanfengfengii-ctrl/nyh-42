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
