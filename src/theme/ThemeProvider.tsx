import { type ReactNode } from 'react';
import { ThemeProviderContext, useResolvedTheme } from '@/src/theme/useTheme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useResolvedTheme();
  return (
    <ThemeProviderContext.Provider value={theme}>{children}</ThemeProviderContext.Provider>
  );
}
