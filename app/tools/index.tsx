import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { tools, type Tool } from '@/lib/toolCatalog';

const GLYPHS: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  'pdf-word': 'file-text',
  'word-pdf': 'file',
  'img-pdf': 'image',
  compress: 'minimize-2',
  merge: 'layers',
  jpg: 'camera',
  split: 'scissors',
  pages: 'hash',
  watermark: 'droplet',
  rotate: 'rotate-cw',
  unlock: 'unlock',
  sign: 'edit-3',
  extract: 'type',
};

export default function AllToolsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const open = (tool: Tool) => {
    Haptics.selectionAsync();
    router.push({ pathname: '/tools/[id]', params: { id: tool.id } });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.foreground }]}>All tools</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            PDF, text, sign, convert and more
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {tools.map((tool) => (
            <Pressable
              key={tool.id}
              onPress={() => open(tool)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: tool.wash,
                  borderColor: `${tool.ink}24`,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={tool.title}
            >
              <View style={[styles.glyph, { backgroundColor: `${tool.ink}1F` }]}>
                <Feather name={GLYPHS[tool.id] ?? 'file'} size={20} color={tool.ink} />
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {tool.title}
              </Text>
              {!tool.onDevice ? (
                <View style={[styles.badge, { backgroundColor: `${tool.ink}1A` }]}>
                  <Text style={[styles.badgeText, { color: tool.ink }]}>Needs engine</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  back: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
  subtitle: { fontSize: 13, marginTop: 1, fontFamily: 'Inter_400Regular' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    paddingTop: 6,
  },
  card: {
    width: '30.6%',
    aspectRatio: 0.88,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 14,
    paddingBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  glyph: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
    textAlign: 'center',
    color: '#101D41',
    fontFamily: 'Inter_700Bold',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 8, fontWeight: '700', fontFamily: 'Inter_700Bold' },
});
