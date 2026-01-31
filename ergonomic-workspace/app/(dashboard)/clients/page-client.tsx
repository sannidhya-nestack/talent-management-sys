'use client';

/**
 * Clients List Page Client Component
 *
 * Client-side component for the clients list page with search, filters, and table.
 */

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { strings } from '@/config';
import type { ClientsListResponse } from '@/lib/services/clients';
import { ClientStatus } from '@/lib/types/firestore';
import { formatDate } from '@/lib/utils';

interface ClientsPageClientProps {
  initialData: ClientsListResponse;
}

const statusColors: Record<ClientStatus, 'default' | 'secondary' | 'outline'> = {
  [ClientStatus.ACTIVE]: 'default',
  [ClientStatus.PROSPECT]: 'secondary',
  [ClientStatus.INACTIVE]: 'outline',
};

export function ClientsPageClient({ initialData }: ClientsPageClientProps) {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{strings.clients.title}</h1>
          <p className="text-muted-foreground">
            Manage your client relationships and projects
          </p>
        </div>
        <Button asChild>
          <Link href="/clients/new">
            <Plus className="mr-2 h-4 w-4" />
            {strings.clients.addNew}
          </Link>
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search Clients</CardTitle>
          <CardDescription>Find clients by name, industry, or location</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={strings.forms.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">Search</Button>
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
          <CardDescription>
            {initialData.total} {initialData.total === 1 ? 'client' : 'clients'} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {initialData.clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">{strings.clients.noClients}</p>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead>Assessments</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialData.clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/clients/${client.id}`}
                        className="hover:underline"
                      >
                        {client.companyName}
                      </Link>
                    </TableCell>
                    <TableCell>{client.industry || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[client.status]}>
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{client._count.projects}</TableCell>
                    <TableCell>{client._count.assessments}</TableCell>
                    <TableCell>{formatDate(client.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/clients/${client.id}`}>
                          {strings.actions.view}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
