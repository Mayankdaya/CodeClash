
'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/Header';
import AuthGuard from '@/components/AuthGuard';
import { CodeEditor } from '@/components/CodeEditor';
import { UserVideo } from '@/components/UserVideo';
import { BookOpen, Send, Timer, Loader2, Lightbulb, CheckCircle2, XCircle, KeySquare, MessageSquare, TestTube2, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Problem } from '@/lib/problems';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getHint } from '@/ai/flows/getHintFlow';
import { translateCode } from '@/ai/flows/translateCodeFlow';
import { translateSolution } from '@/ai/flows/translateSolutionFlow';
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
type TestCase = Problem['testCases'][0];

const executeInWorker = (code: string, entryPoint: string, testCases: TestCase[]): Promise<ExecuteCodeOutput> => {
    return new Promise((resolve) => {
        const workerCode = `
            const deepEqual = (obj1, obj2) => {
                if (obj1 === obj2) return true;
                if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
                    return false;
                }

                const isArray1 = Array.isArray(obj1);
                const isArray2 = Array.isArray(obj2);

                if (isArray1 && isArray2) {
                    if (obj1.length !== obj2.length) return false;
                    try {
                      // Attempt to sort and compare for order-agnostic comparison
                      const sortFunc = (a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b));
                      const sorted1 = [...obj1].sort(sortFunc);
                      const sorted2 = [...obj2].sort(sortFunc);
                      return JSON.stringify(sorted1) === JSON.stringify(sorted2);
                    } catch (e) {
                      // Fallback to strict order comparison if sorting fails (e.g., complex objects)
                      return JSON.stringify(obj1) === JSON.stringify(obj2);
                    }
                }
                
                if (isArray1 !== isArray2) return false;

                const keys1 = Object.keys(obj1);
                const keys2 = Object.keys(obj2);
                if (keys1.length !== keys2.length) return false;
                for (let key of keys1) {
                    if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
                        return false;
                    }
                }
                return true;
            };
            
            const smartParse = (value) => {
                if (typeof value !== 'string') return value;
                try {
                  // Attempt to parse if it looks like a JSON object or array.
                  if ((value.startsWith('[') && value.endsWith(']')) || (value.startsWith('{') && value.endsWith('}'))) {
                    return JSON.parse(value);
                  }
                } catch (e) {
                  // Not a valid JSON string, return as is
                }
                return value;
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
                        
                        try {
                            const parsedInput = Array.isArray(tc.input) ? tc.input.map(smartParse) : [smartParse(tc.input)];
                            const inputClone = JSON.parse(JSON.stringify(parsedInput));
                            output = userFunc(...inputClone);
                        } catch (err) {
                            error = err;
                        }

                        const endTime = performance.now();
                        const passed = !error && deepEqual(output, tc.expected);
                        if (passed) passedCount++;

                        results.push({
                            case: i + 1,
                            input: JSON.stringify(tc.input),
                            output: error ? error.toString() : JSON.stringify(output),
                            expected: JSON.stringify(tc.expected),
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

const formatInputForDisplay = (input: any) => {
    let args = input;
    if (typeof args === 'string') {
        try {
            args = JSON.parse(args);
        } catch (e) {
            // Not a valid JSON string, return as is.
            return args;
        }
    }
    if (!Array.isArray(args)) {
        return JSON.stringify(args);
    }
    // Handle arrays: stringify each element and join with a comma.
    return args.map(arg => JSON.stringify(arg)).join(', ');
};

export default function ClashClient({ id }: { id: string }) {
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
  const [consoleTab, setConsoleTab] = useState('test-result');
  const [submissionResult, setSubmissionResult] = useState<{ status: 'Accepted' | 'Wrong Answer' | 'Error'; message: string; } | null>(null);
  
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes

  const [isGettingHint, setIsGettingHint] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const [leftPanelTab, setLeftPanelTab] = useState('problem');
  const [solutionLanguage, setSolutionLanguage] = useState('javascript');
  const [solutions, setSolutions] = useState<Record<string, string>>({});
  const [isTranslatingSolution, setIsTranslatingSolution] = useState(false);

  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const languages = ["javascript", "python", "java", "cpp"];

  // Get clash data and opponent info
  useEffect(() => {
    if (!db || !auth.currentUser || !id) return;
    
    const getClashData = async () => {
      const clashDocRef = doc(db, 'clashes', id);
      const docSnap = await getDoc(clashDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as ClashData;
        
        if (data.problem && data.problem.testCases) {
           const parsedTestCases = (data.problem.testCases as any[]).map(tc => {
                try {
                    const parsedInput = typeof tc.input === 'string' ? JSON.parse(tc.input) : tc.input;
                    const parsedExpected = tc.expected !== undefined ? (typeof tc.expected === 'string' ? JSON.parse(tc.expected) : tc.expected) : null;

                    const sanizitedInput = Array.isArray(parsedInput) ? parsedInput.map(arg => {
                        if (typeof arg === 'string') {
                            try { return JSON.parse(arg); } catch (e) { return arg; }
                        }
                        return arg;
                    }) : parsedInput;

                    return { ...tc, input: sanizitedInput, expected: parsedExpected };
                } catch (e) {
                    console.error("Failed to parse test case, returning as is:", tc, e);
                    return { ...tc, expected: tc.expected !== undefined ? tc.expected : null };
                }
            });
            data.problem = { ...data.problem, testCases: parsedTestCases };
        }
        
        setClashData(data);
        
        if (data.problem) {
          setProblem(data.problem);
          const starterCode = data.problem.starterCode || `function ${data.problem.entryPoint}() {\n  // your code here\n}`;
          setCode(starterCode);
          setStarterCodes({ javascript: starterCode });
          if (data.problem.solution) {
            setSolutions({ javascript: data.problem.solution });
          }
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
      toast({
        title: "Error Translating Code",
        description: "Could not generate a template for this language. Please try again.",
        variant: "destructive",
      });
      if(starterCodes.javascript) {
        setLanguage('javascript'); 
        setCode(starterCodes.javascript);
      }
    } finally {
      setIsTranslatingCode(false);
    }
  };

  const handleSolutionLanguageChange = async (newLang: string) => {
    setSolutionLanguage(newLang);

    if (solutions[newLang]) {
      return; // Already cached
    }

    if (!problem?.solution) return;

    setIsTranslatingSolution(true);
    try {
      const result = await translateSolution({
        sourceCode: problem.solution,
        sourceLanguage: 'javascript',
        targetLanguage: newLang,
        entryPoint: problem.entryPoint,
      });
      const newSolutionCode = result.translatedCode;
      setSolutions(prev => ({ ...prev, [newLang]: newSolutionCode }));
    } catch (error) {
      console.error("Error translating solution:", error);
      toast({
        title: "Error Translating Solution",
        description: "Could not generate a solution for this language.",
        variant: "destructive",
      });
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
        result = await executeCode({
          code,
          language,
          entryPoint: problem.entryPoint,
          testCases: testCasesToRun,
        });
      }

      if (result.status === 'error') {
        setOutput(result.message || 'An unknown execution error occurred.');
        if (isSubmission) {
            setSubmissionResult({
                status: 'Error',
                message: `An error occurred: ${result.message || 'Unknown error'}`,
            });
        }
      } else {
        setOutput(result.results);
        if (isSubmission) {
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
      }
    } catch (error: any) {
        const errorMessage = error.message || 'Unknown error';
        setOutput(`An unexpected error occurred: ${errorMessage}`);
        if (isSubmission) {
            setSubmissionResult({
                status: 'Error',
                message: `An unexpected framework error occurred: ${errorMessage}`,
            });
        }
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
      <div className="flex h-dvh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-4">Loading your clash...</p>
      </div>
    );
  }
  
  const RunButton = () => {
    const isDisabled = isRunning || isSubmitting || isTranslatingCode;
    const button = (
        <Button variant="secondary" onClick={handleRunCode} disabled={isDisabled}>
            {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Run
        </Button>
    );

    if (language !== 'javascript') {
        return (
          <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div tabIndex={0}>{button}</div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Execution for {language} is powered by AI.</p>
                </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
    }
    return button;
  };
  
  const SubmitButton = () => {
    const isDisabled = isRunning || isSubmitting || isTranslatingCode;
    const button = (
        <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSubmitCode} disabled={isDisabled}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit
        </Button>
    );

     if (language !== 'javascript') {
        return (
          <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div tabIndex={0}>{button}</div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Submission for {language} is powered by AI.</p>
                </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
    }
    return button;
  }

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-dvh bg-transparent text-foreground font-body">
        <Header />
        <main className="flex-1 flex flex-col p-4 gap-4">
          <Card className="bg-card/50 border border-white/10 rounded-xl shrink-0">
              <CardContent className="flex justify-between items-center p-2">
                  <div className='flex items-center gap-4'>
                  <div className='flex items-center gap-3'>
                      <Avatar className="h-10 w-10 border-2 border-primary">
                      <AvatarImage src={auth.currentUser?.photoURL || ''} data-ai-hint="man portrait" />
                      <AvatarFallback>ME</AvatarFallback>
                      </Avatar>
                      <div>
                      <p className="font-semibold">{auth.currentUser?.displayName || 'You'}</p>
                      <p className="text-xs text-muted-foreground">Score: 0</p>
                      </div>
                  </div>
                  <div className='text-muted-foreground font-bold text-lg'>VS</div>
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

          <div className="flex-1 min-h-0">
            <PanelGroup direction="horizontal">
                <Panel defaultSize={45} minSize={30}>
                    <div className="h-full flex flex-col bg-card/50 border border-white/10 rounded-xl overflow-hidden">
                        <div className="p-2 border-b border-border shrink-0">
                            <Tabs value={leftPanelTab} onValueChange={setLeftPanelTab}>
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="problem"><BookOpen className="mr-2 h-4 w-4"/>Problem</TabsTrigger>
                                    <TabsTrigger value="solution"><KeySquare className="mr-2 h-4 w-4"/>Solution</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                        
                        <div className="flex-1 min-h-0">
                            {leftPanelTab === 'problem' && (
                                <div className="h-full overflow-y-auto p-4 pr-2">
                                    <h1 className="text-2xl font-bold mb-2">{problem.title}</h1>
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
                            )}

                            {leftPanelTab === 'solution' && (
                                <div className="h-full flex flex-col">
                                    <div className="p-2 border-b border-border flex items-center justify-end shrink-0">
                                        <Select value={solutionLanguage} onValueChange={handleSolutionLanguageChange} disabled={isTranslatingSolution}>
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
                                    </div>
                                    <div className="flex-1 min-h-0 relative">
                                        {isTranslatingSolution && (
                                            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 text-foreground rounded-md">
                                                <Loader2 className="h-8 w-8 animate-spin" />
                                                <p className="mt-2 text-sm">Translating solution to {solutionLanguage}...</p>
                                            </div>
                                        )}
                                        <CodeEditor
                                            key={`solution-${solutionLanguage}`}
                                            language={solutionLanguage}
                                            value={solutions[solutionLanguage] || ''}
                                            onChange={() => {}}
                                            disabled={true}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Panel>
                <PanelResizeHandle className="w-2 bg-border/50 hover:bg-primary transition-colors data-[resize-handle-state=drag]:bg-primary" />
                <Panel minSize={30}>
                    <PanelGroup direction="vertical">
                        <Panel defaultSize={60} minSize={25}>
                            <div className="h-full flex flex-col bg-card/50 border border-white/10 rounded-xl min-h-0 overflow-hidden">
                                <div className="p-2 border-b border-border flex items-center justify-between shrink-0">
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
                                    <Button variant="outline" size="sm" onClick={handleGetHint} disabled={isRunning || isSubmitting || isGettingHint || isTranslatingCode}>
                                        {isGettingHint ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                                        Hint
                                    </Button>
                                </div>
                                <div className="flex-1 min-h-0 relative">
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
                            </div>
                        </Panel>
                        <PanelResizeHandle className="h-2 bg-border/50 hover:bg-primary transition-colors data-[resize-handle-state=drag]:bg-primary" />
                        <Panel defaultSize={40} minSize={25}>
                            <div className="h-full flex flex-col bg-card/50 border border-white/10 rounded-xl overflow-hidden">
                                <Tabs value={consoleTab} onValueChange={setConsoleTab} className="flex-1 flex flex-col min-h-0">
                                    <div className='p-2 border-b border-border/50 shrink-0'>
                                        <TabsList className="grid w-full grid-cols-3">
                                            <TabsTrigger value="test-result"><Terminal className="mr-2 h-4 w-4"/>Test Result</TabsTrigger>
                                            <TabsTrigger value="testcases"><TestTube2 className="mr-2 h-4 w-4"/>Testcases</TabsTrigger>
                                            <TabsTrigger value="chat"><MessageSquare className="mr-2 h-4 w-4"/>Chat & Video</TabsTrigger>
                                        </TabsList>
                                    </div>
                                    <div className="flex-1 min-h-0">
                                        <TabsContent value="test-result" className="m-0 h-full overflow-y-auto p-4">
                                            {typeof output === 'string' ? (
                                                <pre className="whitespace-pre-wrap font-code text-sm"><code>{output}</code></pre>
                                            ) : (
                                                <div className="space-y-4 font-code text-sm">
                                                    {output.map((res, index) => (
                                                        <div key={index} className="border-b border-border/50 pb-3 last:border-b-0">
                                                            <div className="flex items-center gap-2 font-bold mb-2">
                                                                {res.passed ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                                                                <span className={cn(res.passed ? "text-green-400" : "text-red-400")}>Case {res.case}: {res.passed ? 'Passed' : 'Failed'}</span>
                                                            </div>
                                                            <div className='space-y-1 pl-7 text-xs'>
                                                            <p><span className="text-muted-foreground w-20 inline-block font-semibold">Input:</span> {res.input}</p>
                                                            <p><span className="text-muted-foreground w-20 inline-block font-semibold">Output:</span> {res.output}</p>
                                                            {!res.passed && <p><span className="text-muted-foreground w-20 inline-block font-semibold">Expected:</span> {res.expected}</p>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </TabsContent>
                                        <TabsContent value="testcases" className="m-0 h-full overflow-y-auto p-4">
                                        <div className="space-y-4 font-code text-base">
                                            {problem?.testCases.slice(0, 3).map((tc, index) => (
                                                <div key={index} className="border-b border-border/50 pb-3 last:border-b-0">
                                                    <p className="font-bold mb-2 text-lg">Case {index + 1}</p>
                                                    <div className="bg-background/40 p-3 mt-1 rounded-md space-y-2">
                                                        <p><strong className='text-muted-foreground'>Input:</strong> {formatInputForDisplay(tc.input)}</p>
                                                        <p><strong className='text-muted-foreground'>Output:</strong> {tc.expected !== null ? JSON.stringify(tc.expected) : <span className="text-muted-foreground/60 italic">(no output)</span>}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        </TabsContent>
                                        <TabsContent value="chat" className="m-0 h-full flex flex-col min-h-0">
                                            <div className="p-4 pt-0">
                                                <div className="grid grid-cols-2 gap-1 mb-1">
                                                    <UserVideo />
                                                    <div className="relative aspect-video w-full bg-muted/30 rounded-lg flex items-center justify-center overflow-hidden">
                                                        <Image src={opponent.userAvatar || 'https://placehold.co/600x400.png'} data-ai-hint="person coding" alt={opponent.userName} width={320} height={180} className="w-full h-full object-cover" />
                                                        <div className="absolute bottom-1 left-2 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded">{opponent.userName}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex-1 flex flex-col min-h-0 border-t pt-2 px-4 pb-4">
                                                <div className="flex-1 pr-2 -mr-2 overflow-y-auto">
                                                    <div className="space-y-2 text-sm pr-2">
                                                    {messages.map((message) => {
                                                        const isMe = message.senderId === auth.currentUser?.uid;
                                                        return (
                                                        <div key={message.id} className={cn('flex items-start gap-2', isMe && 'flex-row-reverse')}>
                                                            <Avatar className="h-8 w-8">
                                                            <AvatarImage src={message.senderAvatar} data-ai-hint={isMe ? "man portrait" : "woman portrait"}/>
                                                            <AvatarFallback>{message.senderName.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                            </Avatar>
                                                            <div className={cn(isMe && 'text-right')}>
                                                            <p className="font-bold">{message.senderName}</p>
                                                            <p className={cn('p-2 rounded-lg mt-1', isMe ? 'bg-primary/80 text-primary-foreground' : 'bg-muted/50')}>
                                                                {message.text}
                                                            </p>
                                                            </div>
                                                        </div>
                                                        );
                                                    })}
                                                    <div ref={endOfMessagesRef} />
                                                    </div>
                                                </div>
                                                <div className="mt-1 flex gap-2 shrink-0">
                                                    <Input placeholder="Send a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
                                                    }}/>
                                                    <Button variant="secondary" size="icon" onClick={handleSendMessage} disabled={!newMessage.trim()}>
                                                    <Send className="h-4 w-4" />
                                                    </Button>
                                                </div>
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
            </PanelGroup>
          </div>
        </main>
        
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
