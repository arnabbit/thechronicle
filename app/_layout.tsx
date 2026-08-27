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
import { Stack, useNavigationContainerRef } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createQueryClient } from '@/src/api/queryClient';
import { PAPER } from '@/src/lib/title';
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
            <DocumentTitle />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Carries the focused screen's `title` to the browser tab.
 *
 * The spec puts per-route titles on the stack screen, and that is where they
 * stay — but `Stack.Screen options={{ title }}` never reaches `document.title`
 * on its own, because expo-router constructs its navigation container with
 * `documentTitle: { enabled: false }` as a module constant (expo-router
 * `build/ExpoRoot.js`) and exposes no prop to turn it back on. React
 * Navigation's own title updater is therefore dead in every expo-router app.
 *
 * This is that updater, mounted once at the root: the same `options` event and
 * the same `getCurrentOptions()` read, with the paper as the fallback rather
 * than the route's file name. One place, so no screen carries a workaround and
 * no screen can forget — which is how backing out of an article used to leave
 * the article's headline sitting in the tab of the front page.
 *
 * Not a platform branch: it asks whether there is a document, which on native
 * there is not, and then does nothing.
 */
function DocumentTitle() {
  const navigation = useNavigationContainerRef();

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Screens set the whole title through `routeTitle`, so it is used as
    // given. Only the fallback is decided here: a route that names nothing is
    // the paper.
    const apply = (title?: string) => {
      document.title = title?.trim() ? title : PAPER;
    };

    // React Navigation types screen options as an opaque `object` at the
    // container level, because each navigator declares its own. `title` is the
    // one field every navigator's options share.
    const titleOf = (options: object | undefined) =>
      (options as { title?: string } | undefined)?.title;

    apply(titleOf(navigation.getCurrentOptions()));
    return navigation.addListener('options', (event) => apply(titleOf(event.data.options)));
  }, [navigation]);

  return null;
}

function ThemedStatusBar() {
  const { name } = useTheme();
  return <StatusBar style={name === 'dark' ? 'light' : 'dark'} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
