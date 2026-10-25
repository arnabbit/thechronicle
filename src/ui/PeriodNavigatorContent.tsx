import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useEditions } from '@/src/api/queries';
import { hasPeriod } from '@/src/backendSurfaces';
import type { EditionRow } from '@/src/api/types';
import { formatWeekdayDay } from '@/src/lib/date';
import { bucketEditions, editionsByMonth, istDate } from '@/src/lib/period';
import { useNavigator } from '@/src/store/navigator';
import { PeriodSwitcher } from '@/src/ui/PeriodSwitcher';
import { useTheme } from '@/src/theme/useTheme';
import { type } from '@/src/theme/type';

// What is inside the navigator, on both platforms.
//
// The shell differs — a sheet on the phone, a popover on the web — and that is
// the app's one platform file split. Everything a reader actually looks at is
// here, once, so the two shells cannot drift into two different navigators.
//
// **The switcher works with the period endpoint absent.** Grouping the archive
// by week, month, quarter or year is arithmetic over the editions index the
// app already holds, so a reader can see the shape of the archive today. What
// waits on ticket 09 is only the *destination*: with `hasPeriod` off, a bucket
// is a line of information rather than a control, and "All editions" is the
// way through. A control that goes nowhere is worse than no control.

export function PeriodNavigatorContent() {
  const { colors } = useTheme();
  const kind = useNavigator((state) => state.kind);
  const setKind = useNavigator((state) => state.setKind);
  const close = useNavigator((state) => state.close);

  // Mounted only while the navigator is open, so a reader who never opens it
  // never pays for the index.
  const editions = useEditions();
  const rows = useMemo(
    () => editions.data?.pages.flatMap((page) => page.items) ?? [],
    [editions.data],
  );
  const buckets = useMemo(
    () => (kind === 'day' ? [] : bucketEditions(rows, kind)),
    [rows, kind],
  );
  const months = useMemo(() => (kind === 'day' ? editionsByMonth(rows) : []), [rows, kind]);

  return (
    <>
      <Text style={[type.kicker, styles.title, { color: colors.secondary }]}>
        Go to a day or a period
      </Text>

      <PeriodSwitcher kind={kind} onSelect={setKind} withDay />

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {rows.length === 0 ? (
          <Text style={[type.sentence, styles.none, { color: colors.onSurface }]}>
            {editions.status === 'pending'
              ? 'Reading the archive.'
              : 'The paper has not published an edition yet.'}
          </Text>
        ) : kind === 'day' ? (
          <Days
            months={months}
            newest={rows[0].date}
            more={Boolean(editions.hasNextPage)}
            onMore={() => {
              if (!editions.isFetchingNextPage) editions.fetchNextPage();
            }}
          />
        ) : (
          buckets.map((bucket) => {
            const row = (
              <View style={[styles.bucket, { borderBottomColor: colors.ruleHair }]}>
                <Text style={[type.headline, styles.bucketLabel, { color: colors.primary }]}>
                  {bucket.label}
                </Text>
                <Text style={[type.meta, { color: colors.secondary }]}>
                  {bucket.editionCount} edition{bucket.editionCount === 1 ? '' : 's'}
                </Text>
              </View>
            );
            // Information, not a control, until the period screen exists.
            if (!hasPeriod) return <View key={bucket.id}>{row}</View>;
            return (
              <Pressable
                key={bucket.id}
                accessibilityRole="link"
                onPress={() => {
                  close();
                  router.push({ pathname: '/period/[id]', params: { id: bucket.id } });
                }}
              >
                {row}
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <Pressable
        accessibilityRole="link"
        onPress={() => {
          close();
          router.push('/archive');
        }}
        style={styles.allHit}
      >
        <Text style={[type.kicker, { color: colors.primary }]}>All editions  →</Text>
      </Pressable>
    </>
  );
}

/**
 * Every edition the index holds, under its month. The newest goes to the front
 * page rather than to its dated copy, so the reader lands on the paper that
 * keeps updating; the rest open as that day's edition.
 */
function Days({
  months,
  newest,
  more,
  onMore,
}: {
  months: { id: string; label: string; editions: EditionRow[] }[];
  newest: string;
  more: boolean;
  onMore: () => void;
}) {
  const { colors } = useTheme();
  const close = useNavigator((state) => state.close);
  const today = istDate(Date.now());

  const open = (date: string) => {
    close();
    if (date === newest) router.navigate('/');
    else router.push({ pathname: '/edition/[date]', params: { date } });
  };

  return (
    <>
      {months.map((month, index) => (
        <View key={month.id}>
          <Text
            style={[
              type.kicker,
              styles.month,
              index > 0 && styles.monthAfter,
              { color: colors.secondary, borderBottomColor: colors.ruleStrong },
            ]}
          >
            {month.label}
          </Text>
          {month.editions.map((edition) => (
            <Pressable
              key={edition.date}
              accessibilityRole="link"
              onPress={() => open(edition.date)}
              style={[styles.day, { borderBottomColor: colors.ruleHair }]}
            >
              <View style={styles.dayName}>
                <Text style={[type.headline, styles.dayLabel, { color: colors.primary }]}>
                  {formatWeekdayDay(edition.date)}
                </Text>
                {edition.date === today ? (
                  <Text style={[type.kicker, { color: colors.primary }]}>Today</Text>
                ) : null}
              </View>
              <Text style={[type.meta, { color: colors.secondary }]}>
                {edition.count} article{edition.count === 1 ? '' : 's'}
              </Text>
            </Pressable>
          ))}
        </View>
      ))}
      {/* The index arrives a page at a time; older days are one press on,
          rather than a scroll position that quietly fetches. */}
      {more ? (
        <Pressable accessibilityRole="button" onPress={onMore} style={styles.moreHit}>
          <Text style={[type.kicker, { color: colors.primary }]}>Earlier editions  ↓</Text>
        </Pressable>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    textAlign: 'center',
    marginBottom: 18,
  },
  list: {
    marginTop: 6,
    // The sheet stays a sheet: a five-month archive is three rows at month
    // scale and forty at day scale, and the second must not become a screen.
    // Tall enough for about seven days, which is a week of a sparse paper.
    maxHeight: 360,
  },
  listContent: {
    paddingBottom: 4,
  },
  bucket: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 16,
  },
  bucketLabel: {
    flexShrink: 1,
  },
  month: {
    paddingTop: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
  },
  monthAfter: {
    paddingTop: 22,
  },
  day: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 13,
    borderBottomWidth: 1,
    gap: 16,
  },
  dayName: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    flexShrink: 1,
  },
  // A notch under the feed headline: twelve of these sit in a sheet, and at 24px
  // they read as twelve front pages.
  dayLabel: {
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  moreHit: {
    paddingVertical: 14,
    alignSelf: 'flex-start',
  },
  none: {
    paddingVertical: 22,
  },
  allHit: {
    marginTop: 14,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingRight: 12,
  },
});
