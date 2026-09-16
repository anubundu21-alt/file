import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

type IconName = React.ComponentProps<typeof Feather>['name'];

const tools: { name: string; description: string; icon: IconName; color: string; ready?: boolean; later?: boolean }[] = [
  { name: 'Browse files', description: 'Search, folders, and file actions', icon: 'folder', color: '#CDE8FC', ready: true },
  { name: 'Recently deleted', description: 'Restore or remove files for good', icon: 'trash-2', color: '#E4DFFD', ready: true },
  { name: 'Create ZIP', description: 'Coming later — not in this version', icon: 'archive', color: '#FCE5AC', later: true },
  { name: 'Private vault', description: 'Coming later — not in this version', icon: 'lock', color: '#D1EFE8', later: true },
];

export default function ToolsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const openTool = (tool: typeof tools[number]) => {
    Haptics.selectionAsync();
    if (tool.name === 'Browse files') {
      router.push('/(tabs)/files');
      return;
    }
    if (tool.name === 'Recently deleted') {
      router.push('/trash');
      return;
    }
    Alert.alert(tool.name, 'This tool is not in this version.');
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Tools</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>File tools first. Scanner and PDF stay in other apps.</Text>
        </View>
      </View>
      <View style={[styles.feature, { backgroundColor: colors.navy }]}>
        <View style={styles.featureCopy}>
          <Text style={styles.featureEyebrow}>READY NOW</Text>
          <Text style={styles.featureTitle}>Organize files without the extra tools.</Text>
          <Text style={styles.featureText}>Preview, share, save to Files, rename, folders, and Recently Deleted are live.</Text>
          <Pressable onPress={() => openTool(tools[0])} style={[styles.featureButton, { backgroundColor: colors.teal }]}>
            <Text style={[styles.featureButtonText, { color: colors.navy }]}>Open Files</Text>
            <Feather name="arrow-up-right" color={colors.navy} size={15} />
          </Pressable>
        </View>
      </View>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>All tools</Text>
      <View style={styles.grid}>
        {tools.map((tool) => (
          <Pressable key={tool.name} onPress={() => openTool(tool)} style={({ pressed }) => [styles.toolCard, { backgroundColor: colors.card }, pressed && styles.pressed]}>
            <View style={styles.toolTop}>
              <View style={[styles.toolIcon, { backgroundColor: tool.color }]}>
                <Feather name={tool.icon} color={colors.navy} size={19} />
              </View>
              {tool.later ? <Text style={[styles.toolPro, { color: colors.mutedForeground, backgroundColor: colors.secondary }]}>LATER</Text> : null}
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
  feature: { borderRadius: 23, padding: 20, minHeight: 200, marginBottom: 28 },
  featureCopy: { flex: 1 },
  featureEyebrow: { color: '#9DB2A8', fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.3 },
  featureTitle: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 24, letterSpacing: -0.6, lineHeight: 29, marginTop: 9, maxWidth: 280 },
  featureText: { color: '#B6C8BE', fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginTop: 8, maxWidth: 280 },
  featureButton: { alignSelf: 'flex-start', marginTop: 16, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  featureButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
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
