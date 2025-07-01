
'use client';

import { AuthForm } from '@/components/AuthForm';
import { Header } from '@/components/Header';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, getRedirectResult, type AuthError } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    if (!auth) {
      setIsVerifying(false);
      return;
    }
    
    // It's possible a user initiated sign-in on the login page
    // and was redirected here. We check for the result here too.
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          toast({
            title: 'Sign In Successful',
            description: `Welcome, ${result.user.displayName}!`,
          });
          // The onAuthStateChanged listener below will handle the navigation.
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

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/lobby');
      } else {
        setIsVerifying(false);
      }
    });
    
    return () => unsubscribe();
  }, []);

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

  return (
    <div className="flex flex-col min-h-dvh bg-transparent text-foreground font-body">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <AuthForm mode="signup" />
      </main>
    </div>
  );
}
