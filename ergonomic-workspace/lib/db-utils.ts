/**
 * Database Utilities (Server-Only)
 *
 * Utility functions for Firestore operations.
 * This file is server-only and should not be imported in client components.
 */

import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import type { Timestamp as TimestampType } from 'firebase-admin/firestore';

/**
 * Get server timestamp for Firestore
 * Use this for createdAt/updatedAt fields
 */
export function serverTimestamp(): FieldValue {
  return FieldValue.serverTimestamp();
}

/**
 * Check if a value is a Firestore Timestamp
 */
export function isTimestamp(value: any): value is Timestamp {
  return value instanceof Timestamp;
}

/**
 * Convert Firestore data to plain object, converting Timestamps to Dates
 */
export function toPlainObject<T extends Record<string, any>>(data: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Timestamp) {
      result[key] = value.toDate();
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = toPlainObject(value);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

/**
 * Convert Firestore Timestamp to Date (server-only)
 * Also handles string dates (ISO format) for compatibility with mock data
 */
export function timestampToDate(timestamp: TimestampType | Date | string | null | undefined): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  // Handle string dates (ISO format) - common in mock data
  if (typeof timestamp === 'string') {
    try {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date;
      }
    } catch (error) {
      console.warn('Could not parse date string:', timestamp, error);
    }
  }
  return null;
}

/**
 * Convert Date to Firestore Timestamp (server-only)
 */
export function dateToTimestamp(date: Date | null | undefined): Timestamp | null {
  if (!date) return null;
  return Timestamp.fromDate(date);
}
