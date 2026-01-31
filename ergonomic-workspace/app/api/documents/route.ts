/**
 * Documents API Route
 *
 * GET /api/documents - List documents
 * POST /api/documents - Create a new document
 *
 * Required: Authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDocuments, createDocument } from '@/lib/services/documents';
import { DocumentCategory } from '@/lib/types/firestore';
import type { CreateDocumentData } from '@/lib/services/documents';

/**
 * GET /api/documents
 *
 * List documents
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const clientId = searchParams.get('clientId') || undefined;
    const projectId = searchParams.get('projectId') || undefined;
    const category = searchParams.get('category') as DocumentCategory | null;
    const search = searchParams.get('search') || undefined;

    const result = await getDocuments({
      page,
      limit,
      clientId,
      projectId,
      category: category || undefined,
      search,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/documents
 *
 * Create a new document
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user || !session.user.dbUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.clientId || !body.fileName || !body.fileUrl || !body.fileType || !body.fileSize || !body.category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const documentData: CreateDocumentData = {
      clientId: body.clientId,
      projectId: body.projectId,
      fileName: body.fileName,
      fileUrl: body.fileUrl,
      fileType: body.fileType,
      fileSize: body.fileSize,
      category: body.category,
      tags: body.tags,
      uploadedBy: session.user.dbUserId,
    };

    const document = await createDocument(documentData);

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error('Error creating document:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
