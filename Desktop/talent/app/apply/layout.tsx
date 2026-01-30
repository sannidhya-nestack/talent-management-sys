/**
 * Public Forms Layout
 *
 * Simple layout for public form pages without dashboard navigation.
 */

import { ThemeProvider } from '@/components/theme-provider';

interface FormsLayoutProps {
  children: React.ReactNode;
}

export default function FormsLayout({ children }: FormsLayoutProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
