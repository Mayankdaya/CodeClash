import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Code, Users, Trophy } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-dvh bg-transparent text-foreground font-body">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full py-20 md:py-32 lg:py-40 overflow-hidden">
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
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20" asChild>
                <Link href="/lobby">
                  Find a Match
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="border-white/20 bg-white/10 hover:bg-white/20" asChild>
                <Link href="/lobby">
                 View Topics
                </Link>
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
              <Card className="bg-card/50 backdrop-blur-lg border border-white/10 rounded-2xl shadow-lg">
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
              <Card className="bg-card/50 backdrop-blur-lg border border-white/10 rounded-2xl shadow-lg">
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
              <Card className="bg-card/50 backdrop-blur-lg border border-white/10 rounded-2xl shadow-lg">
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

      <Footer />
    </div>
  );
}
