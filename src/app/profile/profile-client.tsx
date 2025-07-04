'use client';

import { Header } from "@/components/Header";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { Spotlight } from "@/components/ui/spotlight";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Star, Clock, Code, GitBranch, AlertTriangle, ChevronRight, Github, Twitter, Linkedin } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";

interface UserData {
  id: string;
  displayName?: string;
  photoURL?: string;
  email?: string;
  totalScore?: number;
  bio?: string;
  joinedAt?: any; // Firestore timestamp
  completedChallenges?: number;
  rank?: number;
  badges?: string[];
  socialLinks?: {
    github?: string;
    twitter?: string;
    linkedin?: string;
    website?: string;
  };
  recentActivities?: Array<{
    id: string;
    type: string;
    title: string;
    score?: number;
    timestamp: any; // Firestore timestamp
  }>;
}

export function ProfileClient() {
  const searchParams = useSearchParams();
  const { user: authUser } = useAuth();
  const userId = searchParams.get('userId') || authUser?.uid;
  
  const [userData, setUserData] = useState<UserData | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    async function fetchUserData() {
      if (userId) {
        try {
          const userRef = doc(db, "users", userId);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            setUserData({
              id: userSnap.id,
              ...userSnap.data() as Omit<UserData, 'id'>
            });
          } else {
            setFetchError("User not found");
          }
        } catch (error: any) {
          console.error("Error fetching user data:", error);
          setFetchError(error.message || "Failed to fetch user data");
        }
      } else if (!authUser) {
        // No userId in URL and user is not authenticated
        // Keep loading as false and userData as null to show the sign-in prompt
      } else {
        // This should not happen as we're using authUser.uid when no userId is provided
        setFetchError("Failed to load profile data");
      }
      setLoading(false);
    }
    
    fetchUserData();
  }, [userId, authUser]);
  
  // Format date from Firestore timestamp
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    try {
      // Handle both Firestore timestamp and serialized date
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(date);
    } catch (e) {
      return "";
    }
  };

  // Default badges if none provided
  const defaultBadges = ["Newcomer", "First Clash"];
  const badges = userData?.badges || defaultBadges;

  // Default activities if none provided
  const defaultActivities = [
    {
      id: "1",
      type: "challenge",
      title: "Algorithm Challenge: Sorting",
      score: 120,
      timestamp: new Date(Date.now() - 86400000 * 2) // 2 days ago
    },
    {
      id: "2",
      type: "challenge",
      title: "Data Structures: Binary Trees",
      score: 85,
      timestamp: new Date(Date.now() - 86400000 * 5) // 5 days ago
    }
  ];
  const activities = userData?.recentActivities || defaultActivities;

  return (
    <div className="flex flex-col min-h-dvh bg-transparent text-foreground font-body relative overflow-hidden">
      {/* Background with Aurora effect */}
      <div className="fixed inset-0 z-0">
        <AuroraBackground showRadialGradient={true} className="h-full">
          <div className="hidden">Aurora</div>
        </AuroraBackground>
      </div>
      
      <Spotlight
        className="-top-40 right-0 md:-top-20 md:right-60"
        fill="hsl(var(--primary))"
      />
      
      <Header />
      
      <main className="flex-1 py-12 md:py-20 relative z-10">
        <div className="container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-card/30 backdrop-blur-md border border-border/50 rounded-2xl p-8 text-center"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                  <Trophy className="h-10 w-10 text-primary animate-pulse" />
                </div>
                <h2 className="text-2xl font-bold">Loading Profile</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Please wait while we fetch the profile data...
                </p>
                <div className="mt-4 h-2 w-40 bg-primary/30 rounded-full animate-pulse"></div>
              </div>
            </motion.div>
          ) : fetchError ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-card/30 backdrop-blur-md border border-destructive/30 rounded-2xl p-8 text-center"
            >
              <div className="flex flex-col items-center gap-4">
                <AlertTriangle className="h-16 w-16 text-destructive" />
                <h2 className="text-2xl font-bold">Error Loading Profile</h2>
                <p className="text-muted-foreground max-w-md mx-auto">{fetchError}</p>
                <Button asChild className="mt-4">
                  <Link href="/">Return to Home</Link>
                </Button>
              </div>
            </motion.div>
          ) : !userData ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-card/30 backdrop-blur-md border border-border/50 rounded-2xl p-8 text-center"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center">
                  <Trophy className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Profile Preview</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Sign in to view your profile or provide a user ID to view a specific profile.
                </p>
                <Button asChild className="mt-4">
                  <Link href="/login">Sign In</Link>
                </Button>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Profile Header */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-8"
              >
                <div className="bg-card/30 backdrop-blur-md border border-border/50 rounded-2xl p-8 shadow-lg">
                  <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                    <Avatar className="h-32 w-32 border-4 border-primary/20 shadow-xl">
                      <AvatarImage src={userData.photoURL || ''} data-ai-hint="person portrait" />
                      <AvatarFallback className="bg-primary/20 text-white text-4xl">
                        {userData.displayName?.substring(0, 2).toUpperCase() || 'CC'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 text-center md:text-left">
                      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                        <h1 className="text-3xl font-bold">{userData.displayName || 'CodeClash User'}</h1>
                        {userData.rank && (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 text-sm">
                            Rank #{userData.rank}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="mt-2 text-muted-foreground">
                        {userData.bio || 'No bio provided'}
                      </p>
                      
                      <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
                        {badges.map((badge, index) => (
                          <Badge key={index} variant="secondary" className="px-3 py-1">
                            {badge}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center justify-center md:justify-start">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-primary" />
                          <span className="font-semibold">{userData.totalScore || 0} Points</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Code className="h-5 w-5 text-accent" />
                          <span className="font-semibold">{userData.completedChallenges || 0} Challenges</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-muted-foreground" />
                          <span className="text-muted-foreground">Joined {formatDate(userData.joinedAt) || 'Recently'}</span>
                        </div>
                      </div>
                      
                      {/* Social Links */}
                      {userData.socialLinks && (
                        <div className="mt-6 flex gap-4 justify-center md:justify-start">
                          {userData.socialLinks.github && (
                            <a href={userData.socialLinks.github} target="_blank" rel="noopener noreferrer" 
                              className="p-2 rounded-full bg-card/50 hover:bg-card/80 transition-colors border border-border/50">
                              <Github className="h-5 w-5" />
                            </a>
                          )}
                          {userData.socialLinks.twitter && (
                            <a href={userData.socialLinks.twitter} target="_blank" rel="noopener noreferrer"
                              className="p-2 rounded-full bg-card/50 hover:bg-card/80 transition-colors border border-border/50">
                              <Twitter className="h-5 w-5" />
                            </a>
                          )}
                          {userData.socialLinks.linkedin && (
                            <a href={userData.socialLinks.linkedin} target="_blank" rel="noopener noreferrer"
                              className="p-2 rounded-full bg-card/50 hover:bg-card/80 transition-colors border border-border/50">
                              <Linkedin className="h-5 w-5" />
                            </a>
                          )}
                          {userData.socialLinks.website && (
                            <a href={userData.socialLinks.website} target="_blank" rel="noopener noreferrer"
                              className="p-2 rounded-full bg-card/50 hover:bg-card/80 transition-colors border border-border/50">
                              <ChevronRight className="h-5 w-5" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
              
              {/* Profile Content */}
              <Tabs defaultValue="stats" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-8 bg-card/30 backdrop-blur-md border border-border/50 rounded-xl">
                  <TabsTrigger value="stats">Stats</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="achievements">Achievements</TabsTrigger>
                </TabsList>
                
                <TabsContent value="stats">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6"
                  >
                    <Card className="bg-card/30 backdrop-blur-md border border-border/50 shadow-lg transition-all duration-300 hover:shadow-primary/20 hover:border-primary/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-primary" />
                          Total Score
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-4xl font-bold">{userData.totalScore || 0}</p>
                        <p className="text-muted-foreground mt-1">Points earned</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-card/30 backdrop-blur-md border border-border/50 shadow-lg transition-all duration-300 hover:shadow-accent/20 hover:border-accent/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2">
                          <Medal className="h-5 w-5 text-accent" />
                          Rank
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-4xl font-bold">#{userData.rank || '—'}</p>
                        <p className="text-muted-foreground mt-1">Global position</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-card/30 backdrop-blur-md border border-border/50 shadow-lg transition-all duration-300 hover:shadow-primary/20 hover:border-primary/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2">
                          <Code className="h-5 w-5 text-primary" />
                          Challenges
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-4xl font-bold">{userData.completedChallenges || 0}</p>
                        <p className="text-muted-foreground mt-1">Completed</p>
                      </CardContent>
                    </Card>
                    
                    {/* Additional stats cards could go here */}
                  </motion.div>
                </TabsContent>
                
                <TabsContent value="activity">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Card className="bg-card/30 backdrop-blur-md border border-border/50 shadow-lg">
                      <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>Your latest coding challenges and achievements</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {activities.length > 0 ? activities.map((activity, index) => (
                            <div key={activity.id} className="flex items-start gap-4 pb-6 border-b border-border/30 last:border-0 last:pb-0">
                              <div className="p-2 rounded-full bg-primary/10 text-primary">
                                {activity.type === 'challenge' ? <Code className="h-5 w-5" /> : <Star className="h-5 w-5" />}
                              </div>
                              <div className="flex-1">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                  <h4 className="font-semibold">{activity.title}</h4>
                                  <div className="flex items-center gap-2">
                                    {activity.score !== undefined && (
                                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                        {activity.score} pts
                                      </Badge>
                                    )}
                                    <span className="text-sm text-muted-foreground">
                                      {formatDate(activity.timestamp)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )) : (
                            <div className="text-center py-8 text-muted-foreground">
                              No recent activity to display
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button variant="outline" className="w-full">
                          View All Activity
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                </TabsContent>
                
                <TabsContent value="achievements">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Card className="bg-card/30 backdrop-blur-md border border-border/50 shadow-lg">
                      <CardHeader>
                        <CardTitle>Achievements & Badges</CardTitle>
                        <CardDescription>Rewards earned through your coding journey</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {badges.map((badge, index) => (
                            <div key={index} className="p-4 rounded-xl bg-card/50 border border-border/30 flex items-center gap-3">
                              <div className="p-2 rounded-full bg-primary/10 text-primary">
                                {index % 3 === 0 ? <Trophy className="h-5 w-5" /> : 
                                 index % 3 === 1 ? <Star className="h-5 w-5" /> : 
                                 <GitBranch className="h-5 w-5" />}
                              </div>
                              <div>
                                <p className="font-medium">{badge}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </main>
      
      {/* Footer */}
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