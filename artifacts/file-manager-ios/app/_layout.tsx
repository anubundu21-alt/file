import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppSettingsProvider, useAppSettings } from '@/context/AppSettingsContext';
import { FileManagerProvider, useFileManager } from '@/context/FileManagerContext';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useColors } from '@/hooks/useColors';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const colors = useColors();
  const { resolvedScheme } = useAppSettings();
  const { pendingIncoming, confirmIncomingFile, dismissIncomingFile } = useFileManager();
  return (
    <>
      <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerBackTitle: 'Back', headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="preview/[id]" />
        <Stack.Screen name="trash" />
      </Stack>
      <ConfirmModal
        visible={Boolean(pendingIncoming)}
        title="Save to Sift?"
        message={pendingIncoming
          ? `${pendingIncoming.name} was shared from another app. Save a copy in Sift so it stays here.`
          : undefined}
        confirmLabel="Save to Sift"
        cancelLabel="Not now"
        onCancel={dismissIncomingFile}
        onConfirm={() => { void confirmIncomingFile(); }}
      />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <AppSettingsProvider>
                <FileManagerProvider>
                  <RootLayoutNav />
                </FileManagerProvider>
              </AppSettingsProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

