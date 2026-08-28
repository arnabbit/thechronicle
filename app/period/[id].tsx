import { onlineManager } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePeriod } from '@/src/api/queries';
import type { PeriodDay, PeriodView } from '@/src/api/types';
import { categoryLabel } from '@/src/lib/category';
import { istDate, parsePeriodId, periodLabel, rangeLabel, type PeriodKind } from '@/src/lib/period';
import { screenState } from '@/src/lib/screenState';
import { routeTitle } from '@/src/lib/title';
import { BackLink } from '@/src/ui/BackLink';
import { Masthead } from '@/src/ui/Masthead';
import { Notice, ScreenState } from '@/src/ui/ScreenState';
import { useTheme } from '@/src/theme/useTheme';
import { type } from '@/src/theme/type';

// A week, a month, a quarter or a year at a glance — one screen for all four,
// so they move identically and there is one screen to get right rather than
// four to keep consistent.
//
// The **skeleton** is a deterministic aggregate and always present, so it
// renders unconditionally. The **prose** is a bonus: an open period is
// skeleton-only and says so, rather than implying a summary is on its way.
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
  const today = useMemo(() => istDate(Date.now()), []);
  const view = usePeriod(id ?? '', today);

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
  // the commonest answer this screen has.
  if (view.data && view.data.editionCount === 0) {
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
      <ScrollView contentContainerStyle={styles.content}>
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
        <Prose view={view.data} closed={period.range.to < today} />
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
 * The written summary, when one exists.
 *
 * Prose ranks the period, so the screen does not: there is no headline list to
 * order and no "top stories" to pick. When there is no prose the screen says
 * which kind of nothing it is — still open, not written yet, or nothing to
 * summarise — and never implies a summary is loading when none was ever going
 * to arrive.
 *
 * Three parts, per ticket 13's round-3 answer: a lede about the period, a
 * paragraph per category that had enough in it, and one trailing line folding
 * in the categories that did not. Each is rendered only if it arrived, so an
 * endpoint built to the design board instead — paragraphs only — degrades to
 * paragraphs rather than to nothing.
 *
 * `closed` is derived from the range by the caller rather than read off
 * `proseStatus`, because `pending` means two different things: a period still
 * accumulating, and a closed one whose summary has not been generated yet.
 * Those need different sentences, and only one of them can honestly say the
 * period is open. The comparison is the same one `usePeriod` makes to decide
 * staleness, so the screen and the cache cannot disagree about it.
 */
function Prose({ view, closed }: { view: PeriodView; closed: boolean }) {
  const { colors } = useTheme();
  const prose = view.prose;

  if (view.proseStatus === 'ready' && prose) {
    return (
      <View style={styles.section}>
        {prose.lede ? (
          <Text style={[type.sentence, styles.proseLede, { color: colors.onSurface }]}>
            {prose.lede}
          </Text>
        ) : null}
        {prose.byCategory.map((entry) => (
          <View key={entry.slug} style={[styles.proseRow, { borderBottomColor: colors.ruleHair }]}>
            <Text style={[type.slug, styles.proseHead, { color: colors.primary }]}>
              {entry.name || categoryLabel(entry.slug)}
            </Text>
            <Text style={[type.sentence, { color: colors.onSurface }]}>{entry.text}</Text>
          </View>
        ))}
        {prose.also ? (
          <Text style={[type.meta, styles.proseAlso, { color: colors.secondary }]}>
            {prose.also}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={[type.meta, { color: colors.secondary }]}>
        {view.proseStatus !== 'pending'
          ? 'No written summary for this period.'
          : closed
            ? 'A written summary for this period has not been added yet.'
            : 'This period is still open. A written summary is added once it closes.'}
      </Text>
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
  proseRow: {
    paddingBottom: 22,
    paddingTop: 22,
    borderBottomWidth: 1,
  },
  proseHead: {
    marginBottom: 10,
  },
  // The lede sits above the first category rule, so it carries the bottom
  // padding a `proseRow` would have given it and none of the top.
  proseLede: {
    paddingBottom: 4,
  },
  // Below the last rule, in furniture weight — it is the categories that did
  // *not* earn a paragraph, and it must not read as one more of them.
  proseAlso: {
    marginTop: 18,
  },
});
