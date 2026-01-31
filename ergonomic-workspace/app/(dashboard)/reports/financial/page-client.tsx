'use client';

/**
 * Financial Reports Page Client Component
 */

import * as React from 'react';
import { Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { exportFinancialReportToCSV } from '@/lib/services/reports/financial';
import type { FinancialReport } from '@/lib/services/reports/financial';

interface FinancialReportsPageClientProps {
  initialReport: FinancialReport;
}

export function FinancialReportsPageClient({ initialReport }: FinancialReportsPageClientProps) {
  const [report, setReport] = React.useState(initialReport);
  const [startDate, setStartDate] = React.useState(
    initialReport.period.start.toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = React.useState(
    initialReport.period.end.toISOString().split('T')[0]
  );
  const [isLoading, setIsLoading] = React.useState(false);

  const handleGenerateReport = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/reports/financial?startDate=${startDate}&endDate=${endDate}`
      );
      if (response.ok) {
        const data = await response.json();
        setReport(data.report);
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    const csv = exportFinancialReportToCSV(report);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financial Reports</h1>
          <p className="text-muted-foreground">Revenue analysis and financial insights</p>
        </div>
        <Button onClick={handleExportCSV}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Report Period</CardTitle>
          <CardDescription>Select the date range for the financial report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button onClick={handleGenerateReport} disabled={isLoading}>
              <Calendar className="mr-2 h-4 w-4" />
              {isLoading ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Summary</CardTitle>
          <CardDescription>
            {report.period.start.toLocaleDateString()} - {report.period.end.toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">${report.revenue.total.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Paid Invoices</p>
              <p className="text-2xl font-bold">{report.invoices.paid}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Outstanding</p>
              <p className="text-2xl font-bold">${report.invoices.outstandingAmount.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue by Client */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Client</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.revenue.byClient.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    No revenue data for this period
                  </TableCell>
                </TableRow>
              ) : (
                report.revenue.byClient.map((item) => (
                  <TableRow key={item.clientId}>
                    <TableCell>{item.clientName}</TableCell>
                    <TableCell className="text-right">${item.amount.toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invoice Status */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-xl font-semibold">{report.invoices.total}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Paid</p>
              <p className="text-xl font-semibold text-green-600">{report.invoices.paid}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Outstanding</p>
              <p className="text-xl font-semibold text-yellow-600">{report.invoices.outstanding}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="text-xl font-semibold text-red-600">{report.invoices.overdue}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
