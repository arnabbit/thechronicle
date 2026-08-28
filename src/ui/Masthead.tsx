import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { hasSearch } from '@/src/backendSurfaces';
import { Dateline } from '@/src/ui/Dateline';
import { useTheme } from '@/src/theme/useTheme';
import { type } from '@/src/theme/type';

// The paper's own furniture: a utility row, the masthead, the dateline beneath
// it, and one rule closing the whole thing.
//
// **This is design-17's masthead as drawn**, which the app had drifted from in
// four ways at once — a grey hairline above the wordmark that no board ever
// drew, a full-width heavy rule between the wordmark and the date that no board
// drew either, the date's own underline missing, and Search and Saved flanking
// the wordmark. The first two arrived with ticket 19, which reshaped the
// masthead to match the launcher mark's three bars rather than the other way
// round. See docs/adr/0002.
//
// The affordances are a **utility row**, per design-17's web board and now at
// every width. Flanking the wordmark is not available on a phone and never was:
// `THE CHRONICLE` measures 264px at 30px, a 320px screen leaves 272px between
// the insets, and the two words need another 111. The old absolute positioning
// hid that by letting them overlap the wordmark — by 50px at 320, still 15px at
// 390. A row of its own is the only arrangement whose width does not depend on
// the wordmark's, so it needs no breakpoint and no type scaling.
export function Masthead({
  edition,
  onPressDateline,
  showSearch = true,
  showSaved = true,
  navFollows = false,
}: {
  edition?: string;
  onPressDateline?: () => void;
  /** The search screen renders the masthead too, and an affordance pointing at
   *  the screen you are already on is furniture pretending to be a control. */
  showSearch?: boolean;
  /** Same rule, for the saved screen's own masthead. */
  showSaved?: boolean;
  /** Whether `CategoryNav` follows. The ink rule closes the *header*, and the
   *  header is the masthead plus the categories — so when the nav is there, the
   *  nav carries the rule and this block draws none. Both design-17 boards nest
   *  the category row inside the same ruled block as the wordmark; two of the
   *  eight screens that render a masthead do that, and the other six close
   *  here. */
  navFollows?: boolean;
}) {
  const { colors } = useTheme();
  // Search is gated on the endpoint existing; Saved never will be — it is
  // device state, not a backend surface.
  const search = hasSearch && showSearch;
  const saved = showSaved;

  return (
    <View style={{ backgroundColor: colors.background }}>
      {/* Collapses entirely when there is nothing to put in it, rather than
          leaving a ruled band over an empty row. */}
      {search || saved ? (
        <View style={[styles.utility, { borderBottomColor: colors.ruleHair }]}>
          {search ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Search the archive"
              onPress={() => router.push('/search')}
              style={styles.utilityItem}
            >
              <Text style={[type.utility, { color: colors.secondary }]}>Search</Text>
            </Pressable>
          ) : null}
          {saved ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Saved articles"
              onPress={() => router.push('/saved')}
              style={styles.utilityItem}
            >
              <Text style={[type.utility, { color: colors.secondary }]}>Saved</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View
        style={[
          styles.block,
          !navFollows && { borderBottomWidth: 1, borderBottomColor: colors.ruleStrong },
        ]}
      >
        <Text style={[type.masthead, styles.masthead, { color: colors.primary }]}>
          The Chronicle
        </Text>
        {edition ? <Dateline edition={edition} onPress={onPressDateline} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  utility: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 28,
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
  },
  // The tap target, not the label: 44pt of height around an 11px word.
  utilityItem: {
    paddingVertical: 8,
    marginVertical: -8,
    justifyContent: 'center',
  },
  // No rule of its own. The date's underline is the width of the date, and the
  // header's closing rule belongs under whatever ends the header — see
  // `navFollows`.
  block: {
    paddingTop: 22,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  masthead: {
    textAlign: 'center',
    lineHeight: 30,
  },
});
