import { StyleSheet, Text, View } from 'react-native';
import { Dateline } from '@/src/ui/Dateline';
import { useTheme } from '@/src/theme/useTheme';
import { type } from '@/src/theme/type';

// The app's own furniture, and — per ticket 19 — its identity: a hairline
// above the masthead, a heavy rule beneath it, the dateline under that.
//
// Ticket 11 put search and saved here as two quiet affordances flanking the
// masthead. They are not rendered yet: `/search` and `/saved` land last in the
// route order, and a control that goes nowhere is worse than no control.
export function Masthead({
  edition,
  onPressDateline,
}: {
  edition?: string;
  onPressDateline?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.hairline, { borderTopColor: colors.ruleHair }]} />
      <Text style={[type.masthead, styles.masthead, { color: colors.primary }]}>
        The Chronicle
      </Text>
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
  rule: {
    borderTopWidth: 2,
    marginHorizontal: 24,
  },
});
