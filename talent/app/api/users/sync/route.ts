/**
 * Firebase Sync API Route
 *
 * POST /api/users/sync - Sync users from Firebase (admin only)
 *
 * Fetches all active users from Firebase Auth and syncs them to the local database.
 * Updates existing users and creates new ones.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { syncUsersFromFirebase } from '@/lib/services/users';
import {
  isFirebaseConfigured,
  getAllFirebaseUsersWithAdminStatus,
} from '@/lib/integrations/firebase';

/**
 * POST /api/users/sync
 *
 * Sync users from Okta to local database.
 */
export async function POST() {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Admin only
    if (!session.user.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Check Firebase configuration
    if (!isFirebaseConfigured()) {
      return NextResponse.json(
        { error: 'Firebase integration is not configured' },
        { status: 503 }
      );
    }

    // Fetch users from Firebase with admin status
    const firebaseUsers = await getAllFirebaseUsersWithAdminStatus();

    if (firebaseUsers.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        removed: 0,
        message: 'No active users found in Firebase',
      });
    }

    // Sync to local database - pass current user ID to prevent self-deletion
    const { synced, removed } = await syncUsersFromFirebase(firebaseUsers, session.user.dbUserId);

    return NextResponse.json({
      success: true,
      synced,
      removed,
      message: `Successfully synced ${synced} users from Firebase, removed ${removed}`,
    });
  } catch (error) {
    console.error('Error syncing users from Firebase:', error);

    // Handle specific Firebase errors
    if (error instanceof Error) {
      if (error.message.includes('FIREBASE_') || error.message.includes('Firebase')) {
        return NextResponse.json(
          { error: 'Firebase configuration error: ' + error.message },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to sync users from Firebase' },
      { status: 500 }
    );
  }
}
