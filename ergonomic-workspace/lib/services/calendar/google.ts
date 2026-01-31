/**
 * Google Calendar Service
 *
 * Handles Google Calendar API operations.
 */

import { google } from 'googleapis';
import { getCalendarAccount, updateCalendarAccountTokens } from '../integrations/calendar';
import { decryptToken, encryptToken } from '@/lib/email/gmail/client';

const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

/**
 * Get OAuth2 client for Google Calendar
 */
function getOAuth2Client(accessToken: string, refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_GMAIL_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.GOOGLE_GMAIL_CLIENT_SECRET,
    process.env.GOOGLE_CALENDAR_REDIRECT_URI || process.env.GOOGLE_GMAIL_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return oauth2Client;
}

/**
 * Generate OAuth2 authorization URL for Google Calendar
 */
export function generateAuthUrl(state: string): string {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_GMAIL_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.GOOGLE_GMAIL_CLIENT_SECRET,
    process.env.GOOGLE_CALENDAR_REDIRECT_URI || process.env.GOOGLE_GMAIL_REDIRECT_URI
  );

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_CALENDAR_SCOPES,
    state,
    prompt: 'consent',
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiryDate: Date;
  email: string;
}> {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_GMAIL_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.GOOGLE_GMAIL_CLIENT_SECRET,
    process.env.GOOGLE_CALENDAR_REDIRECT_URI || process.env.GOOGLE_GMAIL_REDIRECT_URI
  );

  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Failed to obtain tokens from Google');
  }

  // Get user email
  oauth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();

  if (!userInfo.data.email) {
    throw new Error('Failed to get user email from Google');
  }

  const expiryDate = tokens.expiry_date
    ? new Date(tokens.expiry_date)
    : new Date(Date.now() + 3600 * 1000);

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiryDate,
    email: userInfo.data.email,
  };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiryDate: Date;
}> {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_GMAIL_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.GOOGLE_GMAIL_CLIENT_SECRET,
    process.env.GOOGLE_CALENDAR_REDIRECT_URI || process.env.GOOGLE_GMAIL_REDIRECT_URI
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error('Failed to refresh access token');
  }

  const expiryDate = credentials.expiry_date
    ? new Date(credentials.expiry_date)
    : new Date(Date.now() + 3600 * 1000);

  return {
    accessToken: credentials.access_token,
    expiryDate,
  };
}

/**
 * Ensure valid token and refresh if needed
 */
async function ensureValidToken(userId: string, accountId?: string): Promise<{ accessToken: string; accountId: string }> {
  const { getCalendarAccount } = await import('../integrations/calendar');
  const account = accountId
    ? await getCalendarAccount(userId, 'GOOGLE_CALENDAR')
    : await getCalendarAccount(userId, 'GOOGLE_CALENDAR');
  if (!account) {
    throw new Error('Calendar account not found');
  }

  const accessToken = decryptToken(account.accessToken);
  const refreshToken = account.refreshToken ? decryptToken(account.refreshToken) : '';

  // Check if token expires within 5 minutes
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
  if (account.expiresAt && account.expiresAt > fiveMinutesFromNow) {
    return { accessToken, accountId: account.id };
  }

  // Refresh token
  const refreshed = await refreshAccessToken(refreshToken);
  const encryptedAccessToken = encryptToken(refreshed.accessToken);
  await updateCalendarAccountTokens(
    account.id,
    encryptedAccessToken,
    account.refreshToken,
    refreshed.expiryDate
  );

  return { accessToken: refreshed.accessToken, accountId: account.id };
}

/**
 * Create calendar event
 */
export async function createCalendarEvent(
  userId: string,
  event: {
    summary: string;
    description?: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    location?: string;
    attendees?: Array<{ email: string }>;
  }
): Promise<{ id: string }> {
  const { getCalendarAccount } = await import('../integrations/calendar');
  const { accessToken, accountId } = await ensureValidToken(userId);
  const account = await getCalendarAccount(userId, 'GOOGLE_CALENDAR');
  if (!account) {
    throw new Error('Calendar account not found');
  }

  const refreshToken = account.refreshToken ? decryptToken(account.refreshToken) : '';
  const oauth2Client = getOAuth2Client(accessToken, refreshToken);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const response = await calendar.events.insert({
    calendarId: account.calendarId || 'primary',
    requestBody: event,
  });

  if (!response.data.id) {
    throw new Error('Failed to create calendar event');
  }

  return { id: response.data.id };
}

/**
 * Get calendar events
 */
export async function getCalendarEvents(
  userId: string,
  options: {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
  } = {}
): Promise<Array<{
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
}>> {
  const { getCalendarAccount } = await import('../integrations/calendar');
  const { accessToken } = await ensureValidToken(userId);
  const account = await getCalendarAccount(userId, 'GOOGLE_CALENDAR');
  if (!account) {
    throw new Error('Calendar account not found');
  }

  const refreshToken = account.refreshToken ? decryptToken(account.refreshToken) : '';
  const oauth2Client = getOAuth2Client(accessToken, refreshToken);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const response = await calendar.events.list({
    calendarId: account.calendarId || 'primary',
    timeMin: options.timeMin,
    timeMax: options.timeMax,
    maxResults: options.maxResults || 100,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return (response.data.items || []).map((event) => ({
    id: event.id || '',
    summary: event.summary || '',
    start: event.start || {},
    end: event.end || {},
    location: event.location,
  }));
}
