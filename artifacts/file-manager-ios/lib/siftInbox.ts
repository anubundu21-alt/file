import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';

/** Shared App Group the scanner app writes into. Expo Go cannot receive it. */
export const SIFT_APP_GROUP = 'group.com.replit.filemanagerios';
export const SIFT_INBOX_FOLDER = 'SiftInbox';
export const SIFT_SCANS_FOLDER = 'Scans';
/** Optional wake URL the scanner can open after dropping files in the inbox. */
export const SIFT_INBOX_URL = 'file-manager-ios://inbox';

export type InboxFile = {
  uri: string;
  name: string;
};

export function isSiftInboxUrl(url: string): boolean {
  const normalized = url.trim().toLowerCase();
  if (
    normalized.startsWith('file-manager-ios://inbox')
    || normalized.startsWith('file-manager-ios:///inbox')
    || normalized === '/inbox'
    || normalized === 'inbox'
  ) {
    return true;
  }
  try {
    const parsed = new URL(url);
    const scheme = parsed.protocol.replace(/:$/, '');
    return scheme === 'file-manager-ios' && (parsed.hostname === 'inbox' || parsed.pathname === '/inbox');
  } catch {
    return false;
  }
}

export function getSiftInboxDirectory(): Directory | null {
  if (Platform.OS !== 'ios') return null;
  try {
    const container = Paths.appleSharedContainers[SIFT_APP_GROUP];
    if (!container) return null;
    const inbox = new Directory(container, SIFT_INBOX_FOLDER);
    if (!inbox.exists) {
      inbox.create({ intermediates: true, idempotent: true });
    }
    return inbox;
  } catch {
    return null;
  }
}

export function listSiftInboxFiles(): InboxFile[] {
  const inbox = getSiftInboxDirectory();
  if (!inbox?.exists) return [];
  try {
    return inbox.list().flatMap((entry) => {
      if (!(entry instanceof File) || !entry.exists) return [];
      const name = entry.name?.trim();
      if (!name || name.startsWith('.')) return [];
      return [{ uri: entry.uri, name }];
    });
  } catch {
    return [];
  }
}

export function removeInboxFile(uri: string): boolean {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
    return true;
  } catch {
    return false;
  }
}
