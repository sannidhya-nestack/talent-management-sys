/**
 * Proposal Generation API Route
 *
 * POST /api/layouts/[id]/proposal - Generate proposal for a layout
 *
 * Required: Authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateProposal } from '@/lib/services/proposals';
import type { GenerateProposalOptions } from '@/lib/services/proposals';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/layouts/[id]/proposal
 *
 * Generate proposal
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.dbUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const options: GenerateProposalOptions = {
      layoutId: id,
      includeCustomSections: body.includeCustomSections || false,
      pricingTier: body.pricingTier || 'STANDARD',
      userId: session.user.dbUserId,
    };

    const proposal = await generateProposal(options);

    return NextResponse.json({ proposal });
  } catch (error) {
    console.error('Error generating proposal:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
