
import { AuthForm } from '@/components/AuthForm';
import { Header } from '@/components/Header';
import UnauthGuard from '@/components/UnauthGuard';

export default function SignupPage() {
  return (
    <UnauthGuard>
      <div className="flex flex-col min-h-dvh bg-transparent text-foreground font-body">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <AuthForm mode="signup" />
        </main>
      </div>
    </UnauthGuard>
  );
}
