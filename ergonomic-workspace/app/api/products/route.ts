/**
 * Products API Route
 *
 * GET /api/products - List products
 * POST /api/products - Create a new product
 *
 * Required: Authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProducts, createProduct } from '@/lib/services/products';
import type { CreateProductData } from '@/lib/services/products';

/**
 * GET /api/products
 *
 * List products
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user || !session.user.dbUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const result = await getProducts({
      page,
      limit,
      category,
      search,
      activeOnly,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 *
 * Create a new product
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
    if (!body.name || !body.category || body.price === undefined) {
      return NextResponse.json(
        { error: 'Name, category, and price are required' },
        { status: 400 }
      );
    }

    const productData: CreateProductData = {
      name: body.name,
      description: body.description,
      category: body.category,
      manufacturer: body.manufacturer,
      price: body.price,
      imageUrl: body.imageUrl,
      specifications: body.specifications,
      isActive: body.isActive ?? true,
    };

    const product = await createProduct(productData);

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
