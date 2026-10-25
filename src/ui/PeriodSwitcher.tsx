import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PeriodKind } from '@/src/lib/period';
import type { NavigatorKind } from '@/src/store/navigator';
import { useTheme } from '@/src/theme/useTheme';
import { type } from '@/src/theme/type';

// Day / Week / Month / Quarter / Year, as one segmented control.
//
// Two surfaces carry it — inside the navigator, where it changes the scale in
// place, and at the top of the archive, where it opens the navigator at that
// scale. One component, because two copies of a four-way control is two
// chances for them to disagree about which scales exist.
//
// Day is the navigator's alone. The archive *is* the list of days, so a Day
// segment there would open a smaller copy of the screen it sits on.

const PERIODS: { kind: PeriodKind; label: string; short?: string }[] = [
  { kind: 'week', label: 'Week' },
  { kind: 'month', label: 'Month' },
  // Five segments leave about 54px each on a 320px screen, and "Quarter" in
  // letterspaced caps needs more. The short label is only for that row.
  { kind: 'quarter', label: 'Quarter', short: 'Qtr' },
  { kind: 'year', label: 'Year' },
];

export function PeriodSwitcher<K extends NavigatorKind = PeriodKind>({
  kind,
  onSelect,
  withDay = false,
}: {
  /** The selected scale, or `undefined` where nothing is selected yet — the
   *  archive shows the control without claiming to be at a scale. */
  kind?: K;
  onSelect: (kind: K) => void;
  /** Lead with a Day segment. Only the navigator offers it. */
  withDay?: boolean;
}) {
  const { colors } = useTheme();
  const options: { kind: NavigatorKind; label: string; short?: string }[] = withDay
    ? [{ kind: 'day', label: 'Day' }, ...PERIODS]
    : PERIODS;

  return (
    <View style={[styles.switcher, { borderColor: colors.ruleStrong }]}>
      {options.map((option, index) => {
        const active = option.kind === kind;
        return (
          <Pressable
            key={option.kind}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(option.kind as K)}
            style={[
              styles.segment,
              { backgroundColor: active ? colors.primary : 'transparent' },
              index > 0 ? { borderLeftWidth: 1, borderLeftColor: colors.ruleStrong } : null,
            ]}
          >
            <Text
              style={[
                type.kicker,
                withDay ? styles.segmentTextTight : styles.segmentText,
                // The active segment inverts rather than tints: ticket 12's
                // palettes have no mid-tone to spare, and an inversion reads in
                // both of them.
                { color: active ? colors.background : colors.primary },
              ]}
            >
              {withDay && option.short ? option.short : option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  switcher: {
    flexDirection: 'row',
    borderWidth: 1,
  },
  segment: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
  },
  segmentText: {
    letterSpacing: 1.5,
  },
  segmentTextTight: {
    letterSpacing: 1,
  },
});
