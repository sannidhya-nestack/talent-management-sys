/**
 * Form Templates Configuration
 *
 * Default templates for the proprietary form builder.
 * These templates can be used as starting points when creating new forms.
 */

import type { FormTemplate, FormField } from '@/types/form';
import { recruitment } from './recruitment';

/**
 * Standard Application Form Template
 *
 * Matches the fields previously collected via Tally forms.
 * This is the default template for creating new application forms.
 */
export const standardApplicationTemplate: FormTemplate = {
  id: 'standard-application',
  name: 'Standard Application',
  description:
    'Complete application form with personal information, background, and supporting documents.',
  headerText: 'Thank you for your interest in joining our team!',
  footerText:
    'By submitting this form, you consent to us processing your data for recruitment purposes.',
  fields: [
    // Section: Personal Information
    {
      id: 'email',
      type: 'email',
      label: 'Email Address',
      placeholder: 'your.email@example.com',
      required: true,
      helpText: 'We will use this email to contact you about your application.',
      mappedTo: 'person.email',
      width: 'full',
    },
    {
      id: 'firstName',
      type: 'text',
      label: 'First Name',
      placeholder: 'John',
      required: true,
      validation: { minLength: 1, maxLength: 100 },
      mappedTo: 'person.firstName',
      width: 'half',
    },
    {
      id: 'lastName',
      type: 'text',
      label: 'Last Name',
      placeholder: 'Doe',
      required: true,
      validation: { minLength: 1, maxLength: 100 },
      mappedTo: 'person.lastName',
      width: 'half',
    },
    {
      id: 'phone',
      type: 'phone',
      label: 'Phone Number',
      placeholder: '+1 (555) 123-4567',
      required: false,
      helpText: 'Include country code for international numbers.',
      mappedTo: 'person.phoneNumber',
      width: 'half',
    },
    {
      id: 'country',
      type: 'select',
      label: 'Country',
      required: false,
      options: [...recruitment.countries.map((c) => c.name)],
      mappedTo: 'person.country',
      width: 'half',
    },
    {
      id: 'portfolio',
      type: 'url',
      label: 'Portfolio / LinkedIn',
      placeholder: 'https://linkedin.com/in/yourprofile',
      required: false,
      helpText: 'Share a link to your portfolio, LinkedIn, or personal website.',
      mappedTo: 'person.portfolioLink',
      width: 'full',
    },
    {
      id: 'education',
      type: 'select',
      label: 'Education Level',
      required: false,
      options: [...recruitment.educationLevels],
      mappedTo: 'person.educationLevel',
      width: 'half',
    },

    // Section: Application Documents
    {
      id: 'resume',
      type: 'file',
      label: 'Resume / CV',
      required: false,
      validation: {
        accept: '.pdf,.doc,.docx',
        maxSize: 10485760, // 10MB
      },
      helpText: 'Upload your resume in PDF or Word format (max 10MB).',
      mappedTo: 'application.resumeUrl',
      width: 'full',
    },
    {
      id: 'academicBg',
      type: 'textarea',
      label: 'Academic Background',
      placeholder: 'Describe your educational background, degrees, certifications...',
      required: false,
      validation: { maxLength: 5000 },
      helpText: 'Tell us about your education and any relevant certifications.',
      mappedTo: 'application.academicBackground',
      width: 'full',
    },
    {
      id: 'experience',
      type: 'textarea',
      label: 'Previous Experience',
      placeholder: 'Describe your relevant work experience...',
      required: false,
      validation: { maxLength: 5000 },
      helpText: 'Share your professional experience relevant to this position.',
      mappedTo: 'application.previousExperience',
      width: 'full',
    },
    {
      id: 'videoLink',
      type: 'url',
      label: 'Video Introduction',
      placeholder: 'https://youtube.com/watch?v=...',
      required: false,
      helpText: 'Link to a brief video introducing yourself (YouTube, Vimeo, or similar).',
      mappedTo: 'application.videoLink',
      width: 'full',
    },
    {
      id: 'otherFile',
      type: 'file',
      label: 'Additional Documents',
      required: false,
      validation: {
        accept: '.pdf,.doc,.docx,.zip',
        maxSize: 20971520, // 20MB
      },
      helpText: 'Upload any additional supporting documents (max 20MB).',
      mappedTo: 'application.otherFileUrl',
      width: 'full',
    },
  ],
};

/**
 * Minimal Application Template
 *
 * A simplified form with only essential fields.
 * Good for quick applications or initial screening.
 */
export const minimalApplicationTemplate: FormTemplate = {
  id: 'minimal-application',
  name: 'Quick Application',
  description: 'Simplified application form with essential fields only.',
  headerText: 'Quick Application',
  footerText: 'We will review your application and get back to you soon.',
  fields: [
    {
      id: 'email',
      type: 'email',
      label: 'Email Address',
      placeholder: 'your.email@example.com',
      required: true,
      mappedTo: 'person.email',
      width: 'full',
    },
    {
      id: 'firstName',
      type: 'text',
      label: 'First Name',
      required: true,
      mappedTo: 'person.firstName',
      width: 'half',
    },
    {
      id: 'lastName',
      type: 'text',
      label: 'Last Name',
      required: true,
      mappedTo: 'person.lastName',
      width: 'half',
    },
    {
      id: 'resume',
      type: 'file',
      label: 'Resume / CV',
      required: true,
      validation: {
        accept: '.pdf,.doc,.docx',
        maxSize: 10485760,
      },
      mappedTo: 'application.resumeUrl',
      width: 'full',
    },
  ],
};

/**
 * Extended Application Template
 *
 * Comprehensive form with additional fields for detailed applications.
 */
export const extendedApplicationTemplate: FormTemplate = {
  id: 'extended-application',
  name: 'Detailed Application',
  description:
    'Comprehensive application form with extended personal and professional information.',
  headerText: 'Detailed Application Form',
  footerText:
    'Thank you for taking the time to provide detailed information. This helps us better evaluate your fit for the role.',
  fields: [
    // All fields from standard template
    ...standardApplicationTemplate.fields,
    // Additional fields
    {
      id: 'middleName',
      type: 'text',
      label: 'Middle Name',
      required: false,
      mappedTo: 'person.middleName',
      width: 'half',
    },
    {
      id: 'city',
      type: 'text',
      label: 'City',
      required: false,
      mappedTo: 'person.city',
      width: 'half',
    },
    {
      id: 'state',
      type: 'text',
      label: 'State / Province',
      required: false,
      mappedTo: 'person.state',
      width: 'half',
    },
    {
      id: 'whyInterested',
      type: 'textarea',
      label: 'Why are you interested in this position?',
      required: false,
      validation: { maxLength: 2000 },
      helpText: 'Tell us what attracted you to this opportunity.',
      width: 'full',
    },
    {
      id: 'availability',
      type: 'text',
      label: 'Availability / Start Date',
      placeholder: 'e.g., Immediately, 2 weeks notice, January 2025',
      required: false,
      width: 'half',
    },
    {
      id: 'salaryExpectation',
      type: 'text',
      label: 'Salary Expectation',
      placeholder: 'e.g., $50,000 - $60,000 annually',
      required: false,
      width: 'half',
    },
  ],
};

/**
 * All available form templates
 */
export const formTemplates: FormTemplate[] = [
  standardApplicationTemplate,
  minimalApplicationTemplate,
  extendedApplicationTemplate,
];

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): FormTemplate | undefined {
  return formTemplates.find((t) => t.id === id);
}

/**
 * Get the default template
 */
export function getDefaultTemplate(): FormTemplate {
  return standardApplicationTemplate;
}

/**
 * Field type display names
 */
export const fieldTypeLabels: Record<string, string> = {
  text: 'Short Text',
  email: 'Email',
  textarea: 'Long Text',
  select: 'Dropdown',
  file: 'File Upload',
  checkbox: 'Checkbox',
  checkboxGroup: 'Checkbox Group',
  url: 'URL / Link',
  phone: 'Phone Number',
  number: 'Number',
};

/**
 * Field type icons (for UI)
 */
export const fieldTypeIcons: Record<string, string> = {
  text: 'Type',
  email: 'Mail',
  textarea: 'AlignLeft',
  select: 'ChevronDown',
  file: 'Upload',
  checkbox: 'CheckSquare',
  checkboxGroup: 'List',
  url: 'Link',
  phone: 'Phone',
  number: 'Hash',
};

/**
 * Generate a URL-friendly slug from a string
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

/**
 * Validate a slug format
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 3 && slug.length <= 50;
}
