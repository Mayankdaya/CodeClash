'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, Code, MessageSquare, Send, Users, Timer, Star, ThumbsUp } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import AuthGuard from '@/components/AuthGuard';

export default function ClashPage({ params }: { params: { id: string } }) {
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progressValue = (timeLeft / (30 * 60)) * 100;

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
                        <h3 className="font-bold text-lg mb-2">Two Sum</h3>
                        <p className="text-muted-foreground mb-4">
                          Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`. You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.
                        </p>
                        <div className="text-sm space-y-3">
                          <p><strong className='text-foreground'>Example 1:</strong></p>
                          <pre className='p-2 rounded-md bg-muted/50 text-xs'><code>Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].</code></pre>
                          <p><strong className='text-foreground'>Example 2:</strong></p>
                          <pre className='p-2 rounded-md bg-muted/50 text-xs'><code>Input: nums = [3,2,4], target = 6
Output: [1,2]</code></pre>
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
                  <Users className="h-6 w-6 text-primary" />
                  <CardTitle>Clash Room</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="chat">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="chat">Chat</TabsTrigger>
                      <TabsTrigger value="participants">Participants (3)</TabsTrigger>
                    </TabsList>
                    <TabsContent value="chat" className="mt-4 flex flex-col h-[calc(100vh-22rem)]">
                      <ScrollArea className="flex-grow pr-4">
                        <div className="space-y-4 text-sm">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src="https://placehold.co/32x32.png" data-ai-hint="woman portrait" />
                              <AvatarFallback>AL</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold">Alice</p>
                              <p className="p-2 rounded-lg bg-muted/50">Hey everyone! Good luck!</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 flex-row-reverse">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src="https://placehold.co/32x32.png" data-ai-hint="man portrait" />
                              <AvatarFallback>ME</AvatarFallback>
                            </Avatar>
                            <div className='text-right'>
                              <p className="font-bold">You</p>
                              <p className="p-2 rounded-lg bg-primary/80 text-primary-foreground">You too! Let's do this.</p>
                            </div>
                          </div>
                        </div>
                      </ScrollArea>
                      <div className="mt-4 flex gap-2">
                        <Input placeholder="Send a message..." />
                        <Button variant="secondary" size="icon"><Send className="h-4 w-4"/></Button>
                      </div>
                    </TabsContent>
                    <TabsContent value="participants" className="mt-4">
                      <ScrollArea className="h-[calc(100vh-22rem)] pr-4">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className='flex items-center gap-3'>
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src="https://placehold.co/40x40.png" data-ai-hint="man portrait" />
                                  <AvatarFallback>ME</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-semibold">You</p>
                                  <p className="text-xs text-muted-foreground">Score: 120</p>
                                </div>
                              </div>
                              <Star className='h-5 w-5 text-yellow-400' />
                            </div>
                            <div className="flex items-center justify-between">
                              <div className='flex items-center gap-3'>
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src="https://placehold.co/40x40.png" data-ai-hint="woman portrait" />
                                    <AvatarFallback>AL</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-semibold">Alice</p>
                                    <p className="text-xs text-muted-foreground">Score: 95</p>
                                  </div>
                                </div>
                              <Button variant="ghost" size="icon" className='h-8 w-8 text-muted-foreground hover:text-green-500'><ThumbsUp className='h-4 w-4'/></Button>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className='flex items-center gap-3'>
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src="https://placehold.co/40x40.png" data-ai-hint="person coding" />
                                  <AvatarFallback>BK</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-semibold">ByteKnight</p>
                                  <p className="text-xs text-muted-foreground">Score: 110</p>
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
