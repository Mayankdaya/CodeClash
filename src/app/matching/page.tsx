
'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp as firestoreServerTimestamp, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { generateProblem } from '@/ai/flows/generateProblemFlow';
import { UserVideo } from '@/components/UserVideo';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/hooks/useAuth';
import { FirebaseError } from 'firebase/app';

function MatchingContent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser } = useAuth();

  const [statusText, setStatusText] = useState('Initializing...');
  const matchmakingStarted = useRef(false);

  useEffect(() => {
    // Prevent the effect from running more than once
    if (matchmakingStarted.current || !db || !currentUser) {
      return;
    }
    matchmakingStarted.current = true;

    const topicId = searchParams.get('topic');

    if(!topicId) {
      toast({ title: "No Topic Selected", description: "Please select a topic from the lobby.", variant: "destructive" });
      router.push('/lobby');
      return;
    }
    
    const createDummyMatch = async (retryCount = 0) => {
        setStatusText('Finding opponent...');
        
        if (retryCount > 0) {
            setStatusText(`Problem generation is taking a while. Retrying... (${retryCount}/3)`);
        }
        
        if (retryCount > 3) {
            toast({ title: "Failed to Create Match", description: "Could not generate a problem after multiple retries. Please try again.", variant: "destructive" });
            router.push('/lobby');
            return;
        }

        try {
            setStatusText('Opponent found! Generating challenge...');
            
            const topicName = topicId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const problem = await generateProblem({ topic: topicName, seed: Date.now().toString() });

            // Robust validation: check for problem, testCases array, and validity of each test case.
            if (!problem || !problem.testCases || problem.testCases.some(tc => tc.expected === undefined || tc.expected === null) || problem.testCases.length < 5) {
                console.error("AI returned an invalid problem object or invalid test cases, retrying...");
                setTimeout(() => createDummyMatch(retryCount + 1), 2000);
                return; // Exit this attempt and retry.
            }
            
            const clashDocRef = await addDoc(collection(db, 'clashes'), {
                topicId,
                problem: JSON.stringify(problem), // Stringify the problem to avoid nested array issues in Firestore
                participants: [
                    { userId: currentUser.uid, userName: currentUser.displayName, userAvatar: currentUser.photoURL, score: 0, solvedTimestamp: null, ready: false },
                    { userId: 'test-user-id', userName: 'Test User', userAvatar: 'https://api.dicebear.com/8.x/bottts-neutral/svg?seed=Test', score: 0, solvedTimestamp: null, ready: true }
                ],
                createdAt: firestoreServerTimestamp(),
                status: 'pending'
            });

            toast({ title: "Match Found!", description: "Let's go!" });
            router.push(`/clash/${clashDocRef.id}`);
            
        } catch (error: any) {
            console.error("An error occurred during problem generation:", error);
            if (error instanceof FirebaseError && error.code === 'permission-denied') {
                router.push('/setup-error');
            } else {
                // Any other error during the process is likely transient (API error, etc.), so retry.
                setTimeout(() => createDummyMatch(retryCount + 1), 2000);
            }
        }
    };
    
    createDummyMatch();

  }, [currentUser, router, searchParams, toast, db]);

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
    <AuthGuard>
      <MatchingContent />
    </AuthGuard>
  );
}
