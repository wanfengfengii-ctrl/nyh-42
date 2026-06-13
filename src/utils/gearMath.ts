import type { Gear, RotationDirection } from '@/types';

const MODULE = 2;

export function teethToRadius(teeth: number): number {
  return (teeth * MODULE) / 2 + 8;
}

export function rpmToRadPerSec(rpm: number): number {
  return (rpm * 2 * Math.PI) / 60;
}

export function radPerSecToRpm(radPerSec: number): number {
  return (radPerSec * 60) / (2 * Math.PI);
}

export function normalizeAngle(angle: number): number {
  let a = angle % 360;
  if (a < 0) a += 360;
  return a;
}

export function oppositeDirection(dir: RotationDirection): RotationDirection {
  return dir === 'cw' ? 'ccw' : 'cw';
}

export function directionSign(dir: RotationDirection): number {
  return dir === 'cw' ? 1 : -1;
}

export function calculateAngularVelocity(
  driverTeeth: number,
  drivenTeeth: number,
  driverOmega: number
): number {
  return driverOmega * (driverTeeth / drivenTeeth);
}

export function getGearCircumference(teeth: number): number {
  return teethToRadius(teeth) * 2 * Math.PI;
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function generateGearPath(teeth: number, cx: number = 0, cy: number = 0): string {
  const outerR = teethToRadius(teeth);
  const innerR = outerR - 6;
  const toothDepth = 4;
  const toothWidthAngle = (2 * Math.PI) / teeth;
  const halfTooth = toothWidthAngle / 4;

  let path = '';

  for (let i = 0; i < teeth; i++) {
    const angle = i * toothWidthAngle;

    const x1 = cx + innerR * Math.cos(angle - halfTooth);
    const y1 = cy + innerR * Math.sin(angle - halfTooth);
    const x2 = cx + outerR * Math.cos(angle - halfTooth * 0.6);
    const y2 = cy + outerR * Math.sin(angle - halfTooth * 0.6);
    const x3 = cx + outerR * Math.cos(angle + halfTooth * 0.6);
    const y3 = cy + outerR * Math.sin(angle + halfTooth * 0.6);
    const x4 = cx + innerR * Math.cos(angle + halfTooth);
    const y4 = cy + innerR * Math.sin(angle + halfTooth);

    if (i === 0) {
      path += `M ${x1} ${y1}`;
    } else {
      path += ` L ${x1} ${y1}`;
    }
    path += ` L ${x2} ${y2}`;
    path += ` L ${x3} ${y3}`;
    path += ` L ${x4} ${y4}`;
  }

  path += ' Z';
  return path;
}

export function getShaftGearRadius(): number {
  return 12;
}

export function isValidGearPlacement(
  gear: Gear,
  existingGears: Gear[],
  canvasWidth: number,
  canvasHeight: number
): boolean {
  const r = teethToRadius(gear.teeth);
  if (gear.x - r < 0 || gear.x + r > canvasWidth) return false;
  if (gear.y - r < 0 || gear.y + r > canvasHeight) return false;

  for (const other of existingGears) {
    if (other.id === gear.id) continue;
    const otherR = teethToRadius(other.teeth);
    const d = distance(gear.x, gear.y, other.x, other.y);
    if (d < r + otherR + 5) return false;
  }
  return true;
}

export function formatAngle(angle: number): string {
  const normalized = normalizeAngle(angle);
  return `${normalized.toFixed(1)}°`;
}

export function formatRpm(rpm: number): string {
  return `${rpm.toFixed(2)} rpm`;
}
