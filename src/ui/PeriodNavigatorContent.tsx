import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useEditions } from '@/src/api/queries';
import { hasPeriod } from '@/src/backendSurfaces';
import { bucketEditions } from '@/src/lib/period';
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
  const buckets = useMemo(() => bucketEditions(rows, kind), [rows, kind]);

  return (
    <>
      <Text style={[type.kicker, styles.title, { color: colors.secondary }]}>Browse by period</Text>

      <PeriodSwitcher kind={kind} onSelect={setKind} />

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {buckets.length === 0 ? (
          <Text style={[type.sentence, styles.none, { color: colors.onSurface }]}>
            {editions.status === 'pending'
              ? 'Reading the archive.'
              : 'The paper has not published an edition yet.'}
          </Text>
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

const styles = StyleSheet.create({
  title: {
    textAlign: 'center',
    marginBottom: 18,
  },
  list: {
    marginTop: 6,
    // The sheet stays a sheet: a five-month archive is three rows at month
    // scale and twenty at week scale, and the second must not become a screen.
    maxHeight: 264,
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
