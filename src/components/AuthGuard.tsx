
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { ensureUserProfile } from '@/lib/user';
import { Header } from '@/components/Header';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc } from 'firebase/firestore';


export default function AuthGuard({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const { toast } = useToast();

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
          // User is logged in. Ensure their profile exists then allow access.
          await ensureUserProfile(user);

          // As a final verification, try to read the document we just ensured exists.
          // This will fail if Firestore security rules are too restrictive.
          if (db) {
            await getDoc(doc(db, 'users', user.uid));
          }
          
          setIsAuthorized(true);
        } else {
          // User is not logged in. Redirect to the login page.
          if (typeof window !== 'undefined') {
            window.location.assign('/login');
          }
        }
      } catch (error) {
          console.error("Error during authentication check:", error);
          toast({
            title: 'Database Connection Error',
            description: "You've been signed out. While you authenticated successfully, the app could not access your user profile. Please check your Firebase project's Firestore security rules and try again.",
            variant: 'destructive',
            duration: 10000,
          });
          // If any error occurs (e.g., Firestore permission denied), log the user out
          // to prevent a redirect loop, then send them to the login page.
          if (auth) {
            await signOut(auth);
          }
          if (typeof window !== 'undefined') {
            window.location.assign('/login');
          }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [toast]);

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
