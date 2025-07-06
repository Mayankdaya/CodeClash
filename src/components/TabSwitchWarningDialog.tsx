import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface TabSwitchWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tabSwitchWarnings: number;
  maxTabSwitches: number;
}

export function TabSwitchWarningDialog({
  open,
  onOpenChange,
  tabSwitchWarnings,
  maxTabSwitches
}: TabSwitchWarningDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [countdown, setCountdown] = useState(3);
  const isViolation = tabSwitchWarnings >= maxTabSwitches;

  // Handle redirection when max tab switches are exceeded
  useEffect(() => {
    if (isViolation && open) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // Redirect to lobby
            toast({ 
              title: "Violation Detected", 
              description: "You have been redirected to the lobby due to excessive tab switching.", 
              variant: "destructive" 
            });
            router.push('/lobby');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    } else {
      // Reset countdown when dialog is closed or reopened
      setCountdown(3);
    }
  }, [isViolation, open, router, toast]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[500px]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-destructive/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-destructive/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-destructive">
                  <path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>
                </svg>
              </div>
              <AlertDialogTitle className="text-2xl font-bold text-destructive">
                {isViolation ? 'Tab Switching Violation' : 'Tab Switching Warning'}
              </AlertDialogTitle>
            </div>
            
            {/* Hidden description for screen readers */}
            <div className="sr-only">
              <AlertDialogDescription>
                {isViolation 
                  ? "You have switched tabs too many times and will be redirected to the lobby."
                  : "Warning about tab switching during the coding challenge."
                }
              </AlertDialogDescription>
            </div>
            
            {/* Visual content - completely separate from AlertDialogDescription */}
            <div className="whitespace-pre-wrap bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-4 shadow-md">
              {isViolation ? (
                <div className="text-base text-foreground space-y-2">
                  <div>You have switched tabs or minimized the window <strong className="text-destructive">{tabSwitchWarnings} times</strong>, exceeding the maximum allowed limit of {maxTabSwitches}.</div>
                  <div>This activity has been flagged as a potential violation of the coding challenge rules.</div>
                  <div>You will be redirected to the lobby in <span className="text-destructive font-bold">{countdown}</span> seconds.</div>
                  <div>Any unsaved progress will be lost.</div>
                </div>
              ) : (
                <div className="text-base text-foreground space-y-2">
                  <div>You have switched tabs or minimized the window <strong className="text-destructive">{tabSwitchWarnings} time{tabSwitchWarnings > 1 ? 's' : ''}</strong>.</div>
                  <div>Please remain on this page during the coding challenge.</div>
                  <div>Switching tabs more than {maxTabSwitches} times will result in your submission being flagged and you will be redirected to the lobby.</div>
                </div>
              )}
            </div>
          </AlertDialogHeader>
          
          <div className="mt-6 flex items-center justify-between bg-background/50 backdrop-blur-sm border border-border/50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center",
                isViolation ? "bg-destructive text-destructive-foreground" : "bg-amber-500/20 text-amber-500"
              )}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <div>
                <div className="font-medium">Tab Switches</div>
                <div className="flex items-center gap-1 mt-1">
                  {Array.from({ length: maxTabSwitches }).map((_, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "h-2 w-6 rounded-full", 
                        i < tabSwitchWarnings 
                          ? (i >= maxTabSwitches - 1 ? "bg-destructive" : "bg-amber-500") 
                          : "bg-muted"
                      )}
                    ></div>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-2xl font-bold">
              {tabSwitchWarnings}/{maxTabSwitches}
            </div>
          </div>
          
          {isViolation && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-destructive">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>Your activity has been flagged in the system. Redirecting to lobby in {countdown}...</span>
              </div>
            </div>
          )}
          
          <AlertDialogFooter className="mt-6">
            <AlertDialogAction 
              onClick={() => {
                if (isViolation) {
                  // Immediate redirect for violation
                  router.push('/lobby');
                } else {
                  onOpenChange(false);
                }
              }}
              className={cn(
                "px-8 py-2 shadow-lg transition-all duration-300",
                isViolation 
                  ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" 
                  : "bg-primary hover:bg-primary/90"
              )}
            >
              {isViolation ? `Go to Lobby (${countdown})` : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
} 