import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { ProfileClient } from "./profile-client";

// This is a server component that fetches user data
export default function ProfilePage() {
  // In Next.js 15, we'll handle the userId in the client component
  // to avoid the searchParams issue
  return <ProfileClient />;
}