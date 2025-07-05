'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { addDoc, collection, doc, onSnapshot, orderBy, query, runTransaction, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';
import { db, rtdb } from '@/lib/firebase';
import { ref, onValue, set, update, remove, onDisconnect, push, onChildAdded, off } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useAuth } from '@/hooks/useAuth';
import { updateUserScore } from '@/lib/user';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/Header';
import { CodeEditor } from '@/components/CodeEditor';
import { UserVideo } from '@/components/UserVideo';
import { BookOpen, Send, Timer, Loader2, Lightbulb, CheckCircle2, XCircle, MessageSquare, TestTube2, Terminal, RefreshCw, CameraOff, Video, Mic, MicOff, VideoOff, Trophy, Medal, Star, Sparkles, ChevronRight, Clock, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Problem } from '@/lib/problems';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getHint } from '@/ai/flows/getHintFlow';
import { translateCode } from '@/ai/flows/translateCodeFlow';
import { executeCode, type ExecuteCodeOutput } from '@/ai/flows/executeCodeFlow';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


interface Participant {
  userId: string;
  userName: string;
  userAvatar: string;
  score: number;
  solvedTimestamp: number | null;
  ready: boolean;
  isTestUser?: boolean;
  flagged?: boolean;
  flagReason?: string;
}

interface ClashData {
  topicId: string;
  problem: Problem;
  participants: Participant[];
  status: 'pending' | 'active' | 'finished';
  isTestMatch?: boolean;
  startTime?: number; // Timestamp when the clash became active
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: any;
}

type TestCaseResult = ExecuteCodeOutput['results'][0];
type TestCase = Problem['testCases'][0];
type PerformanceAnalysis = ExecuteCodeOutput['performance'];

/**
 * Recursively parses string values in a data structure. If a string can be parsed
 * as JSON, it is replaced by the parsed value. This is used to clean up
 * test case data that may have been stringified by the AI model.
 * @param data The data to parse.
 * @returns The parsed data.
 */
function robustParse(data: any): any {
  if (typeof data !== 'string') {
    if (Array.isArray(data)) {
      return data.map(item => robustParse(item));
    }
    if (typeof data === 'object' && data !== null) {
        const newObj: { [key: string]: any } = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                newObj[key] = robustParse(data[key]);
            }
        }
        return newObj;
    }
    return data;
  }
  try {
    // This is the key change: we attempt to parse any string.
    const parsed = JSON.parse(data);
    // If parsing succeeds, we recursively parse the result.
    return robustParse(parsed);
  } catch (e) {
    // If it fails, it's just a regular string, so return it.
    return data;
  }
}

const executeInWorker = (code: string, entryPoint: string, testCases: TestCase[]): Promise<ExecuteCodeOutput> => {
    return new Promise((resolve) => {
        const workerCode = `
            const deepEqual = (a, b) => {
                if (a === b) return true;
                if (a && b && typeof a === 'object' && typeof b === 'object') {
                    if (a.constructor !== b.constructor) return false;

                    let length;
                    if (Array.isArray(a)) {
                        length = a.length;
                        if (length !== b.length) return false;
                        for (let i = 0; i < length; i++) {
                            if (!deepEqual(a[i], b[i])) return false;
                        }
                        return true;
                    }

                    if ((a.constructor === RegExp && b.constructor === RegExp)) {
                        return a.source === b.source && a.flags === b.flags;
                    }
                    if (a.valueOf !== Object.prototype.valueOf) {
                        return a.valueOf() === b.valueOf();
                    }
                    if (a.toString !== Object.prototype.toString) {
                        return a.toString() === b.toString();
                    }

                    const keys = Object.keys(a);
                    length = keys.length;
                    if (length !== Object.keys(b).length) return false;

                    for (let i = 0; i < length; i++) {
                        const key = keys[i];
                        if (!Object.prototype.hasOwnProperty.call(b, key) || !deepEqual(a[key], b[key])) {
                            return false;
                        }
                    }
                    return true;
                }
                return a !== a && b !== b;
            };
            
            const robustParse = (data) => {
                if (typeof data !== 'string') {
                    if (Array.isArray(data)) {
                        return data.map(item => robustParse(item));
                    }
                    if (typeof data === 'object' && data !== null) {
                        return Object.fromEntries(
                            Object.entries(data).map(([key, value]) => [key, robustParse(value)])
                        );
                    }
                    return data;
                }
                try {
                    const parsed = JSON.parse(data);
                    return robustParse(parsed);
                } catch (e) {
                    return data;
                }
            };

            self.onmessage = function(e) {
                const { code, entryPoint, testCases } = e.data;
                const results = [];
                let passedCount = 0;
                
                try {
                    const userFunc = eval(code);

                    if (typeof userFunc !== 'function') {
                      throw new Error("Entry point function '" + entryPoint + "' not found or is not a function in your code.");
                    }

                    for (let i = 0; i < testCases.length; i++) {
                        const tc = testCases[i];
                        const startTime = performance.now();
                        let output, error = null;
                        
                        // Data is now recursively parsed to handle nested stringified JSON.
                        const parsedInput = robustParse(tc.input);
                        const expectedValue = robustParse(tc.expected);

                        try {
                            output = userFunc(...parsedInput);
                        } catch (err) {
                            error = err;
                        }

                        const endTime = performance.now();
                        
                        const passed = !error && deepEqual(output, expectedValue);
                        if (passed) passedCount++;

                        results.push({
                            case: i + 1,
                            input: JSON.stringify(parsedInput),
                            output: error ? error.toString() : JSON.stringify(output),
                            expected: JSON.stringify(expectedValue),
                            passed: passed,
                            runtime: (endTime - startTime).toFixed(2) + 'ms',
                        });
                    }
                    self.postMessage({ status: 'success', passedCount, totalCount: testCases.length, results });
                } catch (e) {
                    self.postMessage({ status: 'error', message: 'Execution Error: ' + e.message, results: [], passedCount: 0, totalCount: testCases.length });
                }
            };
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        const worker = new Worker(workerUrl);

        worker.postMessage({ code, entryPoint, testCases });

        worker.onmessage = (e) => {
            resolve(e.data);
            worker.terminate();
            URL.revokeObjectURL(workerUrl);
        };

        worker.onerror = (e) => {
            resolve({ status: 'error', message: "A worker error occurred: " + e.message, passedCount: 0, totalCount: testCases.length, results: [] });
            worker.terminate();
            URL.revokeObjectURL(workerUrl);
        };
    });
};

const formatArgsForDisplay = (args: any[]): string => {
    if (!Array.isArray(args)) return String(args); // Fallback
    return args.map(arg => JSON.stringify(arg)).join(', ');
};

const formatValueForDisplay = (value: any): string => {
    if (typeof value === 'string') {
        try {
            // Check if it's a stringified object/array and format it without extra quotes
            const parsed = JSON.parse(value);
            if(typeof parsed === 'object' && parsed !== null) {
                return value;
            }
        } catch (e) {
            // It's a regular string, return as is.
            return `"${value}"`;
        }
    }
    // For non-string types, stringify normally
    return JSON.stringify(value);
}

export default function ClashClient({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  
  const [clashData, setClashData] = useState<ClashData | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [code, setCode] = useState('');
  const [starterCodes, setStarterCodes] = useState<Record<string, string>>({});
  const [isTranslatingCode, setIsTranslatingCode] = useState(false);
  const [language, setLanguage] = useState('javascript');
  const [output, setOutput] = useState<TestCaseResult[] | string>('Click "Run Code" to see the output here.');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consoleTab, setConsoleTab] = useState('test-result');
  const [submissionResult, setSubmissionResult] = useState<{ 
    status: 'Accepted' | 'Wrong Answer' | 'Error'; 
    message: string;
    performance?: PerformanceAnalysis;
  } | null>(null);
  const [isSettingReady, setIsSettingReady] = useState(false);
  
  const [timeLeft, setTimeLeft] = useState(30 * 60); // Default time, will be updated based on startTime
  const [performanceAnalysis, setPerformanceAnalysis] = useState<PerformanceAnalysis | null>(null);

  const [isGettingHint, setIsGettingHint] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  
  const [solutionCode, setSolutionCode] = useState('');
  const [solutionLanguage, setSolutionLanguage] = useState('javascript');
  const [solutionCodes, setSolutionCodes] = useState<Record<string, string>>({});
  const [isTranslatingSolution, setIsTranslatingSolution] = useState(false);

  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidate[]>([]);

  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const languages = ["javascript", "python", "java", "cpp"];
  
  const me = useMemo(() => clashData?.participants.find(p => p.userId === currentUser?.uid), [clashData?.participants, currentUser?.uid]);
  const opponent = useMemo(() => clashData?.participants.find(p => p.userId !== currentUser?.uid), [clashData?.participants, currentUser?.uid]);
  const opponentId = opponent?.userId;

  const allReady = useMemo(() => clashData?.participants.every(p => p.ready) ?? false, [clashData?.participants]);
  const isClashActive = (clashData?.status === 'active' || allReady);
  
  // Deterministic role assignment for WebRTC connection. This is stable once the opponent is identified.
  const isCaller = useMemo(() => {
    if (!currentUser || !opponentId) return null;
    return currentUser.uid < opponentId;
  }, [currentUser, opponentId]);

  const [showVictoryDialog, setShowVictoryDialog] = useState<boolean>(false);
  const [victoryData, setVictoryData] = useState<{
    score: number;
    rank?: number;
    isFirstSolver: boolean;
    opponentSolved: boolean;
  } | null>(null);

  // Track page visibility and tab switching
  const [tabSwitchWarnings, setTabSwitchWarnings] = useState<number>(0);
  const [isTabSwitchDialogOpen, setIsTabSwitchDialogOpen] = useState<boolean>(false);
  const [tabSwitchTimestamp, setTabSwitchTimestamp] = useState<number | null>(null);
  const maxTabSwitches = 3; // Maximum number of tab switches allowed

  // Show win modal
  const [showWinModal, setShowWinModal] = useState<{
    totalPoints: number;
    breakdown: {
      base: number;
      firstSolve: number;
      time: number;
    };
    firstToSolve: boolean;
    opponentSolved: boolean;
  } | null>(null);

  // Track if the user has submitted their solution
  const hasSubmittedSolution = !!me?.solvedTimestamp;
  
  // Use ref to track visibility without rerenders
  const visibilityRef = useRef({
    isHidden: false,
    lastHidden: 0,
    warningShown: false,
  });

  useEffect(() => {
    if (!db || !id) return;

    const clashDocRef = doc(db, 'clashes', id);
    const unsubscribeClash = onSnapshot(clashDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const rawData = docSnap.data();

        let problemData: Problem = robustParse(
          typeof rawData.problem === 'string'
          ? JSON.parse(rawData.problem)
          : rawData.problem
        );

        const data = { ...rawData, problem: problemData } as ClashData;
        setClashData(data);
        
        // Calculate time left based on startTime if available and clash is active
        if (data.status === 'active' && data.startTime) {
          const totalDuration = 30 * 60; // 30 minutes in seconds
          const elapsedTime = Math.floor((Date.now() - data.startTime) / 1000);
          const remainingTime = Math.max(0, totalDuration - elapsedTime);
          setTimeLeft(remainingTime);
        }
        
        if (!problem && data.problem) {
          const initialProblem = data.problem;
          setProblem(initialProblem);
          
          const starterCode = initialProblem.starterCode || `function ${initialProblem.entryPoint}() {\n  // your code here\n}`;
          setCode(starterCode);
          setStarterCodes({ javascript: starterCode });

          const initialSolution = initialProblem.solution || '';
          setSolutionCode(initialSolution);
          setSolutionCodes({ javascript: initialSolution });

        } else if (!data.problem && !problem) {
          toast({ title: "Problem not found", description: "The problem for this clash is missing.", variant: 'destructive' });
          router.push('/lobby');
          return;
        }

      } else {
        toast({ title: "Clash not found", description: "This clash does not exist or has been deleted.", variant: 'destructive' });
        router.push('/lobby');
      }
    }, (error) => {
        console.error("Clash listener error:", error);
        toast({ title: "Connection Error", description: "Could not sync with the clash. Please check your Firestore security rules.", variant: 'destructive' });
        router.push('/lobby');
    });
    
    const chatRef = collection(db, 'clashes', id, 'chat');
    const q = query(chatRef, orderBy('timestamp', 'asc'));

    const unsubscribeChat = onSnapshot(q, (querySnapshot) => {
      const chatMessages: Message[] = [];
      querySnapshot.forEach((doc) => {
        chatMessages.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(chatMessages);
    }, (error) => {
        console.error("Chat listener error:", error);
        toast({ title: "Chat Error", description: "Could not load chat messages.", variant: 'destructive' });
    });

    return () => {
      unsubscribeClash();
      unsubscribeChat();
    };
  }, [id, router, toast, problem, currentUser]);

  useEffect(() => {
    // For test matches, automatically mark the simulated opponent as ready when the user is ready
    if (clashData?.isTestMatch && me?.ready && opponent?.isTestUser && db && id && clashData?.status === 'pending') {
      const clashDocRef = doc(db, 'clashes', id);
      runTransaction(db, async (transaction) => {
        const clashDoc = await transaction.get(clashDocRef);
        if (!clashDoc.exists()) {
          throw new Error("Clash document does not exist!");
        }
        
        const data = clashDoc.data() as ClashData;
        const updatedParticipants = data.participants.map(p => {
          if (p.userId !== currentUser?.uid && p.isTestUser) {
            // Auto-ready the simulated opponent
            return { ...p, ready: true };
          }
          return p;
        });
        
        transaction.update(clashDocRef, { 
          participants: updatedParticipants,
          status: 'active', // Also update status to active
          startTime: Date.now() // Set the start time when activating the clash
        });
      }).catch(error => {
        console.error("Error updating test opponent:", error);
      });
    }
  
    if (allReady && clashData?.status === 'pending' && db && id) {
        if (clashData.participants[0].userId === currentUser?.uid) {
            // Use runTransaction to ensure all fields are properly defined when updating status
            runTransaction(db, async (transaction) => {
                const clashDocRef = doc(db, 'clashes', id);
                const clashDoc = await transaction.get(clashDocRef);
                
                if (!clashDoc.exists()) {
                    throw new Error("Clash document does not exist!");
                }
                
                const data = clashDoc.data() as ClashData;
                
                // Ensure all participant fields are defined to prevent Firebase errors
                const updatedParticipants = data.participants.map(p => ({
                    userId: p.userId,
                    userName: p.userName || 'Anonymous',
                    userAvatar: p.userAvatar || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(p.userName || 'Anonymous')}&backgroundColor=e74c86&textColor=ffffff&radius=50`,
                    score: p.score || 0,
                    solvedTimestamp: p.solvedTimestamp || null,
                    ready: p.ready || false
                }));
                
                transaction.update(clashDocRef, { 
                    status: 'active',
                    participants: updatedParticipants,
                    startTime: Date.now() // Set the start time when activating the clash
                });
            }).catch(err => {
                console.error("Failed to update clash status to active:", err);
            });
        }
    }
  }, [allReady, clashData, currentUser?.uid, db, id, me?.ready, opponent?.isTestUser]);

  // Add another effect to simulate the test opponent solving the problem after a delay
  useEffect(() => {
    // Only proceed if this is a test match and the match is active
    if (!clashData?.isTestMatch || clashData.status !== 'active' || !opponent?.isTestUser || !db || !id) {
      return;
    }

    // Set a random delay between 60 and 180 seconds for the test opponent to solve the problem
    const solveDelay = Math.floor(Math.random() * (180 - 60 + 1) + 60) * 1000;
    
    const timer = setTimeout(() => {
      // Update the opponent's status to show they've solved the problem
      const clashDocRef = doc(db, 'clashes', id);
      runTransaction(db, async (transaction) => {
        const clashDoc = await transaction.get(clashDocRef);
        if (!clashDoc.exists()) {
          return;
        }
        
        const data = clashDoc.data() as ClashData;
        
        // Don't proceed if the current user has already solved the problem
        const currentUserParticipant = data.participants.find(p => p.userId === currentUser?.uid);
        if (currentUserParticipant?.solvedTimestamp) {
          return;
        }
        
        const updatedParticipants = data.participants.map(p => {
          if (p.isTestUser) {
            // Simulate the test opponent solving the problem
            return { 
              ...p, 
              solvedTimestamp: Date.now(),
              score: 100 // Give them a perfect score
            };
          }
          return p;
        });
        
        transaction.update(clashDocRef, { participants: updatedParticipants });
        
        // Also add a message from the test opponent
        const chatRef = collection(db, 'clashes', id, 'chat');
        const messageData = {
          senderId: opponent.userId,
          senderName: opponent.userName,
          senderAvatar: opponent.userAvatar,
          text: "I've completed the challenge! How are you doing?",
          timestamp: firestoreServerTimestamp()
        };
        
        transaction.set(doc(chatRef), messageData);
      }).catch(error => {
        console.error("Error simulating test opponent solving:", error);
      });
    }, solveDelay);
    
    return () => clearTimeout(timer);
  }, [clashData?.isTestMatch, clashData?.status, opponent?.isTestUser, db, id, currentUser?.uid, opponent]);

  // WebRTC Signaling Logic - Re-architected for Robustness
  useEffect(() => {
    // Skip video connection setup for test matches
    if (clashData?.isTestMatch) {
      setIsConnecting(false);
      return;
    }
    
    if (!rtdb || !id || !currentUser || !opponentId || isCaller === null) {
      console.log("WebRTC setup missing dependencies:", { rtdb: !!rtdb, id, currentUser: !!currentUser, opponentId, isCaller });
      return;
    }
    
    console.log("Starting WebRTC connection setup", { isCaller, userId: currentUser.uid, opponentId });
  
    let ignore = false;
    let isProcessing = false;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5; // Increased from 3
    setIsConnecting(true);
    
    // Use more STUN servers and add additional TURN servers for better connectivity
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: [
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302',
          'stun:stun3.l.google.com:19302',
          'stun:stun4.l.google.com:19302'
        ]},
        {
          urls: 'turn:global.turn.twilio.com:3478?transport=udp',
          username: 'f4b4035eaa10c9c85a642a9b415526a31b9670af401b455dc38f2c828acd0458',
          credential: 'xOEj0WJzR4MxDG8YC/xyDIYcNbSWPGX9b/AVyO5AJgY='
        },
        {
          urls: 'turn:global.turn.twilio.com:3478?transport=tcp',
          username: 'f4b4035eaa10c9c85a642a9b415526a31b9670af401b455dc38f2c828acd0458',
          credential: 'xOEj0WJzR4MxDG8YC/xyDIYcNbSWPGX9b/AVyO5AJgY='
        }
      ]
    });
    peerConnectionRef.current = pc;
  
    const baseSignalingPath = `clash-video-signaling/${id}`;
    const mySignalingRef = ref(rtdb, `${baseSignalingPath}/${currentUser.uid}`);
    const opponentSignalingRef = ref(rtdb, `${baseSignalingPath}/${opponentId}`);
  
    // Monitor connection state changes with enhanced logging and recovery
    pc.onconnectionstatechange = () => {
      if (ignore) return;
      console.log(`Connection state changed: ${pc.connectionState}`, { 
        iceConnectionState: pc.iceConnectionState,
        iceGatheringState: pc.iceGatheringState,
        signalingState: pc.signalingState
      });
      
      if (pc.connectionState === 'connected') {
        setIsConnecting(false);
        console.log('WebRTC connection established successfully');
        reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        
        // Verify we have remote tracks
        const receivers = pc.getReceivers();
        const videoReceivers = receivers.filter(r => r.track && r.track.kind === 'video');
        console.log(`Connected with ${videoReceivers.length} video receivers`);
        
        if (videoReceivers.length === 0) {
          console.warn('Connected but no video tracks received. Will attempt to renegotiate.');
          // Force renegotiation to try to get video tracks
          if (isCaller) {
            setTimeout(() => {
              if (!ignore && pc.connectionState === 'connected' && !remoteStream) {
                console.log('Attempting to renegotiate to get video tracks...');
                pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true })
                  .then(offer => pc.setLocalDescription(offer))
                  .then(() => {
                    if (ignore) return;
                    const offerPayload = { offer: pc.localDescription?.toJSON() };
                    set(mySignalingRef, offerPayload);
                  })
                  .catch(e => console.error("Error creating renegotiation offer:", e));
              }
            }, 2000);
          }
        }
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        console.warn(`WebRTC connection ${pc.connectionState}`, {
          iceConnectionState: pc.iceConnectionState,
          iceGatheringState: pc.iceGatheringState,
          signalingState: pc.signalingState
        });
        
        // Attempt to reconnect if we haven't exceeded max attempts
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
          
          // Restart ICE gathering
          pc.restartIce();
          
          // If we're the caller, create a new offer with the ICE restart flag
          if (isCaller) {
            // Short delay before creating a new offer to allow state to stabilize
            setTimeout(() => {
              if (ignore || pc.connectionState === 'connected') return;
              
              console.log('Creating new offer with ICE restart');
              pc.createOffer({ iceRestart: true })
                .then(offer => pc.setLocalDescription(offer))
                .then(() => {
                  if (ignore) return;
                  const offerPayload = { offer: pc.localDescription?.toJSON() };
                  set(mySignalingRef, offerPayload);
                  console.log('New offer with ICE restart sent');
                })
                .catch(e => console.error("Error creating restart offer:", e));
            }, 1000);
          }
        } else {
          setIsConnecting(false);
          console.error('WebRTC connection failed after multiple attempts');
        }
      }
    };
    
    // Monitor ICE connection state changes with enhanced logging
    pc.oniceconnectionstatechange = () => {
      if (ignore) return;
      console.log(`ICE connection state changed: ${pc.iceConnectionState}`, {
        connectionState: pc.connectionState,
        iceGatheringState: pc.iceGatheringState,
        signalingState: pc.signalingState
      });
      
      // Additional recovery for failed ICE connections
      if (pc.iceConnectionState === 'failed') {
        console.warn('ICE connection failed, attempting recovery...');
        if (isCaller && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          // Try to create a new offer with ICE restart
          setTimeout(() => {
            if (ignore || pc.connectionState === 'connected') return;
            pc.createOffer({ iceRestart: true })
              .then(offer => pc.setLocalDescription(offer))
              .then(() => {
                if (ignore) return;
                const offerPayload = { offer: pc.localDescription?.toJSON() };
                set(mySignalingRef, offerPayload);
                console.log('ICE restart offer sent after ICE failure');
              })
              .catch(e => console.error("Error creating ICE restart offer:", e));
          }, 1000);
        }
      }
    };
    
    // Monitor signaling state changes
    pc.onsignalingstatechange = () => {
      if (ignore) return;
      console.log(`Signaling state changed: ${pc.signalingState}`, {
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        iceGatheringState: pc.iceGatheringState
      });
    };
  
    // 1. Get user media and add tracks
    // Check if we're in a secure context and if mediaDevices API is available
    if (!window.isSecureContext) {
      console.warn("Camera API requires a secure context (HTTPS or localhost)");
      if (!ignore) setIsConnecting(false);
      // Continue with signaling even without camera
      if (isCaller) {
        pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
          .then(offer => pc.setLocalDescription(offer))
          .then(() => {
            if (ignore) return;
            const offerPayload = { offer: pc.localDescription?.toJSON() };
            set(mySignalingRef, offerPayload); // Overwrite previous data
          })
          .catch(e => console.error("Error creating offer:", e));
      }
    } else if (!navigator.mediaDevices) {
      console.warn("Camera API is not supported by this browser");
      if (!ignore) setIsConnecting(false);
      // Continue with signaling even without camera
      if (isCaller) {
        pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
          .then(offer => pc.setLocalDescription(offer))
          .then(() => {
            if (ignore) return;
            const offerPayload = { offer: pc.localDescription?.toJSON() };
            set(mySignalingRef, offerPayload); // Overwrite previous data
          })
          .catch(e => console.error("Error creating offer:", e));
      }
    } else {
      try {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          .then(stream => {
            if (ignore) {
              stream.getTracks().forEach(track => track.stop());
              return;
            }
            localStreamRef.current = stream;
            stream.getTracks().forEach(track => pc.addTrack(track, stream));
      
            // 2. If caller, create offer. This kicks off the signaling process.
            if (isCaller) {
              pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .then(() => {
                  if (ignore) return;
                  const offerPayload = { offer: pc.localDescription?.toJSON() };
                  set(mySignalingRef, offerPayload); // Overwrite previous data
                })
                .catch(e => console.error("Error creating offer:", e));
            }
          }).catch(e => {
            console.error("Could not get user media", e);
            if (!ignore) setIsConnecting(false);
            
            // Continue with signaling even without camera
            if (isCaller) {
              pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
                .then(offer => pc.setLocalDescription(offer))
                .then(() => {
                  if (ignore) return;
                  const offerPayload = { offer: pc.localDescription?.toJSON() };
                  set(mySignalingRef, offerPayload); // Overwrite previous data
                })
                .catch(e => console.error("Error creating offer:", e));
            }
          });
      } catch (error) {
        console.error("Unexpected error accessing media devices:", error);
        if (!ignore) setIsConnecting(false);
        
        // Continue with signaling even without camera
        if (isCaller) {
          pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
            .then(offer => pc.setLocalDescription(offer))
            .then(() => {
              if (ignore) return;
              const offerPayload = { offer: pc.localDescription?.toJSON() };
              set(mySignalingRef, offerPayload); // Overwrite previous data
            })
            .catch(e => console.error("Error creating offer:", e));
        }
      }
    }
  
    // 3. Handle receiving remote video tracks with enhanced logging and handling
    pc.ontrack = (event) => {
      if (ignore) return;
      
      console.log('ontrack event received', {
        kind: event.track?.kind,
        enabled: event.track?.enabled,
        readyState: event.track?.readyState,
        hasStreams: !!event.streams && event.streams.length > 0,
        trackId: event.track?.id
      });
      
      if (event.streams && event.streams[0]) {
        const stream = event.streams[0];
        console.log('Remote stream received', {
          id: stream.id,
          active: stream.active,
          audioTracks: stream.getAudioTracks().length,
          videoTracks: stream.getVideoTracks().length,
          trackKind: event.track?.kind
        });
        
        // Force a UI update when we receive a video track
        if (event.track.kind === 'video') {
          console.log('Video track received, forcing UI update');
          // Dispatch a custom event that we can listen for in the OpponentVideo component
          window.dispatchEvent(new CustomEvent('webrtc-video-track-received', { 
            detail: { streamId: stream.id, trackId: event.track.id }
          }));
        }
        
        // Log all tracks in the stream
        stream.getTracks().forEach(track => {
          console.log(`Track in stream: ${track.kind}`, {
            id: track.id,
            enabled: track.enabled,
            readyState: track.readyState
          });
        });
        
        // Only update if we have video tracks or if we don't have a stream yet
        const hasVideoTracks = stream.getVideoTracks().length > 0;
        const hasAudioTracks = stream.getAudioTracks().length > 0;
        
        console.log('Evaluating remote stream update', {
          hasVideoTracks,
          hasAudioTracks,
          streamId: stream.id,
          trackKind: event.track.kind
        });
        
        setRemoteStream(prevStream => {
          // If we don't have a previous stream, use this one
          if (!prevStream) {
            console.log('No previous stream, setting new remote stream');
            return stream;
          }
          
          // If this is a video track and our previous stream doesn't have video, use this one
          if (hasVideoTracks && prevStream.getVideoTracks().length === 0) {
            console.log('New stream has video tracks but previous stream did not, updating');
            return stream;
          }
          
          // If we already have a stream with video tracks, don't replace it with one without video
          if (prevStream.getVideoTracks().length > 0 && !hasVideoTracks) {
            console.log('Keeping existing stream with video tracks instead of new stream without video');
            
            // If this is an audio track, add it to our existing stream if it's not already there
            if (event.track.kind === 'audio' && !prevStream.getAudioTracks().some(t => t.id === event.track.id)) {
              console.log('Adding new audio track to existing stream with video');
              prevStream.addTrack(event.track);
            }
            
            return prevStream;
          }
          
          // If streams are different and the new one has video, use the new one
          if (prevStream.id !== stream.id && hasVideoTracks) {
            console.log('Setting new remote stream with video');
            return stream;
          }
          
          // If this is the same stream ID, keep it but ensure we have the track
          if (prevStream.id === stream.id) {
            // Check if the track is already in our stream
            if (!prevStream.getTracks().some(t => t.id === event.track.id)) {
              console.log(`Adding new ${event.track.kind} track to existing stream`);
              prevStream.addTrack(event.track);
            }
            return prevStream;
          }
          
          return prevStream;
        });
        
        setIsConnecting(false);
        
        // Attach audio tracks to a hidden audio element for voice
        let audioElem = document.getElementById('remote-audio') as HTMLAudioElement | null;
        if (!audioElem) {
          audioElem = document.createElement('audio');
          audioElem.id = 'remote-audio';
          audioElem.style.display = 'none';
          document.body.appendChild(audioElem);
        }
        
        if (audioElem.srcObject !== stream) {
          console.log('Setting audio element source');
          audioElem.srcObject = stream;
        }
        
        audioElem.autoplay = true;
        audioElem.muted = false;
        
        // Ensure audio plays
        const audioPlayPromise = audioElem.play();
        
        // Only add catch handler if it's a proper promise
        if (audioPlayPromise !== undefined) {
          audioPlayPromise.catch(() => {
            // Silently handle errors to avoid console messages
          });
        }
      } else if (event.track) {
        // Handle case where we get a track without a stream
        console.log('Received track without stream, creating new MediaStream');
        const newStream = new MediaStream([event.track]);
        
        setRemoteStream(prevStream => {
          if (prevStream) {
            // If we already have a stream, add this track to it instead of creating a new stream
            if (!prevStream.getTracks().some(t => t.id === event.track.id)) {
              console.log('Adding track to existing stream');
              prevStream.addTrack(event.track);
            }
            return prevStream;
          }
          return newStream;
        });
        
        setIsConnecting(false);
      }
    };
  
    // 4. When a local ICE candidate is generated, push it to our signaling path
    pc.onicecandidate = (event) => {
      if (event.candidate && !ignore) {
        push(ref(rtdb, `${baseSignalingPath}/${currentUser.uid}/candidates`), event.candidate.toJSON());
      }
    };
  
    // 5. Listen for the main offer/answer signals from the opponent
    const handleSignal = async (data: any) => {
      if (isProcessing || ignore || !data) return;
      isProcessing = true;
  
      try {
        // If we are the CALLER and receive an ANSWER
        if (data.answer && isCaller && pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          
          // Process any pending candidates after remote description is set
          if (pendingCandidatesRef.current.length > 0) {
            const candidates = pendingCandidatesRef.current;
            pendingCandidatesRef.current = [];
            for (const candidate of candidates) {
              await pc.addIceCandidate(candidate);
            }
          }
        }
  
        // If we are the CALLEE and receive an OFFER
        else if (data.offer && !isCaller && (pc.signalingState === 'stable' || pc.signalingState === 'have-remote-offer')) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          
          // Process any pending candidates after remote description is set
          if (pendingCandidatesRef.current.length > 0) {
            const candidates = pendingCandidatesRef.current;
            pendingCandidatesRef.current = [];
            for (const candidate of candidates) {
              await pc.addIceCandidate(candidate);
            }
          }
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          if (!ignore) {
            await update(mySignalingRef, { answer: pc.localDescription?.toJSON() });
          }
        }
      } catch (e) {
        console.error("Signaling error:", e);
      } finally {
        isProcessing = false;
      }
    };
    
    const offerAnswerListener = onValue(opponentSignalingRef, (snapshot) => {
        if(snapshot.exists()) {
            handleSignal(snapshot.val());
        }
    });
  
    // 6. Listen for new ICE candidates added by the opponent
    const opponentCandidatesRef = ref(rtdb, `${baseSignalingPath}/${opponentId}/candidates`);
    const handleCandidate = async (candidate: RTCIceCandidateInit) => {
      try {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          pendingCandidatesRef.current.push(new RTCIceCandidate(candidate));
        }
      } catch (e) {
        if (!ignore) console.error("Error handling ICE candidate:", e);
      }
    };

    const candidatesListener = onChildAdded(opponentCandidatesRef, (snapshot) => {
      if (snapshot.exists() && !ignore) {
        handleCandidate(snapshot.val());
      }
    });
  
    // 7. Set a timeout for the initial connection attempt
    const connectionTimeout = setTimeout(() => {
      if (!ignore && pc.connectionState !== 'connected') {
        setIsConnecting(false);
        console.warn("WebRTC connection timed out.");
      }
    }, 20000); // Increased timeout to 20 seconds
  
    // 8. Cleanup logic
    return () => {
      console.log("Cleaning up WebRTC connection for", currentUser.uid);
      ignore = true;
      clearTimeout(connectionTimeout);
  
      // Detach all Firebase listeners
      off(opponentSignalingRef, 'value', offerAnswerListener);
      off(opponentCandidatesRef, 'child_added', candidatesListener);
  
      if (pc) {
        pc.ontrack = null;
        pc.onicecandidate = null;
        pc.onconnectionstatechange = null;
        pc.oniceconnectionstatechange = null;
        pc.close();
        peerConnectionRef.current = null;
      }
  
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
  
      // Cancel onDisconnect and remove our signaling data
      onDisconnect(mySignalingRef).cancel();
      remove(mySignalingRef).catch(e => console.error("Error removing signaling ref on cleanup:", e));
    };
  }, [id, currentUser, opponentId, isCaller, rtdb]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

    useEffect(() => {
      // Only proceed if the ref is available
      if (!remoteVideoRef.current) return;
      
      // Clear any existing event listeners to prevent duplicates
      const videoElement = remoteVideoRef.current;
      const oldHandlers = videoElement._eventHandlers;
      if (oldHandlers) {
        Object.entries(oldHandlers).forEach(([event, handler]) => {
          videoElement.removeEventListener(event, handler);
        });
      }
      
      // Initialize event handlers object
      videoElement._eventHandlers = {};
      
      if (remoteStream) {
        console.log('Setting remote stream to video element', {
          streamId: remoteStream.id,
          videoTracks: remoteStream.getVideoTracks().length,
          audioTracks: remoteStream.getAudioTracks().length,
          active: remoteStream.active
        });
        
        // Set stream and show video
        videoElement.srcObject = remoteStream;
        videoElement.classList.remove('hidden');
        
        // Define play function with enhanced retry logic
        const ensureVideoPlays = (retryCount = 0, maxRetries = 5) => {
          if (!videoElement || !remoteStream) return;
          
          // Check if video is already playing
          if (!videoElement.paused) {
            console.log('Remote video is already playing');
            return;
          }
          
          console.log(`Attempting to play remote video (attempt ${retryCount + 1}/${maxRetries})`);
          
          // Check if video has valid tracks before attempting to play
          const hasVideoTracks = remoteStream.getVideoTracks().some(track => track.readyState === 'live');
          
          if (!hasVideoTracks) {
            console.warn('No live video tracks found in remote stream');
          }
          
          const playPromise = videoElement.play();
          
          // Only add handlers if it's a proper promise
          if (playPromise !== undefined) {
            playPromise.then(() => {
              // Success - no need to log to console
            }).catch(err => {
              // Don't log the error to console to avoid error messages
              
              // Only retry if we haven't exceeded max retries and the element is still in the document
              if (retryCount < maxRetries && document.body.contains(videoElement)) {
                // Retry with exponential backoff
                setTimeout(() => ensureVideoPlays(retryCount + 1, maxRetries), 500 * (retryCount + 1));
              }
              // No need to log max retries or element removal
            });
          }
        };
        
        // Handle video errors with enhanced recovery
        const handleVideoError = (e: Event) => {
          console.error('Video playback error:', e);
          
          // Only attempt recovery if the element is still in the document
          if (document.body.contains(videoElement) && remoteStream) {
            console.log('Attempting to recover from video error');
            
            // Check if stream is still active
            if (!remoteStream.active) {
              console.warn('Remote stream is no longer active');
              return;
            }
            
            // Store the stream reference
            const currentStream = remoteStream;
            
            // Check if video tracks are still valid
            const videoTracks = currentStream.getVideoTracks();
            console.log('Video tracks status:', videoTracks.map(t => ({ 
              enabled: t.enabled, 
              readyState: t.readyState,
              muted: t.muted
            })));
            
            // Reset the video element
            videoElement.srcObject = null;
            
            // Wait a moment before reattaching the stream
            setTimeout(() => {
              if (document.body.contains(videoElement)) {
                console.log('Reattaching stream after error');
                videoElement.srcObject = currentStream;
                ensureVideoPlays();
              }
            }, 1000);
          }
        };
        
        // Handle pause events with enhanced logging
        const handlePause = () => {
          console.log('Video was paused, attempting to resume');
          
          // Only attempt to play if the element is still in the document
          if (document.body.contains(videoElement) && remoteStream) {
            // Check if stream is still active
            if (!remoteStream.active) {
              console.warn('Cannot resume - remote stream is no longer active');
              return;
            }
            
            const playPromise = videoElement.play();
            
            // Only add handlers if it's a proper promise
            if (playPromise !== undefined) {
              playPromise.then(() => {
                // Success - no need to log to console
              }).catch(() => {
                // Silently handle errors to avoid console messages
              });
            }
          }
        };
        
        // Handle loadedmetadata event
        const handleLoadedMetadata = () => {
          console.log('Video loadedmetadata event fired, video ready to play');
          ensureVideoPlays();
        };
        
        // Handle canplay event
        const handleCanPlay = () => {
          console.log('Video canplay event fired');
          ensureVideoPlays();
        };
        
        // Store handlers for later cleanup
        videoElement._eventHandlers = {
          error: handleVideoError,
          pause: handlePause,
          loadedmetadata: handleLoadedMetadata,
          canplay: handleCanPlay
        };
        
        // Add event listeners
        videoElement.addEventListener('error', handleVideoError);
        videoElement.addEventListener('pause', handlePause);
        videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.addEventListener('canplay', handleCanPlay);
        
        // Initial play attempt
        ensureVideoPlays();
        
        // Set up periodic check to ensure video is playing
        const periodicCheck = setInterval(() => {
          if (document.body.contains(videoElement) && remoteStream && videoElement.paused) {
            console.log('Periodic check: video is paused, attempting to play');
            ensureVideoPlays();
          }
        }, 5000); // Check every 5 seconds
        
        return () => {
          // Clean up event listeners on unmount or stream change
          if (document.body.contains(videoElement)) {
            videoElement.removeEventListener('error', handleVideoError);
            videoElement.removeEventListener('pause', handlePause);
            videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
            videoElement.removeEventListener('canplay', handleCanPlay);
          }
          clearInterval(periodicCheck);
        };
      } else {
        // No stream available
        videoElement.srcObject = null;
        videoElement.classList.add('hidden');
      }
    }, [remoteStream]);
    
    // Declare the custom property for TypeScript
    declare global {
      // Define custom properties for HTMLVideoElement to track event handlers
      // This is used to properly clean up event listeners
    }


  useEffect(() => {
    // Only update the timer if the clash is active and time is remaining
    if (!isClashActive || timeLeft <= 0) return;
    
    const timer = setInterval(() => setTimeLeft((prev) => Math.max(0, prev - 1)), 1000);
    
    return () => clearInterval(timer);
  }, [isClashActive, timeLeft]);

  // Add an effect to handle when the timer reaches zero
  useEffect(() => {
    if (timeLeft === 0 && isClashActive && db && id) {
      // Update the clash status to finished when time runs out
      const clashDocRef = doc(db, 'clashes', id);
      updateDoc(clashDocRef, { status: 'finished' })
        .catch(err => {
          console.error("Failed to update clash status to finished:", err);
        });
      
      toast({ 
        title: "Time's up!", 
        description: "The coding challenge has ended.", 
        variant: 'default'
      });
    }
  }, [timeLeft, isClashActive, db, id, toast]);
  
  const awardPoints = async () => {
    if (!currentUser || !clashData || !id || !db) return;
    
    const clashDocRef = doc(db, 'clashes', id);

    try {
      await runTransaction(db, async (transaction) => {
        const clashDoc = await transaction.get(clashDocRef);
        if (!clashDoc.exists()) {
          throw new Error("Clash document does not exist!");
        }
        
        const data = clashDoc.data() as ClashData;
        
        // Find the current participant's index
        const participantIndex = data.participants.findIndex(p => p.userId === currentUser.uid);
        if (participantIndex === -1) throw new Error("You are not a participant in this clash.");
        
        // Check if already solved (prevent duplicate points)
        if (data.participants[participantIndex].solvedTimestamp !== null) return;
        
        // Update the participant's score and mark as solved
        const newParticipants = [...data.participants];
        
        // Award 100 points for solving
        const basePoints = 100;
        
        // Bonus points for being first to solve (50 points)
        const firstToSolve = !data.participants.some(p => p.solvedTimestamp !== null);
        const firstSolveBonus = firstToSolve ? 50 : 0;
        
        // Time bonus (up to 50 points for solving quickly)
        // Earliest possible submit is when clash starts, latest is when timer ends
        const elapsedSeconds = (Date.now() - (data.startTime || 0)) / 1000;
        const maxTimeBonus = 50;
        const timeBonus = Math.max(0, Math.floor(maxTimeBonus * (1 - elapsedSeconds / (30 * 60))));
        
        // Calculate total points
        const totalPoints = basePoints + firstSolveBonus + timeBonus;
        
        newParticipants[participantIndex] = {
          ...newParticipants[participantIndex],
          score: (newParticipants[participantIndex].score || 0) + totalPoints,
          solvedTimestamp: Date.now(),
        };
        
        // Reset any tab switching flags/warnings - solution has been submitted successfully
        if (newParticipants[participantIndex].flagged) {
          newParticipants[participantIndex].flagged = false;
          newParticipants[participantIndex].flagReason = '';
        }
        
        transaction.update(clashDocRef, { participants: newParticipants });
        
        // Update user profile with score
        updateUserScore(currentUser.uid, totalPoints);
        
        // Update local state to show congratulations modal
        setShowWinModal({
          totalPoints,
          breakdown: {
            base: basePoints,
            firstSolve: firstSolveBonus,
            time: timeBonus
          },
          firstToSolve,
          opponentSolved: data.participants.some(p => p.userId !== currentUser.uid && p.solvedTimestamp !== null)
        });
      });
    } catch (error) {
      console.error("Failed to award points:", error);
      toast({ 
        title: "Error", 
        description: "Failed to record your solution. Please try again.",
        variant: "destructive" 
      });
    }
  };


  const handleSendMessage = async () => {
    if (newMessage.trim() === '' || !db || !currentUser || !id) return;
    
    const chatRef = collection(db, 'clashes', id, 'chat');
    try {
        // Ensure all fields have defined values to prevent Firebase errors
        const displayName = currentUser.displayName || 'Anonymous';
        const photoURL = currentUser.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=e74c86&textColor=ffffff&radius=50`;
        
        await addDoc(chatRef, {
          text: newMessage.trim(),
          senderId: currentUser.uid,
          senderName: displayName,
          senderAvatar: photoURL,
          timestamp: serverTimestamp(),
        });
        setNewMessage('');
    } catch (error) {
        console.error("Error sending message:", error);
        toast({ title: "Message Error", description: "Could not send message. Please check your connection and permissions.", variant: 'destructive' });
    }
  };

  const handleLanguageChange = async (newLang: string) => {
    setLanguage(newLang);
    setOutput('Click "Run Code" to see the output here.');
    
    if (starterCodes[newLang]) {
      setCode(starterCodes[newLang]);
      return;
    }

    if (!problem || !starterCodes.javascript) return;

    setIsTranslatingCode(true);
    try {
      const result = await translateCode({
        sourceCode: starterCodes.javascript,
        sourceLanguage: 'javascript',
        targetLanguage: newLang,
        entryPoint: problem.entryPoint,
      });
      const newCode = result.translatedCode;
      setCode(newCode);
      setStarterCodes(prev => ({ ...prev, [newLang]: newCode }));
    } catch (error) {
      console.error("Error translating code:", error);
      toast({ title: "Error Translating Code", description: "Could not generate a template for this language.", variant: "destructive" });
    } finally {
      setIsTranslatingCode(false);
    }
  };

  const handleSolutionLanguageChange = async (newLang: string) => {
    setSolutionLanguage(newLang);

    if (solutionCodes[newLang]) {
        setSolutionCode(solutionCodes[newLang]);
        return;
    }

    if (!problem || !solutionCodes.javascript) return;

    setIsTranslatingSolution(true);
    try {
        const result = await translateCode({
            sourceCode: solutionCodes.javascript,
            sourceLanguage: 'javascript',
            targetLanguage: newLang,
            entryPoint: problem.entryPoint,
            isSolution: true,
        });
        const newCode = result.translatedCode;
        setSolutionCode(newCode);
        setSolutionCodes(prev => ({ ...prev, [newLang]: newCode }));
    } catch (error) {
        console.error("Error translating solution:", error);
        toast({ title: "Error Translating Solution", description: "Could not generate a solution for this language.", variant: "destructive" });
    } finally {
        setIsTranslatingSolution(false);
    }
  };

  const handleCodeExecution = async (isSubmission: boolean) => {
    if (!problem || !code) return;

    if (isSubmission) setIsSubmitting(true);
    else setIsRunning(true);
    
    setConsoleTab('test-result');
    const testCasesToRun = isSubmission ? problem.testCases : problem.testCases.slice(0, 3);
    setOutput(`Running ${testCasesToRun.length} test case(s)...`);

    try {
      let result: ExecuteCodeOutput;
      if (language === 'javascript') {
        const userFunctionCode = `(function() { ${code} return ${problem.entryPoint}; })()`;
        result = await executeInWorker(userFunctionCode, problem.entryPoint, testCasesToRun);
      } else {
        result = await executeCode({ code, language, entryPoint: problem.entryPoint, testCases: testCasesToRun });
      }

      if (result.status === 'error') {
        setOutput(result.message || 'An unknown execution error occurred.');
        if (isSubmission) setSubmissionResult({ 
          status: 'Error', 
          message: `An error occurred: ${result.message || 'Unknown error'}` 
        });
      } else {
        // Store performance analysis if available
        if (result.performance && isSubmission) {
          setPerformanceAnalysis(result.performance);
        }
        
        setOutput(result.results);
        
        if (isSubmission) {
          if (result.passedCount === result.totalCount) {
            setSubmissionResult({ 
              status: 'Accepted', 
              message: `Congratulations! All ${result.totalCount} test cases passed.`,
              performance: result.performance
            });
            awardPoints();
          } else {
            // Find failing test cases and their explanations
            const failingTests = result.results.filter(r => !r.passed);
            const failureExplanations = failingTests
              .filter(test => test.explanation)
              .map(test => `• Test ${test.case}: ${test.explanation}`)
              .join('\n');
              
            setSubmissionResult({ 
              status: 'Wrong Answer', 
              message: `Your solution failed. Passed ${result.passedCount} out of ${result.totalCount} test cases.${failureExplanations ? `\n\nHints:\n${failureExplanations}` : ''}`,
              performance: result.performance
            });
          }
        }
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      setOutput(`An unexpected error occurred: ${errorMessage}`);
      if (isSubmission) setSubmissionResult({ 
        status: 'Error', 
        message: `An unexpected framework error occurred: ${errorMessage}` 
      });
    } finally {
      if (isSubmission) setIsSubmitting(false);
      else setIsRunning(false);
    }
  };
  
  const handleRunCode = () => handleCodeExecution(false);
  const handleSubmitCode = () => handleCodeExecution(true);

  const handleGetHint = async () => {
    if (!problem || !code) return;
    setIsGettingHint(true);
    try {
        const result = await getHint({ problemTitle: problem.title, problemDescription: problem.description, userCode: code });
        setHint(result.hint);
    } catch (error) {
        console.error("Error getting hint:", error);
        toast({ title: "Error", description: "Could not fetch a hint at this time.", variant: "destructive" });
    } finally {
        setIsGettingHint(false);
    }
  };

  const handleReadyClick = async () => {
    if (!db || !currentUser || !id || isSettingReady) return;
    setIsSettingReady(true);

    const clashDocRef = doc(db, 'clashes', id);
    try {
        await runTransaction(db, async (transaction) => {
            const clashDoc = await transaction.get(clashDocRef);
            if (!clashDoc.exists()) {
                throw new Error("Clash document does not exist!");
            }
            
            const data = clashDoc.data() as ClashData;
            
            // Ensure all participant fields are defined to prevent Firebase errors
            const updatedParticipants = data.participants.map(p => {
                if (p.userId === currentUser.uid) {
                    return { 
                        userId: p.userId,
                        userName: p.userName || 'Anonymous',
                        userAvatar: p.userAvatar || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(p.userName || 'Anonymous')}&backgroundColor=e74c86&textColor=ffffff&radius=50`,
                        score: p.score || 0,
                        solvedTimestamp: p.solvedTimestamp || null,
                        ready: true
                    };
                }
                return {
                    userId: p.userId,
                    userName: p.userName || 'Anonymous',
                    userAvatar: p.userAvatar || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(p.userName || 'Anonymous')}&backgroundColor=e74c86&textColor=ffffff&radius=50`,
                    score: p.score || 0,
                    solvedTimestamp: p.solvedTimestamp || null,
                    ready: p.ready || false
                };
            });

            transaction.update(clashDocRef, { participants: updatedParticipants });
        });
    } catch (e) {
        console.error("Failed to set ready status:", e);
        toast({ title: "Error", description: "Could not set your ready status.", variant: "destructive" });
    } finally {
        setIsSettingReady(false);
    }
  };

  const handleSkipOpponent = () => {
    if (clashData?.topicId) {
        router.push(`/matching?topic=${clashData.topicId}`);
    } else {
        toast({ title: "Error", description: "Could not find a new opponent, returning to lobby.", variant: "destructive" });
        router.push('/lobby');
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progressValue = (timeLeft / (30 * 60)) * 100;

  // Function to determine if user can change tabs
  const canChangeTab = (value: string) => {
    // Always allow changing to test-result or testcases
    if (value === 'test-result' || value === 'testcases') return true;
    
    // For solution tab, check if user has submitted a solution or time has expired
    if (value === 'solution') {
      return me?.solvedTimestamp !== null || timeLeft <= 0;
    }
    
    return true;
  };

  // Function to record tab switching events in Firebase
  const recordTabSwitchEvent = async () => {
    if (!currentUser || !id || !db) return;
    
    try {
      // Record in a subcollection of the clash
      const tabSwitchRef = collection(db, 'clashes', id, 'tabSwitches');
      await addDoc(tabSwitchRef, {
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Anonymous',
        timestamp: serverTimestamp(),
        count: tabSwitchWarnings + 1,
        clientTimestamp: Date.now() // Backup client timestamp
      });
      
      // If this exceeds the maximum allowed tab switches, flag the clash
      if (tabSwitchWarnings + 1 >= maxTabSwitches) {
        // Update the clash document with a flag
        const clashDocRef = doc(db, 'clashes', id);
        await updateDoc(clashDocRef, {
          [`participants.${clashData?.participants.findIndex(p => p.userId === currentUser.uid)}.flagged`]: true,
          [`participants.${clashData?.participants.findIndex(p => p.userId === currentUser.uid)}.flagReason`]: 'Excessive tab switching'
        });
      }
    } catch (error) {
      console.error('Failed to record tab switch:', error);
    }
  };

  // Add visibility change detection
  useEffect(() => {
    if (!isClashActive || hasSubmittedSolution) return;
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User has switched tabs or minimized the window
        visibilityRef.current.isHidden = true;
        visibilityRef.current.lastHidden = Date.now();
        setTabSwitchTimestamp(Date.now());
        
        // If they haven't submitted yet and the clash is active
        if (!hasSubmittedSolution && isClashActive) {
          setTabSwitchWarnings(prev => prev + 1);
          setIsTabSwitchDialogOpen(true);
          
          // Record the tab switch event in Firebase
          recordTabSwitchEvent();
        }
      } else {
        // User has returned to the tab
        visibilityRef.current.isHidden = false;
        
        // If warning was shown, we can clear it now
        if (visibilityRef.current.warningShown) {
          visibilityRef.current.warningShown = false;
        }
      }
    };

    // Handle beforeunload event to warn users before they leave
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasSubmittedSolution && isClashActive) {
        // Standard way to show a confirmation dialog before leaving
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isClashActive, hasSubmittedSolution, tabSwitchWarnings, id, currentUser, clashData, db]);

  if (!clashData || !problem || !currentUser) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-4">Loading your clash...</p>
      </div>
    );
  }
  
  const RunButton = () => {
    const isDisabled = isRunning || isSubmitting || isTranslatingCode || !isClashActive;
    const button = <Button variant="secondary" onClick={handleRunCode} disabled={isDisabled}> {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Run </Button>;
    if (language !== 'javascript') {
        return <TooltipProvider><Tooltip><TooltipTrigger asChild><div tabIndex={0}>{button}</div></TooltipTrigger><TooltipContent><p>Execution for {language} is powered by AI.</p></TooltipContent></Tooltip></TooltipProvider>;
    }
    return button;
  };
  
  const SubmitButton = () => {
    const isDisabled = isRunning || isSubmitting || isTranslatingCode || !isClashActive;
    const button = <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSubmitCode} disabled={isDisabled}> {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit </Button>;
     if (language !== 'javascript') {
        return <TooltipProvider><Tooltip><TooltipTrigger asChild><div tabIndex={0}>{button}</div></TooltipTrigger><TooltipContent><p>Submission for {language} is powered by AI.</p></TooltipContent></Tooltip></TooltipProvider>;
    }
    return button;
  }

  const currentUserScore = me?.score ?? 0;

  const OpponentVideo = () => {
    // If this is a test user, show a static avatar instead of video
    if (opponent?.isTestUser) {
      return (
        <div className="relative aspect-video w-full bg-muted/30 rounded-lg overflow-hidden flex items-center justify-center">
          <div className="flex flex-col items-center justify-center">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary mb-2">
              <img 
                src={opponent.userAvatar} 
                alt={opponent.userName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-center">
              <p className="font-medium">{opponent.userName}</p>
              <p className="text-xs text-muted-foreground">Test Opponent</p>
            </div>
          </div>
        </div>
      );
    }
    
    // Create a local ref that will be used only in this component
    const videoContainerRef = useRef<HTMLDivElement>(null);
    const [videoError, setVideoError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [connectionState, setConnectionState] = useState<string | null>(null);
    const [videoStats, setVideoStats] = useState<{hasVideo: boolean, hasAudio: boolean} | null>(null);
    
    // Update connection state from peer connection
    useEffect(() => {
      if (!peerConnectionRef.current) return;
      
      const pc = peerConnectionRef.current;
      setConnectionState(pc.connectionState || pc.iceConnectionState || 'unknown');
      
      const handleConnectionChange = () => {
        setConnectionState(pc.connectionState || pc.iceConnectionState || 'unknown');
      };
      
      pc.addEventListener('connectionstatechange', handleConnectionChange);
      pc.addEventListener('iceconnectionstatechange', handleConnectionChange);
      
      return () => {
        pc.removeEventListener('connectionstatechange', handleConnectionChange);
        pc.removeEventListener('iceconnectionstatechange', handleConnectionChange);
      };
    }, []);
    
    const handleRetryConnection = () => {
      if (!peerConnectionRef.current) {
        console.log("No peer connection available for retry");
        return;
      }
      
      setIsConnecting(true);
      setVideoError(null);
      setRetryCount(prev => prev + 1);
      
      console.log("Manual connection retry initiated", { isCaller, retryCount: retryCount + 1 });
      
      // Close and recreate connection if we've tried multiple times
      if (retryCount >= 2 && peerConnectionRef.current) {
        console.log("Multiple retry attempts failed, closing and recreating connection");
        
        // Stop all tracks
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => track.stop());
        }
        
        // Close the connection
        peerConnectionRef.current.close();
        
        // Remove signaling data
        if (rtdb && currentUser && id) {
          const baseSignalingPath = `clash-video-signaling/${id}`;
          const mySignalingRef = ref(rtdb, `${baseSignalingPath}/${currentUser.uid}`);
          remove(mySignalingRef).catch(e => console.error("Error removing signaling ref:", e));
        }
        
        // Force reconnection by setting to null and back
        peerConnectionRef.current = null;
        setTimeout(() => {
          // This will trigger the WebRTC useEffect to run again
          setRemoteStream(null);
          setIsConnecting(true);
        }, 1000);
        
        return;
      }
      
      // Standard retry with ICE restart
      if (peerConnectionRef.current) {
        // Create a new offer with ICE restart
        peerConnectionRef.current.createOffer({ iceRestart: true })
          .then(offer => peerConnectionRef.current?.setLocalDescription(offer))
          .then(() => {
            if (!peerConnectionRef.current || !rtdb || !currentUser) return;
            
            const baseSignalingPath = `clash-video-signaling/${id}`;
            const mySignalingRef = ref(rtdb, `${baseSignalingPath}/${currentUser.uid}`);
            const offerPayload = { offer: peerConnectionRef.current.localDescription?.toJSON() };
            set(mySignalingRef, offerPayload);
            
            console.log("New offer with ICE restart sent for manual retry");
          })
          .catch(e => {
            console.error("Error creating retry offer:", e);
            setVideoError("Failed to create connection offer. Please try again.");
            setIsConnecting(false);
          });
      }
    };
    
    // Reset retry count when we get a stream
    useEffect(() => {
      if (remoteStream) {
        setRetryCount(0);
        setVideoError(null);
        
        // Update video stats
        setVideoStats({
          hasVideo: remoteStream.getVideoTracks().length > 0,
          hasAudio: remoteStream.getAudioTracks().length > 0
        });
        
        // Set up periodic stats check
        const statsInterval = setInterval(() => {
          if (remoteStream) {
            const hasVideo = remoteStream.getVideoTracks().some(track => 
              track.enabled && track.readyState === 'live'
            );
            const hasAudio = remoteStream.getAudioTracks().some(track => 
              track.enabled && track.readyState === 'live'
            );
            
            setVideoStats({ hasVideo, hasAudio });
          }
        }, 5000); // Check every 5 seconds
        
        return () => clearInterval(statsInterval);
      }
    }, [remoteStream]);
    
    // Listen for custom video track received event
    useEffect(() => {
      const handleVideoTrackReceived = (event: CustomEvent) => {
        console.log('OpponentVideo received video track event', event.detail);
        if (remoteVideoRef.current && remoteStream) {
          // Ensure the video element has the current stream
          if (remoteVideoRef.current.srcObject !== remoteStream) {
            console.log('Updating video srcObject with current remote stream');
            remoteVideoRef.current.srcObject = remoteStream;
          }
          
          // Force a play attempt
          const playPromise = remoteVideoRef.current.play();
          
          // Only add catch handler if it's a proper promise
          if (playPromise !== undefined) {
            playPromise.catch(err => {
              // Silently handle errors to avoid console messages
            });
          }
          
          // Update video stats
          setVideoStats({
            hasVideo: remoteStream.getVideoTracks().length > 0,
            hasAudio: remoteStream.getAudioTracks().length > 0
          });
        }
      };
      
      // TypeScript type assertion for CustomEvent
      window.addEventListener('webrtc-video-track-received', handleVideoTrackReceived as EventListener);
      
      return () => {
        window.removeEventListener('webrtc-video-track-received', handleVideoTrackReceived as EventListener);
      };
    }, [remoteStream]);
    
    // Ensure the video element stays in the document and plays correctly
    useEffect(() => {
      // Skip if no container
      if (!videoContainerRef.current) return;
      
      console.log('OpponentVideo component mounted', { hasStream: !!remoteStream });
      
      // Function to safely play the video
      const safePlayVideo = () => {
        if (remoteVideoRef.current && document.body.contains(remoteVideoRef.current)) {
          if (remoteVideoRef.current.paused && remoteStream) {
            console.log('Attempting to play video from event handler');
            
            // Store current srcObject to handle interruptions
            const currentStream = remoteVideoRef.current.srcObject;
            
            // Create a variable to track if we're in the middle of playing
            let isPlaying = false;
            
            const playPromise = remoteVideoRef.current.play();
            
            // Only add catch handler if it's a proper promise
            if (playPromise !== undefined) {
              // Mark that we're attempting to play
              isPlaying = true;
              
              playPromise.catch(err => {
                // Don't log the error to console to avoid the error message
                // Only set error state if it's not a user interaction error and not an interruption
                if (err.name !== 'NotAllowedError' && 
                    !(err.message && err.message.includes('interrupted')) && 
                    isPlaying) {
                  setVideoError(`Playback error: ${err.name}`);
                }
              });
            }
          }
        }
      };
      
      // Handle video errors
      const handleVideoError = (e: Event) => {
        console.error('Video error event:', e);
        setVideoError('Video playback error occurred');
      };
      
      // Handle video element events
      const handleVideoLoadedMetadata = () => {
        console.log('Video loadedmetadata event - video is ready to play');
        safePlayVideo();
      };
      
      const handleVideoCanPlay = () => {
        console.log('Video canplay event');
        safePlayVideo();
      };
      
      // Add event listeners for various user interactions that might pause the video
      const container = videoContainerRef.current;
      container.addEventListener('click', safePlayVideo);
      container.addEventListener('mousedown', safePlayVideo);
      container.addEventListener('touchstart', safePlayVideo);
      
      // Add video-specific event listeners if video element exists
      if (remoteVideoRef.current) {
        remoteVideoRef.current.addEventListener('error', handleVideoError);
        remoteVideoRef.current.addEventListener('loadedmetadata', handleVideoLoadedMetadata);
        remoteVideoRef.current.addEventListener('canplay', handleVideoCanPlay);
      }
      
      // Also periodically check if video is paused and try to resume it
      const intervalCheck = setInterval(() => {
        if (remoteVideoRef.current && document.body.contains(remoteVideoRef.current)) {
          // Check if we have a stream but video is not playing
          if (remoteStream && remoteVideoRef.current.paused) {
            console.log('Periodic check: video is paused, attempting to play');
            const playPromise = remoteVideoRef.current.play();
            
            // Only handle the promise if it's defined
            if (playPromise !== undefined) {
              // We don't need to do anything in the then() callback
              playPromise.catch(() => {
                // Silently fail as this is just a periodic check
              });
            }
          }
          
          // Check if we have a stream set but no srcObject
          if (remoteStream && !remoteVideoRef.current.srcObject) {
            console.log('Periodic check: video has no srcObject, setting it');
            remoteVideoRef.current.srcObject = remoteStream;
            safePlayVideo();
          }
        }
      }, 2000); // Check every 2 seconds
      
      return () => {
        // Clean up event listeners
        if (container) {
          container.removeEventListener('click', safePlayVideo);
          container.removeEventListener('mousedown', safePlayVideo);
          container.removeEventListener('touchstart', safePlayVideo);
        }
        
        // Clean up video-specific event listeners
        if (remoteVideoRef.current) {
          remoteVideoRef.current.removeEventListener('error', handleVideoError);
          remoteVideoRef.current.removeEventListener('loadedmetadata', handleVideoLoadedMetadata);
          remoteVideoRef.current.removeEventListener('canplay', handleVideoCanPlay);
        }
        
        clearInterval(intervalCheck);
        console.log('OpponentVideo component unmounted, cleaned up event listeners');
      };
    }, [remoteStream]);
    
    // Effect to handle stream changes and ensure video plays
    useEffect(() => {
      if (!remoteVideoRef.current || !remoteStream) return;
      
      console.log('Setting remote stream to video element');
      remoteVideoRef.current.srcObject = remoteStream;
      
      // Try to play the video
      const playPromise = remoteVideoRef.current.play();
      
      // Only add catch handler if it's a proper promise
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          // Don't log to console to avoid error messages
          // Only set error if it's not a user interaction error and not an interruption
          if (err.name !== 'NotAllowedError' && 
              !(err.message && err.message.includes('interrupted'))) {
            setVideoError(`Playback error: ${err.name}`);
          }
        });
      }
      
      return () => {
        // When stream changes or component unmounts, clean up
        if (remoteVideoRef.current) {
          // Keep the element but clear the stream
          remoteVideoRef.current.srcObject = null;
        }
      };
    }, [remoteStream]);
    
    // Helper function to get connection status color
    const getConnectionStatusColor = () => {
      if (!connectionState) return 'bg-gray-500';
      
      switch (connectionState) {
        case 'connected':
          return 'bg-green-500';
        case 'connecting':
        case 'checking':
          return 'bg-yellow-500';
        case 'disconnected':
        case 'failed':
        case 'closed':
          return 'bg-red-500';
        default:
          return 'bg-gray-500';
      }
    };
    
    return (
      <div 
        ref={videoContainerRef}
        className="relative aspect-video w-full bg-muted/30 rounded-lg flex items-center justify-center overflow-hidden"
        onClick={(e) => {
          // Prevent click from propagating
          e.stopPropagation();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Keep the video element always in the DOM, just hide it when no stream */}
        <video
          ref={remoteVideoRef}
          className={cn("w-full h-full object-cover", { 'opacity-0': !remoteStream })}
          autoPlay
          playsInline
          muted={false}
          disablePictureInPicture
          disableRemotePlayback
          controlsList="nodownload nofullscreen noremoteplayback"
          onClick={(e) => {
            e.stopPropagation();
            // Ensure video plays when clicked directly
            if (remoteVideoRef.current && remoteVideoRef.current.paused && remoteStream) {
              const playPromise = remoteVideoRef.current.play();
              
              // Only add catch handler if it's a proper promise
              if (playPromise !== undefined) {
                playPromise.catch(() => {
                  // Silently handle errors to avoid console messages
                });
              }
            }
          }}
        />
        {!remoteStream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-muted-foreground p-2">
            {isConnecting ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-xs">Connecting to opponent's video...</p>
                {connectionState && (
                  <div className="flex items-center gap-1 mt-1">
                    <div className={`h-2 w-2 rounded-full ${getConnectionStatusColor()}`}></div>
                    <p className="text-xs capitalize">{connectionState}</p>
                    {videoStats && (
                      <div className="flex items-center gap-1 ml-2">
                        {videoStats.hasVideo ? 
                          <Video className="h-3 w-3 text-green-400" /> : 
                          <CameraOff className="h-3 w-3 text-red-400" />}
                        {videoStats.hasAudio ? 
                          <Mic className="h-3 w-3 text-green-400" /> : 
                          <MicOff className="h-3 w-3 text-red-400" />}
                      </div>
                    )}
                  </div>
                )}
                {videoError && (
                  <p className="text-xs text-red-400 mt-1">{videoError}</p>
                )}
              </>
            ) : (
              <>
                <CameraOff className="h-8 w-8 mx-auto mb-2" />
                <p className="text-xs">Opponent video unavailable</p>
                {connectionState && (
                  <div className="flex items-center gap-1 mt-1">
                    <div className={`h-2 w-2 rounded-full ${getConnectionStatusColor()}`}></div>
                    <p className="text-xs capitalize">{connectionState}</p>
                    {videoStats && (
                      <div className="flex items-center gap-1 ml-2">
                        {videoStats.hasVideo ? 
                          <Video className="h-3 w-3 text-green-400" /> : 
                          <CameraOff className="h-3 w-3 text-red-400" />}
                        {videoStats.hasAudio ? 
                          <Mic className="h-3 w-3 text-green-400" /> : 
                          <MicOff className="h-3 w-3 text-red-400" />}
                      </div>
                    )}
                  </div>
                )}
                {videoError && (
                  <p className="text-xs text-red-400 mt-1">{videoError}</p>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRetryConnection();
                  }}
                >
                  <RefreshCw className="h-3 w-3 mr-1" /> Retry Connection
                </Button>
              </>
            )}
          </div>
        )}
        {/* Connection status indicator when video is showing */}
        {remoteStream && (
          <div className="absolute top-1 right-1 flex items-center gap-1.5 bg-black/60 text-white px-2 py-1 rounded text-xs">
            <div className="flex items-center gap-1">
              <div className={`h-2 w-2 rounded-full ${getConnectionStatusColor()}`}></div>
              <span className="text-xs capitalize hidden sm:inline">{connectionState || 'unknown'}</span>
            </div>
            {videoStats && (
              <div className="flex items-center gap-2 ml-1 border-l border-white/20 pl-2">
                <div className="flex items-center gap-0.5" title={videoStats.hasVideo ? 'Video active' : 'No video'}>
                  {videoStats.hasVideo ? 
                    <Video className="h-3 w-3 text-green-400" /> : 
                    <CameraOff className="h-3 w-3 text-red-400" />}
                </div>
                <div className="flex items-center gap-0.5" title={videoStats.hasAudio ? 'Audio active' : 'No audio'}>
                  {videoStats.hasAudio ? 
                    <Mic className="h-3 w-3 text-green-400" /> : 
                    <MicOff className="h-3 w-3 text-red-400" />}
                </div>
              </div>
            )}
          </div>
        )}
        {opponent && <div className="absolute bottom-1 left-2 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded">{opponent.userName}</div>}
      </div>
    );
  };

  return (
      <div className="flex flex-col min-h-dvh bg-transparent text-foreground font-body">
        <Header />
        
        {/* Tab Switch Warning Dialog */}
        <AlertDialog open={isTabSwitchDialogOpen} onOpenChange={setIsTabSwitchDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-500 flex items-center">
                <XCircle className="h-5 w-5 mr-2" />
                Tab Switch Detected!
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>You have switched away from the challenge tab. This may be considered cheating.</p>
                
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-3 text-amber-200">
                  <p className="font-medium">Warning {tabSwitchWarnings} of {maxTabSwitches}</p>
                  <p className="text-sm mt-1">Continued tab switching may result in disqualification.</p>
                </div>
                
                {tabSwitchWarnings >= maxTabSwitches && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-md p-3 text-red-200">
                    <p className="font-medium">Final warning!</p>
                    <p className="text-sm mt-1">Your activity has been flagged for review. Further violations may result in automatic disqualification.</p>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction>I understand</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        <main className="flex-1 flex flex-col p-4 gap-4">
        {!isClashActive ? (
            <Card className="bg-card/50 border border-white/10 rounded-xl shrink-0">
                <CardContent className="flex flex-col items-center justify-center p-6 gap-4 text-center">
                    <h2 className="text-2xl font-bold">Ready to Clash?</h2>
                    <p className="text-muted-foreground max-w-md">The timer will begin once both players are ready. Get your setup prepared and click the ready button when you're good to go.</p>
                    <div className="flex gap-8 md:gap-16 items-start my-4">
                        {clashData.participants.map(p => (
                            <div key={p.userId} className="flex flex-col items-center gap-2 w-32">
                                <Avatar className="h-20 w-20 border-4 data-[ready=true]:border-green-500 data-[ready=false]:border-primary" data-ready={p.ready}>
                                    <AvatarImage src={p.userAvatar} />
                                    <AvatarFallback>{p.userName.substring(0,2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span className="font-semibold truncate w-full">{p.userName} {p.userId === currentUser.uid && '(You)'}</span>
                                {p.ready ? (
                                    <div className="flex items-center justify-center gap-2 text-green-400 font-medium"><CheckCircle2 className="h-5 w-5"/> Ready</div>
                                ) : (
                                    <div className="flex items-center justify-center gap-2 text-yellow-400"><Loader2 className="animate-spin h-5 w-5"/> Waiting...</div>
                                )}
                            </div>
                        ))}
                    </div>

                    {me && !me.ready && (
                       <div className="flex items-center gap-4 mt-6">
                            <Button size="lg" onClick={handleReadyClick} disabled={isSettingReady} className="px-10 py-6 text-lg">
                               {isSettingReady ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5"/>}
                               I'm Ready!
                           </Button>
                            <Button size="lg" variant="outline" onClick={handleSkipOpponent} className="px-10 py-6 text-lg">
                               <RefreshCw className="mr-2 h-5 w-5" />
                               New Opponent
                           </Button>
                       </div>
                    )}
                </CardContent>
            </Card>
          ) : (
             <Card className="bg-card/50 border border-white/10 rounded-xl shrink-0">
                <CardContent className="flex justify-between items-center p-2">
                    <div className='flex items-center gap-4'>
                    <div className='flex items-center gap-3'>
                        <Avatar className="h-10 w-10 border-2 border-primary">
                        <AvatarImage src={currentUser?.photoURL || ''} data-ai-hint="man portrait" />
                        <AvatarFallback>ME</AvatarFallback>
                        </Avatar>
                        <div>
                        <p className="font-semibold">{currentUser?.displayName || 'You'}</p>
                        <p className="text-xs text-muted-foreground">Score: {currentUserScore}</p>
                        </div>
                    </div>
                    <div className='text-muted-foreground font-bold text-lg'>VS</div>
                    {opponent && <div className='flex items-center gap-3'>
                        <Avatar className="h-10 w-10">
                        <AvatarImage src={opponent.userAvatar} data-ai-hint="person coding" />
                        <AvatarFallback>{opponent.userName.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                        <p className="font-semibold">{opponent.userName}</p>
                        <p className="text-xs text-muted-foreground">Score: {opponent.score}</p>
                        </div>
                    </div>}
                    </div>
                    <div className="flex items-center gap-4">
                    <Timer className='h-6 w-6 text-primary' />
                    <div>
                        <p className="text-sm text-muted-foreground">Time Remaining</p>
                        <p className="font-mono text-xl font-bold tracking-widest">{formatTime(timeLeft)}</p>
                    </div>
                    </div>
                </CardContent>
                <Progress value={progressValue} className="w-full h-1 rounded-none" />
            </Card>
          )}

          <div className="flex-1 min-h-0">
            <PanelGroup direction="horizontal">
                <Panel defaultSize={35} minSize={25}>
                    <div className="h-full flex flex-col bg-card/50 border border-white/10 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-border/50 shrink-0 flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-primary"/>
                            <h1 className="text-xl font-bold">Problem</h1>
                        </div>
                        <div className="h-full overflow-y-auto p-4 pr-2">
                            <h2 className="text-2xl font-bold mb-2">{problem.title}</h2>
                            <div className='prose prose-invert max-w-none prose-p:text-muted-foreground prose-strong:text-foreground'>
                                <p className="whitespace-pre-wrap">{problem.description}</p>
                                {problem.examples && problem.examples.map((example, index) => (
                                    <div key={index}>
                                        <p><strong>Example {index + 1}:</strong></p>
                                        <pre className='mt-2 p-2 rounded-md bg-muted/50 text-base whitespace-pre-wrap font-code not-prose'>
                                            <code>
                                            <strong>Input:</strong> {example.input}<br/>
                                            <strong>Output:</strong> {example.output}
                                            {example.explanation && <><br/><strong>Explanation:</strong> {example.explanation}</>}
                                            </code>
                                        </pre>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Panel>
                <PanelResizeHandle className="w-2 bg-border/50 hover:bg-primary transition-colors data-[resize-handle-state=drag]:bg-primary" />
                <Panel defaultSize={40} minSize={30}>
                    <PanelGroup direction="vertical">
                        <Panel defaultSize={60} minSize={25}>
                            <div className="h-full flex flex-col bg-card/50 border border-white/10 rounded-xl min-h-0 overflow-hidden">
                                <div className="p-2 border-b border-border flex items-center justify-between shrink-0">
                                    <Select value={language} onValueChange={handleLanguageChange} disabled={isRunning || isSubmitting || isTranslatingCode}>
                                        <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Select Language" /></SelectTrigger>
                                        <SelectContent>{languages.map((lang) => (<SelectItem key={lang} value={lang} className='capitalize'>{lang.charAt(0).toUpperCase() + lang.slice(1)}</SelectItem>))}</SelectContent>
                                    </Select>
                                    <Button variant="outline" size="sm" onClick={handleGetHint} disabled={isRunning || isSubmitting || isGettingHint || isTranslatingCode}>
                                        {isGettingHint ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />} Hint
                                    </Button>
                                </div>
                                <div className="flex-1 min-h-0 relative">
                                    {isTranslatingCode && (
                                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 text-foreground rounded-md">
                                            <Loader2 className="h-8 w-8 animate-spin" />
                                            <p className="mt-2 text-sm">Generating {language} template...</p>
                                        </div>
                                    )}
                                    <CodeEditor key={language} language={language} value={code} onChange={(value) => setCode(value || '')} disabled={isRunning || isSubmitting || isTranslatingCode} />
                                </div>
                            </div>
                        </Panel>
                        <PanelResizeHandle className="h-2 bg-border/50 hover:bg-primary transition-colors data-[resize-handle-state=drag]:bg-primary" />
                        <Panel defaultSize={40} minSize={25}>
                            <div className="h-full flex flex-col bg-card/50 border border-white/10 rounded-xl overflow-hidden">
                                <Tabs 
                                  value={consoleTab} 
                                  onValueChange={(value) => {
                                    if (canChangeTab(value)) {
                                      setConsoleTab(value);
                                    } else {
                                      toast({ 
                                        title: "Cannot switch tab", 
                                        description: "You need to submit your solution or wait for the challenge to end to access this tab.",
                                        variant: "destructive" 
                                      });
                                    }
                                  }} 
                                  className="flex-1 flex flex-col min-h-0"
                                >
                                    <div className='p-2 border-b border-border/50 shrink-0'>
                                        <TabsList className="grid w-full grid-cols-3">
                                            <TabsTrigger value="test-result"><Terminal className="mr-2 h-4 w-4"/>Test Result</TabsTrigger>
                                            <TabsTrigger value="testcases"><TestTube2 className="mr-2 h-4 w-4"/>Testcases</TabsTrigger>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <TabsTrigger 
                                                            value="solution" 
                                                            disabled={!me?.solvedTimestamp && timeLeft > 0}
                                                            className={(!me?.solvedTimestamp && timeLeft > 0) ? 
                                                                "relative border border-amber-500/30 bg-amber-500/10 text-amber-200 opacity-80" : 
                                                                ""}
                                                        >
                                                            {(!me?.solvedTimestamp && timeLeft > 0) ? (
                                                                <>
                                                                    <Lock className="mr-2 h-4 w-4 text-amber-400" />
                                                                    <span>Solution</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                                                    <span>Solution</span>
                                                                </>
                                                            )}
                                                        </TabsTrigger>
                                                    </TooltipTrigger>
                                                    {(!me?.solvedTimestamp && timeLeft > 0) && (
                                                        <TooltipContent className="max-w-xs">
                                                            <p>
                                                                <span className="font-bold text-amber-400">Locked</span>: You must submit a correct solution or wait for the challenge timer to end before accessing the solution tab.
                                                            </p>
                                                        </TooltipContent>
                                                    )}
                                                </Tooltip>
                                            </TooltipProvider>
                                        </TabsList>
                                    </div>
                                    <div className="flex-1 min-h-0">
                                        <TabsContent value="test-result" className="m-0 h-full overflow-y-auto p-4">
                                            {typeof output === 'string' ? (
                                                <pre className="whitespace-pre-wrap font-code text-sm"><code>{output}</code></pre>
                                            ) : (
                                                <>
                                                    {/* Performance Analysis Display */}
                                                    {performanceAnalysis && (
                                                        <div className="mb-4 p-4 bg-card/50 border border-primary/30 rounded-lg shadow-lg backdrop-blur-sm">
                                                            <h3 className="font-bold text-primary mb-2 flex items-center">
                                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2"><path d="m22 12-4 4-4-4"/><path d="M12 18V2"/><rect width="20" height="3" x="2" y="20" rx="1"/></svg>
                                                                Performance Analysis
                                                            </h3>
                                                            
                                                            <div className="space-y-2 text-sm">
                                                                {performanceAnalysis.timeComplexity && (
                                                                    <div className="flex items-center gap-2 bg-background/40 p-2 rounded-md border border-border/50">
                                                                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                                            <Clock className="h-4 w-4 text-primary" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-xs text-muted-foreground">Time Complexity</p>
                                                                            <p className="font-mono font-bold">{performanceAnalysis.timeComplexity}</p>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                
                                                                {performanceAnalysis.spaceComplexity && (
                                                                    <div className="flex items-center gap-2 bg-background/40 p-2 rounded-md border border-border/50">
                                                                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center">
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-accent"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.29 7 12 12 20.71 7"></polyline><line x1="12" y1="22" x2="12" y2="12"></line></svg>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-xs text-muted-foreground">Space Complexity</p>
                                                                            <p className="font-mono font-bold">{performanceAnalysis.spaceComplexity}</p>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                
                                                                {performanceAnalysis.suggestions && performanceAnalysis.suggestions.length > 0 && (
                                                                    <div className="mt-3 bg-background/40 p-3 rounded-md border border-border/50">
                                                                        <p className="text-sm font-semibold mb-2 flex items-center">
                                                                            <Lightbulb className="h-4 w-4 mr-2 text-yellow-400" />
                                                                            Improvement Suggestions
                                                                        </p>
                                                                        <ul className="space-y-1.5">
                                                                            {performanceAnalysis.suggestions.map((suggestion, i) => (
                                                                                <li key={i} className="flex items-start gap-2">
                                                                                    <span className="inline-block mt-1 w-1.5 h-1.5 rounded-full bg-yellow-500 mr-1"></span>
                                                                                    <span className="text-sm text-muted-foreground">{suggestion}</span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Summary of results */}
                                                    <div className="mb-4 flex items-center justify-between">
                                                        <div className="font-bold text-base">
                                                            {output.filter(r => r.passed).length}/{output.length} Tests Passed
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            Average Runtime: {
                                                                (output.reduce((acc, curr) => acc + parseFloat(curr.runtime), 0) / output.length).toFixed(2)
                                                            }ms
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="space-y-4 font-code text-sm">
                                                        {output.map((res, index) => (
                                                            <div key={index} className={`border rounded-lg p-3 shadow-md ${res.passed ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                                                <div className="flex items-center justify-between gap-2 font-bold mb-2">
                                                                    <div className="flex items-center gap-2">
                                                                        {res.passed ? 
                                                                            <CheckCircle2 className="h-5 w-5 text-green-500" /> : 
                                                                            <XCircle className="h-5 w-5 text-red-500" />
                                                                        }
                                                                        <span className={cn(res.passed ? "text-green-400" : "text-red-400")}>
                                                                            Case {res.case}: {res.passed ? 'Passed' : 'Failed'}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-xs bg-background/40 px-2 py-0.5 rounded-full text-muted-foreground">{res.runtime}</span>
                                                                </div>
                                                                <div className='space-y-2 pl-7 text-xs'>
                                                                    <div className="bg-card/50 p-2 rounded-md border border-border/50">
                                                                        <p className="flex items-center mb-1">
                                                                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-1.5"></span>
                                                                            <span className="text-muted-foreground font-semibold">Input:</span>
                                                                        </p>
                                                                        <div className="pl-4 font-mono">{formatArgsForDisplay(JSON.parse(res.input))}</div>
                                                                    </div>
                                                                    
                                                                    <div className="bg-card/50 p-2 rounded-md border border-border/50">
                                                                        <p className="flex items-center mb-1">
                                                                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></span>
                                                                            <span className="text-muted-foreground font-semibold">Output:</span>
                                                                        </p>
                                                                        <div className="pl-4 font-mono">{res.output}</div>
                                                                    </div>
                                                                    
                                                                    {!res.passed && (
                                                                        <div className="bg-card/50 p-2 rounded-md border border-border/50">
                                                                            <p className="flex items-center mb-1">
                                                                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                                                                                <span className="text-muted-foreground font-semibold">Expected:</span>
                                                                            </p>
                                                                            <div className="pl-4 font-mono">{res.expected}</div>
                                                                        </div>
                                                                    )}
                                                                    
                                                                    {res.explanation && (
                                                                        <div className="bg-card/30 p-2 rounded-md border border-border/30">
                                                                            <p className="flex items-center mb-1">
                                                                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-500 mr-1.5"></span>
                                                                                <span className="text-muted-foreground font-semibold">Explanation:</span>
                                                                            </p>
                                                                            <div className="pl-4 italic text-muted-foreground">{res.explanation}</div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </TabsContent>
                                        <TabsContent value="testcases" className="m-0 h-full overflow-y-auto p-4">
                                        <div className="mb-4 p-4 bg-card/50 border border-primary/30 rounded-lg shadow-lg backdrop-blur-sm">
                                            <h3 className="font-bold text-primary mb-2 flex items-center">
                                                <TestTube2 className="w-5 h-5 mr-2" />
                                                Test Cases Information
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                The problem includes {problem?.testCases.length} test cases in total. 
                                                {problem?.testCases.length > 3 && ` Below are the first ${submissionResult ? 'five' : 'three'} test cases to help you understand the problem.`}
                                                <br />
                                                When you submit your solution, it will be tested against all test cases.
                                            </p>
                                        </div>
                                        
                                        <div className="space-y-4 font-code text-base">
                                            {problem?.testCases.slice(0, submissionResult ? 5 : 3).map((tc, index) => (
                                                <div key={index} className="border border-border/50 rounded-lg overflow-hidden shadow-md transition-all duration-300 hover:shadow-primary/20 hover:border-primary/30">
                                                    <div className="bg-primary/10 p-3 flex justify-between items-center">
                                                        <p className="font-bold text-primary flex items-center">
                                                            <TestTube2 className="h-4 w-4 mr-2" />
                                                            Test Case {index + 1}
                                                        </p>
                                                        <div className="text-xs bg-background/40 px-2 py-0.5 rounded-full text-muted-foreground">
                                                            {index < 3 ? "Example" : "Hidden"}
                                                        </div>
                                                    </div>
                                                    <div className="bg-background/40 p-4 space-y-3">
                                                        <div>
                                                            <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center">
                                                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-1.5"></span>
                                                                Input:
                                                            </div>
                                                            <div className="bg-card/50 p-3 rounded-md overflow-x-auto border border-border/50">
                                                                {formatArgsForDisplay(tc.input)}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center">
                                                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                                                                Expected Output:
                                                            </div>
                                                            <div className="bg-card/50 p-3 rounded-md overflow-x-auto border border-border/50">
                                                                {formatValueForDisplay(tc.expected)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        </TabsContent>
                                        <TabsContent value="solution" className="m-0 h-full flex flex-col">
                                            <div className="p-2 border-b border-border flex items-center justify-end shrink-0">
                                                    <Select value={solutionLanguage} onValueChange={handleSolutionLanguageChange} disabled={isTranslatingSolution}>
                                                        <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Select Language" /></SelectTrigger>
                                                        <SelectContent>{languages.map((lang) => (<SelectItem key={lang} value={lang} className='capitalize'>{lang.charAt(0).toUpperCase() + lang.slice(1)}</SelectItem>))}</SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="flex-1 min-h-0 relative">
                                                    {isTranslatingSolution && (
                                                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 text-foreground rounded-md">
                                                            <Loader2 className="h-8 w-8 animate-spin" />
                                                            <p className="mt-2 text-sm">Translating to {solutionLanguage}...</p>
                                                        </div>
                                                    )}
                                                    <CodeEditor key={`solution-${solutionLanguage}`} language={solutionLanguage} value={solutionCode} onChange={() => {}} disabled={true} />
                                                </div>
                                        </TabsContent>
                                    </div>
                                </Tabs>
                                <div className='flex justify-end p-2 border-t border-t-border/50 gap-2 shrink-0'>
                                    <RunButton />
                                    <SubmitButton />
                                </div>
                            </div>
                        </Panel>
                    </PanelGroup>
                </Panel>
                 <PanelResizeHandle className="w-2 bg-border/50 hover:bg-primary transition-colors data-[resize-handle-state=drag]:bg-primary" />
                <Panel defaultSize={25} minSize={20}>
                    <div
                      className="h-full flex flex-col bg-background border border-border rounded-xl overflow-hidden shadow-2xl"
                      style={{ boxShadow: '0 8px 32px 0 rgba(148,180,159,0.15)' }}
                    >
                        <div className="p-4 border-b border-border/50 shrink-0 flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-primary"/>
                            <h1 className="text-xl font-bold">Chat & Video</h1>
                        </div>
                        <div className="p-4">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="aspect-video w-full flex items-center justify-center">
                                    <UserVideo />
                                </div>
                                <div className="aspect-video w-full flex items-center justify-center">
                                    <OpponentVideo />
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col min-h-0 border-t border-border/50 pt-2 px-4 pb-4">
                            <div className="flex-1 pr-2 -mr-2 overflow-y-auto">
                                <div className="space-y-4 text-sm pr-2">
                                {messages.map((message) => {
                                    const isMe = message.senderId === currentUser?.uid;
                                    return (
                                    <div key={message.id} className={cn('flex items-start gap-2.5', isMe && 'flex-row-reverse')}>
                                        <Avatar className="h-8 w-8 shrink-0">
                                            <AvatarImage src={message.senderAvatar} data-ai-hint={isMe ? "man portrait" : "woman portrait"}/>
                                            <AvatarFallback>{message.senderName.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div
                                          className={cn(
                                            'inline-block flex flex-col leading-1.5 p-3',
                                            isMe
                                              ? 'rounded-l-xl rounded-t-xl'
                                              : 'rounded-r-xl rounded-t-xl',
                                            'bg-background border border-border shadow',
                                            isMe
                                              ? 'text-primary-foreground'
                                              : 'text-card-foreground'
                                          )}
                                          style={{
                                            boxShadow: '0 2px 16px 0 rgba(148,180,159,0.12)',
                                            maxWidth: '80%',
                                            wordBreak: 'break-word',
                                            width: 'fit-content',
                                            minWidth: '48px',
                                          }}
                                        >
                                          {!isMe && <p className="text-sm font-semibold text-card-foreground pb-1">{message.senderName}</p>}
                                          <p className="text-sm font-normal break-words">{message.text}</p>
                                        </div>
                                    </div>
                                    );
                                })}
                                <div ref={endOfMessagesRef} />
                                </div>
                            </div>
                            <div className="mt-2 flex gap-2 shrink-0">
                                <Input
                                  className="bg-background border border-border shadow-inner text-foreground placeholder:text-muted-foreground rounded-xl"
                                  placeholder="Send a message..."
                                  value={newMessage}
                                  onChange={(e) => setNewMessage(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                />
                                <Button variant="secondary" size="icon" onClick={handleSendMessage} disabled={!newMessage.trim()}>
                                  <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </Panel>
            </PanelGroup>
          </div>
        </main>
        
        <AlertDialog open={!!hint} onOpenChange={(open) => !open && setHint(null)}>
          <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Here's a Hint!</AlertDialogTitle><AlertDialogDescription>{hint}</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogAction onClick={() => setHint(null)}>Got it!</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

       <AlertDialog open={!!submissionResult} onOpenChange={(open) => !open && setSubmissionResult(null)}>
        <AlertDialogContent className="max-w-[600px] max-h-[90vh] overflow-auto">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl"></div>
            </div>
            
            <div className="relative">
                <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-4">
                        {submissionResult?.status === 'Accepted' && (
                            <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                                <CheckCircle2 className="h-7 w-7 text-green-500" />
                            </div>
                        )}
                        {submissionResult?.status === 'Wrong Answer' && (
                            <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
                                <XCircle className="h-7 w-7 text-red-500" />
                            </div>
                        )}
                        {submissionResult?.status === 'Error' && (
                            <div className="h-12 w-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-yellow-500"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                            </div>
                        )}
                        <AlertDialogTitle className={cn(
                            "text-2xl font-bold",
                            submissionResult?.status === 'Accepted' && 'text-green-500',
                            submissionResult?.status === 'Wrong Answer' && 'text-red-500',
                            submissionResult?.status === 'Error' && 'text-yellow-500',
                        )}>{submissionResult?.status}</AlertDialogTitle>
                    </div>
                    
                    <div className="whitespace-pre-wrap bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-4 shadow-md">
                        <AlertDialogDescription className="text-base text-foreground">
                            {submissionResult?.message}
                        </AlertDialogDescription>
                    </div>
                </AlertDialogHeader>
                
                {/* Performance Analysis */}
                {submissionResult?.performance && (
                    <div className="mt-6 p-4 bg-card/50 border border-primary/30 rounded-lg shadow-lg backdrop-blur-sm">
                        <h3 className="font-bold text-primary mb-3 flex items-center text-base">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2"><path d="m22 12-4 4-4-4"/><path d="M12 18V2"/><rect width="20" height="3" x="2" y="20" rx="1"/></svg>
                            Performance Analysis
                        </h3>
                        
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {submissionResult.performance.timeComplexity && (
                                    <div className="flex items-center gap-3 bg-background/40 p-3 rounded-md border border-border/50">
                                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Clock className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Time Complexity</p>
                                            <p className="font-mono font-bold">{submissionResult.performance.timeComplexity}</p>
                                        </div>
                                    </div>
                                )}
                                
                                {submissionResult.performance.spaceComplexity && (
                                    <div className="flex items-center gap-3 bg-background/40 p-3 rounded-md border border-border/50">
                                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-accent"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.29 7 12 12 20.71 7"></polyline><line x1="12" y1="22" x2="12" y2="12"></line></svg>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Space Complexity</p>
                                            <p className="font-mono font-bold">{submissionResult.performance.spaceComplexity}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {submissionResult.performance.suggestions && submissionResult.performance.suggestions.length > 0 && (
                                <div className="mt-3 bg-background/40 p-3 rounded-md border border-border/50">
                                    <p className="text-sm font-semibold mb-2 flex items-center">
                                        <Lightbulb className="h-4 w-4 mr-2 text-yellow-400" />
                                        Improvement Suggestions
                                    </p>
                                    <ul className="space-y-1.5">
                                        {submissionResult.performance.suggestions.map((suggestion, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <span className="inline-block mt-1 w-1.5 h-1.5 rounded-full bg-yellow-500 mr-1"></span>
                                                <span className="text-sm text-muted-foreground">{suggestion}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {/* Next steps */}
                <div className="mt-6 p-4 bg-card/50 border border-border/50 rounded-lg shadow-md backdrop-blur-sm">
                    <h3 className="font-bold mb-3 text-base flex items-center">
                        <ChevronRight className="h-5 w-5 mr-2 text-primary" />
                        Next Steps
                    </h3>
                    <ul className="space-y-2">
                        {submissionResult?.status === 'Accepted' ? (
                            <>
                                <li className="flex items-start gap-2">
                                    <span className="inline-block mt-1 w-1.5 h-1.5 rounded-full bg-primary mr-1.5"></span>
                                    <span>View the optimal solution in the "Solution" tab</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="inline-block mt-1 w-1.5 h-1.5 rounded-full bg-primary mr-1.5"></span>
                                    <span>Challenge another player</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="inline-block mt-1 w-1.5 h-1.5 rounded-full bg-primary mr-1.5"></span>
                                    <span>Try another problem</span>
                                </li>
                            </>
                        ) : (
                            <>
                                <li className="flex items-start gap-2">
                                    <span className="inline-block mt-1 w-1.5 h-1.5 rounded-full bg-primary mr-1.5"></span>
                                    <span>Review your code for logic errors</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="inline-block mt-1 w-1.5 h-1.5 rounded-full bg-primary mr-1.5"></span>
                                    <span>Check test cases for edge cases you missed</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="inline-block mt-1 w-1.5 h-1.5 rounded-full bg-primary mr-1.5"></span>
                                    <span>Try getting a hint if you're stuck</span>
                                </li>
                            </>
                        )}
                    </ul>
                </div>
                
                <AlertDialogFooter className="mt-6">
                    <AlertDialogAction 
                        onClick={() => setSubmissionResult(null)}
                        className={cn(
                            "px-8 py-2 shadow-lg transition-all duration-300",
                            submissionResult?.status === 'Accepted' && 'bg-green-600 hover:bg-green-700 hover:shadow-green-500/20',
                            submissionResult?.status === 'Wrong Answer' && 'bg-primary hover:bg-primary/90 hover:shadow-primary/20',
                            submissionResult?.status === 'Error' && 'bg-yellow-600 hover:bg-yellow-700 hover:shadow-yellow-500/20',
                        )}
                    >
                        {submissionResult?.status === 'Accepted' ? 'Continue' : 'Try Again'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Victory Dialog */}
      <AlertDialog open={showVictoryDialog} onOpenChange={(open) => !open && setShowVictoryDialog(false)}>
        <AlertDialogContent className="max-w-[600px] max-h-[90vh] overflow-auto">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-accent/20 rounded-full blur-3xl"></div>
            </div>
            
            <div className="relative">
                <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center opacity-10 pointer-events-none">
                    <Trophy className="w-60 h-60 text-primary" />
                </div>
                
                <div className="text-center py-6">
                    <div className="flex justify-center mb-4">
                        {victoryData?.isFirstSolver ? (
                            <div className="relative">
                                <Trophy className="h-20 w-20 text-yellow-400" />
                                <Sparkles className="absolute top-0 right-0 h-6 w-6 text-yellow-300" />
                            </div>
                        ) : (
                            <Trophy className="h-20 w-20 text-primary" />
                        )}
                    </div>
                    
                    <h2 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary">
                        Victory!
                    </h2>
                    
                    <p className="text-xl mb-6">You've solved the challenge!</p>
                    
                    <div className="bg-card/50 backdrop-blur-sm border border-primary/20 rounded-lg p-6 mb-6 shadow-lg">
                        <div className="text-4xl font-bold text-primary mb-2">+{victoryData?.score}</div>
                        <p className="text-muted-foreground">Points Earned</p>
                        
                        {victoryData?.isFirstSolver && (
                            <div className="mt-4 flex items-center justify-center gap-2 text-yellow-400">
                                <Star className="h-5 w-5" />
                                <span className="font-semibold">First Solver Bonus!</span>
                                <Star className="h-5 w-5" />
                            </div>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-lg p-4">
                            <div className="text-muted-foreground mb-1">Completion Time</div>
                            <div className="text-xl font-mono">{formatTime(30 * 60 - timeLeft)}</div>
                        </div>
                        
                        <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-lg p-4">
                            <div className="text-muted-foreground mb-1">Opponent Status</div>
                            <div className="text-xl">
                                {victoryData?.opponentSolved ? (
                                    <span className="text-yellow-400">Also Solved</span>
                                ) : (
                                    <span className="text-green-400">Not Solved</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                
                <AlertDialogFooter className="flex gap-4">
                    <Button 
                        variant="outline" 
                        onClick={() => {
                            setShowVictoryDialog(false);
                            router.push('/leaderboard');
                        }}
                        className="flex-1"
                    >
                        View Leaderboard
                    </Button>
                    <Button 
                        onClick={() => {
                            setShowVictoryDialog(false);
                            router.push('/lobby');
                        }}
                        className="flex-1 bg-primary hover:bg-primary/90"
                    >
                        New Challenge
                    </Button>
                </AlertDialogFooter>
            </div>
        </AlertDialogContent>
      </AlertDialog>
      </div>
  );
}
