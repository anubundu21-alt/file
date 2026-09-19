import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  AppState,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { categoryMeta, formatFileSize, useFileManager } from '@/context/FileManagerContext';
import { useColors } from '@/hooks/useColors';
import { FileGlyph } from '@/components/FileGlyph';
import { PromptModal } from '@/components/PromptModal';
import { formatRelativeTime } from '@/lib/filePresentation';
import { formatStorageSize, readDeviceStorage, type DeviceStorage } from '@/lib/deviceStorage';

type IconName = React.ComponentProps<typeof Feather>['name'];

function Icon({ name, color, size = 18 }: { name: IconName; color: string; size?: number }) {
  return <Feather name={name} size={size} color={color} />;
}

function SectionHeading({ title, action, onPress, color, actionColor }: {
  title: string;
  action?: string;
  onPress?: () => void;
  color: string;
  actionColor: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      {action ? (
        <Pressable onPress={onPress} hitSlop={10}>
          <Text style={[styles.sectionAction, { color: actionColor }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { files, items, importFiles, toggleFavorite, createFolder, isImporting, isLoading, isReady, reloadLibrary } = useFileManager();
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [folderPrompt, setFolderPrompt] = useState(false);
  const [deviceStorage, setDeviceStorage] = useState<DeviceStorage | null>(null);

  const greet = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  }, []);
  const activeFiles = files;
  const totalBytes = useMemo(() => activeFiles.reduce((sum, file) => sum + file.size, 0), [activeFiles]);
  const freeRatio = deviceStorage && deviceStorage.total > 0
    ? Math.min(1, deviceStorage.free / deviceStorage.total)
    : 0;
  const recentFiles = useMemo(() => [...activeFiles]
    .sort((a, b) => new Date(b.openedAt ?? b.createdAt).getTime() - new Date(a.openedAt ?? a.createdAt).getTime())
    .slice(0, 4), [activeFiles]);
  const favoriteCount = items.filter((item) => item.favorite && !item.deletedAt).length;
  const largeFiles = activeFiles.filter((file) => file.size >= 10 * 1024 * 1024);
  const staleFiles = activeFiles.filter((file) => {
    const stamp = new Date(file.openedAt ?? file.createdAt).getTime();
    return Date.now() - stamp > 30 * 24 * 60 * 60 * 1000;
  });
  const suggestion = largeFiles.length
    ? { title: 'Make room for what matters', text: `${largeFiles.length} large ${largeFiles.length === 1 ? 'file is' : 'files are'} taking ${formatFileSize(largeFiles.reduce((sum, file) => sum + file.size, 0))}.` }
    : staleFiles.length
      ? { title: 'Files you have not opened lately', text: `${staleFiles.length} ${staleFiles.length === 1 ? 'file has' : 'files have'} been idle for more than 30 days.` }
      : favoriteCount
        ? { title: 'Your favorites are ready', text: `${favoriteCount} starred ${favoriteCount === 1 ? 'item is' : 'items are'} waiting in Files.` }
        : { title: 'Start your library', text: 'Import a file and Sift will keep it organized locally.' };

  const showNotice = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(null), 2200);
  };

  const refreshStorage = async () => {
    const next = await readDeviceStorage();
    setDeviceStorage(next);
  };

  useEffect(() => {
    void refreshStorage();
  }, []);

  // Free space moves while the app is in the background, so re-read it when
  // Home comes back into view rather than showing a figure from last launch.
  useFocusEffect(
    useCallback(() => {
      void refreshStorage();
    }, []),
  );

  // And again when the app itself comes back to the front — switching from
  // Settings to Sift to compare the two numbers is exactly when a stale
  // reading shows up as a mismatch.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshStorage();
    });
    return () => subscription.remove();
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([reloadLibrary(), refreshStorage()]);
    setRefreshing(false);
  };

  const handleImport = async () => {
    if (!isReady || isLoading || isImporting) return;
    const count = await importFiles(null);
    if (count > 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showNotice(`${count} ${count === 1 ? 'file' : 'files'} saved and organized.`);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.homeContent, { paddingTop: insets.top + 18, paddingBottom: 120 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.primary} />}
      >
        <View style={styles.topLine}>
          <View>
            <Text style={[styles.greeting, { color: colors.foreground }]}>{greet}</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Everything you need, right here.</Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: colors.navy }]}>
            <Feather name="user" color="#FFFFFF" size={18} />
          </View>
        </View>

        <View style={[styles.storageCard, { backgroundColor: colors.navy }]}>
          <View style={styles.storageHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.storageEyebrow}>{deviceStorage?.source === 'browser' ? 'BROWSER STORAGE' : 'IPHONE STORAGE'}</Text>
              <Text style={styles.storageTotal}>
                {deviceStorage ? formatStorageSize(deviceStorage.free) : '—'}
                <Text style={styles.storageUnit}>  free</Text>
              </Text>
              <Text style={styles.storageOf}>
                {deviceStorage ? `of ${formatStorageSize(deviceStorage.total)}` : 'of —'}
              </Text>
            </View>
            <View style={styles.storageRing}>
              <Text style={styles.storageRingText}>{deviceStorage ? `${Math.round(freeRatio * 100)}%` : '—'}</Text>
            </View>
          </View>
          <View style={styles.storageBar}>
            <View style={[styles.storageBarFill, { width: `${Math.min(100, Math.max(0, freeRatio * 100))}%`, backgroundColor: colors.teal }]} />
          </View>
          <View style={styles.storageStats}>
            <View style={styles.storageStat}>
              <Text style={styles.storageStatLabel}>Free</Text>
              <Text style={styles.storageStatValue}>{deviceStorage ? formatStorageSize(deviceStorage.free) : '—'}</Text>
            </View>
            <View style={styles.storageStat}>
              <Text style={styles.storageStatLabel}>Used</Text>
              <Text style={styles.storageStatValue}>{deviceStorage ? formatStorageSize(deviceStorage.used) : '—'}</Text>
            </View>
            <View style={styles.storageStat}>
              <Text style={styles.storageStatLabel}>Out of</Text>
              <Text style={styles.storageStatValue}>{deviceStorage ? formatStorageSize(deviceStorage.total) : '—'}</Text>
            </View>
          </View>
          <View style={styles.storageFooter}>
            <Text style={styles.storageCapacity}>Sift is using {totalBytes ? formatFileSize(totalBytes) : '0 B'}</Text>
            <Text style={styles.legendText}>{activeFiles.length} {activeFiles.length === 1 ? 'file' : 'files'} in Sift</Text>
          </View>
        </View>

        <SectionHeading title="Quick actions" color={colors.foreground} actionColor={colors.accentForeground} />
        <View style={styles.quickGrid}>
          <Pressable onPress={() => void handleImport()} style={({ pressed }) => [styles.quickAction, { backgroundColor: colors.card }, pressed && styles.pressed]}>
            <View style={[styles.quickIcon, { backgroundColor: '#CDE8FC' }]}><Icon name="upload" color="#10243D" /></View>
            <Text style={[styles.quickLabel, { color: colors.foreground }]}>{isImporting ? 'Importing…' : 'Import file'}</Text>
          </Pressable>
          <Pressable onPress={() => setFolderPrompt(true)} style={({ pressed }) => [styles.quickAction, { backgroundColor: colors.card }, pressed && styles.pressed]}>
            <View style={[styles.quickIcon, { backgroundColor: '#FCE5AC' }]}><Icon name="folder-plus" color="#10243D" /></View>
            <Text style={[styles.quickLabel, { color: colors.foreground }]}>New folder</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/trash')} style={({ pressed }) => [styles.quickAction, { backgroundColor: colors.card }, pressed && styles.pressed]}>
            <View style={[styles.quickIcon, { backgroundColor: '#F9D0C5' }]}><Icon name="trash-2" color="#10243D" /></View>
            <Text style={[styles.quickLabel, { color: colors.foreground }]}>Recently deleted</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/files')} style={({ pressed }) => [styles.quickAction, { backgroundColor: colors.card }, pressed && styles.pressed]}>
            <View style={[styles.quickIcon, { backgroundColor: '#E4DFFD' }]}><Icon name="layers" color="#10243D" /></View>
            <Text style={[styles.quickLabel, { color: colors.foreground }]}>Browse files</Text>
          </Pressable>
        </View>

        <SectionHeading title="Recent files" action="See all" onPress={() => router.push('/(tabs)/recent')} color={colors.foreground} actionColor={colors.accentForeground} />
        {recentFiles.length > 0 ? (
          <View style={[styles.recentCard, { backgroundColor: colors.card }]}>
            {recentFiles.map((file, index) => (
              <React.Fragment key={file.id}>
                <Pressable onPress={() => router.push(`/preview/${file.id}`)} style={styles.recentRow}>
                  <FileGlyph item={file} size={42} />
                  <View style={styles.recentDetails}>
                    <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1}>{file.name}</Text>
                    <Text style={[styles.fileMeta, { color: colors.mutedForeground }]}>
                      {categoryMeta[file.category].label}  ·  {formatFileSize(file.size)}  ·  {formatRelativeTime(file.openedAt ?? file.createdAt)}
                    </Text>
                  </View>
                  <Pressable onPress={() => toggleFavorite(file.id)} hitSlop={12} accessibilityLabel="Favorite file">
                    <Icon name="star" color={file.favorite ? colors.sunshine : colors.mutedForeground} />
                  </Pressable>
                </Pressable>
                {index < recentFiles.length - 1 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
              </React.Fragment>
            ))}
          </View>
        ) : (
          <Pressable style={[styles.emptyRecent, { backgroundColor: colors.card }]} onPress={() => void handleImport()}>
            <View style={[styles.emptyRecentIcon, { backgroundColor: colors.accent }]}>
              <Icon name="upload" color={colors.accentForeground} size={19} />
            </View>
            <View style={styles.recentDetails}>
              <Text style={[styles.fileName, { color: colors.foreground }]}>Import your first file</Text>
              <Text style={[styles.fileMeta, { color: colors.mutedForeground }]}>Sift saves it locally and organizes it automatically.</Text>
            </View>
            <Icon name="chevron-right" color={colors.mutedForeground} size={18} />
          </Pressable>
        )}

        <SectionHeading title="Smart suggestions" color={colors.foreground} actionColor={colors.accentForeground} />
        <Pressable
          style={({ pressed }) => [styles.suggestionCard, { backgroundColor: colors.accent }, pressed && styles.pressed]}
          onPress={() => router.push('/(tabs)/files')}
        >
          <View style={[styles.suggestionIcon, { backgroundColor: colors.teal }]}>
            <Icon name="star" color={colors.navy} size={18} />
          </View>
          <View style={styles.suggestionCopy}>
            <Text style={[styles.suggestionTitle, { color: colors.foreground }]}>{suggestion.title}</Text>
            <Text style={[styles.suggestionText, { color: colors.inkSoft }]}>{suggestion.text}</Text>
          </View>
          <Icon name="chevron-right" color={colors.accentForeground} size={20} />
        </Pressable>
      </ScrollView>
      {notice ? (
        <View style={[styles.notice, { backgroundColor: colors.navy }]}>
          <Icon name="check-circle" color={colors.teal} size={18} />
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}
      <PromptModal
        visible={folderPrompt}
        title="New folder"
        placeholder="Folder name"
        confirmLabel="Create"
        onCancel={() => setFolderPrompt(false)}
        onSubmit={(value) => {
          void createFolder(value, null);
          setFolderPrompt(false);
          showNotice('Folder created.');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  homeContent: { paddingHorizontal: 20 },
  topLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.8 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, marginTop: 5 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  storageCard: { borderRadius: 26, padding: 22, marginBottom: 28, shadowColor: '#10243D', shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  storageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  storageEyebrow: { color: '#9DB2A8', fontFamily: 'Inter_600SemiBold', letterSpacing: 1.4, fontSize: 10 },
  storageTotal: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 32, letterSpacing: -1, marginTop: 7 },
  storageUnit: { fontFamily: 'Inter_400Regular', fontSize: 13, letterSpacing: 0, color: '#B6C8BE' },
  storageOf: { color: '#9DB2A8', fontFamily: 'Inter_500Medium', fontSize: 13, marginTop: 4 },
  storageRing: { width: 58, height: 58, borderRadius: 29, borderWidth: 5, borderColor: '#19C88A', borderLeftColor: '#385169', alignItems: 'center', justifyContent: 'center' },
  storageRingText: { color: '#FFFFFF', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  storageBar: { height: 10, backgroundColor: '#263F56', borderRadius: 5, marginTop: 22, overflow: 'hidden' },
  storageBarFill: { height: '100%', borderRadius: 5 },
  storageStats: { flexDirection: 'row', marginTop: 16, gap: 10 },
  storageStat: { flex: 1, gap: 4 },
  storageStatLabel: { color: '#9DB2A8', fontFamily: 'Inter_500Medium', fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' },
  storageStatValue: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 15 },
  storageFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  storageCapacity: { color: '#9DB2A8', fontFamily: 'Inter_400Regular', fontSize: 12 },
  legendText: { color: '#B6C8BE', fontFamily: 'Inter_500Medium', fontSize: 10 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13, marginTop: 2 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: -0.25 },
  sectionAction: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  quickAction: { width: '48.3%', borderRadius: 18, padding: 14, minHeight: 94, justifyContent: 'space-between', shadowColor: '#10243D', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  quickIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  recentCard: { borderRadius: 20, paddingHorizontal: 15, marginBottom: 28, shadowColor: '#10243D', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  emptyRecent: { minHeight: 82, borderRadius: 20, paddingHorizontal: 15, marginBottom: 28, flexDirection: 'row', alignItems: 'center', gap: 12 },
  emptyRecentIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  recentRow: { flexDirection: 'row', alignItems: 'center', minHeight: 76, gap: 12 },
  recentDetails: { flex: 1, gap: 4 },
  fileName: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  fileMeta: { fontFamily: 'Inter_400Regular', fontSize: 10.5 },
  divider: { height: 1, marginLeft: 54 },
  suggestionCard: { borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  suggestionIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  suggestionCopy: { flex: 1, gap: 4 },
  suggestionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  suggestionText: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  notice: { position: 'absolute', bottom: 98, left: 20, right: 20, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 9, shadowColor: '#10243D', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  noticeText: { color: '#FFFFFF', fontFamily: 'Inter_500Medium', fontSize: 12, flex: 1 },
});
