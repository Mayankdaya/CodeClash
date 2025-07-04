
'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { 
  ArrowRight, Coins, List, Search, GitMerge, Link as LinkIcon, ToyBrick, MoveHorizontal, 
  Type, Repeat, Binary, Container, Pocket, GitBranchPlus, Workflow, SpellCheck, Users,
  Zap, Trophy, Clock, Sparkles
} from "lucide-react";
import Link from "next/link";
import { rtdb } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { useToast } from "@/hooks/use-toast";
import AuthGuard from "@/components/AuthGuard";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AuroraBackground } from "@/components/ui/aurora-background";

const topics = [
  { id: "arrays", icon: List, title: "Arrays", description: "Master problems involving data structures and algorithms for arrays." },
  { id: "binary-search", icon: Search, title: "Binary Search", description: "Sharpen your skills in logarithmic time complexity searches on sorted arrays." },
  { id: "strings", icon: Type, title: "Strings", description: "Tackle challenges involving string manipulation, parsing, and pattern matching." },
  { id: "linked-lists", icon: LinkIcon, title: "Linked Lists", description: "Explore problems related to nodes, pointers, and dynamic data structures." },
  { id: "recursion", icon: Repeat, title: "Recursion", description: "Solve complex problems by breaking them down into smaller, self-similar subproblems." },
  { id: "bit-manipulation", icon: Binary, title: "Bit Manipulation", description: "Manipulate individual bits of a number to solve problems efficiently." },
  { id: "stack-and-queues", icon: ToyBrick, title: "Stack and Queues", description: "Understand and apply LIFO (Stack) and FIFO (Queue) principles to solve logical problems." },
  { id: "sliding-window-two-pointer", icon: MoveHorizontal, title: "Sliding Window & Two Pointer", description: "Efficiently solve problems on contiguous subarrays or by iterating with two pointers." },
  { id: "heaps", icon: Container, title: "Heaps", description: "Use priority queues and heap data structures for optimization and selection problems." },
  { id: "greedy-algorithms", icon: Pocket, title: "Greedy Algorithms", description: "Make locally optimal choices at each stage with the hope of finding a global optimum." },
  { id: "binary-trees", icon: GitMerge, title: "Binary Trees", description: "Navigate hierarchical data structures to solve tree traversal and manipulation problems." },
  { id: "binary-search-trees", icon: GitBranchPlus, title: "Binary Search Trees", description: "Work with sorted tree structures for efficient searching, insertion, and deletion." },
  { id: "graphs", icon: Workflow, title: "Graphs", description: "Tackle problems involving nodes and edges, including traversals and shortest path algorithms." },
  { id: "dynamic-programming", icon: Coins, title: "Dynamic Programming", description: "Break down complex problems into simpler subproblems with DP." },
  { id: "tries", icon: SpellCheck, title: "Tries", description: "Use tree-like data structures for efficient retrieval of keys in a set of strings." },
];

function LobbyContent() {
  const [waitingCounts, setWaitingCounts] = useState<Record<string, number>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (!rtdb) {
      toast({
        title: "Database not configured",
        description: "Waiting player counts are unavailable.",
        variant: "destructive",
      });
      return;
    }

    const matchmakingRef = ref(rtdb, 'matchmaking');
    const matchmakingUnsubscribe = onValue(matchmakingRef, (snapshot) => {
      const counts: Record<string, number> = {};
      if (snapshot.exists()) {
        const allQueues = snapshot.val();
        for (const topicId in allQueues) {
          counts[topicId] = Object.keys(allQueues[topicId]).length;
        }
      }
      setWaitingCounts(counts);
    }, (error) => {
      console.error("RTDB listener error on lobby:", error);
      toast({
        title: "Connection Error",
        description: "Could not fetch waiting player counts. Please check your connection and Firebase security rules.",
        variant: "destructive",
      });
    });

    return () => {
      matchmakingUnsubscribe();
    };
  }, [toast]);

  return (
    <div className="flex flex-col min-h-dvh bg-transparent text-foreground font-body relative">
      <AuroraBackground className="fixed inset-0 opacity-20" />
      <Header />
      <main className="flex-1 py-12 md:py-24 relative z-10">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <div className="inline-block mb-4">
              <div className="flex items-center justify-center gap-2 px-4 py-2 bg-accent/10 backdrop-blur-sm rounded-full border border-accent/20 text-accent-foreground">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-medium">Select your coding challenge</span>
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-white to-accent">
              Master Your Skills
            </h1>
            <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose a topic below to find an opponent and test your coding prowess in real-time competitive challenges.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {topics.map((topic, index) => {
              const waitingCount = waitingCounts[topic.id] || 0;
              return (
                <motion.div
                  key={topic.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                >
                  <Card className="h-full bg-card/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300 flex flex-col overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl ring-1 ring-inset ring-white/10 shadow-inner">
                          <topic.icon className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="text-xl font-bold">{topic.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <CardDescription className="text-white/70 text-sm">{topic.description}</CardDescription>
                    </CardContent>
                    <CardFooter className="flex-col items-stretch pt-4 pb-5 border-t border-white/5">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>~20 min</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Trophy className="h-3.5 w-3.5" />
                          <span>+25 XP</span>
                        </div>
                        {waitingCount > 0 && (
                          <div className="flex items-center gap-2 text-xs text-accent">
                            <Users className="h-3.5 w-3.5" />
                            <span>{waitingCount} waiting</span>
                          </div>
                        )}
                      </div>
                      <Button 
                        className={cn(
                          "w-full group relative overflow-hidden",
                          waitingCount > 0 
                            ? "bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity shadow-lg shadow-primary/20" 
                            : "bg-card/80 text-primary hover:bg-white/10 border border-white/10"
                        )} 
                        asChild
                      >
                        <Link href={`/matching?topic=${topic.id}`} className="flex items-center justify-center gap-2">
                          {waitingCount > 0 && <Zap className="h-4 w-4 animate-pulse" />}
                          {waitingCount > 0 ? 'Join Now' : 'Find Opponent'}
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}


export default function LobbyPage() {
  return (
    <AuthGuard>
      <LobbyContent />
    </AuthGuard>
  );
}
