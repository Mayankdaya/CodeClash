'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { rtdb } from '@/lib/firebase';
import { ref, onValue, remove, get, update } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Zap } from 'lucide-react';

interface Invitation {
  id: string;
  clashId: string;
  from: {
    uid: string;
    displayName: string | null;
    photoURL: string | null;
  };
  topic: string;
  topicName: string;
  sentAt: number;
  status: 'pending' | 'accepted' | 'declined';
}

export default function InvitationNotifier() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [currentInvitation, setCurrentInvitation] = useState<Invitation | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!user || !rtdb) return;

    const invitationsRef = ref(rtdb, `invitations/${user.uid}`);
    
    const unsubscribe = onValue(invitationsRef, (snapshot) => {
      if (!snapshot.exists()) {
        setInvitations([]);
        return;
      }

      const invitationsData = snapshot.val();
      const invitationsList: Invitation[] = [];

      for (const id in invitationsData) {
        const invitation = invitationsData[id];
        if (invitation.status === 'pending') {
          invitationsList.push({
            id,
            ...invitation,
            sentAt: invitation.sentAt || Date.now(),
          });
        }
      }

      // Sort by most recent first
      invitationsList.sort((a, b) => b.sentAt - a.sentAt);
      
      setInvitations(invitationsList);
      
      // Show the most recent invitation if we don't have one showing already
      if (invitationsList.length > 0 && !currentInvitation) {
        setCurrentInvitation(invitationsList[0]);
      }
    });

    return () => unsubscribe();
  }, [user, currentInvitation]);

  const handleAccept = async () => {
    if (!currentInvitation || !user || !rtdb) return;
    
    setIsAccepting(true);
    
    try {
      // Check if the clash still exists
      const clashRef = ref(rtdb, `clashes/${currentInvitation.clashId}`);
      const clashSnapshot = await get(clashRef);
      
      if (!clashSnapshot.exists()) {
        toast({
          title: "Match no longer available",
          description: "The match you were invited to no longer exists.",
          variant: "destructive",
        });
        await remove(ref(rtdb, `invitations/${user.uid}/${currentInvitation.id}`));
        setCurrentInvitation(null);
        setIsAccepting(false);
        return;
      }
      
      // Update invitation status
      await update(ref(rtdb, `invitations/${user.uid}/${currentInvitation.id}`), {
        status: 'accepted'
      });
      
      // Update participant status in clash
      await update(ref(rtdb, `clashes/${currentInvitation.clashId}/participants/${user.uid}`), {
        ready: true,
        joinedAt: Date.now()
      });
      
      // Navigate to the clash
      router.push(`/clash/${currentInvitation.clashId}`);
      
      toast({
        title: "Invitation Accepted",
        description: `Joining match with ${currentInvitation.from.displayName || 'opponent'}`,
      });
      
    } catch (error) {
      console.error("Error accepting invitation:", error);
      toast({
        title: "Failed to Accept",
        description: "There was an error accepting the invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!currentInvitation || !user || !rtdb) return;
    
    try {
      // Update invitation status
      await update(ref(rtdb, `invitations/${user.uid}/${currentInvitation.id}`), {
        status: 'declined'
      });
      
      // Remove the current invitation
      setCurrentInvitation(null);
      
      toast({
        title: "Invitation Declined",
        description: "You declined the match invitation",
      });
      
    } catch (error) {
      console.error("Error declining invitation:", error);
    }
  };

  // If no invitation to show, return null
  if (!currentInvitation) return null;

  return (
    <AlertDialog open={!!currentInvitation} onOpenChange={() => {}}>
      <AlertDialogContent className="bg-card/90 backdrop-blur-xl border-white/10">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Match Invitation
          </AlertDialogTitle>
          <div className="flex items-center gap-3 mt-2">
            <Avatar>
              <AvatarImage src={currentInvitation.from.photoURL || undefined} />
              <AvatarFallback>{(currentInvitation.from.displayName || "User")[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{currentInvitation.from.displayName || "User"}</p>
              <p className="text-sm text-muted-foreground">wants to challenge you</p>
            </div>
          </div>
          <AlertDialogDescription className="pt-4">
            <div className="bg-muted/30 p-3 rounded-lg text-center">
              <p className="text-sm font-medium">Topic</p>
              <p className="text-lg font-bold">{currentInvitation.topicName}</p>
              <p className="text-xs text-muted-foreground mt-1">20 min challenge</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDecline}>
            Decline
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleAccept}
            disabled={isAccepting}
            className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
          >
            {isAccepting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Accept Challenge
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 