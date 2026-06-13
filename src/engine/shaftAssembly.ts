import type { Gear, Shaft, ShaftGroup, SnapTarget, MeshRelation, BreakpointInfo } from '@/types';
import { teethToRadius, distance } from '@/utils/gearMath';

const SNAP_THRESHOLD = 40;

export function computeShaftGroups(gears: Gear[], shafts: Shaft[]): ShaftGroup[] {
  const shaftMap = new Map<string, Shaft>();
  shafts.forEach((s) => shaftMap.set(s.id, s));

  const groups: ShaftGroup[] = [];

  const gearByShaft = new Map<string, Gear[]>();
  gears.forEach((g) => {
    if (g.shaftId) {
      const list = gearByShaft.get(g.shaftId) || [];
      list.push(g);
      gearByShaft.set(g.shaftId, list);
    }
  });

  shafts.forEach((shaft) => {
    const shaftGears = gearByShaft.get(shaft.id) || [];
    const drivers = shaftGears.filter((g) => g.isDriver);
    groups.push({
      shaftId: shaft.id,
      shaftName: shaft.name,
      x: shaft.x,
      y: shaft.y,
      gearIds: shaftGears.map((g) => g.id),
      hasDriver: drivers.length > 0,
      driverId: drivers.length > 0 ? drivers[0].id : null,
    });
  });

  return groups;
}

export function findSnapTarget(
  gearX: number,
  gearY: number,
  shafts: Shaft[],
  currentShaftId?: string,
  excludeShaftIds?: string[]
): SnapTarget | null {
  let best: SnapTarget | null = null;

  for (const shaft of shafts) {
    if (excludeShaftIds?.includes(shaft.id)) continue;
    if (shaft.id === currentShaftId) continue;

    const dist = distance(gearX, gearY, shaft.x, shaft.y);
    if (dist < SNAP_THRESHOLD && (!best || dist < best.distance)) {
      best = {
        shaftId: shaft.id,
        x: shaft.x,
        y: shaft.y,
        distance: dist,
      };
    }
  }

  return best;
}

export function canMountGearToShaft(
  gear: Gear,
  shaftId: string,
  gears: Gear[],
  driverId: string
): { allowed: boolean; reason?: string } {
  const shaftGears = gears.filter((g) => g.shaftId === shaftId && g.id !== gear.id);

  if (gear.isDriver) {
    const existingDrivers = shaftGears.filter((g) => g.isDriver);
    if (existingDrivers.length > 0) {
      return {
        allowed: false,
        reason: `该轴上已有主传动齿轮 "${existingDrivers[0].name}"，同轴组内不能有多个主传动`,
      };
    }
  }

  if (driverId && shaftGears.some((g) => g.isDriver) && gear.isDriver) {
    return {
      allowed: false,
      reason: '同轴组内禁止重复主传动齿轮',
    };
  }

  return { allowed: true };
}

export function detectBreakpoints(
  gears: Gear[],
  meshes: MeshRelation[],
  driverId: string,
  visitedGearIds: Set<string>
): BreakpointInfo[] {
  const breakpoints: BreakpointInfo[] = [];

  const adjMap = new Map<string, Array<{ targetId: string; type: 'mesh' | 'shaft' }>>();
  gears.forEach((g) => adjMap.set(g.id, []));
  meshes.forEach((m) => {
    adjMap.get(m.sourceId)?.push({ targetId: m.targetId, type: m.type });
    adjMap.get(m.targetId)?.push({ targetId: m.sourceId, type: m.type });
  });

  const unvisited = gears.filter((g) => !visitedGearIds.has(g.id));

  for (const gear of unvisited) {
    const neighbors = adjMap.get(gear.id) || [];

    if (neighbors.length === 0) continue;

    const visitedNeighbors = neighbors.filter((n) => visitedGearIds.has(n.targetId));

    if (visitedNeighbors.length === 0 && neighbors.length > 0) {
      const neighborGears = neighbors
        .map((n) => gears.find((g) => g.id === n.targetId))
        .filter(Boolean) as Gear[];

      if (neighborGears.length > 0) {
        const nearestVisited = neighborGears.reduce((best, g) => {
          const dBest = distance(gear.x, gear.y, best.x, best.y);
          const dG = distance(gear.x, gear.y, g.x, g.y);
          return dG < dBest ? g : best;
        }, neighborGears[0]);

        breakpoints.push({
          gearId: gear.id,
          neighborIds: [nearestVisited.id],
          expectedConnectionType: neighbors[0].type,
        });
      }
    } else if (visitedNeighbors.length > 0) {
      breakpoints.push({
        gearId: gear.id,
        neighborIds: visitedNeighbors.map((n) => n.targetId),
        expectedConnectionType: visitedNeighbors[0]?.type || 'mesh',
      });
    }
  }

  return breakpoints;
}

export function getShaftGroupBounds(
  shaft: Shaft,
  gears: Gear[],
  shaftGears: Gear[]
): { cx: number; cy: number; width: number; height: number } {
  if (shaftGears.length === 0) {
    return { cx: shaft.x, cy: shaft.y, width: 60, height: 60 };
  }

  let minX = shaft.x;
  let maxX = shaft.x;
  let minY = shaft.y;
  let maxY = shaft.y;

  for (const g of shaftGears) {
    const r = teethToRadius(g.teeth);
    minX = Math.min(minX, g.x - r);
    maxX = Math.max(maxX, g.x + r);
    minY = Math.min(minY, g.y - r);
    maxY = Math.max(maxY, g.y + r);
  }

  const padding = 16;
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}
