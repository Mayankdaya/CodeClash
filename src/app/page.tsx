import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Code, Users, Trophy } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground font-body">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 max-w-7xl mx-auto items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2" prefetch={false}>
            <Code className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold tracking-tight">CodeClash</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={false}>Topics</Link>
            <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={false}>Leaderboards</Link>
            <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={false}>How it Works</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="#">Log In</Link>
            </Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              Start a Clash
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full py-20 md:py-32 lg:py-40 overflow-hidden">
          <div aria-hidden="true" className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(to_bottom,white,transparent)]"></div>
            <div 
              className="absolute -top-1/4 left-1/2 h-[60vmax] w-[60vmax] -translate-x-1/2 rounded-full bg-gradient-to-br from-primary/20 via-accent/20 to-transparent blur-3xl opacity-80" 
            />
            <div 
              className="absolute -bottom-1/4 right-0 h-[50vmax] w-[50vmax] translate-x-1/4 rounded-full bg-gradient-to-tl from-accent/20 via-primary/10 to-transparent blur-3xl opacity-90" 
            />
          </div>
          
          <div className="container max-w-4xl mx-auto text-center px-4">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              The Ultimate Real-Time
              <br />
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Coding Arena
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              Challenge your skills against peers in live coding battles. Select a topic, join a match, and code your way to victory in 30-minute clashes.
            </p>
            <div className="mt-10 flex justify-center items-center gap-4">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
                Find a Match
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg">
                View Topics
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-24">
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Why CodeClash?</h2>
              <p className="mt-4 text-lg text-muted-foreground">Everything you need for a fun and fair coding competition.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="bg-card/60 backdrop-blur-lg border-primary/20 rounded-2xl">
                <CardHeader className="items-center">
                  <div className="p-4 bg-primary/10 rounded-full mb-4 ring-1 ring-inset ring-primary/20">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>Instant Matchmaking</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground">
                  Choose your topic and instantly get matched with 1-3 other developers ready to battle. No sign-up required to jump in.
                </CardContent>
              </Card>
              <Card className="bg-card/60 backdrop-blur-lg border-primary/20 rounded-2xl">
                <CardHeader className="items-center">
                  <div className="p-4 bg-primary/10 rounded-full mb-4 ring-1 ring-inset ring-primary/20">
                    <Code className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>Real-Time Collaboration</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground">
                  Share ideas, chat, and see your opponents' code in real-time. A synchronized editor keeps everyone on the same page.
                </CardContent>
              </Card>
              <Card className="bg-card/60 backdrop-blur-lg border-primary/20 rounded-2xl">
                <CardHeader className="items-center">
                  <div className="p-4 bg-primary/10 rounded-full mb-4 ring-1 ring-inset ring-primary/20">
                    <Trophy className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>Gamified Experience</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground">
                  Earn points, climb the leaderboards, and win badges. Accuracy, speed, and helpfulness all contribute to your score.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 border-t border-border/40">
        <div className="container max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground flex justify-between items-center">
          <p>&copy; 2024 CodeClash. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-foreground">Privacy</Link>
            <Link href="#" className="hover:text-foreground">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
