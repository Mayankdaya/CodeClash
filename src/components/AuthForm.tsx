
'use client';

import { useState } from 'react';
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
  type AuthError,
} from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { ensureUserProfile } from '@/lib/user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ArrowRight, Loader2 } from 'lucide-react';

// Using an inline SVG for the Google icon to avoid adding another dependency
const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" {...props}>
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.223,0-9.657-3.657-11.303-8H6.306C9.656,35.663,16.318,40,24,40z"/>
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C39.904,36.213,44,30.668,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
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

type AuthFormProps = {
  mode: 'login' | 'signup';
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { username: '', email: '', password: '' },
  });

  const onLoginSubmit = async (data: LoginFormData) => {
    if (!auth) return;
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      router.push('/lobby');
      toast({ title: 'Login Successful', description: 'Welcome back!' });
    } catch (error) {
      const authError = error as AuthError;
      toast({
        title: "Login Failed",
        description: authError.code === 'auth/invalid-credential' 
          ? "Invalid email or password." 
          : "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const onSignupSubmit = async (data: SignupFormData) => {
    if (!auth) return;
    setIsLoading(true);
    try {
        const { user } = await createUserWithEmailAndPassword(auth, data.email, data.password);
        await updateProfile(user, { displayName: data.username });
        await ensureUserProfile(user, { username: data.username });
        router.push('/lobby');
        toast({ title: 'Sign Up Successful', description: `Welcome, ${data.username}!` });
    } catch (error) {
        const authError = error as AuthError;
        let description = "An unexpected error occurred. Please try again.";
        if (authError.code === 'auth/email-already-in-use') {
            description = "This email is already in use. Please log in instead.";
        }
        toast({
            title: "Sign Up Failed",
            description,
            variant: "destructive",
        });
        setIsLoading(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    if (!auth) return;
    setIsGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    try {
      // This will redirect the user. The result is handled on the login/signup page component.
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("Error starting Google Sign-In:", error);
      toast({
        title: "Google Sign In Failed",
        description: "Could not start the Google Sign-In process. Please try again.",
        variant: "destructive",
      });
      setIsGoogleLoading(false);
    }
  };

  const isLogin = mode === 'login';
  const form = isLogin ? loginForm : signupForm;
  const onSubmit = isLogin ? onLoginSubmit : onSignupSubmit;
  const anyLoading = isLoading || isGoogleLoading;

  return (
    <Card className="w-full max-w-md mx-auto bg-card/50 backdrop-blur-lg border-white/10">
      <CardHeader>
        <CardTitle className="text-3xl">{isLogin ? 'Welcome Back' : 'Create an Account'}</CardTitle>
        <CardDescription>
          {isLogin ? "Log in to your account to continue." : "Enter your details to get started."}
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={anyLoading}>
                {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-5 w-5" />}
                Sign in with Google
            </Button>

            <div className="mt-6 text-center text-sm">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <Link href={isLogin ? '/signup' : '/login'} className="font-medium text-primary hover:underline">
                {isLogin ? 'Sign up' : 'Log in'}
            </Link>
            </div>
        </>
      </CardContent>
    </Card>
  );
}
