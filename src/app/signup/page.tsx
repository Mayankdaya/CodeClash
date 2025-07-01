
'use client';

import { AuthForm } from '@/components/AuthForm';
import { Header } from '@/components/Header';
import UnauthGuard from '@/components/UnauthGuard';
import { useEffect, useState } from 'react';
import { getRedirectResult } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { ensureUserProfile } from '@/lib/user';
import { Loader2 } from 'lucide-react';

export default function SignupPage() {
    const { toast } = useToast();
    const [isVerifying, setIsVerifying] = useState(true);

    useEffect(() => {
        const checkRedirect = async () => {
            if (!auth) {
                setIsVerifying(false);
                return;
            };

            try {
                const result = await getRedirectResult(auth);
                if (result) {
                    // Google Sign-in was just completed. Process it and redirect.
                    await ensureUserProfile(result.user);
                    toast({ title: 'Sign In Successful', description: `Welcome, ${result.user.displayName}!` });
                    // The UnauthGuard will handle the redirect.
                    return; // Stay in verifying state.
                }
            } catch (error: any) {
                console.error("Google Sign-In Error:", error);
                toast({ title: 'Sign In Failed', description: error.message, variant: 'destructive' });
            }
            // Only set verifying to false if there was no redirect result to process.
            setIsVerifying(false);
        };

        checkRedirect();
    }, [toast]);

    if (isVerifying) {
        return (
            <div className="flex flex-col min-h-dvh bg-transparent text-foreground font-body">
                <Header />
                <main className="flex-1 flex flex-col items-center justify-center text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">Finalizing login...</p>
                </main>
            </div>
        )
    }

    return (
      <UnauthGuard>
        <div className="flex flex-col min-h-dvh bg-transparent text-foreground font-body">
          <Header />
          <main className="flex-1 flex items-center justify-center py-12 px-4">
            <AuthForm mode="signup" />
          </main>
        </div>
      </UnauthGuard>
    );
}
