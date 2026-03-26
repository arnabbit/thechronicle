import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChronicleColors } from '@/constants/theme';

// --- Types ---

interface Article {
  id: string;
  headline: string;
  published_date: string;
  category: string;
  body: string[];
}

interface Category {
  name: string;
  slug: string;
}

interface PaginationInfo {
  page: number;
  per_page: number;
  total: number;
  has_next: boolean;
  next_page: number | null;
}

// --- API ---

const API_BASE = 'https://fayz-news-backend.onrender.com';

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_BASE}/api/categories`);
  if (!res.ok) throw new Error('Failed to fetch categories');
  const data = await res.json();
  return data.categories;
}

async function fetchArticles(
  page: number,
  category: string | null,
  perPage = 10,
): Promise<{ articles: Article[]; pagination: PaginationInfo }> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  if (category && category !== 'home') {
    params.set('category', category);
  }
  const res = await fetch(`${API_BASE}/api/articles?${params}`);
  if (!res.ok) throw new Error('Failed to fetch articles');
  return res.json();
}

// --- Components ---

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

function ArticleCard({ article }: { article: Article }) {
  return (
    <View style={styles.articleContainer}>
      <View style={styles.articleMeta}>
        <Text style={styles.articleDate}>{article.published_date}</Text>
        <Text style={styles.articleCategory}>{article.category}</Text>
      </View>
      <View style={styles.articleContent}>
        <Text style={styles.articleHeadline}>{article.headline}</Text>
        {article.body.map((paragraph, i) => (
          <Text key={i} style={styles.articleBody}>
            {paragraph}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Separator() {
  return <View style={styles.ruleLine} />;
}

// --- Main Screen ---

export default function ChronicleScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState('home');
  const [articles, setArticles] = useState<Article[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const loadingRef = useRef(false);

  // Load categories on mount
  useEffect(() => {
    fetchCategories()
      .then((cats) => {
        setCategories(cats);
        if (cats.length > 0) setActiveCategory(cats[0].slug);
      })
      .catch(() => {
        // use fallback
      });
  }, []);

  // Load articles when category changes
  useEffect(() => {
    setArticles([]);
    setPage(1);
    setHasMore(true);
    setInitialLoading(true);
    loadArticles(1, activeCategory, true);
  }, [activeCategory]);

  const loadArticles = useCallback(
    async (pg: number, category: string, reset = false) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);

      try {
        const data = await fetchArticles(pg, category);
        setArticles((prev) => (reset ? data.articles : [...prev, ...data.articles]));
        setHasMore(data.pagination.has_next);
        setPage(data.pagination.next_page ?? pg);
      } catch {
        // silently fail, keep existing articles
      } finally {
        setLoading(false);
        setInitialLoading(false);
        loadingRef.current = false;
      }
    },
    [],
  );

  const handleEndReached = useCallback(() => {
    if (!loading && hasMore) {
      loadArticles(page, activeCategory);
    }
  }, [loading, hasMore, page, activeCategory, loadArticles]);

  const handleCategorySelect = useCallback((slug: string) => {
    setActiveCategory(slug);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.masthead}>THE CHRONICLE</Text>
        <CategoryNav
          categories={categories}
          active={activeCategory}
          onSelect={handleCategorySelect}
        />
      </View>

      {/* Article Feed */}
      {initialLoading ? (
        <View style={styles.centeredLoader}>
          <ActivityIndicator size="small" color={ChronicleColors.primary} />
        </View>
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ArticleCard article={item} />}
          ItemSeparatorComponent={Separator}
          contentContainerStyle={styles.listContent}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading && !initialLoading ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={ChronicleColors.primary} />
              </View>
            ) : !hasMore && articles.length > 0 ? (
              <View style={styles.endMarker}>
                <View style={styles.ruleLine} />
                <Text style={styles.endText}>END OF DAILY EDITION</Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

// --- Styles ---

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ChronicleColors.background,
  },

  // Header
  header: {
    backgroundColor: ChronicleColors.background,
    borderBottomWidth: 1,
    borderBottomColor: ChronicleColors.primary,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  masthead: {
    fontFamily: 'Newsreader_700Bold_Italic',
    fontSize: 32,
    letterSpacing: -1.5,
    color: ChronicleColors.primary,
    textTransform: 'uppercase',
    marginBottom: 20,
  },

  // Category nav
  categoryRow: {
    flexDirection: 'row',
    gap: 24,
    paddingHorizontal: 4,
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

  // List
  listContent: {
    paddingHorizontal: 24,
    paddingVertical: 40,
  },

  // Article
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

  // Rule line
  ruleLine: {
    borderTopWidth: 1,
    borderTopColor: ChronicleColors.primary,
  },

  // Loaders
  centeredLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoader: {
    paddingVertical: 32,
    alignItems: 'center',
  },

  // End marker
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
});
