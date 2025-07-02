
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp as firestoreServerTimestamp } from 'firebase/firestore';
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

  useEffect(() => {
    const topicId = searchParams.get('topic');
    if (!db || !currentUser) return;

    if(!topicId) {
      toast({ title: "No Topic Selected", description: "Please select a topic from the lobby.", variant: "destructive" });
      router.push('/lobby');
      return;
    }
    
    const createDummyMatch = async (retryCount = 0) => {
        setStatusText('Finding opponent...');
        
        if (retryCount > 0) {
            setStatusText(`Problem generation failed. Retrying... (${retryCount}/3)`);
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

            if (!problem || !problem.testCases) {
                throw new Error("AI returned a null or invalid problem object.");
            }
            
            const validTestCases = problem.testCases.filter(tc => tc.expected !== undefined && tc.expected !== null);
            if (validTestCases.length < 3) { throw new Error("AI failed to generate a valid problem. Please try again."); }
            
            const problemWithStrTestCases = {
                ...problem,
                testCases: validTestCases.map(tc => ({
                    input: JSON.stringify(tc.input),
                    expected: JSON.stringify(tc.expected),
                })),
            };
            
            const clashDocRef = await addDoc(collection(db, 'clashes'), {
                topicId,
                problem: JSON.parse(JSON.stringify(problemWithStrTestCases)),
                participants: [
                    { userId: currentUser.uid, userName: currentUser.displayName, userAvatar: currentUser.photoURL, score: 0, solvedTimestamp: null },
                    { userId: 'test-user-id', userName: 'Test User', userAvatar: 'https://api.dicebear.com/8.x/bottts-neutral/svg?seed=Test', score: 0, solvedTimestamp: null }
                ],
                createdAt: firestoreServerTimestamp(),
                status: 'active'
            });

            toast({ title: "Match Found!", description: "Let's go!" });
            router.push(`/clash/${clashDocRef.id}`);
            
        } catch (error: any) {
            console.error("Failed to create clash:", error);
            if (error instanceof FirebaseError && error.code === 'permission-denied') {
                router.push('/setup-error');
            } else if (error.message.includes("AI failed")) {
                // Retry if AI fails
                setTimeout(() => createDummyMatch(retryCount + 1), 2000);
            }
            else {
                toast({ title: "Failed to Create Match", description: "There was an error generating the problem. Please try again.", variant: "destructive" });
                router.push('/lobby');
            }
        }
    };
    
    createDummyMatch();

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
    <AuthGuard>
      <MatchingContent />
    </AuthGuard>
  );
}
