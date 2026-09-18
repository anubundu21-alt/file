import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useFileManager } from '@/context/FileManagerContext';
import { AppearancePreference, useAppSettings } from '@/context/AppSettingsContext';

const appearanceOptions: { label: string; value: AppearancePreference; detail: string }[] = [
  { label: 'System', value: 'system', detail: 'Match iPhone settings' },
  { label: 'Light', value: 'light', detail: 'Always use light mode' },
  { label: 'Dark', value: 'dark', detail: 'Always use dark mode' },
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { trashedItems } = useFileManager();
  const { appearance, setAppearance, notificationsEnabled, setNotificationsEnabled } = useAppSettings();

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

      <View style={styles.group}>
        <Text style={[styles.groupTitle, { color: colors.mutedForeground }]}>File management</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Pressable style={styles.row} onPress={() => router.push('/trash')}>
            <View style={[styles.itemIcon, { backgroundColor: '#F28A7222' }]}><Feather name="trash-2" color="#F28A72" size={17} /></View>
            <View style={styles.itemCopy}>
              <Text style={[styles.itemLabel, { color: colors.foreground }]}>Recently Deleted</Text>
              <Text style={[styles.itemDetail, { color: colors.mutedForeground }]}>
                {trashedItems.length} {trashedItems.length === 1 ? 'item' : 'items'}
              </Text>
            </View>
            <Feather name="chevron-right" color={colors.mutedForeground} size={18} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable style={styles.row} onPress={() => router.push('/(tabs)/files')}>
            <View style={[styles.itemIcon, { backgroundColor: '#77B7F222' }]}><Feather name="grid" color="#77B7F2" size={17} /></View>
            <View style={styles.itemCopy}>
              <Text style={[styles.itemLabel, { color: colors.foreground }]}>Default view</Text>
              <Text style={[styles.itemDetail, { color: colors.mutedForeground }]}>Grid or list, saved on Files</Text>
            </View>
            <Feather name="chevron-right" color={colors.mutedForeground} size={18} />
          </Pressable>
        </View>
      </View>

      <View style={styles.group}>
        <Text style={[styles.groupTitle, { color: colors.mutedForeground }]}>Appearance</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {appearanceOptions.map((option, index) => (
            <React.Fragment key={option.value}>
              <Pressable style={styles.row} onPress={() => setAppearance(option.value)}>
                <View style={[styles.itemIcon, { backgroundColor: '#F5C75D22' }]}><Feather name="sun" color="#F5C75D" size={17} /></View>
                <View style={styles.itemCopy}>
                  <Text style={[styles.itemLabel, { color: colors.foreground }]}>{option.label}</Text>
                  <Text style={[styles.itemDetail, { color: colors.mutedForeground }]}>{option.detail}</Text>
                </View>
                {appearance === option.value ? <Feather name="check" color={colors.teal} size={18} /> : null}
              </Pressable>
              {index < appearanceOptions.length - 1 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
            </React.Fragment>
          ))}
        </View>
      </View>

      <View style={styles.group}>
        <Text style={[styles.groupTitle, { color: colors.mutedForeground }]}>Preferences</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.row}>
            <View style={[styles.itemIcon, { backgroundColor: '#F28A7222' }]}><Feather name="bell" color="#F28A72" size={17} /></View>
            <View style={styles.itemCopy}>
              <Text style={[styles.itemLabel, { color: colors.foreground }]}>Notifications</Text>
              <Text style={[styles.itemDetail, { color: colors.mutedForeground }]}>
                {notificationsEnabled ? 'On' : 'Off'}
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: colors.secondary, true: colors.teal }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </View>

      <View style={styles.group}>
        <Text style={[styles.groupTitle, { color: colors.mutedForeground }]}>Coming later</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.row}>
            <View style={[styles.itemIcon, { backgroundColor: '#9B8AFB22' }]}><Feather name="lock" color="#9B8AFB" size={17} /></View>
            <View style={styles.itemCopy}>
              <Text style={[styles.itemLabel, { color: colors.foreground }]}>Private vault</Text>
              <Text style={[styles.itemDetail, { color: colors.mutedForeground }]}>Face ID lock for private files</Text>
            </View>
          </View>
        </View>
      </View>

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
