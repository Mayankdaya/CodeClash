
'use server';

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '@/lib/firebase';

// Ensures a user document exists in Firestore. Safe to call multiple times.
export const ensureUserProfile = async (user: User, additionalData: { [key: string]: any } = {}) => {
  if (!db || !user) return;
  const userDocRef = doc(db, 'users', user.uid);
  
  try {
    const snapshot = await getDoc(userDocRef);

    if (!snapshot.exists()) {
        await setDoc(userDocRef, {
            displayName: user.displayName || additionalData.username || 'Anonymous Coder',
            email: user.email,
            photoURL: user.photoURL || `https://placehold.co/100x100.png`,
            createdAt: serverTimestamp(),
            totalScore: 0,
            ...additionalData,
        });
    }
  } catch (error) {
    console.error('Error ensuring user profile exists', error);
    // Re-throw the error to be handled by the caller (e.g. AuthGuard)
    throw new Error('Could not ensure user profile exists in the database.');
  }
};
