'use client';

/**
 * Calendar Integration Settings Page Client Component
 *
 * Configure calendar integrations (Google Calendar, Outlook).
 */

import * as React from 'react';
import { Calendar, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export function CalendarIntegrationSettingsPageClient() {
  const { toast } = useToast();
  const [googleConnected, setGoogleConnected] = React.useState(false);
  const [outlookConnected, setOutlookConnected] = React.useState(false);
  const [isConnecting, setIsConnecting] = React.useState<string | null>(null);

  const handleConnect = async (provider: 'google' | 'outlook') => {
    setIsConnecting(provider);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsConnecting(null);
    if (provider === 'google') {
      setGoogleConnected(true);
    } else {
      setOutlookConnected(true);
    }
    toast({
      title: 'OAuth Integration Coming Soon',
      description: `OAuth integration for ${provider === 'google' ? 'Google Calendar' : 'Outlook Calendar'} will be available soon. This feature will allow you to connect your ${provider === 'google' ? 'Google Calendar' : 'Outlook Calendar'} account securely.`,
    });
  };

  const handleDisconnect = async (provider: 'google' | 'outlook') => {
    setIsConnecting(provider);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsConnecting(null);
    if (provider === 'google') {
      setGoogleConnected(false);
    } else {
      setOutlookConnected(false);
    }
    toast({
      title: 'Disconnected',
      description: `${provider === 'google' ? 'Google Calendar' : 'Outlook Calendar'} has been disconnected.`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendar Integration</h1>
        <p className="text-muted-foreground">
          Connect Google Calendar and Outlook to sync appointments and schedules
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Google Calendar */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle>Google Calendar</CardTitle>
              </div>
              {googleConnected ? (
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
              Connect your Google Calendar to sync events
            </CardDescription>
          </CardHeader>
          <CardContent>
            {googleConnected ? (
              <Button
                variant="outline"
                onClick={() => handleDisconnect('google')}
                disabled={isConnecting === 'google'}
              >
                {isConnecting === 'google' ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            ) : (
              <Button
                onClick={() => handleConnect('google')}
                disabled={isConnecting === 'google'}
              >
                {isConnecting === 'google' ? 'Connecting...' : 'Connect Google Calendar'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Outlook Calendar */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle>Outlook Calendar</CardTitle>
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
              Connect your Outlook Calendar to sync events
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
                {isConnecting === 'outlook' ? 'Connecting...' : 'Connect Outlook Calendar'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
