'use client';

/**
 * Email Integration Settings Page Client Component
 *
 * Configure email integrations (Gmail, Outlook).
 */

import * as React from 'react';
import { Mail, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export function EmailIntegrationSettingsPageClient() {
  const { toast } = useToast();
  const [gmailConnected, setGmailConnected] = React.useState(false);
  const [outlookConnected, setOutlookConnected] = React.useState(false);
  const [isConnecting, setIsConnecting] = React.useState<string | null>(null);

  const handleConnect = async (provider: 'gmail' | 'outlook') => {
    setIsConnecting(provider);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsConnecting(null);
    if (provider === 'gmail') {
      setGmailConnected(true);
    } else {
      setOutlookConnected(true);
    }
    toast({
      title: 'OAuth Integration Coming Soon',
      description: `OAuth integration for ${provider === 'gmail' ? 'Gmail' : 'Outlook'} will be available soon. This feature will allow you to connect your ${provider === 'gmail' ? 'Gmail' : 'Outlook'} account securely.`,
    });
  };

  const handleDisconnect = async (provider: 'gmail' | 'outlook') => {
    setIsConnecting(provider);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsConnecting(null);
    if (provider === 'gmail') {
      setGmailConnected(false);
    } else {
      setOutlookConnected(false);
    }
    toast({
      title: 'Disconnected',
      description: `${provider === 'gmail' ? 'Gmail' : 'Outlook'} has been disconnected.`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Email Integration</h1>
        <p className="text-muted-foreground">
          Connect Gmail and Outlook accounts to send emails directly from the platform
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Gmail */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <CardTitle>Gmail</CardTitle>
              </div>
              {gmailConnected ? (
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
              Connect your Gmail account to send emails
            </CardDescription>
          </CardHeader>
          <CardContent>
            {gmailConnected ? (
              <Button
                variant="outline"
                onClick={() => handleDisconnect('gmail')}
                disabled={isConnecting === 'gmail'}
              >
                {isConnecting === 'gmail' ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            ) : (
              <Button
                onClick={() => handleConnect('gmail')}
                disabled={isConnecting === 'gmail'}
              >
                {isConnecting === 'gmail' ? 'Connecting...' : 'Connect Gmail'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Outlook */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <CardTitle>Outlook</CardTitle>
              </div>
              {outlookConnected ? (
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
              Connect your Outlook account to send emails
            </CardDescription>
          </CardHeader>
          <CardContent>
            {outlookConnected ? (
              <Button
                variant="outline"
                onClick={() => handleDisconnect('outlook')}
                disabled={isConnecting === 'outlook'}
              >
                {isConnecting === 'outlook' ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            ) : (
              <Button
                onClick={() => handleConnect('outlook')}
                disabled={isConnecting === 'outlook'}
              >
                {isConnecting === 'outlook' ? 'Connecting...' : 'Connect Outlook'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
