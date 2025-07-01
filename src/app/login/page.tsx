
'use client';

import { AuthForm } from '@/components/AuthForm';
import { Header } from '@/components/Header';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, getRedirectResult, type AuthError, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  // Effect 1: Handles subscribing to auth state and processing Google redirect.
  useEffect(() => {
    if (!auth) {
      setIsVerifying(false);
      return;
    }

    // This listener will update the user state.
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsVerifying(false);
    });

    // Check for a redirect result from Google AFTER setting up the listener.
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          // A sign-in was just completed via redirect.
          // The onAuthStateChanged listener above will handle setting the new user.
          toast({
            title: 'Sign In Successful',
            description: `Welcome back, ${result.user.displayName}!`,
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
    
    return () => unsubscribe();
  }, [toast]);

  // Effect 2: Handles navigation based on the user state.
  useEffect(() => {
    // If we're done verifying and we have a user, redirect them to the lobby.
    if (!isVerifying && user) {
      router.replace('/lobby');
    }
  }, [user, isVerifying, router]);


  // Render logic: Show a loader while verifying or if a user is found (and we're about to redirect).
  if (isVerifying || user) {
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

  // If not verifying and no user, it's safe to show the login form.
  return (
    <div className="flex flex-col min-h-dvh bg-transparent text-foreground font-body">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <AuthForm mode="login" />
      </main>
    </div>
  );
}
