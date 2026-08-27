import { Platform } from 'react-native';

// Screens branch on *what the platform can do*, never on which platform it is,
// so a capability changing answer is a one-file change instead of a grep.
// Platform-split files stay reserved for genuinely different rendering.

/** Web push is out of scope: no service worker, no VAPID. On web this is
 *  silent and terminal — the reader is never told about a feature that will
 *  never arrive. */
export const canPush = Platform.OS === 'android';

/** Web is online-only. The cache-less reader is the web reader. */
export const canCacheOffline = Platform.OS !== 'web';

/** `react-native-web`'s `Share` already delegates to `navigator.share` and
 *  rejects when it is absent, so the *call* needs no branch. This flag decides
 *  only the affordance's label — "Share" or "Copy link". */
export const canShareNatively =
  Platform.OS !== 'web' ||
  (typeof navigator !== 'undefined' && typeof navigator.share === 'function');
