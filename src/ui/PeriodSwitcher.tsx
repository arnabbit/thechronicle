import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PeriodKind } from '@/src/lib/period';
import { useTheme } from '@/src/theme/useTheme';
import { type } from '@/src/theme/type';

// Week / Month / Quarter / Year, as one segmented control.
//
// Two surfaces carry it — inside the navigator, where it changes the scale in
// place, and at the top of the archive, where it opens the navigator at that
// scale. One component, because two copies of a four-way control is two
// chances for them to disagree about which scales exist.

const KINDS: { kind: PeriodKind; label: string }[] = [
  { kind: 'week', label: 'Week' },
  { kind: 'month', label: 'Month' },
  { kind: 'quarter', label: 'Quarter' },
  { kind: 'year', label: 'Year' },
];

export function PeriodSwitcher({
  kind,
  onSelect,
}: {
  /** The selected scale, or `undefined` where nothing is selected yet — the
   *  archive shows the control without claiming to be at a scale. */
  kind?: PeriodKind;
  onSelect: (kind: PeriodKind) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.switcher, { borderColor: colors.ruleStrong }]}>
      {KINDS.map((option, index) => {
        const active = option.kind === kind;
        return (
          <Pressable
            key={option.kind}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(option.kind)}
            style={[
              styles.segment,
              { backgroundColor: active ? colors.primary : 'transparent' },
              index > 0 ? { borderLeftWidth: 1, borderLeftColor: colors.ruleStrong } : null,
            ]}
          >
            <Text
              style={[
                type.kicker,
                styles.segmentText,
                // The active segment inverts rather than tints: ticket 12's
                // palettes have no mid-tone to spare, and an inversion reads in
                // both of them.
                { color: active ? colors.background : colors.primary },
              ]}
            >
              {option.label}
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
});
