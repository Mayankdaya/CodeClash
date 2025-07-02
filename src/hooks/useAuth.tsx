
'use client';

import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { ensureUserProfile } from '@/lib/user';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isDbConnected: boolean | null;
  checkDbConnection: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in.
        await ensureUserProfile(user);
        const refreshedUser = auth.currentUser; // Get the user object with potentially updated profile
        setUser(refreshedUser);
      } else {
        // User is signed out.
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  const checkDbConnection = async () => {
    if (!db || !auth.currentUser) {
        setIsDbConnected(false);
        return;
    }
    try {
        // Try to read the user's own profile document. This is a safe, non-destructive read.
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        await getDoc(userDocRef);
        setIsDbConnected(true);
    } catch (error: any) {
        console.error("Database connection check failed:", error);
        if (error.code === 'permission-denied' || error.code === 'unimplemented') {
            setIsDbConnected(false);
        } else {
           // For other errors, we can assume it might be a temporary network issue.
           // You could decide to handle this differently, but for now, we'll allow proceeding.
           setIsDbConnected(true); 
        }
    }
  };


  return (
    <AuthContext.Provider value={{ user, loading, isDbConnected, checkDbConnection }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
