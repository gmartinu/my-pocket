import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Migrate existing users to add displayName field
 * This function updates all users who don't have displayName
 * by using their name field or email as fallback
 */
export async function migrateUsersDisplayName(): Promise<{
  success: number;
  skipped: number;
  errors: number;
}> {
  console.log('🔄 Starting user migration...');

  const stats = {
    success: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);

    console.log(`📊 Found ${snapshot.size} users to check`);

    for (const userDoc of snapshot.docs) {
      const userData = userDoc.data();

      // Skip if displayName already exists
      if (userData.displayName) {
        console.log(`⏭️  Skipping ${userData.email} - already has displayName`);
        stats.skipped++;
        continue;
      }

      // Determine displayName from name or email
      const displayName = userData.name || userData.email || 'User';

      try {
        await updateDoc(doc(db, 'users', userDoc.id), {
          displayName,
          // Also ensure email is lowercase
          email: userData.email?.toLowerCase().trim() || userData.email,
        });

        console.log(`✅ Updated ${userData.email} with displayName: ${displayName}`);
        stats.success++;
      } catch (error) {
        console.error(`❌ Error updating ${userData.email}:`, error);
        stats.errors++;
      }
    }

    console.log('🎉 Migration complete!');
    console.log(`   ✅ Updated: ${stats.success}`);
    console.log(`   ⏭️  Skipped: ${stats.skipped}`);
    console.log(`   ❌ Errors: ${stats.errors}`);

    return stats;
  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  }
}

/**
 * Update a specific user's displayName
 * Useful for manual fixes
 */
export async function updateUserDisplayName(
  userId: string,
  displayName: string
): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), {
      displayName: displayName.trim(),
    });
    console.log(`✅ Updated user ${userId} displayName to: ${displayName}`);
  } catch (error) {
    console.error(`❌ Error updating user ${userId}:`, error);
    throw error;
  }
}
