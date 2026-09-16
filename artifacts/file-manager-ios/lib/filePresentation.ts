import type { ComponentProps } from 'react';
import { Feather } from '@expo/vector-icons';
import { categoryMeta, type FileCategory, type LibraryItem } from '@/context/FileManagerContext';

export type IconName = ComponentProps<typeof Feather>['name'];

export const categoryIcons: Record<FileCategory, IconName> = {
  pdf: 'file-text',
  image: 'image',
  archive: 'archive',
  document: 'file',
  spreadsheet: 'grid',
  presentation: 'monitor',
  video: 'video',
  audio: 'headphones',
  other: 'box',
};

export function isPreviewableImage(item: LibraryItem): boolean {
  return item.kind === 'file' && item.category === 'image';
}

export function isPdfPreview(item: LibraryItem): boolean {
  if (item.kind !== 'file') return false;
  if (item.category === 'pdf') return true;
  return (item.mimeType === 'application/pdf') || item.name.toLowerCase().endsWith('.pdf');
}

export function isTextPreview(item: LibraryItem): boolean {
  if (item.kind !== 'file') return false;
  const extension = item.name.split('.').pop()?.toLowerCase() ?? '';
  return ['txt', 'md', 'json', 'csv', 'log', 'xml', 'html', 'css', 'js', 'ts'].includes(extension);
}

export function formatRelativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return 'Just now';
  if (diff < hour) return `${Math.max(1, Math.round(diff / minute))} min ago`;
  if (diff < day) return `${Math.max(1, Math.round(diff / hour))}h ago`;
  if (diff < 7 * day) return `${Math.max(1, Math.round(diff / day))}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function itemSubtitle(item: LibraryItem, sizeLabel: string): string {
  if (item.kind === 'folder') return 'Folder';
  return `${categoryMeta[item.category].label}  ·  ${sizeLabel}`;
}
