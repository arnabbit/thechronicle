import { Platform } from 'react-native';

export const ChronicleColors = {
  background: '#fcf9f4',
  surface: '#fcf9f4',
  onSurface: '#1c1c19',
  primary: '#000000',
  secondary: '#5f5e5e',
  outline: '#777777',
  outlineVariant: '#c6c6c6',
  surfaceDim: '#dcdad5',
  // dark mode
  darkBackground: '#1A1A1A',
  darkOnSurface: '#ffffff',
  darkSecondary: '#a1a1a1',
};

export const Colors = {
  light: {
    text: ChronicleColors.onSurface,
    background: ChronicleColors.background,
    tint: ChronicleColors.primary,
    icon: ChronicleColors.secondary,
    tabIconDefault: ChronicleColors.secondary,
    tabIconSelected: ChronicleColors.primary,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#fff',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#fff',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
