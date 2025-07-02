
import { Header } from "@/components/Header";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Medal, Award } from "lucide-react";

interface UserScore {
  id: string;
  displayName: string;
  photoURL: string;
  totalScore: number;
}

async function getLeaderboardData(): Promise<UserScore[]> {
  if (!db) return [];
  const usersRef = collection(db, "users");
  const q = query(usersRef, orderBy("totalScore", "desc"), limit(100));

  try {
    const querySnapshot = await getDocs(q);
    const leaderboard: UserScore[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      leaderboard.push({
        id: doc.id,
        displayName: data.displayName || 'Anonymous',
        photoURL: data.photoURL || 'https://placehold.co/40x40.png',
        totalScore: data.totalScore || 0,
      });
    });
    return leaderboard;
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return [];
  }
}

const RankIcon = ({ rank }: { rank: number }) => {
  if (rank === 1) return <Crown className="h-6 w-6 text-yellow-400" />;
  if (rank === 2) return <Medal className="h-6 w-6 text-slate-400" />;
  if (rank === 3) return <Award className="h-6 w-6 text-yellow-600" />;
  return <span className="font-mono text-lg text-muted-foreground w-6 text-center">{rank}</span>;
};

async function LeaderboardContent() {
  const leaderboard = await getLeaderboardData();

  return (
    <div className="flex flex-col min-h-dvh bg-transparent text-foreground font-body">
      <Header />
      <main className="flex-1 py-12 md:py-20">
        <div className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Global Leaderboard</h1>
            <p className="mt-4 text-lg text-muted-foreground">See who is dominating the coding arena.</p>
          </div>
          
          <div className="bg-card/50 backdrop-blur-lg border border-white/10 rounded-2xl shadow-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b-white/10">
                  <TableHead className="w-24 text-center">Rank</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.length > 0 ? leaderboard.map((user, index) => (
                  <TableRow key={user.id} className="hover:bg-primary/5 border-b-white/5 last:border-b-0">
                    <TableCell className="font-medium text-center">
                      <div className="flex justify-center items-center">
                        <RankIcon rank={index + 1} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.photoURL} data-ai-hint="person portrait" />
                          <AvatarFallback>{user.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="font-semibold">{user.displayName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-lg tracking-wider">{user.totalScore}</TableCell>
                  </TableRow>
                )) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-10">
                          No players on the leaderboard yet. Start a clash to get on the board!
                      </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LeaderboardPage() {
    return (
      <LeaderboardContent />
    )
}
