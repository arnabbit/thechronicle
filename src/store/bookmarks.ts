import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// What the reader has kept. Device state, beside the theme preference — not a
// query, and deliberately not synced: ticket 11 declined cross-device sync
// rather than deferring it, and the empty state says so out loud.
//
// **Only `{id, savedAt}`.** Whether an article is still alive is never stored;
// it is discovered by revalidating on entry to the saved screen. A stored
// `dead` flag would be a second source of truth that goes stale the moment the
// backend withdraws something, and the reader would be told a fact the app had
// no way to check.
//
// No cap. A list of ids is bytes, and a cap would silently drop the oldest
// thing a reader chose to keep.

export interface Bookmark {
  id: string;
  /** Epoch ms. The list orders by this, newest first — save time, never
   *  edition date, because the list is a record of what the reader did. */
  savedAt: number;
}

interface BookmarkState {
  bookmarks: Bookmark[];
  save: (id: string, now: number) => void;
  remove: (id: string) => void;
}

export const useBookmarks = create<BookmarkState>()(
  persist(
    (set) => ({
      bookmarks: [],
      save: (id, now) =>
        set((state) =>
          // Saving something already saved is a no-op rather than a re-order:
          // the reader pressed a control that was already on.
          state.bookmarks.some((mark) => mark.id === id)
            ? state
            : { bookmarks: [{ id, savedAt: now }, ...state.bookmarks] },
        ),
      remove: (id) =>
        set((state) => ({ bookmarks: state.bookmarks.filter((mark) => mark.id !== id) })),
    }),
    {
      name: 'chronicle.bookmarks',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** Newest save first, flat — no edition grouping. A reader looking for what
 *  they kept is looking for the last thing they kept. */
export function savedNewestFirst(bookmarks: readonly Bookmark[]): Bookmark[] {
  return [...bookmarks].sort((a, b) => b.savedAt - a.savedAt);
}
