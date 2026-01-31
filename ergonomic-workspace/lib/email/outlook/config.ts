/**
 * Outlook OAuth Configuration
 *
 * Centralized configuration for Outlook/Office 365 OAuth2 integration.
 * Reads from environment variables.
 */

/// <reference types="node" />

/**
 * Outlook OAuth2 configuration from environment
 */
export const outlookOAuthConfig = {
  clientId: process.env.MICROSOFT_CLIENT_ID || '',
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
  redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/api/integrations/email/callback',
  tenant: process.env.MICROSOFT_TENANT_ID || 'common', // 'common' for multi-tenant
};

/**
 * Required OAuth scopes for Outlook integration
 */
export const OUTLOOK_SCOPES = [
  'https://graph.microsoft.com/Mail.Send',
  'https://graph.microsoft.com/Mail.Read',
  'https://graph.microsoft.com/User.Read',
];

/**
 * Check if Outlook OAuth is configured
 */
export function isOutlookOAuthConfigured(): boolean {
  return !!(outlookOAuthConfig.clientId && outlookOAuthConfig.clientSecret);
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
