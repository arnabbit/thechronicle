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
  /** Items available to render. Zero on a successful read is an empty state,
   *  not a failure. */
  count: number;
}

/**
 * `null` means "there is content to render". Query's `status` does not map
 * one-to-one onto the union: a failed fetch while offline is not an error, and
 * a 404 is not one either — it is a page that does not exist.
 */
export function screenState({ status, error, online, count }: ScreenStateInput): ScreenStateKind | null {
  if (status === 'pending') return 'loading';
  if (status === 'error') {
    if (isNotFound(error)) return 'missing';
    return online ? 'error' : 'offline';
  }
  return count === 0 ? 'empty' : null;
}
