'use client';

/**
 * Integrations Page Client Component
 *
 * Manage third-party integrations (email, calendar, accounting).
 */

import * as React from 'react';
import { Mail, Calendar, DollarSign, CheckCircle2, XCircle, Plug } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  providers: Array<{
    name: string;
    connected: boolean;
  }>;
}

const integrations: Integration[] = [
  {
    id: 'email',
    name: 'Email Integration',
    description: 'Connect Gmail and Outlook accounts to send emails directly from the platform',
    icon: Mail,
    providers: [
      { name: 'Gmail', connected: false },
      { name: 'Outlook', connected: false },
    ],
  },
  {
    id: 'calendar',
    name: 'Calendar Integration',
    description: 'Sync with Google Calendar and Outlook to manage appointments and schedules',
    icon: Calendar,
    providers: [
      { name: 'Google Calendar', connected: false },
      { name: 'Outlook Calendar', connected: false },
    ],
  },
  {
    id: 'accounting',
    name: 'Accounting Integration',
    description: 'Connect QuickBooks and Xero to sync invoices, payments, and financial data',
    icon: DollarSign,
    providers: [
      { name: 'QuickBooks', connected: false },
      { name: 'Xero', connected: false },
    ],
  },
];

export function IntegrationsPageClient() {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = React.useState<string | null>(null);

  const handleConnect = async (integrationId: string, providerName: string) => {
    setIsConnecting(`${integrationId}-${providerName}`);
    // Simulate connection process
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsConnecting(null);
    toast({
      title: 'OAuth Integration Coming Soon',
      description: `OAuth integration for ${providerName} will be available soon. This feature will allow you to connect your ${providerName} account securely.`,
    });
  };

  const handleDisconnect = async (integrationId: string, providerName: string) => {
    setIsConnecting(`${integrationId}-${providerName}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsConnecting(null);
    toast({
      title: 'Disconnected',
      description: `${providerName} has been disconnected.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          Connect email, calendar, and accounting services to streamline your workflow
        </p>
      </div>

      {/* Integration Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          const allConnected = integration.providers.every((p) => p.connected);
          const someConnected = integration.providers.some((p) => p.connected);

          return (
            <Card key={integration.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      {allConnected && (
                        <Badge variant="secondary" className="mt-1">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      )}
                      {someConnected && !allConnected && (
                        <Badge variant="outline" className="mt-1">
                          <Plug className="h-3 w-3 mr-1" />
                          Partial
                        </Badge>
                      )}
                      {!someConnected && (
                        <Badge variant="outline" className="mt-1">
                          <XCircle className="h-3 w-3 mr-1" />
                          Not Connected
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <CardDescription>{integration.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {integration.providers.map((provider) => (
                    <div
                      key={provider.name}
                      className="flex items-center justify-between p-2 border rounded-md"
                    >
                      <span className="text-sm font-medium">{provider.name}</span>
                      {provider.connected ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Connected
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDisconnect(integration.id, provider.name)}
                            disabled={isConnecting === `${integration.id}-${provider.name}`}
                          >
                            {isConnecting === `${integration.id}-${provider.name}` ? 'Disconnecting...' : 'Disconnect'}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConnect(integration.id, provider.name)}
                          disabled={isConnecting === `${integration.id}-${provider.name}`}
                        >
                          {isConnecting === `${integration.id}-${provider.name}` ? 'Connecting...' : 'Connect'}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>About Integrations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Integrations allow you to connect external services to streamline your workflow. Once connected,
            you can send emails, sync calendars, and manage accounting data directly from the platform.
            All integrations use secure OAuth 2.0 authentication to protect your data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
