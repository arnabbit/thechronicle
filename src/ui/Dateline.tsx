import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatLongDate } from '@/src/lib/date';
import { useTheme } from '@/src/theme/useTheme';
import { type } from '@/src/theme/type';

// Ticket 17 made the dateline the period control, and design-17 drew it as one:
// the date underlined, with a chevron beside it. The app shipped neither — the
// affordance rested on a `▾` appended after two spaces, in the same 10px grey
// as every count and kicker on the page. It read as furniture because it was
// styled as furniture.
//
// So a tappable dateline now carries the paper's ink, an underline in the same
// role as every other rule, and a chevron. An *untappable* one keeps none of
// them: the underline and the chevron are the affordance, so drawing them on
// something inert would be a lie.
//
// It also carries ticket 09's staleness signal for free, and that is the whole
// treatment: it shows the *edition* date, never the word "today", so a reader
// looking at Monday's paper on Wednesday is already being told.
export function Dateline({ edition, onPress }: { edition: string; onPress?: () => void }) {
  const { colors } = useTheme();
  const label = formatLongDate(edition);
  if (!label) return null;

  if (!onPress) {
    return (
      <View style={styles.row}>
        <Text style={[type.dateline, { color: colors.secondary }]}>{label}</Text>
      </View>
    );
  }

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      <Text
        style={[
          type.dateline,
          styles.underlined,
          { color: colors.primary, borderBottomColor: colors.ruleStrong },
        ]}
      >
        {label}
      </Text>
      <Chevron color={colors.primary} />
    </Pressable>
  );
}

// Two borders on a rotated square. `react-native-svg` is not a dependency here
// and adding one for a 6px glyph would move the native fingerprint, which cuts
// every existing install off from JS updates — a real cost for a chevron.
function Chevron({ color }: { color: string }) {
  return <View style={[styles.chevron, { borderColor: color }]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 14,
    // A 44pt target around an 11px date, without moving the rule under it.
    paddingVertical: 8,
    marginBottom: -8,
  },
  underlined: {
    borderBottomWidth: 1,
    paddingBottom: 3,
  },
  chevron: {
    width: 6,
    height: 6,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    transform: [{ rotate: '45deg' }],
    // Sits on the date's baseline rather than its box, which is 3px lower.
    marginBottom: 4,
  },
});
