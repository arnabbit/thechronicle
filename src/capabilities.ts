import { Platform } from 'react-native';

// Screens branch on *what the platform can do*, never on which platform it is,
// so a capability changing answer is a one-file change instead of a grep.
// Platform-split files stay reserved for genuinely different rendering.

/** Web push is out of scope: no service worker, no VAPID. On web this is
 *  silent and terminal — the reader is never told about a feature that will
 *  never arrive. */
export const canPush = Platform.OS === 'android';

// `canCacheOffline` used to live here, answering "is this platform online
// only". It has been removed rather than left stale: both platforms persist
// the query cache now, and the question that replaced it — *which store* —
// cannot be answered by a runtime flag at all. The web bundler resolves
// imports statically, so `expo-sqlite` had to be kept out of the web bundle by
// a file split (`src/api/cacheStore.ts`), not by a branch. A capability nobody
// reads and that is no longer true is worse than no capability.

/** `react-native-web`'s `Share` already delegates to `navigator.share` and
 *  rejects when it is absent, so the *call* needs no branch. This flag decides
 *  only the affordance's label — "Share" or "Copy link". */
export const canShareNatively =
  Platform.OS !== 'web' ||
  (typeof navigator !== 'undefined' && typeof navigator.share === 'function');
