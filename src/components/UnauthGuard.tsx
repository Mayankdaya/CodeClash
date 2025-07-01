
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, getRedirectResult, type AuthError } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { ensureUserProfile } from '@/lib/user';
import { useToast } from '@/hooks/use-toast';

export default function UnauthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    if (!auth) {
      setIsVerifying(false);
      return;
    }

    // Set up the listener that will react to auth changes.
    // This will catch both existing sessions and successful new logins.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is authenticated, so we should redirect them.
        router.replace('/lobby');
      } else {
        // No user is signed in. It's safe to stop loading and show the form.
        setIsVerifying(false);
      }
    });

    // Separately, check for a redirect result. This doesn't need to be
    // tied to the listener's cleanup.
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          // A Google Sign-in was just completed.
          // The listener above will see the new `user` and redirect.
          ensureUserProfile(result.user);
          toast({
            title: 'Sign In Successful',
            description: `Welcome, ${result.user.displayName}!`,
          });
        }
      })
      .catch((error: AuthError) => {
        console.error('Google Sign-In Error:', error);
        toast({
          title: 'Sign In Failed',
          description: 'Could not complete sign in with Google. Please try again.',
          variant: 'destructive',
        });
      });

    // Return the cleanup function for the listener.
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // <-- CRITICAL: Empty dependency array ensures this runs only once.

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
