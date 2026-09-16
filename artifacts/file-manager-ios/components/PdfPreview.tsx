import React, { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { useColors } from '@/hooks/useColors';

export function PdfPreview({ uri }: { uri: string }) {
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  if (!uri) {
    return (
      <View style={[styles.fallback, { backgroundColor: colors.card }]}>
        <Text style={[styles.fallbackText, { color: colors.mutedForeground }]}>This PDF has no file to open.</Text>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.frame, { backgroundColor: colors.card }]}>
        {React.createElement('iframe', {
          src: uri,
          title: 'PDF preview',
          style: {
            width: '100%',
            height: '100%',
            border: 'none',
            backgroundColor: '#FFFFFF',
          },
        })}
      </View>
    );
  }

  if (failed) {
    return (
      <View style={[styles.fallback, { backgroundColor: colors.card }]}>
        <Text style={[styles.fallbackText, { color: colors.mutedForeground }]}>
          Sift could not draw this PDF here. Use Open in… to view it.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.frame, { backgroundColor: colors.card }]}>
      <WebView
        source={{ uri }}
        originWhitelist={['*', 'file://*', 'https://*', 'http://*']}
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        allowingReadAccessToURL={FileSystem.documentDirectory ?? undefined}
        startInLoadingState
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setFailed(true);
        }}
        style={styles.webview}
      />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, minHeight: 420, borderRadius: 20, overflow: 'hidden' },
  webview: { flex: 1, backgroundColor: '#FFFFFF' },
  loading: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  fallback: { flex: 1, minHeight: 220, borderRadius: 20, alignItems: 'center', justifyContent: 'center', padding: 24 },
  fallbackText: { fontFamily: 'Inter_500Medium', fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
