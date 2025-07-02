
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
  const firestoreDbUrl = `https://console.firebase.google.com/project/${firebaseProjectId}/firestore/data`;
  const rtdbUrl = `https://console.firebase.google.com/project/${firebaseProjectId}/database/${firebaseProjectId}-default-rtdb/data`;
  const firestoreRulesUrl = `https://console.firebase.google.com/project/${firebaseProjectId}/firestore/rules`;
  const rtdbRulesUrl = `https://console.firebase.google.com/project/${firebaseProjectId}/database/${firebaseProjectId}-default-rtdb/rules`;


  return (
    <div className="flex h-dvh w-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl rounded-xl border border-destructive/50 bg-card p-8 shadow-2xl shadow-destructive/10">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <AlertTriangle className="h-12 w-12 shrink-0 text-destructive" />
          <div>
            <h1 className="text-3xl font-bold text-destructive">Action Required: Configure Your Firebase Project</h1>
            <p className="mt-1 text-lg text-muted-foreground">
              Your app authenticated you, but it could not access the database. This usually means the databases haven't been created or their security rules are too restrictive.
            </p>
          </div>
        </div>
        
        <div className="mt-8 text-card-foreground">
            <div className="rounded-lg bg-blue-950/50 border border-blue-500/50 p-4 mb-8">
                <h2 className="text-xl font-semibold text-blue-300">Prerequisite: Create Your Databases</h2>
                <p className="text-blue-400/80 mt-2">
                    Before setting security rules, you must first create the database instances in your Firebase project. This is a common missed step.
                </p>
                <ol className="list-decimal list-inside mt-3 space-y-2 text-blue-400/80">
                    <li>Go to the <a href={firestoreDbUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-400 hover:underline">Firestore Database page</a> and click "Create database".</li>
                    <li>Go to the <a href={rtdbUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-400 hover:underline">Realtime Database page</a> and click "Create database".</li>
                </ol>
                <p className="text-blue-400/80 mt-3">
                    Once both databases are created, you can proceed with setting the security rules below.
                </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h2 className="text-xl font-semibold">Step 1: Update Firestore Rules</h2>
                  <p className="text-muted-foreground mt-2 mb-3">
                    Copy the rules below and paste them into your project's Firestore rules editor.
                  </p>
                  <pre className="w-full rounded-lg bg-muted p-4">
                    <code className="text-sm font-mono whitespace-pre-wrap">{firestoreRules}</code>
                  </pre>
                  <a href={firestoreRulesUrl} target="_blank" rel="noopener noreferrer" className="text-sm mt-3 inline-block text-primary hover:underline">
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
                   <a href={rtdbRulesUrl} target="_blank" rel="noopener noreferrer" className="text-sm mt-3 inline-block text-primary hover:underline">
                    Open Realtime Database Rules &rarr;
                  </a>
                </div>
            </div>
        </div>

        <div className="mt-8 text-center border-t border-border pt-6">
            <h2 className="text-xl font-semibold">Step 3: Try Again</h2>
            <p className="text-muted-foreground mt-2 mb-4">
              After creating the databases and publishing both sets of rules, return to the app and log in again.
            </p>
            <Button asChild>
                <Link href="/">Go to Homepage</Link>
            </Button>
        </div>
      </div>
    </div>
  );
}
