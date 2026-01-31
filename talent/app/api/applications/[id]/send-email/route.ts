/**
 * Send Email API Route
 *
 * POST /api/applications/[id]/send-email
 *
 * Send an email to the applicant for this application.
 * Supports various email templates for different stages.
 * Supports sending via Gmail API when senderEmail is provided.
 *
 * Body:
 * - templateName: Name of the email template to use
 * - senderEmail: Optional Gmail address to send from (requires Gmail OAuth connection)
 * - additionalData: Optional additional data for template variables
 *
 * Required: Authenticated user with app access
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { getApplicationDetail } from '@/lib/services/applications';
import {
  sendEmail,
  EMAIL_TEMPLATES,
  type EmailTemplateName,
} from '@/lib/email';
import { escapeHtml, buildAssessmentLink } from '@/lib/email/templates';
import { appUrls } from '@/lib/email/config';
import { sanitizeForLog } from '@/lib/security';
import { recruitment } from '@/config/recruitment';
import { getGmailCredentialByEmail, getAllGmailAccounts } from '@/lib/gmail';
import { getTemplateById } from '@/lib/services/assessment-templates';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Valid template names that can be sent via this endpoint
 */
const ALLOWED_TEMPLATES: EmailTemplateName[] = [
  EMAIL_TEMPLATES.GC_INVITATION,
  EMAIL_TEMPLATES.SC_INVITATION,
  EMAIL_TEMPLATES.INTERVIEW_INVITATION,
  EMAIL_TEMPLATES.REJECTION,
];

/**
 * Validate UUID format to prevent injection
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * POST /api/applications/[id]/send-email
 *
 * Send an email to the applicant.
 * Requires authenticated user (hiring manager or admin).
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    // Validate ID format
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid application ID format' },
        { status: 400 }
      );
    }

    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check app access permission
    if (!session.user.hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden - App access required' },
        { status: 403 }
      );
    }

    // Get application details
    const application = await getApplicationDetail(id);
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Check if application is active (can't send emails to withdrawn/rejected)
    if (application.status !== 'ACTIVE' && application.status !== 'ACCEPTED') {
      return NextResponse.json(
        { error: 'Cannot send emails to inactive applications' },
        { status: 400 }
      );
    }

    // Parse request body
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Validate template name
    const templateName = body.templateName as string;
    if (!templateName || !ALLOWED_TEMPLATES.includes(templateName as EmailTemplateName)) {
      return NextResponse.json(
        { error: `Invalid template. Must be one of: ${ALLOWED_TEMPLATES.join(', ')}` },
        { status: 400 }
      );
    }

    // Get sender email (Gmail) if provided
    const senderEmail = body.senderEmail as string | undefined;

    // Validate sender email if provided
    if (senderEmail) {
      // Check if sender email is a valid Gmail account in the system
      const gmailCredential = await getGmailCredentialByEmail(senderEmail);
      if (!gmailCredential) {
        return NextResponse.json(
          { error: `Gmail account ${senderEmail} is not connected to the system` },
          { status: 400 }
        );
      }

      // Non-admins can only send from their own connected Gmail
      if (!session.user.isAdmin) {
        const allAccounts = await getAllGmailAccounts();
        const userAccount = allAccounts.find(a => a.userId === session.user.dbUserId);
        if (!userAccount || userAccount.email !== senderEmail) {
          return NextResponse.json(
            { error: 'You can only send from your own connected Gmail account' },
            { status: 403 }
          );
        }
      }
    }

    const person = application.person;
    const personId = person.id;
    const applicationId = application.id;
    const recipientEmail = person.email;
    const firstName = person.firstName;
    const position = application.position;

    let result;

    // Build template variables based on template type
    let variables: Record<string, string> = {
      PERSON_FIRST_NAME: escapeHtml(firstName),
      POSITION: escapeHtml(position),
    };

    // Send appropriate email based on template
    switch (templateName) {
      case EMAIL_TEMPLATES.GC_INVITATION: {
        // Send general competencies invitation
        if (person.generalCompetenciesCompleted) {
          return NextResponse.json(
            { error: 'Person has already completed general competencies assessment' },
            { status: 400 }
          );
        }

        // Check if using internal assessment template
        const gcTemplateId = body.assessmentTemplateId as string | undefined;
        let gcLink: string;

        if (gcTemplateId) {
          // Use internal assessment
          const gcTemplate = await getTemplateById(gcTemplateId);
          if (!gcTemplate) {
            return NextResponse.json(
              { error: 'Assessment template not found' },
              { status: 404 }
            );
          }
          if (!gcTemplate.isActive) {
            return NextResponse.json(
              { error: 'Assessment template is not active' },
              { status: 400 }
            );
          }
          if (gcTemplate.type !== 'GENERAL_COMPETENCIES') {
            return NextResponse.json(
              { error: 'Template is not a General Competencies assessment' },
              { status: 400 }
            );
          }
          // Build internal assessment URL
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
          gcLink = `${baseUrl}/assess/${gcTemplate.slug}?who=${personId}`;
        } else {
          // Fall back to Tally form
          gcLink = buildAssessmentLink(appUrls.tallyGCForm, personId);
        }

        variables.GC_ASSESSMENT_LINK = gcLink;

        result = await sendEmail({
          to: recipientEmail,
          template: EMAIL_TEMPLATES.GC_INVITATION,
          variables,
          personId,
          applicationId,
          sentBy: session.user.dbUserId,
          senderGmailEmail: senderEmail,
          priority: 'high',
        });

        // Move application to GENERAL_COMPETENCIES stage if currently in APPLICATION
        if (result.success && application.currentStage === 'APPLICATION') {
          await db.application.update({
            where: { id: applicationId },
            data: { currentStage: 'GENERAL_COMPETENCIES' },
          });

          await createAuditLog({
            personId,
            applicationId,
            action: 'Advanced to General Competencies stage (GC invitation sent)',
            actionType: 'STAGE_CHANGE',
            details: {
              previousStage: 'APPLICATION',
              newStage: 'GENERAL_COMPETENCIES',
              trigger: 'gc_invitation_sent',
            },
          });
        }
        break;
      }

      case EMAIL_TEMPLATES.SC_INVITATION: {
        // Send specialized competencies invitation
        // Can use internal assessment template OR external URL
        const scTemplateId = body.assessmentTemplateId as string | undefined;
        const assessmentFormUrl = body.assessmentFormUrl as string | undefined;

        let scLink: string;

        if (scTemplateId) {
          // Use internal assessment
          const scTemplate = await getTemplateById(scTemplateId);
          if (!scTemplate) {
            return NextResponse.json(
              { error: 'Assessment template not found' },
              { status: 404 }
            );
          }
          if (!scTemplate.isActive) {
            return NextResponse.json(
              { error: 'Assessment template is not active' },
              { status: 400 }
            );
          }
          if (scTemplate.type !== 'SPECIALIZED_COMPETENCIES') {
            return NextResponse.json(
              { error: 'Template is not a Specialized Competencies assessment' },
              { status: 400 }
            );
          }
          // Build internal assessment URL with application ID
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
          scLink = `${baseUrl}/assess/${scTemplate.slug}?who=${personId}&app=${applicationId}`;
        } else if (assessmentFormUrl) {
          // Use external URL (legacy Tally support)
          if (!isValidUrl(assessmentFormUrl)) {
            return NextResponse.json(
              { error: 'Invalid assessmentFormUrl format' },
              { status: 400 }
            );
          }
          scLink = buildAssessmentLink(assessmentFormUrl, personId, applicationId);
        } else {
          return NextResponse.json(
            { error: 'Either assessmentTemplateId or assessmentFormUrl is required for specialized competencies invitation' },
            { status: 400 }
          );
        }

        variables.SC_ASSESSMENT_LINK = scLink;

        result = await sendEmail({
          to: recipientEmail,
          template: EMAIL_TEMPLATES.SC_INVITATION,
          variables,
          personId,
          applicationId,
          sentBy: session.user.dbUserId,
          senderGmailEmail: senderEmail,
          priority: 'high',
        });
        break;
      }

      case EMAIL_TEMPLATES.INTERVIEW_INVITATION: {
        // Send interview invitation
        // Requires interviewer info
        const interviewerName = body.interviewerName as string;
        const schedulingLink = body.schedulingLink as string;

        if (!interviewerName || typeof interviewerName !== 'string') {
          return NextResponse.json(
            { error: 'interviewerName is required for interview invitation' },
            { status: 400 }
          );
        }

        if (!schedulingLink) {
          return NextResponse.json(
            { error: 'schedulingLink is required for interview invitation' },
            { status: 400 }
          );
        }

        if (!isValidUrl(schedulingLink)) {
          return NextResponse.json(
            { error: 'Invalid schedulingLink format' },
            { status: 400 }
          );
        }

        variables.INTERVIEWER_NAME = escapeHtml(interviewerName.substring(0, 100));
        variables.SCHEDULING_LINK = schedulingLink;
        variables.INTERVIEW_DURATION = recruitment.interview.duration;

        result = await sendEmail({
          to: recipientEmail,
          template: EMAIL_TEMPLATES.INTERVIEW_INVITATION,
          variables,
          personId,
          applicationId,
          sentBy: session.user.dbUserId,
          senderGmailEmail: senderEmail,
          priority: 'high',
        });
        break;
      }

      case EMAIL_TEMPLATES.REJECTION: {
        // Send rejection email
        const reason = body.reason as string | undefined;

        if (reason) {
          variables.REJECTION_REASON = escapeHtml(reason.substring(0, 500));
        } else {
          variables.REJECTION_REASON = '';
        }

        result = await sendEmail({
          to: recipientEmail,
          template: EMAIL_TEMPLATES.REJECTION,
          variables,
          personId,
          applicationId,
          sentBy: session.user.dbUserId,
          senderGmailEmail: senderEmail,
          priority: 'normal',
        });
        break;
      }

      default:
        return NextResponse.json(
          { error: 'Unsupported template' },
          { status: 400 }
        );
    }

    // Check result
    if (!result.success && !result.queued) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.queued
        ? 'Email queued for delivery (rate limit reached)'
        : 'Email sent successfully',
      emailLogId: result.emailLogId,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('Error sending email:', sanitizeForLog(error instanceof Error ? error.message : 'Unknown error'));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
