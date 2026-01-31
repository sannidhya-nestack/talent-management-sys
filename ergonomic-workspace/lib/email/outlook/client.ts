/**
 * Outlook API Client
 *
 * Handles Outlook/Microsoft Graph API operations including:
 * - OAuth2 token management
 * - Sending emails via Microsoft Graph API
 * - Token refresh when expired
 */

/// <reference types="node" />

import { outlookOAuthConfig, OUTLOOK_SCOPES, getEncryptionKey } from './config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// Microsoft Graph API endpoints
const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';
const AUTH_BASE = `https://login.microsoftonline.com/${outlookOAuthConfig.tenant}/oauth2/v2.0`;

/**
 * Generate OAuth2 authorization URL
 */
export function generateAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: outlookOAuthConfig.clientId,
    response_type: 'code',
    redirect_uri: outlookOAuthConfig.redirectUri,
    response_mode: 'query',
    scope: OUTLOOK_SCOPES.join(' '),
    state,
    prompt: 'consent', // Force consent to always get refresh token
  });

  return `${AUTH_BASE}/authorize?${params.toString()}`;
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
  const tokenUrl = `${AUTH_BASE}/token`;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: outlookOAuthConfig.clientId,
      client_secret: outlookOAuthConfig.clientSecret,
      code,
      redirect_uri: outlookOAuthConfig.redirectUri,
      grant_type: 'authorization_code',
      scope: OUTLOOK_SCOPES.join(' '),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${error}`);
  }

  const tokens = await response.json();

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Failed to obtain tokens from Microsoft');
  }

  // Get user email from Microsoft Graph
  const userInfoResponse = await fetch(`${GRAPH_API_BASE}/me`, {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
    },
  });

  if (!userInfoResponse.ok) {
    throw new Error('Failed to get user email from Microsoft Graph');
  }

  const userInfo = await userInfoResponse.json();

  if (!userInfo.mail && !userInfo.userPrincipalName) {
    throw new Error('Failed to get user email from Microsoft');
  }

  const expiryDate = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : new Date(Date.now() + 3600 * 1000); // Default 1 hour

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiryDate,
    email: userInfo.mail || userInfo.userPrincipalName,
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiryDate: Date;
}> {
  const tokenUrl = `${AUTH_BASE}/token`;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: outlookOAuthConfig.clientId,
      client_secret: outlookOAuthConfig.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: OUTLOOK_SCOPES.join(' '),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh access token: ${error}`);
  }

  const tokens = await response.json();

  if (!tokens.access_token) {
    throw new Error('Failed to refresh access token');
  }

  const expiryDate = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : new Date(Date.now() + 3600 * 1000);

  return {
    accessToken: tokens.access_token,
    expiryDate,
  };
}

/**
 * Revoke OAuth tokens
 */
export async function revokeTokens(accessToken: string): Promise<void> {
  try {
    const revokeUrl = `${AUTH_BASE}/logout`;
    await fetch(revokeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        token: accessToken,
      }),
    });
  } catch (error) {
    // Token might already be invalid, log but don't throw
    console.warn('[Outlook] Failed to revoke token:', error);
  }
}

/**
 * Send email via Microsoft Graph API
 */
export async function sendEmailViaOutlook(
  accessToken: string,
  refreshToken: string,
  senderEmail: string,
  to: string,
  subject: string,
  htmlBody: string,
  textBody?: string
): Promise<{ messageId: string }> {
  // Build email message
  const message: {
    message: {
      subject: string;
      body: {
        contentType: string;
        content: string;
      };
      toRecipients: Array<{ emailAddress: { address: string } }>;
    };
    saveToSentItems: boolean;
  } = {
    message: {
      subject,
      body: {
        contentType: 'HTML',
        content: htmlBody,
      },
      toRecipients: [
        {
          emailAddress: {
            address: to,
          },
        },
      ],
    },
    saveToSentItems: true,
  };

  // If text body provided, use multipart
  if (textBody) {
    // For simplicity, we'll use HTML body
    // In production, you might want to create a multipart message
    message.message.body = {
      contentType: 'HTML',
      content: htmlBody,
    };
  }

  const response = await fetch(`${GRAPH_API_BASE}/me/sendMail`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email via Outlook API: ${error}`);
  }

  // Microsoft Graph doesn't return message ID in sendMail response
  // We'll generate one for tracking
  const messageId = `outlook-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  return { messageId };
}

// =============================================================================
// TOKEN ENCRYPTION
// =============================================================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

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
