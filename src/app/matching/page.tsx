
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
import { generateProblem, type Problem } from '@/ai/flows/generateProblemFlow';
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
    
    // Real-time matchmaking only - bot matching functionality removed
    
    const startRealtimeMatchmaking = async () => {
      const queueRef = ref(rtdb, `matchmaking/${topicId}`);
      try {
        const snapshot = await get(queueRef);
        if (matchmakingActive.current) return;
    
        // Simplified opponent filtering logic - only filter by user ID
        const opponents = snapshot.exists()
          ? Object.entries(snapshot.val())
              .filter(([uid]) => uid !== currentUser.uid)
              // Sort by timestamp if available
              .sort((a, b) => {
                const aData = a[1] as any;
                const bData = b[1] as any;
                return (aData.timestamp || 0) - (bData.timestamp || 0);
              })
          : [];
    
        console.log('Queue snapshot:', snapshot.val());
        console.log('Current user ID:', currentUser.uid);
        console.log('Found opponents:', opponents.length);
        if (opponents.length > 0) {
          console.log('First opponent data:', opponents[0][1]);
        }
    
        if (opponents.length > 0) {
          // --- I AM THE MATCHER ---
          matchmakingActive.current = true;
          const [opponentId, opponentData] = opponents[0];
    
          const createMatchWithRetry = async (retryCount = 0) => {
            if (retryCount > 0) {
              setStatusText(`Problem generation is taking a while. Retrying... (${retryCount}/3)`);
            } else {
              setStatusText('Opponent found! Generating challenge...');
            }
    
            if (retryCount > 3) {
              toast({ title: "Failed to Create Match", description: "The AI model seems to be unavailable right now. Please try again later.", variant: "destructive" });
              // Clean up opponent's queue entry so they don't get stuck waiting
              remove(ref(rtdb, `matchmaking/${topicId}/${opponentId}`));
              router.push('/lobby');
              return;
            }
    
            try {
              const topicName = topicId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              const problem = await generateProblem({ topic: topicName, seed: Date.now().toString() });
    
              if (!problem || !problem.testCases || problem.testCases.some(tc => tc.expected === undefined || tc.expected === null) || problem.testCases.length < 5) {
                console.error("AI returned invalid problem object, retrying...");
                setTimeout(() => createMatchWithRetry(retryCount + 1), 2000);
                return;
              }
              
              // Ensure all participant fields are defined to prevent Firebase errors
              const currentUserName = currentUser.displayName || 'Anonymous';
              const currentUserAvatar = currentUser.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(currentUserName)}`;
              const opponentName = (opponentData as any).userName || 'Anonymous';
              const opponentAvatar = (opponentData as any).userAvatar || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(opponentName)}`;
    
              const clashDocRef = await addDoc(collection(db, 'clashes'), {
                topicId,
                problem: JSON.stringify(problem),
                participants: [
                  { userId: currentUser.uid, userName: currentUserName, userAvatar: currentUserAvatar, score: 0, solvedTimestamp: null, ready: false },
                  { userId: opponentId, userName: opponentName, userAvatar: opponentAvatar, score: 0, solvedTimestamp: null, ready: false }
                ],
                createdAt: firestoreServerTimestamp(),
                status: 'pending'
              });
    
              await update(ref(rtdb, `matchmaking/${topicId}/${opponentId}`), { clashId: clashDocRef.id });
              remove(ref(rtdb, `matchmaking/${topicId}/${currentUser.uid}`));
    
              toast({ title: "Match Found!", description: "Let's go!" });
              router.push(`/clash/${clashDocRef.id}`);
    
            } catch (error: any) {
              console.error(`Failed to create match (attempt ${retryCount + 1}):`, error);
              if (error instanceof FirebaseError && error.code === 'permission-denied') {
                  router.push('/setup-error');
              } else {
                  setTimeout(() => createMatchWithRetry(retryCount + 1), 2000);
              }
            }
          };
    
          createMatchWithRetry();
    
        } else {
          // --- I AM THE WAITER ---
          setStatusText('Waiting for an opponent...');
          const myRef = ref(rtdb, `matchmaking/${topicId}/${currentUser.uid}`);
          myQueueRef.current = myRef;
    
          const myData = {
            userName: currentUser.displayName,
            userAvatar: currentUser.photoURL,
            timestamp: Date.now(),  // Add timestamp for sorting
          };
    
          console.log('Adding myself to queue with data:', myData);
          onDisconnect(myRef).remove();
          await set(myRef, myData);
    
          // Set a timeout to notify the user if no opponents are found after 60 seconds
          const timeoutId = setTimeout(() => {
            if (!matchmakingActive.current) {
              setStatusText('Still waiting for an opponent... You can continue waiting or try again later.');
              toast({
                title: "No opponents found yet",
                description: "You can continue waiting or cancel to try again later.",
                variant: "default"
              });
            }
          }, 60000); // 60 seconds
    
          onValue(myRef, (snap) => {
            if (matchmakingActive.current) return;
            const data = snap.val();
            console.log('My queue entry updated:', data);
            if (data && data.clashId) {
              matchmakingActive.current = true;
              clearTimeout(timeoutId); // Clear the timeout if matched
              toast({ title: "Match Found!", description: "Let's go!" });
              router.push(`/clash/${data.clashId}`);
            }
          });
        }
      } catch (error) {
        console.error("Matchmaking failed", error);
        toast({ title: "Matchmaking Error", description: "An unexpected error occurred. Please try again.", variant: 'destructive' });
        router.push('/lobby');
      }
    };
    
    // All topics now use real-time matching
    startRealtimeMatchmaking();

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

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
              <Button variant="outline" onClick={handleCancel}>Cancel Search</Button>
              {/* Bot practice button removed as per user request */}
            </div>
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
