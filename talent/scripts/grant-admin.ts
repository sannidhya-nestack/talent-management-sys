import 'dotenv/config';
import { db, disconnectDb } from '../lib/db';

async function main() {
  const firebaseUserId = 'MKLuArziVtPXirKJ3enaxBxpo822';
  
  const user = await db.user.findUnique({ where: { firebaseUserId } });
  
  if (user) {
    await db.user.update({ 
      where: { firebaseUserId }, 
      data: { isAdmin: true, hasAppAccess: true } 
    });
    console.log('✓ Admin access granted to:', user.email);
  } else {
    console.log('User not found with Firebase UID:', firebaseUserId);
    const users = await db.user.findMany({ select: { firebaseUserId: true, email: true, isAdmin: true } });
    console.log('Available users:', JSON.stringify(users, null, 2));
  }
  
  await disconnectDb();
}

main().catch(console.error);
