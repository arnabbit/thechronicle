import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { palettes, type Palette, type ThemeName } from '@/src/theme/tokens';
import { useThemePreference } from '@/src/store/theme';

export interface Theme {
  name: ThemeName;
  colors: Palette;
}

const ThemeContext = createContext<Theme | null>(null);

export const ThemeProviderContext = ThemeContext;

/** Resolves preference + OS scheme into the theme the tree renders with. */
export function useResolvedTheme(): Theme {
  const preference = useThemePreference((s) => s.preference);
  const scheme = useColorScheme();
  const name: ThemeName =
    preference === 'system' ? (scheme === 'dark' ? 'dark' : 'light') : preference;
  return { name, colors: palettes[name] };
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme() used outside <ThemeProvider>');
  return theme;
}
