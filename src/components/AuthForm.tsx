
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile, 
  GoogleAuthProvider, 
  signInWithRedirect,
  getRedirectResult,
  type AuthError
} from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ArrowRight, Loader2 } from 'lucide-react';


const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg role="img" viewBox="0 0 24 24" {...props}>
    <path
      fill="currentColor"
      d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.36 1.84-4.26 1.84-3.55 0-6.72-2.9-6.72-6.4s3.17-6.4 6.72-6.4c1.93 0 3.33.74 4.3 1.69l2.5-2.5C17.96 1.96 15.47 1 12.48 1 5.88 1 1 5.96 1 12.48s4.88 11.48 11.48 11.48c3.47 0 6.04-1.18 8.04-3.21 2.08-2.1 2.86-5.02 2.86-7.48 0-.74-.07-1.48-.2-2.2z"
    />
  </svg>
);

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

const signupSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters." }).max(20, { message: "Username must be 20 characters or less."}),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;


function AuthFormContent({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(true);

  useEffect(() => {
    if (!auth) {
      setIsProcessingRedirect(false);
      return;
    }

    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          router.push('/lobby');
        } else {
          setIsProcessingRedirect(false);
        }
      })
      .catch((error) => {
        const authError = error as AuthError;
        toast({
          title: "Google Sign-In Failed",
          description: authError.message || 'An unknown error occurred.',
          variant: "destructive",
        });
        setIsProcessingRedirect(false);
      });
  }, [router, toast]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { username: '', email: '', password: '' },
  });

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    setIsGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider);
  };

  const onLoginSubmit = async (data: LoginFormData) => {
    if (!auth) return;
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
    } catch (error) {
      const authError = error as AuthError;
      let description = "An unexpected error occurred. Please try again.";
      if (authError.code === 'auth/invalid-credential') {
        description = "Invalid email or password. If you originally signed up using Google, please log in with Google instead.";
      } else {
        description = authError.message;
      }
      toast({
        title: "Login Failed",
        description: description,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSignupSubmit = async (data: SignupFormData) => {
    if (!auth || !db) return;
    setIsLoading(true);
    try {
        const { user } = await createUserWithEmailAndPassword(auth, data.email, data.password);
        await updateProfile(user, {
            displayName: data.username,
        });
    } catch (error) {
        const authError = error as AuthError;
        toast({
            title: "Sign Up Failed",
            description: authError.message,
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
  };

  const isLogin = mode === 'login';
  const anyLoading = isLoading || isGoogleLoading;
  const form = isLogin ? loginForm : signupForm;
  const onSubmit = isLogin ? onLoginSubmit : onSignupSubmit;

  if (isProcessingRedirect) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Finalizing login...</p>
      </div>
    );
  }

  return (
    <>
      <Form {...(form as any)}>
        <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
          {!isLogin && (
            <FormField
              control={signupForm.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="code_master" {...field} disabled={anyLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="you@example.com" {...field} disabled={anyLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} disabled={anyLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={anyLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLogin ? 'Log In' : 'Sign Up'}
            {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </form>
      </Form>
      <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                  Or
              </span>
          </div>
      </div>
      <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={anyLoading}>
          {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
          {isLogin ? 'Sign in with Google' : 'Sign up with Google'}
      </Button>
    </>
  );
}

type AuthFormProps = {
  mode: 'login' | 'signup';
};

export function AuthForm({ mode }: AuthFormProps) {
  const isLogin = mode === 'login';

  return (
    <Card className="w-full max-w-md mx-auto bg-card/50 backdrop-blur-lg border-white/10">
      <CardHeader>
        <CardTitle className="text-3xl">{isLogin ? 'Welcome Back' : 'Create an Account'}</CardTitle>
        <CardDescription>
          {isLogin ? "Log in to your account to continue." : "Enter your details to get started."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AuthFormContent mode={mode} />
        <div className="mt-6 text-center text-sm">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <Link href={isLogin ? '/signup' : '/login'} className="font-medium text-primary hover:underline">
            {isLogin ? 'Sign up' : 'Log in'}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
