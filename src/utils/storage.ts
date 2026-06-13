import type { Scheme } from '@/types';

const STORAGE_KEY = 'nyh42_gear_schemes';

export function saveSchemes(schemes: Scheme[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schemes));
  } catch (e) {
    console.error('Failed to save schemes:', e);
  }
}

export function loadSchemes(): Scheme[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as Scheme[];
  } catch (e) {
    console.error('Failed to load schemes:', e);
    return [];
  }
}

export function saveSingleScheme(scheme: Scheme): void {
  const schemes = loadSchemes();
  const idx = schemes.findIndex((s) => s.id === scheme.id);
  if (idx >= 0) {
    schemes[idx] = { ...scheme, updatedAt: Date.now() };
  } else {
    schemes.push({ ...scheme, createdAt: Date.now(), updatedAt: Date.now() });
  }
  saveSchemes(schemes);
}

export function deleteScheme(schemeId: string): void {
  const schemes = loadSchemes().filter((s) => s.id !== schemeId);
  saveSchemes(schemes);
}

export function getSchemeById(schemeId: string): Scheme | null {
  const schemes = loadSchemes();
  return schemes.find((s) => s.id === schemeId) || null;
}
