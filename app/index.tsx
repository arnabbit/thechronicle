import { onlineManager } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LATEST } from '@/src/api/endpoints';
import { useEdition, useEditionArticles } from '@/src/api/queries';
import type { FeedItem } from '@/src/api/types';
import { isNotFound } from '@/src/api/client';
import { categoryLabel } from '@/src/lib/category';
import { ArticleCard } from '@/src/ui/ArticleCard';
import { CategoryNav } from '@/src/ui/CategoryNav';
import { Masthead } from '@/src/ui/Masthead';
import { ScreenState, type ScreenStateKind } from '@/src/ui/ScreenState';
import { useTheme } from '@/src/theme/useTheme';
import { type } from '@/src/theme/type';

// Today's paper. A route file: it reads its params, picks a state, and composes
// from src/.
//
// Both queries address the edition as `latest`, in parallel — one round trip
// each against a possibly-cold dyno, rather than resolving today's date first
// and then fetching with it.

export default function TodaysPaper() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ category?: string }>();
  // The active category lives in the URL, not component state, so a filtered
  // view is shareable and web back works.
  const category = params.category ?? 'home';

  const edition = useEdition(LATEST);
  const feed = useEditionArticles(LATEST, category);

  const articles = useMemo(
    () => feed.data?.pages.flatMap((page) => page.items) ?? [],
    [feed.data],
  );

  const selectCategory = useCallback((slug: string) => {
    router.setParams({ category: slug === 'home' ? undefined : slug });
  }, []);

  const loadMore = useCallback(() => {
    if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
  }, [feed]);

  const state = screenState(feed.status, feed.error, articles.length);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      {/* The dateline shows the edition's own date, never the word "today", so
          a reader looking at Monday's paper on Wednesday is already told. */}
      <Masthead edition={edition.data?.date ?? articles[0]?.edition} />
      <CategoryNav
        // The nav is scoped to *this* edition, which is what makes a past
        // edition's categories right rather than today's.
        categories={edition.data?.categories ?? []}
        active={category}
        onSelect={selectCategory}
      />

      {state ? (
        <ScreenState
          kind={state}
          {...emptyCopy(state, category)}
          onAction={state === 'empty' ? undefined : () => feed.refetch()}
        />
      ) : (
        <FlatList
          data={articles}
          keyExtractor={keyOf}
          renderItem={({ item }) => <ArticleCard item={item} />}
          ItemSeparatorComponent={() => (
            <View style={[styles.hairline, { borderTopColor: colors.ruleHair }]} />
          )}
          contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            // No spinner: a page that is still arriving says nothing, and the
            // rows appear when they do. The end marker is the paper's own.
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

const keyOf = (item: FeedItem) => item.id;

/** `null` means "there is content to render". Query's `status` no longer maps
 *  one-to-one onto the union: a failed fetch while offline is not an error. */
function screenState(
  status: 'pending' | 'error' | 'success',
  error: unknown,
  count: number,
): ScreenStateKind | null {
  if (status === 'pending') return 'loading';
  if (status === 'error') {
    if (isNotFound(error)) return 'missing';
    // On native this is always `true` until ticket 09 binds onlineManager to
    // NetInfo — React Native does not wire Query's online detection itself.
    // On web the browser's own online events already drive it.
    return onlineManager.isOnline() ? 'error' : 'offline';
  }
  return count === 0 ? 'empty' : null;
}

function emptyCopy(state: ScreenStateKind, category: string) {
  if (state !== 'empty') return {};
  return {
    slug: 'Nothing in this section',
    line: `Today's edition has no articles filed under ${categoryLabel(category)}.`,
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
