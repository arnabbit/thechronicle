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
import {
  DefaultTheme as NavigationDefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { useIsRestoring } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { FontDisplay, useFonts } from 'expo-font';
import { Stack, useNavigationContainerRef } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { bindConnectivity } from '@/src/api/connectivity';
import { createQueryClient, persistOptions } from '@/src/api/queryClient';
import { seedLatestFromCache } from '@/src/api/queries';
import { PAPER } from '@/src/lib/title';
import { ThemeProvider } from '@/src/theme/ThemeProvider';
import { useTheme } from '@/src/theme/useTheme';

SplashScreen.preventAutoHideAsync();

// At boot, before any screen mounts: the app has to know whether it has a
// connection before the first query decides what to do about it.
bindConnectivity();

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

  // Gesture-handler must be the outermost native view. Theme sits inside Query
  // so a themed error boundary can read both.
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        {/* `onSuccess` fires once the cache has been read back off the disk,
            which is the only moment the sentinel can be seeded from what
            survived — before the first screen asks for it. */}
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={persistOptions}
          onSuccess={() => seedLatestFromCache(queryClient)}
        >
          <ThemeProvider>
            <RestoreGate fontsSettled={fontsLoaded || !!fontError}>
              <ThemedNavigator />
            </RestoreGate>
            <ThemedStatusBar />
            <DocumentTitle />
          </ThemeProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Holds the stack back until the persisted cache has been read.
 *
 * A screen mounted against an empty cache asks its questions, renders the
 * loading skeleton, and is then overwritten a frame later by the cached copy
 * that was on disk the whole time. That flash is what this prevents — the
 * screens are correct either way, so the fix belongs once at the root and not
 * five times over.
 *
 * What it renders in the meantime is the paper's own ground and nothing else.
 * Not the skeleton: the skeleton means *loading*, and restoring is not loading
 * — showing it would be the flash, dressed up. Not `null` either: an uncovered
 * root is how `rgb(242, 242, 242)` got on screen twice in this project
 * already. This is the third surface with the same job as the pre-JS web shell
 * and `ThemedNavigator` below, and it answers it the same way — whatever
 * paints before the paper is ready paints the paper's ground.
 *
 * The splash is held for both conditions, so on Android the handover is splash
 * straight to content with no intermediate surface at all.
 */
function RestoreGate({ fontsSettled, children }: { fontsSettled: boolean; children: ReactNode }) {
  const { colors } = useTheme();
  const restoring = useIsRestoring();

  useEffect(() => {
    if (fontsSettled && !restoring) SplashScreen.hideAsync();
  }, [fontsSettled, restoring]);

  if (restoring) {
    return <View style={[styles.root, { backgroundColor: colors.background }]} />;
  }
  return <>{children}</>;
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

/**
 * The stack, told which paper it is printing on.
 *
 * The navigator keeps a theme of its own, and expo-router hands its navigation
 * container no `theme` prop, so it falls back to React Navigation's
 * `DefaultTheme` — whose `background` is `rgb(242, 242, 242)` in both palettes.
 * That grey is painted on the scene container beneath every screen. In light it
 * is merely the wrong off-white and in dark it is a light ground under a dark
 * app, visible wherever a screen does not cover it: during a stack transition,
 * behind an overscroll, and for the frame before the first screen paints. It is
 * the post-JS twin of the white flash the pre-JS shell now fixes, and it comes
 * from the same cause — a surface painted by something that was never told
 * which palette is active.
 *
 * Only `background` is overridden. The rest of React Navigation's theme dresses
 * furniture this app does not render — headers are off, the masthead is the
 * header — so restating it would be inventing values ticket 12 never approved.
 */
function ThemedNavigator() {
  const { colors } = useTheme();
  const theme = useMemo(
    () => ({
      ...NavigationDefaultTheme,
      colors: { ...NavigationDefaultTheme.colors, background: colors.background },
    }),
    [colors.background],
  );

  return (
    <NavigationThemeProvider value={theme}>
      <Stack screenOptions={{ headerShown: false }} />
    </NavigationThemeProvider>
  );
}

function ThemedStatusBar() {
  const { name } = useTheme();
  return <StatusBar style={name === 'dark' ? 'light' : 'dark'} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
