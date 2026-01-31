/**
 * Gmail Service
 *
 * Business logic for Gmail integration:
 * - Managing user Gmail credentials
 * - Sending emails via connected Gmail accounts
 * - Auto-refreshing tokens when needed
 */

import { db } from '@/lib/db';
import {
  exchangeCodeForTokens,
  refreshAccessToken,
  revokeTokens,
  sendEmailViaGmail,
  encryptToken,
  decryptToken,
} from './client';
import { GMAIL_SCOPES, isGmailOAuthConfigured } from './config';

/**
 * Gmail credential with decrypted tokens
 */
export interface GmailCredentialDecrypted {
  id: string;
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: Date;
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

  // Upsert the credential (one per user)
  await db.emailAccount.upsert({
    where: { userId },
    create: {
      userId,
      email: tokens.email,
      provider: 'GMAIL',
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt: tokens.expiryDate,
      scopes: GMAIL_SCOPES.join(','),
      isActive: true,
    },
    update: {
      email: tokens.email,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt: tokens.expiryDate,
      scopes: GMAIL_SCOPES.join(','),
      isActive: true,
    },
  });

  return { email: tokens.email };
}

/**
 * Get Gmail credential for a user (decrypted)
 */
export async function getUserGmailCredential(
  userId: string
): Promise<GmailCredentialDecrypted | null> {
  const credential = await db.emailAccount.findUnique({
    where: { userId },
  });

  if (!credential || credential.provider !== 'GMAIL') {
    return null;
  }

  return {
    id: credential.id,
    userId: credential.userId,
    email: credential.email,
    accessToken: decryptToken(credential.accessToken),
    refreshToken: credential.refreshToken ? decryptToken(credential.refreshToken) : '',
    tokenExpiry: credential.expiresAt,
    scopes: credential.scopes,
  };
}

/**
 * Get Gmail credential by email (for admin sender selection)
 */
export async function getGmailCredentialByEmail(
  email: string
): Promise<GmailCredentialDecrypted | null> {
  const credential = await db.emailAccount.findFirst({
    where: { email, provider: 'GMAIL' },
  });

  if (!credential) {
    return null;
  }

  return {
    id: credential.id,
    userId: credential.userId,
    email: credential.email,
    accessToken: decryptToken(credential.accessToken),
    refreshToken: credential.refreshToken ? decryptToken(credential.refreshToken) : '',
    tokenExpiry: credential.expiresAt,
    scopes: credential.scopes,
  };
}

/**
 * Get all connected Gmail accounts (for admin UI)
 */
export async function getAllGmailAccounts(): Promise<GmailAccountInfo[]> {
  const credentials = await db.emailAccount.findMany({
    where: { provider: 'GMAIL' },
    include: {
      user: {
        select: {
          displayName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return credentials.map((c) => ({
    id: c.id,
    email: c.email,
    userId: c.userId,
    userName: c.user.displayName,
    connectedAt: c.createdAt,
  }));
}

/**
 * Disconnect Gmail for a user
 */
export async function disconnectGmail(userId: string): Promise<void> {
  const credential = await getUserGmailCredential(userId);

  if (credential) {
    // Revoke the tokens with Google
    await revokeTokens(credential.accessToken);

    // Delete from database
    await db.emailAccount.delete({
      where: { userId },
    });
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

  if (credential.tokenExpiry > fiveMinutesFromNow) {
    return credential; // Token still valid
  }

  // Refresh the token
  console.log(`[Gmail] Refreshing token for ${credential.email}`);
  const refreshed = await refreshAccessToken(credential.refreshToken);

  // Update in database
  const encryptedAccessToken = encryptToken(refreshed.accessToken);
  await db.emailAccount.update({
    where: { id: credential.id },
    data: {
      accessToken: encryptedAccessToken,
      expiresAt: refreshed.expiryDate,
    },
  });

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
  const count = await db.emailAccount.count({
    where: { userId, provider: 'GMAIL' },
  });
  return count > 0;
}

/**
 * Get the connected Gmail email for a user
 */
export async function getConnectedGmailEmail(userId: string): Promise<string | null> {
  const credential = await db.emailAccount.findUnique({
    where: { userId },
    select: { email: true },
  });
  return credential?.email || null;
}
