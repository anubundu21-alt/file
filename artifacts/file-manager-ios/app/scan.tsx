import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFileManager } from '@/context/FileManagerContext';
import { useColors } from '@/hooks/useColors';
import { captureScanPage, pickScanPages, scanFileName, type ScanPage } from '@/lib/scanCapture';

export default function ScanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { importScans, isReady, isLoading } = useFileManager();
  const [pages, setPages] = useState<ScanPage[]>([]);
  const [saving, setSaving] = useState(false);

  const addPage = async () => {
    const { page, blocked } = await captureScanPage();
    if (page) {
      setPages((current) => [...current, page]);
      return;
    }
    if (blocked) {
      Alert.alert('Camera needs permission', 'You can still add scan pages from Photos.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add from Photos', onPress: () => void addFromPhotos() },
      ]);
    }
  };

  const addFromPhotos = async () => {
    const next = await pickScanPages();
    if (next.length) setPages((current) => [...current, ...next]);
  };

  const save = async () => {
    if (!pages.length || saving || !isReady || isLoading) return;
    setSaving(true);
    const takenAt = new Date();
    const count = await importScans(pages.map((page, index) => ({
      uri: page.uri,
      name: scanFileName(index, pages.length, page.uri, takenAt),
      mimeType: page.mimeType,
    })));
    setSaving(false);
    if (count > 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/files');
      return;
    }
    Alert.alert('Could not save scan', 'Sift could not copy those pages into Scans. Try again.');
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 140 }}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
          <Feather name="chevron-left" size={22} color={colors.foreground} />
          <Text style={[styles.backLabel, { color: colors.foreground }]}>Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Scan document</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Pages are saved into your Scans folder in Sift.
        </Text>

        {pages.length ? (
          <View style={styles.grid}>
            {pages.map((page, index) => (
              <View key={`${page.uri}-${index}`} style={[styles.thumb, { backgroundColor: colors.card }]}>
                <Image source={{ uri: page.uri }} style={styles.thumbImage} contentFit="cover" />
                <Pressable
                  onPress={() => setPages((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  style={[styles.remove, { backgroundColor: colors.navy }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove page ${index + 1}`}
                >
                  <Feather name="x" size={14} color="#FFFFFF" />
                </Pressable>
                <Text style={[styles.pageLabel, { color: colors.foreground }]}>Page {index + 1}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.empty, { backgroundColor: colors.card }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.accent }]}>
              <Feather name="camera" size={22} color={colors.accentForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No pages yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Take a photo or add one from Photos. Sift keeps the pages in Scans.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: colors.background }]}>
        <View style={styles.row}>
          <Pressable onPress={() => void addPage()} style={[styles.secondary, { borderColor: colors.border }]}>
            <Feather name="camera" size={16} color={colors.foreground} />
            <Text style={[styles.secondaryText, { color: colors.foreground }]}>Take page</Text>
          </Pressable>
          <Pressable onPress={() => void addFromPhotos()} style={[styles.secondary, { borderColor: colors.border }]}>
            <Feather name="image" size={16} color={colors.foreground} />
            <Text style={[styles.secondaryText, { color: colors.foreground }]}>Photos</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => void save()}
          disabled={!pages.length || saving}
          style={[styles.primary, { backgroundColor: colors.navy, opacity: !pages.length || saving ? 0.45 : 1 }]}
        >
          <Text style={styles.primaryText}>
            {saving ? 'Saving…' : pages.length ? `Save ${pages.length} ${pages.length === 1 ? 'page' : 'pages'} to Scans` : 'Save to Scans'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  back: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.8 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, marginTop: 6, marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumb: { width: '48.5%', borderRadius: 18, overflow: 'hidden' },
  thumbImage: { width: '100%', height: 168 },
  remove: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pageLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12, paddingHorizontal: 12, paddingVertical: 10 },
  empty: { borderRadius: 20, padding: 24, alignItems: 'center' },
  emptyIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, marginBottom: 6 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center', lineHeight: 18 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  secondary: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  primary: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontFamily: 'Inter_600SemiBold', fontSize: 15 },
});
