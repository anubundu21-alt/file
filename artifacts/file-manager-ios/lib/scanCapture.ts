import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export type ScanPage = {
  uri: string;
  mimeType?: string | null;
};

export async function captureScanPage(): Promise<{ page: ScanPage | null; blocked: boolean }> {
  if (Platform.OS !== 'web') {
    const existing = await ImagePicker.getCameraPermissionsAsync();
    const permission = existing.granted ? existing : await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { page: null, blocked: true };
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsEditing: false,
  });
  if (result.canceled || !result.assets[0]) return { page: null, blocked: false };
  const asset = result.assets[0];
  return { page: { uri: asset.uri, mimeType: asset.mimeType }, blocked: false };
}

export async function pickScanPages(): Promise<ScanPage[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsMultipleSelection: true,
    selectionLimit: 20,
  });
  if (result.canceled) return [];
  return result.assets.map((asset) => ({ uri: asset.uri, mimeType: asset.mimeType }));
}

export function scanFileName(index: number, total: number, uri: string, takenAt = new Date()): string {
  const raw = uri.split('?')[0]?.split('/').pop() ?? 'scan.jpg';
  const ext = (raw.split('.').pop() ?? 'jpg').toLowerCase();
  const safeExt = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'].includes(ext) ? ext : 'jpg';
  const label = takenAt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  if (total <= 1) return `Scan ${label}.${safeExt}`;
  return `Scan ${label} p${index + 1}.${safeExt}`;
}
