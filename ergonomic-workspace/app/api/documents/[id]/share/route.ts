/**
 * Document Sharing API Route
 *
 * POST /api/documents/[id]/share - Create a shareable link
 * GET /api/documents/[id]/share - Get shares for a document
 * DELETE /api/documents/[id]/share/[shareId] - Revoke a share
 *
 * Required: Authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  createShare,
  getDocumentShares,
  revokeShare,
  getShareByToken,
  verifySharePassword,
  recordShareAccess,
} from '@/lib/services/documents/sharing';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/documents/[id]/share
 *
 * Create a shareable link
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
    const body = await request.json();
    const { password, expiresInDays } = body;

    const share = await createShare({
      documentId: id,
      password,
      expiresInDays,
      createdBy: session.user.dbUserId,
    });

    // Generate shareable URL
    const shareUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/shared/${share.token}`;

    return NextResponse.json({
      share: {
        id: share.id,
        token: share.token,
        shareUrl,
        expiresAt: share.expiresAt,
        hasPassword: !!share.passwordHash,
      },
    });
  } catch (error) {
    console.error('Error creating share:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/documents/[id]/share
 *
 * Get shares for a document
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const shares = await getDocumentShares(id);

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    return NextResponse.json({
      shares: shares.map((share) => ({
        id: share.id,
        token: share.token,
        shareUrl: `${baseUrl}/shared/${share.token}`,
        expiresAt: share.expiresAt,
        hasPassword: !!share.passwordHash,
        accessCount: share.accessCount,
        lastAccessedAt: share.lastAccessedAt,
        createdAt: share.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching shares:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documents/[id]/share/[shareId]
 *
 * Revoke a share
 */
export async function DELETE(
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
    const searchParams = request.nextUrl.searchParams;
    const shareId = searchParams.get('shareId');

    if (!shareId) {
      return NextResponse.json(
        { error: 'Share ID is required' },
        { status: 400 }
      );
    }

    await revokeShare(shareId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking share:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
