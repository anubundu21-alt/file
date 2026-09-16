import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

type IconName = React.ComponentProps<typeof Feather>['name'];
const tools: { name: string; description: string; icon: IconName; color: string; pro?: boolean }[] = [
  { name: 'Scan document', description: 'Turn paper into a clean PDF', icon: 'camera', color: '#BCEEDB' },
  { name: 'PDF toolkit', description: 'Merge, split, sign, and convert', icon: 'file-text', color: '#F9D0C5', pro: true },
  { name: 'Clean storage', description: 'Find space you can safely reclaim', icon: 'trash-2', color: '#E4DFFD', pro: true },
  { name: 'Private vault', description: 'Keep sensitive files close', icon: 'lock', color: '#CDE8FC', pro: true },
  { name: 'Create ZIP', description: 'Bundle files for easy sharing', icon: 'archive', color: '#FCE5AC' },
  { name: 'Extract text', description: 'Copy words from images and scans', icon: 'type', color: '#D1EFE8' },
];

export default function ToolsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Tools</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Small tools for big file days.</Text>
        </View>
        <View style={[styles.proPill, { backgroundColor: colors.navy }]}>
          <Feather name="zap" color={colors.teal} size={12} />
          <Text style={styles.proText}>PRO</Text>
        </View>
      </View>
      <View style={[styles.feature, { backgroundColor: colors.navy }]}>
        <View style={styles.featureCopy}>
          <Text style={styles.featureEyebrow}>MOST USED</Text>
          <Text style={styles.featureTitle}>Scan something in seconds.</Text>
          <Text style={styles.featureText}>Capture, clean up, and save a polished PDF from your camera.</Text>
          <Pressable onPress={() => Haptics.selectionAsync()} style={[styles.featureButton, { backgroundColor: colors.teal }]}>
            <Text style={[styles.featureButtonText, { color: colors.navy }]}>Start scanning</Text>
            <Feather name="arrow-up-right" color={colors.navy} size={15} />
          </Pressable>
        </View>
        <View style={styles.featureArt}>
          <Feather name="maximize" color={colors.teal} size={58} />
        </View>
      </View>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>All tools</Text>
      <View style={styles.grid}>
        {tools.map((tool) => (
          <Pressable key={tool.name} onPress={() => Haptics.selectionAsync()} style={({ pressed }) => [styles.toolCard, { backgroundColor: colors.card }, pressed && styles.pressed]}>
            <View style={styles.toolTop}>
              <View style={[styles.toolIcon, { backgroundColor: tool.color }]}>
                <Feather name={tool.icon} color={colors.navy} size={19} />
              </View>
              {tool.pro ? <Text style={[styles.toolPro, { color: colors.accentForeground, backgroundColor: colors.accent }]}>PRO</Text> : null}
            </View>
            <Text style={[styles.toolName, { color: colors.foreground }]}>{tool.name}</Text>
            <Text style={[styles.toolDescription, { color: colors.mutedForeground }]}>{tool.description}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 23 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 30, letterSpacing: -0.8 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 5 },
  proPill: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7, flexDirection: 'row', gap: 5, alignItems: 'center' },
  proText: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  feature: { borderRadius: 23, padding: 20, minHeight: 200, flexDirection: 'row', overflow: 'hidden', marginBottom: 28 },
  featureCopy: { flex: 1, zIndex: 1 },
  featureEyebrow: { color: '#9DB2A8', fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.3 },
  featureTitle: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 24, letterSpacing: -0.6, lineHeight: 29, marginTop: 9, maxWidth: 210 },
  featureText: { color: '#B6C8BE', fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginTop: 8, maxWidth: 210 },
  featureButton: { alignSelf: 'flex-start', marginTop: 16, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  featureButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  featureArt: { position: 'absolute', right: -10, bottom: 22, width: 110, height: 110, borderRadius: 55, backgroundColor: '#183B4A', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-12deg' }] },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, marginBottom: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  toolCard: { width: '48.3%', minHeight: 144, borderRadius: 18, padding: 14, justifyContent: 'space-between' },
  toolTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  toolIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toolPro: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 0.8, paddingHorizontal: 5, paddingVertical: 4, borderRadius: 5 },
  toolName: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginTop: 15 },
  toolDescription: { fontFamily: 'Inter_400Regular', fontSize: 10.5, lineHeight: 15, marginTop: 4 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});