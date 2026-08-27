import { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet } from 'react-native';
import { useNavigator } from '@/src/store/navigator';
import { PeriodNavigatorContent } from '@/src/ui/PeriodNavigatorContent';
import { useTheme } from '@/src/theme/useTheme';

// The web half of the app's one platform file split. `PeriodNavigator.native`
// is the other; the bundler picks by platform, so neither build ships the
// other's code. Everything a reader looks at lives in
// `PeriodNavigatorContent`, which both import — the split is the *shell*, and
// only the shell.
//
// On the web it is a popover: a panel hung under the masthead, near the
// dateline that opened it, rather than a sheet climbing the bottom of a
// browser window. A page is not a phone, and a full-width sheet on a desktop
// reads as a mobile app pretending.
//
// No sheet library on either side. This is static content over a short list —
// no snap points, no drag-resize, no scroll coordination — so a modal and a
// transform is the whole mechanism.

export function PeriodNavigator() {
  const { colors } = useTheme();
  const open = useNavigator((state) => state.open);
  const close = useNavigator((state) => state.close);
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: open ? 1 : 0,
      duration: open ? 140 : 100,
      useNativeDriver: true,
    }).start();
  }, [open, enter]);

  // Escape dismisses, which is what a popover on a page is expected to do.
  // `Modal`'s own `onRequestClose` covers the Android back gesture but does
  // not fire for a keyboard on the web.
  useEffect(() => {
    if (!open || typeof window === 'undefined' || !window.addEventListener) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open) return null;

  return (
    <Modal transparent animationType="none" visible onRequestClose={close}>
      <Pressable
        accessibilityLabel="Close the period navigator"
        onPress={close}
        style={[styles.backdrop, { backgroundColor: SCRIM }]}
      >
        {/* The panel swallows presses so a tap inside it is not a dismissal.
            `onStartShouldSetResponder` rather than another Pressable: the
            content is full of controls, and a Pressable around them would eat
            their presses on the web. */}
        <Animated.View
          onStartShouldSetResponder={() => true}
          style={[
            styles.panel,
            {
              backgroundColor: colors.background,
              borderColor: colors.ruleStrong,
              opacity: enter,
              transform: [
                {
                  translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }),
                },
              ],
            },
          ]}
        >
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
    alignItems: 'center',
    // Hung from the top, under where the masthead's dateline sits, rather than
    // centred in the viewport like a dialogue. It is a popover from a control,
    // and it should look like it came from one.
    paddingTop: 96,
    paddingHorizontal: 24,
  },
  panel: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
});
