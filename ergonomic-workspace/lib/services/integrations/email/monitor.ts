/**
 * Email Monitoring Service
 *
 * Monitors inbound emails and auto-logs them to client activity feed.
 * Extracts attachments and links emails to clients.
 */

import { getClients } from '@/lib/services/clients';
import { logCommunicationActivity } from '@/lib/services/activities';
import { createDocument } from '@/lib/services/documents';
import { collections, generateId } from '@/lib/db';
import { serverTimestamp } from '@/lib/db-utils';

export interface EmailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  htmlBody?: string;
  receivedAt: Date;
  threadId?: string;
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
    data: Buffer | string; // Base64 encoded or Buffer
  }>;
}

/**
 * Process an inbound email
 *
 * @param email - Email message to process
 * @param userId - User ID who received the email
 */
export async function processInboundEmail(email: EmailMessage, userId: string): Promise<void> {
  // Try to identify client from email address
  const client = await getClientByEmail(email.from);

  if (!client) {
    // Email from unknown sender - could log to general activity or skip
    console.log(`[Email Monitor] Email from unknown sender: ${email.from}`);
    return;
  }

  // Log to client activity feed
  await logCommunicationActivity(
    client.id,
    userId,
    'EMAIL',
    email.subject
  );

  // Extract and save attachments as documents
  if (email.attachments && email.attachments.length > 0) {
    for (const attachment of email.attachments) {
      try {
        // In production, you would upload the file to storage first
        // For now, we'll create a document record
        await createDocument({
          clientId: client.id,
          fileName: attachment.filename,
          fileType: attachment.contentType,
          fileSize: attachment.size,
          fileUrl: '', // Would be set after upload
          category: 'OTHER',
          uploadedBy: userId,
          ocrText: null,
        });
      } catch (error) {
        console.error(`[Email Monitor] Failed to save attachment ${attachment.filename}:`, error);
      }
    }
  }

  // Store email in email logs collection
  const emailLogId = generateId();
  await collections.emailLogs().doc(emailLogId).set({
    id: emailLogId,
    clientId: client.id,
    from: email.from,
    to: email.to,
    subject: email.subject,
    body: email.body,
    htmlBody: email.htmlBody || null,
    threadId: email.threadId || null,
    receivedAt: serverTimestamp(),
    processedAt: serverTimestamp(),
    processedBy: userId,
  });
}

/**
 * Process outbound email (track sent emails)
 *
 * @param email - Email message that was sent
 * @param userId - User ID who sent the email
 * @param clientId - Optional client ID if known
 */
export async function processOutboundEmail(
  email: { to: string; subject: string; messageId: string },
  userId: string,
  clientId?: string
): Promise<void> {
  // If clientId is provided, log directly
  if (clientId) {
    await logCommunicationActivity(clientId, userId, 'EMAIL', email.subject);
  } else {
    // Try to find client by email
    const client = await getClientByEmail(email.to);
    if (client) {
      await logCommunicationActivity(client.id, userId, 'EMAIL', email.subject);
    }
  }

  // Store in email logs
  const emailLogId = generateId();
  await collections.emailLogs().doc(emailLogId).set({
    id: emailLogId,
    clientId: clientId || null,
    from: null, // Would be set from sender email
    to: email.to,
    subject: email.subject,
    body: null,
    htmlBody: null,
    threadId: null,
    receivedAt: null,
    sentAt: serverTimestamp(),
    messageId: email.messageId,
    processedAt: serverTimestamp(),
    processedBy: userId,
  });
}

/**
 * Get client by email address
 * Checks contacts for matching email
 */
async function getClientByEmail(email: string) {
  // Query all clients and check their contacts
  const { clients } = await getClients({ limit: 1000 }); // Adjust limit as needed
  
  for (const client of clients) {
    // Get full client details to check contacts
    const { getClientById } = await import('@/lib/services/clients');
    const fullClient = await getClientById(client.id);
    
    if (fullClient?.contacts) {
      const matchingContact = fullClient.contacts.find(
        (contact) => contact.email.toLowerCase() === email.toLowerCase()
      );
      if (matchingContact) {
        return fullClient;
      }
    }
  }
  
  return null;
}
