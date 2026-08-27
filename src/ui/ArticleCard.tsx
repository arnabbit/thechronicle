import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { FeedItem } from '@/src/api/types';
import { categoryLabel } from '@/src/lib/category';
import { formatDateline } from '@/src/lib/date';
import { useTheme } from '@/src/theme/useTheme';
import { type } from '@/src/theme/type';

// The Wire: every story carries equal weight. Category kicker, headline, dek,
// and a metadata line only when there are developments or more than one
// source. No body — ticket 03 split that off to the detail screen — and no
// positional hierarchy, because editions run from 2 articles to 85 and the
// data holds no signal that means importance.
export function ArticleCard({
  item,
  onPress,
  showEdition = false,
}: {
  item: FeedItem;
  onPress?: () => void;
  /** The feed hides the edition date because every row shares one. Search
   *  spans months, so there the date is what makes a result legible outside
   *  its edition. One prop, not a second row component. */
  showEdition?: boolean;
}) {
  const { colors } = useTheme();

  const meta: string[] = [];
  if (item.developmentCount > 0) {
    meta.push(`${item.developmentCount} development${item.developmentCount === 1 ? '' : 's'}`);
  }
  if (item.sourceCount > 1) {
    meta.push(`${item.sourceCount} sources`);
  }

  return (
    <Pressable
      accessibilityRole={onPress ? 'link' : undefined}
      onPress={onPress}
      style={styles.row}
    >
      <View style={styles.kickerRow}>
        <Text style={[type.kicker, { color: colors.primary }]}>
          {categoryLabel(item.category)}
        </Text>
        {showEdition && item.edition ? (
          <Text style={[type.meta, { color: colors.secondary }]}>
            {formatDateline(item.edition)}
          </Text>
        ) : null}
      </View>
      <Text style={[type.headline, styles.headline, { color: colors.primary }]}>
        {item.headline}
      </Text>
      <Text style={[type.dek, { color: colors.dek }]}>{item.dek}</Text>
      {meta.length > 0 ? (
        <Text style={[type.meta, styles.meta, { color: colors.secondary }]}>
          {meta.join('  ·  ')}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 22,
  },
  kickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
  },
  headline: {
    marginTop: 10,
    marginBottom: 8,
  },
  meta: {
    marginTop: 12,
  },
});
