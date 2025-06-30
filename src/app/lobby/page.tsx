'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ArrowRight, Coins, Columns, GitMerge, Link as LinkIcon, List, MoveHorizontal, Search, ToyBrick } from "lucide-react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";

const topics = [
  {
    icon: List,
    title: "Arrays & Hashing",
    description: "Master problems involving data structures, and algorithms for arrays and hashing.",
    href: "/matching",
  },
  {
    icon: MoveHorizontal,
    title: "Two Pointers",
    description: "Solve challenges efficiently by using two pointers to iterate through data structures.",
    href: "/matching",
  },
  {
    icon: Columns,
    title: "Sliding Window",
    description: "Tackle problems on contiguous subarrays with the efficient sliding window technique.",
    href: "/matching",
  },
  {
    icon: ToyBrick,
    title: "Stack",
    description: "Understand and apply the LIFO principle to solve complex logical problems.",
    href: "/matching",
  },
  {
    icon: Search,
    title: "Binary Search",
    description: "Sharpen your skills in logarithmic time complexity searches on sorted arrays.",
    href: "/matching",
  },
  {
    icon: LinkIcon,
    title: "Linked List",
    description: "Explore problems related to nodes, pointers, and dynamic data structures.",
    href: "/matching",
  },
  {
    icon: GitMerge,
    title: "Trees",
    description: "Navigate hierarchical data structures to solve tree traversal and manipulation problems.",
    href: "/matching",
  },
  {
    icon: Coins,
    title: "Dynamic Programming",
    description: "Break down complex problems into simpler subproblems with DP.",
    href: "/matching",
  },
];

export default function LobbyPage() {
  return (
    <AuthGuard>
      <div className="flex flex-col min-h-dvh bg-transparent text-foreground font-body">
        <Header />
        <main className="flex-1 py-12 md:py-20">
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Choose Your Challenge</h1>
              <p className="mt-4 text-lg text-muted-foreground">Select a topic to find an opponent.</p>
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
                      <Link href={topic.href}>
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
