
import { AuthForm } from '@/components/AuthForm';
import { Header } from '@/components/Header';
import UnauthGuard from '@/components/UnauthGuard';

export default function LoginPage() {
  return (
    <UnauthGuard>
      <div className="flex flex-col min-h-dvh bg-transparent text-foreground font-body relative overflow-hidden">
        {/* Background gradient mesh */}
        <div className="fixed inset-0 bg-background bg-opacity-80 z-0">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/20 via-transparent to-accent/20"></div>
          </div>
        </div>
        
        <Header />
        <main className="flex-1 flex items-center justify-center p-4 relative z-10">
          <AuthForm mode="login" />
        </main>
      </div>
    </UnauthGuard>
  );
}
