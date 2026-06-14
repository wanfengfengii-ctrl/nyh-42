export type GearType = 'sun' | 'planet' | 'shaft';
export type RotationDirection = 'cw' | 'ccw';
export type MeshType = 'mesh' | 'shaft';

export type GearMaterial = 'steel_45' | 'steel_20CrMnTi' | 'steel_40Cr' | 'brass' | 'aluminum_6061' | 'plastic_POM' | 'cast_iron';
export type MachiningPrecision = 'IT3' | 'IT4' | 'IT5' | 'IT6' | 'IT7' | 'IT8' | 'IT9' | 'IT10' | 'IT11' | 'IT12';
export type DifficultyLevel = 'very_easy' | 'easy' | 'moderate' | 'difficult' | 'very_difficult';
export type RiskLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';

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

export interface GearStage {
  driverTeeth: number;
  drivenTeeth: number;
  ratio: number;
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

export interface MaterialProperties {
  name: string;
  density: number;
  tensileStrength: number;
  yieldStrength: number;
  hardness: string;
  machinability: number;
  costIndex: number;
  typicalApplications: string;
}

export const MATERIAL_PROPERTIES: Record<GearMaterial, MaterialProperties> = {
  steel_45: {
    name: '45号钢',
    density: 7.85,
    tensileStrength: 600,
    yieldStrength: 355,
    hardness: 'HB170-217',
    machinability: 0.75,
    costIndex: 1.0,
    typicalApplications: '中等载荷齿轮、传动轴',
  },
  steel_20CrMnTi: {
    name: '20CrMnTi渗碳钢',
    density: 7.85,
    tensileStrength: 1080,
    yieldStrength: 835,
    hardness: 'HRC58-62',
    machinability: 0.45,
    costIndex: 2.2,
    typicalApplications: '汽车变速箱、重载齿轮',
  },
  steel_40Cr: {
    name: '40Cr调质钢',
    density: 7.85,
    tensileStrength: 980,
    yieldStrength: 785,
    hardness: 'HB229-286',
    machinability: 0.65,
    costIndex: 1.5,
    typicalApplications: '机床齿轮、中速中载',
  },
  brass: {
    name: '黄铜H62',
    density: 8.5,
    tensileStrength: 370,
    yieldStrength: 200,
    hardness: 'HB56-86',
    machinability: 0.95,
    costIndex: 3.5,
    typicalApplications: '仪表齿轮、低载精密传动',
  },
  aluminum_6061: {
    name: '铝合金6061-T6',
    density: 2.7,
    tensileStrength: 310,
    yieldStrength: 276,
    hardness: 'HB95',
    machinability: 0.9,
    costIndex: 2.0,
    typicalApplications: '轻量化结构、低载高速',
  },
  plastic_POM: {
    name: '聚甲醛POM',
    density: 1.41,
    tensileStrength: 70,
    yieldStrength: 65,
    hardness: 'HRM80',
    machinability: 1.0,
    costIndex: 1.8,
    typicalApplications: '注塑齿轮、玩具、办公设备',
  },
  cast_iron: {
    name: '灰铸铁HT200',
    density: 7.2,
    tensileStrength: 200,
    yieldStrength: 170,
    hardness: 'HB170-230',
    machinability: 0.85,
    costIndex: 0.8,
    typicalApplications: '大型齿轮、低速重载',
  },
};

export const PRECISION_LEVELS: Record<MachiningPrecision, { name: string; grade: number; typicalUse: string; costMultiplier: number }> = {
  IT3: { name: 'IT3 超高精度', grade: 3, typicalUse: '测量仪器基准件', costMultiplier: 8.0 },
  IT4: { name: 'IT4 超高精度', grade: 4, typicalUse: '精密量仪、航空齿轮', costMultiplier: 5.0 },
  IT5: { name: 'IT5 高精度', grade: 5, typicalUse: '精密机床、伺服系统', costMultiplier: 3.5 },
  IT6: { name: 'IT6 高精度', grade: 6, typicalUse: '机床主轴、精密减速器', costMultiplier: 2.5 },
  IT7: { name: 'IT7 中高精度', grade: 7, typicalUse: '汽车变速箱、通用减速器', costMultiplier: 1.8 },
  IT8: { name: 'IT8 中等精度', grade: 8, typicalUse: '通用机械传动', costMultiplier: 1.4 },
  IT9: { name: 'IT9 中等精度', grade: 9, typicalUse: '农机、起重设备', costMultiplier: 1.2 },
  IT10: { name: 'IT10 一般精度', grade: 10, typicalUse: '普通传动件', costMultiplier: 1.0 },
  IT11: { name: 'IT11 较低精度', grade: 11, typicalUse: '冲压件、焊接件', costMultiplier: 0.9 },
  IT12: { name: 'IT12 低精度', grade: 12, typicalUse: '非配合表面', costMultiplier: 0.8 },
};

export interface ManufacturingConstraints {
  module: number;
  shaftDiameter: number;
  minToothThickness: number;
  machiningPrecision: MachiningPrecision;
  assemblyClearance: number;
  maxTotalWeight: number;
  material: GearMaterial;
  faceWidthFactor: number;
}

export interface ManufacturingDifficulty {
  score: number;
  level: DifficultyLevel;
  toothMachiningScore: number;
  materialHardnessScore: number;
  precisionRequirementScore: number;
  sizeExtremeScore: number;
  compoundGearScore: number;
  details: string[];
}

export interface AssemblyRisk {
  score: number;
  level: RiskLevel;
  clearanceFitScore: number;
  shaftCompatibilityScore: number;
  toleranceAccumulationScore: number;
  stageCountScore: number;
  details: string[];
}

export interface WeightEstimate {
  totalWeightGrams: number;
  perGearWeights: Array<{ gearId: string; gearName: string; weightGrams: number }>;
  shaftWeightGrams: number;
  overweight: boolean;
  weightLimit: number;
  details: string[];
}

export interface LifespanRisk {
  score: number;
  level: RiskLevel;
  contactStressScore: number;
  bendingStressScore: number;
  wearResistanceScore: number;
  fatigueLifeScore: number;
  details: string[];
}

export interface ManufacturingAssessment {
  overallScore: number;
  manufacturingDifficulty: ManufacturingDifficulty;
  assemblyRisk: AssemblyRisk;
  weightEstimate: WeightEstimate;
  lifespanRisk: LifespanRisk;
  feasibilityLevel: DifficultyLevel;
  recommendations: string[];
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
  maxResults: number;
  enableManufacturingAssessment: boolean;
  manufacturingConstraints: ManufacturingConstraints;
  preferManufacturable: boolean;
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
  manufacturingAssessment?: ManufacturingAssessment;
}

export type ReverseSearchSortBy = 'error' | 'stages' | 'size' | 'score' | 'manufacturability' | 'weight' | 'lifespan';

export interface ReverseSearchState {
  isOpen: boolean;
  isSearching: boolean;
  searchProgress: number;
  params: ReverseSearchParams;
  allCandidates: CandidateScheme[];
  candidates: CandidateScheme[];
  selectedCandidateIds: string[];
  sortBy: ReverseSearchSortBy;
  filterSelfLock: boolean;
  filterDirectionConflict: boolean;
  filterOverweight: boolean;
  maxResults: number;
}
