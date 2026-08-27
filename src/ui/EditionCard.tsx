import { Pressable, StyleSheet, Text } from 'react-native';
import type { EditionRow } from '@/src/api/types';
import { formatDateline, formatWeekday } from '@/src/lib/date';
import { useTheme } from '@/src/theme/useTheme';
import { type } from '@/src/theme/type';

// An archive row in the feed's own rhythm — the kicker slot carries the
// weekday, the headline slot the date, the meta line the article count. Same
// three-part shape as a story row, because the archive is a list in this paper
// and not a second aesthetic.
//
// The count is the row's whole job beyond the date: editions run from 2
// articles to 85, so it is what tells a full day from a quiet one before the
// reader opens it.
//
// `onPress` is optional and this is the destination-bearing component ticket 04
// hands `/edition/:date` to. Until that route exists a tap does nothing.
export function EditionCard({
  item,
  onPress,
}: {
  item: EditionRow;
  onPress?: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole={onPress ? 'link' : undefined}
      onPress={onPress}
      style={styles.row}
    >
      <Text style={[type.kicker, { color: colors.primary }]}>
        {formatWeekday(item.date)}
      </Text>
      <Text style={[type.headline, styles.headline, { color: colors.primary }]}>
        {formatDateline(item.date)}
      </Text>
      <Text style={[type.meta, { color: colors.secondary }]}>
        {item.count} article{item.count === 1 ? '' : 's'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 22,
  },
  headline: {
    marginTop: 10,
    marginBottom: 8,
  },
});
