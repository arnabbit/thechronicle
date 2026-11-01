import { Platform } from 'react-native';

// Screens branch on *what the platform can do*, never on which platform it is,
// so a capability changing answer is a one-file change instead of a grep.
// Platform-split files stay reserved for genuinely different rendering.

/** Web push is out of scope: no service worker, no VAPID. On web this is
 *  silent and terminal — the reader is never told about a feature that will
 *  never arrive. */
export const canPush = Platform.OS === 'android';

// `canCacheOffline` used to live here, answering "is this platform online
// only". Both platforms are online only now — the paper is fetched from the
// server on every screen and nothing is kept on the device — so the question
// has one answer everywhere and needs no flag.

/** `react-native-web`'s `Share` already delegates to `navigator.share` and
 *  rejects when it is absent, so the *call* needs no branch. This flag decides
 *  only the affordance's label — "Share" or "Copy link". */
export const canShareNatively =
  Platform.OS !== 'web' ||
  (typeof navigator !== 'undefined' && typeof navigator.share === 'function');
