import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { categoryMeta, formatFileSize, useFileManager } from '@/context/FileManagerContext';
import { useColors } from '@/hooks/useColors';

type IconName = React.ComponentProps<typeof Feather>['name'];

type RecentFile = {
  id: string;
  name: string;
  type: string;
  size: string;
  time: string;
  icon: IconName;
  color: string;
  favorite?: boolean;
};

function Icon({ name, color, size = 18 }: { name: IconName; color: string; size?: number }) {
  return <Feather name={name} size={size} color={color} />;
}

function SectionHeading({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={onPress} hitSlop={10}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function StorageCard({ colors, totalBytes, fileCount }: { colors: ReturnType<typeof useColors>; totalBytes: number; fileCount: number }) {
  const managedPercent = Math.max(5, Math.min(100, (totalBytes / (1024 * 1024 * 1024)) * 100));
  return (
    <View style={[styles.storageCard, { backgroundColor: colors.navy }]}>
      <View style={styles.storageHeader}>
        <View>
          <Text style={styles.storageEyebrow}>SIFT STORAGE</Text>
          <Text style={styles.storageTotal}>{totalBytes ? formatFileSize(totalBytes) : '0 MB'} <Text style={styles.storageUnit}>saved locally</Text></Text>
        </View>
        <View style={styles.storageRing}>
          <Text style={styles.storageRingText}>{fileCount}</Text>
        </View>
      </View>
      <View style={styles.storageBar}>
        <View style={[styles.storageBarSegment, { width: `${managedPercent}%`, backgroundColor: colors.teal }]} />
      </View>
      <View style={styles.storageFooter}>
        <Text style={styles.storageCapacity}>{fileCount} {fileCount === 1 ? 'file' : 'files'} managed</Text>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: colors.teal }]} />
          <Text style={styles.legendText}>Auto-organized</Text>
        </View>
      </View>
    </View>
  );
}

function QuickAction({ icon, label, color, onPress }: { icon: IconName; label: string; color: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.quickIcon, { backgroundColor: color }]}>
        <Icon name={icon} color="#10243D" size={18} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

function RecentRow({ file, onFavorite }: { file: RecentFile; onFavorite: () => void }) {
  return (
    <View style={styles.recentRow}>
      <View style={[styles.fileIcon, { backgroundColor: `${file.color}22` }]}>
        <Icon name={file.icon} color={file.color} size={20} />
      </View>
      <View style={styles.recentDetails}>
        <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
        <Text style={styles.fileMeta}>{file.type}  ·  {file.size}  ·  {file.time}</Text>
      </View>
      <Pressable onPress={onFavorite} hitSlop={12} accessibilityRole="button" accessibilityLabel="Favorite file">
        <Icon name={file.favorite ? 'star' : 'star'} color={file.favorite ? '#F5C75D' : '#A7B5AC'} size={18} />
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { files, importFiles, toggleFavorite, isImporting, isLoading, isReady } = useFileManager();
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const greet = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  }, []);
  const totalBytes = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);
  const displayRecentFiles = useMemo<RecentFile[]>(() => files.slice(0, 3).map((file) => {
    const meta = categoryMeta[file.category];
    const iconByCategory: Record<typeof file.category, IconName> = {
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
    return {
      id: file.id,
      name: file.name,
      type: meta.label,
      size: formatFileSize(file.size),
      time: 'Saved',
      icon: iconByCategory[file.category],
      color: meta.color,
      favorite: file.favorite,
    };
  }), [files]);

  const handleAction = (label: string) => {
    Haptics.selectionAsync();
    setNotice(`${label} is ready for the next phase.`);
    setTimeout(() => setNotice(null), 2200);
  };

  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 700);
  };

  const handleImport = async () => {
    if (!isReady || isLoading || isImporting) return;
    const count = await importFiles();
    if (count > 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNotice(`${count} ${count === 1 ? 'file' : 'files'} saved and organized.`);
      setTimeout(() => setNotice(null), 2200);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={[]}
        renderItem={null}
        scrollEnabled={false}
        ListHeaderComponent={
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.homeContent, { paddingTop: insets.top + 18, paddingBottom: 120 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
          >
            <View style={styles.topLine}>
              <View>
                <Text style={[styles.greeting, { color: colors.foreground }]}>{greet}, Rakesh</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Everything you need, right here.</Text>
              </View>
              <Pressable style={[styles.avatar, { backgroundColor: colors.navy }]} onPress={() => Alert.alert('Profile', 'Your local workspace is ready.')}>
                <Text style={styles.avatarText}>R</Text>
              </Pressable>
            </View>

            <StorageCard colors={colors} totalBytes={totalBytes} fileCount={files.length} />

            <SectionHeading title="Quick actions" action="Customize" onPress={() => handleAction('Quick actions')} />
            <View style={styles.quickGrid}>
              <QuickAction icon="camera" label="Scan document" color="#BCEEDB" onPress={() => handleAction('Scan document')} />
              <QuickAction icon="upload" label={isImporting ? 'Importing…' : 'Import file'} color="#CDE8FC" onPress={() => void handleImport()} />
              <QuickAction icon="folder-plus" label="New folder" color="#FCE5AC" onPress={() => handleAction('New folder')} />
              <QuickAction icon="archive" label="Compress" color="#E4DFFD" onPress={() => handleAction('Compress')} />
            </View>

            <SectionHeading title="Recent files" action="See all" onPress={() => handleAction('Recent files')} />
            {displayRecentFiles.length > 0 ? (
              <View style={styles.recentCard}>
                {displayRecentFiles.map((file, index) => (
                  <React.Fragment key={file.id}>
                    <RecentRow file={file} onFavorite={() => toggleFavorite(file.id)} />
                    {index < displayRecentFiles.length - 1 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
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

            <SectionHeading title="Smart suggestions" />
            <Pressable style={({ pressed }) => [styles.suggestionCard, { backgroundColor: colors.accent }, pressed && styles.pressed]} onPress={() => handleAction('Storage cleanup')}>
              <View style={[styles.suggestionIcon, { backgroundColor: colors.teal }]}>
                <Icon name="star" color={colors.navy} size={18} />
              </View>
              <View style={styles.suggestionCopy}>
                <Text style={[styles.suggestionTitle, { color: colors.foreground }]}>Make room for what matters</Text>
                <Text style={[styles.suggestionText, { color: colors.inkSoft }]}>12 large files have not been opened in 6 months.</Text>
              </View>
              <Icon name="chevron-right" color={colors.accentForeground} size={20} />
            </Pressable>
          </ScrollView>
        }
      />
      {notice ? (
        <View style={[styles.notice, { backgroundColor: colors.navy }]}>
          <Icon name="check-circle" color={colors.teal} size={18} />
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  homeContent: { paddingHorizontal: 20, gap: 0 },
  topLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.8 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, marginTop: 5 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 16 },
  storageCard: { borderRadius: 26, padding: 22, marginBottom: 28, shadowColor: '#10243D', shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  storageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  storageEyebrow: { color: '#9DB2A8', fontFamily: 'Inter_600SemiBold', letterSpacing: 1.4, fontSize: 10 },
  storageTotal: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 32, letterSpacing: -1, marginTop: 7 },
  storageUnit: { fontFamily: 'Inter_400Regular', fontSize: 13, letterSpacing: 0, color: '#B6C8BE' },
  storageRing: { width: 58, height: 58, borderRadius: 29, borderWidth: 5, borderColor: '#19C88A', borderLeftColor: '#385169', alignItems: 'center', justifyContent: 'center' },
  storageRingText: { color: '#FFFFFF', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  storageBar: { height: 10, backgroundColor: '#263F56', borderRadius: 5, marginTop: 22, flexDirection: 'row', overflow: 'hidden', gap: 2 },
  storageBarSegment: { height: '100%' },
  storageFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  storageCapacity: { color: '#9DB2A8', fontFamily: 'Inter_400Regular', fontSize: 12 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 7 },
  legendText: { color: '#B6C8BE', fontFamily: 'Inter_500Medium', fontSize: 10 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13, marginTop: 2 },
  sectionTitle: { color: '#10243D', fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: -0.25 },
  sectionAction: { color: '#087B54', fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  quickAction: { width: '48.3%', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14, minHeight: 94, justifyContent: 'space-between', shadowColor: '#10243D', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  quickIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { color: '#10243D', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  recentCard: { backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 15, marginBottom: 28, shadowColor: '#10243D', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  emptyRecent: { minHeight: 82, borderRadius: 20, paddingHorizontal: 15, marginBottom: 28, flexDirection: 'row', alignItems: 'center', gap: 12 },
  emptyRecentIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  recentRow: { flexDirection: 'row', alignItems: 'center', minHeight: 76, gap: 12 },
  fileIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  recentDetails: { flex: 1, gap: 4 },
  fileName: { color: '#10243D', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  fileMeta: { color: '#6C7A74', fontFamily: 'Inter_400Regular', fontSize: 10.5 },
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
