'use client';

import { startCompetitionForegroundRetry } from '@/services/competitionApi';
import { startPrivacyStartup } from '@/services/privacy/privacyStartup';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const APP_SPLASH_PREVIEW_MS = 1_400;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const [showAppSplash, setShowAppSplash] = useState(true);
  useEffect(() => startPrivacyStartup(), []);
  useEffect(() => startCompetitionForegroundRetry(() => {
    void queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
  }), []);

  useEffect(() => {
    void SplashScreen.hideAsync();
    const timeout = setTimeout(() => setShowAppSplash(false), APP_SPLASH_PREVIEW_MS);
    return () => clearTimeout(timeout);
  }, []);

  if (showAppSplash) {
    return (
      <View style={styles.splash}>
        <Image
          source={require('../../assets/images/flapfit-splash-logo.png')}
          style={styles.splashLogo}
          contentFit="contain"
          transition={0}
        />
      </View>
    );
  }

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={styles.root}>
          <Stack screenOptions={{ headerShown: false }} />
        </GestureHandlerRootView>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

const styles = {
  root: { flex: 1 },
  splash: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#0F172A',
  },
  splashLogo: {
    width: '92%' as const,
    maxWidth: 420,
    aspectRatio: 1.5,
  },
};
