import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

type SelectionBarProps = {
  count: number;
  onShare: () => void;
  onMove: () => void;
  onFavorite: () => void;
  onTrash: () => void;
};

export function SelectionBar({ count, onShare, onMove, onFavorite, onTrash }: SelectionBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const actions = [
    { label: 'Share', icon: 'share' as const, onPress: onShare },
    { label: 'Move', icon: 'folder' as const, onPress: onMove },
    { label: 'Favorite', icon: 'star' as const, onPress: onFavorite },
    { label: 'Delete', icon: 'trash-2' as const, onPress: onTrash },
  ];

  return (
    <View style={[styles.bar, { backgroundColor: colors.navy, paddingBottom: Math.max(insets.bottom, 12) }]}>
      <Text style={styles.count}>{count} selected</Text>
      <View style={styles.actions}>
        {actions.map((action) => (
          <Pressable key={action.label} onPress={action.onPress} style={styles.action} accessibilityRole="button" accessibilityLabel={action.label}>
            <Feather name={action.icon} size={16} color="#FFFFFF" />
            <Text style={styles.actionLabel}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 16, right: 16, bottom: 92, borderRadius: 20, paddingTop: 12, paddingHorizontal: 16, shadowColor: '#10243D', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  count: { color: '#9DB2A8', fontFamily: 'Inter_500Medium', fontSize: 12, marginBottom: 10 },
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
  action: { alignItems: 'center', gap: 6, minWidth: 62 },
  actionLabel: { color: '#FFFFFF', fontFamily: 'Inter_600SemiBold', fontSize: 11 },
});
