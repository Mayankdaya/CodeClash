
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import AuthGuard from '@/components/AuthGuard';
import { CodeEditor } from '@/components/CodeEditor';
import { UserVideo } from '@/components/UserVideo';
import { BookOpen, Code, Send, Users, Timer, Star, ThumbsUp, Video, Loader2, Lightbulb, CheckCircle2, XCircle } from 'lucide-react';
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

type TestCaseResult = ExecuteCodeOutput['results'][0];

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
  const [starterCodes, setStarterCodes] = useState<Record<string, string>>({});
  const [isTranslatingCode, setIsTranslatingCode] = useState(false);
  const [language, setLanguage] = useState('javascript');
  const [output, setOutput] = useState<TestCaseResult[] | string>('Click "Run Code" to see the output here.');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consoleTab, setConsoleTab] = useState('testcases');
  const [submissionResult, setSubmissionResult] = useState<{ status: 'Accepted' | 'Wrong Answer' | 'Error'; message: string; } | null>(null);
  
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes

  const [isGettingHint, setIsGettingHint] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const languages = ["javascript", "typescript", "python", "java", "cpp"];

  // Get clash data and opponent info
  useEffect(() => {
    if (!db || !auth.currentUser || !id) return;
    
    const getClashData = async () => {
      const clashDocRef = doc(db, 'clashes', id);
      const docSnap = await getDoc(clashDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as ClashData;
        
        // Firestore stores test case inputs as strings, so we parse them back to objects
        if (data.problem && data.problem.testCases) {
          const parsedTestCases = data.problem.testCases.map(tc => {
            try {
              // The input from firestore is already a string, no need to check type
              const parsedInput = JSON.parse(tc.input);
              return { ...tc, input: parsedInput };
            } catch (e) {
              console.error("Failed to parse test case input:", e);
              return tc; 
            }
          });
          data.problem = { ...data.problem, testCases: parsedTestCases };
        }
        
        setClashData(data);
        
        if (data.problem) {
          setProblem(data.problem);
          setCode(data.problem.starterCode);
          setStarterCodes({ javascript: data.problem.starterCode });
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

  const handleLanguageChange = async (newLang: string) => {
    setLanguage(newLang);
    setOutput('Click "Run Code" to see the output here.');
    
    if (starterCodes[newLang]) {
      setCode(starterCodes[newLang]);
      return;
    }

    if (!problem) return;

    setIsTranslatingCode(true);
    try {
      const result = await translateCode({
        sourceCode: problem.starterCode,
        sourceLanguage: 'javascript',
        targetLanguage: newLang,
        entryPoint: problem.entryPoint,
      });
      const newCode = result.translatedCode;
      setCode(newCode);
      setStarterCodes(prev => ({ ...prev, [newLang]: newCode }));
    } catch (error) {
      console.error("Error translating code:", error);
      toast({
        title: "Error Translating Code",
        description: "Could not generate a template for this language. Please try again.",
        variant: "destructive",
      });
      // Revert to JS on failure
      setLanguage('javascript'); 
      setCode(problem.starterCode);
    } finally {
      setIsTranslatingCode(false);
    }
  };

  const handleRunCode = async () => {
    if (!problem?.testCases || !code) return;
    setIsRunning(true);
    setConsoleTab('test-result');
    setOutput('Running test cases...');
    
    try {
      const runTestCases = problem.testCases.slice(0, 3);
      const result = await executeCode({
        code,
        language,
        entryPoint: problem.entryPoint,
        testCases: runTestCases,
      });

      if (result.status === 'error') {
        setOutput(result.message || 'An unknown execution error occurred.');
      } else {
        setOutput(result.results);
      }
    } catch (error: any) {
        setOutput('An unexpected error occurred: ' + (error.message || 'Unknown error'));
    } finally {
        setIsRunning(false);
    }
  };
  
  const handleSubmitCode = async () => {
    if (!problem?.testCases || !code) return;
    setIsSubmitting(true);
    setConsoleTab('test-result');
    setOutput('Submitting and running all test cases...');

    try {
      const result = await executeCode({
        code,
        language,
        entryPoint: problem.entryPoint,
        testCases: problem.testCases,
      });
      
      if (result.status === 'error') {
          setOutput(result.message || 'An unknown submission error occurred.');
          setSubmissionResult({
              status: 'Error',
              message: 'An error occurred during submission: ' + (result.message || 'Unknown error'),
          });
      } else {
          setOutput(result.results);
          if (result.passedCount === result.totalCount) {
              setSubmissionResult({
                  status: 'Accepted',
                  message: `Congratulations! All ${result.totalCount} test cases passed.`,
              });
          } else {
              setSubmissionResult({
                  status: 'Wrong Answer',
                  message: `Your solution failed. Passed ${result.passedCount} out of ${result.totalCount} test cases.`,
              });
          }
      }
    } catch (error: any) {
        const errorMessage = error.message || 'Unknown error';
        setOutput('An unexpected error occurred during submission: ' + errorMessage);
        setSubmissionResult({
            status: 'Error',
            message: 'An unexpected framework error occurred: ' + errorMessage,
        });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGetHint = async () => {
    if (!problem || !code) return;
    setIsGettingHint(true);
    try {
        const result = await getHint({
            problemTitle: problem.title,
            problemDescription: problem.description,
            userCode: code,
        });
        setHint(result.hint);
    } catch (error) {
        console.error("Error getting hint:", error);
        toast({
            title: "Error",
            description: "Could not fetch a hint at this time.",
            variant: "destructive",
        });
    } finally {
        setIsGettingHint(false);
    }
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
      <div className="flex flex-col h-dvh bg-transparent text-foreground font-body">
        <Header />
        <main className="flex-1 flex flex-row gap-6 p-6 overflow-x-auto">
          
          {/* Left Panel */}
          <div className="flex flex-col gap-6" style={{ minWidth: '350px' }}>
            <Card className="flex-1 flex flex-col bg-card/50 border border-white/10 rounded-2xl min-h-0">
               <CardHeader className="flex-row items-center gap-4">
                <BookOpen className="h-6 w-6 text-primary" />
                <CardTitle>Problem</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-6 pt-0 overflow-auto">
                <h3 className="font-bold text-lg mb-2 capitalize">{problem.title}</h3>
                <p className="text-muted-foreground mb-4 whitespace-pre-wrap">
                  {problem.description}
                </p>
                <div className="text-sm space-y-4">
                  {problem.examples && problem.examples.map((example, index) => (
                    <div key={index}>
                      <p><strong className='text-foreground'>Example {index + 1}:</strong></p>
                      <pre className='mt-1 p-2 rounded-md bg-muted/50 text-xs whitespace-pre-wrap'>
                        <code>
                          Input: {example.input}<br/>
                          Output: {example.output}
                          {example.explanation && <><br/>Explanation: {example.explanation}</>}
                        </code>
                      </pre>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border border-white/10 rounded-2xl">
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
          <div className="flex flex-col min-h-0" style={{ minWidth: '600px', flex: '1 1 50%' }}>
            <Card className="flex-1 flex flex-col bg-card/50 border border-white/10 rounded-2xl min-h-0">
              <CardHeader className="flex-row items-center justify-between gap-4">
                <div className='flex items-center gap-4'>
                  <Code className="h-6 w-6 text-primary" />
                  <CardTitle>Solution</CardTitle>
                </div>
                <Select value={language} onValueChange={handleLanguageChange} disabled={isRunning || isSubmitting || isTranslatingCode}>
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder="Select Language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                        <SelectItem key={lang} value={lang} className='capitalize'>
                          {lang.charAt(0).toUpperCase() + lang.slice(1)}
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0 min-h-0">
                <div className="flex flex-col min-h-0" style={{flexBasis: '60%'}}>
                    <div className="p-6 pt-0 flex-1 flex flex-col min-h-0">
                      <div className="flex-1 w-full rounded-md min-h-0 relative">
                        {isTranslatingCode && (
                            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 text-foreground rounded-md">
                                <Loader2 className="h-8 w-8 animate-spin" />
                                <p className="mt-2 text-sm">Generating {language} template...</p>
                            </div>
                        )}
                        <CodeEditor
                          key={language}
                          language={language}
                          value={code}
                          onChange={(value) => setCode(value || '')}
                          disabled={isRunning || isSubmitting || isTranslatingCode}
                        />
                      </div>
                      <div className='flex justify-end mt-4 gap-2'>
                        <Button variant="outline" onClick={handleGetHint} disabled={isRunning || isSubmitting || isGettingHint || isTranslatingCode}>
                          {isGettingHint ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                          Get Hint
                        </Button>
                        <Button variant="secondary" onClick={handleRunCode} disabled={isRunning || isSubmitting || isTranslatingCode}>
                          {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Run Code
                        </Button>
                        <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSubmitCode} disabled={isRunning || isSubmitting || isTranslatingCode}>
                          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Submit
                        </Button>
                      </div>
                    </div>
                </div>
                <div className="border-t border-border/50 flex flex-col min-h-0" style={{flexBasis: '40%'}}>
                    <Tabs value={consoleTab} onValueChange={setConsoleTab} className="flex-1 flex flex-col p-6 min-h-0">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="test-result">Test Result</TabsTrigger>
                            <TabsTrigger value="testcases">Testcases</TabsTrigger>
                        </TabsList>
                        <TabsContent value="test-result" className="flex-1 mt-4 overflow-auto rounded-md bg-muted/30 p-4">
                            {typeof output === 'string' ? (
                                <pre className="whitespace-pre-wrap font-code text-sm"><code>{output}</code></pre>
                            ) : (
                                <div className="space-y-4 font-code text-sm">
                                    {output.map((res, index) => (
                                        <div key={index} className="border-b border-border/50 pb-2 last:border-b-0">
                                            <div className="flex items-center gap-2 font-bold mb-2">
                                                {res.passed ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                                                <span className={cn(res.passed ? "text-green-400" : "text-red-400")}>Case {res.case}: {res.passed ? 'Passed' : 'Failed'}</span>
                                            </div>
                                            <div className='space-y-1 pl-7 text-xs'>
                                              <p><span className="text-muted-foreground w-20 inline-block">Input:</span> {res.input}</p>
                                              <p><span className="text-muted-foreground w-20 inline-block">Output:</span> {res.output}</p>
                                              <p><span className="text-muted-foreground w-20 inline-block">Expected:</span> {res.expected}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                        <TabsContent value="testcases" className="flex-1 mt-4 overflow-auto rounded-md bg-muted/30 p-4">
                          <div className="space-y-4 font-code text-sm">
                              {problem?.testCases.slice(0, 3).map((tc, index) => (
                                  <div key={index} className="border-b border-border/50 pb-3 last:border-b-0">
                                      <p className="font-bold mb-2">Case {index + 1}</p>
                                      <div className="bg-background/40 p-3 mt-1 rounded-md space-y-1">
                                          <p><span className='text-muted-foreground'>Input:</span> {JSON.stringify(tc.input)}</p>
                                          <p><span className='text-muted-foreground'>Output:</span> {JSON.stringify(tc.expected)}</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                        </TabsContent>
                    </Tabs>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel */}
          <div className="flex flex-col gap-6 min-h-0" style={{ minWidth: '350px' }}>
            <Card className="flex-1 flex flex-col bg-card/50 border border-white/10 rounded-2xl min-h-0">
              <CardHeader className="flex-row items-center gap-4">
                <Video className="h-6 w-6 text-primary" />
                <CardTitle>Video & Chat</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col pt-0 min-h-0">
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <UserVideo />
                  <div className="relative aspect-video w-full bg-muted/30 rounded-lg flex items-center justify-center overflow-hidden">
                      <Image src={opponent.userAvatar || 'https://placehold.co/600x400.png'} data-ai-hint="person coding" alt={opponent.userName} width={320} height={180} className="w-full h-full object-cover" />
                      <div className="absolute bottom-1 left-2 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded">{opponent.userName}</div>
                  </div>
                </div>

                <Tabs defaultValue="chat" className="flex-1 flex flex-col mt-2 min-h-0">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="chat">Chat</TabsTrigger>
                    <TabsTrigger value="participants">Participants (2)</TabsTrigger>
                  </TabsList>
                  <TabsContent value="chat" className="flex-1 flex flex-col mt-4 min-h-0">
                    <div className="flex-1 pr-4 -mr-4 overflow-y-auto">
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
                    </div>
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
                  <TabsContent value="participants" className="flex-1 mt-4 min-h-0">
                    <div className="h-full pr-4 -mr-4 overflow-y-auto">
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
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
        <AlertDialog open={!!hint} onOpenChange={(open) => !open && setHint(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Here's a Hint!</AlertDialogTitle>
                  <AlertDialogDescription>
                      {hint}
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogAction onClick={() => setHint(null)}>Got it!</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
       <AlertDialog open={!!submissionResult} onOpenChange={(open) => !open && setSubmissionResult(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle
                  className={cn(
                    submissionResult?.status === 'Accepted' && 'text-green-500',
                    submissionResult?.status === 'Wrong Answer' && 'text-red-500',
                    submissionResult?.status === 'Error' && 'text-yellow-500',
                  )}
                >
                  {submissionResult?.status}
                </AlertDialogTitle>
                <AlertDialogDescription>
                    {submissionResult?.message}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogAction onClick={() => setSubmissionResult(null)}>Close</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
      </div>
    </AuthGuard>
  );
}
