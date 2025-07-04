'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, updateProfile } from 'firebase/auth';
import { ensureUserProfile } from '@/lib/user';
import { getFirebaseAuthErrorMessage } from '@/lib/error-utils';

// Form validation schemas
const loginSchema = z.object({
    email: z.string().email({ message: 'Please enter a valid email address' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

const signupSchema = z.object({
    displayName: z.string().min(3, { message: 'Display name must be at least 3 characters' }),
    email: z.string().email({ message: 'Please enter a valid email address' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

function LoginForm() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const form = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
    });

    const onSubmit = async (data: LoginFormData) => {
        setIsLoading(true);
        if (!auth) {
            toast({ title: "Auth not configured", variant: "destructive" });
            setIsLoading(false);
            return;
        }
        try {
            const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
            await ensureUserProfile(userCredential.user);
            // The AuthGuard will handle the redirect on successful login
        } catch (error: any) {
            toast({
                title: "Login Failed",
                description: getFirebaseAuthErrorMessage(error),
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true);
        try {
            if (!auth) throw new Error("Auth not configured");
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            await ensureUserProfile(result.user);
            // The AuthGuard will handle the redirect on successful login
        } catch (error: any) {
            toast({
                title: "Google Sign In Failed",
                description: getFirebaseAuthErrorMessage(error),
                variant: "destructive",
            });
        } finally {
            setIsGoogleLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input type="email" placeholder="you@example.com" {...field} disabled={isLoading} className="backdrop-blur-sm bg-white/5 border-white/10 focus:border-white/30" />
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
                                    <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} className="backdrop-blur-sm bg-white/5 border-white/10 focus:border-white/30" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity shadow-lg shadow-primary/20" 
                        disabled={isLoading}
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Log In
                        {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                </form>
            </Form>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
            </div>

            <Button 
                variant="outline" 
                type="button" 
                className="w-full backdrop-blur-sm bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300 hover:shadow-lg hover:shadow-white/5"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
            >
                {isGoogleLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                        />
                        <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                        />
                        <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                        />
                        <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                        />
                        <path d="M1 1h22v22H1z" fill="none" />
                    </svg>
                )}
                Google
            </Button>
        </div>
    );
}

function SignupForm() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const form = useForm<SignupFormData>({
        resolver: zodResolver(signupSchema),
        defaultValues: { displayName: '', email: '', password: '' },
    });
    
    const onSubmit = async (data: SignupFormData) => {
        setIsLoading(true);
        if (!auth) {
            toast({ title: "Auth not configured", variant: "destructive" });
            setIsLoading(false);
            return;
        }
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
            await updateProfile(userCredential.user, {
                displayName: data.displayName,
                photoURL: `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(data.displayName)}&backgroundColor=e74c86&textColor=ffffff&radius=50`
            });
            await ensureUserProfile(userCredential.user);
            // The AuthGuard will handle the redirect on successful signup
        } catch (error: any) {
            toast({
                title: "Sign Up Failed",
                description: getFirebaseAuthErrorMessage(error),
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true);
        try {
            if (!auth) throw new Error("Auth not configured");
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            await ensureUserProfile(result.user);
            // The AuthGuard will handle the redirect on successful login
        } catch (error: any) {
            toast({
                title: "Google Sign In Failed",
                description: getFirebaseAuthErrorMessage(error),
                variant: "destructive",
            });
        } finally {
            setIsGoogleLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="displayName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Display Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="code_master" {...field} disabled={isLoading} className="backdrop-blur-sm bg-white/5 border-white/10 focus:border-white/30" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input type="email" placeholder="you@example.com" {...field} disabled={isLoading} className="backdrop-blur-sm bg-white/5 border-white/10 focus:border-white/30" />
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
                                    <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} className="backdrop-blur-sm bg-white/5 border-white/10 focus:border-white/30" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity shadow-lg shadow-primary/20" 
                        disabled={isLoading}
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sign Up
                        {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                </form>
            </Form>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
            </div>

            <Button 
                variant="outline" 
                type="button" 
                className="w-full backdrop-blur-sm bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300 hover:shadow-lg hover:shadow-white/5"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
            >
                {isGoogleLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                        />
                        <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                        />
                        <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                        />
                        <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                        />
                        <path d="M1 1h22v22H1z" fill="none" />
                    </svg>
                )}
                Google
            </Button>
        </div>
    );
}

type AuthFormProps = {
  mode: 'login' | 'signup';
};

export function AuthForm({ mode }: AuthFormProps) {
  const isLogin = mode === 'login';

  return (
    <div className="relative z-10 w-full max-w-md mx-auto">
      {/* Glassmorphism decorative elements */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 animate-pulse"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-accent/20 rounded-full blur-3xl opacity-50 animate-pulse" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-40 right-20 w-64 h-64 bg-primary/10 rounded-full blur-2xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute bottom-40 left-20 w-48 h-48 bg-accent/10 rounded-full blur-2xl opacity-30 animate-pulse" style={{ animationDelay: '3s' }}></div>
      
      <Card className="w-full mx-auto bg-card/30 backdrop-blur-xl border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Inner subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
        
        <CardHeader className="relative pb-8 px-10 sm:px-14">
          <CardTitle className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            {isLogin ? 'Welcome Back' : 'Create an Account'}
          </CardTitle>
          <CardDescription className="text-white/70 text-lg mt-3">
            {isLogin ? "Log in to your account to continue your coding journey." : "Enter your details to join our community of developers."}
          </CardDescription>
        </CardHeader>
        <CardContent className="relative px-10 sm:px-14">
          {isLogin ? <LoginForm /> : <SignupForm />}
        </CardContent>
        <CardFooter className="relative pb-10 px-10 sm:px-14">
          <div className="text-center text-sm w-full text-white/70">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <Link href={isLogin ? '/signup' : '/login'} className="font-medium text-primary hover:text-accent transition-colors">
                  {isLogin ? 'Sign up' : 'Log in'}
              </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
