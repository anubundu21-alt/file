import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import type { LibraryItem } from '@/context/FileManagerContext';

type FolderPickerModalProps = {
  visible: boolean;
  folders: LibraryItem[];
  onClose: () => void;
  onSelect: (parentId: string | null) => void;
};

export function FolderPickerModal({ visible, folders, onClose, onSelect }: FolderPickerModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 12) + 78 }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Move to</Text>
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            <Pressable onPress={() => onSelect(null)} style={styles.row}>
              <View style={[styles.icon, { backgroundColor: `${colors.teal}22` }]}>
                <Feather name="home" size={16} color={colors.teal} />
              </View>
              <Text style={[styles.label, { color: colors.foreground }]}>Files</Text>
            </Pressable>
            {folders.map((folder) => (
              <Pressable key={folder.id} onPress={() => onSelect(folder.id)} style={styles.row}>
                <View style={[styles.icon, { backgroundColor: `${colors.sunshine}22` }]}>
                  <Feather name="folder" size={16} color={colors.sunshine} />
                </View>
                <Text style={[styles.label, { color: colors.foreground }]}>{folder.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
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
  sheet: { maxHeight: '70%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 17, marginBottom: 8 },
  list: { maxHeight: 320 },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 15, flex: 1 },
  cancel: { marginTop: 12, minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
});
