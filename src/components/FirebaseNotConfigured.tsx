'use client';

import { AlertTriangle } from "lucide-react";

export function FirebaseNotConfigured() {
  const envExample = `
NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_API_KEY"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_APP_ID"
NEXT_PUBLIC_FIREBASE_DATABASE_URL="YOUR_DATABASE_URL"
  `.trim();

  return (
    <div className="flex h-dvh w-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl rounded-xl border border-destructive/50 bg-card p-8 shadow-2xl shadow-destructive/10">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <AlertTriangle className="h-12 w-12 shrink-0 text-destructive" />
          <div>
            <h1 className="text-3xl font-bold text-destructive">Action Required: Configure Firebase</h1>
            <p className="mt-1 text-lg text-muted-foreground">
              Your application is not connected to Firebase because the required credentials are missing.
            </p>
          </div>
        </div>
        
        <div className="mt-8 space-y-6 text-card-foreground">
          <p>
            To fix this, you need to create a file named <code className="font-mono text-base bg-muted px-1.5 py-1 rounded-md">.env.local</code> in the root directory of your project and add your Firebase project's configuration to it.
          </p>
          
          <div>
            <h2 className="text-xl font-semibold mb-2">Step 1: Create the <code className="font-mono text-lg">.env.local</code> file</h2>
            <p className="text-muted-foreground mb-3">Create a file named exactly <code className="font-mono text-base bg-muted px-1.5 py-1 rounded-md">.env.local</code> at the top level of your project, next to <code className="font-mono text-base bg-muted px-1.5 py-1 rounded-md">package.json</code>.</p>
            
            <h2 className="text-xl font-semibold mb-2">Step 2: Add your Firebase Credentials</h2>
            <p className="text-muted-foreground mb-3">Copy the block below into your <code className="font-mono text-base bg-muted px-1.5 py-1 rounded-md">.env.local</code> file and replace the placeholder values with the actual credentials from your Firebase project settings.</p>
            <pre className="w-full rounded-lg bg-muted p-4">
              <code className="text-sm font-mono whitespace-pre-wrap">{envExample}</code>
            </pre>
             <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-sm mt-3 inline-block text-primary hover:underline">
              Find your credentials in the Firebase Console &rarr;
            </a>
          </div>

          <div>
             <h2 className="text-xl font-semibold mb-2">Step 3: Restart the Server</h2>
            <p className="text-muted-foreground">
              After creating and saving the <code className="font-mono text-base bg-muted px-1.5 py-1 rounded-md">.env.local</code> file, you **must** restart your development server for the changes to take effect.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
