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
const IPHONE_CAPACITY_GB = [16, 32, 64, 128, 256, 512, 1024, 2048];

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

export function advertisedIphoneCapacity(actualBytes: number): number {
  const gb = actualBytes / GIGA;
  const listed = IPHONE_CAPACITY_GB.find((size) => gb >= size * 0.92 && gb <= size * 1.02);
  if (listed) return listed * GIGA;
  const next = IPHONE_CAPACITY_GB.find((size) => size >= gb);
  return (next ?? Math.max(1, Math.round(gb))) * GIGA;
}

export function formatStorageSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes >= GIGA) {
    const gb = bytes / GIGA;
    const marketed = IPHONE_CAPACITY_GB.find((size) => Math.abs(gb - size) < 0.05);
    if (marketed) return `${marketed} GB`;
    return `${gb.toFixed(2)} GB`;
  }
  if (bytes < KILO) return `${Math.round(bytes)} B`;
  if (bytes < MEGA) return `${(bytes / KILO).toFixed(1)} KB`;
  return `${(bytes / MEGA).toFixed(1)} MB`;
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

    const rawFree = [settingsFree, pathFree].find((value) => Number.isFinite(value) && value > 0) ?? 0;
    const rawTotal = pickTotal([pathTotal, legacyTotal], rawFree);
    if (!rawTotal) return null;

    const used = Math.max(0, rawTotal - Math.min(rawFree, rawTotal));
    const total = advertisedIphoneCapacity(rawTotal);
    const free = Math.max(0, total - used);
    return { total, used, free, source: 'iphone' };
  } catch {
    return null;
  }
}
