'use client';

import { AuthForm } from '@/components/AuthForm';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';

export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-dvh bg-transparent text-foreground font-body">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 md:py-20">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AuthForm mode="login" />
        </div>
      </main>
      <Footer />
    </div>
  );
}
