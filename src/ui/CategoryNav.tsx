import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Category } from '@/src/api/types';
import { useTheme } from '@/src/theme/useTheme';
import { type } from '@/src/theme/type';

// `home` arrives server-injected and first. The client must not special-case
// it — it is a category slug like any other, and the feed simply omits the
// filter when it is active.
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
    <View style={[styles.wrapper, { borderBottomColor: colors.ruleHair }]}>
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
                  isActive && { borderTopWidth: 2, borderTopColor: colors.primary, paddingTop: 4 },
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
  item: {
    paddingTop: 6,
  },
});
