/**
 * Debug Questions API Route
 *
 * GET /api/assess/[slug]/questions - Get questions for debug mode
 *
 * This is a public route for debug purposes - no authentication required.
 * Used to view assessment questions without a personalized token.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTemplateBySlug, getPublicQuestions } from '@/lib/services/assessment-templates';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/assess/[slug]/questions
 *
 * Get questions for an assessment (debug mode - no personId required)
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    const template = await getTemplateBySlug(slug);
    if (!template) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    if (!template.isActive) {
      return NextResponse.json({ error: 'Assessment is not currently available' }, { status: 400 });
    }

    // Get questions for the assessment
    const questions = await getPublicQuestions(template.id);

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Error fetching debug questions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
