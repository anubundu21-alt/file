import React, { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { categoryMeta, formatFileSize, useFileManager } from '@/context/FileManagerContext';
import { useColors } from '@/hooks/useColors';
import { FileGlyph } from '@/components/FileGlyph';
import { formatRelativeTime } from '@/lib/filePresentation';

export default function RecentScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { files, isLoading, importFiles } = useFileManager();
  const recentFiles = useMemo(() => [...files]
    .sort((a, b) => new Date(b.openedAt ?? b.createdAt).getTime() - new Date(a.openedAt ?? a.createdAt).getTime())
    .slice(0, 30), [files]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={recentFiles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: 120, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Recent</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Opened and imported files, newest first.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/preview/${item.id}`)} style={({ pressed }) => [styles.row, { backgroundColor: colors.card }, pressed && styles.pressed]}>
            <FileGlyph item={item} size={40} />
            <View style={styles.copy}>
              <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                {categoryMeta[item.category].label}  ·  {formatFileSize(item.size)}  ·  {formatRelativeTime(item.openedAt ?? item.createdAt)}
              </Text>
            </View>
            <Feather name="chevron-right" color={colors.mutedForeground} size={18} />
          </Pressable>
        )}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={colors.primary} size="large" />
          ) : (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.accent }]}>
                <Feather name="clock" color={colors.accentForeground} size={28} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No recent files yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Files you import or open in Sift will appear here.</Text>
              <Pressable onPress={() => void importFiles(null)} style={({ pressed }) => [styles.importButton, { backgroundColor: colors.navy }, pressed && styles.pressed]}>
                <Feather name="upload" color={colors.white} size={16} />
                <Text style={styles.importButtonText}>Import a file</Text>
              </Pressable>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { marginBottom: 25 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 30, letterSpacing: -0.8 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 5 },
  row: { minHeight: 72, borderRadius: 17, marginBottom: 9, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  copy: { flex: 1, gap: 4 },
  fileName: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  meta: { fontFamily: 'Inter_400Regular', fontSize: 10.5 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 28, paddingBottom: 80 },
  emptyIcon: { width: 62, height: 62, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  importButton: { minHeight: 46, borderRadius: 14, paddingHorizontal: 18, marginTop: 8, flexDirection: 'row', gap: 8, alignItems: 'center' },
  importButtonText: { color: '#FFFFFF', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
});
