
'use client';

import { useState, useEffect } from 'react';
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth, rtdb } from '@/lib/firebase';
import { ref, onValue, set, onDisconnect } from "firebase/database";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowRight, Code, LogOut, User as UserIcon, Trophy } from "lucide-react";

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [onlineUsersCount, setOnlineUsersCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !rtdb) return;

    const userStatusRef = ref(rtdb, `/status/${user.uid}`);
    const isOfflineForDatabase = {
      state: 'offline',
      last_changed: Date.now(),
    };
    const isOnlineForDatabase = {
      state: 'online',
      last_changed: Date.now(),
    };

    const connectedRef = ref(rtdb, '.info/connected');
    const unsubscribe = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        onDisconnect(userStatusRef).set(isOfflineForDatabase).then(() => {
          set(userStatusRef, isOnlineForDatabase);
        });
      }
    });

    return () => {
      unsubscribe();
      if (userStatusRef) {
        set(userStatusRef, isOfflineForDatabase);
      }
    };
  }, [user]);

  useEffect(() => {
    if (!rtdb) return;

    const statusRef = ref(rtdb, 'status');
    const unsubscribe = onValue(statusRef, (snapshot) => {
      if (snapshot.exists()) {
        const statuses = snapshot.val();
        const onlineCount = Object.values(statuses).filter(
          (status: any) => status.state === 'online'
        ).length;
        setOnlineUsersCount(onlineCount);
      } else {
        setOnlineUsersCount(0);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/50 backdrop-blur-xl">
      <div className="container flex h-16 max-w-7xl mx-auto items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2" prefetch={false}>
          <Code className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold tracking-tight">CodeClash</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/lobby" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={false}>Topics</Link>
          <Link href="/leaderboard" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={false}>Leaderboard</Link>
          <Link href="/#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={false}>How it Works</Link>
        </nav>
        <div className="flex items-center gap-4">
           {onlineUsersCount > 0 && (
            <div className="hidden md:flex items-center gap-2 text-sm text-green-400" title={`${onlineUsersCount} ${onlineUsersCount === 1 ? 'user' : 'users'} online`}>
               <span className="relative flex h-2 w-2">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
               </span>
              {onlineUsersCount}
            </div>
          )}
          {auth ? (
            user ? (
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                    <AvatarFallback>{user.displayName?.charAt(0).toUpperCase() || <UserIcon />}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/leaderboard')}>
                  <Trophy className="mr-2 h-4 w-4" />
                  <span>Leaderboard</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Log In</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">
                  Sign Up
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </>
          )) : (
             <Button asChild>
              <Link href="/lobby">
                Start a Clash
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )
        }
        </div>
      </div>
    </header>
  );
}
