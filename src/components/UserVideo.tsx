'use client';

import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CameraOff } from 'lucide-react';

export function UserVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    let stream: MediaStream | null = null;

    const getCameraPermission = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('error');
        toast({
          variant: 'destructive',
          title: 'Unsupported Browser',
          description: 'Your browser does not support video features.',
        });
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStatus('success');
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setStatus('error');
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this feature.',
        });
      }
    };

    getCameraPermission();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [toast]);

  return (
    <div className="relative aspect-video w-full bg-muted/30 rounded-lg flex items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        playsInline
        muted
        style={{ display: status === 'success' ? 'block' : 'none' }}
      />
      
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-muted-foreground p-2 bg-background/80">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-1" />
          <p className="text-xs">Starting camera...</p>
        </div>
      )}
      
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-muted-foreground p-2 bg-background/80">
          <CameraOff className="h-8 w-8 mx-auto mb-1" />
          <p className="text-xs">Your camera is off</p>
        </div>
      )}

      <div className="absolute bottom-1 left-2 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded">You</div>
    </div>
  );
}
