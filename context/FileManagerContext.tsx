import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Directory, File } from 'expo-file-system';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import {
  isSiftInboxUrl,
  listSiftInboxFiles,
  removeInboxFile,
  SIFT_SCANS_FOLDER,
} from '@/lib/siftInbox';

export type FileCategory =
  | 'pdf'
  | 'image'
  | 'archive'
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'video'
  | 'audio'
  | 'other';

export type LibraryItem = {
  id: string;
  name: string;
  kind: 'file' | 'folder';
  parentId: string | null;
  uri: string;
  size: number;
  mimeType: string | null;
  category: FileCategory;
  createdAt: string;
  modifiedAt: string;
  openedAt: string | null;
  favorite: boolean;
  deletedAt: string | null;
};

export type IncomingFile = {
  uri: string;
  name: string;
};

type FileManagerContextValue = {
  items: LibraryItem[];
  files: LibraryItem[];
  isLoading: boolean;
  isReady: boolean;
  isImporting: boolean;
  error: string | null;
  pendingIncoming: IncomingFile | null;
  importFiles: (parentId?: string | null) => Promise<number>;
  saveFileFromUri: (
    uri: string,
    name: string,
    mimeType?: string | null,
    parentId?: string | null,
  ) => Promise<LibraryItem | null>;
  saveGeneratedFile: (
    base64: string,
    name: string,
    mimeType?: string | null,
    parentId?: string | null,
  ) => Promise<LibraryItem | null>;
  createFolder: (name: string, parentId?: string | null) => Promise<LibraryItem | null>;
  renameItem: (id: string, name: string) => Promise<void>;
  moveItems: (ids: string[], parentId: string | null) => Promise<void>;
  duplicateItem: (id: string) => Promise<LibraryItem | null>;
  toggleFavorite: (id: string) => void;
  trashItems: (ids: string[]) => Promise<void>;
  restoreItems: (ids: string[]) => Promise<void>;
  deleteForever: (ids: string[]) => Promise<void>;
  emptyTrash: () => Promise<void>;
  markOpened: (id: string) => Promise<void>;
  shareItems: (ids: string[]) => Promise<void>;
  exportItems: (ids: string[]) => Promise<void>;
  importInbox: () => Promise<number>;
  confirmIncomingFile: () => Promise<void>;
  dismissIncomingFile: () => void;
  reloadLibrary: () => Promise<void>;
  clearError: () => void;
  getItem: (id: string) => LibraryItem | undefined;
  childrenOf: (parentId: string | null) => LibraryItem[];
  breadcrumbsFor: (folderId: string | null) => LibraryItem[];
  pathLabelFor: (item: LibraryItem) => string;
  folderOptions: (excludeIds?: string[]) => LibraryItem[];
  trashedItems: LibraryItem[];
};

const STORAGE_KEY_V1 = 'sift-managed-files-v1';
const STORAGE_KEY = 'sift-managed-files-v2';
const MANAGED_DIRECTORY = `${FileSystem.documentDirectory ?? ''}Sift/`;

const FileManagerContext = createContext<FileManagerContextValue | null>(null);

const categoryByExtension: Record<string, FileCategory> = {
  pdf: 'pdf',
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  webp: 'image',
  heic: 'image',
  heif: 'image',
  svg: 'image',
  zip: 'archive',
  rar: 'archive',
  '7z': 'archive',
  tar: 'archive',
  gz: 'archive',
  doc: 'document',
  docx: 'document',
  txt: 'document',
  rtf: 'document',
  pages: 'document',
  md: 'document',
  csv: 'spreadsheet',
  xls: 'spreadsheet',
  xlsx: 'spreadsheet',
  numbers: 'spreadsheet',
  ppt: 'presentation',
  pptx: 'presentation',
  key: 'presentation',
  mp4: 'video',
  mov: 'video',
  m4v: 'video',
  avi: 'video',
  mkv: 'video',
  webm: 'video',
  '3gp': 'video',
  mp3: 'audio',
  wav: 'audio',
  m4a: 'audio',
  aac: 'audio',
  flac: 'audio',
  ogg: 'audio',
  opus: 'audio',
};

export const categoryMeta: Record<FileCategory, { label: string; color: string }> = {
  pdf: { label: 'PDF', color: '#F28A72' },
  image: { label: 'Image', color: '#9B8AFB' },
  archive: { label: 'ZIP', color: '#C29B70' },
  document: { label: 'Document', color: '#77B7F2' },
  spreadsheet: { label: 'Spreadsheet', color: '#65C59A' },
  presentation: { label: 'Presentation', color: '#F0A25A' },
  video: { label: 'Video', color: '#B18CF3' },
  audio: { label: 'Audio', color: '#E877A4' },
  other: { label: 'Other', color: '#8B9B93' },
};

export function classifyFile(name: string, mimeType?: string | null): FileCategory {
  const extension = name.split('.').pop()?.toLowerCase() ?? '';
  const extensionCategory = categoryByExtension[extension];
  if (extensionCategory) return extensionCategory;
  if (mimeType?.startsWith('image/')) return 'image';
  if (mimeType?.startsWith('video/')) return 'video';
  if (mimeType?.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'pdf';
  return 'other';
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return 'Size unavailable';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function safeFileName(name: string): string {
  return name.replace(/[^\w.\-() ]+/g, '_').trim() || 'Untitled';
}

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix = 'item'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isLibraryItem(value: unknown): value is LibraryItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<LibraryItem>;
  return typeof item.id === 'string' && typeof item.name === 'string' && (item.kind === 'file' || item.kind === 'folder');
}

function migrateFromUnknown(raw: unknown): LibraryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    if (isLibraryItem(entry)) {
      return {
        ...entry,
        parentId: entry.parentId ?? null,
        openedAt: entry.openedAt ?? null,
        deletedAt: entry.deletedAt ?? null,
        modifiedAt: entry.modifiedAt ?? entry.createdAt,
        favorite: Boolean(entry.favorite),
        kind: entry.kind,
      };
    }
    const legacy = entry as {
      id?: string;
      name?: string;
      uri?: string;
      size?: number;
      mimeType?: string | null;
      category?: FileCategory;
      createdAt?: string;
      favorite?: boolean;
    };
    const name = legacy.name ?? 'Untitled file';
    return {
      id: legacy.id ?? createId('file'),
      name,
      kind: 'file' as const,
      parentId: null,
      uri: legacy.uri ?? '',
      size: legacy.size ?? 0,
      mimeType: legacy.mimeType ?? null,
      category: legacy.category ?? classifyFile(name, legacy.mimeType),
      createdAt: legacy.createdAt ?? nowIso(),
      modifiedAt: legacy.createdAt ?? nowIso(),
      openedAt: null,
      favorite: Boolean(legacy.favorite),
      deletedAt: null,
    };
  });
}

function descendantIds(items: LibraryItem[], rootIds: string[]): Set<string> {
  const ids = new Set(rootIds);
  let added = true;
  while (added) {
    added = false;
    for (const item of items) {
      if (item.parentId && ids.has(item.parentId) && !ids.has(item.id)) {
        ids.add(item.id);
        added = true;
      }
    }
  }
  return ids;
}

function uniqueExportName(directory: Directory, name: string): string {
  if (!new File(directory, name).exists) return name;
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let index = 2;
  while (new File(directory, `${base} ${index}${ext}`).exists) index += 1;
  return `${base} ${index}${ext}`;
}

export function FileManagerProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingIncoming, setPendingIncoming] = useState<IncomingFile | null>(null);
  const itemsRef = useRef<LibraryItem[]>([]);
  const importingRef = useRef(false);
  const mutationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const handledUrlsRef = useRef<Set<string>>(new Set());

  const persist = useCallback(async (nextItems: LibraryItem[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
  }, []);

  const enqueue = useCallback(<T,>(operation: () => Promise<T>): Promise<T> => {
    const result = mutationQueueRef.current.then(operation, operation);
    mutationQueueRef.current = result.then(() => undefined, () => undefined);
    return result;
  }, []);

  const commit = useCallback(async (nextItems: LibraryItem[]) => {
    await persist(nextItems);
    itemsRef.current = nextItems;
    setItems(nextItems);
  }, [persist]);

  const reloadLibrary = useCallback(async () => {
    setIsLoading(true);
    setIsReady(false);
    setError(null);
    try {
      const current = await AsyncStorage.getItem(STORAGE_KEY);
      const legacy = current ? null : await AsyncStorage.getItem(STORAGE_KEY_V1);
      const storedItems = migrateFromUnknown(JSON.parse((current ?? legacy) || '[]'));
      const reconciled = Platform.OS === 'web'
        ? storedItems
        : (await Promise.all(storedItems.map(async (item) => {
            if (item.kind === 'folder' || !item.uri) return item;
            const info = await FileSystem.getInfoAsync(item.uri);
            return info.exists || item.deletedAt ? item : null;
          }))).filter((item): item is LibraryItem => item !== null);
      itemsRef.current = reconciled;
      setItems(reconciled);
      await persist(reconciled);
      if (legacy && !current) await AsyncStorage.removeItem(STORAGE_KEY_V1);
      setIsReady(true);
    } catch {
      setError('Your saved file library could not be loaded. Sift has kept file actions locked to protect your existing library.');
    } finally {
      setIsLoading(false);
    }
  }, [persist]);

  useEffect(() => {
    void reloadLibrary();
  }, [reloadLibrary]);

  const ensureManagedDirectory = useCallback(async () => {
    if (Platform.OS === 'web') return;
    const directoryInfo = await FileSystem.getInfoAsync(MANAGED_DIRECTORY);
    if (!directoryInfo.exists) {
      await FileSystem.makeDirectoryAsync(MANAGED_DIRECTORY, { intermediates: true });
    }
  }, []);

  const importFiles = useCallback(async (parentId: string | null = null) => {
    if (!isReady || isLoading || importingRef.current) return 0;
    importingRef.current = true;
    setError(null);
    setIsImporting(true);
    const copiedPaths: string[] = [];
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return 0;

      await ensureManagedDirectory();

      const imported: LibraryItem[] = [];
      const createdAt = nowIso();
      for (const [index, asset] of result.assets.entries()) {
        const id = createId(`file-${index}`);
        const destination = Platform.OS === 'web'
          ? asset.uri
          : `${MANAGED_DIRECTORY}${id}-${safeFileName(asset.name)}`;
        if (Platform.OS !== 'web') {
          await FileSystem.copyAsync({ from: asset.uri, to: destination });
          copiedPaths.push(destination);
        }
        imported.push({
          id,
          name: asset.name,
          kind: 'file',
          parentId,
          uri: destination,
          size: asset.size ?? 0,
          mimeType: asset.mimeType ?? null,
          category: classifyFile(asset.name, asset.mimeType),
          createdAt,
          modifiedAt: createdAt,
          openedAt: null,
          favorite: false,
          deletedAt: null,
        });
      }

      await enqueue(async () => {
        await commit([...imported, ...itemsRef.current]);
      });
      return imported.length;
    } catch {
      if (Platform.OS !== 'web') {
        await Promise.all(copiedPaths.map((path) => FileSystem.deleteAsync(path, { idempotent: true }).catch(() => undefined)));
      }
      setError('Sift could not import that file. Check that it is still available and try again.');
      return 0;
    } finally {
      importingRef.current = false;
      setIsImporting(false);
    }
  }, [commit, enqueue, ensureManagedDirectory, isLoading, isReady]);

  /**
   * Takes a file a tool already wrote to disk (a conversion downloaded from the
   * backend) and moves it into the library, without loading it into memory.
   */
  const saveFileFromUri = useCallback(async (
    uri: string,
    name: string,
    mimeType: string | null = null,
    parentId: string | null = null,
  ): Promise<LibraryItem | null> => {
    const id = createId('tool');
    try {
      await ensureManagedDirectory();
      let destination = uri;
      let size = 0;
      if (Platform.OS !== 'web') {
        destination = `${MANAGED_DIRECTORY}${id}-${safeFileName(name)}`;
        await FileSystem.copyAsync({ from: uri, to: destination });
        const info = await FileSystem.getInfoAsync(destination);
        size = info.exists && !info.isDirectory ? info.size ?? 0 : 0;
      }
      const createdAt = nowIso();
      const item: LibraryItem = {
        id,
        name,
        kind: 'file',
        parentId,
        uri: destination,
        size,
        mimeType,
        category: classifyFile(name, mimeType),
        createdAt,
        modifiedAt: createdAt,
        openedAt: null,
        favorite: false,
        deletedAt: null,
      };
      await enqueue(async () => {
        await commit([item, ...itemsRef.current]);
      });
      return item;
    } catch {
      setError('Sift could not save that file.');
      return null;
    }
  }, [commit, enqueue, ensureManagedDirectory]);

  /**
   * Writes bytes a tool produced into Sift's own storage and puts it in the
   * library, so a converted or signed file lands next to everything else
   * instead of only being shared out.
   */
  const saveGeneratedFile = useCallback(async (
    base64: string,
    name: string,
    mimeType: string | null = null,
    parentId: string | null = null,
  ): Promise<LibraryItem | null> => {
    const id = createId('tool');
    try {
      await ensureManagedDirectory();
      let uri: string;
      let size = 0;
      if (Platform.OS === 'web') {
        uri = `data:${mimeType ?? 'application/pdf'};base64,${base64}`;
        size = Math.floor((base64.length * 3) / 4);
      } else {
        uri = `${MANAGED_DIRECTORY}${id}-${safeFileName(name)}`;
        await FileSystem.writeAsStringAsync(uri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const info = await FileSystem.getInfoAsync(uri);
        size = info.exists && !info.isDirectory ? info.size ?? 0 : 0;
      }

      const createdAt = nowIso();
      const item: LibraryItem = {
        id,
        name,
        kind: 'file',
        parentId,
        uri,
        size,
        mimeType,
        category: classifyFile(name, mimeType),
        createdAt,
        modifiedAt: createdAt,
        openedAt: null,
        favorite: false,
        deletedAt: null,
      };
      await enqueue(async () => {
        await commit([item, ...itemsRef.current]);
      });
      return item;
    } catch {
      setError('Sift could not save that file.');
      return null;
    }
  }, [commit, enqueue, ensureManagedDirectory]);

  const importIncomingFile = useCallback(async (
    uri: string,
    name: string,
    parentId: string | null,
    mimeType: string | null = null,
  ) => {
    if (!uri || handledUrlsRef.current.has(uri)) return null;
    handledUrlsRef.current.add(uri);
    const id = createId('external');
    const destination = Platform.OS === 'web'
      ? uri
      : `${MANAGED_DIRECTORY}${id}-${safeFileName(name)}`;
    try {
      await ensureManagedDirectory();
      let size = 0;
      if (Platform.OS !== 'web') {
        const sourceInfo = await FileSystem.getInfoAsync(uri);
        if (sourceInfo.exists && 'size' in sourceInfo) size = sourceInfo.size ?? 0;
        await FileSystem.copyAsync({ from: uri, to: destination });
      }
      const createdAt = nowIso();
      const imported: LibraryItem = {
        id,
        name,
        kind: 'file',
        parentId,
        uri: destination,
        size,
        mimeType,
        category: classifyFile(name, mimeType),
        createdAt,
        modifiedAt: createdAt,
        openedAt: createdAt,
        favorite: false,
        deletedAt: null,
      };
      await enqueue(async () => {
        await commit([imported, ...itemsRef.current]);
      });
      return imported;
    } catch {
      handledUrlsRef.current.delete(uri);
      if (Platform.OS !== 'web') {
        await FileSystem.deleteAsync(destination, { idempotent: true }).catch(() => undefined);
      }
      return null;
    }
  }, [commit, enqueue, ensureManagedDirectory]);

  const importExternalUri = useCallback(async (uri: string) => {
    if (!isReady || isLoading || Platform.OS === 'web' || !uri.startsWith('file://')) return;
    const rawName = uri.split('?')[0]?.split('/').pop() ?? 'Imported file';
    const name = decodeURIComponent(rawName);
    setPendingIncoming({ uri, name });
  }, [isLoading, isReady]);

  const createFolder = useCallback(async (name: string, parentId: string | null = null) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const createdAt = nowIso();
    const folder: LibraryItem = {
      id: createId('folder'),
      name: trimmed,
      kind: 'folder',
      parentId,
      uri: '',
      size: 0,
      mimeType: null,
      category: 'other',
      createdAt,
      modifiedAt: createdAt,
      openedAt: createdAt,
      favorite: false,
      deletedAt: null,
    };
    await enqueue(async () => {
      await commit([folder, ...itemsRef.current]);
    });
    return folder;
  }, [commit, enqueue]);

  const ensureScansFolder = useCallback(async () => {
    const existing = itemsRef.current.find((item) => (
      item.kind === 'folder' && !item.deletedAt && item.parentId === null && item.name === SIFT_SCANS_FOLDER
    ));
    if (existing) return existing.id;
    const folder = await createFolder(SIFT_SCANS_FOLDER, null);
    return folder?.id ?? null;
  }, [createFolder]);

  const importInbox = useCallback(async () => {
    if (!isReady || isLoading || Platform.OS !== 'ios') return 0;
    const pending = listSiftInboxFiles();
    if (!pending.length) return 0;
    const parentId = await ensureScansFolder();
    let importedCount = 0;
    for (const file of pending) {
      const imported = await importIncomingFile(file.uri, file.name, parentId);
      if (imported) {
        importedCount += 1;
        if (removeInboxFile(file.uri)) {
          handledUrlsRef.current.delete(file.uri);
        }
      }
    }
    return importedCount;
  }, [ensureScansFolder, importIncomingFile, isLoading, isReady]);

  const confirmIncomingFile = useCallback(async () => {
    if (!pendingIncoming) return;
    const { uri, name } = pendingIncoming;
    setPendingIncoming(null);
    const parentId = await ensureScansFolder();
    const imported = await importIncomingFile(uri, name, parentId);
    if (!imported) setError('Sift could not save that file.');
  }, [ensureScansFolder, importIncomingFile, pendingIncoming]);

  const dismissIncomingFile = useCallback(() => {
    setPendingIncoming(null);
  }, []);

  const handleIncomingUrl = useCallback(async (url: string) => {
    if (isSiftInboxUrl(url)) {
      await importInbox();
      return;
    }
    await importExternalUri(url);
  }, [importExternalUri, importInbox]);

  useEffect(() => {
    if (isLoading || !isReady) return;
    void importInbox();
    void Linking.getInitialURL().then((url) => {
      if (url) void handleIncomingUrl(url);
    });
    const linking = Linking.addEventListener('url', ({ url }) => {
      void handleIncomingUrl(url);
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void importInbox();
    });
    return () => {
      linking.remove();
      appState.remove();
    };
  }, [handleIncomingUrl, importInbox, isLoading, isReady]);

  const renameItem = useCallback(async (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await enqueue(async () => {
      const next = itemsRef.current.map((item) => (
        item.id === id ? { ...item, name: trimmed, modifiedAt: nowIso() } : item
      ));
      await commit(next);
    });
  }, [commit, enqueue]);

  const moveItems = useCallback(async (ids: string[], parentId: string | null) => {
    await enqueue(async () => {
      const blocked = descendantIds(itemsRef.current, ids);
      if (parentId && blocked.has(parentId)) return;
      const next = itemsRef.current.map((item) => (
        ids.includes(item.id) ? { ...item, parentId, modifiedAt: nowIso() } : item
      ));
      await commit(next);
    });
  }, [commit, enqueue]);

  const duplicateItem = useCallback(async (id: string) => {
    const source = itemsRef.current.find((item) => item.id === id && item.kind === 'file' && !item.deletedAt);
    if (!source) return null;
    const copyId = createId('copy');
    const destination = Platform.OS === 'web' || !source.uri
      ? source.uri
      : `${MANAGED_DIRECTORY}${copyId}-${safeFileName(source.name)}`;
    try {
      if (Platform.OS !== 'web' && source.uri) {
        await ensureManagedDirectory();
        await FileSystem.copyAsync({ from: source.uri, to: destination });
      }
      const createdAt = nowIso();
      const copy: LibraryItem = {
        ...source,
        id: copyId,
        name: source.name.replace(/(\.[^.]+)?$/, (ext) => ` copy${ext}`),
        uri: destination,
        createdAt,
        modifiedAt: createdAt,
        openedAt: null,
        favorite: false,
        deletedAt: null,
      };
      await enqueue(async () => {
        await commit([copy, ...itemsRef.current]);
      });
      return copy;
    } catch {
      setError('Sift could not duplicate that file.');
      return null;
    }
  }, [commit, enqueue, ensureManagedDirectory]);

  const toggleFavorite = useCallback((id: string) => {
    void enqueue(async () => {
      const next = itemsRef.current.map((item) => (
        item.id === id ? { ...item, favorite: !item.favorite, modifiedAt: nowIso() } : item
      ));
      await commit(next);
    });
  }, [commit, enqueue]);

  const trashItems = useCallback(async (ids: string[]) => {
    await enqueue(async () => {
      const allIds = descendantIds(itemsRef.current, ids);
      const deletedAt = nowIso();
      const next = itemsRef.current.map((item) => (
        allIds.has(item.id) && !item.deletedAt ? { ...item, deletedAt, modifiedAt: deletedAt } : item
      ));
      await commit(next);
    });
  }, [commit, enqueue]);

  const restoreItems = useCallback(async (ids: string[]) => {
    await enqueue(async () => {
      const allIds = descendantIds(itemsRef.current, ids);
      const next = itemsRef.current.map((item) => {
        if (!allIds.has(item.id)) return item;
        const parent = item.parentId ? itemsRef.current.find((candidate) => candidate.id === item.parentId) : null;
        const parentStillGone = Boolean(
          item.parentId && (!parent || (parent.deletedAt && !allIds.has(parent.id))),
        );
        return { ...item, deletedAt: null, parentId: parentStillGone ? null : item.parentId, modifiedAt: nowIso() };
      });
      await commit(next);
    });
  }, [commit, enqueue]);

  const deleteForever = useCallback(async (ids: string[]) => {
    await enqueue(async () => {
      const allIds = descendantIds(itemsRef.current, ids);
      const removed = itemsRef.current.filter((item) => allIds.has(item.id));
      const next = itemsRef.current.filter((item) => !allIds.has(item.id));
      await persist(next);
      if (Platform.OS !== 'web') {
        await Promise.all(removed.map(async (item) => {
          if (item.kind !== 'file' || !item.uri) return;
          await FileSystem.deleteAsync(item.uri, { idempotent: true }).catch(() => undefined);
        }));
      }
      itemsRef.current = next;
      setItems(next);
    });
  }, [enqueue, persist]);

  const emptyTrash = useCallback(async () => {
    const trashed = itemsRef.current.filter((item) => item.deletedAt).map((item) => item.id);
    if (trashed.length) await deleteForever(trashed);
  }, [deleteForever]);

  const markOpened = useCallback(async (id: string) => {
    await enqueue(async () => {
      const openedAt = nowIso();
      const next = itemsRef.current.map((item) => (
        item.id === id ? { ...item, openedAt, modifiedAt: item.kind === 'folder' ? openedAt : item.modifiedAt } : item
      ));
      await commit(next);
    });
  }, [commit, enqueue]);

  const shareItems = useCallback(async (ids: string[]) => {
    const shareable = itemsRef.current.filter((item) => ids.includes(item.id) && item.kind === 'file' && item.uri && !item.deletedAt);
    if (!shareable.length) {
      setError('There is no file to share yet.');
      return;
    }
    try {
      if (Platform.OS === 'web') {
        setError('Sharing is available in the iOS app.');
        return;
      }
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        setError('Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(shareable[0].uri, {
        mimeType: shareable[0].mimeType ?? undefined,
        dialogTitle: shareable[0].name,
      });
    } catch {
      setError('Sift could not share that file.');
    }
  }, []);

  const exportItems = useCallback(async (ids: string[]) => {
    const filesToExport = itemsRef.current.filter((item) => (
      ids.includes(item.id) && item.kind === 'file' && item.uri && !item.deletedAt
    ));
    if (!filesToExport.length) {
      setError('There is no file to save yet.');
      return;
    }
    try {
      if (Platform.OS === 'web') {
        filesToExport.forEach((item) => {
          const link = document.createElement('a');
          link.href = item.uri;
          link.download = item.name;
          document.body.appendChild(link);
          link.click();
          link.remove();
        });
        return;
      }
      try {
        const directory = await Directory.pickDirectoryAsync();
        for (const item of filesToExport) {
          const desired = uniqueExportName(directory, item.name);
          await new File(item.uri).copy(new File(directory, desired));
        }
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
        if (message.includes('cancel') || message.includes('dismiss') || message.includes('aborted')) return;
        const available = await Sharing.isAvailableAsync();
        if (!available) {
          setError('Sift could not save that file to Files.');
          return;
        }
        await Sharing.shareAsync(filesToExport[0].uri, {
          mimeType: filesToExport[0].mimeType ?? undefined,
          dialogTitle: 'Save to Files',
        });
      }
    } catch {
      setError('Sift could not save that file to Files.');
    }
  }, []);

  const getItem = useCallback((id: string) => items.find((item) => item.id === id), [items]);

  const childrenOf = useCallback((parentId: string | null) => (
    items.filter((item) => item.parentId === parentId && !item.deletedAt)
  ), [items]);

  const breadcrumbsFor = useCallback((folderId: string | null) => {
    const crumbs: LibraryItem[] = [];
    const byId = new Map(items.map((item) => [item.id, item]));
    let current = folderId;
    while (current) {
      const folder = byId.get(current);
      if (!folder) break;
      crumbs.unshift(folder);
      current = folder.parentId;
    }
    return crumbs;
  }, [items]);

  const pathLabelFor = useCallback((item: LibraryItem) => {
    const crumbs = breadcrumbsFor(item.parentId);
    if (!crumbs.length) return 'Files';
    return ['Files', ...crumbs.map((folder) => folder.name)].join(' / ');
  }, [breadcrumbsFor]);

  const folderOptions = useCallback((excludeIds: string[] = []) => {
    const blocked = descendantIds(items, excludeIds);
    return items.filter((item) => item.kind === 'folder' && !item.deletedAt && !blocked.has(item.id));
  }, [items]);

  const files = useMemo(() => items.filter((item) => item.kind === 'file' && !item.deletedAt), [items]);
  const trashedItems = useMemo(() => items.filter((item) => item.deletedAt), [items]);

  const value = useMemo<FileManagerContextValue>(() => ({
    items,
    files,
    isLoading,
    isReady,
    isImporting,
    error,
    pendingIncoming,
    importFiles,
    saveGeneratedFile,
    saveFileFromUri,
    createFolder,
    renameItem,
    moveItems,
    duplicateItem,
    toggleFavorite,
    trashItems,
    restoreItems,
    deleteForever,
    emptyTrash,
    markOpened,
    shareItems,
    exportItems,
    importInbox,
    confirmIncomingFile,
    dismissIncomingFile,
    reloadLibrary,
    clearError: () => setError(null),
    getItem,
    childrenOf,
    breadcrumbsFor,
    pathLabelFor,
    folderOptions,
    trashedItems,
  }), [
    breadcrumbsFor,
    childrenOf,
    createFolder,
    deleteForever,
    duplicateItem,
    emptyTrash,
    error,
    exportItems,
    files,
    folderOptions,
    getItem,
    importFiles,
    importInbox,
    saveGeneratedFile,
    saveFileFromUri,
    isImporting,
    isLoading,
    isReady,
    items,
    markOpened,
    moveItems,
    pathLabelFor,
    pendingIncoming,
    reloadLibrary,
    renameItem,
    restoreItems,
    shareItems,
    toggleFavorite,
    trashItems,
    trashedItems,
    confirmIncomingFile,
    dismissIncomingFile,
  ]);

  return <FileManagerContext.Provider value={value}>{children}</FileManagerContext.Provider>;
}

export function useFileManager() {
  const context = useContext(FileManagerContext);
  if (!context) throw new Error('useFileManager must be used within FileManagerProvider');
  return context;
}
