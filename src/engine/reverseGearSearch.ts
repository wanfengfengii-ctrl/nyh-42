import { v4 as uuidv4 } from 'uuid';
import type {
  Gear,
  GearStage,
  MeshRelation,
  RotationDirection,
  Shaft,
  CandidateScheme,
  ReverseSearchParams,
} from '@/types';
import { teethToRadius } from '@/utils/gearMath';
import { validateAll } from './validation';

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

const SECONDS_PER_DAY = 24 * 60 * 60;

function pickColor(index: number): string {
  return GEAR_COLORS[index % GEAR_COLORS.length];
}

export function targetPeriodToRatio(
  targetPeriodDays: number,
  driverSpeedRpm: number
): number {
  const targetRpm = SECONDS_PER_DAY / (targetPeriodDays * 60);
  return driverSpeedRpm / targetRpm;
}

export function ratioToPeriodDays(
  ratio: number,
  driverSpeedRpm: number
): number {
  const outputRpm = driverSpeedRpm / ratio;
  return SECONDS_PER_DAY / (outputRpm * 60);
}

function continuedFraction(x: number, maxIter: number = 20): number[] {
  const coeffs: number[] = [];
  let remaining = x;
  for (let i = 0; i < maxIter; i++) {
    const intPart = Math.floor(remaining);
    coeffs.push(intPart);
    const frac = remaining - intPart;
    if (Math.abs(frac) < 1e-10) break;
    remaining = 1 / frac;
  }
  return coeffs;
}

function convergents(coeffs: number[]): Array<{ num: number; den: number }> {
  const result: Array<{ num: number; den: number }> = [];
  let hPrev = 0, hCurr = 1;
  let kPrev = 1, kCurr = 0;
  for (const a of coeffs) {
    const hNext = a * hCurr + hPrev;
    const kNext = a * kCurr + kPrev;
    result.push({ num: hNext, den: kNext });
    hPrev = hCurr;
    hCurr = hNext;
    kPrev = kCurr;
    kCurr = kNext;
  }
  return result;
}

function findBestSingleStageRatio(
  targetRatio: number,
  minTeeth: number,
  maxTeeth: number
): { driverTeeth: number; drivenTeeth: number; ratio: number; error: number } | null {
  let best: { driverTeeth: number; drivenTeeth: number; ratio: number; error: number } | null = null;

  const coeffs = continuedFraction(targetRatio);
  const convs = convergents(coeffs);

  for (const conv of convs) {
    if (conv.den === 0) continue;
    const scaleLow = Math.max(
      Math.ceil(minTeeth / Math.max(conv.num, 1)),
      Math.ceil(minTeeth / Math.max(conv.den, 1))
    );
    const scaleHigh = Math.min(
      Math.floor(maxTeeth / Math.max(conv.num, 1)),
      Math.floor(maxTeeth / Math.max(conv.den, 1))
    );

    for (let s = scaleLow; s <= scaleHigh; s++) {
      const driverT = conv.den * s;
      const drivenT = conv.num * s;
      if (driverT < minTeeth || driverT > maxTeeth) continue;
      if (drivenT < minTeeth || drivenT > maxTeeth) continue;

      const ratio = drivenT / driverT;
      const error = Math.abs(ratio - targetRatio) / targetRatio;

      if (!best || error < best.error) {
        best = { driverTeeth: driverT, drivenTeeth: drivenT, ratio, error };
      }
    }
  }

  if (!best) {
    for (let d = minTeeth; d <= maxTeeth; d++) {
      for (let n = minTeeth; n <= maxTeeth; n++) {
        const ratio = n / d;
        const error = Math.abs(ratio - targetRatio) / targetRatio;
        if (!best || error < best.error) {
          best = { driverTeeth: d, drivenTeeth: n, ratio, error };
        }
      }
    }
  }

  return best;
}

export function searchGearStages(
  targetRatio: number,
  maxStages: number,
  minTeeth: number,
  maxTeeth: number,
  errorTolerancePercent: number
): GearStage[][] {
  const results: GearStage[][] = [];
  const tolerance = errorTolerancePercent / 100;

  function dfs(
    remainingRatio: number,
    stagesLeft: number,
    currentStages: GearStage[],
    depth: number
  ) {
    if (currentStages.length > maxStages) return;

    const error = Math.abs(remainingRatio - 1) / targetRatio;
    if (error <= tolerance && currentStages.length > 0) {
      results.push([...currentStages]);
      if (results.length > 200) return;
    }

    if (stagesLeft <= 0) return;

    const exploreRatios: number[] = [];

    if (remainingRatio > 1) {
      for (let r = Math.max(1.05, remainingRatio ** (1 / stagesLeft)); r <= Math.min(remainingRatio, maxTeeth / minTeeth); r += 0.05) {
        exploreRatios.push(r);
      }
      for (let r = remainingRatio; r >= Math.max(1.05, remainingRatio / 2); r -= 0.1) {
        if (!exploreRatios.includes(r)) exploreRatios.push(r);
      }
    } else if (remainingRatio < 1) {
      for (let r = Math.min(0.95, remainingRatio ** (1 / stagesLeft)); r >= Math.max(remainingRatio, minTeeth / maxTeeth); r -= 0.05) {
        exploreRatios.push(r);
      }
      for (let r = remainingRatio; r <= Math.min(0.95, remainingRatio * 2); r += 0.1) {
        if (!exploreRatios.includes(r)) exploreRatios.push(r);
      }
    }

    exploreRatios.push(remainingRatio);

    const stageCandidates: Array<{ driverTeeth: number; drivenTeeth: number; ratio: number }> = [];

    for (const ratio of exploreRatios.slice(0, 30)) {
      const stage = findBestSingleStageRatio(ratio, minTeeth, maxTeeth);
      if (stage) {
        stageCandidates.push(stage);
      }
    }

    stageCandidates.sort((a, b) => {
      const errA = Math.abs(a.ratio - remainingRatio ** (1 / stagesLeft)) / remainingRatio ** (1 / stagesLeft);
      const errB = Math.abs(b.ratio - remainingRatio ** (1 / stagesLeft)) / remainingRatio ** (1 / stagesLeft);
      return errA - errB;
    });

    for (const stage of stageCandidates.slice(0, 15)) {
      const newRemaining = remainingRatio / stage.ratio;
      const newStages = [...currentStages, {
        driverTeeth: stage.driverTeeth,
        drivenTeeth: stage.drivenTeeth,
        ratio: stage.ratio,
      }];
      dfs(newRemaining, stagesLeft - 1, newStages, depth + 1);
      if (results.length > 200) return;
    }
  }

  for (let stages = 1; stages <= maxStages; stages++) {
    dfs(targetRatio, stages, [], 0);
    if (results.length > 50) break;
  }

  return deduplicateStages(results);
}

function deduplicateStages(results: GearStage[][]): GearStage[][] {
  const seen = new Set<string>();
  const unique: GearStage[][] = [];
  for (const stages of results) {
    const key = stages.map(s => `${s.driverTeeth}:${s.drivenTeeth}`).join('|');
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(stages);
    }
  }
  return unique;
}

function estimateLayoutDiameter(stages: GearStage[]): number {
  const spacing = 20;
  const startX = 150;
  let prevR = teethToRadius(stages[0].driverTeeth);
  let x = startX;
  let minX = startX - prevR;
  let maxX = startX + prevR;

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const rDriven = teethToRadius(stage.drivenTeeth);
    x += prevR + rDriven + spacing;
    minX = Math.min(minX, x - rDriven);
    maxX = Math.max(maxX, x + rDriven);
    if (i < stages.length - 1) {
      const rNextDriver = teethToRadius(stages[i + 1].driverTeeth);
      minX = Math.min(minX, x - rNextDriver);
      maxX = Math.max(maxX, x + rNextDriver);
      prevR = rNextDriver;
    }
  }
  return maxX - minX;
}

function checkDirectionOutput(
  stageCount: number,
  targetDirection: RotationDirection,
  driverDirection: RotationDirection
): { outputDirection: RotationDirection; conflict: boolean } {
  const flips = stageCount;
  const outputDirection: RotationDirection =
    flips % 2 === 0 ? driverDirection : (driverDirection === 'cw' ? 'ccw' : 'cw');
  return {
    outputDirection,
    conflict: outputDirection !== targetDirection,
  };
}

function detectSelfLockRisk(stages: GearStage[]): boolean {
  let totalRatio = 1;
  for (const s of stages) {
    totalRatio *= s.ratio;
  }
  if (Math.abs(totalRatio) > 100) return true;
  if (Math.abs(totalRatio) < 0.01) return true;
  return false;
}

function buildSchemeLayout(
  stages: GearStage[],
  params: ReverseSearchParams
): { gears: Gear[]; shafts: Shaft[]; meshes: MeshRelation[]; driverId: string } {
  const gears: Gear[] = [];
  const shafts: Shaft[] = [];
  const meshes: MeshRelation[] = [];

  let gearIndex = 0;
  let xPos = 150;
  const yCenter = 250;

  const firstShaftId = uuidv4();
  const firstShaft: Shaft = {
    id: firstShaftId,
    name: `输入轴`,
    x: xPos,
    y: yCenter,
  };
  shafts.push(firstShaft);

  const driverGearId = uuidv4();
  const driverGear: Gear = {
    id: driverGearId,
    name: `主动轮`,
    type: 'sun',
    teeth: stages[0].driverTeeth,
    x: xPos,
    y: yCenter,
    initialAngle: 0,
    direction: params.targetDirection === 'cw' ? 'cw' : 'ccw',
    isDriver: true,
    shaftId: firstShaftId,
    color: pickColor(gearIndex),
  };
  gears.push(driverGear);
  gearIndex++;

  let prevGearId = driverGearId;
  let prevTeeth = stages[0].driverTeeth;

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const rPrev = teethToRadius(prevTeeth);
    const rNext = teethToRadius(stage.drivenTeeth);
    xPos += rPrev + rNext + 20;

    const nextShaftId = uuidv4();
    const nextShaft: Shaft = {
      id: nextShaftId,
      name: i === stages.length - 1 ? '输出轴' : `传动轴 ${i + 1}`,
      x: xPos,
      y: yCenter,
    };
    shafts.push(nextShaft);

    const drivenGearId = uuidv4();
    const isLast = i === stages.length - 1;
    const drivenGear: Gear = {
      id: drivenGearId,
      name: isLast ? '输出轮' : `从动轮 ${i + 1}`,
      type: isLast ? 'sun' : 'planet',
      teeth: stage.drivenTeeth,
      x: xPos,
      y: yCenter,
      initialAngle: 0,
      direction: params.targetDirection,
      isDriver: false,
      shaftId: nextShaftId,
      color: pickColor(gearIndex),
    };
    gears.push(drivenGear);
    gearIndex++;

    meshes.push({
      id: uuidv4(),
      sourceId: prevGearId,
      targetId: drivenGearId,
      type: 'mesh',
    });

    if (i < stages.length - 1) {
      const nextStage = stages[i + 1];
      const compoundGearId = uuidv4();
      const compoundGear: Gear = {
        id: compoundGearId,
        name: `双联轮 ${i + 1}`,
        type: 'shaft',
        teeth: nextStage.driverTeeth,
        x: xPos,
        y: yCenter,
        initialAngle: 0,
        direction: params.targetDirection,
        isDriver: false,
        shaftId: nextShaftId,
        color: pickColor(gearIndex),
      };
      gears.push(compoundGear);
      gearIndex++;

      prevGearId = compoundGearId;
      prevTeeth = nextStage.driverTeeth;
    }
  }

  return { gears, shafts, meshes, driverId: driverGearId };
}

export function scoreCandidate(
  candidate: CandidateScheme,
  params: ReverseSearchParams
): number {
  let score = 100;

  score -= candidate.theoreticalErrorPercent * 20;

  if (params.preferFewerStages) {
    score -= (candidate.stageCount - 1) * 15;
  } else {
    score -= (candidate.stageCount - 1) * 5;
  }

  if (params.preferSmallerSize) {
    const sizePenalty = Math.max(0, (candidate.estimatedDiameter - 300) / 100);
    score -= sizePenalty * 10;
  }

  if (candidate.hasSelfLock) {
    score -= params.avoidSelfLock ? 80 : 20;
  }

  if (candidate.directionConflict) {
    score -= 30;
  }

  return Math.max(0, score);
}

export function sortCandidates(
  candidates: CandidateScheme[],
  sortBy: 'error' | 'stages' | 'size' | 'score'
): CandidateScheme[] {
  const sorted = [...candidates];
  switch (sortBy) {
    case 'error':
      sorted.sort((a, b) => a.theoreticalErrorPercent - b.theoreticalErrorPercent);
      break;
    case 'stages':
      sorted.sort((a, b) => a.stageCount - b.stageCount || a.theoreticalErrorPercent - b.theoreticalErrorPercent);
      break;
    case 'size':
      sorted.sort((a, b) => a.estimatedDiameter - b.estimatedDiameter || a.theoreticalErrorPercent - b.theoreticalErrorPercent);
      break;
    case 'score':
      sorted.sort((a, b) => b.score - a.score);
      break;
  }
  return sorted;
}

export function filterCandidates(
  candidates: CandidateScheme[],
  filterSelfLock: boolean,
  filterDirectionConflict: boolean
): CandidateScheme[] {
  return candidates.filter((c) => {
    if (filterSelfLock && c.hasSelfLock) return false;
    if (filterDirectionConflict && c.directionConflict) return false;
    return true;
  });
}

export function runReverseSearch(
  params: ReverseSearchParams,
  onProgress?: (progress: number) => void
): CandidateScheme[] {
  onProgress?.(0);

  const targetRatio = targetPeriodToRatio(params.targetPeriodDays, params.driverSpeedRpm);
  onProgress?.(10);

  const stageCombinations = searchGearStages(
    targetRatio,
    params.maxStages,
    params.minTeeth,
    params.maxTeeth,
    params.errorTolerancePercent
  );
  onProgress?.(50);

  const candidates: CandidateScheme[] = [];

  for (let i = 0; i < stageCombinations.length; i++) {
    const stages = stageCombinations[i];
    const totalRatio = stages.reduce((acc, s) => acc * s.ratio, 1);
    const actualPeriod = ratioToPeriodDays(totalRatio, params.driverSpeedRpm);
    const errorPercent = Math.abs(actualPeriod - params.targetPeriodDays) / params.targetPeriodDays * 100;

    const driverDirection: RotationDirection = params.targetDirection;
    const dirInfo = checkDirectionOutput(stages.length, params.targetDirection, driverDirection);
    const hasSelfLock = detectSelfLockRisk(stages);
    const layout = buildSchemeLayout(stages, params);

    const validation = validateAll(layout.gears, layout.meshes, layout.driverId, params.driverSpeedRpm);
    const hasRealSelfLock = validation.errors.some((e) => e.type === 'self_lock');
    const hasRealDirConflict = validation.errors.some((e) => e.type === 'direction_conflict');

    const estimatedDiameter = estimateLayoutDiameter(stages);

    if (estimatedDiameter > params.maxDiameter) {
      continue;
    }

    const candidate: CandidateScheme = {
      id: uuidv4(),
      stages,
      totalRatio,
      actualPeriodDays: actualPeriod,
      theoreticalErrorPercent: errorPercent,
      stageCount: stages.length,
      totalGearCount: layout.gears.length,
      estimatedDiameter,
      hasSelfLock: hasSelfLock || hasRealSelfLock,
      directionConflict: dirInfo.conflict || hasRealDirConflict,
      outputDirection: dirInfo.outputDirection,
      score: 0,
      gears: layout.gears,
      shafts: layout.shafts,
      meshes: layout.meshes,
      driverId: layout.driverId,
      driverSpeed: params.driverSpeedRpm,
    };

    candidate.score = scoreCandidate(candidate, params);
    candidates.push(candidate);

    if (i % 10 === 0) {
      onProgress?.(50 + (i / stageCombinations.length) * 50);
    }
  }

  onProgress?.(100);

  const sorted = sortCandidates(candidates, 'score');
  return sorted.slice(0, params.maxResults || 50);
}
