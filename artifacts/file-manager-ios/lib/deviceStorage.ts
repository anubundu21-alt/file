import { Platform } from 'react-native';
import { Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';

export type DeviceStorage = {
  total: number;
  used: number;
  free: number;
  source: 'iphone' | 'browser';
};

const KILO = 1000;
const MEGA = KILO * 1000;
const GIGA = MEGA * 1000;
const INT32_MAX = 0x7fffffff;

function toByteCount(value: unknown): number {
  if (typeof value === 'bigint') {
    const next = Number(value);
    return Number.isFinite(next) && next >= 0 ? next : NaN;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? value : NaN;
  }
  if (typeof value === 'string' && value.trim()) {
    const next = Number(value);
    return Number.isFinite(next) && next >= 0 ? next : NaN;
  }
  return NaN;
}

export function formatStorageSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < KILO) return `${Math.round(bytes)} B`;
  if (bytes < MEGA) return `${(bytes / KILO).toFixed(1)} KB`;
  if (bytes < GIGA) return `${(bytes / MEGA).toFixed(1)} MB`;
  const gb = bytes / GIGA;
  if (gb >= 100) return `${Math.round(gb)} GB`;
  return `${gb.toFixed(1)} GB`;
}

function pickTotal(candidates: number[], free: number): number {
  const usable = candidates.filter((value) => Number.isFinite(value) && value > 0);
  const withoutOverflow = usable.filter((value) => !(value <= INT32_MAX && free > value));
  return Math.max(0, ...(withoutOverflow.length ? withoutOverflow : usable));
}

export async function readDeviceStorage(): Promise<DeviceStorage | null> {
  try {
    if (Platform.OS === 'web') {
      const estimate = await navigator.storage?.estimate?.();
      const total = toByteCount(estimate?.quota);
      const used = toByteCount(estimate?.usage);
      if (!total) return null;
      return {
        total,
        used: Number.isFinite(used) ? used : 0,
        free: Math.max(0, total - (Number.isFinite(used) ? used : 0)),
        source: 'browser',
      };
    }

    let settingsFree = NaN;
    try {
      settingsFree = toByteCount(await FileSystem.getFreeDiskStorageAsync());
    } catch {
      settingsFree = NaN;
    }

    const pathTotal = toByteCount(Paths.totalDiskSpace);
    const pathFree = toByteCount(Paths.availableDiskSpace);

    let legacyTotal = NaN;
    try {
      legacyTotal = toByteCount(await FileSystem.getTotalDiskCapacityAsync());
    } catch {
      legacyTotal = NaN;
    }

    const free = [settingsFree, pathFree].find((value) => Number.isFinite(value) && value > 0) ?? 0;
    const total = pickTotal([pathTotal, legacyTotal], free);
    if (!total) return null;

    const clampedFree = Math.min(free, total);
    return {
      total,
      free: clampedFree,
      used: Math.max(0, total - clampedFree),
      source: 'iphone',
    };
  } catch {
    return null;
  }
}
