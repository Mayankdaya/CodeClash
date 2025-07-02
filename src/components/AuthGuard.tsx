
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { ensureUserProfile } from '@/lib/user';
import { Header } from '@/components/Header';

export default function AuthGuard({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!auth) {
      if (typeof window !== 'undefined') {
        window.location.assign('/login');
      }
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      try {
        if (user) {
          // User is logged in. This function will throw an error if it can't
          // read or write the user's profile in Firestore.
          await ensureUserProfile(user);
          setIsAuthorized(true);
        } else {
          // User is not logged in. Redirect to the login page.
          if (typeof window !== 'undefined') {
            window.location.assign('/login');
          }
        }
      } catch (error) {
          console.error("AuthGuard Error: Could not ensure user profile. This is likely a Firestore security rule issue.", error);
          
          // If any error occurs (e.g., Firestore permission denied), sign the user out
          // to prevent a login state mismatch, then redirect to a helpful setup page.
          if (auth) {
            await signOut(auth);
          }
          if (typeof window !== 'undefined') {
            window.location.assign('/setup-error');
          }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col min-h-dvh bg-transparent text-foreground font-body">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-lg text-muted-foreground">Authenticating...</p>
        </main>
      </div>
    );
  }

  if (isAuthorized) {
    return <>{children}</>;
  }

  // This return is a fallback, but the redirect should have already happened.
  return null;
}
