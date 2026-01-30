/**
 * Gmail OAuth Configuration
 *
 * Centralized configuration for Gmail OAuth2 integration.
 * Reads from environment variables.
 */

/// <reference types="node" />

/**
 * Gmail OAuth2 configuration from environment
 */
export const gmailOAuthConfig = {
  clientId: process.env.GOOGLE_GMAIL_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_GMAIL_CLIENT_SECRET || '',
  redirectUri: process.env.GOOGLE_GMAIL_REDIRECT_URI || 'http://localhost:3000/api/gmail/callback',
};

/**
 * Required OAuth scopes for Gmail integration
 */
export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

/**
 * Check if Gmail OAuth is configured
 */
export function isGmailOAuthConfigured(): boolean {
  return !!(gmailOAuthConfig.clientId && gmailOAuthConfig.clientSecret);
}

/**
 * Token encryption key (derived from NextAuth secret)
 */
export function getEncryptionKey(): string {
  const secret = process.env.NEXTAUTH_SECRET || '';
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is required for token encryption');
  }
  // Use first 32 characters of the secret as the encryption key
  return secret.substring(0, 32).padEnd(32, '0');
}
