import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Category } from '@/src/api/types';
import { useTheme } from '@/src/theme/useTheme';
import { type } from '@/src/theme/type';

// `home` arrives server-injected and first. The client must not special-case
// it — it is a category slug like any other, and the feed simply omits the
// filter when it is active.
//
// **This row closes the header**, in ink. design-17 nests the category row
// inside the same ruled block as the wordmark and the dateline, so the 1px ink
// rule falls below the categories — not under the date, which carries only its
// own text-width underline. `Masthead` draws no rule when this follows it.
export function CategoryNav({
  categories,
  active,
  onSelect,
}: {
  categories: Category[];
  active: string;
  onSelect: (slug: string) => void;
}) {
  const { colors } = useTheme();
  if (categories.length === 0) return null;

  return (
    <View style={[styles.wrapper, { borderBottomColor: colors.ruleStrong }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {categories.map((category) => {
          const isActive = category.slug === active;
          return (
            <Pressable
              key={category.slug}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              onPress={() => onSelect(category.slug)}
            >
              <View
                style={[
                  styles.item,
                  // `ruleStrong`, not `primary`: this is a rule, and on dark a
                  // rule sits below the ink because a light one blooms.
                  isActive && { borderTopWidth: 2, borderTopColor: colors.ruleStrong, paddingTop: 5 },
                ]}
              >
                <Text
                  style={[
                    isActive ? type.kicker : { ...type.meta },
                    { color: isActive ? colors.primary : colors.secondary },
                  ]}
                >
                  {category.name}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: 1,
    paddingTop: 12,
    paddingBottom: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 24,
    paddingHorizontal: 24,
  },
  // 7 against the active tab's 5 + its 2px rule, so every label sits on one
  // baseline whichever is active.
  item: {
    paddingTop: 7,
  },
});
