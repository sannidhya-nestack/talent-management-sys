/**
 * Email Send API Route
 *
 * POST /api/email/send
 *
 * Send an email via connected email account (Gmail/Outlook).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sendViaGmail } from '@/lib/email/gmail';
import { logEmailSent } from '@/lib/audit';

/**
 * POST /api/email/send
 *
 * Send an email
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { from, to, subject, htmlBody, textBody } = body;

    // Validate required fields
    if (!from || !to || !subject || !htmlBody) {
      return NextResponse.json(
        { error: 'Missing required fields: from, to, subject, htmlBody' },
        { status: 400 }
      );
    }

    // For now, only Gmail is supported
    // TODO: Add Outlook support
    const result = await sendViaGmail(from, to, subject, htmlBody, textBody);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    // Log the email send
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;
    await logEmailSent(to, subject, session.user.dbUserId, { from, messageId: result.messageId }, ipAddress);

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
