'use client';

import { AuthForm } from '@/components/AuthForm';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push('/lobby');
      }
    });
    return () => unsubscribe();
  }, [router]);

  return (
    <div className="flex flex-col min-h-dvh bg-transparent text-foreground font-body">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <AuthForm mode="signup" />
      </main>
      <Footer />
    </div>
  );
}
