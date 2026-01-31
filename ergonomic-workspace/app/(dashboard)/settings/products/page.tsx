/**
 * Product Catalog Settings Page
 *
 * Manage product catalog and pricing.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ProductCatalogSettingsPageClient } from './page-client';

export const metadata = {
  title: 'Product Catalog',
};

export default async function ProductCatalogSettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  return <ProductCatalogSettingsPageClient />;
}
