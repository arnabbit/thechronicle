// The one slot at the end of the feed, and what is allowed to occupy it.
//
// **An ordered candidate list that renders at most one prompt** — not a
// component that happens to sit there. Ticket 16 named the failure mode
// exactly: two components racing for one position, where whichever is written
// second quietly assumes the first does not exist. That is a thing you find
// out about from a reader, months later, when the bottom of their paper is a
// notice board.
//
// So the ordering is a pure function with one invariant — at most one — and
// every candidate is declared here, in order, including the one ticket 12
// supplies. A later ticket adds its *eligibility*, never a second slot.
//
// Pure by construction: no capability checks, no store reads, no clock. The
// caller resolves each candidate's eligibility and hands in the answers.

/** In priority order. The array is the ordering. */
export const SLOT_CANDIDATES = ['notificationOffer', 'updateNotice'] as const;

export type SlotCandidate = (typeof SLOT_CANDIDATES)[number];

export interface SlotInput {
  /**
   * Whether the notification permission offer may be shown: the device can
   * push, the reader has not been asked, and they have not declined.
   *
   * Never on first launch — the first thing the app does must not be ask for
   * permission — but that is a question about *when* the reader has seen the
   * feed, which the caller answers, not this function.
   */
  notificationOffer: boolean;
  /** Whether a newer build exists and its notice has not been dismissed. */
  updateNotice: boolean;
}

/**
 * At most one candidate, in declared order, or `null` for none.
 *
 * The permission offer wins ties. The two are never simultaneously urgent —
 * which is what let both tickets avoid inventing a settings screen — and if
 * they ever were, being asked about notifications once is smaller than being
 * told to reinstall.
 */
export function feedSlot(input: SlotInput): SlotCandidate | null {
  for (const candidate of SLOT_CANDIDATES) {
    if (input[candidate]) return candidate;
  }
  return null;
}
