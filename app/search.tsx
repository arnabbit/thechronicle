import { onlineManager } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSearch } from '@/src/api/queries';
import type { FeedItem } from '@/src/api/types';
import { normaliseQuery, searchQueryState } from '@/src/lib/searchQuery';
import { screenState } from '@/src/lib/screenState';
import { routeTitle } from '@/src/lib/title';
import { ArticleCard } from '@/src/ui/ArticleCard';
import { Masthead } from '@/src/ui/Masthead';
import { ScreenState } from '@/src/ui/ScreenState';
import { useTheme } from '@/src/theme/useTheme';
import { type } from '@/src/theme/type';

// Search: its own destination, not a tab and not a lens over the feed. The
// period navigator is about time; this is about finding one article again.
//
// The query lives in the URL, exactly as the active category does on the front
// page, so a search is shareable and web back works. The field below is a view
// of `?q=`, not a second source of truth — everything rendered here derives
// from the URL param.
//
// Nothing here is reachable while `hasSearch` is off: the masthead affordance
// is gated on it. The route itself stays addressable by URL, which is how it
// gets verified before the endpoint ships.

const TITLE = routeTitle('Search');

/** Long enough that a word is typed rather than spelled out one request at a
 *  time, short enough that the results feel like they follow the typing. */
const URL_WRITE_MS = 300;

export default function Search() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ q?: string }>();
  const urlQuery = typeof params.q === 'string' ? params.q : '';

  // The field mirrors the URL. `written` remembers what this screen last put
  // there, so a URL change that came from *outside* — a paste, a back, a
  // shared link — reloads the field, while the debounced write of the reader's
  // own typing does not fight the keystrokes that produced it.
  const [text, setText] = useState(urlQuery);
  const written = useRef(urlQuery);

  useEffect(() => {
    if (urlQuery === written.current) return;
    written.current = urlQuery;
    setText(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    if (text === written.current) return;
    const timer = setTimeout(() => {
      written.current = text;
      router.setParams({ q: text.trim() ? text : undefined });
    }, URL_WRITE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const q = normaliseQuery(urlQuery);
  const bounds = searchQueryState(urlQuery);

  // Validation happens before the request, not after a 400: the hook is gated
  // on the endpoint's own 2..100 bounds, so the first keystroke of every search
  // costs nothing.
  const results = useSearch(q);

  const articles = useMemo(
    () => results.data?.pages.flatMap((page) => page.items) ?? [],
    [results.data],
  );

  const loadMore = useCallback(() => {
    if (results.hasNextPage && !results.isFetchingNextPage) results.fetchNextPage();
  }, [results]);

  // Read here rather than inside the selector, exactly as the front page does
  // it — a failed fetch with no connection is offline, not an error, and
  // offline search says nothing search-specific about it.
  //
  // While the query is out of bounds no request has been made, so there is no
  // state to select: the screen is the field and nothing else.
  const state =
    bounds === 'ready'
      ? screenState({
          status: results.status,
          error: results.error,
          online: onlineManager.isOnline(),
          paused: results.fetchStatus === 'paused',
          count: articles.length,
        })
      : null;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Set on the stack screen only — the root layout is what carries it to
          the browser tab. */}
      <Stack.Screen options={{ title: TITLE }} />

      {/* No dateline: search is not an edition. */}
      <Masthead showSearch={false} />

      <View style={styles.field}>
        <View style={[styles.fieldRule, { borderBottomColor: colors.ruleStrong }]}>
          <TextInput
            // An empty query is a bare *focused* field: the reader came here to
            // type, so the keyboard is already up.
            autoFocus
            value={text}
            onChangeText={setText}
            placeholder="Search the archive"
            placeholderTextColor={colors.secondary}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search the archive"
            selectionColor={colors.primary}
            style={[type.dek, styles.input, { color: colors.primary }]}
          />
        </View>
        {/* Nothing under the field. No trending, no popular, no recent
            queries: the data holds no importance signal, and inventing one
            would be fake. */}
      </View>

      {state ? (
        <ScreenState
          kind={state}
          {...emptyCopy(state, q)}
          onAction={state === 'empty' ? undefined : () => results.refetch()}
        />
      ) : bounds === 'ready' ? (
        <FlatList
          data={articles}
          keyExtractor={keyOf}
          renderItem={({ item }) => (
            <ArticleCard
              item={item}
              // The feed hides the edition date because every row shares one.
              // Search spans months, so the date is what makes a result
              // legible outside its edition. One prop, not a second row.
              showEdition
              onPress={() => router.push({ pathname: '/article/[id]', params: { id: item.id } })}
            />
          )}
          ItemSeparatorComponent={() => (
            <View style={[styles.hairline, { borderTopColor: colors.ruleHair }]} />
          )}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            // The feed's footer rule, and the same no-spinner rule with it.
            results.hasNextPage ? null : (
              <View style={styles.end}>
                <View style={[styles.endRule, { borderTopColor: colors.ruleStrong }]} />
                <Text style={[type.slug, styles.endText, { color: colors.secondary }]}>
                  End of results
                </Text>
              </View>
            )
          }
        />
      ) : null}
    </SafeAreaView>
  );
}

const keyOf = (item: FeedItem) => item.id;

/**
 * Ticket 18's `empty` copy for search, and it is not to be reworded.
 *
 * The query is named back verbatim — a typo included, which is the point: the
 * engine is Mongo `$text` with no fuzzy matching, so the sub line is the only
 * thing that explains why a near-miss returned nothing.
 *
 * The other four kinds keep `ScreenState`'s own presets. `missing` is
 * unreachable once the endpoint exists — a search with no matches is `empty`,
 * not a 404 — but until then a request against the absent route lands there,
 * with `ScreenState`'s article-shaped wording, which is a deploy artifact and
 * not a state a reader can reach while `hasSearch` is off.
 */
function emptyCopy(state: string, q: string) {
  if (state !== 'empty') return {};
  return {
    slug: 'No matches',
    line: `Nothing in the archive matches "${q}".`,
    sub: 'Search matches whole words',
  };
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  field: {
    paddingHorizontal: 24,
    paddingTop: 22,
  },
  fieldRule: {
    borderBottomWidth: 2,
  },
  input: {
    paddingVertical: 8,
    // The field's own heavy rule is its focus treatment, so the browser's
    // outline would be a second one drawn over it.
    outlineWidth: 0,
  },
  list: {
    paddingHorizontal: 24,
    paddingTop: 8,
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
