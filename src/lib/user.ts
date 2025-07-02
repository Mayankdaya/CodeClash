
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { type User } from 'firebase/auth';
import { db } from './firebase';

/**
 * Ensures a user profile document exists in Firestore.
 * If it doesn't exist, it creates one with default values.
 * This is useful for new user sign-ups.
 * @param user The Firebase Auth user object.
 */
export const ensureUserProfile = async (user: User) => {
  if (!db || !user) return;

  const userDocRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userDocRef);

  if (!userDoc.exists()) {
    // Document doesn't exist, so create it.
    try {
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Anonymous',
        photoURL: user.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(user.displayName || user.uid)}&backgroundColor=e74c86&textColor=ffffff&radius=50`,
        totalScore: 0,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error("Error creating user profile:", error);
    }
  }
};


/**
 * Updates a user's total score by a given amount.
 * @param uid The user's unique ID.
 * @param amount The number of points to add (can be negative).
 */
export const updateUserScore = async (uid: string, amount: number) => {
    if (!db || !uid) return;

    const userDocRef = doc(db, 'users', uid);

    try {
        await updateDoc(userDocRef, {
            totalScore: increment(amount)
        });
    } catch (error) {
        console.error("Error updating user score:", error);
        // Optionally re-throw or handle error
    }
};
