import { onlineManager, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { findCachedFeedItem, useSavedArticles } from '@/src/api/queries';
import { categoryLabel } from '@/src/lib/category';
import { rowState } from '@/src/lib/rowState';
import { routeTitle } from '@/src/lib/title';
import { savedNewestFirst, useBookmarks } from '@/src/store/bookmarks';
import { BackLink } from '@/src/ui/BackLink';
import { Masthead } from '@/src/ui/Masthead';
import { Notice } from '@/src/ui/ScreenState';
import { SavedRow } from '@/src/ui/SavedRow';
import { useTheme } from '@/src/theme/useTheme';
import { type } from '@/src/theme/type';

// Everything the reader has kept, newest save first.
//
// A list, not a search: flat, no edition grouping, no cap, and ordered by when
// it was saved rather than by edition date, because it is a record of what the
// reader did rather than a slice of the paper.
//
// This screen never shows a whole-screen `offline` or `error` state. It always
// has content — the ids are on the device — so what can be missing is missing
// per row, which is what `rowState` is for. The only whole-screen state it has
// is empty.

const TITLE = routeTitle('Saved');

export default function Saved() {
  const { colors } = useTheme();
  const client = useQueryClient();
  const bookmarks = useBookmarks((state) => state.bookmarks);
  const remove = useBookmarks((state) => state.remove);

  const ordered = useMemo(() => savedNewestFirst(bookmarks), [bookmarks]);
  const ids = useMemo(() => ordered.map((mark) => mark.id), [ordered]);

  // One revalidation per kept id, on entry and nowhere else.
  const reads = useSavedArticles(ids);
  const online = onlineManager.isOnline();

  const rows = useMemo(
    () =>
      ordered.map((mark, index) => {
        const read = reads[index];
        const article = read?.data;
        // No article record means no headline of its own — but the feed page
        // this was saved from is usually still in the durable cache, and that
        // is what keeps an offline row legible instead of blank.
        const fallback = article ? undefined : findCachedFeedItem(client, mark.id);
        return {
          id: mark.id,
          kicker: categoryLabel(article?.category ?? fallback?.category ?? ''),
          headline: article?.headline ?? fallback?.headline,
          dek: article?.dek ?? fallback?.dek,
          state: rowState({
            hasArticle: Boolean(article),
            error: read?.error,
            online,
            paused: read?.fetchStatus === 'paused',
          }),
        };
      }),
    [ordered, reads, client, online],
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen options={{ title: TITLE }} />
      <BackLink />
      {/* No dateline: the saved list is not an edition. Its own affordance is
          hidden, because a control pointing at the screen you are on is
          furniture pretending to be a control. */}
      <Masthead showSaved={false} />

      <View style={styles.sectionHead}>
        <Text style={[type.slug, { color: colors.primary }]}>Saved</Text>
        {/* The header says so, which is what makes the degraded rows below it
            make sense rather than look broken. */}
        {online ? null : (
          <Text style={[type.kicker, styles.tag, { color: colors.secondary, borderColor: colors.ruleHair }]}>
            Offline
          </Text>
        )}
      </View>

      {rows.length === 0 ? (
        <Notice
          slug="Nothing saved yet"
          line="Articles you save are kept on this device."
          // Web only. On the phone the sentence above already says "this
          // device"; on a laptop the reader's phone list is the thing they are
          // wondering about, and silence there reads as a bug.
          sub={Platform.OS === 'web' ? 'A list saved on your phone will not appear here' : undefined}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={keyOf}
          renderItem={({ item }) => (
            <SavedRow
              kicker={item.kicker}
              headline={item.headline}
              dek={item.dek}
              state={item.state}
              onPress={() => router.push({ pathname: '/article/[id]', params: { id: item.id } })}
              onRemove={() => remove(item.id)}
            />
          )}
          ItemSeparatorComponent={() => (
            <View style={[styles.hairline, { borderTopColor: colors.ruleHair }]} />
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const keyOf = (row: { id: string }) => row.id;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  sectionHead: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tag: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  hairline: {
    borderTopWidth: 1,
  },
});
