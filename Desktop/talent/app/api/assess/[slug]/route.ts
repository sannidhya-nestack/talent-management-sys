/**
 * Public Assessment API Route
 *
 * GET /api/assess/[slug] - Get public assessment data
 *
 * This is a public route - no authentication required.
 * Used to display assessment info before starting.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPublicTemplate } from '@/lib/services/assessment-templates';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/assess/[slug]
 *
 * Get public assessment data by slug
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    const template = await getPublicTemplate(slug);

    if (!template) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error fetching public assessment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
