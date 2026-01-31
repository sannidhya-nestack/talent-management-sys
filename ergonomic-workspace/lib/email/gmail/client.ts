/**
 * Gmail API Client
 *
 * Handles Gmail API operations including:
 * - OAuth2 token management
 * - Sending emails via Gmail API
 * - Token refresh when expired
 */

/// <reference types="node" />

import { google } from 'googleapis';
import { gmailOAuthConfig, GMAIL_SCOPES, getEncryptionKey } from './config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const oauth2Client = new google.auth.OAuth2(
  gmailOAuthConfig.clientId,
  gmailOAuthConfig.clientSecret,
  gmailOAuthConfig.redirectUri
);

/**
 * Generate OAuth2 authorization URL
 */
export function generateAuthUrl(state: string): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GMAIL_SCOPES,
    state,
    prompt: 'consent', // Force consent to always get refresh token
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
    : new Date(Date.now() + 3600 * 1000); // Default 1 hour

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiryDate,
    email: userInfo.data.email,
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiryDate: Date;
}> {
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
 * Revoke OAuth tokens
 */
export async function revokeTokens(accessToken: string): Promise<void> {
  try {
    await oauth2Client.revokeToken(accessToken);
  } catch (error) {
    // Token might already be invalid, log but don't throw
    console.warn('[Gmail] Failed to revoke token:', error);
  }
}

/**
 * Send email via Gmail API
 */
export async function sendEmailViaGmail(
  accessToken: string,
  refreshToken: string,
  senderEmail: string,
  to: string,
  subject: string,
  htmlBody: string,
  textBody?: string
): Promise<{ messageId: string }> {
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Build RFC 2822 formatted email
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  
  let emailContent: string;
  
  if (textBody) {
    // Multipart email with both text and HTML
    emailContent = [
      `From: ${senderEmail}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      textBody,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      htmlBody,
      '',
      `--${boundary}--`,
    ].join('\r\n');
  } else {
    // HTML only
    emailContent = [
      `From: ${senderEmail}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      htmlBody,
    ].join('\r\n');
  }

  // Base64 URL encode the email
  const encodedMessage = Buffer.from(emailContent)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });

  if (!response.data.id) {
    throw new Error('Failed to send email via Gmail API');
  }

  return { messageId: response.data.id };
}

// =============================================================================
// TOKEN ENCRYPTION
// =============================================================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypt a token for storage
 */
export function encryptToken(token: string): string {
  const key = Buffer.from(getEncryptionKey(), 'utf8');
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a stored token
 */
export function decryptToken(encryptedToken: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedToken.split(':');

  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error('Invalid encrypted token format');
  }

  const key = Buffer.from(getEncryptionKey(), 'utf8');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
