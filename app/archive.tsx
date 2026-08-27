import { onlineManager } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEditions } from '@/src/api/queries';
import type { EditionRow } from '@/src/api/types';
import { screenState } from '@/src/lib/screenState';
import { routeTitle } from '@/src/lib/title';
import { EditionCard } from '@/src/ui/EditionCard';
import { Masthead } from '@/src/ui/Masthead';
import { ScreenState, type ScreenStateKind } from '@/src/ui/ScreenState';
import { useTheme } from '@/src/theme/useTheme';
import { type } from '@/src/theme/type';

// The archive: every edition the paper has published, newest first.
//
// A list of the editions that exist, not a calendar. Ticket 02 measured roughly
// three-quarters of calendar days with no edition at all, so a date picker
// would advertise capacity the paper does not have and render mostly dead
// cells.
//
// The period switcher belongs at the top of this screen and is ticket 08's; the
// slot is left unbuilt rather than stubbed with a control that goes nowhere.

const TITLE = routeTitle('Archive');

export default function Archive() {
  const { colors } = useTheme();

  const editions = useEditions();

  const rows = useMemo(
    () => editions.data?.pages.flatMap((page) => page.items) ?? [],
    [editions.data],
  );

  const loadMore = useCallback(() => {
    if (editions.hasNextPage && !editions.isFetchingNextPage) editions.fetchNextPage();
  }, [editions]);

  // Connectivity is read here, not inside the selector, exactly as the front
  // page does it — a failed fetch with no connection is offline, not an error.
  const state = screenState({
    status: editions.status,
    error: editions.error,
    online: onlineManager.isOnline(),
    count: rows.length,
  });

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      {/* The route names itself, so a browser tab and a history entry are
          distinguishable — set here on the stack screen, never by the masthead.
          The stack option is now the whole mechanism: the root layout carries it
          to the tab, so the `Head` element that used to sit beside it is gone. */}
      <Stack.Screen options={{ title: TITLE }} />

      {/* No dateline here: the archive is not an edition, and the masthead
          renders one only when it is given a date. */}
      <Masthead />
      <View style={styles.sectionHead}>
        <Text style={[type.slug, { color: colors.primary }]}>All editions</Text>
      </View>

      {state ? (
        <ScreenState
          kind={state}
          {...emptyCopy(state)}
          onAction={state === 'empty' ? undefined : () => editions.refetch()}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={keyOf}
          renderItem={({ item }) => (
            <EditionCard
              item={item}
              onPress={() =>
                router.push({ pathname: '/edition/[date]', params: { date: item.date } })
              }
            />
          )}
          ItemSeparatorComponent={() => (
            <View style={[styles.hairline, { borderTopColor: colors.ruleHair }]} />
          )}
          contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            // The feed's footer, and the same rule: no spinner. A page still
            // arriving says nothing; the end of the archive says so in the
            // paper's own words.
            editions.hasNextPage ? null : (
              <View style={styles.end}>
                <View style={[styles.endRule, { borderTopColor: colors.ruleStrong }]} />
                <Text style={[type.slug, styles.endText, { color: colors.secondary }]}>
                  End of the archive
                </Text>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const keyOf = (item: EditionRow) => item.date;

/** Not in ticket 18's table, which has no archive line: the archive is empty
 *  only before the paper's first edition. Says that, without sounding broken. */
function emptyCopy(state: ScreenStateKind) {
  if (state !== 'empty') return {};
  return {
    slug: 'Nothing in the archive',
    line: 'The paper has not published an edition yet.',
  };
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  sectionHead: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 4,
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
