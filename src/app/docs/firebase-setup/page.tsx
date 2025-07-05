import Link from 'next/link';

export default function FirebaseSetupGuidePage() {
  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl">
      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight">Firebase Setup Guide for CodeClash</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Comprehensive instructions for configuring Firebase services
        </p>
      </header>

      <div className="prose prose-slate dark:prose-invert max-w-none">
        <section id="required-services">
          <h2>Required Firebase Services</h2>
          <p>CodeClash requires the following Firebase services:</p>
          <ol>
            <li><strong>Firebase Authentication</strong> - For user login/registration</li>
            <li><strong>Firestore Database</strong> - For storing user data, clash details, and problems</li>
            <li><strong>Realtime Database</strong> - For matchmaking functionality (finding opponents)</li>
          </ol>
        </section>

        <section id="step-by-step" className="mt-10">
          <h2>Step-by-Step Setup</h2>
          
          <div className="mt-6">
            <h3>1. Create a Firebase Project</h3>
            <ol>
              <li>Go to the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer">Firebase Console</a></li>
              <li>Click "Add project"</li>
              <li>Enter a project name (e.g., "CodeClash")</li>
              <li>Choose whether to enable Google Analytics (optional)</li>
              <li>Complete the project creation process</li>
            </ol>
          </div>

          <div className="mt-6">
            <h3>2. Register a Web App</h3>
            <ol>
              <li>In your Firebase project dashboard, click the web icon ({"</>"}) to add a web app</li>
              <li>Give your app a name (e.g., "CodeClash Web")</li>
              <li>Register the app</li>
              <li>Copy the Firebase configuration object - it will look like this:</li>
            </ol>
            <pre className="bg-slate-800 text-slate-50 p-4 rounded-lg overflow-auto my-4">
              {`const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};`}
            </pre>
          </div>

          <div className="mt-6">
            <h3>3. Set Up Authentication</h3>
            <ol>
              <li>In the Firebase Console, go to "Authentication" from the left menu</li>
              <li>Click "Get started"</li>
              <li>Enable the "Email/Password" sign-in method</li>
              <li>(Optional) Enable additional sign-in methods like Google, GitHub, etc.</li>
            </ol>
          </div>

          <div className="mt-6">
            <h3>4. Set Up Firestore Database</h3>
            <ol>
              <li>From the left menu, click "Firestore Database"</li>
              <li>Click "Create database"</li>
              <li>Choose "Start in production mode" (recommended) or "Start in test mode"</li>
              <li>Select a region for your database</li>
              <li>Click "Next" and wait for the database to be provisioned</li>
              <li>Go to the "Rules" tab and set the following security rules:</li>
            </ol>
            <pre className="bg-slate-800 text-slate-50 p-4 rounded-lg overflow-auto my-4">
              {`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /clashes/{clashId} {
      allow read, write: if request.auth != null;
      
      match /chat/{messageId} {
        allow read, write: if request.auth != null;
      }
    }
    
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Test connection path for diagnostics
    match /test_connection/{document=**} {
      allow read: if request.auth != null;
    }
  }
}`}
            </pre>
            <li>Click "Publish"</li>
          </div>

          <div className="mt-6">
            <h3>5. Set Up Realtime Database</h3>
            <p className="font-bold text-amber-500">This step is crucial for the matchmaking functionality!</p>
            <ol>
              <li>From the left menu, click "Realtime Database"</li>
              <li>Click "Create database"</li>
              <li>Choose "Start in test mode" (you can update the rules later)</li>
              <li>Select a region for your database</li>
              <li>Click "Next" and wait for the database to be provisioned</li>
              <li>Go to the "Rules" tab and set the following security rules:</li>
            </ol>
            <pre className="bg-slate-800 text-slate-50 p-4 rounded-lg overflow-auto my-4">
              {`{
  "rules": {
    "matchmaking": {
      "$topicId": {
        "$userId": {
          ".read": "auth != null",
          ".write": "auth != null && (auth.uid == $userId || !data.exists())"
        }
      }
    },
    "clash-video-signaling": {
      "$clashId": {
        "$userId": {
          ".read": "auth != null",
          ".write": "auth != null"
        }
      }
    },
    "test_connection": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}`}
            </pre>
            <li>Click "Publish"</li>
            <li className="font-bold">Important: Copy the Realtime Database URL from the top of the page. It will look like: <br />
            <code>https://your-project-id-default-rtdb.firebaseio.com</code></li>
          </div>

          <div className="mt-6">
            <h3>6. Set Up Environment Variables</h3>
            <ol>
              <li>In your CodeClash project root, create a file named <code>.env.local</code></li>
              <li>Add the following environment variables:</li>
            </ol>
            <pre className="bg-slate-800 text-slate-50 p-4 rounded-lg overflow-auto my-4">
              {`NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com`}
            </pre>
            <li>Replace the placeholder values with your actual Firebase configuration</li>
          </div>

          <div className="mt-6">
            <h3>7. Restart Your Development Server</h3>
            <p>After setting up all the Firebase services and environment variables, restart your development server:</p>
            <pre className="bg-slate-800 text-slate-50 p-4 rounded-lg overflow-auto my-4">
              {`npm run dev`}
            </pre>
          </div>
        </section>

        <section id="troubleshooting" className="mt-10">
          <h2>Troubleshooting</h2>
          
          <div className="mt-6">
            <h3>Common Issues</h3>
            
            <div className="mt-4">
              <h4 className="font-bold">1. Waiting for an Opponent Forever</h4>
              <ul>
                <li>Check if your Realtime Database is properly configured</li>
                <li>Ensure the <code>NEXT_PUBLIC_FIREBASE_DATABASE_URL</code> is correctly set in your <code>.env.local</code> file</li>
                <li>Make sure your Realtime Database rules allow read/write to the matchmaking paths</li>
              </ul>
            </div>
            
            <div className="mt-4">
              <h4 className="font-bold">2. Authentication Issues</h4>
              <ul>
                <li>Check if the Authentication service is properly enabled</li>
                <li>Ensure you've enabled the Email/Password sign-in method</li>
              </ul>
            </div>
            
            <div className="mt-4">
              <h4 className="font-bold">3. Database Permission Errors</h4>
              <ul>
                <li>Review your Firestore and Realtime Database security rules</li>
                <li>Ensure they match the examples provided above</li>
              </ul>
            </div>
            
            <div className="mt-4">
              <h4 className="font-bold">4. Environment Variable Issues</h4>
              <ul>
                <li>Double-check all environment variables in your <code>.env.local</code> file</li>
                <li>Ensure there are no typos or missing values</li>
                <li>Restart your development server after making changes</li>
              </ul>
            </div>
          </div>

          <div className="mt-6">
            <h3>Using the Diagnostic Tool</h3>
            <p>CodeClash includes a built-in diagnostic tool to help troubleshoot Firebase connection issues:</p>
            <ol>
              <li>Go to the matching page</li>
              <li>Click the "Run Diagnostics" button in the interface</li>
              <li>The tool will check all Firebase connections and permissions</li>
              <li>Follow the specific recommendations provided in the results</li>
            </ol>
          </div>
        </section>

        <section id="testing" className="mt-10">
          <h2>Testing Matchmaking</h2>
          
          <div className="mt-4">
            <h3>Testing Without a Second User</h3>
            <ol>
              <li>Use the "Test Mode" feature on the matching page</li>
              <li>This creates a match with a simulated opponent</li>
              <li>You can practice and test the clash interface without waiting for a real opponent</li>
            </ol>
          </div>
          
          <div className="mt-6">
            <h3>Testing With Multiple Users</h3>
            <ol>
              <li>Open two different browsers or use an incognito window</li>
              <li>Sign in with two different accounts</li>
              <li>Navigate both to the matching page with the same topic selected</li>
              <li>The users should be matched within a few seconds</li>
            </ol>
          </div>
        </section>

        <div className="mt-12 pt-8 border-t">
          <Link href="/" className="text-primary hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
} 