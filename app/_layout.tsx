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
  PublicSans_600SemiBold,
  PublicSans_700Bold,
} from '@expo-google-fonts/public-sans';
import {
  DefaultTheme as NavigationDefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { FontDisplay, useFonts } from 'expo-font';
import { Stack, useNavigationContainerRef } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { bindConnectivity } from '@/src/api/connectivity';
import { createQueryClient } from '@/src/api/queryClient';
import { bindNotifications, registerIfPermitted } from '@/src/store/notifications';
import { usePrompts } from '@/src/store/prompts';
import { useBackgroundUpdateCheck } from '@/src/store/updates';
import { PAPER } from '@/src/lib/title';
import { PeriodNavigator } from '@/src/ui/PeriodNavigator';
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
    // The dateline's weight, and the only place it is used. design-17 set the
    // date at 600 and nothing else in the paper is that weight; substituting
    // the 500 or the 700 already loaded would quietly restyle the one control
    // on the front page.
    PublicSans_600SemiBold: swap(PublicSans_600SemiBold),
    PublicSans_700Bold: swap(PublicSans_700Bold),
  });

  // Gesture-handler must be the outermost native view. Theme sits inside Query
  // so a themed error boundary can read both.
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <SplashGate fontsSettled={fontsLoaded || !!fontError}>
              <ThemedNavigator />
            </SplashGate>
            {/* Mounted once, opened through a store action. Three surfaces
                can open it — two datelines and the archive's switcher — and
                one overlay is what stops them drifting into three. It renders
                nothing until it is open, so the archive index behind it is not
                fetched by readers who never ask for it. */}
            <PeriodNavigator />
            {/* Above the stack, so neither path needs a router context. */}
            <Notifications client={queryClient} />
            <ThemedStatusBar />
            <DocumentTitle />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * The two notification paths, and the launch counter the end-of-feed slot
 * reads.
 *
 * Registration re-POSTs on every launch because tokens rotate on reinstall,
 * and it never asks: a reader who has not granted permission is left alone
 * until they reach the end of the feed and are offered it there.
 *
 * Nothing here blocks startup. Everything it does is either a listener or a
 * request nobody waits for.
 */
function Notifications({ client }: { client: QueryClient }) {
  const countLaunch = usePrompts((state) => state.countLaunch);
  // On the startup path and never waited on: check now, apply next launch.
  useBackgroundUpdateCheck();

  useEffect(() => {
    countLaunch();
    void registerIfPermitted();
    return bindNotifications(client);
  }, [client, countLaunch]);

  return null;
}

/**
 * Holds the splash until the fonts have settled.
 *
 * There is no cache to restore — the paper is fetched live on every screen —
 * so the only thing left to wait for is the type. The children mount
 * underneath immediately and ask their own questions; what the reader sees
 * while the splash is up is the splash.
 */
function SplashGate({ fontsSettled, children }: { fontsSettled: boolean; children: ReactNode }) {
  useEffect(() => {
    if (fontsSettled) SplashScreen.hideAsync();
  }, [fontsSettled]);

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
