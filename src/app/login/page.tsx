
'use client';

import { AuthForm } from '@/components/AuthForm';
import { Header } from '@/components/Header';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, getRedirectResult, type AuthError } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ensureUserProfile } from '@/lib/user';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setIsLoading(false);
      return;
    }

    // This effect runs only once to check the auth state and handle redirects.
    // It is critical that the dependency array is empty.
    
    // First, check if this is a return from a Google Sign-In redirect.
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          // A sign-in was just completed. Ensure profile exists.
          ensureUserProfile(result.user);
          toast({
            title: 'Sign In Successful',
            description: `Welcome back, ${result.user.displayName}!`,
          });
          // The onAuthStateChanged listener below will handle the redirect.
        }
      })
      .catch((error: AuthError) => {
        console.error('Google Sign-In Error:', error);
        toast({
          title: 'Sign In Failed',
          description: 'Could not complete sign in with Google. Please try again.',
          variant: 'destructive',
        });
      })
      .finally(() => {
         // Now, set up the auth state listener.
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          if (currentUser) {
            // If user is logged in, redirect them away from the login page.
            router.replace('/lobby');
          } else {
            // If no user, we can safely show the login form.
            setIsLoading(false);
          }
        });
        
        // This return is for the cleanup of onAuthStateChanged
        return () => unsubscribe();
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // <-- Empty dependency array is critical to prevent infinite loops.


  if (isLoading) {
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

  // If not loading and no user, show the form.
  return (
    <div className="flex flex-col min-h-dvh bg-transparent text-foreground font-body">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <AuthForm mode="login" />
      </main>
    </div>
  );
}
