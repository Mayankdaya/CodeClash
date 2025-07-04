
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { LeaderboardClient } from "./leaderboard-client";
import { cn } from "@/lib/utils";

interface UserScore {
  id: string;
  displayName: string;
  photoURL: string;
  totalScore: number;
}

async function getLeaderboardData(): Promise<UserScore[]> {
  if (!db) {
    console.error("Database not configured. Leaderboard cannot be fetched.");
    return [];
  }
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
  } catch (error: any) {
    console.error("Error fetching leaderboard:", error);
    if (error.code === 'permission-denied') {
        throw new Error("PERMISSION_DENIED: Could not fetch leaderboard. Please check your Firebase security rules.");
    }
    throw new Error("An unknown error occurred while fetching the leaderboard.");
  }
}

const RankIcon = ({ rank }: { rank: number }) => {
  if (rank === 1) return <Crown className="h-6 w-6 text-yellow-400" />;
  if (rank === 2) return <Medal className="h-6 w-6 text-slate-400" />;
  if (rank === 3) return <Award className="h-6 w-6 text-yellow-600" />;
  return <span className="font-mono text-lg text-muted-foreground w-6 text-center">{rank}</span>;
};

export default async function LeaderboardPage() {
  let leaderboard: UserScore[] = [];
  let fetchError: string | null = null;
  
  try {
      leaderboard = await getLeaderboardData();
  } catch (error: any) {
      fetchError = error.message;
  }

  return <LeaderboardClient leaderboard={leaderboard} fetchError={fetchError} />;
}
