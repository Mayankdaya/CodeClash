
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { ensureUserProfile } from '@/lib/user';

export default function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success'>('loading');

  useEffect(() => {
    if (!auth) {
      // Firebase not configured.
      router.push('/');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is authenticated, ensure their profile exists.
        await ensureUserProfile(user);
        // Profile is ready, allow rendering children.
        setStatus('success');
      } else {
        // No user, redirect to login.
        router.push('/login');
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // <-- Empty dependency array is critical to prevent infinite loops.

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-transparent text-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg">Authenticating...</p>
      </div>
    );
  }

  // status === 'success'
  return <>{children}</>;
}
