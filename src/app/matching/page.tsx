
'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import AuthGuard from '@/components/AuthGuard';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CameraOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { problemsByTopic } from '@/lib/problems';

export default function MatchingPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [statusText, setStatusText] = useState('Searching for a clash...');
  
  const isCreatingClash = useRef(false);

  useEffect(() => {
    const getCameraPermission = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Unsupported Browser',
          description: 'Your browser does not support video features.',
        });
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (error) {
        setHasCameraPermission(false);
      }
    };
    getCameraPermission();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [toast]);
  
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

      const topicProblems = problemsByTopic[topicId];
      if (!topicProblems || topicProblems.length === 0) {
        toast({
          title: "No Problems Available",
          description: `Sorry, there are no problems for the topic "${topicName}" yet.`,
          variant: "destructive"
        });
        router.push('/lobby');
        return;
      }

      try {
        setStatusText('Finding an opponent...');

        // Select a random problem from the static problem bank
        const problem = topicProblems[Math.floor(Math.random() * topicProblems.length)];
        
        // Firestore doesn't support nested arrays. Stringify the test case inputs.
        const problemToStore = {
            ...problem,
            testCases: problem.testCases.map(tc => ({
                ...tc,
                input: JSON.stringify(tc.input),
            })),
        };
        
        setStatusText('Match found! Preparing your arena...');

        const clashesRef = collection(db, 'clashes');
        const newClashDoc = await addDoc(clashesRef, {
          topicId,
          problem: problemToStore, // Store the modified problem object
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
          description: "Could not create a match. Please try again.",
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
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                {hasCameraPermission === false && (
                  <div className="text-center text-muted-foreground p-4">
                    <CameraOff className="h-12 w-12 mx-auto mb-2" />
                    <p>Camera access is disabled.</p>
                  </div>
                )}
              </div>
              
              {hasCameraPermission === false && (
                <Alert variant="destructive" className="w-full max-w-md">
                  <AlertTitle>Camera Access Required</AlertTitle>
                  <AlertDescription>
                    Please allow camera access in your browser settings to use this feature.
                  </AlertDescription>
                </Alert>
              )}

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
        <Footer />
      </div>
    </AuthGuard>
  );
}
