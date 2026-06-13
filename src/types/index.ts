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
  | 'no_driver';

export interface ValidationError {
  type: ValidationErrorType;
  gearIds: string[];
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
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
