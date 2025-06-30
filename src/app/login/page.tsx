'use client';

import { AuthForm } from '@/components/AuthForm';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';

export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-dvh bg-transparent text-foreground font-body">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <AuthForm mode="login" />
      </main>
      <Footer />
    </div>
  );
}
