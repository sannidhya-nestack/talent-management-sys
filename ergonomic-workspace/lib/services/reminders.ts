/**
 * Reminders Service
 *
 * Provides operations for managing reminders for action items, payments, assessments, etc.
 */

import { collections, generateId } from '@/lib/db';
import { serverTimestamp, toPlainObject, timestampToDate } from '@/lib/db-utils';
import { createCalendarEvent } from './calendar/google';

export type ReminderType = 'ACTION_ITEM' | 'PAYMENT_FOLLOWUP' | 'ASSESSMENT_REPORT' | 'INSTALLATION_PREP' | 'ASSESSMENT_FOLLOWUP';

export interface Reminder {
  id: string;
  type: ReminderType;
  title: string;
  description: string;
  dueDate: Date;
  relatedEntityType: 'client' | 'assessment' | 'invoice' | 'installation' | 'project';
  relatedEntityId: string;
  userId: string;
  isCompleted: boolean;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReminderData {
  type: ReminderType;
  title: string;
  description: string;
  dueDate: Date;
  relatedEntityType: 'client' | 'assessment' | 'invoice' | 'installation' | 'project';
  relatedEntityId: string;
  userId: string;
  createCalendarEvent?: boolean;
}

/**
 * Create a reminder
 */
export async function createReminder(data: CreateReminderData): Promise<Reminder> {
  const id = generateId();
  const reminderData = {
    id,
    type: data.type,
    title: data.title,
    description: data.description,
    dueDate: serverTimestamp(),
    relatedEntityType: data.relatedEntityType,
    relatedEntityId: data.relatedEntityId,
    userId: data.userId,
    isCompleted: false,
    completedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await collections.reminders().doc(id).set(reminderData);

  // Create calendar event if requested
  if (data.createCalendarEvent) {
    try {
      const dueDate = new Date(data.dueDate);
      const endDate = new Date(dueDate);
      endDate.setHours(endDate.getHours() + 1); // 1 hour reminder

      await createCalendarEvent(data.userId, {
        summary: data.title,
        description: data.description,
        start: {
          dateTime: dueDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
    } catch (error) {
      console.error('Error creating calendar event for reminder:', error);
      // Don't fail reminder creation if calendar event fails
    }
  }

  return {
    ...reminderData,
    dueDate: data.dueDate,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Get reminders for a user
 */
export async function getUserReminders(
  userId: string,
  options?: {
    completed?: boolean;
    dueBefore?: Date;
    type?: ReminderType;
  }
): Promise<Reminder[]> {
  let query = collections.reminders().where('userId', '==', userId) as FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;

  if (options?.completed !== undefined) {
    query = query.where('isCompleted', '==', options.completed);
  }

  if (options?.type) {
    query = query.where('type', '==', options.type);
  }

  let snapshot;
  let docs: FirebaseFirestore.QueryDocumentSnapshot[];
  try {
    snapshot = await query.orderBy('dueDate', 'asc').get();
    docs = snapshot.docs;
  } catch (error) {
    snapshot = await query.get();
    docs = [...snapshot.docs].sort((a, b) => {
      const aDate = timestampToDate(a.data().dueDate);
      const bDate = timestampToDate(b.data().dueDate);
      if (!aDate || !bDate) return 0;
      return aDate.getTime() - bDate.getTime();
    });
  }

  // Filter by dueBefore if specified
  if (options?.dueBefore) {
    docs = docs.filter((doc) => {
      const dueDate = timestampToDate(doc.data().dueDate);
      return dueDate && dueDate <= options.dueBefore!;
    });
  }

  return docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      type: data.type,
      title: data.title,
      description: data.description,
      dueDate: timestampToDate(data.dueDate) || new Date(),
      relatedEntityType: data.relatedEntityType,
      relatedEntityId: data.relatedEntityId,
      userId: data.userId,
      isCompleted: data.isCompleted,
      completedAt: timestampToDate(data.completedAt),
      createdAt: timestampToDate(data.createdAt) || new Date(),
      updatedAt: timestampToDate(data.updatedAt) || new Date(),
    };
  });
}

/**
 * Mark reminder as completed
 */
export async function completeReminder(reminderId: string): Promise<void> {
  await collections.reminders().doc(reminderId).update({
    isCompleted: true,
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a reminder
 */
export async function deleteReminder(reminderId: string): Promise<void> {
  await collections.reminders().doc(reminderId).delete();
}

/**
 * Create reminder for action item
 */
export async function createActionItemReminder(
  clientId: string,
  userId: string,
  title: string,
  description: string,
  dueDate: Date,
  createCalendarEvent?: boolean
): Promise<Reminder> {
  return createReminder({
    type: 'ACTION_ITEM',
    title,
    description,
    dueDate,
    relatedEntityType: 'client',
    relatedEntityId: clientId,
    userId,
    createCalendarEvent,
  });
}

/**
 * Create reminder for payment follow-up
 */
export async function createPaymentFollowupReminder(
  invoiceId: string,
  clientId: string,
  userId: string,
  dueDate: Date
): Promise<Reminder> {
  return createReminder({
    type: 'PAYMENT_FOLLOWUP',
    title: 'Payment Follow-up',
    description: `Follow up on outstanding invoice`,
    dueDate,
    relatedEntityType: 'invoice',
    relatedEntityId: invoiceId,
    userId,
    createCalendarEvent: true,
  });
}

/**
 * Create reminder for assessment report delivery
 */
export async function createAssessmentReportReminder(
  assessmentId: string,
  userId: string,
  dueDate: Date
): Promise<Reminder> {
  return createReminder({
    type: 'ASSESSMENT_REPORT',
    title: 'Deliver Assessment Report',
    description: `Assessment report should be delivered to client`,
    dueDate,
    relatedEntityType: 'assessment',
    relatedEntityId: assessmentId,
    userId,
    createCalendarEvent: true,
  });
}
