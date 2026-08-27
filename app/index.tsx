import { onlineManager } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LATEST } from '@/src/api/endpoints';
import {
  useEdition,
  useEditionArticles,
  usePrefetchBodies,
  usePrefetchEditions,
} from '@/src/api/queries';
import type { FeedItem } from '@/src/api/types';
import { categoryLabel } from '@/src/lib/category';
import { useNavigator } from '@/src/store/navigator';
import { screenState } from '@/src/lib/screenState';
import { routeTitle } from '@/src/lib/title';
import { ArticleCard } from '@/src/ui/ArticleCard';
import { FeedSlot } from '@/src/ui/FeedSlot';
import { CategoryNav } from '@/src/ui/CategoryNav';
import { Masthead } from '@/src/ui/Masthead';
import { ScreenState, type ScreenStateKind } from '@/src/ui/ScreenState';
import { useTheme } from '@/src/theme/useTheme';

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

  // The dateline is the period control (ticket 17), and the navigator it
  // opens is mounted once at the root — so this is an action, not a component.
  const openNavigator = useNavigator((state) => state.openNavigator);

  const edition = useEdition(LATEST);
  const feed = useEditionArticles(LATEST, category);

  const articles = useMemo(
    () => feed.data?.pages.flatMap((page) => page.items) ?? [],
    [feed.data],
  );

  // After first paint: the bodies behind the rows the reader can see, so the
  // durable cache holds articles and not just headlines, and the archive index
  // the dateline leads to.
  usePrefetchBodies(articles);
  usePrefetchEditions();

  const selectCategory = useCallback((slug: string) => {
    router.setParams({ category: slug === 'home' ? undefined : slug });
  }, []);

  const loadMore = useCallback(() => {
    if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
  }, [feed]);

  // Connectivity is read here rather than inside the selector, which keeps the
  // selector pure. The root layout binds the online manager to NetInfo at boot,
  // so this is a real answer on Android as well as on web.
  //
  // `fetchStatus` goes with it: Query *pauses* a fetch when it believes it is
  // offline rather than failing it, so an offline reader's query sits at
  // `pending` forever and the selector would call it loading. Paused with
  // nothing to show is the offline notice; paused with a cached edition
  // underneath it is still the edition.
  const state = screenState({
    status: feed.status,
    error: feed.error,
    online: onlineManager.isOnline(),
    paused: feed.fetchStatus === 'paused',
    count: articles.length,
  });

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      {/* The front page is the paper itself, so it names nothing else. It still
          has to say so: without a title of its own, backing out of an article
          left the article's headline in the tab. */}
      <Stack.Screen options={{ title: routeTitle() }} />
      {/* The dateline shows the edition's own date, never the word "today", so
          a reader looking at Monday's paper on Wednesday is already told. */}
      <Masthead
        edition={edition.data?.date ?? articles[0]?.edition}
        onPressDateline={() => openNavigator()}
      />
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
            // No spinner: a page that is still arriving says nothing, and the
            // rows appear when they do. What sits at the end is a *slot* — the
            // paper's own closing marker, and above it at most one prompt.
            feed.hasNextPage ? null : <FeedSlot label="End of daily edition" />
          }
        />
      )}
    </SafeAreaView>
  );
}

const keyOf = (item: FeedItem) => item.id;

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
});
