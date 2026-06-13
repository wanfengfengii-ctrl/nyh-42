import type { Gear, MeshRelation, ChainRecommendation } from '@/types';
import { teethToRadius, distance } from '@/utils/gearMath';

const MESH_DISTANCE_TOLERANCE = 1.3;
const SHAFT_DISTANCE_TOLERANCE = 1.5;

export function recommendChains(
  gears: Gear[],
  meshes: MeshRelation[],
  driverId: string
): ChainRecommendation[] {
  const recommendations: ChainRecommendation[] = [];

  if (!driverId || gears.length < 2) return recommendations;

  const existingPairs = new Set<string>();
  meshes.forEach((m) => {
    existingPairs.add(`${m.sourceId}-${m.targetId}`);
    existingPairs.add(`${m.targetId}-${m.sourceId}`);
  });

  const gearMap = new Map(gears.map((g) => [g.id, g]));
  const adjMap = new Map<string, Set<string>>();
  gears.forEach((g) => adjMap.set(g.id, new Set()));
  meshes.forEach((m) => {
    adjMap.get(m.sourceId)?.add(m.targetId);
    adjMap.get(m.targetId)?.add(m.sourceId);
  });

  const connectedToDriver = new Set<string>();
  const queue = [driverId];
  connectedToDriver.add(driverId);
  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adjMap.get(current) || new Set();
    for (const nId of neighbors) {
      if (!connectedToDriver.has(nId)) {
        connectedToDriver.add(nId);
        queue.push(nId);
      }
    }
  }

  const unconnectedGears = gears.filter((g) => !connectedToDriver.has(g.id));
  const connectedGears = gears.filter((g) => connectedToDriver.has(g.id));

  for (const unconnGear of unconnectedGears) {
    const bestMeshCandidate = findBestMeshCandidate(unconnGear, connectedGears, gearMap, existingPairs);
    if (bestMeshCandidate) {
      recommendations.push(bestMeshCandidate);
      continue;
    }

    const bestShaftCandidate = findBestShaftCandidate(unconnGear, connectedGears, gearMap, existingPairs);
    if (bestShaftCandidate) {
      recommendations.push(bestShaftCandidate);
      continue;
    }

    const anyMeshCandidate = findBestMeshCandidate(unconnGear, gears.filter((g) => g.id !== unconnGear.id), gearMap, existingPairs);
    if (anyMeshCandidate) {
      recommendations.push(anyMeshCandidate);
    }
  }

  if (unconnectedGears.length === 0 && gears.length >= 2) {
    for (let i = 0; i < gears.length; i++) {
      for (let j = i + 1; j < gears.length; j++) {
        const g1 = gears[i];
        const g2 = gears[j];
        const pairKey = `${g1.id}-${g2.id}`;
        if (existingPairs.has(pairKey)) continue;

        const r1 = teethToRadius(g1.teeth);
        const r2 = teethToRadius(g2.teeth);
        const d = distance(g1.x, g1.y, g2.x, g2.y);
        const idealMeshDist = r1 + r2;

        if (Math.abs(d - idealMeshDist) / idealMeshDist < 0.2) {
          recommendations.push({
            sourceGearId: g1.id,
            targetGearId: g2.id,
            connectionType: 'mesh',
            reason: `距离接近啮合距离，传动比 ${g1.teeth}:${g2.teeth} = ${(g1.teeth / g2.teeth).toFixed(2)}`,
            estimatedRatio: g1.teeth / g2.teeth,
          });
        }
      }
    }
  }

  return recommendations.slice(0, 10);
}

function findBestMeshCandidate(
  targetGear: Gear,
  candidates: Gear[],
  gearMap: Map<string, Gear>,
  existingPairs: Set<string>
): ChainRecommendation | null {
  let best: { gear: Gear; score: number } | null = null;

  for (const candidate of candidates) {
    if (candidate.id === targetGear.id) continue;
    const pairKey = `${targetGear.id}-${candidate.id}`;
    if (existingPairs.has(pairKey)) continue;

    const r1 = teethToRadius(targetGear.teeth);
    const r2 = teethToRadius(candidate.teeth);
    const d = distance(targetGear.x, targetGear.y, candidate.x, candidate.y);
    const idealDist = r1 + r2;
    const ratio = d / idealDist;

    if (ratio <= MESH_DISTANCE_TOLERANCE) {
      const score = 1 / (Math.abs(ratio - 1) + 0.01);
      if (!best || score > best.score) {
        best = { gear: candidate, score };
      }
    }
  }

  if (best) {
    return {
      sourceGearId: targetGear.id,
      targetGearId: best.gear.id,
      connectionType: 'mesh',
      reason: `与 "${best.gear.name}" 啮合，传动比 ${targetGear.teeth}:${best.gear.teeth} = ${(targetGear.teeth / best.gear.teeth).toFixed(2)}`,
      estimatedRatio: targetGear.teeth / best.gear.teeth,
    };
  }

  return null;
}

function findBestShaftCandidate(
  targetGear: Gear,
  candidates: Gear[],
  gearMap: Map<string, Gear>,
  existingPairs: Set<string>
): ChainRecommendation | null {
  for (const candidate of candidates) {
    if (candidate.id === targetGear.id) continue;
    const pairKey = `${targetGear.id}-${candidate.id}`;
    if (existingPairs.has(pairKey)) continue;

    const d = distance(targetGear.x, targetGear.y, candidate.x, candidate.y);
    const r1 = teethToRadius(targetGear.teeth);
    const r2 = teethToRadius(candidate.teeth);
    const maxDist = Math.max(r1, r2) * SHAFT_DISTANCE_TOLERANCE;

    if (d <= maxDist) {
      return {
        sourceGearId: targetGear.id,
        targetGearId: candidate.id,
        connectionType: 'shaft',
        reason: `与 "${candidate.name}" 同轴连接，同转速传动`,
        estimatedRatio: 1,
      };
    }
  }

  return null;
}
