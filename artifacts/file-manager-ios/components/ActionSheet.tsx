import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export type SheetOption = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

type ActionSheetProps = {
  visible: boolean;
  title: string;
  message?: string;
  options: SheetOption[];
  onClose: () => void;
};

export function ActionSheet({ visible, title, message, options, onClose }: ActionSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 12) + 78 }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          {message ? <Text style={[styles.message, { color: colors.mutedForeground }]}>{message}</Text> : null}
          {options.map((option) => (
            <Pressable
              key={option.label}
              onPress={() => {
                option.onPress();
                onClose();
              }}
              style={({ pressed }) => [styles.row, { borderBottomColor: colors.border }, pressed && styles.pressed]}
            >
              <Text style={[styles.rowLabel, { color: option.destructive ? colors.destructive : colors.foreground }]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
          <Pressable onPress={onClose} style={[styles.cancel, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.cancelText, { color: colors.foreground }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(16,36,61,0.38)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 17, letterSpacing: -0.2 },
  message: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 6, marginBottom: 8 },
  row: { minHeight: 52, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  rowLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  cancel: { marginTop: 12, minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  pressed: { opacity: 0.7 },
});
