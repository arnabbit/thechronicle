import { onlineManager } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePeriod } from '@/src/api/queries';
import type { PeriodDay, PeriodView, StoryEntry } from '@/src/api/types';
import { categoryLabel } from '@/src/lib/category';
import { sectionDateLabel } from '@/src/lib/date';
import { parsePeriodId, periodLabel, rangeLabel, type PeriodKind } from '@/src/lib/period';
import { screenState } from '@/src/lib/screenState';
import { routeTitle } from '@/src/lib/title';
import { BackLink } from '@/src/ui/BackLink';
import { Masthead } from '@/src/ui/Masthead';
import { Notice, ScreenState } from '@/src/ui/ScreenState';
import { useTheme } from '@/src/theme/useTheme';
import { fonts, type } from '@/src/theme/type';

// A week, a month, a quarter or a year at a glance — one screen for all four,
// so they move identically and there is one screen to get right rather than
// four to keep consistent.
//
// The **skeleton** is a deterministic aggregate and always present, so it
// renders unconditionally. The **period story** follows it: one long article of
// the period's important stories, a dated section per run, growing at the end.
// The screen never waits for it, and says which kind of nothing it has.
//
// Sparsity is the normal case here more than anywhere else in the app — three
// quarters of days carry no edition — so "a month at a glance" is legitimately
// one edition, and an empty in-range period is an empty state rather than a
// failure.

const KIND_WORD: Record<PeriodKind, string> = {
  week: 'A week at a glance',
  month: 'A month at a glance',
  quarter: 'A quarter at a glance',
  year: 'A year at a glance',
};

export default function PeriodScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Refused before any hook fires, so `/period/nonsense` costs no request.
  // The server would 404 it too; this only saves the round trip.
  const period = useMemo(() => parsePeriodId(id ?? ''), [id]);
  const view = usePeriod(id ?? '');
  const scroll = useRef<ScrollView>(null);

  const state = screenState({
    status: view.status,
    error: view.error,
    online: onlineManager.isOnline(),
    paused: view.fetchStatus === 'paused',
    count: view.data ? 1 : 0,
  });

  if (!period) {
    return (
      <Frame title={routeTitle('Not in the paper')}>
        <Notice
          slug="Not in the paper"
          line="That is not a period this paper can show. A period is a week, a month, a quarter or a year — 2026-W35, 2026-08, 2026-Q3, or 2026."
          actionLabel="All editions"
          onAction={() => router.replace('/archive')}
        />
      </Frame>
    );
  }

  const label = periodLabel(period.id);

  // Zero editions in a valid range is a real answer, not a failure — and it is
  // the commonest answer this screen has. A story status of `none` means the
  // same thing: nothing visible in the period.
  if (view.data && (view.data.editionCount === 0 || view.data.storyStatus === 'none')) {
    return (
      <Frame title={routeTitle(label)}>
        <Notice
          slug={`No editions this ${period.kind}`}
          line={`No paper was published between ${rangeLabel(period.range)}.`}
          actionLabel="All editions"
          onAction={() => router.push('/archive')}
        />
      </Frame>
    );
  }

  if (state || !view.data) {
    return (
      <Frame title={routeTitle(label)}>
        <ScreenState
          kind={state ?? 'loading'}
          // `missing`'s default line is worded for an article — "This article
          // is not available" — and this is not an article. The spec records
          // that as an open copy question; until ticket 18 settles it, the
          // period screen supplies its own line rather than telling a reader
          // about an article they did not ask for. Same structure, same
          // refusal to guess which of the two reasons it is.
          {...(state === 'missing'
            ? {
                line: 'This period is not available. It may be outside the paper’s run, or the link may be wrong — we cannot tell which.',
                actionLabel: 'All editions',
              }
            : {})}
          onAction={
            state === 'missing' ? () => router.replace('/archive') : () => view.refetch()
          }
        />
      </Frame>
    );
  }

  return (
    <Frame title={routeTitle(label)}>
      <ScrollView ref={scroll} contentContainerStyle={styles.content}>
        <Text style={[type.kicker, { color: colors.secondary }]}>{KIND_WORD[period.kind]}</Text>
        <Text style={[type.display, styles.title, { color: colors.primary }]}>{label}</Text>
        <View style={styles.counts}>
          <Text style={[type.slug, styles.count, { color: colors.primary }]}>
            {view.data.editionCount} edition{view.data.editionCount === 1 ? '' : 's'}
          </Text>
          <Text style={[type.slug, styles.count, { color: colors.secondary }]}>·</Text>
          <Text style={[type.slug, styles.count, { color: colors.primary }]}>
            {view.data.articleCount} article{view.data.articleCount === 1 ? '' : 's'}
          </Text>
        </View>
        <View style={[styles.rule, { borderTopColor: colors.ruleStrong }]} />

        <Timeline days={view.data.timeline} range={period.range} />
        <Categories view={view.data} />
        <Story
          view={view.data}
          scrollTo={(y) => scroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: true })}
        />
      </ScrollView>
    </Frame>
  );
}

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen options={{ title }} />
      <BackLink />
      <Masthead />
      {children}
    </SafeAreaView>
  );
}

/**
 * One bar per day, height by article count; a day that published nothing is a
 * faint tick rather than a gap.
 *
 * The gap would be the lie: an absence that looks like nothing looks like
 * missing data. A tick says "this day existed and carried no paper", which is
 * true of three days in four.
 */
function Timeline({ days, range }: { days: PeriodDay[]; range: { from: string; to: string } }) {
  const { colors } = useTheme();
  const busiest = days.reduce((most, day) => Math.max(most, day.count), 0);
  if (days.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={[type.kicker, styles.sectionHead, { color: colors.secondary }]}>
        Publishing rhythm
      </Text>
      <View style={[styles.chart, { borderBottomColor: colors.ruleStrong }]}>
        {days.map((day) => {
          const published = day.count > 0;
          return (
            <View
              key={day.date}
              accessibilityLabel={`${day.date}: ${day.count} articles`}
              style={[
                styles.bar,
                {
                  // Proportional to the busiest day, with a floor so a
                  // one-article day is still a bar and not a tick.
                  height: published ? Math.max(6, Math.round((day.count / busiest) * 62)) : 3,
                  backgroundColor: published ? colors.primary : colors.ruleHair,
                },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.axis}>
        <Text style={[type.meta, styles.axisLabel, { color: colors.secondary }]}>
          {shortDate(range.from)}
        </Text>
        <Text style={[type.meta, styles.axisLabel, { color: colors.secondary }]}>
          {shortDate(range.to)}
        </Text>
      </View>
    </View>
  );
}

/** "Aug 1" — the axis ends, where the full dateline would not fit and is not
 *  the point. Formatted from the digits, never a Date read back. */
function shortDate(date: string): string {
  const label = periodLabel(date.slice(0, 7));
  const day = Number(date.slice(8, 10));
  return `${label.slice(0, 3)} ${day}`;
}

function Categories({ view }: { view: PeriodView }) {
  const { colors } = useTheme();
  if (view.categories.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={[type.kicker, styles.sectionHead, { color: colors.secondary }]}>
        Sections that ran
      </Text>
      {view.categories.map((category) => (
        <View
          key={category.slug}
          style={[styles.categoryRow, { borderBottomColor: colors.ruleHair }]}
        >
          <Text style={[type.kicker, { color: colors.primary }]}>
            {category.name || categoryLabel(category.slug)}
          </Text>
          <Text style={[type.meta, { color: colors.secondary }]}>
            {category.count} article{category.count === 1 ? '' : 's'}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * The period story: a date divider per section, entries under it.
 *
 * Sections and entries render in wire order. The order is the editor's
 * ranking, so the screen never sorts.
 *
 * Each section records where it sits so a "Continued from" line can scroll back
 * to it. Its y is relative to this view, and this view's y is relative to the
 * scroll content, so the two add up to a scroll offset.
 */
function Story({ view, scrollTo }: { view: PeriodView; scrollTo: (y: number) => void }) {
  const { colors } = useTheme();
  const top = useRef(0);
  const tops = useRef(new Map<string, number>());
  const { sections } = view.story;
  const writing = view.storyStatus === 'writing';

  if (sections.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={[type.meta, { color: colors.secondary }]}>
          {writing
            ? 'This period’s story is being written.'
            : 'Nothing in this period passed the test for an important story.'}
        </Text>
      </View>
    );
  }

  const dates = new Set(sections.map((section) => section.date));
  const jumpTo = (date: string | null) => {
    if (!date || !dates.has(date)) return undefined;
    return () => {
      const y = tops.current.get(date);
      if (y !== undefined) scrollTo(top.current + y);
    };
  };

  return (
    <View
      style={styles.section}
      onLayout={(event) => {
        top.current = event.nativeEvent.layout.y;
      }}
    >
      {sections.map((section) => (
        <View
          key={section.date}
          style={[styles.storySection, { borderTopColor: colors.ruleStrong }]}
          onLayout={(event) => {
            tops.current.set(section.date, event.nativeEvent.layout.y);
          }}
        >
          <Text style={[type.slug, { color: colors.primary }]}>
            {sectionDateLabel(section.date)}
          </Text>
          {section.entries.map((entry, index) => (
            <Entry
              key={`${entry.threadId}:${index}`}
              entry={entry}
              onContinue={jumpTo(entry.continuesFrom)}
            />
          ))}
        </View>
      ))}
      {writing ? (
        <Text style={[type.meta, styles.storyMore, { color: colors.secondary }]}>
          More is being written.
        </Text>
      ) : null}
    </View>
  );
}

/**
 * One entry. A `correction` is marked and quieter, never hidden. An `update`
 * names the section it continues; the line scrolls there when that section is
 * in this story, and is plain text when it is not.
 */
function Entry({ entry, onContinue }: { entry: StoryEntry; onContinue?: () => void }) {
  const { colors } = useTheme();
  const correction = entry.kind === 'correction';
  const continued = entry.kind === 'update' ? entry.continuesFrom : null;

  return (
    <View
      style={[
        styles.entry,
        correction ? [styles.correction, { borderLeftColor: colors.ruleHair }] : null,
      ]}
    >
      {correction ? (
        <Text style={[type.kicker, styles.correctionMark, { color: colors.primary }]}>
          Correction
        </Text>
      ) : null}
      <Text
        accessibilityRole="header"
        style={[correction ? styles.correctionHead : type.headline, { color: colors.primary }]}
      >
        {entry.headline}
      </Text>
      {continued ? (
        <Text
          accessibilityRole={onContinue ? 'link' : undefined}
          onPress={onContinue}
          style={[
            type.meta,
            styles.continued,
            { color: colors.secondary },
            onContinue ? styles.underline : null,
          ]}
        >
          Continued from {sectionDateLabel(continued)}
        </Text>
      ) : null}
      {entry.paragraphs.map((paragraph, index) => (
        <Text
          key={index}
          style={[
            correction ? type.sentence : type.body,
            styles.paragraph,
            { color: correction ? colors.secondary : colors.onSurface },
          ]}
        >
          {paragraph}
        </Text>
      ))}
      <Articles ids={entry.articleIds} />
    </View>
  );
}

/**
 * The articles behind an entry: the first as the way in, the rest listed after
 * it. The wire carries ids only, so the rest are numbered, not named. An entry
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
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 48,
  },
  title: {
    marginTop: 14,
  },
  counts: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 16,
  },
  count: {
    letterSpacing: 1.5,
  },
  rule: {
    borderTopWidth: 1,
    marginTop: 20,
  },
  section: {
    marginTop: 30,
  },
  sectionHead: {
    marginBottom: 12,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 68,
    borderBottomWidth: 1,
  },
  bar: {
    flex: 1,
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 7,
  },
  axisLabel: {
    letterSpacing: 1.5,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 16,
  },
  storySection: {
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 26,
  },
  entry: {
    marginTop: 18,
  },
  paragraph: {
    marginTop: 12,
  },
  continued: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  underline: {
    textDecorationLine: 'underline',
  },
  // Quieter than an entry, and ruled off at the side so it cannot be read as
  // one more story.
  correction: {
    borderLeftWidth: 2,
    paddingLeft: 14,
  },
  correctionMark: {
    marginBottom: 6,
  },
  correctionHead: {
    ...type.sentence,
    fontFamily: fonts.serifBold,
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
  // Below the last section, in furniture weight.
  storyMore: {
    marginTop: 26,
  },
});
