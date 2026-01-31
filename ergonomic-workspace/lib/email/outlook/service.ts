/**
 * Outlook Service
 *
 * Business logic for Outlook/Office 365 integration:
 * - Managing user Outlook credentials
 * - Sending emails via connected Outlook accounts
 * - Auto-refreshing tokens when needed
 */

import {
  exchangeCodeForTokens as outlookExchangeCodeForTokens,
  refreshAccessToken as outlookRefreshAccessToken,
  revokeTokens as outlookRevokeTokens,
  sendEmailViaOutlook,
  encryptToken,
  decryptToken,
} from './client';
import { OUTLOOK_SCOPES, isOutlookOAuthConfigured } from './config';
import {
  getEmailAccount,
  upsertEmailAccount,
  updateEmailAccountTokens,
  disconnectEmailAccount,
} from '@/lib/services/integrations/email';

/**
 * Outlook credential with decrypted tokens
 */
export interface OutlookCredentialDecrypted {
  id: string;
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: Date | null;
  scopes: string;
}

/**
 * Outlook account info (for listing)
 */
export interface OutlookAccountInfo {
  id: string;
  email: string;
  userId: string;
  userName: string;
  connectedAt: Date;
}

/**
 * Save Outlook credentials for a user
 */
export async function saveOutlookCredentials(
  userId: string,
  code: string
): Promise<{ email: string }> {
  const tokens = await outlookExchangeCodeForTokens(code);

  // Encrypt tokens before storing
  const encryptedAccessToken = encryptToken(tokens.accessToken);
  const encryptedRefreshToken = encryptToken(tokens.refreshToken);

  // Upsert the credential
  await upsertEmailAccount({
    userId,
    provider: 'OUTLOOK',
    email: tokens.email,
    accessToken: encryptedAccessToken,
    refreshToken: encryptedRefreshToken,
    expiresAt: tokens.expiryDate,
    scopes: OUTLOOK_SCOPES.join(','),
  });

  return { email: tokens.email };
}

/**
 * Get Outlook credential for a user (decrypted)
 */
export async function getUserOutlookCredential(
  userId: string
): Promise<OutlookCredentialDecrypted | null> {
  const account = await getEmailAccount(userId, 'OUTLOOK');

  if (!account) {
    return null;
  }

  return {
    id: account.id,
    userId: account.userId,
    email: account.email,
    accessToken: decryptToken(account.accessToken),
    refreshToken: account.refreshToken ? decryptToken(account.refreshToken) : '',
    tokenExpiry: account.expiresAt,
    scopes: account.scopes,
  };
}

/**
 * Disconnect Outlook for a user
 */
export async function disconnectOutlook(userId: string): Promise<void> {
  const credential = await getUserOutlookCredential(userId);

  if (credential) {
    // Revoke the tokens with Microsoft
    await outlookRevokeTokens(credential.accessToken);

    // Get account and disconnect
    const account = await getEmailAccount(userId, 'OUTLOOK');
    if (account) {
      await disconnectEmailAccount(account.id);
    }
  }
}

/**
 * Check if token needs refresh and refresh if needed
 */
async function ensureValidToken(
  credential: OutlookCredentialDecrypted
): Promise<OutlookCredentialDecrypted> {
  // Check if token expires within 5 minutes
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

  if (credential.tokenExpiry && credential.tokenExpiry > fiveMinutesFromNow) {
    return credential; // Token still valid
  }

  // Refresh the token
  console.log(`[Outlook] Refreshing token for ${credential.email}`);
  const refreshed = await outlookRefreshAccessToken(credential.refreshToken);

  // Update in database
  const encryptedAccessToken = encryptToken(refreshed.accessToken);
  await updateEmailAccountTokens(
    credential.id,
    encryptedAccessToken,
    credential.refreshToken ? encryptToken(credential.refreshToken) : null,
    refreshed.expiryDate
  );

  return {
    ...credential,
    accessToken: refreshed.accessToken,
    tokenExpiry: refreshed.expiryDate,
  };
}

/**
 * Send email using Outlook API
 *
 * @param senderEmail - Outlook address to send from (must be connected)
 * @param to - Recipient email
 * @param subject - Email subject
 * @param htmlBody - HTML content
 * @param textBody - Plain text content (optional)
 */
export async function sendViaOutlook(
  senderEmail: string,
  to: string,
  subject: string,
  htmlBody: string,
  textBody?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!isOutlookOAuthConfigured()) {
    return {
      success: false,
      error: 'Outlook OAuth is not configured',
    };
  }

  // Get the credential for this sender
  let credential = await getUserOutlookCredential(senderEmail);

  if (!credential) {
    return {
      success: false,
      error: `No Outlook credential found for ${senderEmail}`,
    };
  }

  try {
    // Ensure token is valid
    credential = await ensureValidToken(credential);

    // Send the email
    const result = await sendEmailViaOutlook(
      credential.accessToken,
      credential.refreshToken,
      credential.email,
      to,
      subject,
      htmlBody,
      textBody
    );

    console.log(`[Outlook] Email sent via ${senderEmail} to ${to}, messageId: ${result.messageId}`);

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Outlook] Failed to send email via ${senderEmail}:`, errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Check if a user has Outlook connected
 */
export async function hasOutlookConnected(userId: string): Promise<boolean> {
  const account = await getEmailAccount(userId, 'OUTLOOK');
  return account !== null;
}

/**
 * Get the connected Outlook email for a user
 */
export async function getConnectedOutlookEmail(userId: string): Promise<string | null> {
  const account = await getEmailAccount(userId, 'OUTLOOK');
  return account?.email || null;
}
