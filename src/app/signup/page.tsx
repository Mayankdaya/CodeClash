
'use client';

import { AuthForm } from '@/components/AuthForm';
import { Header } from '@/components/Header';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, getRedirectResult, type AuthError, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SignupPage() {
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

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsVerifying(false);
    });
    
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
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

    return () => unsubscribe();
  }, [toast]);

  // Effect 2: Handles navigation based on the user state.
  useEffect(() => {
    if (!isVerifying && user) {
      router.replace('/lobby');
    }
  }, [user, isVerifying, router]);

  // Render logic: Show a loader while verifying or if a user is found.
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

  // If not verifying and no user, show the form.
  return (
    <div className="flex flex-col min-h-dvh bg-transparent text-foreground font-body">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <AuthForm mode="signup" />
      </main>
    </div>
  );
}
