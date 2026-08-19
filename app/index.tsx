import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChronicleColors } from '@/constants/theme';

type FeedMode = 'latest' | 'history' | 'weekly' | 'monthly' | 'yearly';
type PeriodType = 'weekly' | 'monthly' | 'yearly';

interface Article {
  id: string;
  mongo_id?: string;
  headline: string;
  published_date: string;
  date_key?: string;
  _dateKey?: string;
  category: string;
  body: string[];
  developments?: {
    summary: string;
    sourcePostUrls?: string[];
    sourcePostNumbers?: number[];
  }[];
  sourcePosts?: {
    postUrl: string;
    postNumber?: number | null;
    feedOrder?: number | null;
    feedOrderMeaning?: string;
    sourceHeadline?: string;
    mediaTypes?: string[];
    captureMethods?: string[];
    slideCount?: number;
  }[];
}

interface Category {
  name: string;
  slug: string;
}

interface DateArchiveItem {
  date_key: string;
  published_date: string;
  article_count: number;
  categories: string[];
}

interface PaginationInfo {
  page: number;
  per_page: number;
  total: number;
  has_next: boolean;
  next_page: number | null;
  next_cursor?: string | null;
}

interface RecapSection {
  title: string;
  body: string[];
}

interface RecapStory {
  articleId: string;
  headline: string;
  category?: string;
  date_key?: string;
  published_date?: string;
}

interface Recap {
  id: string;
  period_type: PeriodType;
  period_start: string;
  period_end: string;
  title: string;
  summary: string;
  sections?: RecapSection[];
  topStories?: RecapStory[];
  stats?: {
    article_count?: number;
  };
}

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://fayz-news-backend.onrender.com';

const DRAWER_ITEMS: { key: FeedMode; label: string; description: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'latest', label: 'Latest News', description: 'Today\'s edition', icon: 'newspaper-outline' },
  { key: 'history', label: 'Update History', description: 'Browse past daily editions', icon: 'calendar-outline' },
  { key: 'weekly', label: 'Weekly Recap', description: 'The week in review', icon: 'calendar-number-outline' },
  { key: 'monthly', label: 'Monthly Recap', description: 'Major stories and themes', icon: 'albums-outline' },
  { key: 'yearly', label: 'Yearly Recap', description: 'The year at a glance', icon: 'trophy-outline' },
];

async function requestJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { signal });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

async function fetchCategories(date?: string, signal?: AbortSignal): Promise<Category[]> {
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  const suffix = params.toString() ? `?${params}` : '';
  const data = await requestJson<{ categories: Category[] }>(`/api/categories${suffix}`, signal);
  return data.categories.length ? data.categories : [{ name: 'Home', slug: 'home' }];
}

async function fetchDates(signal?: AbortSignal): Promise<DateArchiveItem[]> {
  const data = await requestJson<{ dates: DateArchiveItem[] }>('/api/dates?limit=120', signal);
  return data.dates;
}

async function fetchArticles({
  cursor,
  category,
  date,
  perPage = 10,
  signal,
}: {
  cursor: string | null;
  category: string;
  date?: string | null;
  perPage?: number;
  signal?: AbortSignal;
}): Promise<{ articles: Article[]; pagination: PaginationInfo; date_key: string | null }> {
  const params = new URLSearchParams({ per_page: String(perPage) });
  if (cursor) params.set('cursor', cursor);
  if (date) params.set('date', date);
  if (category && category !== 'home') params.set('category', category);
  return requestJson(`/api/articles?${params}`, signal);
}

async function fetchRecaps(periodType: PeriodType, signal?: AbortSignal): Promise<Recap[]> {
  const data = await requestJson<{ recaps: Recap[] }>(
    `/api/recaps?period_type=${periodType}&limit=24`,
    signal,
  );
  return data.recaps;
}

function shortDate(dateKey?: string) {
  if (!dateKey) return '';
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return dateKey;
  return date.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function periodLabel(recap: Recap) {
  return recap.period_start === recap.period_end
    ? shortDate(recap.period_start)
    : `${shortDate(recap.period_start)} - ${shortDate(recap.period_end)}`;
}

function CategoryNav({
  categories,
  active,
  onSelect,
}: {
  categories: Category[];
  active: string;
  onSelect: (slug: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoryRow}
    >
      {categories.map((cat) => {
        const isActive = cat.slug === active;
        return (
          <Pressable key={cat.slug} onPress={() => onSelect(cat.slug)}>
            <View style={isActive ? styles.categoryActive : styles.categoryInactive}>
              <Text
                style={[
                  styles.categoryText,
                  isActive ? styles.categoryTextActive : styles.categoryTextInactive,
                ]}
              >
                {cat.name}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function DateRail({
  dates,
  selectedDate,
  onSelect,
}: {
  dates: DateArchiveItem[];
  selectedDate: string | null;
  onSelect: (dateKey: string) => void;
}) {
  if (!dates.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.dateRow}
    >
      {dates.map((item) => {
        const isActive = item.date_key === selectedDate;
        return (
          <Pressable key={item.date_key} onPress={() => onSelect(item.date_key)}>
            <View style={isActive ? styles.dateActive : styles.dateInactive}>
              <Text style={[styles.dateText, isActive ? styles.dateTextActive : styles.dateTextInactive]}>
                {shortDate(item.date_key)}
              </Text>
              <Text style={styles.dateMeta}>{item.article_count} stories</Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function ArticleCard({ article }: { article: Article }) {
  const dateKey = article.date_key || article._dateKey;

  return (
    <View style={styles.articleContainer}>
      <View style={styles.articleMeta}>
        <Text style={styles.articleDate}>{dateKey ? shortDate(dateKey) : article.published_date}</Text>
        <Text style={styles.articleCategory}>{article.category}</Text>
      </View>
      <View style={styles.articleContent}>
        <Text style={styles.articleHeadline}>{article.headline}</Text>
        {article.body.map((paragraph, i) => (
          <Text key={`${article.id}-${i}`} style={styles.articleBody}>
            {paragraph}
          </Text>
        ))}
        {article.developments && article.developments.length > 0 ? (
          <View style={styles.developmentsBlock}>
            <Text style={styles.developmentsTitle}>Developments</Text>
            {article.developments.map((development, i) => (
              <Text key={`${article.id}-development-${i}`} style={styles.developmentItem}>
                - {development.summary}
              </Text>
            ))}
          </View>
        ) : null}
        {article.sourcePosts && article.sourcePosts.length > 1 ? (
          <Text style={styles.sourceCount}>
            Combined from {article.sourcePosts.length} posts
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function RecapCard({ recap }: { recap: Recap }) {
  return (
    <View style={styles.articleContainer}>
      <View style={styles.articleMeta}>
        <Text style={styles.articleDate}>{periodLabel(recap)}</Text>
        <Text style={styles.articleCategory}>{recap.period_type} recap</Text>
      </View>
      <View style={styles.articleContent}>
        <Text style={styles.articleHeadline}>{recap.title}</Text>
        <Text style={styles.articleBody}>{recap.summary}</Text>
        {recap.topStories && recap.topStories.length > 0 ? (
          <View style={styles.developmentsBlock}>
            <Text style={styles.developmentsTitle}>Top stories</Text>
            {recap.topStories.slice(0, 5).map((story) => (
              <Text key={`${recap.id}-${story.articleId}`} style={styles.developmentItem}>
                - {story.headline}
              </Text>
            ))}
          </View>
        ) : null}
        {recap.sections && recap.sections.length > 0 ? (
          <View style={styles.recapSections}>
            {recap.sections.slice(0, 3).map((section) => (
              <View key={`${recap.id}-${section.title}`} style={styles.recapSection}>
                <Text style={styles.developmentsTitle}>{section.title}</Text>
                {section.body.slice(0, 3).map((line, index) => (
                  <Text key={`${section.title}-${index}`} style={styles.developmentItem}>
                    - {line}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Separator() {
  return <View style={styles.ruleLine} />;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

function Drawer({
  active,
  open,
  onClose,
  onSelect,
}: {
  active: FeedMode;
  open: boolean;
  onClose: () => void;
  onSelect: (mode: FeedMode) => void;
}) {
  if (!open) return null;

  return (
    <View style={styles.drawerOverlay}>
      <Pressable style={styles.drawerBackdrop} onPress={onClose} />
      <View style={styles.drawerPanel}>
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerTitle}>Sections</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close menu" onPress={onClose}>
            <Ionicons name="close" size={22} color={ChronicleColors.primary} />
          </Pressable>
        </View>
        {DRAWER_ITEMS.map((item) => {
          const isActive = item.key === active;
          return (
            <Pressable
              key={item.key}
              onPress={() => onSelect(item.key)}
              style={[styles.drawerItem, isActive && styles.drawerItemActive]}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={isActive ? ChronicleColors.primary : ChronicleColors.secondary}
              />
              <View style={styles.drawerItemText}>
                <Text style={[styles.drawerItemTitle, isActive && styles.drawerItemTitleActive]}>
                  {item.label}
                </Text>
                <Text style={styles.drawerItemDescription}>{item.description}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function ChronicleScreen() {
  const [mode, setMode] = useState<FeedMode>('latest');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([{ name: 'Home', slug: 'home' }]);
  const [activeCategory, setActiveCategory] = useState('home');
  const [dates, setDates] = useState<DateArchiveItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [recaps, setRecaps] = useState<Record<PeriodType, Recap[]>>({
    weekly: [],
    monthly: [],
    yearly: [],
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSeqRef = useRef(0);
  const loadingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const activePeriod = mode === 'weekly' || mode === 'monthly' || mode === 'yearly' ? mode : null;

  const activeDateLabel = useMemo(() => {
    if (mode === 'latest') return 'Latest edition';
    if (selectedDate) return shortDate(selectedDate);
    return 'Archive';
  }, [mode, selectedDate]);

  const loadShellData = useCallback(async (signal?: AbortSignal) => {
    const [categoryResult, dateResult] = await Promise.allSettled([
      fetchCategories(undefined, signal),
      fetchDates(signal),
    ]);

    if (categoryResult.status === 'fulfilled') {
      setCategories(categoryResult.value);
    }

    if (dateResult.status === 'fulfilled') {
      setDates(dateResult.value);
      setSelectedDate((current) => current || dateResult.value[0]?.date_key || null);
    }

    if (categoryResult.status === 'rejected' && dateResult.status === 'rejected') {
      throw categoryResult.reason;
    }
  }, []);

  const loadFeed = useCallback(
    async ({
      reset,
      nextCursor,
      signal,
    }: {
      reset: boolean;
      nextCursor: string | null;
      signal?: AbortSignal;
    }) => {
      if (loadingRef.current && !reset) return;
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const response = await fetchArticles({
          cursor: nextCursor,
          category: activeCategory,
          date: mode === 'history' ? selectedDate : null,
          signal,
        });

        setArticles((previous) => {
          const merged = reset ? response.articles : [...previous, ...response.articles];
          const byId = new Map<string, Article>();
          for (const article of merged) byId.set(article.mongo_id || article.id, article);
          return Array.from(byId.values());
        });
        setHasMore(response.pagination.has_next);
        setCursor(response.pagination.next_cursor || null);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError('The Chronicle could not load this edition.');
        }
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [activeCategory, mode, selectedDate],
  );

  const loadRecaps = useCallback(async (periodType: PeriodType, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchRecaps(periodType, signal);
      setRecaps((previous) => ({ ...previous, [periodType]: rows }));
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError('The Chronicle could not load this recap.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestSeq = ++requestSeqRef.current;
    setRefreshing(true);
    try {
      await loadShellData(controller.signal);
      if (requestSeq !== requestSeqRef.current) return;
      if (activePeriod) {
        await loadRecaps(activePeriod, controller.signal);
      } else {
        setArticles([]);
        setCursor(null);
        setHasMore(true);
        await loadFeed({ reset: true, nextCursor: null, signal: controller.signal });
      }
    } finally {
      if (requestSeq === requestSeqRef.current) setRefreshing(false);
    }
  }, [activePeriod, loadFeed, loadRecaps, loadShellData]);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    loadShellData(controller.signal).catch(() => setError('The Chronicle could not load the archive.'));
    return () => controller.abort();
  }, [loadShellData]);

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setArticles([]);
    setCursor(null);
    setHasMore(true);

    if (activePeriod) {
      loadRecaps(activePeriod, controller.signal);
      return () => controller.abort();
    }

    loadFeed({ reset: true, nextCursor: null, signal: controller.signal });
    return () => controller.abort();
  }, [activeCategory, activePeriod, loadFeed, loadRecaps, mode, selectedDate]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore || activePeriod) return;
    const controller = new AbortController();
    abortRef.current = controller;
    loadFeed({ reset: false, nextCursor: cursor, signal: controller.signal });
  }, [activePeriod, cursor, hasMore, loadFeed, loading]);

  const selectMode = useCallback((nextMode: FeedMode) => {
    setMode(nextMode);
    setDrawerOpen(false);
  }, []);

  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open sections"
            onPress={() => setDrawerOpen(true)}
            style={styles.menuButton}
          >
            <Ionicons name="menu" size={24} color={ChronicleColors.primary} />
          </Pressable>
          <Text style={styles.masthead}>THE CHRONICLE</Text>
        </View>
        <Text style={styles.issueLabel}>{activeDateLabel}</Text>
        {!activePeriod ? (
          <CategoryNav categories={categories} active={activeCategory} onSelect={setActiveCategory} />
        ) : null}
      </View>

      {mode === 'history' ? (
        <DateRail dates={dates} selectedDate={selectedDate} onSelect={setSelectedDate} />
      ) : null}

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );

  if (activePeriod) {
    const rows = recaps[activePeriod];
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RecapCard recap={item} />}
          ListHeaderComponent={renderHeader}
          ItemSeparatorComponent={Separator}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={ChronicleColors.primary} />
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.centeredLoader}>
                <ActivityIndicator size="small" color={ChronicleColors.primary} />
              </View>
            ) : (
              <EmptyState title="No recaps yet" body="Published recaps will appear here as each period is generated." />
            )
          }
        />
        <Drawer active={mode} open={drawerOpen} onClose={() => setDrawerOpen(false)} onSelect={selectMode} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <FlatList
        data={articles}
        keyExtractor={(item) => item.mongo_id || item.id}
        renderItem={({ item }) => <ArticleCard article={item} />}
        ListHeaderComponent={renderHeader}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={styles.listContent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={ChronicleColors.primary} />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centeredLoader}>
              <ActivityIndicator size="small" color={ChronicleColors.primary} />
            </View>
          ) : (
            <EmptyState title="No stories found" body="Try another date or category." />
          )
        }
        ListFooterComponent={
          loading && articles.length > 0 ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={ChronicleColors.primary} />
            </View>
          ) : !hasMore && articles.length > 0 ? (
            <View style={styles.endMarker}>
              <View style={styles.ruleLine} />
              <Text style={styles.endText}>{mode === 'history' ? 'END OF ARCHIVE EDITION' : 'END OF DAILY EDITION'}</Text>
            </View>
          ) : null
        }
      />
      <Drawer active={mode} open={drawerOpen} onClose={() => setDrawerOpen(false)} onSelect={selectMode} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ChronicleColors.background,
  },
  header: {
    backgroundColor: ChronicleColors.background,
    borderBottomWidth: 1,
    borderBottomColor: ChronicleColors.primary,
    paddingTop: 24,
    paddingBottom: 16,
  },
  titleRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    minHeight: 42,
  },
  menuButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    left: 18,
    position: 'absolute',
    top: 0,
    width: 42,
  },
  masthead: {
    fontFamily: 'Newsreader_700Bold_Italic',
    fontSize: 32,
    letterSpacing: -1.5,
    color: ChronicleColors.primary,
    textTransform: 'uppercase',
    textAlign: 'center',
    paddingHorizontal: 64,
  },
  issueLabel: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: ChronicleColors.secondary,
    textAlign: 'center',
    marginBottom: 14,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 24,
    paddingHorizontal: 24,
  },
  categoryActive: {
    borderTopWidth: 2,
    borderTopColor: ChronicleColors.primary,
    paddingTop: 4,
  },
  categoryInactive: {
    paddingTop: 6,
  },
  categoryText: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  categoryTextActive: {
    color: ChronicleColors.primary,
    fontFamily: 'PublicSans_700Bold',
  },
  categoryTextInactive: {
    color: ChronicleColors.secondary,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  dateActive: {
    borderTopWidth: 2,
    borderTopColor: ChronicleColors.primary,
    paddingTop: 4,
  },
  dateInactive: {
    paddingTop: 6,
  },
  dateText: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  dateTextActive: {
    color: ChronicleColors.primary,
    fontFamily: 'PublicSans_700Bold',
  },
  dateTextInactive: {
    color: ChronicleColors.secondary,
  },
  dateMeta: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 10,
    color: ChronicleColors.secondary,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  articleContainer: {
    flexDirection: 'column',
    paddingVertical: 24,
  },
  articleMeta: {
    marginBottom: 8,
  },
  articleDate: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: ChronicleColors.secondary,
    marginBottom: 4,
  },
  articleCategory: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: ChronicleColors.primary,
  },
  articleContent: {
    marginTop: 12,
  },
  articleHeadline: {
    fontFamily: 'Newsreader_700Bold',
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.5,
    color: ChronicleColors.primary,
    marginBottom: 20,
  },
  articleBody: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 18,
    lineHeight: 28,
    color: ChronicleColors.onSurface,
    marginBottom: 16,
  },
  developmentsBlock: {
    marginTop: 4,
    marginBottom: 16,
    borderLeftWidth: 2,
    borderLeftColor: ChronicleColors.primary,
    paddingLeft: 12,
  },
  developmentsTitle: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: ChronicleColors.primary,
    marginBottom: 8,
  },
  developmentItem: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: ChronicleColors.onSurface,
    marginBottom: 8,
  },
  recapSections: {
    marginTop: 4,
  },
  recapSection: {
    marginBottom: 16,
  },
  sourceCount: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: ChronicleColors.secondary,
    marginTop: 2,
  },
  ruleLine: {
    borderTopWidth: 1,
    borderTopColor: ChronicleColors.primary,
  },
  centeredLoader: {
    flex: 1,
    minHeight: 240,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoader: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  endMarker: {
    marginTop: 40,
    paddingTop: 20,
    alignItems: 'center',
  },
  endText: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: ChronicleColors.secondary,
    marginTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontFamily: 'Newsreader_700Bold',
    fontSize: 26,
    color: ChronicleColors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyBody: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: ChronicleColors.secondary,
    textAlign: 'center',
  },
  errorBanner: {
    marginHorizontal: 24,
    marginTop: 24,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: ChronicleColors.primary,
    paddingVertical: 12,
  },
  errorText: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 13,
    color: ChronicleColors.secondary,
    textAlign: 'center',
  },
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  drawerPanel: {
    backgroundColor: ChronicleColors.background,
    borderRightWidth: 1,
    borderRightColor: ChronicleColors.primary,
    bottom: 0,
    left: 0,
    paddingHorizontal: 20,
    paddingTop: 28,
    position: 'absolute',
    top: 0,
    width: 304,
  },
  drawerHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: ChronicleColors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 14,
  },
  drawerTitle: {
    fontFamily: 'Newsreader_700Bold_Italic',
    fontSize: 26,
    color: ChronicleColors.primary,
  },
  drawerItem: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: ChronicleColors.outlineVariant,
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 16,
  },
  drawerItemActive: {
    borderBottomColor: ChronicleColors.primary,
  },
  drawerItemText: {
    flex: 1,
  },
  drawerItemTitle: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: ChronicleColors.secondary,
  },
  drawerItemTitleActive: {
    color: ChronicleColors.primary,
  },
  drawerItemDescription: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 15,
    lineHeight: 20,
    color: ChronicleColors.secondary,
    marginTop: 3,
  },
});
