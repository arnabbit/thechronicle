import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StoryPart } from '@/src/api/types';
import { formatDayMonth } from '@/src/lib/date';
import { useTheme } from '@/src/theme/useTheme';
import { type } from '@/src/theme/type';

// One period story read whole: its parts in wire order, which is date order.
// The story screen renders this; the period screen shows only each story's
// digest and leads here.

export function StoryParts({ parts }: { parts: StoryPart[] }) {
  return (
    <>
      {parts.map((part, index) => (
        <Part key={`${part.date}:${index}`} part={part} first={index === 0} />
      ))}
    </>
  );
}

/**
 * One part of a story. A `backstory` is its paragraphs. An `update` carries its
 * date first and a rule above it, so it reads as appended. A `correction` is
 * marked and quieter, never hidden.
 */
function Part({ part, first }: { part: StoryPart; first: boolean }) {
  const { colors } = useTheme();
  const correction = part.kind === 'correction';

  return (
    <View
      style={[
        styles.part,
        correction
          ? [styles.correction, { borderLeftColor: colors.ruleHair }]
          : !first && [styles.appended, { borderTopColor: colors.ruleHair }],
      ]}
    >
      {correction ? (
        <Text style={[type.kicker, { color: colors.primary }]}>Correction</Text>
      ) : null}
      {part.kind === 'update' ? (
        <Text style={[type.meta, { color: colors.secondary }]}>
          {formatDayMonth(part.date)}
        </Text>
      ) : null}
      {part.paragraphs.map((paragraph, index) => (
        <Text
          key={index}
          style={[
            correction ? type.sentence : type.body,
            index === 0 && part.kind === 'backstory' ? null : styles.paragraph,
            { color: correction ? colors.secondary : colors.onSurface },
          ]}
        >
          {paragraph}
        </Text>
      ))}
      <Articles ids={part.articleIds} />
    </View>
  );
}

/**
 * The articles behind a part: the first as the way in, the rest listed after
 * it. The wire carries ids only, so the rest are numbered, not named. A part
 * whose articles were all hidden has no links and keeps its text.
 */
function Articles({ ids }: { ids: string[] }) {
  const { colors } = useTheme();
  if (ids.length === 0) return null;
  const open = (id: string) => router.push({ pathname: '/article/[id]', params: { id } });
  const [first, ...rest] = ids;

  return (
    <View style={styles.articles}>
      <Pressable accessibilityRole="link" onPress={() => open(first)} hitSlop={8}>
        <Text style={[type.kicker, { color: colors.primary }]}>Read the report ›</Text>
      </Pressable>
      {rest.length > 0 ? (
        <View style={styles.moreArticles}>
          <Text style={[type.meta, { color: colors.secondary }]}>Also</Text>
          {rest.map((id, index) => (
            <Pressable key={`${id}:${index}`} accessibilityRole="link" onPress={() => open(id)} hitSlop={8}>
              <Text style={[type.meta, styles.underline, { color: colors.secondary }]}>
                Report {index + 2}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  part: {
    marginTop: 22,
  },
  appended: {
    borderTopWidth: 1,
    paddingTop: 18,
    marginTop: 26,
  },
  paragraph: {
    marginTop: 12,
  },
  underline: {
    textDecorationLine: 'underline',
  },
  // Quieter than the story around it, and ruled off at the side so it cannot
  // be read as more of the story.
  correction: {
    borderLeftWidth: 2,
    paddingLeft: 14,
  },
  articles: {
    marginTop: 14,
    gap: 10,
    alignItems: 'flex-start',
  },
  moreArticles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
