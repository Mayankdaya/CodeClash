
'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, type DocumentData } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

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
import { Skeleton } from '@/components/ui/skeleton';

interface Participant {
  userId: string;
  userName: string;
  userAvatar: string;
}

interface ClashData {
  topicId: string;
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

export default function ClashPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  
  const [clashData, setClashData] = useState<ClashData | null>(null);
  const [opponent, setOpponent] = useState<Participant | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Get clash data and opponent info
  useEffect(() => {
    if (!db || !auth.currentUser) return;
    
    const getClashData = async () => {
      const clashDocRef = doc(db, 'clashes', params.id);
      const docSnap = await getDoc(clashDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as ClashData;
        setClashData(data);
        const opponentParticipant = data.participants.find(p => p.userId !== auth.currentUser?.uid);
        if (opponentParticipant) {
          setOpponent(opponentParticipant);
        } else {
            // Handle case where opponent isn't found (maybe it's a solo session?)
           toast({ title: "Opponent not found", description: "Could not find opponent data in this clash.", variant: 'destructive' });
        }
      } else {
        toast({ title: "Clash not found", description: "This clash does not exist or has been deleted.", variant: 'destructive' });
        router.push('/lobby');
      }
    };
    getClashData();
  }, [params.id, router, toast]);

  // Chat listener
  useEffect(() => {
    if (!db) return;
    const chatRef = collection(db, 'clashes', params.id, 'chat');
    const q = query(chatRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const chatMessages: Message[] = [];
      querySnapshot.forEach((doc) => {
        chatMessages.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(chatMessages);
    });

    return () => unsubscribe();
  }, [params.id]);


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
    if (newMessage.trim() === '' || !db || !auth.currentUser) return;
    
    const chatRef = collection(db, 'clashes', params.id, 'chat');
    await addDoc(chatRef, {
      text: newMessage.trim(),
      senderId: auth.currentUser.uid,
      senderName: auth.currentUser.displayName || 'Anonymous',
      senderAvatar: auth.currentUser.photoURL || 'https://placehold.co/32x32.png',
      timestamp: serverTimestamp(),
    });
    setNewMessage('');
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progressValue = (timeLeft / (30 * 60)) * 100;

  if (!clashData || !opponent) {
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
        <main className="flex-1 container mx-auto py-6 px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
            {/* Left Panel */}
            <div className="lg:col-span-3 flex flex-col gap-6">
              <Card className="bg-card/50 backdrop-blur-lg border border-white/10 rounded-2xl flex-grow">
                <CardHeader className="flex-row items-center gap-4">
                  <BookOpen className="h-6 w-6 text-primary" />
                  <CardTitle>Problem</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="description">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="description">Description</TabsTrigger>
                      <TabsTrigger value="submissions">Submissions</TabsTrigger>
                    </TabsList>
                    <TabsContent value="description" className="mt-4">
                      <ScrollArea className="h-[calc(100vh-25rem)] pr-4">
                        <h3 className="font-bold text-lg mb-2 capitalize">{clashData.topicId.replace('-', ' ')}</h3>
                        <p className="text-muted-foreground mb-4">
                          Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`. You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.
                        </p>
                        <div className="text-sm space-y-3">
                          <p><strong className='text-foreground'>Example 1:</strong></p>
                          <pre className='p-2 rounded-md bg-muted/50 text-xs'><code>Input: nums = [2,7,11,15], target = 9
Output: [0,1]</code></pre>
                        </div>
                      </ScrollArea>
                    </TabsContent>
                    <TabsContent value="submissions" className="mt-4 text-center text-muted-foreground">
                      You have no submissions yet.
                    </TabsContent>
                  </Tabs>
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
            <div className="lg:col-span-6 flex flex-col gap-6">
              <Card className="bg-card/50 backdrop-blur-lg border border-white/10 rounded-2xl flex-grow flex flex-col">
                <CardHeader className="flex-row items-center gap-4">
                  <Code className="h-6 w-6 text-primary" />
                  <CardTitle>Solution</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col">
                  <Textarea
                    placeholder="Enter your code here..."
                    className="flex-grow w-full p-4 bg-muted/30 border-white/10 font-code text-base resize-none"
                    style={{ minHeight: 'calc(100vh - 20rem)' }}
                  />
                  <div className='flex justify-end mt-4 gap-2'>
                      <Button variant="secondary">Run Code</Button>
                      <Button className="bg-green-600 hover:bg-green-700 text-white">Submit</Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Panel */}
            <div className="lg:col-span-3 flex flex-col gap-6">
              <Card className="bg-card/50 backdrop-blur-lg border border-white/10 rounded-2xl flex-grow">
                <CardHeader className="flex-row items-center gap-4">
                  <Video className="h-6 w-6 text-primary" />
                  <CardTitle>Video & Chat</CardTitle>
                </CardHeader>
                <CardContent>
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

                  <Tabs defaultValue="chat">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="chat">Chat</TabsTrigger>
                      <TabsTrigger value="participants">Participants (2)</TabsTrigger>
                    </TabsList>
                    <TabsContent value="chat" className="mt-4 flex flex-col h-[calc(100vh-32rem)]">
                       <ScrollArea className="flex-grow pr-4">
                        <div className="space-y-4 text-sm">
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
                    <TabsContent value="participants" className="mt-4">
                      <ScrollArea className="h-[calc(100vh-32rem)] pr-4">
                        <div className="space-y-4">
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
