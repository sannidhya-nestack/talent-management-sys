'use client';

/**
 * Settings Page Client Component
 *
 * User settings and platform configuration interface.
 */

import * as React from 'react';
import Link from 'next/link';
import {
  User,
  Users,
  Mail,
  Calendar,
  DollarSign,
  Package,
  Settings as SettingsIcon,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function SettingsPageClient() {
  const settingsSections = [
    {
      title: 'Profile',
      description: 'Manage your personal information and preferences',
      icon: User,
      href: '/settings/profile',
    },
    {
      title: 'Team',
      description: 'Manage team members and permissions',
      icon: Users,
      href: '/settings/team',
    },
    {
      title: 'Email Integration',
      description: 'Connect Gmail and Outlook accounts',
      icon: Mail,
      href: '/settings/integrations/email',
    },
    {
      title: 'Calendar Integration',
      description: 'Connect Google Calendar and Outlook',
      icon: Calendar,
      href: '/settings/integrations/calendar',
    },
    {
      title: 'Accounting Integration',
      description: 'Connect QuickBooks and Xero',
      icon: DollarSign,
      href: '/settings/integrations/accounting',
    },
    {
      title: 'Product Catalog',
      description: 'Manage product catalog and pricing',
      icon: Package,
      href: '/settings/products',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and platform configuration
        </p>
      </div>

      {/* Settings Sections */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.href} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                </div>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href={section.href}>Configure</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
