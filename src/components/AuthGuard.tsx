
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ensureUserProfile } from '@/lib/user';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isDbConnected, checkDbConnection } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (loading) {
      return; 
    }

    if (!user) {
      router.push('/login');
      return;
    }
    
    if (isDbConnected === null) { // only check if not already checked
        checkDbConnection();
    }
    
  }, [user, loading, router, isDbConnected, checkDbConnection]);

  useEffect(() => {
    if (isDbConnected === false) { // explicit check for false
      router.push('/setup-error');
    }
  }, [isDbConnected, router]);

  if (loading || !user || isDbConnected !== true) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-4">Authenticating...</p>
      </div>
    );
  }

  return <>{children}</>;
}
