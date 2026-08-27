import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { hasSearch } from '@/src/backendSurfaces';
import { Dateline } from '@/src/ui/Dateline';
import { useTheme } from '@/src/theme/useTheme';
import { type } from '@/src/theme/type';

// The app's own furniture, and — per ticket 19 — its identity: a hairline
// above the masthead, a heavy rule beneath it, the dateline under that.
//
// Ticket 11 put search and saved here as two quiet affordances flanking the
// masthead. Search is built; it renders only when `hasSearch` says the endpoint
// is there, because a control that goes nowhere is worse than no control.
// Flipping that one constant is the whole change — no screen work. `/saved`
// still has no route, so its side of the masthead stays empty.
export function Masthead({
  edition,
  onPressDateline,
  showSearch = true,
}: {
  edition?: string;
  onPressDateline?: () => void;
  /** The search screen renders the masthead too, and an affordance pointing at
   *  the screen you are already on is furniture pretending to be a control. */
  showSearch?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.hairline, { borderTopColor: colors.ruleHair }]} />
      <Text style={[type.masthead, styles.masthead, { color: colors.primary }]}>
        The Chronicle
      </Text>
      {/* Absolutely positioned, so the masthead is centred on the page and not
          on whatever is left of it — and so the flag being off changes the
          layout not at all. */}
      {hasSearch && showSearch ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Search the archive"
          onPress={() => router.push('/search')}
          style={styles.affordance}
        >
          <Text style={[type.meta, { color: colors.secondary }]}>Search</Text>
        </Pressable>
      ) : null}
      <View style={[styles.rule, { borderTopColor: colors.ruleStrong }]} />
      {edition ? <Dateline edition={edition} onPress={onPressDateline} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
  },
  hairline: {
    borderTopWidth: 1,
    marginHorizontal: 24,
  },
  masthead: {
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 10,
  },
  affordance: {
    position: 'absolute',
    right: 24,
    top: 24,
    paddingVertical: 6,
    paddingLeft: 12,
  },
  rule: {
    borderTopWidth: 2,
    marginHorizontal: 24,
  },
});
