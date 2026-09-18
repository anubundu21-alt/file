import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { categoryMeta, type LibraryItem } from '@/context/FileManagerContext';
import { categoryIcons, isPreviewableImage } from '@/lib/filePresentation';

export function FileGlyph({ item, size = 42 }: { item: LibraryItem; size?: number }) {
  const meta = item.kind === 'folder'
    ? { color: '#F5C75D', icon: 'folder' as const }
    : { color: categoryMeta[item.category].color, icon: categoryIcons[item.category] };
  const radius = Math.max(12, Math.round(size * 0.31));

  if (isPreviewableImage(item) && item.uri) {
    return (
      <Image
        source={{ uri: item.uri }}
        style={{ width: size, height: size, borderRadius: radius, backgroundColor: `${meta.color}22` }}
        contentFit="cover"
      />
    );
  }

  return (
    <View style={[styles.icon, { width: size, height: size, borderRadius: radius, backgroundColor: `${meta.color}22` }]}>
      <Feather name={meta.icon} color={meta.color} size={Math.round(size * 0.48)} />
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { alignItems: 'center', justifyContent: 'center' },
});
