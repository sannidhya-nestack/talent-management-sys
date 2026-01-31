/**
 * Projects API Route
 *
 * GET /api/projects - List projects
 * POST /api/projects - Create a new project
 *
 * Required: Authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { collections } from '@/lib/db';
import { timestampToDate, toPlainObject } from '@/lib/db-utils';
import { ProjectStatus } from '@/lib/types/firestore';
import { getClientById } from '@/lib/services/clients';

/**
 * GET /api/projects
 *
 * List projects
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
    const clientId = searchParams.get('clientId') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    let query = collections.projects() as FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;

    if (clientId) {
      query = query.where('clientId', '==', clientId);
    }

    let snapshot;
    let docs: FirebaseFirestore.QueryDocumentSnapshot[];
    try {
      // Try to order by createdAt
      const orderedQuery = query.orderBy('createdAt', 'desc');
      snapshot = await orderedQuery.get();
      docs = snapshot.docs;
    } catch (error) {
      // If orderBy fails (e.g., no index or field doesn't exist), query without ordering
      console.warn('Could not order by createdAt, querying without order:', error);
      snapshot = await query.get();
      // Sort client-side by createdAt if available
      docs = [...snapshot.docs].sort((a, b) => {
        const aDate = timestampToDate(a.data().createdAt);
        const bDate = timestampToDate(b.data().createdAt);
        if (!aDate || !bDate) return 0;
        return bDate.getTime() - aDate.getTime(); // desc
      });
    }

    const total = docs.length;

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedDocs = docs.slice(startIndex, startIndex + limit);

    const projects = await Promise.all(
      paginatedDocs.map(async (doc) => {
        const data = doc.data();

        // Get client info
        let client = null;
        if (data.clientId) {
          try {
            const clientData = await getClientById(data.clientId);
            if (clientData) {
              client = {
                id: clientData.id,
                companyName: clientData.companyName,
              };
            }
          } catch (error) {
            console.warn('Could not fetch client:', error);
          }
        }

        return {
          id: doc.id,
          name: data.name || 'Unnamed Project',
          description: data.description || null,
          status: (data.status as ProjectStatus) || 'PLANNING',
          clientId: data.clientId || '',
          budget: data.budget || null,
          startDate: timestampToDate(data.startDate),
          endDate: timestampToDate(data.endDate),
          createdAt: timestampToDate(data.createdAt) || new Date(),
          updatedAt: timestampToDate(data.updatedAt) || new Date(),
          client: client
            ? {
                id: client.id,
                companyName: client.companyName,
              }
            : null,
        };
      })
    );

    return NextResponse.json({
      projects,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/projects
 *
 * Create a new project
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
    if (!body.clientId || !body.name) {
      return NextResponse.json(
        { error: 'Client ID and name are required' },
        { status: 400 }
      );
    }

    // TODO: Implement project creation
    return NextResponse.json(
      { error: 'Project creation not yet implemented' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error creating project:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
