
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { getRedirectResult, type AuthError, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { ensureUserProfile } from '@/lib/user';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';

export default function UnauthGuard({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    if (!auth) {
      setIsVerifying(false);
      return;
    }
    
    // First, check for a redirect result from Google Sign-In
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          // A Google Sign-in was just completed.
          // The user is now authenticated, so we can ensure their profile exists
          // and then redirect them to the lobby.
          ensureUserProfile(result.user).then(() => {
            toast({
              title: 'Sign In Successful',
              description: `Welcome, ${result.user.displayName}!`,
            });
            if (typeof window !== 'undefined') {
              window.location.assign('/lobby');
            }
          });
        } else {
          // No redirect result, so now check for an existing session.
          const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
              // User has an existing session, redirect them.
              if (typeof window !== 'undefined') {
                window.location.assign('/lobby');
              }
            } else {
              // No user is signed in. It's safe to show the form.
              setIsVerifying(false);
            }
          });
          return () => unsubscribe();
        }
      })
      .catch((error: AuthError) => {
        console.error('Google Sign-In Error:', error);
        toast({
          title: 'Sign In Failed',
          description: 'Could not complete sign in with Google. Please try again.',
          variant: 'destructive',
        });
        setIsVerifying(false);
      });
  }, [toast]);

  if (isVerifying) {
    return (
      <div className="flex flex-col min-h-dvh bg-transparent text-foreground font-body">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Verifying authentication...</p>
        </main>
      </div>
    );
  }

  return <>{children}</>;
}
