import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FileCategory, formatFileSize, LibraryItem, useFileManager } from '@/context/FileManagerContext';
import { useColors } from '@/hooks/useColors';
import { ActionSheet } from '@/components/ActionSheet';
import { FileGlyph } from '@/components/FileGlyph';
import { FolderPickerModal } from '@/components/FolderPickerModal';
import { PromptModal } from '@/components/PromptModal';
import { SelectionBar } from '@/components/SelectionBar';
import { formatRelativeTime } from '@/lib/filePresentation';

type IconName = React.ComponentProps<typeof Feather>['name'];
type ViewMode = 'grid' | 'list';
type Filter = FileCategory | 'all';
type SortBy = 'Recent' | 'Name' | 'Size';

const filters: { label: string; value: Filter; icon: IconName }[] = [
  { label: 'All', value: 'all', icon: 'layers' },
  { label: 'PDF', value: 'pdf', icon: 'file-text' },
  { label: 'Images', value: 'image', icon: 'image' },
  { label: 'ZIP', value: 'archive', icon: 'archive' },
  { label: 'Documents', value: 'document', icon: 'file' },
  { label: 'Sheets', value: 'spreadsheet', icon: 'grid' },
  { label: 'Slides', value: 'presentation', icon: 'monitor' },
  { label: 'Video', value: 'video', icon: 'video' },
  { label: 'Audio', value: 'audio', icon: 'headphones' },
  { label: 'Other', value: 'other', icon: 'box' },
];

function FileTile({
  item,
  mode,
  selected,
  selecting,
  subtitle,
  onPress,
  onLongPress,
  onFavorite,
  onMore,
}: {
  item: LibraryItem;
  mode: ViewMode;
  selected: boolean;
  selecting: boolean;
  subtitle: string;
  onPress: () => void;
  onLongPress: () => void;
  onFavorite: () => void;
  onMore: () => void;
}) {
  const colors = useColors();
  const selectedStyle = selected ? { borderWidth: 2, borderColor: colors.teal } : null;

  if (mode === 'list') {
    return (
      <Pressable onPress={onPress} onLongPress={onLongPress} style={({ pressed }) => [styles.listItem, { backgroundColor: colors.card }, selectedStyle, pressed && styles.pressed]}>
        <FileGlyph item={item} size={40} />
        <View style={styles.listCopy}>
          <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>{subtitle}</Text>
        </View>
        {selecting ? (
          <Feather name={selected ? 'check-circle' : 'circle'} color={selected ? colors.teal : colors.mutedForeground} size={20} />
        ) : (
          <>
            <Pressable onPress={onFavorite} hitSlop={12} accessibilityLabel={item.favorite ? 'Remove favorite' : 'Add favorite'}>
              <Feather name={item.favorite ? 'star' : 'star'} color={item.favorite ? colors.sunshine : colors.mutedForeground} size={17} />
            </Pressable>
            <Pressable onPress={onMore} hitSlop={12} accessibilityLabel="More actions">
              <Feather name="more-horizontal" color={colors.mutedForeground} size={18} />
            </Pressable>
          </>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={({ pressed }) => [styles.gridTile, { backgroundColor: colors.card }, selectedStyle, pressed && styles.pressed]}>
      <View style={styles.gridTop}>
        <FileGlyph item={item} size={42} />
        {selecting ? (
          <Feather name={selected ? 'check-circle' : 'circle'} color={selected ? colors.teal : colors.mutedForeground} size={18} />
        ) : (
          <View style={styles.gridActions}>
            <Pressable onPress={onFavorite} hitSlop={8} accessibilityLabel={item.favorite ? 'Remove favorite' : 'Add favorite'}>
              <Feather name="star" color={item.favorite ? colors.sunshine : colors.mutedForeground} size={16} />
            </Pressable>
            <Pressable onPress={onMore} hitSlop={8} accessibilityLabel="More actions">
              <Feather name="more-horizontal" color={colors.mutedForeground} size={16} />
            </Pressable>
          </View>
        )}
      </View>
      <View>
        <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={2}>{item.name}</Text>
        <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

export default function FilesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    items,
    isLoading,
    isReady,
    isImporting,
    error,
    importFiles,
    createFolder,
    renameItem,
    moveItems,
    duplicateItem,
    toggleFavorite,
    trashItems,
    shareItems,
    exportItems,
    markOpened,
    reloadLibrary,
    clearError,
    breadcrumbsFor,
    pathLabelFor,
    folderOptions,
  } = useFileManager();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('Recent');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sheetItem, setSheetItem] = useState<LibraryItem | null>(null);
  const [prompt, setPrompt] = useState<{ mode: 'folder' | 'rename'; item?: LibraryItem } | null>(null);
  const [movingIds, setMovingIds] = useState<string[] | null>(null);

  const selecting = selectedIds.length > 0;

  useEffect(() => {
    AsyncStorage.getItem('sift-view-mode').then((value) => {
      if (value === 'grid' || value === 'list') setViewMode(value);
    });
  }, []);

  useEffect(() => {
    if (!folderId) return;
    const current = items.find((item) => item.id === folderId);
    if (!current || current.kind !== 'folder' || current.deletedAt) {
      setFolderId(null);
      setSelectedIds([]);
    }
  }, [folderId, items]);

  useEffect(() => {
    if (!error) return;
    Alert.alert(
      isReady ? 'Something went wrong' : 'Library unavailable',
      error,
      isReady
        ? [{ text: 'OK', onPress: clearError }]
        : [{ text: 'Retry', onPress: () => void reloadLibrary() }],
    );
  }, [clearError, error, isReady, reloadLibrary]);

  const breadcrumbs = useMemo(() => breadcrumbsFor(folderId), [breadcrumbsFor, folderId, items]);
  const searching = query.trim().length > 0;

  const visibleItems = useMemo(() => {
    const haystack = items.filter((item) => {
      if (item.deletedAt) return false;
      if (searching) return item.name.toLowerCase().includes(query.trim().toLowerCase());
      return item.parentId === folderId;
    }).filter((item) => filter === 'all' || item.kind === 'folder' || item.category === filter);

    return [...haystack].sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
      if (sortBy === 'Name') return a.name.localeCompare(b.name);
      if (sortBy === 'Size') return b.size - a.size;
      const aTime = new Date(a.openedAt ?? a.modifiedAt).getTime();
      const bTime = new Date(b.openedAt ?? b.modifiedAt).getTime();
      return bTime - aTime;
    });
  }, [filter, folderId, items, query, searching, sortBy]);

  const changeView = (next: ViewMode) => {
    setViewMode(next);
    void AsyncStorage.setItem('sift-view-mode', next);
    void Haptics.selectionAsync();
  };

  const importNow = async () => {
    const count = await importFiles(folderId);
    if (count > 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const openItem = (item: LibraryItem) => {
    if (selecting) {
      setSelectedIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]);
      return;
    }
    if (item.kind === 'folder') {
      void markOpened(item.id);
      setQuery('');
      setFolderId(item.id);
      return;
    }
    router.push(`/preview/${item.id}`);
  };

  const cycleSort = () => {
    setSortBy((current) => current === 'Recent' ? 'Name' : current === 'Name' ? 'Size' : 'Recent');
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        key={`${viewMode}-${folderId ?? 'root'}`}
        data={visibleItems}
        numColumns={viewMode === 'grid' ? 2 : 1}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FileTile
            item={item}
            mode={viewMode}
            selected={selectedIds.includes(item.id)}
            selecting={selecting}
            subtitle={searching
              ? `${item.kind === 'folder' ? 'Folder' : formatFileSize(item.size)}  ·  ${pathLabelFor(item)}`
              : item.kind === 'folder'
                ? 'Folder'
                : `${formatFileSize(item.size)}  ·  ${formatRelativeTime(item.modifiedAt)}`}
            onPress={() => openItem(item)}
            onLongPress={() => {
              void Haptics.selectionAsync();
              setSelectedIds((current) => current.includes(item.id) ? current : [...current, item.id]);
            }}
            onFavorite={() => toggleFavorite(item.id)}
            onMore={() => setSheetItem(item)}
          />
        )}
        columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
        contentContainerStyle={[styles.filesContent, { paddingTop: insets.top + 18, paddingBottom: selecting ? 180 : 120 }, visibleItems.length === 0 && styles.emptyList]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pageTitle, { color: colors.foreground }]}>{folderId ? breadcrumbs.at(-1)?.name ?? 'Files' : 'Files'}</Text>
                <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>
                  {selecting ? `${selectedIds.length} selected` : `${visibleItems.length} ${visibleItems.length === 1 ? 'item' : 'items'}`}
                </Text>
              </View>
              {selecting ? (
                <Pressable onPress={() => setSelectedIds([])} style={[styles.headerChip, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.headerChipText, { color: colors.foreground }]}>Cancel</Text>
                </Pressable>
              ) : (
                <View style={styles.headerActions}>
                  <Pressable onPress={() => setPrompt({ mode: 'folder' })} style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border }]} accessibilityLabel="New folder">
                    <Feather name="folder-plus" color={colors.foreground} size={18} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Import files"
                    disabled={isImporting || isLoading || !isReady}
                    style={({ pressed }) => [styles.addButton, { backgroundColor: colors.navy }, pressed && styles.pressed]}
                    onPress={() => void importNow()}
                  >
                    {isImporting || isLoading ? <ActivityIndicator color={colors.white} size="small" /> : <Feather name="plus" color={colors.white} size={20} />}
                  </Pressable>
                </View>
              )}
            </View>
            {breadcrumbs.length > 0 && !searching ? (
              <View style={styles.crumbs}>
                <Pressable onPress={() => setFolderId(null)}><Text style={[styles.crumb, { color: colors.accentForeground }]}>Files</Text></Pressable>
                {breadcrumbs.map((crumb) => (
                  <View key={crumb.id} style={styles.crumbRow}>
                    <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
                    <Pressable onPress={() => setFolderId(crumb.id)}>
                      <Text style={[styles.crumb, { color: crumb.id === folderId ? colors.foreground : colors.accentForeground }]}>{crumb.name}</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
            <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="search" color={colors.mutedForeground} size={17} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search files and folders"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.searchInput, { color: colors.foreground }]}
                returnKeyType="search"
              />
            </View>
            <FlatList
              horizontal
              data={filters}
              keyExtractor={(item) => item.value}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filters}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => { setFilter(item.value); void Haptics.selectionAsync(); }}
                  style={[styles.filterChip, { backgroundColor: filter === item.value ? colors.navy : colors.card, borderColor: filter === item.value ? colors.navy : colors.border }]}
                >
                  <Feather name={item.icon} color={filter === item.value ? colors.white : colors.mutedForeground} size={14} />
                  <Text style={[styles.filterText, { color: filter === item.value ? colors.white : colors.inkSoft }]}>{item.label}</Text>
                </Pressable>
              )}
            />
            <View style={styles.toolbar}>
              <Text style={[styles.resultLabel, { color: colors.mutedForeground }]}>{searching ? 'Search results' : 'In this folder'}</Text>
              <View style={styles.toolbarActions}>
                <Pressable onPress={cycleSort} style={styles.sortButton}>
                  <Feather name="arrow-down" color={colors.inkSoft} size={14} />
                  <Text style={[styles.sortText, { color: colors.inkSoft }]}>{sortBy}</Text>
                </Pressable>
                <View style={[styles.viewToggle, { backgroundColor: colors.secondary }]}>
                  <Pressable onPress={() => changeView('grid')} style={[styles.toggleButton, viewMode === 'grid' && { backgroundColor: colors.card }]}>
                    <Feather name="grid" color={viewMode === 'grid' ? colors.foreground : colors.mutedForeground} size={15} />
                  </Pressable>
                  <Pressable onPress={() => changeView('list')} style={[styles.toggleButton, viewMode === 'list' && { backgroundColor: colors.card }]}>
                    <Feather name="list" color={viewMode === 'list' ? colors.foreground : colors.mutedForeground} size={15} />
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={colors.primary} size="large" />
          ) : (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.accent }]}>
                <Feather name={query || filter !== 'all' ? 'search' : 'folder-plus'} color={colors.accentForeground} size={28} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{query || filter !== 'all' ? 'No matching files' : 'This folder is empty'}</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{query || filter !== 'all' ? 'Try another search or category.' : 'Import files or create a folder to start organizing.'}</Text>
              {!query && filter === 'all' ? (
                <Pressable onPress={() => void importNow()} style={({ pressed }) => [styles.importButton, { backgroundColor: colors.navy }, pressed && styles.pressed]}>
                  <Feather name="upload" color={colors.white} size={16} />
                  <Text style={styles.importButtonText}>Import files</Text>
                </Pressable>
              ) : null}
            </View>
          )
        }
      />
      {selecting ? (
        <SelectionBar
          count={selectedIds.length}
          onShare={() => void shareItems(selectedIds)}
          onSave={() => void exportItems(selectedIds)}
          onMove={() => setMovingIds(selectedIds)}
          onFavorite={() => selectedIds.forEach((id) => toggleFavorite(id))}
          onTrash={() => {
            void trashItems(selectedIds);
            setSelectedIds([]);
          }}
        />
      ) : null}
      <ActionSheet
        visible={Boolean(sheetItem)}
        title={sheetItem?.name ?? ''}
        message={sheetItem ? (sheetItem.kind === 'folder' ? 'Folder' : formatFileSize(sheetItem.size)) : undefined}
        options={sheetItem ? [
          ...(sheetItem.kind === 'file' ? [{ label: 'Open', onPress: () => router.push(`/preview/${sheetItem.id}`) }] : [{ label: 'Open folder', onPress: () => setFolderId(sheetItem.id) }]),
          ...(sheetItem.kind === 'file' ? [{ label: 'Share', onPress: () => void shareItems([sheetItem.id]) }] : []),
          ...(sheetItem.kind === 'file' ? [{ label: 'Save to Files', onPress: () => void exportItems([sheetItem.id]) }] : []),
          { label: 'Rename', onPress: () => setPrompt({ mode: 'rename', item: sheetItem }) },
          { label: 'Move', onPress: () => setMovingIds([sheetItem.id]) },
          ...(sheetItem.kind === 'file' ? [{ label: 'Duplicate', onPress: () => void duplicateItem(sheetItem.id) }] : []),
          { label: sheetItem.favorite ? 'Remove favorite' : 'Add to favorites', onPress: () => toggleFavorite(sheetItem.id) },
          { label: 'Move to Recently Deleted', destructive: true, onPress: () => void trashItems([sheetItem.id]) },
        ] : []}
        onClose={() => setSheetItem(null)}
      />
      <PromptModal
        visible={Boolean(prompt)}
        title={prompt?.mode === 'folder' ? 'New folder' : 'Rename'}
        placeholder={prompt?.mode === 'folder' ? 'Folder name' : 'Name'}
        initialValue={prompt?.mode === 'rename' ? prompt.item?.name ?? '' : ''}
        confirmLabel={prompt?.mode === 'folder' ? 'Create' : 'Save'}
        onCancel={() => setPrompt(null)}
        onSubmit={(value) => {
          if (prompt?.mode === 'folder') void createFolder(value, folderId);
          if (prompt?.mode === 'rename' && prompt.item) void renameItem(prompt.item.id, value);
          setPrompt(null);
        }}
      />
      <FolderPickerModal
        visible={Boolean(movingIds)}
        folders={folderOptions(movingIds ?? [])}
        onClose={() => setMovingIds(null)}
        onSelect={(parentId) => {
          if (movingIds) void moveItems(movingIds, parentId);
          setMovingIds(null);
          setSelectedIds([]);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  filesContent: { paddingHorizontal: 20 },
  emptyList: { flexGrow: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerChip: { minHeight: 36, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerChipText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  iconButton: { width: 42, height: 42, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontFamily: 'Inter_700Bold', fontSize: 30, letterSpacing: -0.8 },
  pageSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 5 },
  addButton: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  crumbs: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 },
  crumbRow: { flexDirection: 'row', alignItems: 'center' },
  crumb: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  searchBox: { minHeight: 48, borderRadius: 15, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, paddingVertical: 11 },
  filters: { gap: 8, paddingVertical: 15 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 11, paddingHorizontal: 11, paddingVertical: 8, borderWidth: 1 },
  filterText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 },
  resultLabel: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  toolbarActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sortButton: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sortText: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  viewToggle: { flexDirection: 'row', borderRadius: 9, padding: 2, gap: 2 },
  toggleButton: { width: 27, height: 25, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  gridRow: { justifyContent: 'space-between' },
  gridTile: { width: '48.5%', minHeight: 142, borderRadius: 18, padding: 14, marginBottom: 10, justifyContent: 'space-between', shadowColor: '#10243D', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  gridTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  gridActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemName: { fontFamily: 'Inter_600SemiBold', fontSize: 13, lineHeight: 17 },
  itemMeta: { fontFamily: 'Inter_400Regular', fontSize: 10.5, marginTop: 4 },
  listItem: { borderRadius: 16, minHeight: 70, marginBottom: 8, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  listCopy: { flex: 1 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  emptyState: { alignItems: 'center', paddingTop: 54, gap: 10, paddingHorizontal: 24 },
  emptyIcon: { width: 62, height: 62, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, textAlign: 'center' },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  importButton: { minHeight: 46, borderRadius: 14, paddingHorizontal: 18, marginTop: 8, flexDirection: 'row', gap: 8, alignItems: 'center' },
  importButtonText: { color: '#FFFFFF', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
});
