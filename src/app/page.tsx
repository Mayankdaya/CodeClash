import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Code, Users, Trophy, GitMerge, List, Swords } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const howItWorksSteps = [
  {
    icon: List,
    title: "Choose a Topic",
    description: "Select from a wide range of topics to challenge your skills.",
  },
  {
    icon: GitMerge,
    title: "Get Matched",
    description: "Our system instantly pairs you with other developers for a fair fight.",
  },
  {
    icon: Swords,
    title: "Start the Clash",
    description: "Enter the real-time arena and solve problems against the clock.",
  },
  {
    icon: Trophy,
    title: "Claim Victory",
    description: "Earn points, climb the leaderboard, and prove your coding prowess.",
  },
];


export default function Home() {
  return (
    <div className="flex flex-col min-h-dvh bg-transparent text-foreground font-body">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full py-32 md:py-48 lg:py-56 overflow-hidden">
          <div className="container max-w-5xl mx-auto text-center px-4">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
              The Ultimate Real-Time
              <br />
              <span className="bg-gradient-to-r from-primary via-accent to-accent bg-clip-text text-transparent">
                Coding Arena
              </span>
            </h1>
            <p className="mx-auto mt-8 max-w-3xl text-lg text-muted-foreground md:text-xl">
              Challenge your skills against peers in live coding battles. Select a topic, join a match, and code your way to victory in 30-minute clashes.
            </p>
            <div className="mt-12 flex justify-center items-center gap-4">
              <Button size="lg" className="text-lg px-8 py-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30 transition-all duration-300 hover:shadow-primary/50 hover:scale-105" asChild>
                <Link href="/matching">
                  Find a Match
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 border-white/20 bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all duration-300 hover:scale-105" asChild>
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
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">Why CodeClash?</h2>
              <p className="mt-4 text-lg text-muted-foreground">Everything you need for a fun and fair coding competition.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="bg-card/50 backdrop-blur-lg border border-white/10 rounded-2xl shadow-lg transition-all duration-300 hover:shadow-accent/20 hover:-translate-y-2">
                <CardHeader className="items-center text-center">
                  <div className="p-4 bg-primary/10 rounded-full mb-4 ring-2 ring-inset ring-primary/20">
                    <Users className="h-10 w-10 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Instant Matchmaking</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground">
                  Choose your topic and instantly get matched with 1-3 other developers ready to battle. No sign-up required to jump in.
                </CardContent>
              </Card>
              <Card className="bg-card/50 backdrop-blur-lg border border-white/10 rounded-2xl shadow-lg transition-all duration-300 hover:shadow-accent/20 hover:-translate-y-2">
                <CardHeader className="items-center text-center">
                  <div className="p-4 bg-primary/10 rounded-full mb-4 ring-2 ring-inset ring-primary/20">
                    <Code className="h-10 w-10 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Real-Time Collaboration</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground">
                  Share ideas, chat, and see your opponents' code in real-time. A synchronized editor keeps everyone on the same page.
                </CardContent>
              </Card>
              <Card className="bg-card/50 backdrop-blur-lg border border-white/10 rounded-2xl shadow-lg transition-all duration-300 hover:shadow-accent/20 hover:-translate-y-2">
                <CardHeader className="items-center text-center">
                  <div className="p-4 bg-primary/10 rounded-full mb-4 ring-2 ring-inset ring-primary/20">
                    <Trophy className="h-10 w-10 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Gamified Experience</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground">
                  Earn points, climb the leaderboards, and win badges. Accuracy, speed, and helpfulness all contribute to your score.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 md:py-24 bg-card/20 border-y border-white/10">
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">How It Works</h2>
              <p className="mt-4 text-lg text-muted-foreground">Get into a clash in four simple steps.</p>
            </div>
            <div className="relative">
              <div className="hidden lg:block absolute top-1/2 left-0 w-full h-0.5 bg-border/50 -translate-y-1/2" aria-hidden="true"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
                {howItWorksSteps.map((step, index) => (
                  <div key={step.title} className="flex flex-col items-center text-center">
                    <div className="relative flex items-center justify-center">
                       <div className="absolute w-24 h-24 bg-primary/20 rounded-full blur-2xl"></div>
                       <div className="relative z-10 flex items-center justify-center w-20 h-20 rounded-full bg-card/80 backdrop-blur-sm border-2 border-primary/50 shadow-lg">
                          <step.icon className="w-10 h-10 text-primary" />
                       </div>
                    </div>
                    <h3 className="mt-6 text-xl font-bold">{step.title}</h3>
                    <p className="mt-2 text-muted-foreground">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
