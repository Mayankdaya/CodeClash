
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp as firestoreServerTimestamp, doc, getDoc, runTransaction } from 'firebase/firestore';
import { ref, onValue, set, remove, serverTimestamp as rtdbServerTimestamp } from "firebase/database";
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';
import { db, rtdb } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { generateProblem } from '@/ai/flows/generateProblemFlow';
import { UserVideo } from '@/components/UserVideo';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/hooks/useAuth';

function MatchingContent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser } = useAuth();

  const [statusText, setStatusText] = useState('Initializing...');

  useEffect(() => {
    const topicId = searchParams.get('topic');
    if (!rtdb || !db || !currentUser || !topicId) {
      if(!topicId) {
        toast({ title: "No Topic Selected", description: "Please select a topic from the lobby.", variant: "destructive" });
        router.push('/lobby');
      }
      return;
    }
    
    const userQueueRef = ref(rtdb, `matchmaking/${topicId}/${currentUser.uid}`);
    const topicQueueRef = ref(rtdb, `matchmaking/${topicId}`);

    const joinQueue = async () => {
        setStatusText('Joining matchmaking queue...');
        try {
            await set(userQueueRef, {
                displayName: currentUser.displayName,
                photoURL: currentUser.photoURL || 'https://placehold.co/100x100.png',
                joinedAt: rtdbServerTimestamp,
            });
            setStatusText('Waiting for an opponent...');
        } catch (e) {
            console.error("Failed to join queue:", e);
            toast({ title: "Matchmaking Error", description: "Could not join the queue. Please check your connection and try again.", variant: "destructive" });
            router.push('/lobby');
        }
    };
    
    joinQueue();

    const unsubscribe = onValue(topicQueueRef, async (snapshot) => {
        if (!snapshot.exists() || !snapshot.hasChild(currentUser.uid)) {
            // We are not in the queue, so don't do anything.
            return;
        }

        const queue = snapshot.val();
        const players = Object.keys(queue);

        if (players.length >= 2) {
            // Only the first player in the queue (by join time) creates the match
            const sortedPlayers = Object.entries(queue).sort((a, b) => a[1].joinedAt - b[1].joinedAt);
            const player1Id = sortedPlayers[0][0];
            
            if (currentUser.uid !== player1Id) {
                // I am not the match creator, I just wait for the redirect.
                return;
            }

            const player2Id = sortedPlayers[1][0];
            const player1 = { uid: player1Id, ...sortedPlayers[0][1] };
            const player2 = { uid: player2Id, ...sortedPlayers[1][1] };
            
            // Critical section: remove players and create clash
            await remove(ref(rtdb, `matchmaking/${topicId}/${player1.uid}`));
            await remove(ref(rtdb, `matchmaking/${topicId}/${player2.uid}`));
            
            setStatusText('Opponent found! Generating challenge...');
            
            try {
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
                
                const clashDocRef = await addDoc(collection(db, 'clashes'), {
                    topicId,
                    problem: JSON.parse(JSON.stringify(problemWithStrTestCases)),
                    participants: [
                        { userId: player1.uid, userName: player1.displayName, userAvatar: player1.photoURL, score: 0, solvedTimestamp: null },
                        { userId: player2.uid, userName: player2.displayName, userAvatar: player2.photoURL, score: 0, solvedTimestamp: null }
                    ],
                    createdAt: firestoreServerTimestamp(),
                    status: 'active'
                });

                // Write the clash ID to a known location for the other player
                await set(ref(rtdb, `userMatches/${player1.uid}`), clashDocRef.id);
                await set(ref(rtdb, `userMatches/${player2.uid}`), clashDocRef.id);
                
            } catch (error) {
                console.error("Failed to create clash:", error);
                toast({ title: "Failed to Create Match", description: "There was an error generating the problem. Please try again.", variant: "destructive" });
                router.push('/lobby');
            }
        }
    });

    // Listener for when a match is created FOR ME
    const myMatchRef = ref(rtdb, `userMatches/${currentUser.uid}`);
    const matchUnsubscribe = onValue(myMatchRef, (snapshot) => {
        if (snapshot.exists()) {
            const clashId = snapshot.val();
            toast({ title: "Match Found!", description: "Let's go!" });
            router.push(`/clash/${clashId}`);
        }
    });

    return () => {
        unsubscribe();
        matchUnsubscribe();
        const userQueueRefOnDisconnect = ref(rtdb, `matchmaking/${topicId}/${currentUser.uid}`);
        remove(userQueueRefOnDisconnect);
        const myMatchRefOnDisconnect = ref(rtdb, `userMatches/${currentUser.uid}`);
        remove(myMatchRefOnDisconnect);
    };
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
