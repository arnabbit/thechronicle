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

interface NavigatorState {
  open: boolean;
  /** The scale the switcher is showing. Months by default: it is the only
   *  scale at which this archive — 40 editions across five months — has more
   *  than one bucket and fewer than fifty. */
  kind: PeriodKind;
  openNavigator: (kind?: PeriodKind) => void;
  setKind: (kind: PeriodKind) => void;
  close: () => void;
}

export const useNavigator = create<NavigatorState>((set) => ({
  open: false,
  kind: 'month',
  openNavigator: (kind) => set((state) => ({ open: true, kind: kind ?? state.kind })),
  setKind: (kind) => set({ kind }),
  close: () => set({ open: false }),
}));
