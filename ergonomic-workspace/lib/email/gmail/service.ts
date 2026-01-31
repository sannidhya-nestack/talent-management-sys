/**
 * Gmail Service
 *
 * Business logic for Gmail integration:
 * - Managing user Gmail credentials
 * - Sending emails via connected Gmail accounts
 * - Auto-refreshing tokens when needed
 */

import {
  exchangeCodeForTokens,
  refreshAccessToken,
  revokeTokens,
  sendEmailViaGmail,
  encryptToken,
  decryptToken,
} from './client';
import { GMAIL_SCOPES, isGmailOAuthConfigured } from './config';
import {
  getEmailAccount,
  upsertEmailAccount,
  updateEmailAccountTokens,
  disconnectEmailAccount,
} from '@/lib/services/integrations/email';

/**
 * Gmail credential with decrypted tokens
 */
export interface GmailCredentialDecrypted {
  id: string;
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: Date | null;
  scopes: string;
}

/**
 * Gmail account info (for listing)
 */
export interface GmailAccountInfo {
  id: string;
  email: string;
  userId: string;
  userName: string;
  connectedAt: Date;
}

/**
 * Save Gmail credentials for a user
 */
export async function saveGmailCredentials(
  userId: string,
  code: string
): Promise<{ email: string }> {
  const tokens = await exchangeCodeForTokens(code);

  // Encrypt tokens before storing
  const encryptedAccessToken = encryptToken(tokens.accessToken);
  const encryptedRefreshToken = encryptToken(tokens.refreshToken);

  // Upsert the credential
  await upsertEmailAccount({
    userId,
    provider: 'GMAIL',
    email: tokens.email,
    accessToken: encryptedAccessToken,
    refreshToken: encryptedRefreshToken,
    expiresAt: tokens.expiryDate,
    scopes: GMAIL_SCOPES.join(','),
  });

  return { email: tokens.email };
}

/**
 * Get Gmail credential for a user (decrypted)
 */
export async function getUserGmailCredential(
  userId: string
): Promise<GmailCredentialDecrypted | null> {
  const account = await getEmailAccount(userId, 'GMAIL');

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
 * Get Gmail credential by email (for admin sender selection)
 */
export async function getGmailCredentialByEmail(
  email: string
): Promise<GmailCredentialDecrypted | null> {
  // Note: This would require a query by email, which needs an index
  // For now, we'll need to iterate or add an index
  // This is a simplified version - in production, add an index on email field
  const { collections } = await import('@/lib/db');
  const snapshot = await collections
    .emailAccounts()
    .where('email', '==', email)
    .where('provider', '==', 'GMAIL')
    .where('isActive', '==', true)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const data = doc.data();

  return {
    id: doc.id,
    userId: data.userId,
    email: data.email,
    accessToken: decryptToken(data.accessToken),
    refreshToken: data.refreshToken ? decryptToken(data.refreshToken) : '',
    tokenExpiry: data.expiresAt ? new Date(data.expiresAt.toMillis()) : null,
    scopes: data.scopes,
  };
}

/**
 * Get all connected Gmail accounts (for admin UI)
 */
export async function getAllGmailAccounts(): Promise<GmailAccountInfo[]> {
  const { collections } = await import('@/lib/db');
  const { timestampToDate } = await import('@/lib/db-utils');
  const { getUserById } = await import('@/lib/services/users');

  const snapshot = await collections
    .emailAccounts()
    .where('provider', '==', 'GMAIL')
    .where('isActive', '==', true)
    .get();

  const accounts = await Promise.all(
    snapshot.docs.map(async (doc) => {
      const data = doc.data();
      const user = await getUserById(data.userId);

      return {
        id: doc.id,
        email: data.email,
        userId: data.userId,
        userName: user?.displayName || 'Unknown',
        connectedAt: timestampToDate(data.createdAt) || new Date(),
      };
    })
  );

  return accounts;
}

/**
 * Disconnect Gmail for a user
 */
export async function disconnectGmail(userId: string): Promise<void> {
  const credential = await getUserGmailCredential(userId);

  if (credential) {
    // Revoke the tokens with Google
    await revokeTokens(credential.accessToken);

    // Get account and disconnect
    const account = await getEmailAccount(userId, 'GMAIL');
    if (account) {
      await disconnectEmailAccount(account.id);
    }
  }
}

/**
 * Check if token needs refresh and refresh if needed
 */
async function ensureValidToken(
  credential: GmailCredentialDecrypted
): Promise<GmailCredentialDecrypted> {
  // Check if token expires within 5 minutes
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

  if (credential.tokenExpiry && credential.tokenExpiry > fiveMinutesFromNow) {
    return credential; // Token still valid
  }

  // Refresh the token
  console.log(`[Gmail] Refreshing token for ${credential.email}`);
  const refreshed = await refreshAccessToken(credential.refreshToken);

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
 * Send email using Gmail API
 *
 * @param senderEmail - Gmail address to send from (must be connected)
 * @param to - Recipient email
 * @param subject - Email subject
 * @param htmlBody - HTML content
 * @param textBody - Plain text content (optional)
 */
export async function sendViaGmail(
  senderEmail: string,
  to: string,
  subject: string,
  htmlBody: string,
  textBody?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!isGmailOAuthConfigured()) {
    return {
      success: false,
      error: 'Gmail OAuth is not configured',
    };
  }

  // Get the credential for this sender
  let credential = await getGmailCredentialByEmail(senderEmail);

  if (!credential) {
    return {
      success: false,
      error: `No Gmail credential found for ${senderEmail}`,
    };
  }

  try {
    // Ensure token is valid
    credential = await ensureValidToken(credential);

    // Send the email
    const result = await sendEmailViaGmail(
      credential.accessToken,
      credential.refreshToken,
      credential.email,
      to,
      subject,
      htmlBody,
      textBody
    );

    console.log(`[Gmail] Email sent via ${senderEmail} to ${to}, messageId: ${result.messageId}`);

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Gmail] Failed to send email via ${senderEmail}:`, errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Check if a user has Gmail connected
 */
export async function hasGmailConnected(userId: string): Promise<boolean> {
  const account = await getEmailAccount(userId, 'GMAIL');
  return account !== null;
}

/**
 * Get the connected Gmail email for a user
 */
export async function getConnectedGmailEmail(userId: string): Promise<string | null> {
  const account = await getEmailAccount(userId, 'GMAIL');
  return account?.email || null;
}
