
'use client';

import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { CameraOff, Loader2 } from 'lucide-react';

export function UserVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const [permissionState, setPermissionState] = useState<'loading' | 'granted' | 'denied' | 'unsupported'>('loading');

  useEffect(() => {
    let stream: MediaStream | null = null;
    
    const getCamera = async () => {
      try {
        // Check if we're in a secure context (HTTPS or localhost)
        if (!window.isSecureContext) {
          console.error("Camera API requires a secure context (HTTPS or localhost).");
          setPermissionState('unsupported');
          return;
        }
        
        // Check if navigator.mediaDevices exists before trying to access it
        if (!navigator.mediaDevices) {
          console.error("Camera API not supported by this browser.");
          setPermissionState('unsupported');
          // Don't show toast for unsupported browsers to avoid disrupting the user experience
          return;
        }
        
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setPermissionState('granted');
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Error accessing camera:", err);
          setPermissionState('denied');
          toast({
            variant: "destructive",
            title: "Camera Access Denied",
            description: "Please enable camera permissions in your browser settings to use this feature.",
          });
        }
      } catch (error) {
        // Catch any unexpected errors during camera initialization
        console.error("Unexpected error during camera initialization:", error);
        setPermissionState('unsupported');
      }
    };

    getCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
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
      />
      {permissionState === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-muted-foreground p-2 bg-background/50">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-xs">Starting camera...</p>
        </div>
      )}
      {(permissionState === 'denied' || permissionState === 'unsupported') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-muted-foreground p-2 bg-background/50">
          <CameraOff className="h-8 w-8 mx-auto mb-2" />
          <p className="text-xs">
            {permissionState === 'denied' 
              ? 'Camera is off or permission denied' 
              : 'Camera not supported in this browser'}
          </p>
        </div>
      )}
      <div className="absolute bottom-1 left-2 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded">You</div>
    </div>
  );
}
