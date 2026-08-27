import {
  Newsreader_400Regular,
  Newsreader_400Regular_Italic,
  Newsreader_700Bold,
  Newsreader_700Bold_Italic,
} from '@expo-google-fonts/newsreader';
import {
  PublicSans_300Light,
  PublicSans_400Regular,
  PublicSans_500Medium,
  PublicSans_700Bold,
} from '@expo-google-fonts/public-sans';
import { QueryClientProvider } from '@tanstack/react-query';
import { FontDisplay, useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createQueryClient } from '@/src/api/queryClient';
import { ThemeProvider } from '@/src/theme/ThemeProvider';
import { useTheme } from '@/src/theme/useTheme';

SplashScreen.preventAutoHideAsync();

// `FontDisplay.SWAP`: fallback text renders immediately while the real face
// loads. The layout used to `return null` until fonts were ready, which on web
// shipped an empty document on every cold load.
const swap = (uri: number) => ({ uri, display: FontDisplay.SWAP });

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  const [fontsLoaded, fontError] = useFonts({
    Newsreader_400Regular: swap(Newsreader_400Regular),
    Newsreader_700Bold: swap(Newsreader_700Bold),
    Newsreader_400Regular_Italic: swap(Newsreader_400Regular_Italic),
    Newsreader_700Bold_Italic: swap(Newsreader_700Bold_Italic),
    PublicSans_300Light: swap(PublicSans_300Light),
    PublicSans_400Regular: swap(PublicSans_400Regular),
    PublicSans_500Medium: swap(PublicSans_500Medium),
    PublicSans_700Bold: swap(PublicSans_700Bold),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  // Gesture-handler must be the outermost native view. Theme sits inside Query
  // so a themed error boundary can read both.
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <Stack screenOptions={{ headerShown: false }} />
            <ThemedStatusBar />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ThemedStatusBar() {
  const { name } = useTheme();
  return <StatusBar style={name === 'dark' ? 'light' : 'dark'} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
