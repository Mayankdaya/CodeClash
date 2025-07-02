
'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { 
  ArrowRight, Coins, List, Search, GitMerge, Link as LinkIcon, ToyBrick, MoveHorizontal, 
  Type, Repeat, Binary, Container, Pocket, GitBranchPlus, Workflow, SpellCheck, Users
} from "lucide-react";
import Link from "next/link";
import { rtdb } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { useToast } from "@/hooks/use-toast";

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
        description: "Could not fetch waiting player counts due to a database permission error.",
        variant: "destructive",
      });
    });

    return () => {
      matchmakingUnsubscribe();
    };
  }, [toast]);
  
  return (
    <div className="flex flex-col min-h-dvh bg-transparent text-foreground font-body">
      <Header />
      <main className="flex-1 py-12 md:py-20">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Choose Your Challenge</h1>
            <p className="mt-4 text-lg text-muted-foreground">Select a topic to find an opponent.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {topics.map((topic) => {
              const waitingCount = waitingCounts[topic.id] || 0;
              return (
                <Card key={topic.title} className="bg-card/50 backdrop-blur-lg border border-white/10 rounded-2xl shadow-lg flex flex-col">
                  <CardHeader className="flex-row items-center gap-4 space-y-0 pb-4">
                    <div className="p-3 bg-primary/10 rounded-full ring-1 ring-inset ring-primary/20">
                      <topic.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{topic.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <CardDescription>{topic.description}</CardDescription>
                  </CardContent>
                  <CardFooter className="flex-col items-stretch">
                      {waitingCount > 0 && (
                      <div className="text-xs text-center text-accent-foreground/80 flex items-center justify-center gap-2 p-1 bg-accent/20 rounded-md mb-2">
                        <Users className="h-3 w-3" />
                        {waitingCount} {waitingCount === 1 ? 'player' : 'players'} waiting
                      </div>
                    )}
                    <Button className="w-full bg-primary/90 text-primary-foreground hover:bg-primary" asChild>
                      <Link href={`/matching?topic=${topic.id}`}>
                        Find Opponent <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
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
    <LobbyContent />
  );
}
