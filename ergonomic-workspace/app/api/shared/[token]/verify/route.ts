/**
 * Shared Document Password Verification API Route
 *
 * POST /api/shared/[token]/verify - Verify password for shared document
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySharePassword } from '@/lib/services/documents/sharing';

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    const isValid = await verifySharePassword(token, password);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error verifying password:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
