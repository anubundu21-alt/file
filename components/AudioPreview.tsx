import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useColors } from '@/hooks/useColors';

function formatClock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function AudioPreview({ uri }: { uri: string }) {
  const colors = useColors();
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);
  const duration = status.duration ?? 0;
  const current = status.currentTime ?? 0;
  const progress = duration > 0 ? Math.min(1, current / duration) : 0;

  if (!uri) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.missing, { color: colors.mutedForeground }]}>This audio file has nothing to play.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <Pressable
        onPress={() => (status.playing ? player.pause() : player.play())}
        style={[styles.play, { backgroundColor: colors.navy }]}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Pause' : 'Play'}
      >
        <Feather name={status.playing ? 'pause' : 'play'} size={22} color="#FFFFFF" />
      </Pressable>
      <View style={styles.copy}>
        <View style={[styles.track, { backgroundColor: colors.secondary }]}>
          <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: colors.teal }]} />
        </View>
        <Text style={[styles.time, { color: colors.mutedForeground }]}>
          {formatClock(current)} / {formatClock(duration)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  play: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 8 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  time: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  missing: { fontFamily: 'Inter_500Medium', fontSize: 14, textAlign: 'center' },
});
