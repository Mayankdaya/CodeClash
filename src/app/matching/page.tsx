
'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp as firestoreServerTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';
import { db, rtdb } from '@/lib/firebase';
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
    if (!rtdb || !db || !currentUser || !topicId) {
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
    
    if (listenersAttached.current) return;
    listenersAttached.current = true;
    
    const playerInfo = {
      uid: currentUser.uid,
      displayName: currentUser.displayName,
      photoURL: currentUser.photoURL,
      enteredAt: rtdbServerTimestamp(),
    };
    
    const topicQueueRef = ref(rtdb, `matchmaking/${topicId}`);
    const myQueueRef = ref(rtdb, `matchmaking/${topicId}/${currentUser.uid}`);
    const myMatchRef = ref(rtdb, `userMatches/${currentUser.uid}`);
    let queueUnsubscribe: (() => void) | null = null;
    let matchUnsubscribe: (() => void) | null = null;

    const performCleanup = () => {
      if(cleanupPerformed.current) return;
      cleanupPerformed.current = true;
      if (queueUnsubscribe) queueUnsubscribe();
      if (matchUnsubscribe) matchUnsubscribe();
      
      onDisconnect(myQueueRef).cancel().catch(e => console.error("Error cancelling onDisconnect:", e));
      remove(myQueueRef).catch(e => console.error("Error removing my queue ref:", e));
      remove(myMatchRef).catch(e => console.error("Error removing my match ref:", e));
    }

    matchUnsubscribe = onValue(myMatchRef, (snapshot) => {
      if (snapshot.exists()) {
        const clashId = snapshot.val();
        performCleanup();
        toast({ title: "Match Found!", description: "Let's go!" });
        router.push(`/clash/${clashId}`);
      }
    }, (error) => {
      console.error("RTDB match listener error:", error);
      let description = "There was a problem listening for your match. Please try again.";
      if (error.message.includes("permission_denied")) {
        description = "Database permission denied. Please ensure your Firebase security rules are correctly configured for public access and try again.";
      }
      toast({ title: "Matchmaking Error", description, variant: "destructive" });
      router.push('/lobby');
      performCleanup();
    });

    const setupMatchmaking = async () => {
        try {
            await set(myQueueRef, playerInfo);
        } catch (error: any) {
            console.error("Failed to join queue:", error);
            let description = "Could not join the queue. This might be a database permission issue.";
            if (error.message && error.message.toLowerCase().includes("permission_denied")) {
                description = "Database permission denied. Please check your Firebase security rules and try again.";
            }
            toast({ title: "Matchmaking Error", description, variant: "destructive" });
            router.push('/lobby');
            return;
        }

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
            try {
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
                }
            } catch (error: any) {
                console.error("Error creating match:", error);
                toast({ title: "Matchmaking Error", description: error.message || "Could not create the match.", variant: "destructive" });
                router.push('/lobby');
            }
          }
        }, (error) => {
            console.error("RTDB queue listener error:", error);
            toast({ title: "Matchmaking Error", description: "Could not connect to the matchmaking queue. Please try again.", variant: "destructive" });
            router.push('/lobby');
            performCleanup();
        });
    }

    setupMatchmaking();

    return () => {
      performCleanup();
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
    <MatchingContent />
  );
}
