import type { Gear, MeshRelation, ValidationError, ValidationResult, ConflictItem, ConflictReport, BreakpointInfo } from '@/types';
import { computeTransmission } from './transmission';
import { detectBreakpoints } from './shaftAssembly';

export function validateTeeth(gears: Gear[]): ValidationError[] {
  const errors: ValidationError[] = [];
  gears.forEach((g) => {
    if (!Number.isFinite(g.teeth) || g.teeth <= 0 || !Number.isInteger(g.teeth)) {
      errors.push({
        type: 'teeth_invalid',
        gearIds: [g.id],
        message: `齿轮 "${g.name}" 的齿数必须是大于 0 的整数`,
      });
    }
  });
  return errors;
}

export function validateShaftConflict(gears: Gear[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const shaftMap = new Map<string, Gear[]>();
  gears.forEach((g) => {
    if (g.shaftId) {
      const list = shaftMap.get(g.shaftId) || [];
      list.push(g);
      shaftMap.set(g.shaftId, list);
    }
  });

  shaftMap.forEach((shaftGears, shaftId) => {
    const drivers = shaftGears.filter((g) => g.isDriver);
    if (drivers.length >= 2) {
      errors.push({
        type: 'shaft_conflict',
        gearIds: drivers.map((d) => d.id),
        message: `轴 ${shaftId} 上不能同时存在两个主传动齿轮`,
      });
      errors.push({
        type: 'duplicate_driver_on_shaft',
        gearIds: drivers.map((d) => d.id),
        message: `同轴组内禁止重复主传动：${drivers.map((d) => d.name).join('、')} 在同一轴上均为主动轮`,
      });
    }
  });
  return errors;
}

export function validateChainAndConflicts(
  gears: Gear[],
  meshes: MeshRelation[],
  driverId: string,
  driverSpeed: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!driverId) {
    errors.push({
      type: 'no_driver',
      gearIds: [],
      message: '请设置一个主动轮',
    });
    return errors;
  }

  const result = computeTransmission(gears, meshes, driverId, driverSpeed);

  const breakpoints = detectBreakpoints(gears, meshes, driverId, result.visitedGears);

  gears.forEach((g) => {
    if (!result.visitedGears.has(g.id)) {
      const bp = breakpoints.find((b) => b.gearId === g.id);
      const error: ValidationError = {
        type: 'chain_broken',
        gearIds: [g.id],
        message: `齿轮 "${g.name}" 未连接到传动链`,
        breakpointInfo: bp,
      };
      errors.push(error);
    }
  });

  result.directionConflicts.forEach((conflict) => {
    errors.push({
      type: 'direction_conflict',
      gearIds: [conflict.gearId],
      message: `齿轮传动方向存在冲突（${conflict.dir1} vs ${conflict.dir2}）`,
    });
  });

  return errors;
}

export function validateSelfLock(
  gears: Gear[],
  meshes: MeshRelation[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  if (gears.length < 2 || meshes.length === 0) return errors;

  const MAX_REDUCTION_RATIO = 100;
  const gearMap = new Map(gears.map((g) => [g.id, g]));
  const adjMap = new Map<string, Array<{ targetId: string; type: string }>>();

  gears.forEach((g) => adjMap.set(g.id, []));
  meshes.forEach((m) => {
    adjMap.get(m.sourceId)?.push({ targetId: m.targetId, type: m.type });
    adjMap.get(m.targetId)?.push({ targetId: m.sourceId, type: m.type });
  });

  function detectCycle(
    startId: string,
    currentId: string,
    visited: Set<string>,
    path: string[],
    productRatio: number,
    directionFlips: number
  ): boolean {
    if (currentId === startId && path.length > 1) {
      if (Math.abs(productRatio - 1) > 0.001) {
        errors.push({
          type: 'self_lock',
          gearIds: [...path],
          message: `传动链闭环存在运动学矛盾（传动比乘积 ≠ 1），理论上会自锁`,
        });
        return true;
      }
      if (directionFlips % 2 !== 0) {
        errors.push({
          type: 'self_lock',
          gearIds: [...path],
          message: `传动链闭环方向冲突（奇数次换向），理论上会自锁`,
        });
        return true;
      }
      return false;
    }

    if (visited.has(currentId)) return false;
    visited.add(currentId);
    path.push(currentId);

    const neighbors = adjMap.get(currentId) || [];
    for (const { targetId, type } of neighbors) {
      if (path.length >= 2 && path[path.length - 2] === targetId) continue;

      const currentGear = gearMap.get(currentId);
      const targetGear = gearMap.get(targetId);
      if (!currentGear || !targetGear) continue;

      let newRatio = productRatio;
      let newFlips = directionFlips;

      if (type === 'mesh') {
        newRatio = productRatio * (currentGear.teeth / targetGear.teeth);
        newFlips = directionFlips + 1;
      } else {
        newFlips = directionFlips;
      }

      if (
        detectCycle(
          startId,
          targetId,
          new Set(visited),
          [...path],
          newRatio,
          newFlips
        )
      ) {
        return true;
      }
    }

    return false;
  }

  for (const gear of gears) {
    if (detectCycle(gear.id, gear.id, new Set(), [], 1, 0)) {
      break;
    }
  }

  function computeTotalRatio(
    driverId: string,
    targetId: string
  ): number | null {
    const visited = new Set<string>();
    const queue: Array<{ id: string; ratio: number }> = [{ id: driverId, ratio: 1 }];
    visited.add(driverId);

    while (queue.length > 0) {
      const { id, ratio } = queue.shift()!;
      if (id === targetId) return ratio;

      const neighbors = adjMap.get(id) || [];
      for (const { targetId: nextId, type } of neighbors) {
        if (visited.has(nextId)) continue;
        visited.add(nextId);

        const currentGear = gearMap.get(id);
        const nextGear = gearMap.get(nextId);
        if (!currentGear || !nextGear) continue;

        let newRatio = ratio;
        if (type === 'mesh') {
          newRatio = ratio * (currentGear.teeth / nextGear.teeth);
        }
        queue.push({ id: nextId, ratio: newRatio });
      }
    }
    return null;
  }

  const drivers = gears.filter((g) => g.isDriver);
  if (drivers.length > 0) {
    for (const gear of gears) {
      if (gear.id === drivers[0].id) continue;
      const ratio = computeTotalRatio(drivers[0].id, gear.id);
      if (ratio !== null && Math.abs(ratio) > MAX_REDUCTION_RATIO) {
        errors.push({
          type: 'self_lock',
          gearIds: [drivers[0].id, gear.id],
          message: `总传动比过大（${Math.abs(ratio).toFixed(1)}:1），可能导致自锁或效率极低`,
        });
      }
    }
  }

  const reportedIds = new Set<string>();
  return errors.filter((e) => {
    const key = e.gearIds.sort().join(',');
    if (reportedIds.has(key)) return false;
    reportedIds.add(key);
    return true;
  });
}

export function validateAll(
  gears: Gear[],
  meshes: MeshRelation[],
  driverId: string,
  driverSpeed: number
): ValidationResult {
  const errors: ValidationError[] = [];

  errors.push(...validateTeeth(gears));
  errors.push(...validateShaftConflict(gears));

  if (errors.filter((e) => e.type === 'teeth_invalid').length === 0) {
    errors.push(...validateChainAndConflicts(gears, meshes, driverId, driverSpeed));
  }

  errors.push(...validateSelfLock(gears, meshes));

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function getBrokenGearIds(
  gears: Gear[],
  meshes: MeshRelation[],
  driverId: string,
  driverSpeed: number
): Set<string> {
  const broken = new Set<string>();
  if (!driverId) {
    gears.forEach((g) => broken.add(g.id));
    return broken;
  }
  const result = computeTransmission(gears, meshes, driverId, driverSpeed);
  gears.forEach((g) => {
    if (!result.visitedGears.has(g.id)) broken.add(g.id);
  });
  return broken;
}

export function getBreakpointInfo(
  gears: Gear[],
  meshes: MeshRelation[],
  driverId: string,
  driverSpeed: number
): BreakpointInfo[] {
  if (!driverId) return [];
  const result = computeTransmission(gears, meshes, driverId, driverSpeed);
  return detectBreakpoints(gears, meshes, driverId, result.visitedGears);
}

export function getInvalidGearIds(errors: ValidationError[]): Set<string> {
  const invalid = new Set<string>();
  errors.forEach((e) => e.gearIds.forEach((id) => invalid.add(id)));
  return invalid;
}

export function generateConflictReport(
  gears: Gear[],
  meshes: MeshRelation[],
  driverId: string,
  driverSpeed: number
): ConflictReport {
  const result = validateAll(gears, meshes, driverId, driverSpeed);
  const gearMap = new Map(gears.map((g) => [g.id, g]));
  const shaftMap = new Map<string, string>();

  gears.forEach((g) => {
    if (g.shaftId) shaftMap.set(g.id, g.shaftId);
  });

  const conflicts: ConflictItem[] = result.errors.map((e) => {
    const severity: 'error' | 'warning' = 'error';

    let shaftId: string | undefined;
    const gearWithShaft = e.gearIds.find((id) => shaftMap.has(id));
    if (gearWithShaft) shaftId = shaftMap.get(gearWithShaft);

    return {
      type: e.type,
      severity,
      message: e.message,
      gearIds: e.gearIds,
      shaftId,
    };
  });

  const totalErrors = conflicts.filter((c) => c.severity === 'error').length;
  const totalWarnings = conflicts.filter((c) => c.severity === 'warning').length;

  return {
    timestamp: Date.now(),
    conflicts,
    totalErrors,
    totalWarnings,
    canSave: result.isValid,
  };
}
