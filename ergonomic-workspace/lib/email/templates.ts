/**
 * Email Template Engine
 *
 * Handles loading, caching, and rendering of email templates.
 * Templates use {{VARIABLE_NAME}} syntax for variable replacement.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { branding } from '@/config';

/**
 * Template cache to avoid repeated file reads
 */
const templateCache = new Map<string, string>();

/**
 * Get the templates directory path
 */
function getTemplatesDir(): string {
  return join(process.cwd(), 'emails');
}

/**
 * Load a template from disk
 *
 * @param templateName - Name of the template file (without extension)
 * @param format - 'html' or 'txt'
 * @returns Template content or null if not found
 */
export function loadTemplate(templateName: string, format: 'html' | 'txt' = 'html'): string | null {
  const cacheKey = `${templateName}.${format}`;

  // Check cache first
  if (templateCache.has(cacheKey)) {
    return templateCache.get(cacheKey)!;
  }

  const templatePath = join(getTemplatesDir(), `${templateName}.${format}`);

  if (!existsSync(templatePath)) {
    console.warn(`[Email] Template not found: ${templatePath}`);
    return null;
  }

  try {
    const content = readFileSync(templatePath, 'utf-8');
    templateCache.set(cacheKey, content);
    return content;
  } catch (error) {
    console.error(`[Email] Failed to load template ${templatePath}:`, error);
    return null;
  }
}

/**
 * Clear the template cache
 *
 * Useful during development when templates change.
 */
export function clearTemplateCache(): void {
  templateCache.clear();
}

/**
 * Replace variables in a template string
 *
 * Variables use {{VARIABLE_NAME}} syntax.
 *
 * @param template - Template string with {{VARIABLE}} placeholders
 * @param variables - Object of variable name -> value mappings
 * @returns Rendered template with variables replaced
 */
export function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;

  // Replace all variables
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(pattern, value);
  }

  return result;
}

/**
 * Get common variables available to all templates
 */
export function getCommonVariables(): Record<string, string> {
  return {
    ORGANISATION_NAME: branding.organisationName,
    ORGANISATION_SHORT_NAME: branding.organisationShortName,
    APP_NAME: branding.appName,
    YEAR: new Date().getFullYear().toString(),
  };
}

/**
 * Render an email template with variables
 *
 * @param templateName - Name of the template
 * @param variables - Custom variables for this email
 * @returns Rendered HTML and text content, plus subject line
 */
export function renderTemplate(
  templateName: string,
  variables: Record<string, string> = {},
  subject?: string
): {
  html: string | null;
  text: string | null;
  subject: string;
} {
  // Merge common variables with custom ones
  const allVariables = {
    ...getCommonVariables(),
    ...variables,
  };

  // Load HTML template
  const htmlTemplate = loadTemplate(templateName, 'html');
  const html = htmlTemplate ? replaceVariables(htmlTemplate, allVariables) : null;

  // Load text template (fallback)
  const textTemplate = loadTemplate(templateName, 'txt');
  const text = textTemplate ? replaceVariables(textTemplate, allVariables) : null;

  // Get subject
  const finalSubject = subject || replaceVariables('Message from {{ORGANISATION_SHORT_NAME}}', allVariables);

  return { html, text, subject: finalSubject };
}

/**
 * Template library for common email types
 */
export const emailTemplates = {
  assessmentScheduling: {
    name: 'Assessment Scheduling',
    subject: 'Workspace Assessment Scheduled - {{CLIENT_NAME}}',
    variables: ['CLIENT_NAME', 'COMPANY_NAME', 'ASSESSMENT_DATE', 'ASSESSMENT_TIME', 'LOCATION', 'ASSESSMENT_TYPE'],
  },
  proposalDelivery: {
    name: 'Proposal Delivery',
    subject: 'Workspace Proposal - {{CLIENT_NAME}}',
    variables: ['CLIENT_NAME', 'COMPANY_NAME', 'PROPOSAL_DATE', 'PROJECT_NAME'],
  },
  followUpReminder: {
    name: 'Follow-up Reminder',
    subject: 'Follow-up: {{SUBJECT}}',
    variables: ['CLIENT_NAME', 'COMPANY_NAME', 'SUBJECT', 'DUE_DATE'],
  },
  paymentReminder: {
    name: 'Payment Reminder',
    subject: 'Payment Reminder - Invoice {{INVOICE_NUMBER}}',
    variables: ['CLIENT_NAME', 'COMPANY_NAME', 'INVOICE_NUMBER', 'AMOUNT', 'DUE_DATE'],
  },
} as const;

/**
 * Get template variables for a specific template type
 */
export function getTemplateVariables(templateType: keyof typeof emailTemplates): string[] {
  return emailTemplates[templateType].variables;
}
