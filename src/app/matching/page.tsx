
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import AuthGuard from '@/components/AuthGuard';
import { CameraOff, Loader2, SkipForward, Swords } from 'lucide-react';

const opponents = [
  { name: 'CodeWizard', rank: 'Diamond', avatar: 'https://placehold.co/600x400.png', hint: 'man coding' },
  { name: 'SyntaxSorceress', rank: 'Platinum', avatar: 'https://placehold.co/600x400.png', hint: 'woman programming' },
  { name: 'LogicLancer', rank: 'Gold', avatar: 'https://placehold.co/600x400.png', hint: 'person thinking' },
  { name: 'BugBasher', rank: 'Silver', avatar: 'https://placehold.co/600x400.png', hint: 'developer concentrating' },
];

export default function MatchingPage() {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [opponent, setOpponent] = useState(opponents[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [clashId, setClashId] = useState(() => `challenge-${Math.random().toString(36).substring(7)}`);

  useEffect(() => {
    const getCameraPermission = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('Camera API is not available in this browser.');
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
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
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
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    }
  }, [toast]);

  const handleSkip = () => {
    setIsLoading(true);
    setTimeout(() => {
      const currentIndex = opponents.findIndex(o => o.name === opponent.name);
      const nextIndex = (currentIndex + 1) % opponents.length;
      setOpponent(opponents[nextIndex]);
      setClashId(`challenge-${Math.random().toString(36).substring(7)}`);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-dvh bg-transparent text-foreground font-body">
        <Header />
        <main className="flex-1 container mx-auto py-8 px-4 flex flex-col items-center justify-center">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Find Your Opponent</h1>
            <p className="mt-4 text-lg text-muted-foreground">Get ready to clash with another coder!</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl">
            {/* Your Camera */}
            <Card className="bg-card/50 backdrop-blur-lg border border-white/10 rounded-2xl shadow-lg">
              <CardHeader>
                <CardTitle>Your Camera</CardTitle>
                <CardDescription>This is how your opponent will see you.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video w-full bg-muted/30 rounded-lg flex items-center justify-center overflow-hidden">
                  <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                  {hasCameraPermission === false && (
                    <div className="text-center text-muted-foreground p-4">
                      <CameraOff className="h-12 w-12 mx-auto mb-2" />
                      <p>Camera access is disabled.</p>
                    </div>
                  )}
                </div>
                 {hasCameraPermission === false && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertTitle>Camera Access Required</AlertTitle>
                      <AlertDescription>
                        Please allow camera access in your browser settings to use this feature.
                      </AlertDescription>
                    </Alert>
                )}
              </CardContent>
            </Card>

            {/* Opponent Camera */}
            <Card className="bg-card/50 backdrop-blur-lg border border-white/10 rounded-2xl shadow-lg">
              <CardHeader>
                <CardTitle>Opponent Found</CardTitle>
                <CardDescription>Ready to accept the challenge?</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video w-full bg-muted/30 rounded-lg flex items-center justify-center overflow-hidden">
                  {isLoading ? (
                    <Skeleton className="w-full h-full" />
                  ) : (
                    <Image src={opponent.avatar} alt="Opponent" width={600} height={400} className="w-full h-full object-cover" data-ai-hint={opponent.hint} />
                  )}
                </div>
                <div className="flex items-center justify-between mt-4">
                  {isLoading ? (
                     <Skeleton className="h-6 w-3/4" />
                  ) : (
                    <>
                      <p className="text-xl font-bold">{opponent.name}</p>
                      <Badge variant="secondary" className="text-base">{opponent.rank}</Badge>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-4 mt-8">
            <Button variant="outline" size="lg" className="text-lg px-8 py-6 w-48 backdrop-blur-md" onClick={handleSkip} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <>
                  <SkipForward className="mr-2 h-5 w-5" /> Skip
                </>
              )}
            </Button>
            <Button asChild size="lg" className="text-lg px-8 py-6 w-48 bg-green-600 hover:bg-green-700 text-white" disabled={isLoading}>
              <Link href={`/clash/${clashId}`}>
                <Swords className="mr-2 h-5 w-5" /> Battle
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    </AuthGuard>
  );
}
