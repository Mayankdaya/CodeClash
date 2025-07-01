
'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp as firestoreServerTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';
import AuthGuard from '@/components/AuthGuard';
import { auth, db, rtdb } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { generateProblem } from '@/ai/flows/generateProblemFlow';
import { UserVideo } from '@/components/UserVideo';
import { ref, onValue, set, remove, onDisconnect, runTransaction, serverTimestamp as rtdbServerTimestamp } from "firebase/database";

function MatchingContent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [statusText, setStatusText] = useState('Initializing...');
  const listenersAttached = useRef(false);
  const cleanupPerformed = useRef(false);

  useEffect(() => {
    const topicId = searchParams.get('topic');
    const currentUser = auth?.currentUser;

    if (!rtdb || !db || !currentUser || !topicId) {
      toast({ title: "Initialization Error", description: "Could not connect. Please try again.", variant: "destructive" });
      router.push('/lobby');
      return;
    }
    
    if (listenersAttached.current) return;
    listenersAttached.current = true;
    
    const playerInfo = {
      uid: currentUser.uid,
      displayName: currentUser.displayName || 'Anonymous',
      photoURL: currentUser.photoURL || `https://placehold.co/100x100.png`,
      enteredAt: rtdbServerTimestamp(),
    };
    
    const topicQueueRef = ref(rtdb, `matchmaking/${topicId}`);
    const myQueueRef = ref(rtdb, `matchmaking/${topicId}/${currentUser.uid}`);
    const myMatchRef = ref(rtdb, `userMatches/${currentUser.uid}`);
    let queueUnsubscribe: (() => void) | null = null;

    const performCleanup = () => {
      if(cleanupPerformed.current) return;
      cleanupPerformed.current = true;
      if (queueUnsubscribe) queueUnsubscribe();
      matchUnsubscribe();
      onDisconnect(myQueueRef).cancel();
      remove(myQueueRef);
      remove(myMatchRef);
    }

    const matchUnsubscribe = onValue(myMatchRef, (snapshot) => {
      if (snapshot.exists()) {
        const clashId = snapshot.val();
        performCleanup();
        toast({ title: "Match Found!", description: "Let's go!" });
        router.push(`/clash/${clashId}`);
      }
    });

    const setupMatchmaking = async () => {
        await set(myQueueRef, playerInfo);
        onDisconnect(myQueueRef).remove();
        setStatusText('Waiting for an opponent...');

        queueUnsubscribe = onValue(topicQueueRef, async (snapshot) => {
          if (!snapshot.exists()) return;

          const queue = snapshot.val();
          const players = Object.values(queue) as any[];
          
          if (players.length < 2) return;

          const opponent = players.find(p => p.uid !== currentUser.uid);
          if (!opponent) return;

          const me = queue[currentUser.uid];
          if (!me) return; 

          if (me.enteredAt < opponent.enteredAt) {
            const { committed } = await runTransaction(topicQueueRef, (currentQueue) => {
              if (currentQueue && currentQueue[me.uid] && currentQueue[opponent.uid]) {
                delete currentQueue[me.uid];
                delete currentQueue[opponent.uid];
                return currentQueue;
              }
              return; 
            });

            if (committed) {
              performCleanup();
              setStatusText('Opponent found! Generating challenge...');
              
              try {
                const topicName = topicId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const problem = await generateProblem({ topic: topicName, seed: Date.now().toString() });
                
                const validTestCases = problem.testCases.filter(tc => tc.expected !== undefined && tc.expected !== null);
                if (validTestCases.length < 3) { throw new Error("AI failed to generate a valid problem. Please try again."); }
                
                const problemWithStrTestCases = {
                    ...problem,
                    testCases: validTestCases.map(tc => ({
                        input: JSON.stringify(tc.input),
                        expected: JSON.stringify(tc.expected),
                    })),
                };
                const sanitizedProblem = JSON.parse(JSON.stringify(problemWithStrTestCases));

                const clashDocRef = await addDoc(collection(db, 'clashes'), {
                    topicId,
                    problem: sanitizedProblem,
                    participants: [
                        { userId: me.uid, userName: me.displayName, userAvatar: me.photoURL, score: 0, solvedTimestamp: null },
                        { userId: opponent.uid, userName: opponent.displayName, userAvatar: opponent.photoURL, score: 0, solvedTimestamp: null }
                    ],
                    createdAt: firestoreServerTimestamp(),
                    status: 'active'
                });

                await set(ref(rtdb, `userMatches/${opponent.uid}`), clashDocRef.id);
                await set(myMatchRef, clashDocRef.id);

              } catch (error: any) {
                console.error("Error creating match:", error);
                toast({ title: "Matchmaking Error", description: error.message, variant: "destructive" });
                router.push('/lobby');
              }
            }
          }
        });
    }

    setupMatchmaking();

    return () => {
      performCleanup();
    };
  }, [router, searchParams, toast]);

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

