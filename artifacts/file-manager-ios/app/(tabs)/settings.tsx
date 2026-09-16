import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useFileManager } from '@/context/FileManagerContext';

type IconName = React.ComponentProps<typeof Feather>['name'];
const settingsGroups: { title: string; items: { label: string; detail?: string; icon: IconName; color: string; toggle?: boolean; route?: string }[] }[] = [
  { title: 'File management', items: [
    { label: 'Recently Deleted', detail: 'Restore or remove forever', icon: 'trash-2', color: '#F28A72', route: '/trash' },
    { label: 'Default view', detail: 'Grid or list, saved on Files', icon: 'grid', color: '#77B7F2', route: '/(tabs)/files' },
  ] },
  { title: 'Preferences', items: [
    { label: 'Appearance', detail: 'Follows iPhone settings', icon: 'sun', color: '#F5C75D' },
    { label: 'Notifications', detail: 'On', icon: 'bell', color: '#F28A72', toggle: true },
  ] },
  { title: 'Coming later', items: [
    { label: 'Private vault', detail: 'Face ID lock for private files', icon: 'lock', color: '#9B8AFB' },
  ] },
  { title: 'About Sift', items: [
    { label: 'Help & support', icon: 'help-circle', color: '#77B7F2' },
  ] },
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { trashedItems } = useFileManager();
  const [notifications, setNotifications] = useState(true);
  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Make Sift feel like yours.</Text>
      <Pressable style={[styles.upgrade, { backgroundColor: colors.navy }]}>
        <View style={[styles.upgradeIcon, { backgroundColor: colors.teal }]}><Feather name="zap" color={colors.navy} size={18} /></View>
        <View style={styles.upgradeCopy}>
          <Text style={styles.upgradeTitle}>Unlock Sift Pro</Text>
          <Text style={styles.upgradeText}>More tools. More room. Less friction.</Text>
        </View>
        <Feather name="chevron-right" color="#FFFFFF" size={19} />
      </Pressable>
      {settingsGroups.map((group) => (
        <View key={group.title} style={styles.group}>
          <Text style={[styles.groupTitle, { color: colors.mutedForeground }]}>{group.title}</Text>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            {group.items.map((item, index) => {
              const detail = item.label === 'Recently Deleted'
                ? `${trashedItems.length} ${trashedItems.length === 1 ? 'item' : 'items'}`
                : item.detail;
              return (
                <React.Fragment key={item.label}>
                  <Pressable
                    style={styles.row}
                    onPress={() => {
                      if (item.route === '/trash') router.push('/trash');
                      if (item.route === '/(tabs)/files') router.push('/(tabs)/files');
                    }}
                  >
                    <View style={[styles.itemIcon, { backgroundColor: `${item.color}22` }]}><Feather name={item.icon} color={item.color} size={17} /></View>
                    <View style={styles.itemCopy}>
                      <Text style={[styles.itemLabel, { color: colors.foreground }]}>{item.label}</Text>
                      {detail ? <Text style={[styles.itemDetail, { color: colors.mutedForeground }]}>{detail}</Text> : null}
                    </View>
                    {item.toggle ? <Switch value={notifications} onValueChange={setNotifications} trackColor={{ false: colors.secondary, true: colors.teal }} thumbColor="#FFFFFF" /> : <Feather name="chevron-right" color={colors.mutedForeground} size={18} />}
                  </Pressable>
                  {index < group.items.length - 1 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
                </React.Fragment>
              );
            })}
          </View>
        </View>
      ))}
      <Text style={[styles.version, { color: colors.mutedForeground }]}>Sift 1.0.0  ·  Made for your files</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 30, letterSpacing: -0.8 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 5, marginBottom: 23 },
  upgrade: { minHeight: 78, borderRadius: 20, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 29 },
  upgradeIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  upgradeCopy: { flex: 1, gap: 4 },
  upgradeTitle: { color: '#FFFFFF', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  upgradeText: { color: '#B6C8BE', fontFamily: 'Inter_400Regular', fontSize: 11 },
  group: { marginBottom: 22 },
  groupTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 9 },
  card: { borderRadius: 19, paddingHorizontal: 14 },
  row: { minHeight: 65, flexDirection: 'row', alignItems: 'center', gap: 11 },
  itemIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  itemCopy: { flex: 1, gap: 3 },
  itemLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  itemDetail: { fontFamily: 'Inter_400Regular', fontSize: 10.5 },
  divider: { height: 1, marginLeft: 47 },
  version: { textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2, marginBottom: 16 },
});