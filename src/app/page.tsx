import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Code, Users, Swords, Trophy, ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground font-body">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center">
          <Link href="#" className="flex items-center gap-2 font-bold" prefetch={false}>
            <Code className="h-6 w-6 text-primary" />
            <span className="text-lg font-headline">CodeClash</span>
          </Link>
          <nav className="ml-auto flex items-center gap-2 sm:gap-4">
            <Button variant="ghost">Sign In</Button>
            <Button>Get Started</Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full py-20 md:py-32 lg:py-40">
           <div
              className="absolute inset-0 -z-10 h-full w-full bg-background"
              style={{
                backgroundImage: 'radial-gradient(circle at top, hsl(var(--accent)/0.1), transparent 50%)',
              }}
            />
          <div className="container max-w-screen-2xl text-center">
            <h1 className="text-4xl font-headline font-extrabold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
              The Real-Time Competitive Coding Arena
            </h1>
            <p className="mx-auto mt-4 max-w-[700px] text-muted-foreground md:text-xl">
              Select a topic, match with peers, and solve problems first to win. No accounts needed to jump into battle.
            </p>
            <div className="mt-8 flex justify-center">
              <Card className="w-full max-w-md bg-card/60 backdrop-blur-sm border-border/60 shadow-lg rounded-xl">
                <CardHeader>
                  <CardTitle className="font-headline">Start a New Clash</CardTitle>
                  <CardDescription>Choose your battleground and find your opponents.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4 sm:flex-row">
                  <Select>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a Topic" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="arrays">Arrays & Hashing</SelectItem>
                      <SelectItem value="two-pointers">Two Pointers</SelectItem>
                      <SelectItem value="sliding-window">Sliding Window</SelectItem>
                      <SelectItem value="stack">Stack</SelectItem>
                      <SelectItem value="binary-search">Binary Search</SelectItem>
                      <SelectItem value="linked-list">Linked List</SelectItem>
                      <SelectItem value="trees">Trees</SelectItem>
                      <SelectItem value="dynamic-programming">Dynamic Programming</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="lg" className="w-full sm:w-auto">
                    Find Match
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-background/80 border-t border-b border-border/40">
          <div className="container max-w-screen-2xl">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="text-3xl font-headline font-bold tracking-tighter sm:text-4xl">Why You'll Love CodeClash</h2>
              <p className="mt-4 text-muted-foreground">
                A gamified, collaborative, and fast-paced environment to sharpen your coding skills.
              </p>
            </div>
            <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2 lg:grid-cols-3">
              <Card className="bg-card/60 backdrop-blur-sm border-border/60">
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="rounded-full bg-primary/10 p-3 border border-primary/20">
                    <Swords className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="font-headline text-lg">Instant Matchmaking</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    No sign-ups, no waiting. Select a topic and get matched with peers instantly for a 30-minute coding battle.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/60 backdrop-blur-sm border-border/60">
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="rounded-full bg-primary/10 p-3 border border-primary/20">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="font-headline text-lg">Real-Time Collaboration</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Use the integrated chat and real-time code editor to share ideas and strategies with your opponents.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/60 backdrop-blur-sm border-border/60">
                 <CardHeader className="flex flex-row items-center gap-4">
                   <div className="rounded-full bg-primary/10 p-3 border border-primary/20">
                    <Trophy className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="font-headline text-lg">Gamified Experience</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Earn points, climb the leaderboards, and win badges. The first to solve the problem claims victory!
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-border/40">
        <div className="container max-w-screen-2xl flex h-20 items-center justify-between text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} CodeClash. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
             <Link href="#" className="hover:text-foreground" prefetch={false}>
              Terms
            </Link>
            <Link href="#" className="hover:text-foreground" prefetch={false}>
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
