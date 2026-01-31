'use client';

/**
 * Dashboard Page Client Component
 *
 * Main dashboard with overview cards, recent activity, and quick actions.
 */

import Link from 'next/link';
import { Building2, ClipboardCheck, Calendar, TrendingUp, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { strings } from '@/config';
import type { ClientListItem } from '@/lib/services/clients';
import { formatDate } from '@/lib/utils';

interface DashboardPageClientProps {
  recentClients: ClientListItem[];
}

export function DashboardPageClient({ recentClients }: DashboardPageClientProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{strings.dashboard.title}</h1>
        <p className="text-muted-foreground">
          {strings.dashboard.welcome}! Here&apos;s what&apos;s happening with your workspace.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentClients.length}</div>
            <p className="text-xs text-muted-foreground">
              Active client relationships
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assessments</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Workspace assessments completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Installations</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Scheduled installations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0</div>
            <p className="text-xs text-muted-foreground">
              Total revenue this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Clients */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Clients</CardTitle>
              <CardDescription>Your most recently added clients</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/clients">
                View All
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentClients.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">{strings.clients.noClients}</p>
              <p className="text-sm text-muted-foreground mb-4">
                Get started by adding your first client
              </p>
              <Button asChild>
                <Link href="/clients/new">
                  <Plus className="mr-2 h-4 w-4" />
                  {strings.clients.addNew}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentClients.map((client) => (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{client.companyName}</p>
                      <Badge variant="outline" className="text-xs">
                        {client.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {client.industry || 'No industry'} • {formatDate(client.createdAt)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Button variant="outline" className="h-auto flex-col items-start p-4" asChild>
              <Link href="/clients/new">
                <Plus className="mb-2 h-5 w-5" />
                <span className="font-medium">Add New Client</span>
                <span className="text-xs text-muted-foreground">Create a new client record</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col items-start p-4" asChild>
              <Link href="/assessments/new">
                <ClipboardCheck className="mb-2 h-5 w-5" />
                <span className="font-medium">Schedule Assessment</span>
                <span className="text-xs text-muted-foreground">Create a new workspace assessment</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col items-start p-4" asChild>
              <Link href="/questionnaires/new">
                <ClipboardCheck className="mb-2 h-5 w-5" />
                <span className="font-medium">Create Questionnaire</span>
                <span className="text-xs text-muted-foreground">Build a client questionnaire</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
