
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { getRedirectResult, type AuthError, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { ensureUserProfile } from '@/lib/user';
import { useToast } from '@/hooks/use-toast';

export default function UnauthGuard({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!auth) {
      setIsReady(true);
      return;
    }

    let unsubscribe: () => void = () => {};

    const verify = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // A Google Sign-in was just completed. Process it and redirect.
          await ensureUserProfile(result.user);
          toast({ title: 'Sign In Successful', description: `Welcome, ${result.user.displayName}!` });
          if (typeof window !== 'undefined') {
            window.location.assign('/lobby');
          }
          return; // We are navigating away, no need to proceed.
        }

        // If no redirect, set up a persistent listener to check for an existing session.
        unsubscribe = onAuthStateChanged(auth, (user) => {
          if (user) {
            // User is already logged in, redirect them.
            if (typeof window !== 'undefined') {
              window.location.assign('/lobby');
            }
          } else {
            // Only set ready if we are sure the user is not logged in.
            setIsReady(true);
          }
        });

      } catch (error) {
        console.error('Auth verification error:', error);
        const authError = error as AuthError;
        toast({ title: 'Sign In Failed', description: authError.message, variant: 'destructive' });
        setIsReady(true); // Show form even on error
      }
    };

    verify();

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // This dependency array MUST be empty to run only once and prevent infinite loops.

  if (!isReady) {
    return (
      <div className="flex flex-col min-h-dvh bg-transparent text-foreground font-body">
        <main className="flex-1 flex flex-col items-center justify-center text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Verifying authentication...</p>
        </main>
      </div>
    );
  }

  return <>{children}</>;
}
