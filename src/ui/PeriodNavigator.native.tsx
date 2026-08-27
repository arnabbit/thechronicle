import { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigator } from '@/src/store/navigator';
import { PeriodNavigatorContent } from '@/src/ui/PeriodNavigatorContent';
import { useTheme } from '@/src/theme/useTheme';

// The phone half of the app's one platform file split. `PeriodNavigator.tsx`
// is the web popover; the bundler picks by platform, so neither build ships
// the other's code. Everything a reader looks at lives in
// `PeriodNavigatorContent`, which both import — the split is the *shell*, and
// only the shell.
//
// A bottom sheet, because the dateline is at the top of a phone screen and the
// reader's thumb is not. It rises from the bottom edge and keeps its grabber,
// which is the only part of a sheet a reader needs to recognise it as one.
//
// No sheet library. This is static content over a short list — no snap points,
// no drag-resize, no scroll coordination — so a modal and a translate is the
// whole mechanism, and `useNativeDriver` keeps it off the JS thread.

export function PeriodNavigator() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const open = useNavigator((state) => state.open);
  const close = useNavigator((state) => state.close);
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: open ? 1 : 0,
      duration: open ? 200 : 140,
      useNativeDriver: true,
    }).start();
  }, [open, enter]);

  if (!open) return null;

  return (
    // `onRequestClose` is the Android back gesture, which a sheet has to
    // honour or it becomes a trap.
    <Modal transparent animationType="none" visible onRequestClose={close}>
      <Pressable
        accessibilityLabel="Close the period navigator"
        onPress={close}
        style={[styles.backdrop, { backgroundColor: SCRIM }]}
      >
        <Animated.View
          onStartShouldSetResponder={() => true}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.ruleStrong,
              // The gesture bar sits under the sheet, so the last row is not
              // half a thumb from being unreachable.
              paddingBottom: 32 + insets.bottom,
              opacity: enter,
              transform: [
                {
                  translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [320, 0] }),
                },
              ],
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: colors.ruleHair }]} />
          <PeriodNavigatorContent />
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

/** Ticket 18's prototype scrim: the light palette's body ink at a third. Fixed
 *  rather than palette-derived, because a scrim's job is to dim the page under
 *  it and both palettes want the same darkening. */
const SCRIM = 'rgba(28, 23, 18, 0.32)';

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 14,
  },
  grabber: {
    width: 42,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 18,
  },
});
