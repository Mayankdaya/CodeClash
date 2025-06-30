
'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { collection, query, where, limit, getDocs, addDoc, doc, onSnapshot, updateDoc, deleteDoc, type Unsubscribe, serverTimestamp } from 'firebase/firestore';
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

export default function MatchingPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  
  const queueDocIdRef = useRef<string | null>(null);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const isMatchedRef = useRef(false);

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
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings.',
        });
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
    const findMatch = async () => {
      const currentUser = auth?.currentUser;
      const topicId = searchParams.get('topic');

      if (!db || !currentUser || !topicId) {
        if(!topicId) {
            toast({ title: "No Topic Selected", description: "Please select a topic from the lobby.", variant: "destructive" });
            router.push('/lobby');
        }
        return;
      }

      const queueRef = collection(db, 'matchmakingQueue');
      
      const q = query(
        queueRef,
        where('topicId', '==', topicId),
        where('status', '==', 'pending'),
        limit(10)
      );

      const querySnapshot = await getDocs(q);
      const opponentQueueDoc = querySnapshot.docs.find(doc => doc.data().userId !== currentUser.uid);

      if (opponentQueueDoc) {
        // Match found
        isMatchedRef.current = true;
        const opponentData = opponentQueueDoc.data();
        
        const clashesRef = collection(db, 'clashes');
        const newClashDoc = await addDoc(clashesRef, {
          topicId,
          participants: [
            { userId: currentUser.uid, userName: currentUser.displayName || 'Anonymous', userAvatar: currentUser.photoURL || '' },
            { userId: opponentData.userId, userName: opponentData.userName || 'Anonymous', userAvatar: opponentData.userAvatar || '' }
          ],
          createdAt: serverTimestamp(),
          status: 'active'
        });

        await updateDoc(doc(db, 'matchmakingQueue', opponentQueueDoc.id), {
          status: 'matched',
          clashId: newClashDoc.id
        });
        
        router.push(`/clash/${newClashDoc.id}`);
      } else {
        // No match, add to queue
        const myQueueDoc = await addDoc(queueRef, {
          userId: currentUser.uid,
          userName: currentUser.displayName || 'Anonymous',
          userAvatar: currentUser.photoURL || '',
          topicId,
          status: 'pending',
          createdAt: serverTimestamp()
        });
        queueDocIdRef.current = myQueueDoc.id;

        unsubscribeRef.current = onSnapshot(doc(db, 'matchmakingQueue', myQueueDoc.id), (docSnap) => {
          if (docSnap.exists() && docSnap.data()?.status === 'matched') {
            isMatchedRef.current = true;
            if(unsubscribeRef.current) unsubscribeRef.current();
            router.push(`/clash/${docSnap.data()?.clashId}`);
          }
        });
      }
    };

    findMatch().catch((error) => {
      console.error("Error finding match:", error);
      toast({
        title: "Matchmaking Error",
        description: "Could not search for an opponent. You may need to create a Firestore index. Check the browser console for a link.",
        variant: "destructive",
        duration: 10000
      });
    });
    
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (queueDocIdRef.current && db && !isMatchedRef.current) {
        const docRef = doc(db, 'matchmakingQueue', queueDocIdRef.current);
        deleteDoc(docRef);
      }
    };

  }, [searchParams, router, toast]);

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-dvh bg-transparent text-foreground font-body">
        <Header />
        <main className="flex-1 container mx-auto py-8 px-4 flex flex-col items-center justify-center">
          <Card className="bg-card/50 backdrop-blur-lg border border-white/10 rounded-2xl shadow-lg w-full max-w-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl">Finding Your Opponent</CardTitle>
              <CardDescription>Please wait while we match you with a worthy adversary.</CardDescription>
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
                <p>Searching for a clash...</p>
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
