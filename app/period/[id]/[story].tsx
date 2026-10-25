import { onlineManager } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePeriod } from '@/src/api/queries';
import { formatDayMonth } from '@/src/lib/date';
import { parsePeriodId, periodLabel } from '@/src/lib/period';
import { findStory, storyDigest, storyKey } from '@/src/lib/periodStory';
import { screenState } from '@/src/lib/screenState';
import { routeTitle } from '@/src/lib/title';
import { BackLink } from '@/src/ui/BackLink';
import { Masthead } from '@/src/ui/Masthead';
import { Notice, ScreenState } from '@/src/ui/ScreenState';
import { StoryParts } from '@/src/ui/StoryParts';
import { useTheme } from '@/src/theme/useTheme';
import { type } from '@/src/theme/type';

// One story of a period, read whole: the headline, the backstory, and every
// update and correction after it. The period screen lists the stories; this is
// what a row of that list opens, as an article opens from the feed.
//
// It reads the period it belongs to. Arriving from the list, that period is
// already in the cache, so nothing is fetched; arriving cold from a link, it is
// one request for the whole period.
//
// The story is addressed by its thread, so a re-rank between two visits still
// finds it. A story that has dropped out of the list is said to have, rather
// than shown from memory: its rank would be a stale one.

export default function StoryScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ id: string; story: string }>();
  const id = params.id ?? '';
  const period = parsePeriodId(id);
  const view = usePeriod(id);

  const state = screenState({
    status: view.status,
    error: view.error,
    online: onlineManager.isOnline(),
    paused: view.fetchStatus === 'paused',
    count: view.data ? 1 : 0,
  });

  const label = period ? periodLabel(period.id) : '';
  const toPeriod = () => router.replace({ pathname: '/period/[id]', params: { id } });
  const back = () => (router.canGoBack() ? router.back() : toPeriod());

  if (!period) {
    return (
      <Frame title={routeTitle('Not in the paper')} back={back}>
        <Notice
          slug="Not in the paper"
          line="That is not a period this paper can show. A period is a week, a month, a quarter or a year — 2026-W35, 2026-08, 2026-Q3, or 2026."
          actionLabel="All editions"
          onAction={() => router.replace('/archive')}
        />
      </Frame>
    );
  }

  if (state || !view.data) {
    return (
      <Frame title={routeTitle(label)} back={back} backLabel={label}>
        <ScreenState
          kind={state ?? 'loading'}
          {...(state === 'missing'
            ? {
                line: 'This period is not available. It may be outside the paper’s run, or the link may be wrong — we cannot tell which.',
                actionLabel: 'All editions',
              }
            : {})}
          onAction={state === 'missing' ? () => router.replace('/archive') : () => view.refetch()}
        />
      </Frame>
    );
  }

  const { stories } = view.data.story;
  const found = findStory(stories, params.story ?? '');

  if (!found) {
    return (
      <Frame title={routeTitle(label)} back={back} backLabel={label}>
        <Notice
          slug="No longer in the list"
          line={`This story is not among ${label}’s important stories now. The list is re-ranked as the period’s evidence grows, and a story can drop out of it.`}
          actionLabel={`The stories of ${label}`}
          onAction={toPeriod}
        />
      </Frame>
    );
  }

  const { story, index } = found;
  const digest = storyDigest(story);
  const next = stories[index + 1];
  const span =
    digest.from === digest.latest
      ? formatDayMonth(digest.from)
      : `${formatDayMonth(digest.from)} – ${formatDayMonth(digest.latest)}`;

  return (
    <Frame title={routeTitle(story.headline)} back={back} backLabel={label}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[type.kicker, { color: colors.secondary }]}>
          {label}  ·  No. {index + 1} of {stories.length}
        </Text>
        <Text accessibilityRole="header" style={[type.headlineLarge, styles.headline, { color: colors.primary }]}>
          {story.headline}
        </Text>
        <Text style={[type.meta, styles.span, { color: colors.secondary }]}>
          {span}  ·  {story.parts.length} part{story.parts.length === 1 ? '' : 's'}
        </Text>
        <View style={[styles.rule, { borderTopColor: colors.ruleStrong }]} />

        <StoryParts parts={story.parts} />

        <View style={[styles.onward, { borderTopColor: colors.ruleStrong }]}>
          {next ? (
            <Pressable
              accessibilityRole="link"
              // Replace, so back from the next story is still the list.
              onPress={() =>
                router.replace({
                  pathname: '/period/[id]/[story]',
                  params: { id, story: storyKey(next, index + 1) },
                })
              }
              style={[styles.next, { borderBottomColor: colors.ruleHair }]}
            >
              <Text style={[type.kicker, { color: colors.secondary }]}>Next  ·  No. {index + 2}</Text>
              <Text style={[type.headline, styles.nextHeadline, { color: colors.primary }]}>
                {next.headline} ›
              </Text>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="link" onPress={back} style={styles.all}>
            <Text style={[type.kicker, { color: colors.primary }]}>
              All {stories.length} stories of {label}  →
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </Frame>
  );
}

function Frame({
  title,
  back,
  backLabel,
  children,
}: {
  title: string;
  back: () => void;
  backLabel?: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen options={{ title }} />
      <BackLink label={backLabel} onPress={back} />
      <Masthead />
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 48,
  },
  headline: {
    marginTop: 12,
  },
  span: {
    marginTop: 14,
  },
  rule: {
    borderTopWidth: 1,
    marginTop: 20,
  },
  onward: {
    borderTopWidth: 2,
    marginTop: 40,
  },
  next: {
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  nextHeadline: {
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: -0.3,
    marginTop: 8,
  },
  all: {
    alignSelf: 'flex-start',
    paddingVertical: 16,
    paddingRight: 12,
  },
});
