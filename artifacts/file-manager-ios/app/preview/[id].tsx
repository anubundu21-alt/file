import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { categoryMeta, formatFileSize, useFileManager } from '@/context/FileManagerContext';
import { useColors } from '@/hooks/useColors';
import { formatRelativeTime, isPdfPreview, isPreviewableImage, isTextPreview } from '@/lib/filePresentation';
import { FileGlyph } from '@/components/FileGlyph';
import { PdfPreview } from '@/components/PdfPreview';

export default function PreviewScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, shareItems, trashItems, markOpened } = useFileManager();
  const item = items.find((entry) => entry.id === id);
  const [text, setText] = useState<string | null>(null);
  const [textError, setTextError] = useState(false);

  React.useEffect(() => {
    if (!item || item.deletedAt) return;
    void markOpened(item.id);
  }, [item?.id, item?.deletedAt, markOpened]);

  React.useEffect(() => {
    let active = true;
    if (!item || !isTextPreview(item) || !item.uri) return;
    const load = async () => {
      try {
        const value = Platform.OS === 'web'
          ? await (await fetch(item.uri)).text()
          : await FileSystem.readAsStringAsync(item.uri);
        if (active) setText(value.slice(0, 20000));
      } catch {
        if (active) setTextError(true);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [item?.id, item?.uri]);

  const details = useMemo(() => {
    if (!item) return [];
    return [
      ['Type', item.kind === 'folder' ? 'Folder' : categoryMeta[item.category].label],
      ['Size', item.kind === 'folder' ? '—' : formatFileSize(item.size)],
      ['Created', formatRelativeTime(item.createdAt)],
      ['Modified', formatRelativeTime(item.modifiedAt)],
      ['Opened', item.openedAt ? formatRelativeTime(item.openedAt) : 'Not opened yet'],
    ];
  }, [item]);

  if (!item || item.deletedAt) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top + 24 }]}>
        <Text style={[styles.missing, { color: colors.foreground }]}>This file is no longer in Sift.</Text>
        <Pressable onPress={() => router.back()} style={[styles.primary, { backgroundColor: colors.navy }]}>
          <Text style={styles.primaryText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const openShare = () => void shareItems([item.id]);
  const openIn = () => {
    void Share.share({ title: item.name, message: item.name, url: item.uri || undefined });
  };
  const moveToTrash = () => {
    void trashItems([item.id]);
    router.back();
  };

  if (isPdfPreview(item)) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={[styles.pdfHeader, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
            <Feather name="chevron-left" size={22} color={colors.foreground} />
            <Text style={[styles.backLabel, { color: colors.foreground }]}>Files</Text>
          </Pressable>
          <Text style={[styles.pdfTitle, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
        </View>
        <View style={styles.pdfStage}>
          <PdfPreview uri={item.uri} />
        </View>
        <View style={[styles.pdfActions, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable onPress={openShare} style={[styles.action, { backgroundColor: colors.navy }]}>
            <Feather name="share" size={16} color="#FFFFFF" />
            <Text style={styles.actionText}>Share</Text>
          </Pressable>
          <Pressable onPress={openIn} style={[styles.action, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
            <Feather name="external-link" size={16} color={colors.foreground} />
            <Text style={[styles.actionText, { color: colors.foreground }]}>Open in…</Text>
          </Pressable>
        </View>
        <Pressable onPress={moveToTrash} style={styles.pdfDelete}>
          <Text style={[styles.deleteText, { color: colors.destructive }]}>Move to Recently Deleted</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 40 }}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
          <Feather name="chevron-left" size={22} color={colors.foreground} />
          <Text style={[styles.backLabel, { color: colors.foreground }]}>Files</Text>
        </Pressable>

        <View style={[styles.hero, { backgroundColor: colors.card }]}>
          {isPreviewableImage(item) && item.uri ? (
            <Image source={{ uri: item.uri }} style={styles.image} contentFit="contain" />
          ) : (
            <View style={styles.heroGlyph}>
              <FileGlyph item={item} size={72} />
            </View>
          )}
        </View>

        <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
        {isTextPreview(item) ? (
          <View style={[styles.textCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.textBody, { color: colors.inkSoft }]}>
              {textError ? 'This text file could not be opened.' : (text ?? 'Loading…')}
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Pressable onPress={openShare} style={[styles.action, { backgroundColor: colors.navy }]}>
            <Feather name="share" size={16} color="#FFFFFF" />
            <Text style={styles.actionText}>Share</Text>
          </Pressable>
          <Pressable onPress={openIn} style={[styles.action, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
            <Feather name="external-link" size={16} color={colors.foreground} />
            <Text style={[styles.actionText, { color: colors.foreground }]}>Open in…</Text>
          </Pressable>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          {details.map(([label, value], index) => (
            <View key={label} style={[styles.infoRow, index < details.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
            </View>
          ))}
        </View>

        <Pressable onPress={moveToTrash} style={styles.delete}>
          <Text style={[styles.deleteText, { color: colors.destructive }]}>Move to Recently Deleted</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  back: { flexDirection: 'row', alignItems: 'center' },
  backLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  pdfHeader: { paddingHorizontal: 20, paddingBottom: 10, gap: 8 },
  pdfTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: -0.4 },
  pdfStage: { flex: 1, paddingHorizontal: 16, minHeight: 0 },
  pdfActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12 },
  pdfDelete: { minHeight: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  hero: { minHeight: 220, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 18 },
  heroGlyph: { paddingVertical: 48 },
  image: { width: '100%', height: 280 },
  name: { fontFamily: 'Inter_700Bold', fontSize: 24, letterSpacing: -0.6, marginBottom: 16 },
  textCard: { borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 16, maxHeight: 280 },
  textBody: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  action: { flex: 1, minHeight: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionText: { color: '#FFFFFF', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  infoCard: { borderRadius: 18, paddingHorizontal: 16 },
  infoRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoLabel: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  infoValue: { fontFamily: 'Inter_600SemiBold', fontSize: 13, maxWidth: '58%', textAlign: 'right' },
  delete: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  deleteText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  missing: { fontFamily: 'Inter_600SemiBold', fontSize: 16, textAlign: 'center', marginBottom: 16 },
  primary: { alignSelf: 'center', minHeight: 46, paddingHorizontal: 18, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },
});
