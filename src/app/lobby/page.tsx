'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ArrowRight, Coins, Columns, GitMerge, Link as LinkIcon, List, MoveHorizontal, Search, ToyBrick } from "lucide-react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { rtdb } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";

const topics = [
  {
    id: "arrays-hashing",
    icon: List,
    title: "Arrays & Hashing",
    description: "Master problems involving data structures, and algorithms for arrays and hashing.",
  },
  {
    id: "two-pointers",
    icon: MoveHorizontal,
    title: "Two Pointers",
    description: "Solve challenges efficiently by using two pointers to iterate through data structures.",
  },
  {
    id: "sliding-window",
    icon: Columns,
    title: "Sliding Window",
    description: "Tackle problems on contiguous subarrays with the efficient sliding window technique.",
  },
  {
    id: "stack",
    icon: ToyBrick,
    title: "Stack",
    description: "Understand and apply the LIFO principle to solve complex logical problems.",
  },
  {
    id: "binary-search",
    icon: Search,
    title: "Binary Search",
    description: "Sharpen your skills in logarithmic time complexity searches on sorted arrays.",
  },
  {
    id: "linked-list",
    icon: LinkIcon,
    title: "Linked List",
    description: "Explore problems related to nodes, pointers, and dynamic data structures.",
  },
  {
    id: "trees",
    icon: GitMerge,
    title: "Trees",
    description: "Navigate hierarchical data structures to solve tree traversal and manipulation problems.",
  },
  {
    id: "dynamic-programming",
    icon: Coins,
    title: "Dynamic Programming",
    description: "Break down complex problems into simpler subproblems with DP.",
  },
];

export default function LobbyPage() {
  const [onlineUsersCount, setOnlineUsersCount] = useState(0);

  useEffect(() => {
    if (!rtdb) return;

    const statusRef = ref(rtdb, 'status');
    const unsubscribe = onValue(statusRef, (snapshot) => {
      if (snapshot.exists()) {
        const statuses = snapshot.val();
        const onlineCount = Object.values(statuses).filter(
          (status: any) => status.state === 'online'
        ).length;
        setOnlineUsersCount(onlineCount);
      } else {
        setOnlineUsersCount(0);
      }
    });

    return () => unsubscribe();
  }, []);
  
  return (
    <AuthGuard>
      <div className="flex flex-col min-h-dvh bg-transparent text-foreground font-body">
        <Header />
        <main className="flex-1 py-12 md:py-20">
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Choose Your Challenge</h1>
              <p className="mt-4 text-lg text-muted-foreground">Select a topic to find an opponent.</p>
              {onlineUsersCount > 0 && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-500/20 px-4 py-1 text-sm font-medium text-green-300">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  {onlineUsersCount} {onlineUsersCount === 1 ? 'player' : 'players'} online
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {topics.map((topic) => (
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
                  <CardFooter>
                    <Button className="w-full bg-primary/90 text-primary-foreground hover:bg-primary" asChild>
                      <Link href={`/matching?topic=${topic.id}`}>
                        Find Opponent <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </AuthGuard>
  );
}
