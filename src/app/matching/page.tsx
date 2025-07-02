
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp as firestoreServerTimestamp } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { generateProblem } from '@/ai/flows/generateProblemFlow';
import { UserVideo } from '@/components/UserVideo';

function MatchingContent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [statusText, setStatusText] = useState('Initializing...');
  const [currentUser, setCurrentUser] = useState<{uid: string; displayName: string; photoURL: string;} | null>(null);

  useEffect(() => {
    let guestId = sessionStorage.getItem('guestId');
    let guestName = sessionStorage.getItem('guestName');
    if (!guestId) {
      guestId = `guest-${Math.random().toString(36).substring(2, 9)}`;
      guestName = `Guest ${Math.floor(Math.random() * 900) + 100}`;
      sessionStorage.setItem('guestId', guestId);
      sessionStorage.setItem('guestName', guestName);
    }
    setCurrentUser({
      uid: guestId,
      displayName: guestName,
      photoURL: `https://placehold.co/100x100.png`,
    });
  }, []);

  useEffect(() => {
    const topicId = searchParams.get('topic');
    if (!db || !currentUser || !topicId) {
      if(!currentUser && topicId) {
        // Wait for user to be set
        return;
      }
      if(topicId) {
        toast({ title: "Initialization Error", description: "Could not connect. Please try again.", variant: "destructive" });
        router.push('/lobby');
      }
      return;
    }
    
    const createDummyMatch = async (retriesLeft = 2) => {
      try {
        if (retriesLeft === 2) {
          setStatusText('Finding an opponent...');
          await new Promise(resolve => setTimeout(resolve, 1500));
          setStatusText('Opponent found! Generating challenge...');
        } else {
          setStatusText('Challenge generation failed, retrying...');
        }

        const topicName = topicId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const problem = await generateProblem({ topic: topicName, seed: Date.now().toString() });
        
        const validTestCases = problem.testCases?.filter(tc => tc.expected !== undefined && tc.expected !== null) || [];
        if (validTestCases.length < 3) {
            throw new Error("AI returned a problem with too few valid test cases.");
        }
        
        const problemWithStrTestCases = {
            ...problem,
            testCases: validTestCases.map(tc => ({
                input: JSON.stringify(tc.input),
                expected: JSON.stringify(tc.expected),
            })),
        };
        const sanitizedProblem = JSON.parse(JSON.stringify(problemWithStrTestCases));
        
        const dummyOpponent = {
            uid: `dummy-${Math.random().toString(36).substring(2, 9)}`,
            displayName: 'Dummy Bot',
            photoURL: 'https://placehold.co/100x100.png',
        };

        const clashDocRef = await addDoc(collection(db, 'clashes'), {
            topicId,
            problem: sanitizedProblem,
            participants: [
                { userId: currentUser.uid, userName: currentUser.displayName, userAvatar: currentUser.photoURL, score: 0, solvedTimestamp: null },
                { userId: dummyOpponent.uid, userName: dummyOpponent.displayName, userAvatar: dummyOpponent.photoURL, score: 0, solvedTimestamp: null }
            ],
            createdAt: firestoreServerTimestamp(),
            status: 'active'
        });

        toast({ title: "Match Found!", description: "Let's go!" });
        router.push(`/clash/${clashDocRef.id}`);

      } catch (error: any) {
        console.error("Error creating dummy match:", error);
        
        if (error instanceof FirebaseError && error.code === 'permission-denied') {
            router.push('/setup-error');
            return;
        }

        if (retriesLeft > 0) {
          console.warn(`Problem generation failed. Retrying... (${retriesLeft} retries left)`);
          await new Promise(resolve => setTimeout(resolve, 1500));
          return createDummyMatch(retriesLeft - 1);
        }

        toast({ 
          title: "Matchmaking Error", 
          description: "Failed to generate a valid coding problem after multiple attempts. Please try again.",
          variant: "destructive" 
        });
        router.push('/lobby');
      }
    };

    createDummyMatch();

    // No listeners to clean up in dummy mode.
    return () => {};
  }, [currentUser, router, searchParams, toast]);

  if (!currentUser) {
    return (
       <div className="flex flex-col min-h-dvh bg-transparent text-foreground font-body">
        <Header />
        <main className="flex-1 container mx-auto py-8 px-4 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-dvh bg-transparent text-foreground font-body">
      <Header />
      <main className="flex-1 container mx-auto py-8 px-4 flex flex-col items-center justify-center">
        <Card className="bg-card/50 backdrop-blur-lg border border-white/10 rounded-2xl shadow-lg w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Finding Your Opponent</CardTitle>
            <CardDescription>Please wait while we find another player.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <div className="aspect-video w-full max-w-md bg-muted/30 rounded-lg flex items-center justify-center overflow-hidden">
              <UserVideo />
            </div>

            <div className="flex items-center gap-4 text-lg text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p>{statusText}</p>
            </div>

            <Button variant="outline" asChild>
              <Link href="/lobby">Cancel Search</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function MatchingPage() {
  return (
    <MatchingContent />
  );
}
