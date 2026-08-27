import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatLongDate } from '@/src/lib/date';
import { useTheme } from '@/src/theme/useTheme';
import { type } from '@/src/theme/type';

// Ticket 17 made the dateline the period control — a tap opens the period
// navigator. Until that route and that navigator exist, it renders as plain
// furniture: `onPress` is optional and the `▾` only appears when it can
// actually do something.
//
// It also carries ticket 09's staleness signal for free, and that is the whole
// treatment: it shows the *edition* date, never the word "today", so a reader
// looking at Monday's paper on Wednesday is already being told.
export function Dateline({ edition, onPress }: { edition: string; onPress?: () => void }) {
  const { colors } = useTheme();
  const label = formatLongDate(edition);
  if (!label) return null;

  const text = (
    <Text style={[type.meta, styles.text, { color: colors.secondary }]}>
      {label}
      {onPress ? '  ▾' : ''}
    </Text>
  );

  if (!onPress) return <View style={styles.row}>{text}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      {text}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  text: {
    textAlign: 'center',
  },
});
