/**
 * Financial Reporting Service
 *
 * Provides financial analysis and reporting capabilities.
 */

import { collections } from '@/lib/db';
import { timestampToDate } from '@/lib/db-utils';

export interface FinancialReport {
  period: {
    start: Date;
    end: Date;
  };
  revenue: {
    total: number;
    byClient: Array<{ clientId: string; clientName: string; amount: number }>;
    byPeriod: Array<{ period: string; amount: number }>;
  };
  invoices: {
    total: number;
    paid: number;
    outstanding: number;
    overdue: number;
    outstandingAmount: number;
    overdueAmount: number;
  };
  payments: {
    total: number;
    count: number;
    average: number;
    trends: Array<{ period: string; amount: number }>;
  };
  profitMargins: {
    gross: number;
    net: number;
  };
}

export interface FinancialReportOptions {
  startDate?: Date;
  endDate?: Date;
  clientId?: string;
  groupBy?: 'day' | 'week' | 'month' | 'year';
}

/**
 * Generate financial report
 */
export async function generateFinancialReport(
  options: FinancialReportOptions = {}
): Promise<FinancialReport> {
  const startDate = options.startDate || new Date(new Date().getFullYear(), 0, 1); // Start of year
  const endDate = options.endDate || new Date();

  // Get invoices
  let invoiceQuery = collections.invoices() as FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;

  if (options.clientId) {
    invoiceQuery = invoiceQuery.where('clientId', '==', options.clientId);
  }

  let invoiceSnapshot;
  let invoiceDocs: FirebaseFirestore.QueryDocumentSnapshot[];
  try {
    invoiceSnapshot = await invoiceQuery.orderBy('createdAt', 'desc').get();
    invoiceDocs = invoiceSnapshot.docs;
  } catch (error) {
    invoiceSnapshot = await invoiceQuery.get();
    invoiceDocs = [...invoiceSnapshot.docs].sort((a, b) => {
      const aDate = timestampToDate(a.data().createdAt);
      const bDate = timestampToDate(b.data().createdAt);
      if (!aDate || !bDate) return 0;
      return bDate.getTime() - aDate.getTime();
    });
  }

  // Filter invoices by date range
  const invoices = invoiceDocs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        clientId: data.clientId,
        amount: data.amount || 0,
        status: data.status || 'DRAFT',
        paidDate: timestampToDate(data.paidDate),
        dueDate: timestampToDate(data.dueDate),
        createdAt: timestampToDate(data.createdAt) || new Date(),
      };
    })
    .filter((inv) => {
      const invDate = inv.paidDate || inv.createdAt;
      return invDate >= startDate && invDate <= endDate;
    });

  // Calculate revenue
  const paidInvoices = invoices.filter((inv) => inv.status === 'PAID');
  const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  // Revenue by client
  const revenueByClient = new Map<string, { clientId: string; clientName: string; amount: number }>();
  for (const inv of paidInvoices) {
    const existing = revenueByClient.get(inv.clientId) || { clientId: inv.clientId, clientName: 'Unknown', amount: 0 };
    existing.amount += inv.amount;
    revenueByClient.set(inv.clientId, existing);
  }

  // Get client names
  for (const [clientId, data] of revenueByClient.entries()) {
    try {
      const clientDoc = await collections.clients().doc(clientId).get();
      if (clientDoc.exists) {
        data.clientName = clientDoc.data()?.companyName || 'Unknown';
      }
    } catch (error) {
      console.error(`Error fetching client ${clientId}:`, error);
    }
  }

  // Outstanding invoices
  const outstandingInvoices = invoices.filter((inv) => inv.status === 'SENT');
  const overdueInvoices = outstandingInvoices.filter((inv) => {
    if (!inv.dueDate) return false;
    return inv.dueDate < new Date();
  });

  const outstandingAmount = outstandingInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  // Payment trends (simplified - group by month)
  const paymentTrends = new Map<string, number>();
  for (const inv of paidInvoices) {
    const monthKey = inv.paidDate?.toISOString().substring(0, 7) || inv.createdAt.toISOString().substring(0, 7);
    const existing = paymentTrends.get(monthKey) || 0;
    paymentTrends.set(monthKey, existing + inv.amount);
  }

  return {
    period: { start: startDate, end: endDate },
    revenue: {
      total: totalRevenue,
      byClient: Array.from(revenueByClient.values()).sort((a, b) => b.amount - a.amount),
      byPeriod: Array.from(paymentTrends.entries())
        .map(([period, amount]) => ({ period, amount }))
        .sort((a, b) => a.period.localeCompare(b.period)),
    },
    invoices: {
      total: invoices.length,
      paid: paidInvoices.length,
      outstanding: outstandingInvoices.length,
      overdue: overdueInvoices.length,
      outstandingAmount,
      overdueAmount,
    },
    payments: {
      total: totalRevenue,
      count: paidInvoices.length,
      average: paidInvoices.length > 0 ? totalRevenue / paidInvoices.length : 0,
      trends: Array.from(paymentTrends.entries())
        .map(([period, amount]) => ({ period, amount }))
        .sort((a, b) => a.period.localeCompare(b.period)),
    },
    profitMargins: {
      gross: 0, // Would need cost data
      net: 0, // Would need expense data
    },
  };
}

/**
 * Export financial report to CSV
 */
export function exportFinancialReportToCSV(report: FinancialReport): string {
  const lines: string[] = [];

  // Header
  lines.push('Financial Report');
  lines.push(`Period: ${report.period.start.toLocaleDateString()} - ${report.period.end.toLocaleDateString()}`);
  lines.push('');

  // Revenue Summary
  lines.push('Revenue Summary');
  lines.push(`Total Revenue,${report.revenue.total}`);
  lines.push('');

  // Revenue by Client
  lines.push('Revenue by Client');
  lines.push('Client,Amount');
  report.revenue.byClient.forEach((item) => {
    lines.push(`${item.clientName},${item.amount}`);
  });
  lines.push('');

  // Invoices Summary
  lines.push('Invoices Summary');
  lines.push(`Total Invoices,${report.invoices.total}`);
  lines.push(`Paid,${report.invoices.paid}`);
  lines.push(`Outstanding,${report.invoices.outstanding}`);
  lines.push(`Overdue,${report.invoices.overdue}`);
  lines.push(`Outstanding Amount,${report.invoices.outstandingAmount}`);
  lines.push(`Overdue Amount,${report.invoices.overdueAmount}`);

  return lines.join('\n');
}
