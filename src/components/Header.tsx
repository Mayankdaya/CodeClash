import { Button } from "@/components/ui/button";
import { ArrowRight, Code } from "lucide-react";
import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/50 backdrop-blur-xl">
      <div className="container flex h-16 max-w-7xl mx-auto items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2" prefetch={false}>
          <Code className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold tracking-tight">CodeClash</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/lobby" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={false}>Topics</Link>
          <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={false}>Leaderboards</Link>
          <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={false}>How it Works</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="#">Log In</Link>
          </Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30" asChild>
            <Link href="/lobby">
              Start a Clash
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
