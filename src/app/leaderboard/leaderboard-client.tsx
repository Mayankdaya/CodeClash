'use client';

import { Header } from "@/components/Header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Medal, Award, AlertTriangle } from "lucide-react";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { Spotlight } from "@/components/ui/spotlight";
import { motion } from "framer-motion";

interface UserScore {
  id: string;
  displayName: string;
  photoURL: string;
  totalScore: number;
}

interface LeaderboardClientProps {
  leaderboard: UserScore[];
  fetchError: string | null;
}

const RankIcon = ({ rank }: { rank: number }) => {
  if (rank === 1) return <Crown className="h-6 w-6 text-yellow-400" />;
  if (rank === 2) return <Medal className="h-6 w-6 text-slate-400" />;
  if (rank === 3) return <Award className="h-6 w-6 text-yellow-600" />;
  return <span className="font-mono text-lg text-muted-foreground w-6 text-center">{rank}</span>;
};

export function LeaderboardClient({ leaderboard, fetchError }: LeaderboardClientProps) {
  return (
    <div className="flex flex-col min-h-dvh bg-transparent text-foreground font-body relative overflow-hidden">
      {/* Background with Aurora effect */}
      <div className="fixed inset-0 z-0">
        <AuroraBackground showRadialGradient={true} className="h-full">
          <div className="hidden">Aurora</div>
        </AuroraBackground>
      </div>
      
      <Spotlight
        className="-top-40 left-0 md:-top-20 md:left-60"
        fill="hsl(var(--primary))"
      />
      
      <Header />
      <main className="flex-1 py-12 md:py-20 relative z-10">
        <div className="container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center">
              <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-white via-primary to-white">Global Leaderboard</h1>
              <p className="mt-4 text-xl text-muted-foreground">See who is dominating the coding arena.</p>
            </div>
            
            {/* Stats section */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="group"
              >
                <div className="h-full p-8 rounded-2xl backdrop-blur-md bg-card/30 border border-border/50 shadow-lg transition-all duration-300 group-hover:shadow-primary/20 group-hover:border-primary/30">
                  <div className="p-4 bg-primary/10 rounded-full mb-6 w-16 h-16 flex items-center justify-center ring-2 ring-inset ring-primary/20">
                    <Crown className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{leaderboard.length > 0 ? leaderboard[0]?.displayName || 'No Champion' : 'No Champion'}</h3>
                  <p className="text-muted-foreground">Current Champion</p>
                  {leaderboard.length > 0 && <p className="mt-2 font-mono text-lg text-primary">{leaderboard[0]?.totalScore || 0} pts</p>}
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="group"
              >
                <div className="h-full p-8 rounded-2xl backdrop-blur-md bg-card/30 border border-border/50 shadow-lg transition-all duration-300 group-hover:shadow-accent/20 group-hover:border-accent/30">
                  <div className="p-4 bg-accent/10 rounded-full mb-6 w-16 h-16 flex items-center justify-center ring-2 ring-inset ring-accent/20">
                    <Award className="h-8 w-8 text-accent" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{leaderboard.length}</h3>
                  <p className="text-muted-foreground">Total Competitors</p>
                  <p className="mt-2 text-muted-foreground">Across all challenges</p>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="group"
              >
                <div className="h-full p-8 rounded-2xl backdrop-blur-md bg-card/30 border border-border/50 shadow-lg transition-all duration-300 group-hover:shadow-primary/20 group-hover:border-primary/30">
                  <div className="p-4 bg-primary/10 rounded-full mb-6 w-16 h-16 flex items-center justify-center ring-2 ring-inset ring-primary/20">
                    <Medal className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{leaderboard.length > 0 ? leaderboard.reduce((sum, user) => sum + user.totalScore, 0) : 0}</h3>
                  <p className="text-muted-foreground">Total Points Earned</p>
                  <p className="mt-2 text-muted-foreground">In all competitions</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-card/30 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden relative"
          >
            {/* Inner subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 pointer-events-none"></div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b-white/10">
                  <TableHead className="w-24 text-center text-white/80 font-semibold text-base">Rank</TableHead>
                  <TableHead className="text-white/80 font-semibold text-base">Player</TableHead>
                  <TableHead className="text-right text-white/80 font-semibold text-base">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fetchError ? (
                   <TableRow>
                      <TableCell colSpan={3} className="text-center text-destructive py-12">
                          <div className="flex flex-col items-center gap-4">
                            <AlertTriangle className="h-10 w-10" />
                            <p className="font-semibold text-xl">Error Loading Leaderboard</p>
                            <p className="text-base max-w-md">{fetchError}</p>
                          </div>
                      </TableCell>
                  </TableRow>
                ) : leaderboard.length > 0 ? leaderboard.map((user, index) => (
                  <TableRow key={user.id} className="hover:bg-white/5 transition-colors duration-200 border-b-white/5 last:border-b-0">
                    <TableCell className="font-medium text-center py-4">
                      <div className="flex justify-center items-center">
                        <RankIcon rank={index + 1} />
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border-2 border-white/10 shadow-lg">
                          <AvatarImage src={user.photoURL} data-ai-hint="person portrait" />
                          <AvatarFallback className="bg-primary/20 text-white">{user.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-lg text-white">{user.displayName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xl tracking-wider py-4">
                      <span className="bg-gradient-to-r from-primary/80 to-accent/80 px-4 py-1 rounded-full text-white shadow-lg">
                        {user.totalScore}
                      </span>
                    </TableCell>
                  </TableRow>
                )) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-white/60 py-16 text-lg">
                          No players on the leaderboard yet. Start a clash to get on the board!
                      </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </motion.div>
        </div>
      </main>
      
      {/* Premium footer */}
      <footer className="relative z-10 border-t border-border/50 backdrop-blur-sm bg-card/20 py-8">
        <div className="container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-xs">CC</div>
              <span className="text-foreground/80 font-semibold">CodeClash</span>
            </div>
            
            <div className="flex gap-8 text-muted-foreground text-sm">
              <a href="#" className="hover:text-foreground transition-colors">About</a>
              <a href="#" className="hover:text-foreground transition-colors">Rules</a>
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
            
            <div className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} CodeClash. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}