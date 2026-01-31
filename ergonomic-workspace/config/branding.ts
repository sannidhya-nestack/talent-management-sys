/**
 * Branding Configuration
 *
 * Customize the visual identity of the ergonomic workspace management platform.
 * Update these values to match your organization's branding.
 */

export const branding = {
  // Organization name displayed throughout the application
  organisationName: 'Ergonomic Workspace Solutions',
  organisationShortName: 'ErgoWorkspace',

  // Auth mechanism name (e.g., Okta, Azure AD)
  authProviderName: 'Universal Access',
  authProviderShortName: 'UA',

  // Primary brand color (used for headers, buttons, links)
  primaryColor: '#2E5090',

  // Secondary brand color (used for accents, hover states)
  secondaryColor: '#4472C4',

  // Status colors
  successColor: '#22C55E',
  warningColor: '#F59E0B',
  dangerColor: '#EF4444',

  // Logo paths (relative to /public directory)
  logoPath: '/logos/ergonomic-logo.svg',
  logoDarkPath: '/logos/ergonomic-logo-dark.svg',
  faviconPath: '/logos/favicon.ico',

  // Application metadata
  appName: 'Ergonomic Workspace Platform',
  appDescription: 'Comprehensive workspace assessment and management system',

  // Footer text
  copyrightText: 'Ergonomic Workspace Solutions',
} as const;

export type Branding = typeof branding;
