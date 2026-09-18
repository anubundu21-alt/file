import React from 'react';
import { Alert, Pressable, FlatList, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatFileSize, useFileManager } from '@/context/FileManagerContext';
import { useColors } from '@/hooks/useColors';
import { FileGlyph } from '@/components/FileGlyph';
import { formatRelativeTime } from '@/lib/filePresentation';

export default function TrashScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { trashedItems, restoreItems, deleteForever, emptyTrash } = useFileManager();

  const confirmEmpty = () => {
    Alert.alert('Empty Recently Deleted', 'These files will be removed from Sift for good.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Empty', style: 'destructive', onPress: () => void emptyTrash() },
    ]);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={trashedItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 40, flexGrow: 1 }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.back}>
              <Feather name="chevron-left" size={22} color={colors.foreground} />
              <Text style={[styles.backLabel, { color: colors.foreground }]}>Back</Text>
            </Pressable>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.foreground }]}>Recently Deleted</Text>
              {trashedItems.length > 0 ? (
                <Pressable onPress={confirmEmpty}>
                  <Text style={[styles.emptyAction, { color: colors.destructive }]}>Empty</Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Files stay here until you restore them or delete them forever.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.row, { backgroundColor: colors.card }]}>
            <FileGlyph item={item} size={40} />
            <View style={styles.copy}>
              <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                {item.kind === 'folder' ? 'Folder' : formatFileSize(item.size)}  ·  {item.deletedAt ? formatRelativeTime(item.deletedAt) : ''}
              </Text>
            </View>
            <Pressable onPress={() => void restoreItems([item.id])} hitSlop={10} accessibilityLabel="Restore">
              <Feather name="rotate-ccw" size={18} color={colors.accentForeground} />
            </Pressable>
            <Pressable
              onPress={() => Alert.alert('Delete forever?', item.name, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => void deleteForever([item.id]) },
              ])}
              hitSlop={10}
              accessibilityLabel="Delete forever"
            >
              <Feather name="x" size={20} color={colors.destructive} />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.accent }]}>
              <Feather name="trash-2" size={26} color={colors.accentForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nothing in Recently Deleted</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Deleted files will wait here until you restore or remove them.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { marginBottom: 18 },
  back: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  backLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.8 },
  emptyAction: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 6 },
  row: { minHeight: 72, borderRadius: 16, marginBottom: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  copy: { flex: 1 },
  name: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  meta: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
  empty: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 24, gap: 8 },
  emptyIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, textAlign: 'center' },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
