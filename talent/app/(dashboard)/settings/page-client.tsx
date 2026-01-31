'use client';

/**
 * Settings Page Client Component
 *
 * Interactive client component for user settings:
 * - Scheduling link management
 * - Gmail integration
 * - Activity history display
 */

import { useState, useEffect, useTransition, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Calendar, User, History, Check, Loader2, ExternalLink, Mail, Unlink } from 'lucide-react';
import { strings } from '@/config';
import { formatDateTime } from '@/lib/utils';
import {
  fetchUserSettings,
  updateSchedulingLinkAction,
  fetchUserActivityHistory,
  type UserSettingsData,
  type ActivityLogItem,
} from './actions';

/**
 * Gmail status response
 */
interface GmailStatus {
  configured: boolean;
  connected: boolean;
  email: string | null;
}

/**
 * Get action type badge variant and label
 */
function getActionBadge(actionType: string): { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string } {
  switch (actionType) {
    case 'CREATE':
      return { variant: 'default', label: 'Created' };
    case 'UPDATE':
      return { variant: 'secondary', label: 'Updated' };
    case 'DELETE':
      return { variant: 'destructive', label: 'Deleted' };
    case 'VIEW':
      return { variant: 'outline', label: 'Viewed' };
    case 'EMAIL_SENT':
      return { variant: 'default', label: 'Email Sent' };
    case 'STATUS_CHANGE':
      return { variant: 'secondary', label: 'Status Change' };
    case 'STAGE_CHANGE':
      return { variant: 'secondary', label: 'Stage Change' };
    default:
      return { variant: 'outline', label: actionType };
  }
}

interface SettingsClientProps {
  initialUser: {
    name: string | null | undefined;
    email: string | null | undefined;
    isAdmin: boolean;
    dbUserId: string | undefined;
  };
}

export function SettingsClient({ initialUser }: SettingsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [user, setUser] = useState<UserSettingsData | null>(null);
  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [totalActivities, setTotalActivities] = useState(0);
  const [schedulingLink, setSchedulingLink] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);

  // Gmail integration state
  const [gmailStatus, setGmailStatus] = useState<GmailStatus | null>(null);
  const [isLoadingGmail, setIsLoadingGmail] = useState(true);
  const [gmailError, setGmailError] = useState<string | null>(null);
  const [gmailSuccess, setGmailSuccess] = useState<string | null>(null);
  const [isConnectingGmail, setIsConnectingGmail] = useState(false);
  const [isDisconnectingGmail, setIsDisconnectingGmail] = useState(false);

  // Fetch Gmail status
  const fetchGmailStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/gmail/status');
      if (response.ok) {
        const data = await response.json();
        setGmailStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch Gmail status:', err);
    } finally {
      setIsLoadingGmail(false);
    }
  }, []);

  // Handle OAuth popup message
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'gmail-oauth-callback') {
        setIsConnectingGmail(false);
        if (event.data.success) {
          setGmailSuccess(event.data.message);
          fetchGmailStatus(); // Refresh status
          setTimeout(() => setGmailSuccess(null), 3000);
        } else {
          setGmailError(event.data.message);
        }
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fetchGmailStatus]);

  // Fetch user settings and activity on mount
  useEffect(() => {
    async function loadData() {
      const [settingsResult, activityResult] = await Promise.all([
        fetchUserSettings(),
        fetchUserActivityHistory({ limit: 10 }),
        fetchGmailStatus(),
      ]);

      if (settingsResult.success && settingsResult.data) {
        setUser(settingsResult.data.user);
        setSchedulingLink(settingsResult.data.user.schedulingLink || '');
      }

      if (activityResult.success && activityResult.data) {
        setActivities(activityResult.data.activities);
        setTotalActivities(activityResult.data.total);
      }

      setIsLoadingActivities(false);
    }

    loadData();
  }, [fetchGmailStatus]);

  // Handle Gmail connect
  const handleConnectGmail = async () => {
    setGmailError(null);
    setIsConnectingGmail(true);

    try {
      const response = await fetch('/api/gmail/authorize');
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to initiate Gmail connection');
      }

      const { authUrl } = await response.json();

      // Open OAuth popup
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl,
        'gmail-oauth',
        `width=${width},height=${height},left=${left},top=${top},popup=1`
      );

      // Check if popup was blocked
      if (!popup) {
        setIsConnectingGmail(false);
        setGmailError('Popup was blocked. Please allow popups for this site.');
        return;
      }

      // Poll to check if popup was closed without completing OAuth
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setIsConnectingGmail(false);
        }
      }, 500);
    } catch (err) {
      setIsConnectingGmail(false);
      setGmailError(err instanceof Error ? err.message : 'Failed to connect Gmail');
    }
  };

  // Handle Gmail disconnect
  const handleDisconnectGmail = async () => {
    setGmailError(null);
    setIsDisconnectingGmail(true);

    try {
      const response = await fetch('/api/gmail/disconnect', { method: 'POST' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to disconnect Gmail');
      }

      setGmailSuccess('Gmail disconnected successfully');
      setGmailStatus({ configured: gmailStatus?.configured ?? false, connected: false, email: null });
      setTimeout(() => setGmailSuccess(null), 3000);
    } catch (err) {
      setGmailError(err instanceof Error ? err.message : 'Failed to disconnect Gmail');
    } finally {
      setIsDisconnectingGmail(false);
    }
  };

  const handleSaveSchedulingLink = () => {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await updateSchedulingLinkAction(schedulingLink);

      if (result.success) {
        setSuccess('Scheduling link updated successfully');
        setIsEditing(false);
        // Update local state
        if (user) {
          setUser({
            ...user,
            schedulingLink: result.data?.schedulingLink ?? null,
          });
        }
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to update scheduling link');
      }
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSchedulingLink(user?.schedulingLink || '');
    setError(null);
  };

  const handleLoadMoreActivities = () => {
    startTransition(async () => {
      const result = await fetchUserActivityHistory({
        limit: 10,
        offset: activities.length,
      });

      if (result.success && result.data) {
        setActivities([...activities, ...result.data.activities]);
      }
    });
  };

  const hasSchedulingLink = !!user?.schedulingLink;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{strings.settings.title}</h1>
        <p className="text-muted-foreground">
          Manage your profile and preferences
        </p>
      </div>

      {/* Scheduling Link Warning - only show if no scheduling link */}
      {!hasSchedulingLink && (
        <Card className="border-warning bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertCircle className="h-5 w-5" />
              {strings.settings.schedulingLinkMissing}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {strings.settings.schedulingLinkHelp}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {strings.settings.profile}
            </CardTitle>
            <CardDescription>
              {strings.settings.profileDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Name</span>
                <span className="text-sm font-medium">{user?.displayName || initialUser.name || '-'}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm font-medium">{user?.email || initialUser.email || '-'}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Role</span>
                <Badge variant={initialUser.isAdmin ? 'default' : 'secondary'}>
                  {initialUser.isAdmin ? strings.personnel.admin : strings.personnel.hiringManager}
                </Badge>
              </div>
              {user?.title && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Title</span>
                    <span className="text-sm font-medium">{user.title}</span>
                  </div>
                </>
              )}
              {user?.timezone && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Timezone</span>
                    <span className="text-sm font-medium">{user.timezone}</span>
                  </div>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {strings.settings.profileNote}
            </p>
          </CardContent>
        </Card>

        {/* Gmail Integration Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Gmail Integration
            </CardTitle>
            <CardDescription>
              Connect your Gmail to send emails from your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {gmailError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {gmailError}
              </div>
            )}
            {gmailSuccess && (
              <div className="flex items-center gap-2 rounded-md bg-green-500/10 p-3 text-sm text-green-600">
                <Check className="h-4 w-4" />
                {gmailSuccess}
              </div>
            )}

            {isLoadingGmail ? (
              <div className="flex h-[100px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !gmailStatus?.configured ? (
              <div className="space-y-4">
                <div className="rounded-md border border-dashed p-4">
                  <p className="text-center text-sm text-muted-foreground">
                    Gmail OAuth is not configured on this server.
                  </p>
                  <p className="text-center text-xs text-muted-foreground mt-2">
                    Contact your administrator to set up Google API credentials.
                  </p>
                </div>
              </div>
            ) : gmailStatus?.connected ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium">{gmailStatus.email}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Connected
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Emails will be sent from this Gmail account.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleDisconnectGmail}
                  disabled={isDisconnectingGmail}
                >
                  {isDisconnectingGmail ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Disconnecting...
                    </>
                  ) : (
                    <>
                      <Unlink className="mr-2 h-4 w-4" />
                      Disconnect Gmail
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md border border-dashed p-4">
                  <p className="text-center text-sm text-muted-foreground">
                    No Gmail account connected
                  </p>
                  <p className="text-center text-xs text-muted-foreground mt-2">
                    Connect your Gmail to send emails from your account
                  </p>
                </div>
                <Button
                  className="w-full"
                  onClick={handleConnectGmail}
                  disabled={isConnectingGmail}
                >
                  {isConnectingGmail ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Connect Gmail
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scheduling Link Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {strings.settings.schedulingLink}
            </CardTitle>
            <CardDescription>
              {strings.settings.schedulingLinkHelp}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 rounded-md bg-green-500/10 p-3 text-sm text-green-600">
                <Check className="h-4 w-4" />
                {success}
              </div>
            )}

            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="schedulingLink">Scheduling URL</Label>
                  <Input
                    id="schedulingLink"
                    type="url"
                    placeholder="https://calendly.com/your-link"
                    value={schedulingLink}
                    onChange={(e) => setSchedulingLink(e.target.value)}
                    disabled={isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter your Cal.com or Calendly link
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveSchedulingLink}
                    disabled={isPending}
                    className="flex-1"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {hasSchedulingLink ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-md border p-3">
                      <span className="text-sm font-medium truncate max-w-[200px]">
                        {user?.schedulingLink}
                      </span>
                      <a
                        href={user?.schedulingLink || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setIsEditing(true)}
                    >
                      Change Scheduling Link
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-md border border-dashed p-4">
                      <p className="text-center text-sm text-muted-foreground">
                        No scheduling link configured
                      </p>
                    </div>
                    <Button className="w-full" onClick={() => setIsEditing(true)}>
                      Set Scheduling Link
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {strings.settings.activityHistory}
          </CardTitle>
          <CardDescription>
            Your recent actions in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingActivities ? (
            <div className="flex h-[200px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activities.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p>{strings.empty.noActivity}</p>
                <p className="mt-2 text-xs">
                  Your actions will appear here once you start using the system
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                {activities.map((activity) => {
                  const badge = getActionBadge(activity.actionType);
                  return (
                    <div
                      key={activity.id}
                      className="flex items-start justify-between rounded-md border p-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={badge.variant} className="text-xs">
                            {badge.label}
                          </Badge>
                          <span className="text-sm font-medium">{activity.action}</span>
                        </div>
                        {(activity.person || activity.application) && (
                          <p className="text-xs text-muted-foreground">
                            {activity.person && (
                              <>Person: {activity.person.firstName} {activity.person.lastName}</>
                            )}
                            {activity.person && activity.application && ' • '}
                            {activity.application && (
                              <>Position: {activity.application.position}</>
                            )}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(activity.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {activities.length < totalActivities && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMoreActivities}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      `Load More (${totalActivities - activities.length} remaining)`
                    )}
                  </Button>
                </div>
              )}

              <p className="text-center text-xs text-muted-foreground">
                Showing {activities.length} of {totalActivities} activities
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
