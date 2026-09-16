import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Save',
  cancelLabel = 'Not now',
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  const colors = useColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={onCancel} />
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          {message ? <Text style={[styles.message, { color: colors.mutedForeground }]}>{message}</Text> : null}
          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={[styles.button, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.buttonText, { color: colors.foreground }]}>{cancelLabel}</Text>
            </Pressable>
            <Pressable onPress={onConfirm} style={[styles.button, { backgroundColor: colors.navy }]}>
              <Text style={[styles.buttonText, { color: colors.white }]}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', padding: 28 },
  backdrop: { backgroundColor: 'rgba(16,36,61,0.38)' },
  card: { borderRadius: 22, padding: 20, zIndex: 1 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: -0.3 },
  message: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, marginTop: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  button: { flex: 1, minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
});
