import type { Gear, GearState, MeshRelation, RotationDirection } from '@/types';
import {
  calculateAngularVelocity,
  oppositeDirection,
  rpmToRadPerSec,
  directionSign,
} from '@/utils/gearMath';

interface AdjacencyEntry {
  targetId: string;
  type: 'mesh' | 'shaft';
}

function buildAdjacencyMap(
  gears: Gear[],
  meshes: MeshRelation[]
): Map<string, AdjacencyEntry[]> {
  const adjMap = new Map<string, AdjacencyEntry[]>();
  gears.forEach((g) => adjMap.set(g.id, []));
  meshes.forEach((m) => {
    const sourceList = adjMap.get(m.sourceId);
    const targetList = adjMap.get(m.targetId);
    if (sourceList) {
      sourceList.push({ targetId: m.targetId, type: m.type });
    }
    if (targetList) {
      targetList.push({ targetId: m.sourceId, type: m.type });
    }
  });
  return adjMap;
}

export interface TransmissionResult {
  gearStates: Map<string, GearState>;
  visitedGears: Set<string>;
  directionConflicts: Array<{ gearId: string; dir1: RotationDirection; dir2: RotationDirection }>;
}

export function computeTransmission(
  gears: Gear[],
  meshes: MeshRelation[],
  driverId: string,
  driverSpeedRpm: number
): TransmissionResult {
  const gearStates = new Map<string, GearState>();
  const visitedGears = new Set<string>();
  const directionConflicts: TransmissionResult['directionConflicts'] = [];

  const adjMap = buildAdjacencyMap(gears, meshes);
  const gearMap = new Map(gears.map((g) => [g.id, g]));

  const driver = gearMap.get(driverId);
  if (!driver) {
    return { gearStates, visitedGears, directionConflicts };
  }

  const driverOmega = rpmToRadPerSec(driverSpeedRpm);

  gearStates.set(driverId, {
    gearId: driverId,
    angularVelocity: driverOmega,
    direction: driver.direction,
    currentAngle: driver.initialAngle,
    isValid: true,
  });
  visitedGears.add(driverId);

  const queue: string[] = [driverId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentState = gearStates.get(currentId)!;
    const currentGear = gearMap.get(currentId)!;
    const neighbors = adjMap.get(currentId) || [];

    for (const { targetId, type } of neighbors) {
      const targetGear = gearMap.get(targetId);
      if (!targetGear) continue;

      let newOmega: number;
      let newDir: RotationDirection;

      if (type === 'mesh') {
        newOmega = calculateAngularVelocity(
          currentGear.teeth,
          targetGear.teeth,
          currentState.angularVelocity
        );
        newDir = oppositeDirection(currentState.direction);
      } else {
        newOmega = currentState.angularVelocity;
        newDir = currentState.direction;
      }

      if (visitedGears.has(targetId)) {
        const existingState = gearStates.get(targetId)!;
        if (existingState.direction !== newDir) {
          directionConflicts.push({
            gearId: targetId,
            dir1: existingState.direction,
            dir2: newDir,
          });
          existingState.isValid = false;
        }
        continue;
      }

      gearStates.set(targetId, {
        gearId: targetId,
        angularVelocity: newOmega,
        direction: newDir,
        currentAngle: targetGear.initialAngle,
        isValid: true,
      });
      visitedGears.add(targetId);
      queue.push(targetId);
    }
  }

  return { gearStates, visitedGears, directionConflicts };
}

export function computeAngleAtTime(
  state: GearState,
  elapsedSeconds: number
): number {
  return (
    state.currentAngle +
    directionSign(state.direction) * state.angularVelocity * elapsedSeconds * (180 / Math.PI)
  );
}

export function computeCumulativeAngleCurve(
  state: GearState,
  totalSeconds: number,
  samples: number = 200
): Array<{ time: number; angle: number }> {
  const points: Array<{ time: number; angle: number }> = [];
  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * totalSeconds;
    points.push({ time: t, angle: computeAngleAtTime(state, t) });
  }
  return points;
}

export function getSecondsInPeriod(period: 'day' | 'year'): number {
  if (period === 'day') return 24 * 60 * 60;
  return 365 * 24 * 60 * 60;
}
