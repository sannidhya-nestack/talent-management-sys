/**
 * Gmail Integration Module
 *
 * Provides Gmail OAuth2 integration for sending emails.
 */

export {
  gmailOAuthConfig,
  GMAIL_SCOPES,
  isGmailOAuthConfigured,
} from './config';

export {
  generateAuthUrl,
  encryptToken,
  decryptToken,
} from './client';

export {
  saveGmailCredentials,
  getUserGmailCredential,
  getGmailCredentialByEmail,
  getAllGmailAccounts,
  disconnectGmail,
  sendViaGmail,
  hasGmailConnected,
  getConnectedGmailEmail,
  type GmailCredentialDecrypted,
  type GmailAccountInfo,
} from './service';
