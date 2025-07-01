
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { ensureUserProfile } from '@/lib/user';

export default function AuthGuard({ children }: { children: ReactNode }) {
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!auth) {
      // This should not happen if FirebaseConfigGuard is working, but as a fallback...
      if (typeof window !== 'undefined') {
        window.location.assign('/');
      }
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is logged in. Ensure their profile exists then allow access.
        await ensureUserProfile(user);
        setIsAuthorized(true);
      } else {
        // User is not logged in. Redirect to the login page.
        if (typeof window !== 'undefined') {
          window.location.assign('/login');
        }
      }
    });

    return () => unsubscribe();
  }, []);

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-transparent text-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg">Authenticating...</p>
      </div>
    );
  }

  return <>{children}</>;
}
