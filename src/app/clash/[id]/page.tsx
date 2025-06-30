'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import AuthGuard from '@/components/AuthGuard';
import { BookOpen, Code, Send, Users, Timer, Star, ThumbsUp, Video, CameraOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Problem } from '@/lib/problems';

interface Participant {
  userId: string;
  userName: string;
  userAvatar: string;
}

interface ClashData {
  topicId: string;
  problem: Problem;
  participants: Participant[];
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: any;
}

export default function ClashPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  
  const [clashData, setClashData] = useState<ClashData | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [opponent, setOpponent] = useState<Participant | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('Click "Run Code" to see the output here.');
  const [isRunning, setIsRunning] = useState(false);
  
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Get clash data and opponent info
  useEffect(() => {
    if (!db || !auth.currentUser || !id) return;
    
    const getClashData = async () => {
      const clashDocRef = doc(db, 'clashes', id);
      const docSnap = await getDoc(clashDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as ClashData;
        
        // The problem's test case inputs are stored as JSON strings in Firestore
        // to avoid issues with nested arrays. We need to parse them back.
        if (data.problem && data.problem.testCases) {
          const parsedTestCases = data.problem.testCases.map(tc => {
            try {
              // Ensure we only parse if it's a string, making it idempotent
              const parsedInput = typeof tc.input === 'string' ? JSON.parse(tc.input) : tc.input;
              return { ...tc, input: parsedInput };
            } catch (e) {
              console.error("Failed to parse test case input:", e);
              // Return original test case if parsing fails
              return tc; 
            }
          });
          data.problem = { ...data.problem, testCases: parsedTestCases };
        }
        
        setClashData(data);
        
        if (data.problem) {
          setProblem(data.problem);
          setCode(data.problem.starterCode);
        } else {
          toast({ title: "Problem not found", description: "The problem for this clash is missing.", variant: 'destructive' });
          router.push('/lobby');
          return;
        }

        const opponentParticipant = data.participants.find(p => p.userId !== auth.currentUser?.uid);
        if (opponentParticipant) {
          setOpponent(opponentParticipant);
        } else {
           toast({ title: "Opponent not found", description: "Could not find opponent data in this clash.", variant: 'destructive' });
        }
      } else {
        toast({ title: "Clash not found", description: "This clash does not exist or has been deleted.", variant: 'destructive' });
        router.push('/lobby');
      }
    };
    getClashData();
  }, [id, router, toast]);

  // Chat listener
  useEffect(() => {
    if (!db || !id) return;
    const chatRef = collection(db, 'clashes', id, 'chat');
    const q = query(chatRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const chatMessages: Message[] = [];
      querySnapshot.forEach((doc) => {
        chatMessages.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(chatMessages);
    });

    return () => unsubscribe();
  }, [id]);


  // Scroll to bottom of chat
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);
  
  // Camera permission
  useEffect(() => {
    const getCameraPermission = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setHasCameraPermission(false);
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
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleSendMessage = async () => {
    if (newMessage.trim() === '' || !db || !auth.currentUser || !id) return;
    
    const chatRef = collection(db, 'clashes', id, 'chat');
    await addDoc(chatRef, {
      text: newMessage.trim(),
      senderId: auth.currentUser.uid,
      senderName: auth.currentUser.displayName || 'Anonymous',
      senderAvatar: auth.currentUser.photoURL || 'https://placehold.co/32x32.png',
      timestamp: serverTimestamp(),
    });
    setNewMessage('');
  };

  const handleRunCode = () => {
    if (!clashData || !problem) return;
    
    setOutput('Running test cases...');
    setIsRunning(true);
    
    // This is a highly simplified and insecure way to run code.
    // In a real application, this should be done in a sandboxed environment (e.g., a web worker or a secure backend service).
    setTimeout(() => {
        try {
            if (!problem.entryPoint || !problem.testCases || problem.testCases.length === 0) {
                setOutput('Error: The problem is missing an entry point or test cases. Cannot execute code.');
                setIsRunning(false);
                return;
            }

            const funcName = problem.entryPoint;
            
            // This is still unsafe for production but required for this execution model.
            // It assumes the user's code makes the function available on the global scope or returns it.
            const userFunc = new Function('return ' + code)()[funcName];
            
            if (typeof userFunc !== 'function') {
                setOutput(`Error: Could not find function "${funcName}". Make sure your function is defined correctly as a variable (e.g., var ${funcName} = function(...) ...).`);
                setIsRunning(false);
                return;
            }

            const testCases = problem.testCases;
            let results = `Running tests for "${problem.title}"...\n\n`;
            let allPassed = true;

            testCases.forEach((testCase, index) => {
                const result = userFunc(...testCase.input);
                
                // Deep comparison for arrays/objects. Also sorts arrays to handle order differences.
                let processedResult = result;
                let processedExpected = testCase.expected;

                if (Array.isArray(result) && Array.isArray(testCase.expected)) {
                    // Create copies before sorting to avoid mutating original data.
                    // This is a shallow sort, which is fine for arrays of primitives.
                    try {
                      processedResult = [...result].sort();
                      processedExpected = [...testCase.expected].sort();
                    } catch (e) {
                      // Sorting might fail if array contains non-sortable items. Fallback to unsorted.
                    }
                }
                
                const passed = JSON.stringify(processedResult) === JSON.stringify(processedExpected);

                if (!passed) allPassed = false;

                results += `Case ${index + 1}: ${passed ? '✅ Passed' : '❌ Failed'}\n`;
                results += `  Input:    ${JSON.stringify(testCase.input)}\n`;
                results += `  Output:   ${JSON.stringify(result)}\n`;
                results += `  Expected: ${JSON.stringify(testCase.expected)}\n\n`;
            });

            results += allPassed ? 'All test cases passed!' : 'Some test cases failed.';
            setOutput(results);
        } catch (error: any) {
            setOutput(`An error occurred during execution:\n${error.name}: ${error.message}`);
        } finally {
            setIsRunning(false);
        }
    }, 500);
  };
  
  const handleSubmitCode = () => {
    toast({
        title: "Code Submitted!",
        description: "Your solution has been submitted for evaluation.",
    });
    // In a real app, this would save the submission to Firestore and run tests on a server.
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progressValue = (timeLeft / (30 * 60)) * 100;

  if (!clashData || !opponent || !problem) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-4">Loading your clash...</p>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-dvh bg-transparent text-foreground font-body">
        <Header />
        <main className="flex-1 container mx-auto py-6 px-4 flex flex-col">
          <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
            {/* Left Panel */}
            <div className="w-full lg:w-1/4 flex flex-col gap-6">
              <Card className="flex-1 flex flex-col bg-card/50 backdrop-blur-lg border border-white/10 rounded-2xl min-h-0">
                <CardHeader className="flex-row items-center gap-4">
                  <BookOpen className="h-6 w-6 text-primary" />
                  <CardTitle>Problem</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col pt-0 min-h-0">
                  <ScrollArea className="flex-1 pr-4 -mr-4">
                    <div className="pr-4 pb-6">
                      <h3 className="font-bold text-lg mb-2 capitalize">{problem.title}</h3>
                      <p className="text-muted-foreground mb-4 whitespace-pre-line">
                        {problem.description}
                      </p>
                      <div className="text-sm space-y-3">
                        <p><strong className='text-foreground'>Example:</strong></p>
                        <pre className='p-2 rounded-md bg-muted/50 text-xs'>
                          <code>
                            Input: {problem.example.input}<br/>
                            Output: {problem.example.output}
                            {problem.example.explanation && <><br/>Explanation: {problem.example.explanation}</>}
                          </code>
                        </pre>
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
              <Card className="bg-card/50 backdrop-blur-lg border border-white/10 rounded-2xl">
                <CardHeader className='flex-row items-center gap-4'>
                  <Timer className='h-6 w-6 text-primary' />
                  <CardTitle>Time Remaining</CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={progressValue} className="w-full h-3 mb-2" />
                  <p className="text-center font-mono text-2xl font-bold tracking-widest">{formatTime(timeLeft)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Middle Panel */}
            <div className="w-full lg:w-1/2 flex flex-col min-h-0">
              <Card className="flex-1 flex flex-col bg-card/50 backdrop-blur-lg border border-white/10 rounded-2xl min-h-0">
                <CardHeader className="flex-row items-center gap-4">
                  <Code className="h-6 w-6 text-primary" />
                  <CardTitle>Solution</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-0 min-h-0">
                   {/* Editor Pane */}
                   <div className="flex-[3_1_0] flex flex-col p-6 pb-0 min-h-0">
                     <Textarea
                        placeholder="Enter your code here..."
                        className="flex-1 w-full p-4 bg-muted/30 border-white/10 font-code text-base resize-none"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        disabled={isRunning}
                      />
                      <div className='flex justify-end mt-4 gap-2'>
                          <Button variant="secondary" onClick={handleRunCode} disabled={isRunning}>
                              {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Run Code
                          </Button>
                          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSubmitCode} disabled={isRunning}>Submit</Button>
                      </div>
                   </div>
                   {/* Console Pane */}
                   <div className="flex-[2_1_0] border-t border-border/50 p-6 flex flex-col min-h-0">
                      <h3 className="text-lg font-semibold mb-2">Console</h3>
                      <ScrollArea className="flex-1 bg-muted/30 p-4 rounded-md font-code text-sm">
                          <pre className="whitespace-pre-wrap">
                              <code>{output}</code>
                          </pre>
                      </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Panel */}
            <div className="w-full lg:w-1/4 flex flex-col gap-6">
              <Card className="flex-1 flex flex-col bg-card/50 backdrop-blur-lg border border-white/10 rounded-2xl min-h-0">
                <CardHeader className="flex-row items-center gap-4">
                  <Video className="h-6 w-6 text-primary" />
                  <CardTitle>Video & Chat</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col pt-0 min-h-0">
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="relative aspect-video w-full bg-muted/30 rounded-lg flex items-center justify-center overflow-hidden">
                      <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                      {hasCameraPermission === false && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-muted-foreground p-2 bg-background/80">
                              <CameraOff className="h-8 w-8 mx-auto mb-1" />
                              <p className="text-xs">Your camera is off</p>
                          </div>
                      )}
                      <div className="absolute bottom-1 left-2 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded">You</div>
                    </div>
                     <div className="relative aspect-video w-full bg-muted/30 rounded-lg flex items-center justify-center overflow-hidden">
                        <Image src={opponent.userAvatar || 'https://placehold.co/600x400.png'} data-ai-hint="person coding" alt={opponent.userName} width={320} height={180} className="w-full h-full object-cover" />
                        <div className="absolute bottom-1 left-2 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded">{opponent.userName}</div>
                    </div>
                  </div>

                   {hasCameraPermission === false && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertTitle>Camera Access Required</AlertTitle>
                        <AlertDescription>
                          Please allow camera access in your browser settings to use this feature.
                        </AlertDescription>
                      </Alert>
                  )}

                  <Tabs defaultValue="chat" className="flex-1 flex flex-col min-h-0 mt-2">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="chat">Chat</TabsTrigger>
                      <TabsTrigger value="participants">Participants (2)</TabsTrigger>
                    </TabsList>
                    <TabsContent value="chat" className="flex-1 flex flex-col mt-4 min-h-0">
                       <ScrollArea className="flex-1 pr-4 -mr-4">
                        <div className="space-y-4 text-sm pr-4">
                          {messages.map((message) => {
                            const isMe = message.senderId === auth.currentUser?.uid;
                            return (
                              <div
                                key={message.id}
                                className={cn(
                                  'flex items-start gap-3',
                                  isMe && 'flex-row-reverse'
                                )}
                              >
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={message.senderAvatar} data-ai-hint={isMe ? "man portrait" : "woman portrait"}/>
                                  <AvatarFallback>
                                    {message.senderName.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className={cn(isMe && 'text-right')}>
                                  <p className="font-bold">{message.senderName}</p>
                                  <p
                                    className={cn(
                                      'p-2 rounded-lg',
                                      isMe
                                        ? 'bg-primary/80 text-primary-foreground'
                                        : 'bg-muted/50'
                                    )}
                                  >
                                    {message.text}
                                  </p>
                                </div>
                              </div>
                            );
                           })}
                           <div ref={endOfMessagesRef} />
                        </div>
                      </ScrollArea>
                      <div className="mt-4 flex gap-2">
                         <Input
                          placeholder="Send a message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                        />
                        <Button variant="secondary" size="icon" onClick={handleSendMessage} disabled={!newMessage.trim()}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </TabsContent>
                    <TabsContent value="participants" className="flex-1 mt-4">
                      <ScrollArea className="h-full pr-4 -mr-4">
                        <div className="space-y-4 pr-4">
                            <div className="flex items-center justify-between">
                              <div className='flex items-center gap-3'>
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={auth.currentUser?.photoURL || ''} data-ai-hint="man portrait" />
                                  <AvatarFallback>ME</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-semibold">You</p>
                                  <p className="text-xs text-muted-foreground">Score: 0</p>
                                </div>
                              </div>
                              <Star className='h-5 w-5 text-yellow-400' />
                            </div>
                            <div className="flex items-center justify-between">
                              <div className='flex items-center gap-3'>
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={opponent.userAvatar} data-ai-hint="person coding" />
                                  <AvatarFallback>{opponent.userName.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-semibold">{opponent.userName}</p>
                                  <p className="text-xs text-muted-foreground">Score: 0</p>
                                </div>
                              </div>
                                <Button variant="ghost" size="icon" className='h-8 w-8 text-muted-foreground hover:text-green-500'><ThumbsUp className='h-4 w-4'/></Button>
                            </div>
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </AuthGuard>
  );
}
