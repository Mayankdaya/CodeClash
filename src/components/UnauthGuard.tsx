
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

export default function UnauthGuard({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!auth) {
      setIsReady(true);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is logged in, redirect them away from this unauthenticated page.
        window.location.assign('/lobby');
      } else {
        // User is not logged in, it's safe to show the content (e.g., login form).
        setIsReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

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
