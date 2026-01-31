/**
 * Dashboard Page
 *
 * Main dashboard with overview cards, recent activity, and statistics.
 */

import { DashboardPageClient } from './page-client';
import { getClients } from '@/lib/services/clients';

export default async function DashboardPage() {
  // Fetch recent clients for the dashboard
  let clientsResult;
  try {
    clientsResult = await getClients({ page: 1, limit: 5 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error fetching clients:', errorMessage);
    
    // Check if it's a Firebase configuration error
    if (errorMessage.includes('DECODER') || 
        errorMessage.includes('Missing required Firebase') ||
        errorMessage.includes('FIREBASE_ADMIN')) {
      console.error(
        '\n⚠️  Firebase Admin is not properly configured.\n' +
        'Please check your .env file and ensure FIREBASE_ADMIN_PRIVATE_KEY, ' +
        'FIREBASE_ADMIN_CLIENT_EMAIL, and NEXT_PUBLIC_FIREBASE_PROJECT_ID are set correctly.\n' +
        'See FIREBASE_SETUP.md for detailed instructions.\n'
      );
    }
    
    // Return empty array if database is not configured
    clientsResult = { clients: [], total: 0, page: 1, limit: 5, totalPages: 0 };
  }

  return <DashboardPageClient recentClients={clientsResult.clients} />;
}
