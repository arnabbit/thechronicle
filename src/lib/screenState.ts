import { isNotFound } from '../api/errors.ts';

// The five ways a screen can have nothing to show. Every screen picks between
// them the same way, so the selection lives here rather than once per screen:
// the branch that separates `offline` from `error` reads connectivity as well
// as query status, and six copies of that distinction is six chances to get it
// wrong.
//
// Imports inside this suite carry their file extension and stay relative:
// bare Node resolves neither the @/ alias nor an extensionless TS path, and
// running under bare Node is the point.
//
// Pure by construction — no React, no React Native, no query client. The
// caller reads connectivity and hands it in.

export type ScreenStateKind = 'loading' | 'offline' | 'error' | 'empty' | 'missing';

export interface ScreenStateInput {
  /** TanStack Query's `status` for the list or record the screen is showing. */
  status: 'pending' | 'error' | 'success';
  /** The query's `error`, unwidened — this is where a 404 is recognised. */
  error: unknown;
  /** Whether the device believes it has a connection, read by the caller. */
  online: boolean;
  /**
   * Whether the query is *paused* rather than in flight — Query's
   * `fetchStatus === 'paused'`, read by the caller beside `online`.
   *
   * Query pauses a fetch when it believes it is offline instead of failing it,
   * so the query sits at `status: 'pending'` for as long as the connection is
   * gone and never reaches the error branch below. Without this input the
   * `offline` kind is unreachable on every screen and an offline reader gets
   * the loading skeleton forever. Not a native-only problem: it reproduces on
   * web, where the browser's own online events already drive the manager.
   */
  paused: boolean;
  /** Items available to render. Zero on a successful read is an empty state,
   *  not a failure. */
  count: number;
}

/**
 * `null` means "there is content to render". Query's `status` does not map
 * one-to-one onto the union: a failed fetch while offline is not an error, and
 * a 404 is not one either — it is a page that does not exist.
 */
export function screenState({
  status,
  error,
  online,
  count,
  paused,
}: ScreenStateInput): ScreenStateKind | null {
  // A paused fetch has not failed and, while the connection is gone, never
  // will — so `offline` is decided here rather than in the error branch. Only
  // paused with nothing to show is the notice: a reader holding a cached copy
  // keeps reading it, which is `status: 'success'` and falls through below.
  if (status === 'pending') return paused && count === 0 ? 'offline' : 'loading';
  if (status === 'error') {
    if (isNotFound(error)) return 'missing';
    return online ? 'error' : 'offline';
  }
  return count === 0 ? 'empty' : null;
}
