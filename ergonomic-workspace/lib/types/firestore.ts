/**
 * Firestore Type Definitions
 *
 * Type definitions for Firestore collections and documents.
 * 
 * Note: This file is used on both server and client. Firebase Admin types
 * are only imported as types to avoid bundling server-only code in the client.
 */

import type { Timestamp } from 'firebase-admin/firestore';

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  CLIENTS: 'clients',
  CONTACTS: 'contacts',
  PROJECTS: 'projects',
  ASSESSMENTS: 'assessments',
  QUESTIONNAIRES: 'questionnaires',
  QUESTIONNAIRE_TEMPLATES: 'questionnaireTemplates',
  QUESTIONNAIRE_RESPONSES: 'questionnaireResponses',
  DOCUMENTS: 'documents',
  DOCUMENT_VERSIONS: 'documentVersions',
  SHARED_DOCUMENTS: 'sharedDocuments',
  ACTIVITIES: 'activities',
  COMMUNICATIONS: 'communications',
  INVOICES: 'invoices',
  PAYMENTS: 'payments',
  INSTALLATIONS: 'installations',
  PRODUCTS: 'products',
  LAYOUTS: 'layouts',
  EMAIL_ACCOUNTS: 'emailAccounts',
  CALENDAR_ACCOUNTS: 'calendarAccounts',
  ACCOUNTING_ACCOUNTS: 'accountingAccounts',
  AI_CONVERSATIONS: 'aiConversations',
  AUDIT_LOGS: 'auditLogs',
  REMINDERS: 'reminders',
  PROPOSALS: 'proposals',
  EMAIL_LOGS: 'emailLogs',
  CALENDAR_EVENTS: 'calendarEvents',
  TEAM_MEMBERS: 'teamMembers',
  INSTALLATION_TEAMS: 'installationTeams',
} as const;

// Enums
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  SUSPENDED = 'SUSPENDED',
}

export enum ClientStatus {
  ACTIVE = 'ACTIVE',
  PROSPECT = 'PROSPECT',
  INACTIVE = 'INACTIVE',
}

export enum BudgetRange {
  UNDER_10K = 'UNDER_10K',
  TEN_TO_50K = 'TEN_TO_50K',
  FIFTY_TO_100K = 'FIFTY_TO_100K',
  OVER_100K = 'OVER_100K',
}

export enum ProjectStatus {
  PLANNING = 'PLANNING',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ProjectPhase {
  ASSESSMENT = 'ASSESSMENT',
  PROPOSAL = 'PROPOSAL',
  APPROVAL = 'APPROVAL',
  INSTALLATION = 'INSTALLATION',
  POST_INSTALLATION_REVIEW = 'POST_INSTALLATION_REVIEW',
}

export enum AssessmentType {
  WORKSPACE = 'WORKSPACE',
  ERGONOMIC = 'ERGONOMIC',
  LIGHTING = 'LIGHTING',
  AIR_QUALITY = 'AIR_QUALITY',
  COMPREHENSIVE = 'COMPREHENSIVE',
}

export enum AssessmentStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REPORT_GENERATED = 'REPORT_GENERATED',
  CANCELLED = 'CANCELLED',
}

export enum QuestionnaireStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE',
}

export enum DocumentCategory {
  LEGAL = 'LEGAL',
  FINANCIAL = 'FINANCIAL',
  PROJECT = 'PROJECT',
  ASSESSMENT = 'ASSESSMENT',
  INSTALLATION = 'INSTALLATION',
  OTHER = 'OTHER',
}

export enum ActivityType {
  STATUS_CHANGE = 'STATUS_CHANGE',
  ASSESSMENT = 'ASSESSMENT',
  DOCUMENT = 'DOCUMENT',
  PAYMENT = 'PAYMENT',
  COMMUNICATION = 'COMMUNICATION',
  INSTALLATION = 'INSTALLATION',
  PROJECT = 'PROJECT',
}

export enum CommunicationType {
  EMAIL = 'EMAIL',
  CALL = 'CALL',
  MEETING = 'MEETING',
  NOTE = 'NOTE',
}

export enum InstallationStatus {
  SCHEDULED = 'SCHEDULED',
  ORDERED = 'ORDERED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED_TO_WAREHOUSE = 'DELIVERED_TO_WAREHOUSE',
  DELIVERED_TO_SITE = 'DELIVERED_TO_SITE',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum DeliveryStatus {
  ORDERED = 'ORDERED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED_TO_WAREHOUSE = 'DELIVERED_TO_WAREHOUSE',
  DELIVERED_TO_SITE = 'DELIVERED_TO_SITE',
  INSTALLATION_COMPLETE = 'INSTALLATION_COMPLETE',
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  MULTIPLE_SELECT = 'MULTIPLE_SELECT',
  LIKERT_SCALE = 'LIKERT_SCALE',
  TRUE_FALSE = 'TRUE_FALSE',
  TEXT = 'TEXT',
  RATING = 'RATING',
}

// Helper type for Firestore documents with timestamps
export interface FirestoreDocument {
  id: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

// Helper functions that use Timestamp are in lib/db-utils.ts (server-only)
// These are kept here for type definitions only
