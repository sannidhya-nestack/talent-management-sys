/**
 * Invoices API Route
 *
 * GET /api/invoices - List invoices
 * POST /api/invoices - Create a new invoice
 *
 * Required: Authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { collections } from '@/lib/db';
import { timestampToDate, toPlainObject } from '@/lib/db-utils';
import { getClientById } from '@/lib/services/clients';

/**
 * GET /api/invoices
 *
 * List invoices
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

    let query = collections.invoices() as FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;

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

    const invoices = await Promise.all(
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
          invoiceNumber: data.invoiceNumber || doc.id,
          clientId: data.clientId || '',
          amount: data.amount || 0,
          status: data.status || 'PENDING',
          dueDate: timestampToDate(data.dueDate),
          paidDate: timestampToDate(data.paidDate),
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
      invoices,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/invoices
 *
 * Create a new invoice
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
    if (!body.clientId || !body.amount) {
      return NextResponse.json(
        { error: 'Client ID and amount are required' },
        { status: 400 }
      );
    }

    // TODO: Implement invoice creation
    return NextResponse.json(
      { error: 'Invoice creation not yet implemented' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error creating invoice:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
