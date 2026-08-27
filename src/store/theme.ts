import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

// Ticket 12: the theme follows the OS and there is no in-app toggle — a toggle
// has no home now that the masthead carries the dateline, search and saved.
// The field ships anyway, because that decision was recorded as a default
// rather than a conviction: adding the control later is one control, with no
// structural consequence.
export const useThemePreference = create<ThemeState>()(
  persist(
    (set) => ({
      preference: 'system',
      setPreference: (preference) => set({ preference }),
    }),
    {
      name: 'chronicle.theme',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
