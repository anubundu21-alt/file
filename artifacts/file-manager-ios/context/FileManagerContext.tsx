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
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Linking from 'expo-linking';

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

export type StoredFile = {
  id: string;
  name: string;
  uri: string;
  size: number;
  mimeType: string | null;
  category: FileCategory;
  createdAt: string;
  favorite: boolean;
};

type FileManagerContextValue = {
  files: StoredFile[];
  isLoading: boolean;
  isReady: boolean;
  isImporting: boolean;
  error: string | null;
  importFiles: () => Promise<number>;
  toggleFavorite: (id: string) => void;
  removeFile: (id: string) => Promise<void>;
  reloadLibrary: () => Promise<void>;
  clearError: () => void;
};

const STORAGE_KEY = 'sift-managed-files-v1';
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
  mp3: 'audio',
  wav: 'audio',
  m4a: 'audio',
  aac: 'audio',
  flac: 'audio',
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
  return name.replace(/[^\w.\-() ]+/g, '_');
}

export function FileManagerProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filesRef = useRef<StoredFile[]>([]);
  const importingRef = useRef(false);
  const mutationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const handledUrlsRef = useRef<Set<string>>(new Set());

  const reloadLibrary = useCallback(async () => {
    setIsLoading(true);
    setIsReady(false);
    setError(null);
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEY);
      const storedFiles = value ? JSON.parse(value) as StoredFile[] : [];
      const reconciled = Platform.OS === 'web'
        ? storedFiles
        : (await Promise.all(storedFiles.map(async (file) => {
            const info = await FileSystem.getInfoAsync(file.uri);
            return info.exists ? file : null;
          }))).filter((file): file is StoredFile => file !== null);
      filesRef.current = reconciled;
      setFiles(reconciled);
      if (reconciled.length !== storedFiles.length) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reconciled));
      }
      setIsReady(true);
    } catch {
      setError('Your saved file library could not be loaded. Sift has kept file actions locked to protect your existing library.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadLibrary();
  }, [reloadLibrary]);

  const persist = useCallback(async (nextFiles: StoredFile[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextFiles));
  }, []);

  const enqueue = useCallback(<T,>(operation: () => Promise<T>): Promise<T> => {
    const result = mutationQueueRef.current.then(operation, operation);
    mutationQueueRef.current = result.then(() => undefined, () => undefined);
    return result;
  }, []);

  const commit = useCallback(async (nextFiles: StoredFile[]) => {
    await persist(nextFiles);
    filesRef.current = nextFiles;
    setFiles(nextFiles);
  }, [persist]);

  const importFiles = useCallback(async () => {
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

      if (Platform.OS !== 'web') {
        const directoryInfo = await FileSystem.getInfoAsync(MANAGED_DIRECTORY);
        if (!directoryInfo.exists) {
          await FileSystem.makeDirectoryAsync(MANAGED_DIRECTORY, { intermediates: true });
        }
      }

      const imported: StoredFile[] = [];
      for (const [index, asset] of result.assets.entries()) {
        const id = `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
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
          uri: destination,
          size: asset.size ?? 0,
          mimeType: asset.mimeType ?? null,
          category: classifyFile(asset.name, asset.mimeType),
          createdAt: new Date().toISOString(),
          favorite: false,
        });
      }

      await enqueue(async () => {
        await commit([...imported, ...filesRef.current]);
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
  }, [commit, enqueue, isLoading, isReady]);

  const importExternalUri = useCallback(async (uri: string) => {
    if (!isReady || isLoading || Platform.OS === 'web' || !uri.startsWith('file://') || handledUrlsRef.current.has(uri)) return;
    handledUrlsRef.current.add(uri);
    const rawName = uri.split('?')[0]?.split('/').pop() ?? 'Imported file';
    const name = decodeURIComponent(rawName);
    const id = `${Date.now()}-external-${Math.random().toString(36).slice(2, 8)}`;
    const destination = `${MANAGED_DIRECTORY}${id}-${safeFileName(name)}`;
    try {
      const directoryInfo = await FileSystem.getInfoAsync(MANAGED_DIRECTORY);
      if (!directoryInfo.exists) {
        await FileSystem.makeDirectoryAsync(MANAGED_DIRECTORY, { intermediates: true });
      }
      const sourceInfo = await FileSystem.getInfoAsync(uri);
      await FileSystem.copyAsync({ from: uri, to: destination });
      const imported: StoredFile = {
        id,
        name,
        uri: destination,
        size: sourceInfo.exists && 'size' in sourceInfo ? sourceInfo.size : 0,
        mimeType: null,
        category: classifyFile(name),
        createdAt: new Date().toISOString(),
        favorite: false,
      };
      await enqueue(async () => {
        await commit([imported, ...filesRef.current]);
      });
    } catch {
      await FileSystem.deleteAsync(destination, { idempotent: true }).catch(() => undefined);
      setError('Sift could not save the file opened from another app.');
    }
  }, [commit, enqueue, isLoading, isReady]);

  useEffect(() => {
    if (isLoading) return;
    void Linking.getInitialURL().then((url) => {
      if (url) void importExternalUri(url);
    });
    const subscription = Linking.addEventListener('url', ({ url }) => {
      void importExternalUri(url);
    });
    return () => subscription.remove();
  }, [importExternalUri, isLoading]);

  const toggleFavorite = useCallback((id: string) => {
    void enqueue(async () => {
      const next = filesRef.current.map((file) => file.id === id ? { ...file, favorite: !file.favorite } : file);
      await commit(next);
    });
  }, [commit, enqueue]);

  const removeFile = useCallback(async (id: string) => {
    await enqueue(async () => {
      const file = filesRef.current.find((item) => item.id === id);
      if (!file) return;
      const next = filesRef.current.filter((item) => item.id !== id);
      await persist(next);
      if (Platform.OS !== 'web') {
        const info = await FileSystem.getInfoAsync(file.uri);
        if (info.exists) await FileSystem.deleteAsync(file.uri, { idempotent: true });
      }
      filesRef.current = next;
      setFiles(next);
    });
  }, [enqueue, persist]);

  const value = useMemo<FileManagerContextValue>(() => ({
    files,
    isLoading,
    isReady,
    isImporting,
    error,
    importFiles,
    toggleFavorite,
    removeFile,
    reloadLibrary,
    clearError: () => setError(null),
  }), [error, files, importFiles, isImporting, isLoading, isReady, reloadLibrary, removeFile, toggleFavorite]);

  return <FileManagerContext.Provider value={value}>{children}</FileManagerContext.Provider>;
}

export function useFileManager() {
  const context = useContext(FileManagerContext);
  if (!context) throw new Error('useFileManager must be used within FileManagerProvider');
  return context;
}