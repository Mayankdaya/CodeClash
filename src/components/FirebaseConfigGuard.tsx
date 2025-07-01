'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { isConfigured } from '@/lib/firebase';
import { FirebaseNotConfigured } from '@/components/FirebaseNotConfigured';
import { Toaster } from "@/components/ui/toaster";

export default function FirebaseConfigGuard({ children }: { children: ReactNode }) {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // This effect runs once on the client after initial mount,
    // which is safely after hydration.
    setChecked(true);
  }, []);

  if (!checked) {
    // On the server and during the initial client render before the effect runs,
    // render nothing. This prevents a server-client mismatch.
    return null;
  }
  
  if (!isConfigured) {
    // Now that we're safely on the client, we can check the config
    // and show the guide if needed.
    return <FirebaseNotConfigured />;
  }

  // If we are on the client and the app is configured, render the main app.
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
