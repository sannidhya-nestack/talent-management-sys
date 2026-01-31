/**
 * Audit Logging Service
 *
 * Provides comprehensive activity logging for compliance and debugging.
 * Logs all significant actions including:
 * - Database writes (create, update, delete)
 * - Email sends
 * - Status/stage transitions
 * - User logins
 */

import { collections, generateId } from '@/lib/db';
import { serverTimestamp } from '@/lib/db-utils';

export enum ActionType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  STATUS_CHANGE = 'STATUS_CHANGE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EMAIL_SENT = 'EMAIL_SENT',
}

/**
 * Options for creating an audit log entry
 */
export interface AuditLogOptions {
  /** Reference to the user who performed the action */
  userId?: string;
  /** Human-readable action description */
  action: string;
  /** Type of action for filtering */
  actionType: ActionType;
  /** Entity type (e.g., "Client", "Assessment", "Invoice") */
  entityType?: string;
  /** Entity ID */
  entityId?: string;
  /** Additional details (stored as JSON) */
  details?: Record<string, unknown>;
  /** Client IP address */
  ipAddress?: string | null;
  /** User agent string */
  userAgent?: string | null;
}

/**
 * Create an audit log entry
 *
 * @param options - Audit log options
 * @returns Created audit log entry
 */
export async function createAuditLog(options: AuditLogOptions) {
  const id = generateId();
  const logData = {
    id,
    userId: options.userId || null,
    action: options.action,
    actionType: options.actionType,
    entityType: options.entityType || null,
    entityId: options.entityId || null,
    details: options.details || null,
    ipAddress: options.ipAddress || null,
    userAgent: options.userAgent || null,
    createdAt: serverTimestamp(),
  };

  await collections.auditLogs().doc(id).set(logData);

  return {
    id,
    ...logData,
    createdAt: new Date(),
  };
}

/**
 * Log a client creation event
 */
export async function logClientCreated(
  clientId: string,
  userId?: string,
  details?: Record<string, unknown>,
  ipAddress?: string | null
) {
  return createAuditLog({
    userId,
    action: 'Client created',
    actionType: ActionType.CREATE,
    entityType: 'Client',
    entityId: clientId,
    details,
    ipAddress,
  });
}

/**
 * Log a client update event
 */
export async function logClientUpdated(
  clientId: string,
  changes: Record<string, unknown>,
  userId?: string,
  ipAddress?: string | null
) {
  return createAuditLog({
    userId,
    action: 'Client updated',
    actionType: ActionType.UPDATE,
    entityType: 'Client',
    entityId: clientId,
    details: { changes },
    ipAddress,
  });
}

/**
 * Log an assessment creation event
 */
export async function logAssessmentCreated(
  assessmentId: string,
  userId?: string,
  details?: Record<string, unknown>,
  ipAddress?: string | null
) {
  return createAuditLog({
    userId,
    action: 'Assessment created',
    actionType: ActionType.CREATE,
    entityType: 'Assessment',
    entityId: assessmentId,
    details,
    ipAddress,
  });
}

/**
 * Log a status change event
 */
export async function logStatusChange(
  entityType: string,
  entityId: string,
  oldStatus: string,
  newStatus: string,
  userId?: string,
  ipAddress?: string | null
) {
  return createAuditLog({
    userId,
    action: `${entityType} status changed from ${oldStatus} to ${newStatus}`,
    actionType: ActionType.STATUS_CHANGE,
    entityType,
    entityId,
    details: { oldStatus, newStatus },
    ipAddress,
  });
}

/**
 * Log a user login event
 */
export async function logUserLogin(
  userId: string,
  ipAddress?: string | null,
  userAgent?: string | null
) {
  return createAuditLog({
    userId,
    action: 'User logged in',
    actionType: ActionType.LOGIN,
    ipAddress,
    userAgent,
  });
}

/**
 * Log a user logout event
 */
export async function logUserLogout(
  userId: string,
  ipAddress?: string | null
) {
  return createAuditLog({
    userId,
    action: 'User logged out',
    actionType: ActionType.LOGOUT,
    ipAddress,
  });
}

/**
 * Log an email sent event
 */
export async function logEmailSent(
  recipientEmail: string,
  subject: string,
  userId?: string,
  details?: Record<string, unknown>,
  ipAddress?: string | null
) {
  return createAuditLog({
    userId,
    action: `Email sent to ${recipientEmail}: ${subject}`,
    actionType: ActionType.EMAIL_SENT,
    details: { recipientEmail, subject, ...details },
    ipAddress,
  });
}
