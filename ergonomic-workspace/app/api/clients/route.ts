/**
 * Clients API Route
 *
 * GET /api/clients - List all clients
 * POST /api/clients - Create a new client
 *
 * Required: Authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getClients, createClient } from '@/lib/services/clients';
import { logClientCreated } from '@/lib/audit';
import { ClientStatus, BudgetRange } from '@/lib/types/firestore';
import type { CreateClientData } from '@/lib/services/clients';

/**
 * GET /api/clients
 *
 * List all clients with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status') as ClientStatus | null;
    const industry = searchParams.get('industry') || undefined;
    const search = searchParams.get('search') || undefined;
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    const result = await getClients({
      status: status || undefined,
      industry,
      search,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/clients
 *
 * Create a new client
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.dbUserId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.companyName || typeof body.companyName !== 'string') {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    const createData: CreateClientData = {
      companyName: body.companyName,
      industry: body.industry,
      status: body.status || ClientStatus.ACTIVE,
      initialScope: body.initialScope,
      budgetRange: body.budgetRange as BudgetRange | undefined,
      address: body.address,
      city: body.city,
      state: body.state,
      country: body.country,
      postalCode: body.postalCode,
      website: body.website,
      notes: body.notes,
      createdBy: session.user.dbUserId,
    };

    const client = await createClient(createData);

    // Log the creation
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;
    await logClientCreated(
      client.id,
      session.user.dbUserId,
      { companyName: client.companyName },
      ipAddress
    );

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
