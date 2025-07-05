'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { 
  ArrowRight, Coins, List, Search, GitMerge, Link as LinkIcon, ToyBrick, MoveHorizontal, 
  Type, Repeat, Binary, Container, Pocket, GitBranchPlus, Workflow, SpellCheck, Users,
  Zap, Trophy, Clock, Sparkles, UserRound, UserCheck, UserPlus, Loader2
} from "lucide-react";
import Link from "next/link";
import { rtdb, db } from "@/lib/firebase";
import { ref, onValue, set, get, push, serverTimestamp } from "firebase/database";
import { doc, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

const topics = [
  { id: "arrays", icon: List, title: "Arrays", description: "Master problems involving data structures and algorithms for arrays." },
  { id: "binary-search", icon: Search, title: "Binary Search", description: "Sharpen your skills in logarithmic time complexity searches on sorted arrays." },
  { id: "strings", icon: Type, title: "Strings", description: "Tackle challenges involving string manipulation, parsing, and pattern matching." },
  { id: "linked-lists", icon: LinkIcon, title: "Linked Lists", description: "Explore problems related to nodes, pointers, and dynamic data structures." },
  { id: "recursion", icon: Repeat, title: "Recursion", description: "Solve complex problems by breaking them down into smaller, self-similar subproblems." },
  { id: "bit-manipulation", icon: Binary, title: "Bit Manipulation", description: "Manipulate individual bits of a number to solve problems efficiently." },
  { id: "stack-and-queues", icon: ToyBrick, title: "Stack and Queues", description: "Understand and apply LIFO (Stack) and FIFO (Queue) principles to solve logical problems." },
  { id: "sliding-window-two-pointer", icon: MoveHorizontal, title: "Sliding Window & Two Pointer", description: "Efficiently solve problems on contiguous subarrays or by iterating with two pointers." },
  { id: "heaps", icon: Container, title: "Heaps", description: "Use priority queues and heap data structures for optimization and selection problems." },
  { id: "greedy-algorithms", icon: Pocket, title: "Greedy Algorithms", description: "Make locally optimal choices at each stage with the hope of finding a global optimum." },
  { id: "binary-trees", icon: GitMerge, title: "Binary Trees", description: "Navigate hierarchical data structures to solve tree traversal and manipulation problems." },
  { id: "binary-search-trees", icon: GitBranchPlus, title: "Binary Search Trees", description: "Work with sorted tree structures for efficient searching, insertion, and deletion." },
  { id: "graphs", icon: Workflow, title: "Graphs", description: "Tackle problems involving nodes and edges, including traversals and shortest path algorithms." },
  { id: "dynamic-programming", icon: Coins, title: "Dynamic Programming", description: "Break down complex problems into simpler subproblems with DP." },
  { id: "tries", icon: SpellCheck, title: "Tries", description: "Use tree-like data structures for efficient retrieval of keys in a set of strings." },
];

interface OnlineUser {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  isOnline: boolean;
  lastChanged: number;
  status?: 'available' | 'in-match' | 'busy';
}

function LobbyContent() {
  const [waitingCounts, setWaitingCounts] = useState<Record<string, number>>({});
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [showUsersList, setShowUsersList] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [isCreatingDirectMatch, setIsCreatingDirectMatch] = useState(false);
  const [selectedUser, setSelectedUser] = useState<OnlineUser | null>(null);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!rtdb) {
      toast({
        title: "Database not configured",
        description: "Waiting player counts are unavailable.",
        variant: "destructive",
      });
      return;
    }

    const matchmakingRef = ref(rtdb, 'matchmaking');
    const matchmakingUnsubscribe = onValue(matchmakingRef, (snapshot) => {
      const counts: Record<string, number> = {};
      if (snapshot.exists()) {
        const allQueues = snapshot.val();
        for (const topicId in allQueues) {
          // Filter out the current user and test users from the waiting count
          const queueUsers = Object.entries(allQueues[topicId]).filter(([uid, userData]: [string, any]) => {
            // Exclude current user
            if (uid === currentUser?.uid) return false;
            // Exclude test users (those with uid starting with "test_")
            if (uid.startsWith('test_')) return false;
            // Include all other users
            return true;
          });
          counts[topicId] = queueUsers.length;
        }
      }
      setWaitingCounts(counts);
    }, (error) => {
      console.error("RTDB listener error on lobby:", error);
      toast({
        title: "Connection Error",
        description: "Could not fetch waiting player counts. Please check your connection and Firebase security rules.",
        variant: "destructive",
      });
    });

    // Listen for online users
    const statusRef = ref(rtdb, 'status');
    const statusUnsubscribe = onValue(statusRef, async (snapshot) => {
      if (!snapshot.exists()) return;
      
      const statusData = snapshot.val();
      const users: OnlineUser[] = [];
      
      // Process all users
      for (const uid in statusData) {
        if (uid === currentUser?.uid) continue; // Skip current user
        
        const userData = statusData[uid];
        if (userData.isOnline) {
          try {
            // Get user profile data from Firestore
            const userDocRef = doc(db, 'users', uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
              const userProfile = userDoc.data();
              users.push({
                uid,
                displayName: userProfile.displayName || "User",
                photoURL: userProfile.photoURL || null,
                isOnline: userData.isOnline,
                lastChanged: userData.lastChanged,
                status: 'available', // Default status
              });
            } else {
              // Fallback if user document doesn't exist
              users.push({
                uid,
                displayName: "User",
                photoURL: null,
                isOnline: userData.isOnline,
                lastChanged: userData.lastChanged,
                status: 'available',
              });
            }
          } catch (error) {
            console.error("Error fetching user data:", error);
          }
        }
      }
      
      // Check if users are in a match
      const clashesRef = ref(rtdb, 'clashes');
      try {
        const clashesSnapshot = await get(clashesRef);
        if (clashesSnapshot.exists()) {
          const clashes = clashesSnapshot.val();
          for (const clashId in clashes) {
            const clash = clashes[clashId];
            if (clash.participants) {
              for (const participantId in clash.participants) {
                const userIndex = users.findIndex(u => u.uid === participantId);
                if (userIndex !== -1) {
                  users[userIndex].status = 'in-match';
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Error checking user match status:", error);
      }
      
      setOnlineUsers(users);
    }, (error) => {
      console.error("Error fetching online users:", error);
    });

    return () => {
      matchmakingUnsubscribe();
      statusUnsubscribe();
    };
  }, [toast, currentUser]);

  const createDirectMatch = async (targetUserId: string, topicId: string) => {
    if (!currentUser || !rtdb) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create a direct match.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingDirectMatch(true);

    try {
      // Create a new clash entry
      const clashesRef = ref(rtdb, 'clashes');
      const newClashRef = push(clashesRef);
      const clashId = newClashRef.key;

      if (!clashId) {
        throw new Error("Failed to generate clash ID");
      }

      // Create the clash with both participants
      await set(newClashRef, {
        createdAt: serverTimestamp(),
        status: 'waiting',
        topic: topicId,
        createdBy: currentUser.uid,
        participants: {
          [currentUser.uid]: {
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            ready: true,
            joinedAt: serverTimestamp()
          },
          [targetUserId]: {
            uid: targetUserId,
            displayName: selectedUser?.displayName || "Opponent",
            photoURL: selectedUser?.photoURL,
            ready: false,
            joinedAt: null,
            invited: true
          }
        },
        inviteOnly: true
      });

      // Create an invitation
      const invitationsRef = ref(rtdb, `invitations/${targetUserId}`);
      await set(push(invitationsRef), {
        clashId,
        from: {
          uid: currentUser.uid,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL
        },
        topic: topicId,
        topicName: topics.find(t => t.id === topicId)?.title || topicId,
        sentAt: serverTimestamp(),
        status: 'pending'
      });

      toast({
        title: "Invitation Sent",
        description: `Invitation sent to ${selectedUser?.displayName || "opponent"}. Redirecting to match...`,
      });

      // Navigate to the clash page
      router.push(`/clash/${clashId}`);
    } catch (error) {
      console.error("Error creating direct match:", error);
      toast({
        title: "Failed to Create Match",
        description: "There was an error creating the direct match. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingDirectMatch(false);
    }
  };

  return (
    <div className="flex flex-col min-h-dvh bg-transparent text-foreground font-body relative">
      <AuroraBackground className="fixed inset-0 opacity-20">
        <div className="absolute inset-0" />
      </AuroraBackground>
      <Header />
      <main className="flex-1 py-12 md:py-24 relative z-10">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <div className="inline-block mb-4">
              <div className="flex items-center justify-center gap-2 px-4 py-2 bg-accent/10 backdrop-blur-sm rounded-full border border-accent/20 text-accent-foreground">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-medium">Select your coding challenge</span>
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-white to-accent">
              Master Your Skills
            </h1>
            <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose a topic below to find an opponent and test your coding prowess in real-time competitive challenges.
            </p>
            
            {/* Online users counter and button */}
            <div className="mt-8 flex items-center justify-center">
              <Button 
                variant="outline" 
                className="flex items-center gap-2 border-white/10 hover:border-white/20 bg-white/5"
                onClick={() => setShowUsersList(true)}
              >
                <div className="relative">
                  <UserRound className="h-4 w-4" />
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                </div>
                <span>{onlineUsers.length} users online</span>
              </Button>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {topics.map((topic, index) => {
              const waitingCount = waitingCounts[topic.id] || 0;
              return (
                <motion.div
                  key={topic.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                >
                  <Card className="h-full bg-card/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300 flex flex-col overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl ring-1 ring-inset ring-white/10 shadow-inner">
                          <topic.icon className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="text-xl font-bold">{topic.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <CardDescription className="text-white/70 text-sm">{topic.description}</CardDescription>
                    </CardContent>
                    <CardFooter className="flex-col items-stretch pt-4 pb-5 border-t border-white/5">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>~20 min</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Trophy className="h-3.5 w-3.5" />
                          <span>+25 XP</span>
                        </div>
                        {waitingCount > 0 ? (
                          <div className="flex items-center gap-2 text-xs text-accent">
                            <Users className="h-3.5 w-3.5" />
                            <span>{waitingCount} {waitingCount === 1 ? 'player' : 'players'} waiting</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Users className="h-3.5 w-3.5" />
                            <span>No players waiting</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          className={cn(
                            "flex-1 group relative overflow-hidden",
                            waitingCount > 0 
                              ? "bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity shadow-lg shadow-primary/20" 
                              : "bg-card/80 text-primary hover:bg-white/10 border border-white/10"
                          )} 
                          asChild
                        >
                          <Link href={`/matching?topic=${topic.id}`} className="flex items-center justify-center gap-2">
                            {waitingCount > 0 && <Zap className="h-4 w-4 animate-pulse" />}
                            {waitingCount > 0 ? 'Join Now' : 'Find Opponent'}
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </Link>
                        </Button>
                        
                        {/* Direct challenge button */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon"
                              className="bg-card/80 border border-white/10 hover:bg-white/10"
                              onClick={() => setSelectedTopic(topic.id)}
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md bg-card/90 backdrop-blur-xl border-white/10">
                            <DialogHeader>
                              <DialogTitle>Challenge a Specific User</DialogTitle>
                              <DialogDescription>
                                Send a direct challenge for {topic.title} to an online user
                              </DialogDescription>
                            </DialogHeader>
                            <div className="max-h-[60vh] overflow-y-auto py-4">
                              {onlineUsers.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                  <UserRound className="mx-auto h-12 w-12 opacity-20 mb-2" />
                                  <p>No other users are currently online</p>
                                  <p className="text-sm mt-2">Wait for someone to join or try random matchmaking</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {onlineUsers.map(user => (
                                    <div 
                                      key={user.uid}
                                      className={cn(
                                        "flex items-center justify-between p-3 rounded-lg",
                                        user.status === 'in-match' 
                                          ? "bg-muted/30 cursor-not-allowed opacity-70" 
                                          : "bg-muted/20 hover:bg-primary/10 cursor-pointer"
                                      )}
                                      onClick={() => {
                                        if (user.status !== 'in-match') {
                                          setSelectedUser(user);
                                        }
                                      }}
                                    >
                                      <div className="flex items-center gap-3">
                                        <Avatar>
                                          <AvatarImage src={user.photoURL || undefined} />
                                          <AvatarFallback>{(user.displayName || "User")[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <div className="font-medium">{user.displayName || "User"}</div>
                                          <div className="flex items-center gap-1.5 text-xs">
                                            <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                                            <span className="text-muted-foreground">Online</span>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {user.status === 'in-match' ? (
                                        <Badge variant="outline" className="border-amber-500/30 text-amber-500">
                                          In a match
                                        </Badge>
                                      ) : (
                                        <Button 
                                          size="sm" 
                                          variant="ghost"
                                          className="hover:bg-primary/20"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedUser(user);
                                            createDirectMatch(user.uid, selectedTopic!);
                                          }}
                                          disabled={isCreatingDirectMatch}
                                        >
                                          {isCreatingDirectMatch && selectedUser?.uid === user.uid ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                          ) : (
                                            <Zap className="h-4 w-4 mr-2" />
                                          )}
                                          Challenge
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Online Users Dialog */}
      <Dialog open={showUsersList} onOpenChange={setShowUsersList}>
        <DialogContent className="sm:max-w-lg bg-card/90 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle>Online Users</DialogTitle>
            <DialogDescription>
              See who's currently online and challenge them to a match
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="online" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="online">Online Users ({onlineUsers.length})</TabsTrigger>
              <TabsTrigger value="matches">Active Matches</TabsTrigger>
            </TabsList>
            
            <TabsContent value="online" className="max-h-[60vh] overflow-y-auto py-4">
              {onlineUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserRound className="mx-auto h-12 w-12 opacity-20 mb-2" />
                  <p>No other users are currently online</p>
                  <p className="text-sm mt-2">Wait for someone to join or try random matchmaking</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {onlineUsers.map(user => (
                    <div 
                      key={user.uid}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg",
                        user.status === 'in-match' ? "bg-muted/30" : "bg-muted/20"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.photoURL || undefined} />
                          <AvatarFallback>{(user.displayName || "User")[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.displayName || "User"}</div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                            <span className="text-muted-foreground">Online</span>
                          </div>
                        </div>
                      </div>
                      
                      {user.status === 'in-match' ? (
                        <Badge variant="outline" className="border-amber-500/30 text-amber-500">
                          In a match
                        </Badge>
                      ) : (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Zap className="h-4 w-4 mr-2" />
                              Challenge
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md bg-card/90 backdrop-blur-xl border-white/10">
                            <DialogHeader>
                              <DialogTitle>Challenge {user.displayName || "User"}</DialogTitle>
                              <DialogDescription>
                                Choose a topic for your coding challenge
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="grid grid-cols-2 gap-3 py-4">
                              {topics.map(topic => (
                                <Button
                                  key={topic.id}
                                  variant="outline"
                                  className="flex items-center justify-start gap-2 h-auto py-3"
                                  onClick={() => {
                                    createDirectMatch(user.uid, topic.id);
                                  }}
                                  disabled={isCreatingDirectMatch}
                                >
                                  <topic.icon className="h-4 w-4" />
                                  <span>{topic.title}</span>
                                </Button>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="matches">
              <div className="text-center py-8 text-muted-foreground">
                <div className="mx-auto h-12 w-12 opacity-20 mb-2 flex items-center justify-center">
                  <GitMerge className="h-12 w-12" />
                </div>
                <p>Active matches feature coming soon</p>
                <p className="text-sm mt-2">This will show ongoing matches you can spectate</p>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="sm:justify-start">
            <Button 
              variant="default" 
              onClick={() => setShowUsersList(false)}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LobbyPage() {
  return (
    <AuthGuard>
      <LobbyContent />
    </AuthGuard>
  );
}
