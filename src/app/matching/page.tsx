
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
import { generateProblem } from '@/ai/flows/generateProblemFlow';
import { UserVideo } from '@/components/UserVideo';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/hooks/useAuth';
import { FirebaseError } from 'firebase/app';
import { ref, onValue, set, get, remove, update, onDisconnect, off, type DatabaseReference } from 'firebase/database';


function MatchingContent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser } = useAuth();

  const [statusText, setStatusText] = useState('Initializing...');
  const matchmakingActive = useRef(false);
  const myQueueRef = useRef<DatabaseReference | null>(null);

  const cleanup = () => {
    if (myQueueRef.current) {
        onDisconnect(myQueueRef.current).cancel(); // Important: cancel the onDisconnect listener
        off(myQueueRef.current); // Detach listener
        remove(myQueueRef.current);
        myQueueRef.current = null;
    }
  };
  
  const handleCancel = () => {
    cleanup();
    router.push('/lobby');
  };

  useEffect(() => {
    if (matchmakingActive.current || !db || !rtdb || !currentUser) {
      return;
    }

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

            if (!problem || !problem.testCases || problem.testCases.some(tc => tc.expected === undefined || tc.expected === null) || problem.testCases.length < 5) {
                console.error("AI returned an invalid problem object or invalid test cases, retrying...");
                setTimeout(() => createDummyMatch(retryCount + 1), 2000);
                return;
            }
            
            const clashDocRef = await addDoc(collection(db, 'clashes'), {
                topicId,
                problem: JSON.stringify(problem),
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
                setTimeout(() => createDummyMatch(retryCount + 1), 2000);
            }
        }
    };
    
    const startRealtimeMatchmaking = async () => {
      const queueRef = ref(rtdb, `matchmaking/${topicId}`);
      try {
        const snapshot = await get(queueRef);
        if (matchmakingActive.current) return;

        const opponents = snapshot.exists()
          ? Object.entries(snapshot.val()).filter(([uid]) => uid !== currentUser.uid)
          : [];

        if (opponents.length > 0) {
          // --- I AM THE MATCHER ---
          matchmakingActive.current = true;
          const [opponentId, opponentData] = opponents[0];
          setStatusText('Opponent found! Generating challenge...');

          try {
            const topicName = topicId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const problem = await generateProblem({ topic: topicName, seed: Date.now().toString() });

            if (!problem || !problem.testCases || problem.testCases.some(tc => tc.expected === undefined || tc.expected === null) || problem.testCases.length < 5) {
              throw new Error("AI returned invalid problem object.");
            }

            const clashDocRef = await addDoc(collection(db, 'clashes'), {
              topicId,
              problem: JSON.stringify(problem),
              participants: [
                { userId: currentUser.uid, userName: currentUser.displayName, userAvatar: currentUser.photoURL, score: 0, solvedTimestamp: null, ready: false },
                { userId: opponentId, userName: (opponentData as any).userName, userAvatar: (opponentData as any).userAvatar, score: 0, solvedTimestamp: null, ready: false }
              ],
              createdAt: firestoreServerTimestamp(),
              status: 'pending'
            });

            // Update the opponent's node with the clashId so their listener picks it up.
            await update(ref(rtdb, `matchmaking/${topicId}/${opponentId}`), { clashId: clashDocRef.id });
            
            // Clean up my own queue entry if I was waiting before finding someone
            remove(ref(rtdb, `matchmaking/${topicId}/${currentUser.uid}`));


            toast({ title: "Match Found!", description: "Let's go!" });
            router.push(`/clash/${clashDocRef.id}`);

          } catch(e) {
            console.error("Failed to create match:", e);
            toast({title: "Failed to Create Match", description: "Could not create a match. Please try again.", variant: 'destructive'});
            router.push('/lobby');
          }

        } else {
          // --- I AM THE WAITER ---
          setStatusText('Waiting for an opponent...');
          const myRef = ref(rtdb, `matchmaking/${topicId}/${currentUser.uid}`);
          myQueueRef.current = myRef;
          
          const myData = {
            userName: currentUser.displayName,
            userAvatar: currentUser.photoURL,
          };

          onDisconnect(myRef).remove();
          await set(myRef, myData);
          
          onValue(myRef, (snap) => {
            if (matchmakingActive.current) return;
            const data = snap.val();
            if (data && data.clashId) {
              matchmakingActive.current = true;
              toast({ title: "Match Found!", description: "Let's go!" });
              router.push(`/clash/${data.clashId}`);
              // Cleanup will happen in unmount
            }
          });
        }
      } catch (error) {
        console.error("Matchmaking failed", error);
        toast({ title: "Matchmaking Error", description: "An unexpected error occurred. Please try again.", variant: 'destructive' });
        router.push('/lobby');
      }
    };
    
    // Per user request, 'arrays' topic uses a bot. Others use real-time matching.
    if (topicId === 'arrays') {
      matchmakingActive.current = true;
      createDummyMatch();
    } else {
      startRealtimeMatchmaking();
    }

    return () => {
      cleanup();
    };

  }, [currentUser, router, searchParams, toast, db, rtdb]);

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

            <Button variant="outline" onClick={handleCancel}>Cancel Search</Button>
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
