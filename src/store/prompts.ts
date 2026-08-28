import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Whether the end-of-feed slot has already said its piece.
//
// Device state, beside bookmarks and the theme — not a query. "Shown once"
// and "asked once" are only true if they survive a restart, and a reader who
// said no and gets asked again on the next launch has been told their no did
// not count.

/**
 * Where the reader is in the one conversation the app has about notifications.
 *
 * `unseen`   — never offered.
 * `declined` — said no. One line about where the Android setting lives is
 *              still owed, and then never again.
 * `done`     — granted, or declined and told. Silent and terminal either way.
 */
export type OfferState = 'unseen' | 'declined' | 'done';

interface PromptState {
  /** Launches so far, counted at boot. The offer is never made on the first
   *  one: the first thing the app does must not be ask for permission. */
  launches: number;
  offer: OfferState;
  updateDismissed: boolean;
  countLaunch: () => void;
  setOffer: (offer: OfferState) => void;
  dismissUpdate: () => void;
}

export const usePrompts = create<PromptState>()(
  persist(
    (set) => ({
      launches: 0,
      offer: 'unseen',
      updateDismissed: false,
      countLaunch: () => set((state) => ({ launches: state.launches + 1 })),
      setOffer: (offer) => set({ offer }),
      dismissUpdate: () => set({ updateDismissed: true }),
    }),
    {
      name: 'chronicle.prompts',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
