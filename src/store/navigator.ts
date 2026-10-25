import { create } from 'zustand';
import type { PeriodKind } from '@/src/lib/period';

// Whether the period navigator is open, and at which scale.
//
// **Not persisted.** Bookmarks and the theme survive a restart because they are
// choices; an open overlay is a moment. Restoring one would mean an app that
// boots with a sheet over the front page.
//
// The navigator is mounted once in the root layout and opened through this,
// rather than instantiated per screen. Two screens own a dateline and the
// archive owns a second copy of the switcher — three places that would
// otherwise each carry their own overlay, and drift.

/** A period scale, or single days: the editions themselves. */
export type NavigatorKind = PeriodKind | 'day';

interface NavigatorState {
  open: boolean;
  /** The scale the switcher is showing. Days by default: the commonest reason
   *  to open the navigator is to read another day's paper, and a day one tap
   *  away is what the dateline promises. */
  kind: NavigatorKind;
  openNavigator: (kind?: NavigatorKind) => void;
  setKind: (kind: NavigatorKind) => void;
  close: () => void;
}

export const useNavigator = create<NavigatorState>((set) => ({
  open: false,
  kind: 'day',
  openNavigator: (kind) => set((state) => ({ open: true, kind: kind ?? state.kind })),
  setKind: (kind) => set({ kind }),
  close: () => set({ open: false }),
}));
