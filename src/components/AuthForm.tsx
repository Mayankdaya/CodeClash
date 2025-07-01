
'use client';

import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
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
  username: z.string().min(3, { message: "Username must be at least 3 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;


function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      if (!auth) {
        throw new Error("Firebase Authentication is not available. Please check your configuration.");
      }
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push('/lobby');
    } catch (error: any) {
        let description: ReactNode = "An unknown error occurred. Please try again.";
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;

        if (error.code === 'auth/unauthorized-domain') {
            description = (
              <div className="space-y-2 text-left">
                <p className="font-semibold">This domain is not authorized.</p>
                <p>Your app is using the following configuration:</p>
                <ul className="list-disc pl-5 text-xs bg-black/20 p-2 rounded-md font-mono">
                  <li>Project ID: <span className="font-bold">{projectId || 'NOT FOUND'}</span></li>
                  <li>Auth Domain: <span className="font-bold">{authDomain || 'NOT FOUND'}</span></li>
                </ul>
                <p className="font-semibold pt-2">Please take the following steps:</p>
                <ol className="list-decimal pl-5 space-y-1 text-sm">
                  <li>
                    Ensure you are using a <strong className="text-white">.env.local</strong> file in the root of your project.
                  </li>
                  <li>
                    Verify that the Project ID and Auth Domain above exactly match your Firebase project settings.
                  </li>
                  <li>
                    In your{' '}
                    <a
                      href={`https://console.firebase.google.com/project/${projectId || '_'}/authentication/settings`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold underline hover:text-primary"
                    >
                      Firebase authorized domains
                    </a>
                    , ensure <strong className="text-white">localhost</strong> is listed.
                  </li>
                   <li>
                    After making any changes to your <strong className="text-white">.env.local</strong> file, you <strong className="uppercase">must</strong> restart the development server.
                  </li>
                </ol>
              </div>
            );
        } else if (error.message) {
            description = error.message;
        }

        toast({
            title: "Google Sign-In Failed",
            description: description,
            variant: "destructive",
            duration: Infinity,
        });
    } finally {
        setIsLoading(false);
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    if (!auth) {
       toast({
        title: "Login Failed",
        description: "Firebase Authentication is not available. Please check your configuration.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      router.push('/lobby');
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="you@example.com" {...field} disabled={isLoading} />
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
                  <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Log In
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
      <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
          Sign in with Google
      </Button>
    </>
  );
}

function SignupForm() {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const form = useForm<SignupFormData>({
        resolver: zodResolver(signupSchema),
        defaultValues: { username: '', email: '', password: '' },
    });
    
    const handleGoogleSignIn = async () => {
      setIsLoading(true);
      try {
          if (!auth) {
            throw new Error("Firebase Authentication is not available. Please check your configuration.");
          }
          const provider = new GoogleAuthProvider();
          await signInWithPopup(auth, provider);
          router.push('/lobby');
      } catch (error: any) {
          let description: ReactNode = "An unknown error occurred. Please try again.";
          const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
          const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  
          if (error.code === 'auth/unauthorized-domain') {
              description = (
                <div className="space-y-2 text-left">
                  <p className="font-semibold">This domain is not authorized.</p>
                  <p>Your app is using the following configuration:</p>
                  <ul className="list-disc pl-5 text-xs bg-black/20 p-2 rounded-md font-mono">
                    <li>Project ID: <span className="font-bold">{projectId || 'NOT FOUND'}</span></li>
                    <li>Auth Domain: <span className="font-bold">{authDomain || 'NOT FOUND'}</span></li>
                  </ul>
                  <p className="font-semibold pt-2">Please take the following steps:</p>
                  <ol className="list-decimal pl-5 space-y-1 text-sm">
                    <li>
                      Ensure you are using a <strong className="text-white">.env.local</strong> file in the root of your project.
                    </li>
                    <li>
                      Verify that the Project ID and Auth Domain above exactly match your Firebase project settings.
                    </li>
                    <li>
                      In your{' '}
                      <a
                        href={`https://console.firebase.google.com/project/${projectId || '_'}/authentication/settings`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold underline hover:text-primary"
                      >
                        Firebase authorized domains
                      </a>
                      , ensure <strong className="text-white">localhost</strong> is listed.
                    </li>
                     <li>
                      After making any changes to your <strong className="text-white">.env.local</strong> file, you <strong className="uppercase">must</strong> restart the development server.
                    </li>
                  </ol>
                </div>
              );
          } else if (error.message) {
              description = error.message;
          }
  
          toast({
              title: "Google Sign-In Failed",
              description: description,
              variant: "destructive",
              duration: Infinity,
          });
      } finally {
          setIsLoading(false);
      }
    };

    const onSubmit = async (data: SignupFormData) => {
        if (!auth) {
          toast({
            title: "Sign Up Failed",
            description: "Firebase Authentication is not available. Please check your configuration.",
            variant: "destructive",
          });
          return;
        }
        setIsLoading(true);
        try {
            const { user } = await createUserWithEmailAndPassword(auth, data.email, data.password);
            await updateProfile(user, {
                displayName: data.username,
            });
            router.push('/lobby');
        } catch (error: any) {
            toast({
                title: "Sign Up Failed",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="code_master" {...field} disabled={isLoading} />
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
                        <Input type="email" placeholder="you@example.com" {...field} disabled={isLoading}/>
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
                        <Input type="password" placeholder="••••••••" {...field} disabled={isLoading}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign Up
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
            <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
                Sign up with Google
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
        {isLogin ? <LoginForm /> : <SignupForm />}
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
