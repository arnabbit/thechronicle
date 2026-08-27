import { router, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { routeTitle } from '@/src/lib/title';
import { Masthead } from '@/src/ui/Masthead';
import { Notice } from '@/src/ui/ScreenState';
import { useTheme } from '@/src/theme/useTheme';

// For URLs that match no route at all, and only those.
//
// It is emphatically *not* where an API 404 lands. An unknown, withdrawn or
// hidden article id matches `/article/[id]` perfectly well — the route exists,
// the record does not — so it keeps its own URL and renders `missing` in place.
// That rule is settled (spec: a 404 from the API renders in-screen and never
// routes away), and this route must not be reached from it: routing away would
// destroy the URL someone shared and make the back button lie.
//
// On the web this is also what the host redirect rule hands unmatched paths to.
// `public/_redirects` sends every path to the app shell, so a mistyped URL is
// no longer a host 404 with nothing to say — it reaches the router, matches
// nothing, and gets explained here.
//
// Copy note: ticket 18's approved table has no line for this state. These words
// are placeholders written to be true, not approved copy.
const TITLE = routeTitle('No such page');

export default function NotFound() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen options={{ title: TITLE }} />
      {/* No dateline: this is not an edition. */}
      <Masthead />
      <Notice
        slug="No such page"
        line="There is no page at this address. The link may be mistyped, or it may point somewhere the paper never published."
        actionLabel="Today's paper"
        // `replace`, not back: a reader who arrived here from a bad link has no
        // history worth returning to, and one who typed it has the page they
        // came from still behind them.
        onAction={() => router.replace('/')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
