// Two full palettes, not a base plus overrides.
//
// Ticket 12 found one role that inverts rather than mirrors: in light the
// strongest rule *is* the ink (both #000000), but a light hairline on a dark
// ground blooms and out-shouts the headline, so on dark `ruleStrong` sits
// *below* the ink. A palette expressed as a diff cannot say that, and deriving
// dark from light would quietly reintroduce the bug the prototype existed to
// catch. So both are written out in full.

export interface Palette {
  background: string;
  /** Ink: masthead, headline, kicker. */
  primary: string;
  /** Body prose, developments. */
  onSurface: string;
  /** Feed row summary. */
  dek: string;
  /** Dateline, counts, meta. */
  secondary: string;
  /** Masthead and section rules. */
  ruleStrong: string;
  /** Between feed rows. */
  ruleHair: string;
}

export const lightPalette: Palette = {
  background: '#fcf9f4',
  primary: '#000000',
  onSurface: '#1c1c19',
  dek: '#2b2a27',
  secondary: '#5f5e5e',
  ruleStrong: '#000000',
  ruleHair: '#c6c6c6',
};

export const darkPalette: Palette = {
  background: '#191712',
  primary: '#f2ece0',
  onSurface: '#ddd6c8',
  dek: '#cfc7b7',
  secondary: '#9c958a',
  ruleStrong: '#b9b1a2',
  ruleHair: '#35322b',
};

export type ThemeName = 'light' | 'dark';

export const palettes: Record<ThemeName, Palette> = {
  light: lightPalette,
  dark: darkPalette,
};
