/**
 * Financial Reports Page
 *
 * Displays financial reports with revenue analysis and export capabilities.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { generateFinancialReport } from '@/lib/services/reports/financial';
import { FinancialReportsPageClient } from './page-client';

export default async function FinancialReportsPage() {
  const session = await auth();
  if (!session?.user || !session.user.dbUserId) {
    redirect('/');
  }

  // Generate report for current year
  const report = await generateFinancialReport({
    startDate: new Date(new Date().getFullYear(), 0, 1),
    endDate: new Date(),
  });

  return <FinancialReportsPageClient initialReport={report} />;
}
