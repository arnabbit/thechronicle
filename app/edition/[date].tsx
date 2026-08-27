import { onlineManager } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isNotFound } from '@/src/api/errors';
import { useEdition, useEditionArticles } from '@/src/api/queries';
import type { FeedItem } from '@/src/api/types';
import { categoryLabel } from '@/src/lib/category';
import { formatDateline, isEditionDate } from '@/src/lib/date';
import { screenState, type ScreenStateKind } from '@/src/lib/screenState';
import { routeTitle } from '@/src/lib/title';
import { ArticleCard } from '@/src/ui/ArticleCard';
import { CategoryNav } from '@/src/ui/CategoryNav';
import { Masthead } from '@/src/ui/Masthead';
import { ScreenState } from '@/src/ui/ScreenState';
import { useTheme } from '@/src/theme/useTheme';
import { type } from '@/src/theme/type';

// One past edition, read as that day's own paper. This is the front page with a
// real date in place of the `latest` sentinel — same masthead, same nav, same
// feed — which is what the shared edition/edition-articles hooks were shaped
// for. They already give a dated edition `Infinity` staleness, so revisiting one
// in a session refetches nothing; nothing here re-implements that.

export default function PastEdition() {
  const params = useLocalSearchParams<{ date: string; category?: string }>();

  // A malformed date is answered here, before any hook: the shape of a date is
  // knowable without the network, and `/edition/not-a-date` should not cost a
  // request to be told no. Splitting the screen in two is what lets the query
  // hooks below run unconditionally.
  if (!isEditionDate(params.date)) return <NoEdition />;

  return <Edition date={params.date} category={params.category ?? 'home'} />;
}

function Edition({ date, category }: { date: string; category: string }) {
  const { colors } = useTheme();

  const edition = useEdition(date);
  const feed = useEditionArticles(date, category);

  const articles = useMemo(
    () => feed.data?.pages.flatMap((page) => page.items) ?? [],
    [feed.data],
  );

  // The active category lives in the URL, not component state, so one section
  // of one day is a link someone can be sent.
  const selectCategory = useCallback((slug: string) => {
    router.setParams({ category: slug === 'home' ? undefined : slug });
  }, []);

  const loadMore = useCallback(() => {
    if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
  }, [feed]);

  // Connectivity is read at the call site, as every screen does it, so the
  // selector stays pure and the offline-vs-error branch is decided once.
  const state = screenState({
    status: feed.status,
    error: feed.error,
    online: onlineManager.isOnline(),
    paused: feed.fetchStatus === 'paused',
    count: articles.length,
  });

  // `screenState` maps the API's 404 to `missing`, which is the article route's
  // state and not this one. Three-quarters of calendar days carry no edition at
  // all, so a date that never published is an ordinary empty result — the
  // commonest non-content state in the app — and the screen translates it here
  // rather than teaching the selector about editions.
  if (state === 'missing' || (edition.status === 'error' && isNotFound(edition.error))) {
    return <NoEdition date={date} />;
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      {/* The route names the day it is showing, so a tab and a history entry
          are distinguishable. Formatted from the date's own digits — never a
          Date read back in the host's zone. */}
      <Stack.Screen options={{ title: routeTitle(formatDateline(date)) }} />
      {/* The dateline is this edition's date, never "today", which is the whole
          point of reading Monday's paper on Wednesday. It comes from the URL,
          so it is right before the edition row lands. */}
      <Masthead edition={edition.data?.date ?? date} onPressDateline={() => router.push('/archive')} />
      <CategoryNav
        // This edition's own categories, server-injected with `home` first — a
        // day that filed nothing under Sport does not offer Sport.
        categories={edition.data?.categories ?? []}
        active={category}
        onSelect={selectCategory}
      />

      {state ? (
        <ScreenState
          kind={state}
          {...emptyCopy(state, date, category)}
          onAction={state === 'empty' ? undefined : () => feed.refetch()}
        />
      ) : (
        <FlatList
          data={articles}
          keyExtractor={keyOf}
          renderItem={({ item }) => (
            <ArticleCard
              item={item}
              onPress={() => router.push({ pathname: '/article/[id]', params: { id: item.id } })}
            />
          )}
          ItemSeparatorComponent={() => (
            <View style={[styles.hairline, { borderTopColor: colors.ruleHair }]} />
          )}
          contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            // The feed's own footer, and the same rule as the front page: no
            // spinner, and the end of the edition said in the paper's words.
            feed.hasNextPage ? null : (
              <View style={styles.end}>
                <View style={[styles.endRule, { borderTopColor: colors.ruleStrong }]} />
                <Text style={[type.slug, styles.endText, { color: colors.secondary }]}>
                  End of daily edition
                </Text>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

/**
 * A day the paper did not print, and a date that is not a date, get the same
 * treatment: an empty state, in the paper's own words. Not `error`, not
 * `missing` — nothing failed and nothing was withdrawn; the paper simply has no
 * issue for that day, which is true of three days in four.
 *
 * Not in ticket 18's approved copy table, which has no line for this — same
 * standing as the front page's `emptyCopy` and the archive's.
 */
function NoEdition({ date }: { date?: string }) {
  const { colors } = useTheme();
  const dateline = date ? formatDateline(date) : '';

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen options={{ title: routeTitle(dateline || 'No edition') }} />
      <Masthead edition={date} onPressDateline={() => router.push('/archive')} />
      <ScreenState
        kind="empty"
        slug="No edition that day"
        line={
          dateline
            ? `The paper published no issue on ${dateline}. Most days carry none.`
            : 'That is not a date the paper prints. Editions are dated like 2026-08-27.'
        }
        sub="The archive lists every day that has one."
        actionLabel="The archive"
        onAction={() => router.push('/archive')}
      />
    </SafeAreaView>
  );
}

const keyOf = (item: FeedItem) => item.id;

/** The other empty: the edition exists, this section of it does not. Also
 *  outside ticket 18's table, and worded as the front page's is. */
function emptyCopy(state: ScreenStateKind, date: string, category: string) {
  if (state !== 'empty') return {};
  return {
    slug: 'Nothing in this section',
    line: `The edition of ${formatDateline(date)} has no articles filed under ${categoryLabel(category)}.`,
  };
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  hairline: {
    borderTopWidth: 1,
  },
  end: {
    marginTop: 40,
    alignItems: 'center',
  },
  endRule: {
    borderTopWidth: 2,
    width: 48,
    marginBottom: 18,
  },
  endText: {
    textAlign: 'center',
  },
});
