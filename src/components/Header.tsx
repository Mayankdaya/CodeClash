
'use client';

import Link from "next/link";
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowRight, Code, LogOut, User, Loader2, ExternalLink, BookOpen, Trophy, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// Logo component with glassmorphism effect
function CodeClashLogo() {
  return (
    <div className="relative flex items-center gap-2 group">
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-accent/30 rounded-lg blur opacity-60 group-hover:opacity-100 transition duration-300"></div>
      <div className="relative flex items-center justify-center bg-black/20 backdrop-blur-sm p-1.5 rounded-lg border border-white/10 shadow-lg">
        <Code className="h-5 w-5 text-primary" />
      </div>
      <span className="relative text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">CodeClash</span>
    </div>
  );
}

export function Header() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    if (auth) {
        await signOut(auth);
    }
    router.push('/');
  };

  return (
    <motion.header 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/60 backdrop-blur-xl shadow-md"
    >
      <div className="container flex h-20 max-w-7xl mx-auto items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center" prefetch={false}>
          <CodeClashLogo />
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link 
            href="/lobby" 
            className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors py-2" 
            prefetch={false}
          >
            <BookOpen className="h-4 w-4" />
            <span>Topics</span>
          </Link>
          <Link 
            href="/leaderboard" 
            className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors py-2" 
            prefetch={false}
          >
            <Trophy className="h-4 w-4" />
            <span>Leaderboard</span>
          </Link>
          <Link 
            href="/#how-it-works" 
            className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors py-2" 
            prefetch={false}
          >
            <HelpCircle className="h-4 w-4" />
            <span>How it Works</span>
          </Link>
          {/* GitHub link removed */}
        </nav>
        <div className="flex items-center gap-4">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : user ? (
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full overflow-hidden border border-white/20 bg-black/20 backdrop-blur-sm hover:bg-white/10 transition-colors">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
                      {user.displayName?.substring(0,2).toUpperCase() || <UserIcon className="h-5 w-5 text-primary" />}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-card/80 backdrop-blur-lg border border-white/10" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem 
                  className="hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                  asChild
                >
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4 text-primary" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4 text-primary" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button 
                variant="ghost" 
                className="border border-white/10 bg-black/20 backdrop-blur-sm hover:bg-white/10 transition-colors"
                asChild
              >
                <Link href="/login">Log In</Link>
              </Button>
              <Button 
                className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
                asChild
              >
                <Link href="/signup" className="flex items-center gap-1">
                  Sign Up
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
}
