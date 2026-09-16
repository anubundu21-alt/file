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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  categoryMeta,
  FileCategory,
  formatFileSize,
  StoredFile,
  useFileManager,
} from '@/context/FileManagerContext';
import { useColors } from '@/hooks/useColors';

type IconName = React.ComponentProps<typeof Feather>['name'];
type ViewMode = 'grid' | 'list';
type Filter = FileCategory | 'all';

const categoryIcons: Record<FileCategory, IconName> = {
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

const filters: { label: string; value: Filter; icon: IconName }[] = [
  { label: 'All Files', value: 'all', icon: 'layers' },
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

function dateLabel(value: string): string {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Today';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function FileTile({
  file,
  mode,
  onFavorite,
  onDelete,
}: {
  file: StoredFile;
  mode: ViewMode;
  onFavorite: () => void;
  onDelete: () => void;
}) {
  const colors = useColors();
  const meta = categoryMeta[file.category];
  const icon = categoryIcons[file.category];
  const detail = `${formatFileSize(file.size)}  ·  ${dateLabel(file.createdAt)}`;

  const showOptions = () => {
    Alert.alert(file.name, `${meta.label} · ${formatFileSize(file.size)}`, [
      { text: file.favorite ? 'Remove favorite' : 'Add to favorites', onPress: onFavorite },
      { text: 'Delete from Sift', style: 'destructive', onPress: onDelete },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (mode === 'list') {
    return (
      <Pressable onPress={showOptions} style={({ pressed }) => [styles.listItem, { backgroundColor: colors.card }, pressed && styles.pressed]}>
        <View style={[styles.listFileIcon, { backgroundColor: `${meta.color}22` }]}>
          <Feather name={icon} color={meta.color} size={20} />
        </View>
        <View style={styles.listCopy}>
          <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={1}>{file.name}</Text>
          <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>{meta.label}  ·  {detail}</Text>
        </View>
        <Pressable onPress={onFavorite} hitSlop={12}>
          <Feather name="star" color={file.favorite ? colors.sunshine : colors.mutedForeground} size={17} />
        </Pressable>
        <Feather name="more-horizontal" color={colors.mutedForeground} size={18} />
      </Pressable>
    );
  }

  return (
    <Pressable onPress={showOptions} style={({ pressed }) => [styles.gridTile, { backgroundColor: colors.card }, pressed && styles.pressed]}>
      <View style={styles.gridTop}>
        <View style={[styles.gridFileIcon, { backgroundColor: `${meta.color}22` }]}>
          <Feather name={icon} color={meta.color} size={22} />
        </View>
        <Pressable onPress={onFavorite} hitSlop={10}>
          <Feather name="star" color={file.favorite ? colors.sunshine : colors.mutedForeground} size={16} />
        </Pressable>
      </View>
      <View>
        <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={2}>{file.name}</Text>
        <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>{detail}</Text>
      </View>
    </Pressable>
  );
}

export default function FilesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { files, isLoading, isReady, isImporting, error, importFiles, toggleFavorite, removeFile, reloadLibrary, clearError } = useFileManager();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sortBy, setSortBy] = useState<'Recent' | 'Name'>('Recent');

  useEffect(() => {
    AsyncStorage.getItem('sift-view-mode').then((value) => {
      if (value === 'grid' || value === 'list') setViewMode(value);
    });
  }, []);

  useEffect(() => {
    if (!error) return;
    Alert.alert(
      isReady ? 'Import failed' : 'Library unavailable',
      error,
      isReady
        ? [{ text: 'OK', onPress: clearError }]
        : [{ text: 'Retry', onPress: () => void reloadLibrary() }],
    );
  }, [clearError, error, isReady, reloadLibrary]);

  const changeView = (next: ViewMode) => {
    setViewMode(next);
    void AsyncStorage.setItem('sift-view-mode', next);
    void Haptics.selectionAsync();
  };

  const visibleFiles = useMemo(() => {
    const filtered = files.filter((file) => {
      const matchesQuery = file.name.toLowerCase().includes(query.toLowerCase());
      const matchesFilter = filter === 'all' || file.category === filter;
      return matchesQuery && matchesFilter;
    });
    return [...filtered].sort((a, b) => sortBy === 'Name'
      ? a.name.localeCompare(b.name)
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [files, filter, query, sortBy]);

  const importNow = async () => {
    const count = await importFiles();
    if (count > 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved to Sift', `${count} ${count === 1 ? 'file was' : 'files were'} saved and organized automatically.`);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        key={viewMode}
        data={visibleFiles}
        numColumns={viewMode === 'grid' ? 2 : 1}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FileTile
            file={item}
            mode={viewMode}
            onFavorite={() => toggleFavorite(item.id)}
            onDelete={() => void removeFile(item.id)}
          />
        )}
        columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
        contentContainerStyle={[styles.filesContent, { paddingTop: insets.top + 18, paddingBottom: 120 }, visibleFiles.length === 0 && styles.emptyList]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <View>
                <Text style={[styles.pageTitle, { color: colors.foreground }]}>Files</Text>
                <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>Saved in Sift  ·  {files.length} {files.length === 1 ? 'item' : 'items'}</Text>
              </View>
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
            <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="search" color={colors.mutedForeground} size={17} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search your files"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.searchInput, { color: colors.foreground }]}
                returnKeyType="search"
              />
              <Feather name="sliders" color={colors.mutedForeground} size={17} />
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
              <Text style={[styles.resultLabel, { color: colors.mutedForeground }]}>{visibleFiles.length} shown</Text>
              <View style={styles.toolbarActions}>
                <Pressable onPress={() => setSortBy(sortBy === 'Recent' ? 'Name' : 'Recent')} style={styles.sortButton}>
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
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{query || filter !== 'all' ? 'No matching files' : 'Bring your first file into Sift'}</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{query || filter !== 'all' ? 'Try another search or category.' : 'Choose any file. Sift will save it locally and put it in the right section.'}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  filesContent: { paddingHorizontal: 20 },
  emptyList: { flexGrow: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  pageTitle: { fontFamily: 'Inter_700Bold', fontSize: 30, letterSpacing: -0.8 },
  pageSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 5 },
  addButton: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
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
  gridRow: { gap: 10 },
  gridTile: { flex: 1, minHeight: 142, borderRadius: 18, padding: 14, marginBottom: 10, justifyContent: 'space-between', shadowColor: '#10243D', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  gridTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  gridFileIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontFamily: 'Inter_600SemiBold', fontSize: 13, lineHeight: 17 },
  itemMeta: { fontFamily: 'Inter_400Regular', fontSize: 10.5, marginTop: 4 },
  listItem: { borderRadius: 16, minHeight: 70, marginBottom: 8, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  listFileIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  listCopy: { flex: 1 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  emptyState: { alignItems: 'center', paddingTop: 54, gap: 10, paddingHorizontal: 24 },
  emptyIcon: { width: 62, height: 62, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, textAlign: 'center' },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  importButton: { minHeight: 46, borderRadius: 14, paddingHorizontal: 18, marginTop: 8, flexDirection: 'row', gap: 8, alignItems: 'center' },
  importButtonText: { color: '#FFFFFF', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
});