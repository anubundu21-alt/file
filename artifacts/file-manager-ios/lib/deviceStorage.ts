import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

export type DeviceStorage = {
  total: number;
  used: number;
  free: number;
  source: 'iphone' | 'browser';
};

export function formatStorageSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export async function readDeviceStorage(): Promise<DeviceStorage | null> {
  try {
    if (Platform.OS === 'web') {
      const estimate = await navigator.storage?.estimate?.();
      const total = estimate?.quota ?? 0;
      const used = estimate?.usage ?? 0;
      if (!total) return null;
      return { total, used, free: Math.max(0, total - used), source: 'browser' };
    }
    const [free, total] = await Promise.all([
      FileSystem.getFreeDiskStorageAsync(),
      FileSystem.getTotalDiskCapacityAsync(),
    ]);
    if (!total) return null;
    return {
      total,
      free,
      used: Math.max(0, total - free),
      source: 'iphone',
    };
  } catch {
    return null;
  }
}
