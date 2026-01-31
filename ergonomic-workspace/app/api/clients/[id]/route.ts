/**
 * Client Detail API Route
 *
 * GET /api/clients/[id] - Get a single client
 * PUT /api/clients/[id] - Update a client
 * DELETE /api/clients/[id] - Delete a client
 *
 * Required: Authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getClientById, updateClient, deleteClient } from '@/lib/services/clients';
import { logClientUpdated } from '@/lib/audit';
import { isValidUUID } from '@/lib/utils';
import { ClientStatus, BudgetRange } from '@/lib/types/firestore';
import type { UpdateClientData } from '@/lib/services/clients';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/clients/[id]
 *
 * Get a single client by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate ID is not empty
    if (!id || id.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid client ID' },
        { status: 400 }
      );
    }

    const client = await getClientById(id);
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ client });
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/clients/[id]
 *
 * Update a client
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate UUID
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid client ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const updateData: UpdateClientData = {
      companyName: body.companyName,
      industry: body.industry,
      status: body.status as ClientStatus | undefined,
      initialScope: body.initialScope,
      budgetRange: body.budgetRange as BudgetRange | undefined,
      address: body.address,
      city: body.city,
      state: body.state,
      country: body.country,
      postalCode: body.postalCode,
      website: body.website,
      notes: body.notes,
    };

    const client = await updateClient(id, updateData);

    // Log the update
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;
    await logClientUpdated(
      id,
      updateData,
      session.user.dbUserId,
      ipAddress
    );

    return NextResponse.json({ client });
  } catch (error) {
    console.error('Error updating client:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/clients/[id]
 *
 * Delete a client
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate UUID
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid client ID' },
        { status: 400 }
      );
    }

    await deleteClient(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting client:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
