import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/20 bg-background/80 backdrop-blur-sm">
        <div className="container flex h-16 max-w-7xl mx-auto items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-10">
            <Link href="#" className="flex items-center" prefetch={false}>
              <span className="text-2xl font-bold">scale</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={false}>Products</Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={false}>Leaderboards</Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={false}>Enterprise</Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={false}>Government</Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={false}>Customers</Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors" prefetch={false}>Resources</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Button className="bg-white text-black hover:bg-neutral-200 rounded-md text-sm font-medium h-9 px-4 hidden sm:flex">
              Book a Demo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Link href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" prefetch={false}>
              Log In
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden">
        {/* Abstract background elements */}
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <div className="absolute inset-0">
            <div 
              className="absolute top-0 right-0 w-[50vmax] h-[50vmax] -translate-x-1/2 translate-y-1/2 rounded-full bg-gradient-to-tr from-primary/30 via-primary/10 to-transparent blur-3xl opacity-50"
            />
            <div 
              className="absolute bottom-0 left-0 w-[40vmax] h-[40vmax] translate-x-1/3 -translate-y-1/3 rounded-full bg-gradient-to-bl from-purple-500/30 via-indigo-500/10 to-transparent blur-3xl opacity-60"
            />
          </div>
        </div>
        
        {/* Hero Section */}
        <section className="relative w-full py-24 md:py-32 lg:py-48">
          <div className="container max-w-4xl mx-auto text-center px-4">
            <h1 className="text-5xl font-extrabold tracking-tighter sm:text-6xl md:text-7xl lg:text-8xl leading-tight">
              <span className="bg-gradient-to-r from-purple-400 via-fuchsia-500 to-pink-400 bg-clip-text text-transparent">
                Breakthrough AI from
              </span>
              <br />
              Data to Deployment
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              Scale delivers proven data, evaluations, and outcomes to AI labs, governments, and the Fortune 500.
            </p>
            <div className="mt-10 flex justify-center items-center gap-4">
               <Button size="lg" className="bg-white text-black rounded-md font-medium hover:bg-neutral-200">
                Book a Demo <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="link" size="lg" className="text-foreground hover:text-muted-foreground font-medium">
                Build AI <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-8">
        <div className="container max-w-7xl mx-auto px-4 text-center text-xs text-muted-foreground">
          <p>
            Scale works with Generative AI Companies, U.S. Government Agencies & Enterprises
          </p>
        </div>
      </footer>
    </div>
  );
}
