'use client';

/**
 * Accounting Integration Settings Page Client Component
 *
 * Configure accounting integrations (QuickBooks, Xero).
 */

import * as React from 'react';
import { DollarSign, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export function AccountingIntegrationSettingsPageClient() {
  const { toast } = useToast();
  const [quickbooksConnected, setQuickbooksConnected] = React.useState(false);
  const [xeroConnected, setXeroConnected] = React.useState(false);
  const [isConnecting, setIsConnecting] = React.useState<string | null>(null);

  const handleConnect = async (provider: 'quickbooks' | 'xero') => {
    setIsConnecting(provider);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsConnecting(null);
    if (provider === 'quickbooks') {
      setQuickbooksConnected(true);
    } else {
      setXeroConnected(true);
    }
    toast({
      title: 'OAuth Integration Coming Soon',
      description: `OAuth integration for ${provider === 'quickbooks' ? 'QuickBooks' : 'Xero'} will be available soon. This feature will allow you to connect your ${provider === 'quickbooks' ? 'QuickBooks' : 'Xero'} account securely.`,
    });
  };

  const handleDisconnect = async (provider: 'quickbooks' | 'xero') => {
    setIsConnecting(provider);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsConnecting(null);
    if (provider === 'quickbooks') {
      setQuickbooksConnected(false);
    } else {
      setXeroConnected(false);
    }
    toast({
      title: 'Disconnected',
      description: `${provider === 'quickbooks' ? 'QuickBooks' : 'Xero'} has been disconnected.`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Accounting Integration</h1>
        <p className="text-muted-foreground">
          Connect QuickBooks and Xero to sync invoices, payments, and financial data
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* QuickBooks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-primary" />
                <CardTitle>QuickBooks</CardTitle>
              </div>
              {quickbooksConnected ? (
                <Badge variant="secondary">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="outline">
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Connected
                </Badge>
              )}
            </div>
            <CardDescription>
              Connect your QuickBooks account to sync financial data
            </CardDescription>
          </CardHeader>
          <CardContent>
            {quickbooksConnected ? (
              <Button
                variant="outline"
                onClick={() => handleDisconnect('quickbooks')}
                disabled={isConnecting === 'quickbooks'}
              >
                {isConnecting === 'quickbooks' ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            ) : (
              <Button
                onClick={() => handleConnect('quickbooks')}
                disabled={isConnecting === 'quickbooks'}
              >
                {isConnecting === 'quickbooks' ? 'Connecting...' : 'Connect QuickBooks'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Xero */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-primary" />
                <CardTitle>Xero</CardTitle>
              </div>
              {xeroConnected ? (
                <Badge variant="secondary">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="outline">
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Connected
                </Badge>
              )}
            </div>
            <CardDescription>
              Connect your Xero account to sync financial data
            </CardDescription>
          </CardHeader>
          <CardContent>
            {xeroConnected ? (
              <Button
                variant="outline"
                onClick={() => handleDisconnect('xero')}
                disabled={isConnecting === 'xero'}
              >
                {isConnecting === 'xero' ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            ) : (
              <Button
                onClick={() => handleConnect('xero')}
                disabled={isConnecting === 'xero'}
              >
                {isConnecting === 'xero' ? 'Connecting...' : 'Connect Xero'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
