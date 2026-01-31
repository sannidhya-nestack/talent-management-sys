/**
 * Product Service
 *
 * Provides operations for managing product catalog.
 */

import { collections, generateId } from '@/lib/db';
import { serverTimestamp, toPlainObject, timestampToDate } from '@/lib/db-utils';

export interface ProductListItem {
  id: string;
  name: string;
  category: string;
  manufacturer: string | null;
  price: number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface CreateProductData {
  name: string;
  description?: string;
  category: string;
  manufacturer?: string;
  price: number;
  imageUrl?: string;
  specifications?: Record<string, unknown>;
  isActive?: boolean;
}

/**
 * Get products with pagination
 */
export async function getProducts(options?: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  activeOnly?: boolean;
}): Promise<{ products: ProductListItem[]; total: number }> {
  const page = options?.page || 1;
  const limit = options?.limit || 20;

  let query = collections.products() as FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;

  if (options?.category) {
    query = query.where('category', '==', options.category);
  }

  if (options?.activeOnly) {
    query = query.where('isActive', '==', true);
  }

  query = query.orderBy('name', 'asc');

  const snapshot = await query.get();
  let products = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...toPlainObject(data),
      createdAt: timestampToDate(data.createdAt) || new Date(),
    };
  });

  // Apply search filter client-side
  if (options?.search) {
    const searchLower = options.search.toLowerCase();
    products = products.filter(
      (product) =>
        product.name?.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower) ||
        product.manufacturer?.toLowerCase().includes(searchLower)
    );
  }

  const total = products.length;

  // Apply pagination
  const startIndex = (page - 1) * limit;
  const paginatedProducts = products.slice(startIndex, startIndex + limit);

  return {
    products: paginatedProducts.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      manufacturer: p.manufacturer || null,
      price: p.price,
      imageUrl: p.imageUrl || null,
      isActive: p.isActive,
      createdAt: p.createdAt,
    })),
    total,
  };
}

/**
 * Get a single product by ID
 */
export async function getProductById(id: string) {
  const doc = await collections.products().doc(id).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data()!;
  return {
    id: doc.id,
    ...toPlainObject(data),
    createdAt: timestampToDate(data.createdAt) || new Date(),
    updatedAt: timestampToDate(data.updatedAt) || new Date(),
  };
}

/**
 * Create a new product
 */
export async function createProduct(data: CreateProductData) {
  const id = generateId();
  const productData = {
    id,
    name: data.name,
    description: data.description || null,
    category: data.category,
    manufacturer: data.manufacturer || null,
    price: data.price,
    imageUrl: data.imageUrl || null,
    specifications: data.specifications || null,
    isActive: data.isActive ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await collections.products().doc(id).set(productData);

  return getProductById(id);
}

/**
 * Update a product
 */
export async function updateProduct(id: string, data: Partial<CreateProductData>) {
  const updateData: Record<string, any> = {
    updatedAt: serverTimestamp(),
  };

  if (data.name) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.category) updateData.category = data.category;
  if (data.manufacturer !== undefined) updateData.manufacturer = data.manufacturer;
  if (data.price !== undefined) updateData.price = data.price;
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
  if (data.specifications !== undefined) updateData.specifications = data.specifications;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  await collections.products().doc(id).update(updateData);

  return getProductById(id);
}

/**
 * Delete a product
 */
export async function deleteProduct(id: string): Promise<void> {
  await collections.products().doc(id).delete();
}
