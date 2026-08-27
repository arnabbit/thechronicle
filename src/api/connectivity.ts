import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

// Who tells the app it is offline.
//
// **Ungated by the offline-cache capability.** Online/offline detection is not
// a durable-cache feature: the web build needs it too, with no cache behind it,
// because "you are offline" and "the server is down" are different things to
// tell a reader on any platform. Query ships a browser binding of its own but
// none for React Native, so until this ran, `onlineManager.isOnline()` was
// permanently `true` on Android and the `offline` screen state was unreachable
// there by construction.
//
// Screens never call this. They read `onlineManager.isOnline()` at the call
// site and hand the answer to the pure selector, which is what keeps the
// selector testable without a network stack.

/**
 * Binds Query's online manager to NetInfo for the life of the process.
 *
 * **NetInfo alone is not enough on the web, and installing it there without
 * this is a regression rather than a fix.** `setEventListener` *replaces*
 * Query's own binding, and Query's own binding is the `online` and `offline`
 * events on `window`. NetInfo's web implementation attaches to those two
 * events only when `navigator.connection` is absent; when it exists — which is
 * every Chromium browser — it listens to that object's `change` event and
 * nothing else. Handing the manager to NetInfo unconditionally therefore takes
 * a working web binding away and puts a quieter one in its place. Measured
 * here: with a real `offline` event on the window, the feed went on fetching.
 *
 * So both are attached. On Android `window.addEventListener` does not exist
 * and NetInfo is the whole answer; on the web the window events are the
 * reliable signal and NetInfo's connection change is a second opinion. The two
 * never disagree about the direction — either can only report what
 * `navigator.onLine` already says.
 *
 * `isConnected !== false` rather than `!!isConnected`: NetInfo reports `null`
 * while it is still working the answer out, and the honest reading of "not yet
 * known" is *not* "offline". Guessing offline there would put the no-connection
 * notice in front of a reader with a perfectly good connection for the first
 * frames of every cold start — louder and wronger than a skeleton that
 * resolves a moment later.
 */
export function bindConnectivity(): void {
  onlineManager.setEventListener((setOnline) => {
    const unsubscribeNetInfo = NetInfo.addEventListener((state) =>
      setOnline(state.isConnected !== false),
    );

    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
      return unsubscribeNetInfo;
    }

    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline, false);
    window.addEventListener('offline', goOffline, false);

    return () => {
      unsubscribeNetInfo();
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  });
}
