'use client';

/**
 * Theme Provider
 *
 * Wraps the application with next-themes ThemeProvider for dark mode support.
 * Uses the 'class' attribute strategy to toggle dark mode via CSS class on html element.
 */

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
