import { onlineManager, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { prefetchArticleBody, useArticle } from '@/src/api/queries';
import { canShareNatively } from '@/src/capabilities';
import type { Article } from '@/src/api/types';
import { categoryLabel } from '@/src/lib/category';
import { formatLongDate } from '@/src/lib/date';
import { screenState } from '@/src/lib/screenState';
import { shareMessage } from '@/src/lib/share';
import { sourceLabel } from '@/src/lib/source';
import { useBookmarks } from '@/src/store/bookmarks';
import { routeTitle } from '@/src/lib/title';
import { BackLink } from '@/src/ui/BackLink';
import { Masthead } from '@/src/ui/Masthead';
import { ScreenState } from '@/src/ui/ScreenState';
import { useTheme } from '@/src/theme/useTheme';
import { type } from '@/src/theme/type';

// One article, read top to bottom: kicker, headline, edition date, body,
// developments, sources.
//
// The id is opaque — no length check, no shape validation. Ticket 01 made ids
// content-derived and the server owns what is a valid one; a client-side guess
// would only invent a second, wrong answer.

export default function ArticleDetail() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const article = useArticle(id);

  // Connectivity is read here, not inside the selector, exactly as the front
  // page does it — the selector stays pure and the fifth branch (offline vs
  // error) is the same one function for every screen.
  const state = screenState({
    status: article.status,
    error: article.error,
    online: onlineManager.isOnline(),
    // Paused, not failed: Query holds an offline fetch open instead of
    // erroring it. An article already in the durable cache reads as `success`
    // and never gets here, which is what makes the tunnel work.
    paused: article.fetchStatus === 'paused',
    // A record read has no empty state: success means the article is here.
    count: article.data ? 1 : 0,
  });

  const openSource = useCallback(async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      console.warn('could not open source link', url, error);
    }
  }, []);

  // A withdrawn, unknown or hidden article renders `missing` in place and keeps
  // its URL. Routing away would destroy the URL someone shared and make the
  // back button lie about where they went.
  const title = routeTitle(state === 'missing' ? 'Not in the paper' : article.data?.headline);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen options={{ title }} />
      <BackLink />
      <Masthead />

      {state || !article.data ? (
        <ScreenState
          kind={state ?? 'loading'}
          // `missing` offers "Today's paper", so it goes there rather than
          // back — the reader's history may not contain a page that works.
          onAction={state === 'missing' ? () => router.replace('/') : () => article.refetch()}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Body article={article.data} onPressSource={openSource} id={id} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Body({
  article,
  onPressSource,
  id,
}: {
  article: Article;
  onPressSource: (url: string) => void;
  id: string;
}) {
  const { colors } = useTheme();
  const date = formatLongDate(article.edition);

  return (
    <>
      <Text style={[type.kicker, { color: colors.primary }]}>
        {categoryLabel(article.category)}
      </Text>
      <Text style={[type.headlineLarge, styles.headline, { color: colors.primary }]}>
        {article.headline}
      </Text>
      {date ? <Text style={[type.meta, { color: colors.secondary }]}>{date}</Text> : null}
      <Controls id={id} headline={article.headline} />
      <View style={[styles.rule, { borderTopColor: colors.ruleStrong }]} />

      {article.body.map((paragraph, index) => (
        <Text
          key={index}
          style={[type.body, styles.paragraph, { color: colors.onSurface }]}
        >
          {paragraph}
        </Text>
      ))}

      {/* An article with none of these omits the heading rather than printing
          it over nothing — three-quarters of the archive is sparse. */}
      {article.developments.length > 0 ? (
        <Section heading="Developments">
          {article.developments.map((development, index) => (
            <Text
              key={index}
              style={[type.sentence, styles.development, { color: colors.onSurface }]}
            >
              {development.summary}
            </Text>
          ))}
        </Section>
      ) : null}

      {article.sourcePosts.length > 0 ? (
        <Section heading="Sources">
          {article.sourcePosts.map((post, index) => (
            <Pressable
              key={`${post.postUrl}-${index}`}
              accessibilityRole="link"
              onPress={() => onPressSource(post.postUrl)}
              style={styles.source}
            >
              <Text style={[type.sentence, { color: colors.primary }]}>
                {sourceLabel(post)}
              </Text>
            </Pressable>
          ))}
        </Section>
      ) : null}
    </>
  );
}

/**
 * Keep it, or hand it to someone.
 *
 * No prototype covers these two controls, so they are built from the paper's
 * own vocabulary rather than invented: ruled standing caps at the dateline's
 * weight, on the dateline's line. Above the heavy rule, so they read as part
 * of the masthead furniture rather than as an interruption between the
 * headline and the first paragraph — and reachable without scrolling a long
 * article to decide to keep it.
 */
function Controls({ id, headline }: { id: string; headline: string }) {
  const { colors } = useTheme();
  const client = useQueryClient();
  const bookmarks = useBookmarks((state) => state.bookmarks);
  const save = useBookmarks((state) => state.save);
  const remove = useBookmarks((state) => state.remove);
  const [copied, setCopied] = useState(false);

  const saved = bookmarks.some((mark) => mark.id === id);

  const toggleSave = useCallback(() => {
    if (saved) {
      remove(id);
      return;
    }
    save(id, Date.now());
    // Fire and forget. The offline cache prefetches only the current
    // edition's bodies, so a bookmark made from a past edition or a search
    // result would otherwise be a kept thing with nothing kept.
    prefetchArticleBody(client, id);
  }, [saved, remove, save, id, client]);

  const share = useCallback(async () => {
    const message = shareMessage(headline, id);
    try {
      // One call on both platforms: react-native-web's `Share` already
      // delegates to `navigator.share` and rejects when it is absent, so the
      // *call* needs no branch. Only the label below does.
      await Share.share({ message });
    } catch {
      // Every failure lands here, refusal included — and a reader who
      // dismissed the sheet has still not lost the link.
      await Clipboard.setStringAsync(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    }
  }, [headline, id]);

  return (
    <View style={styles.controls}>
      <Control
        label={saved ? 'Saved' : 'Save'}
        accessibilityLabel={saved ? 'Remove from saved' : 'Save this article'}
        onPress={toggleSave}
        colors={colors}
      />
      <Control
        // The capability flag decides the *word*, never the call: on a browser
        // with no share sheet, "Share" would name something that cannot
        // happen.
        label={copied ? 'Link copied' : canShareNatively ? 'Share' : 'Copy link'}
        accessibilityLabel="Share this article"
        onPress={share}
        colors={colors}
      />
    </View>
  );
}

function Control({
  label,
  accessibilityLabel,
  onPress,
  colors,
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  colors: { primary: string; ruleStrong: string };
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={styles.controlHit}
    >
      <Text style={[type.kicker, styles.control, { color: colors.primary, borderBottomColor: colors.ruleStrong }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Section({ heading, children }: { heading: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <View style={[styles.sectionRule, { borderTopColor: colors.ruleStrong }]} />
      <Text style={[type.slug, styles.sectionHeading, { color: colors.primary }]}>{heading}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 64,
    maxWidth: 720,
  },
  headline: {
    marginTop: 10,
    marginBottom: 10,
  },
  controls: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 16,
  },
  controlHit: {
    paddingVertical: 8,
    paddingRight: 4,
  },
  control: {
    borderBottomWidth: 1,
    paddingBottom: 3,
  },
  rule: {
    borderTopWidth: 2,
    width: 48,
    marginTop: 24,
    marginBottom: 24,
  },
  paragraph: {
    marginBottom: 18,
  },
  section: {
    marginTop: 28,
  },
  sectionRule: {
    borderTopWidth: 2,
    width: 48,
    marginBottom: 18,
  },
  sectionHeading: {
    marginBottom: 16,
  },
  development: {
    marginBottom: 14,
  },
  source: {
    paddingVertical: 8,
  },
});
