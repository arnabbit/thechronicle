import type { QueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { API_BASE } from '@/src/api/client';
import { LATEST, fetchEdition, fetchEditionArticles } from '@/src/api/endpoints';
import { queryKeys } from '@/src/api/queries';
import { STALE_IMMUTABLE } from '@/src/api/queryClient';
import { canPush } from '@/src/capabilities';

// Being told a new edition exists. A mount side effect, so it lives in the
// store layer and not among the reads — the reads module is hooks that take
// plain arguments, and none of this is a read.
//
// **Receiving only.** The backend sender is gated behind the write-key
// cutover, deliberately: a spurious article is a bad row in a list, but a
// spurious push is a notification on every reader's phone. Everything here is
// verifiable with a manually-sent test notification.
//
// The payload carries only `{ edition: "YYYY-MM-DD" }` — no article id, no
// URL. Neither path below needs a router context to do its work, which is what
// the data layer's "hooks take plain arguments" rule bought.

/** Suppress the banner while the app is foregrounded. The reader is looking at
 *  the paper; notifying them about the paper is the app talking over itself. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const editionOf = (content: Notifications.NotificationContent): string | undefined => {
  const value = (content.data as { edition?: unknown } | null)?.edition;
  return typeof value === 'string' ? value : undefined;
};

/**
 * Warm the named edition so the tap is not followed by a wait.
 *
 * By resolved date, not by the `latest` sentinel: the notification names a
 * date, and the front page's own `latest`-keyed queries mirror onto that same
 * dated key, so warming it warms the front page too.
 */
async function prefetchEdition(client: QueryClient, date: string): Promise<void> {
  await Promise.all([
    client.prefetchQuery({
      queryKey: queryKeys.edition(date),
      queryFn: () => fetchEdition(date),
      staleTime: STALE_IMMUTABLE,
    }),
    client.prefetchInfiniteQuery({
      queryKey: queryKeys.editionArticles(date, 'home'),
      queryFn: ({ pageParam }) => fetchEditionArticles(date, 'home', pageParam as string | null),
      initialPageParam: null as string | null,
      staleTime: STALE_IMMUTABLE,
    }),
  ]);
}

/**
 * The two paths a notification can take, bound for the life of the process.
 *
 * Returns its own teardown, so the root layout can unbind on unmount rather
 * than leaking a listener per fast refresh.
 */
export function bindNotifications(client: QueryClient): () => void {
  if (!canPush) return () => {};

  // Foregrounded: refresh today's paper instead of banner-ing at the reader.
  const received = Notifications.addNotificationReceivedListener((notification) => {
    void client.invalidateQueries({ queryKey: queryKeys.edition(LATEST) });
    void client.invalidateQueries({ queryKey: queryKeys.editionArticles(LATEST, 'home') });
  });

  // Tapped: warm the named edition, then land on the front page — which is
  // where that edition is, because `latest` resolves to it.
  const responded = Notifications.addNotificationResponseReceivedListener((response) => {
    const date = editionOf(response.notification.request.content);
    const arrive = () => router.push('/');
    if (!date) {
      arrive();
      return;
    }
    void prefetchEdition(client, date).finally(arrive);
  });

  return () => {
    received.remove();
    responded.remove();
  };
}

/**
 * Ask, once, and register the token every launch.
 *
 * Tokens rotate on reinstall, so registration is not a one-time thing — it is
 * a launch-time thing, and a token registered once and never again is a reader
 * who stops being notified after they reinstall.
 *
 * Everything here is best-effort and silent. In Expo Go there is no push
 * token to get at all on recent SDKs, and a reader must never see a stack
 * trace because a notification could not be arranged.
 */
export async function requestAndRegister(): Promise<boolean> {
  if (!canPush) return false;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return false;
    await registerToken();
    return true;
  } catch {
    return false;
  }
}

/** Re-POST on every launch, when permission already exists. Never asks. */
export async function registerIfPermitted(): Promise<void> {
  if (!canPush) return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    await registerToken();
  } catch {
    // Silent by design.
  }
}

async function registerToken(): Promise<void> {
  const token = await Notifications.getExpoPushTokenAsync();
  // The registry is the backend half of this and is gated behind the
  // write-key cutover, so this will fail until it ships. It fails quietly:
  // there is nothing a reader could do about it and nothing to tell them.
  await fetch(`${API_BASE}/api/v2/push/tokens`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: token.data, platform: 'android' }),
  }).catch(() => undefined);
}
