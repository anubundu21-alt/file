import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useColors } from '@/hooks/useColors';

export function VideoPreview({ uri }: { uri: string }) {
  const colors = useColors();
  const player = useVideoPlayer(uri, (next) => {
    next.loop = false;
  });

  if (!uri) {
    return (
      <View style={[styles.fallback, { backgroundColor: colors.card }]}>
        <Text style={[styles.fallbackText, { color: colors.mutedForeground }]}>This video has no file to play.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.frame, { backgroundColor: colors.navy }]}>
      <VideoView player={player} style={styles.video} nativeControls contentFit="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, minHeight: 220, borderRadius: 20, overflow: 'hidden' },
  video: { flex: 1, width: '100%' },
  fallback: { flex: 1, minHeight: 220, borderRadius: 20, alignItems: 'center', justifyContent: 'center', padding: 24 },
  fallbackText: { fontFamily: 'Inter_500Medium', fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
