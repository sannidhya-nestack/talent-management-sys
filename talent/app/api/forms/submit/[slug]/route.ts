/**
 * Public Form Submission API Route
 *
 * POST /api/forms/submit/[slug] - Submit a form
 *
 * Public endpoint - no authentication required
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFormBySlug } from '@/lib/services/forms';
import { createSubmission, processSubmission } from '@/lib/services/form-submissions';
import type { FormField, FileUploadData } from '@/types/form';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * Validate submission data against form fields
 */
function validateSubmission(
  data: Record<string, unknown>,
  fields: FormField[]
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const value = data[field.id];

    // Check required fields
    if (field.required) {
      if (value === undefined || value === null || value === '') {
        errors[field.id] = `${field.label} is required`;
        continue;
      }
    }

    // Skip validation for empty optional fields
    if (value === undefined || value === null || value === '') {
      continue;
    }

    // Validate based on field type
    if (field.type === 'email' && typeof value === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors[field.id] = 'Please enter a valid email address';
      }
    }

    if (field.type === 'url' && typeof value === 'string') {
      try {
        new URL(value);
      } catch {
        errors[field.id] = 'Please enter a valid URL';
      }
    }

    // Validate with custom validation rules
    if (field.validation && typeof value === 'string') {
      if (field.validation.minLength && value.length < field.validation.minLength) {
        errors[field.id] = `Must be at least ${field.validation.minLength} characters`;
      }

      if (field.validation.maxLength && value.length > field.validation.maxLength) {
        errors[field.id] = `Must be no more than ${field.validation.maxLength} characters`;
      }

      if (field.validation.pattern) {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(value)) {
          errors[field.id] = field.validation.patternMessage || 'Invalid format';
        }
      }
    }

    if (field.type === 'number' && field.validation) {
      const numValue = typeof value === 'number' ? value : parseFloat(value as string);

      if (field.validation.min !== undefined && numValue < field.validation.min) {
        errors[field.id] = `Must be at least ${field.validation.min}`;
      }

      if (field.validation.max !== undefined && numValue > field.validation.max) {
        errors[field.id] = `Must be no more than ${field.validation.max}`;
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Get client IP from request
 */
function getClientIP(headers: Headers): string | undefined {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    undefined
  );
}

/**
 * POST /api/forms/submit/[slug]
 *
 * Submit a form (public endpoint)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    // Get the form
    const form = await getFormBySlug(slug);

    if (!form) {
      return NextResponse.json({ error: 'Form not found or inactive' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();

    const data = body.data as Record<string, unknown>;
    const files = body.files as FileUploadData[] | undefined;

    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Invalid submission data' }, { status: 400 });
    }

    // Validate submission
    const validation = validateSubmission(data, form.fields);

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    // Get client info
    const ipAddress = getClientIP(request.headers);
    const userAgent = request.headers.get('user-agent') || undefined;

    // Create submission
    const submission = await createSubmission({
      formId: form.id,
      data,
      files,
      ipAddress,
      userAgent,
    });

    // Process submission immediately
    const result = await processSubmission(submission.id, ipAddress);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Application submitted successfully',
        submissionId: submission.id,
      });
    } else {
      // If processing failed, still return success for the submission
      // The admin can retry processing later
      return NextResponse.json({
        success: true,
        message: 'Application received. Processing may take a moment.',
        submissionId: submission.id,
        warning: result.error,
      });
    }
  } catch (error) {
    console.error('Error submitting form:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'There was an error submitting your application. Please try again.',
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
