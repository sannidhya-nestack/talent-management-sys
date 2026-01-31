/**
 * Public Assessment Layout
 *
 * Clean, focused layout for candidates taking assessments.
 * No navigation or branding to minimize distractions.
 */

import { branding } from '@/config';

export const metadata = {
  title: {
    template: `%s | ${branding.appName}`,
    default: `Assessment | ${branding.appName}`,
  },
};

export default function AssessLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <main className="container max-w-4xl mx-auto py-8 px-4">
        {children}
      </main>
      <footer className="border-t py-4">
        <div className="container max-w-4xl mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground">
            Powered by {branding.appName}
          </p>
        </div>
      </footer>
    </div>
  );
}
