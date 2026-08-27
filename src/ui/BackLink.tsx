import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/src/theme/useTheme';
import { type } from '@/src/theme/type';

// Any screen can be entered cold from a shared link, so back is "go back if
// there is a back, else replace with the front page" — `replace`, not `push`,
// so the front page does not stack a second entry behind a deep link that had
// no history to begin with.
export function goBackOrHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function BackLink({ label = 'Back' }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={goBackOrHome} style={styles.row}>
      <Text style={[type.kicker, { color: colors.secondary }]}>‹ {label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
    alignSelf: 'flex-start',
  },
});
