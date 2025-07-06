'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp as firestoreServerTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';
import { db, rtdb, isConfigured } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { generateProblem, type Problem } from '@/ai/flows/generateProblemFlow';
import { UserVideo } from '@/components/UserVideo';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/hooks/useAuth';
import { FirebaseError } from 'firebase/app';
import { ref, onValue, set, get, remove, update, onDisconnect, off, serverTimestamp, type DatabaseReference } from 'firebase/database';
import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';


function MatchingContent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser } = useAuth();

  const [statusText, setStatusText] = useState('Initializing...');
  const matchmakingActive = useRef(false);
  const myQueueRef = useRef<DatabaseReference | null>(null);
  const [waitingTime, setWaitingTime] = useState(0);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [matchmakingStatus, setMatchmakingStatus] = useState<'initializing' | 'waiting' | 'found' | 'error'>('initializing');
  const [debugInfo, setDebugInfo] = useState<{queueSize?: number, myEntry?: any, error?: string}>({});
  const [isCreatingTestMatch, setIsCreatingTestMatch] = useState(false);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);
  const [diagnosticsResults, setDiagnosticsResults] = useState<Array<{
    test: string;
    status: 'pass' | 'fail' | 'warning' | 'running';
    message: string;
    details?: string;
  }>>([]);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  const cleanup = () => {
    if (myQueueRef.current) {
        console.log('Cleaning up matchmaking reference:', myQueueRef.current.key);
        onDisconnect(myQueueRef.current).cancel(); // Important: cancel the onDisconnect listener
        off(myQueueRef.current); // Detach listener
        remove(myQueueRef.current).catch(err => console.warn('Failed to remove queue entry:', err));
        myQueueRef.current = null;
    }
  };
  
  const handleCancel = () => {
    cleanup();
    router.push('/lobby');
  };

  // Add a function to check if Firebase is configured correctly
  const checkFirebaseSetup = () => {
    // Basic check if Firebase config is complete
    const hasFirebaseConfig = isConfigured;
    // Check if RTDB URL specifically is set since it's critical for matchmaking
    const hasRTDB = !!process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
    
    return {
      isComplete: hasFirebaseConfig,
      hasRTDB,
    };
  };
  
  const firebaseCheck = checkFirebaseSetup();
  
  useEffect(() => {
    // If Firebase is not configured properly, show a prominent notification
    if (!firebaseCheck.isComplete || !firebaseCheck.hasRTDB) {
      toast({
        title: "Firebase Configuration Issue",
        description: "Your Firebase setup appears to be incomplete. Use the diagnostics tool to troubleshoot.",
        variant: "destructive",
        duration: 10000,
      });
    }
  }, [firebaseCheck, toast]);

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
      const topicId = searchParams.get('topic');
      setMatchmakingStatus('initializing');
      
      if (!topicId) {
        toast({ title: "No Topic Selected", description: "Please select a topic from the lobby.", variant: "destructive" });
        router.push('/lobby');
        return;
      }
      
      try {
        // First check if queue exists and how many users are in it
        const queueRef = ref(rtdb, `matchmaking/${topicId}`);
        const snapshot = await get(queueRef);
        if (matchmakingActive.current) return;

        const queueData = snapshot.val() || {};
        const queueSize = Object.keys(queueData).length;
        setDebugInfo(prev => ({ ...prev, queueSize }));
        
        console.log(`Queue for ${topicId} has ${queueSize} users`);
        
        // Check if we were already in the queue (e.g., after a refresh)
        if (queueData[currentUser.uid]) {
          console.log('Found myself in the queue already, removing old entry');
          await remove(ref(rtdb, `matchmaking/${topicId}/${currentUser.uid}`));
        }

        // Find potential opponents who are actively waiting in this topic
        const opponents = snapshot.exists()
          ? Object.entries(queueData)
              .filter(([uid, userData]) => {
                // Filter out myself and test users
                if (uid === currentUser.uid || uid.startsWith('test_')) return false;
                
                // Check if the user has a clashId (already matched)
                const userData_typed = userData as any;
                if (userData_typed.clashId) return false;
                
                // Check if the user's timestamp is recent (within last 2 minutes)
                const timestamp = userData_typed.timestamp;
                if (timestamp) {
                  const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
                  return timestamp > twoMinutesAgo;
                }
                
                return true;
              })
              // Sort by timestamp (oldest first) to ensure fair matching
              .sort((a, b) => {
                const aData = a[1] as any;
                const bData = b[1] as any;
                return (aData.timestamp || 0) - (bData.timestamp || 0);
              })
          : [];

        if (opponents.length > 0) {
          // --- I AM THE MATCHER ---
          matchmakingActive.current = true;
          setMatchmakingStatus('found');
          const [opponentId, opponentData] = opponents[0];

          // Remove the opponent from the queue immediately to prevent others from matching with them
          await remove(ref(rtdb, `matchmaking/${topicId}/${opponentId}`));

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
              const currentUserName = currentUser.displayName || `User_${currentUser.uid.substring(0, 6)}`;
              const currentUserAvatar = currentUser.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(currentUserName)}`;
              
              const opponentData_typed = opponentData as any;
              const opponentName = opponentData_typed.userName || `User_${opponentId.substring(0, 6)}`;
              const opponentAvatar = opponentData_typed.userAvatar || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(opponentName)}`;

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

              // Notify the opponent and redirect them
              await update(ref(rtdb, `matchmaking/${topicId}/${opponentId}`), { clashId: clashDocRef.id });
              
              // Clean up my own queue entry if it exists
              if (myQueueRef.current) {
                remove(myQueueRef.current);
                myQueueRef.current = null;
              }

              // Update user statuses in the online status database
              const myStatusRef = ref(rtdb, `status/${currentUser.uid}`);
              await update(myStatusRef, { status: 'in-match' });
              
              const opponentStatusRef = ref(rtdb, `status/${opponentId}`);
              await update(opponentStatusRef, { status: 'in-match' });

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
          setMatchmakingStatus('waiting');
          
          // Start timer for waiting
          const waitingStartTime = Date.now();
          const timerInterval = setInterval(() => {
            const secondsWaiting = Math.floor((Date.now() - waitingStartTime) / 1000);
            setWaitingTime(secondsWaiting);
            
            // After waiting 3 minutes, suggest refreshing
            if (secondsWaiting >= 180 && secondsWaiting % 30 === 0) { // Every 30 seconds after 3 minutes
              toast({
                title: "Still waiting...",
                description: "You might want to try refreshing or choosing a different topic.",
                variant: "default"
              });
            }
          }, 1000);
          
          const myRef = ref(rtdb, `matchmaking/${topicId}/${currentUser.uid}`);
          myQueueRef.current = myRef;

          const myData = {
            userName: currentUser.displayName || `User_${currentUser.uid.substring(0, 6)}`,
            userAvatar: currentUser.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(currentUser.displayName || currentUser.uid)}`,
            timestamp: Date.now(),  // Add timestamp for sorting
            topicId: topicId, // Explicitly store the topic ID to make matching more reliable
          };

          console.log('Adding myself to queue with data:', myData);
          setDebugInfo(prev => ({ ...prev, myEntry: myData }));
          
          // Set up removal on disconnect
          onDisconnect(myRef).remove();
          
          // Add myself to the queue
          await set(myRef, myData);

          // Update my status in the online status database
          const myStatusRef = ref(rtdb, `status/${currentUser.uid}`);
          await update(myStatusRef, { status: 'waiting' });

          // Set a timeout to notify the user if no opponents are found
          const notificationTimeouts = [
            setTimeout(() => {
              if (!matchmakingActive.current) {
                setStatusText('Still waiting for an opponent...');
                toast({
                  title: "No opponents found yet",
                  description: "You can continue waiting or cancel to try again later.",
                  variant: "default"
                });
              }
            }, 60000), // 60 seconds
            
            setTimeout(() => {
              if (!matchmakingActive.current) {
                setStatusText('Waiting is taking longer than expected. You may want to try a different topic.');
                toast({
                  title: "Long wait time",
                  description: "Consider trying a different topic or time of day when more users are active.",
                  variant: "default"
                });
              }
            }, 180000) // 3 minutes
          ];

          // Check queue size periodically to ensure our entry is still there
          const queueCheckInterval = setInterval(async () => {
            try {
              const latestSnapshot = await get(queueRef);
              const latestData = latestSnapshot.val() || {};
              const latestSize = Object.keys(latestData).length;
              setDebugInfo(prev => ({ ...prev, queueSize: latestSize }));
              
              // Check if I'm still in the queue
              if (!latestData[currentUser.uid] && !matchmakingActive.current) {
                console.log("My entry disappeared from queue! Re-adding myself");
                await set(myRef, { ...myData, timestamp: Date.now() });
                
                toast({
                  title: "Connection restored",
                  description: "Your matchmaking entry was restored after a connection issue.",
                  variant: "default"
                });
              }
              
              // Check if there are any new opponents to match with
              const newOpponents = Object.entries(latestData)
                .filter(([uid, userData]) => {
                  // Filter out myself and test users
                  if (uid === currentUser.uid || uid.startsWith('test_')) return false;
                  
                  // Check if the user has a clashId (already matched)
                  const userData_typed = userData as any;
                  if (userData_typed.clashId) return false;
                  
                  // Check if the user's timestamp is recent (within last 2 minutes)
                  const timestamp = userData_typed.timestamp;
                  if (timestamp) {
                    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
                    return timestamp > twoMinutesAgo;
                  }
                  
                  return true;
                })
                .sort((a, b) => {
                  const aData = a[1] as any;
                  const bData = b[1] as any;
                  return (aData.timestamp || 0) - (bData.timestamp || 0);
                });
              
              // If there are new opponents and I'm the oldest in the queue (or second oldest),
              // initiate the match creation process
              if (newOpponents.length > 0) {
                const myTimestamp = myData.timestamp;
                const oldestOpponentTimestamp = (newOpponents[0][1] as any).timestamp || 0;
                
                // If I've been waiting longer than the oldest opponent, I should create the match
                if (myTimestamp < oldestOpponentTimestamp) {
                  console.log("I've been waiting longer than the oldest opponent, initiating match creation");
                  cleanup(); // Clean up my queue entry and listeners
                  
                  // Re-run the matchmaking process to create the match
                  startRealtimeMatchmaking();
                }
              }
            } catch (e) {
              console.warn("Failed to check queue status:", e);
            }
          }, 10000); // Every 10 seconds
          
          // Listen for match notification
          onValue(myRef, (snap) => {
            if (matchmakingActive.current) return;
            
            const data = snap.val();
            console.log('My queue entry updated:', data);
            setDebugInfo(prev => ({ ...prev, myEntry: data }));
            
            if (data && data.clashId) {
              matchmakingActive.current = true;
              setMatchmakingStatus('found');
              
              // Clean up timers and listeners
              clearInterval(timerInterval);
              clearInterval(queueCheckInterval);
              notificationTimeouts.forEach(clearTimeout);
              
              // Update my status
              const myStatusRef = ref(rtdb, `status/${currentUser.uid}`);
              update(myStatusRef, { status: 'in-match' });
              
              toast({ title: "Match Found!", description: "Let's go!" });
              router.push(`/clash/${data.clashId}`);
            }
          });

          // Clean up function for component unmount
          return () => {
            clearInterval(timerInterval);
            clearInterval(queueCheckInterval);
            notificationTimeouts.forEach(clearTimeout);
            
            // Reset my status when leaving matchmaking
            const myStatusRef = ref(rtdb, `status/${currentUser.uid}`);
            update(myStatusRef, { status: 'available' });
          };
        }
      } catch (error) {
        console.error("Matchmaking failed", error);
        setMatchmakingStatus('error');
        setDebugInfo(prev => ({ ...prev, error: String(error) }));
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

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Add a function to create a test match with a simulated opponent
  const createTestMatch = async () => {
    if (!currentUser || !rtdb || !db) {
      toast({
        title: "Error",
        description: "You must be logged in and Firebase must be configured to create a test match.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingTestMatch(true);

    try {
      const topicId = searchParams.get('topic');
      if (!topicId) {
        throw new Error("No topic selected");
      }

      // Generate a unique ID for the test opponent
      const testOpponentId = `test_${Date.now()}`;
      
      // Create a clash document
      const topicName = topicId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const problem = await generateProblem({ topic: topicName, seed: Date.now().toString() });

      if (!problem || !problem.testCases || problem.testCases.length < 5) {
        throw new Error("Failed to generate a valid problem");
      }

      // Create the clash with both participants
      const clashesRef = collection(db, 'clashes');
      const clashDocRef = await addDoc(clashesRef, {
        topicId,
        problem: JSON.stringify(problem),
        participants: [
          { 
            userId: currentUser.uid, 
            userName: currentUser.displayName || 'You', 
            userAvatar: currentUser.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(currentUser.displayName || 'You')}`, 
            score: 0, 
            solvedTimestamp: null, 
            ready: false 
          },
          { 
            userId: testOpponentId, 
            userName: 'Test Opponent', 
            userAvatar: `https://api.dicebear.com/8.x/bottts/svg?seed=${testOpponentId}`, 
            score: 0, 
            solvedTimestamp: null, 
            ready: false,
            isTestUser: true
          }
        ],
        createdAt: firestoreServerTimestamp(),
        status: 'pending',
        isTestMatch: true
      });

      // Also create an entry in the realtime database for the clash
      await set(ref(rtdb, `clashes/${clashDocRef.id}`), {
        createdAt: serverTimestamp(),
        status: 'waiting',
        topic: topicId,
        createdBy: currentUser.uid,
        participants: {
          [currentUser.uid]: {
            uid: currentUser.uid,
            displayName: currentUser.displayName || 'You',
            photoURL: currentUser.photoURL,
            ready: true,
            joinedAt: serverTimestamp()
          },
          [testOpponentId]: {
            uid: testOpponentId,
            displayName: 'Test Opponent',
            photoURL: `https://api.dicebear.com/8.x/bottts/svg?seed=${testOpponentId}`,
            ready: false,
            joinedAt: null,
            isTestUser: true
          }
        },
        isTestMatch: true
      });

      // Clean up any queue entries
      if (myQueueRef.current) {
        remove(myQueueRef.current);
        myQueueRef.current = null;
      }

      toast({ title: "Test Match Created", description: "Starting test match with simulated opponent" });
      router.push(`/clash/${clashDocRef.id}`);
    } catch (error) {
      console.error("Failed to create test match:", error);
      toast({
        title: "Failed to Create Test Match",
        description: "There was an error creating the test match. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingTestMatch(false);
    }
  };

  // Add a function to diagnose Firebase and matchmaking issues
  const runDiagnostics = async () => {
    if (runningDiagnostics) return;
    setRunningDiagnostics(true);
    
    const updateResults = (index: number, result: { 
      status: 'pass' | 'fail' | 'warning' | 'running';
      message: string;
      details?: string;
    }) => {
      setDiagnosticsResults(prev => {
        const newResults = [...prev];
        newResults[index] = { ...newResults[index], ...result };
        return newResults;
      });
    };

    // Reset diagnostics results
    setDiagnosticsResults([
      { test: "Firebase Configuration", status: "running", message: "Checking Firebase configuration..." },
      { test: "Authentication", status: "running", message: "Checking authentication status..." },
      { test: "Firestore Database", status: "running", message: "Testing Firestore connection..." },
      { test: "Realtime Database", status: "running", message: "Testing Realtime Database connection..." },
      { test: "Matchmaking Queue", status: "running", message: "Testing matchmaking queue operations..." },
      { test: "Topic Selection", status: "running", message: "Checking topic parameter..." },
    ]);

    // 1. Check Firebase Configuration
    try {
      if (!isConfigured) {
        updateResults(0, { 
          status: 'fail', 
          message: 'Firebase is not properly configured',
          details: 'Missing environment variables. Please check your .env.local file.'
        });
      } else {
        updateResults(0, { status: 'pass', message: 'Firebase configuration found' });
      }
    } catch (error) {
      updateResults(0, { 
        status: 'fail', 
        message: 'Error checking Firebase configuration',
        details: String(error)
      });
    }

    // 2. Check Authentication
    try {
      if (!currentUser) {
        updateResults(1, { 
          status: 'fail', 
          message: 'User is not authenticated',
          details: 'You need to be logged in to use matchmaking'
        });
      } else {
        updateResults(1, { 
          status: 'pass', 
          message: `Authenticated as ${currentUser.displayName || currentUser.email || currentUser.uid}` 
        });
      }
    } catch (error) {
      updateResults(1, { 
        status: 'fail', 
        message: 'Error checking authentication',
        details: String(error)
      });
    }

    // 3. Check Firestore Database
    try {
      if (!db) {
        updateResults(2, { 
          status: 'fail', 
          message: 'Firestore not initialized',
          details: 'Check your Firebase configuration'
        });
      } else {
        // Try a simple read operation
        try {
          const testDocRef = doc(db, 'test_connection', 'test');
          await getDoc(testDocRef);
          updateResults(2, { status: 'pass', message: 'Firestore connection successful' });
        } catch (error: any) {
          if (error.code === 'permission-denied') {
            updateResults(2, { 
              status: 'warning', 
              message: 'Firestore permission denied',
              details: 'Your security rules may be too restrictive. This is normal for non-existent test documents.'
            });
          } else {
            updateResults(2, { 
              status: 'fail', 
              message: `Firestore error: ${error.code || 'unknown'}`,
              details: error.message
            });
          }
        }
      }
    } catch (error) {
      updateResults(2, { 
        status: 'fail', 
        message: 'Error testing Firestore',
        details: String(error)
      });
    }

    // 4. Check Realtime Database
    try {
      if (!rtdb) {
        updateResults(3, { 
          status: 'fail', 
          message: 'Realtime Database not initialized',
          details: 'Check if NEXT_PUBLIC_FIREBASE_DATABASE_URL is set in your .env.local file'
        });
      } else {
        // Try a simple read operation
        try {
          const testRef = ref(rtdb, 'test_connection');
          await get(testRef);
          updateResults(3, { status: 'pass', message: 'Realtime Database connection successful' });
        } catch (error: any) {
          if (error.code === 'PERMISSION_DENIED') {
            updateResults(3, { 
              status: 'warning', 
              message: 'Realtime DB permission denied',
              details: 'Your database rules may be too restrictive. Update your rules to allow matchmaking.'
            });
          } else {
            updateResults(3, { 
              status: 'fail', 
              message: `Realtime DB error: ${error.code || 'unknown'}`,
              details: error.message
            });
          }
        }
      }
    } catch (error) {
      updateResults(3, { 
        status: 'fail', 
        message: 'Error testing Realtime Database',
        details: String(error)
      });
    }

    // 5. Check Matchmaking Queue
    try {
      const topicId = searchParams.get('topic');
      
      if (!rtdb || !topicId || !currentUser) {
        updateResults(4, { 
          status: 'fail', 
          message: 'Cannot test matchmaking queue',
          details: 'Missing required dependencies'
        });
      } else {
        // Check if we can read the matchmaking queue
        try {
          const queueRef = ref(rtdb, `matchmaking/${topicId}`);
          const snapshot = await get(queueRef);
          
          // Check if we can write to the queue
          const testEntryRef = ref(rtdb, `matchmaking/${topicId}/test_${Date.now()}`);
          await set(testEntryRef, { test: true, timestamp: Date.now() });
          await remove(testEntryRef);
          
          // Count existing entries
          const queueSize = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
          
          if (queueSize > 0 && queueSize < 100) { // sanity check for queue size
            updateResults(4, { 
              status: 'pass', 
              message: `Queue is working with ${queueSize} user(s) waiting`,
              details: 'Other users are in the queue'
            });
          } else if (queueSize === 0) {
            updateResults(4, { 
              status: 'warning', 
              message: 'Queue is empty',
              details: 'No other users are currently matching for this topic'
            });
          } else {
            updateResults(4, { 
              status: 'warning', 
              message: `Unusual queue size: ${queueSize}`,
              details: 'This may indicate stale entries in the queue'
            });
          }
        } catch (error: any) {
          updateResults(4, { 
            status: 'fail', 
            message: `Matchmaking queue error: ${error.code || 'unknown'}`,
            details: error.message
          });
        }
      }
    } catch (error) {
      updateResults(4, { 
        status: 'fail', 
        message: 'Error testing matchmaking queue',
        details: String(error)
      });
    }

    // 6. Check Topic Selection
    try {
      const topicId = searchParams.get('topic');
      if (!topicId) {
        updateResults(5, { 
          status: 'fail', 
          message: 'No topic selected',
          details: 'You need to select a topic from the lobby'
        });
      } else {
        updateResults(5, { 
          status: 'pass', 
          message: `Topic selected: ${topicId}`
        });
      }
    } catch (error) {
      updateResults(5, { 
        status: 'fail', 
        message: 'Error checking topic',
        details: String(error)
      });
    }

    setRunningDiagnostics(false);
  };

  const showDiagnosticsDialog = diagnosticsResults.length > 0;

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
        {/* Show Firebase setup warning if needed */}
        {(!firebaseCheck.isComplete || !firebaseCheck.hasRTDB) && (
          <div className="w-full max-w-2xl mb-4 rounded-lg border border-red-400 bg-red-100/10 p-4 text-red-400">
            <div className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0">
                <path d="M12 9v4"></path>
                <path d="M12 17.5v.5"></path>
                <path d="M5.5 15h13"></path>
                <path d="M6 20 18 4"></path>
              </svg>
              <div>
                <h4 className="font-bold">Firebase Not Properly Configured</h4>
                <p className="text-sm mt-1">Matchmaking requires proper Firebase setup with Realtime Database.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowSetupGuide(!showSetupGuide)}
                    className="border-red-400 text-red-400 hover:bg-red-400/10"
                  >
                    {showSetupGuide ? "Hide Setup Guide" : "Show Setup Guide"}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={runDiagnostics}
                    className="border-red-400 text-red-400 hover:bg-red-400/10"
                  >
                    Run Diagnostics
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Setup guide collapsible section */}
            {showSetupGuide && (
              <div className="mt-4 pt-4 border-t border-red-400/30 text-sm">
                <h5 className="font-bold mb-2">Quick Firebase Setup Guide:</h5>
                <ol className="list-decimal list-inside space-y-2 pl-1">
                  <li>Create a Firebase project at <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="underline">firebase.google.com</a></li>
                  <li>Register a Web App to get your config</li>
                  <li>Enable Authentication (Email/Password)</li>
                  <li>Create Firestore Database</li>
                  <li>Create Realtime Database (critical for matchmaking)</li>
                  <li>Set security rules for both databases</li>
                  <li>Create <code>.env.local</code> with all Firebase config values</li>
                  <li>Ensure NEXT_PUBLIC_FIREBASE_DATABASE_URL is set to your Realtime DB URL</li>
                  <li>Restart your development server</li>
                </ol>
                <p className="mt-3">
                  See our <Link href="/docs/firebase-setup" className="underline">detailed Firebase setup guide</Link> or 
                  check the <Button variant="link" className="p-0 h-auto underline" onClick={() => router.push('/')}>README</Button> for complete instructions.
                </p>
              </div>
            )}
          </div>
        )}

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
              {matchmakingStatus === 'waiting' ? (
                <div className="relative flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                  <div>
                    <p>{statusText}</p>
                    <p className="text-sm text-muted-foreground">Time elapsed: {formatTime(waitingTime)}</p>
                  </div>
                </div>
              ) : matchmakingStatus === 'found' ? (
                <div className="flex items-center gap-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <p>{statusText}</p>
                </div>
              ) : matchmakingStatus === 'error' ? (
                <div className="flex items-center gap-4 text-red-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                    <path d="M12 9v4"></path>
                    <path d="M12 17h.01"></path>
                  </svg>
                  <p>Error in matchmaking</p>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <p>{statusText}</p>
                </div>
              )}
            </div>
            
            {waitingTime > 120 && (
              <div className="text-sm text-center max-w-md text-amber-300">
                <p>The wait seems longer than usual. You might want to:</p>
                <ul className="list-disc list-inside mt-2 text-left">
                  <li>Try a different topic with more active users</li>
                  <li>Come back at a time when more users are online</li>
                  <li>Use the test mode to practice by yourself</li>
                  <li>
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="text-amber-300 p-0 h-auto font-normal underline"
                      onClick={runDiagnostics}
                      disabled={runningDiagnostics}
                    >
                      Run diagnostics
                    </Button>
                  </li>
                </ul>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
              <Button variant="outline" onClick={handleCancel}>Cancel Search</Button>
              <Button 
                variant="default" 
                onClick={() => {
                  // First clean up existing queue entry
                  cleanup();
                  // Then restart the matchmaking process
                  setWaitingTime(0);
                  matchmakingActive.current = false;
                  // Re-run the effect that does matchmaking
                  const topicId = searchParams.get('topic');
                  if (topicId && rtdb && currentUser) {
                    const queueRef = ref(rtdb, `matchmaking/${topicId}`);
                    setStatusText('Refreshing matchmaking...');
                    setMatchmakingStatus('initializing');
                    // We need to re-run the matchmaking logic from the effect
                    const runMatchmaking = async () => {
                      try {
                        const snapshot = await get(queueRef);
                        // Continue with the same matchmaking logic as in the effect
                        // This is a simplified version that just puts the user back in the queue
                        const myRef = ref(rtdb, `matchmaking/${topicId}/${currentUser.uid}`);
                        myQueueRef.current = myRef;
                        onDisconnect(myRef).remove();
                        await set(myRef, {
                          userName: currentUser.displayName,
                          userAvatar: currentUser.photoURL,
                          timestamp: Date.now()
                        });
                        setStatusText('Waiting for an opponent...');
                        setMatchmakingStatus('waiting');
                      } catch (error) {
                        console.error("Failed to refresh matchmaking:", error);
                        toast({ 
                          title: "Refresh Failed", 
                          description: "Please try going back to the lobby and starting again.", 
                          variant: "destructive" 
                        });
                      }
                    };
                    runMatchmaking();
                  }
                }}
              >
                Refresh Search
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowDebugInfo(!showDebugInfo)}
                size="icon"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M12 12m-10 0a10 10 0 1 0 20 0a10 10 0 1 0 -20 0"></path>
                  <path d="M12 16v-4"></path>
                  <path d="M12 8h.01"></path>
                </svg>
              </Button>
              <Button
                variant={showDebugInfo ? "default" : "outline"}
                onClick={runDiagnostics}
                disabled={runningDiagnostics}
                className="bg-amber-600 hover:bg-amber-700 text-white border-none"
                size="icon"
              >
                {runningDiagnostics ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M19 11V4a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v7"></path>
                    <path d="M3 15a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"></path>
                    <path d="m10 7 4 4"></path>
                    <path d="m14 7-4 4"></path>
                    <path d="M12 22v-2"></path>
                    <path d="M12 18v-2"></path>
                  </svg>
                )}
              </Button>
            </div>
            
            {/* Diagnostic results */}
            {diagnosticsResults.length > 0 && (
              <div className="w-full mt-4 border border-border rounded-md bg-card/50 p-4">
                <h3 className="font-bold text-lg mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2">
                    <path d="M19 11V4a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v7"></path>
                    <path d="M3 15a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"></path>
                    <path d="m10 7 4 4"></path>
                    <path d="m14 7-4 4"></path>
                    <path d="M12 22v-2"></path>
                    <path d="M12 18v-2"></path>
                  </svg>
                  Matchmaking Diagnostics
                </h3>
                
                <div className="space-y-4">
                  {diagnosticsResults.map((result, index) => (
                    <div key={index} className="flex items-start gap-3">
                      {result.status === 'pass' && (
                        <div className="h-5 w-5 mt-0.5 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5"></path>
                          </svg>
                        </div>
                      )}
                      {result.status === 'fail' && (
                        <div className="h-5 w-5 mt-0.5 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18"></path>
                            <path d="m6 6 12 12"></path>
                          </svg>
                        </div>
                      )}
                      {result.status === 'warning' && (
                        <div className="h-5 w-5 mt-0.5 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 9v4"></path>
                            <path d="M12 17.5v.5"></path>
                            <path d="M5.5 15h13"></path>
                            <path d="M6 20 18 4"></path>
                          </svg>
                        </div>
                      )}
                      {result.status === 'running' && (
                        <div className="h-5 w-5 mt-0.5 text-primary">
                          <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="font-medium">{result.test}</div>
                        <div className="text-sm text-muted-foreground">{result.message}</div>
                        {result.details && (
                          <div className="text-xs text-muted-foreground mt-1 bg-background/50 p-1 rounded">
                            {result.details}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Add recommendations */}
                {diagnosticsResults.some(r => r.status === 'fail' || r.status === 'warning') && (
                  <div className="mt-6 pt-4 border-t border-border">
                    <h4 className="font-medium mb-2">Recommendations:</h4>
                    <ul className="text-sm space-y-2 list-disc list-inside text-muted-foreground">
                      {diagnosticsResults.find(r => r.test === "Firebase Configuration" && r.status === 'fail') && (
                        <li>Set up your Firebase environment variables in <code>.env.local</code> file</li>
                      )}
                      {diagnosticsResults.find(r => r.test === "Authentication" && r.status === 'fail') && (
                        <li>Sign in again or check if your authentication is working</li>
                      )}
                      {diagnosticsResults.find(r => r.test === "Firestore Database" && (r.status === 'fail' || r.status === 'warning')) && (
                        <li>Check your Firestore security rules to allow read/write for clashes collection</li>
                      )}
                      {diagnosticsResults.find(r => r.test === "Realtime Database" && (r.status === 'fail' || r.status === 'warning')) && (
                        <li>Make sure your Realtime Database URL is correctly set and rules allow matchmaking</li>
                      )}
                      {diagnosticsResults.find(r => r.test === "Matchmaking Queue" && r.status === 'warning' && r.message.includes("empty")) && (
                        <li>There are no other players waiting. Try the test mode or invite a friend to play.</li>
                      )}
                      <li>Try clearing your browser cache and cookies</li>
                      <li>Check your network connection</li>
                      <li>Try using the test mode for now</li>
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            {/* Add a divider and test match option */}
            <div className="w-full my-4 flex items-center gap-4">
              <div className="h-px flex-1 bg-border"></div>
              <p className="text-xs text-muted-foreground">OR</p>
              <div className="h-px flex-1 bg-border"></div>
            </div>
            
            <div className="w-full">
              <Button 
                variant="secondary" 
                className="w-full" 
                onClick={createTestMatch}
                disabled={isCreatingTestMatch}
              >
                {isCreatingTestMatch ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Test Match...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <rect width="18" height="18" x="3" y="3" rx="2" />
                      <path d="M7 8h.01" />
                      <path d="M12 8h.01" />
                      <path d="M17 8h.01" />
                      <path d="M7 12h.01" />
                      <path d="M12 12h.01" />
                      <path d="M17 12h.01" />
                      <path d="M7 16h.01" />
                      <path d="M12 16h.01" />
                      <path d="M17 16h.01" />
                    </svg>
                    Test Mode (Practice Now)
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-2">
                Create a test match with a simulated opponent to practice by yourself
              </p>
            </div>
            
            {showDebugInfo && (
              <div className="w-full text-xs font-mono bg-black/30 p-2 rounded-md text-muted-foreground overflow-auto">
                <p>Topic ID: {searchParams.get('topic')}</p>
                <p>Queue Size: {debugInfo.queueSize ?? 'Unknown'}</p>
                <p>My UID: {currentUser.uid.substring(0, 8)}...</p>
                {debugInfo.myEntry && (
                  <p>My Entry: {JSON.stringify(debugInfo.myEntry)}</p>
                )}
                {debugInfo.error && (
                  <p className="text-red-400">Error: {debugInfo.error}</p>
                )}
              </div>
            )}
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
