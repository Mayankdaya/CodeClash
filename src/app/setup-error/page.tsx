
'use client';

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SetupErrorPage() {
  const firestoreRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow any authenticated user to read and write to the database.
    // This is insecure and should be replaced with stricter rules for production.
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
  `.trim();

  const rtdbRules = `
{
  "rules": {
    // Allow any authenticated user to read and write to the database.
    // This is insecure and should be replaced with stricter rules for production.
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
  `.trim();

  const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID';

  return (
    <div className="flex h-dvh w-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl rounded-xl border border-destructive/50 bg-card p-8 shadow-2xl shadow-destructive/10">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <AlertTriangle className="h-12 w-12 shrink-0 text-destructive" />
          <div>
            <h1 className="text-3xl font-bold text-destructive">Action Required: Configure Database Rules</h1>
            <p className="mt-1 text-lg text-muted-foreground">
              While you authenticated successfully, the app could not access the database. This is usually due to restrictive security rules.
            </p>
          </div>
        </div>
        
        <div className="mt-8 text-card-foreground grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-semibold">Step 1: Update Firestore Rules</h2>
              <p className="text-muted-foreground mt-2 mb-3">
                To get started, copy the rules below and paste them into your project's Firestore rules editor.
              </p>
              <pre className="w-full rounded-lg bg-muted p-4">
                <code className="text-sm font-mono whitespace-pre-wrap">{firestoreRules}</code>
              </pre>
              <a href={`https://console.firebase.google.com/project/${firebaseProjectId}/firestore/rules`} target="_blank" rel="noopener noreferrer" className="text-sm mt-3 inline-block text-primary hover:underline">
                Open Firestore Rules &rarr;
              </a>
            </div>

            <div>
              <h2 className="text-xl font-semibold">Step 2: Update Realtime Database Rules</h2>
              <p className="text-muted-foreground mt-2 mb-3">
                Next, do the same for your Realtime Database rules.
              </p>
              <pre className="w-full rounded-lg bg-muted p-4">
                <code className="text-sm font-mono whitespace-pre-wrap">{rtdbRules}</code>
              </pre>
               <a href={`https://console.firebase.google.com/project/${firebaseProjectId}/database/${firebaseProjectId}-default-rtdb/rules`} target="_blank" rel="noopener noreferrer" className="text-sm mt-3 inline-block text-primary hover:underline">
                Open Realtime Database Rules &rarr;
              </a>
            </div>
        </div>

        <div className="mt-8 text-center">
            <h2 className="text-xl font-semibold">Step 3: Try Again</h2>
            <p className="text-muted-foreground mt-2 mb-4">
              After publishing both sets of rules, return to the app and log in again.
            </p>
            <Button asChild>
                <Link href="/login">Go to Login Page</Link>
            </Button>
        </div>
      </div>
    </div>
  );
}
