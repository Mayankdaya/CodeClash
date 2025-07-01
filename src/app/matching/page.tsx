
'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';
import AuthGuard from '@/components/AuthGuard';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { generateProblem } from '@/ai/flows/generateProblemFlow';
import { UserVideo } from '@/components/UserVideo';

export default function MatchingPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [statusText, setStatusText] = useState('Preparing your challenge...');
  
  const isCreatingClash = useRef(false);
  
  useEffect(() => {
    if (isCreatingClash.current) return;
    isCreatingClash.current = true;

    const createMatch = async () => {
      const currentUser = auth?.currentUser;
      const topicId = searchParams.get('topic');
      const topicName = topicId?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

      if (!db || !currentUser || !topicId || !topicName) {
        if(!topicId) {
            toast({ title: "No Topic Selected", description: "Please select a topic from the lobby.", variant: "destructive" });
            router.push('/lobby');
        }
        return;
      }

      try {
        setStatusText('Generating a unique problem with AI...');

        const problem = await generateProblem({ topic: topicName, seed: Date.now().toString() });
        
        if (!problem || !problem.testCases) {
          toast({
            title: "Problem Generation Failed",
            description: "Sorry, we couldn't generate a problem right now. Please try again.",
            variant: "destructive",
          });
          router.push('/lobby');
          return;
        }

        // Filter out any test cases where 'expected' is missing. This is a safeguard against faulty AI output.
        const validTestCases = problem.testCases.filter(tc => tc.expected !== undefined);

        if (validTestCases.length < 3) { // Ensure we have a minimum number of valid test cases.
            toast({
                title: "Problem Generation Failed",
                description: "The AI generated a problem with insufficient valid test cases. Please try again.",
                variant: "destructive",
            });
            router.push('/lobby');
            return;
        }
        
        // Stringify test case inputs/outputs for Firestore.
        const problemWithStrTestCases = {
            ...problem,
            testCases: validTestCases.map(tc => ({
                input: JSON.stringify(tc.input),
                expected: JSON.stringify(tc.expected), // We've already filtered for undefined, so no `?? null` needed.
            })),
        };
        
        // Firestore doesn't like undefined values. Sanitize the entire problem object
        // by converting it to a JSON string and back.
        const sanitizedProblem = JSON.parse(JSON.stringify(problemWithStrTestCases));
        
        setStatusText('Match found! Preparing your arena...');

        const clashesRef = collection(db, 'clashes');
        const newClashDoc = await addDoc(clashesRef, {
          topicId,
          problem: sanitizedProblem,
          participants: [
            { userId: currentUser.uid, userName: currentUser.displayName || 'Anonymous', userAvatar: currentUser.photoURL || `https://placehold.co/100x100.png` },
            { userId: 'bot-123', userName: 'CodeBot', userAvatar: `https://placehold.co/100x100.png` }
          ],
          createdAt: serverTimestamp(),
          status: 'active'
        });

        toast({ title: "Match Found!", description: "Redirecting you to the clash..." });
        router.push(`/clash/${newClashDoc.id}`);

      } catch (error: any) {
        console.error("Error creating match:", error);
        toast({
          title: "Matchmaking Error",
          description: "Could not create a match. Please try again. " + (error.message || ''),
          variant: "destructive"
        });
        isCreatingClash.current = false;
        router.push('/lobby');
      }
    };

    createMatch();

  }, [searchParams, router, toast]);

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-dvh bg-transparent text-foreground font-body">
        <Header />
        <main className="flex-1 container mx-auto py-8 px-4 flex flex-col items-center justify-center">
          <Card className="bg-card/50 backdrop-blur-lg border border-white/10 rounded-2xl shadow-lg w-full max-w-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl">Finding Your Opponent</CardTitle>
              <CardDescription>Please wait while we prepare your challenge.</CardDescription>
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
    </AuthGuard>
  );
}
