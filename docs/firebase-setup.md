# Firebase Setup Guide for CodeClash

This document provides detailed instructions for setting up Firebase for CodeClash. Proper Firebase configuration is critical for the matchmaking functionality to work correctly.

## Required Firebase Services

CodeClash requires the following Firebase services:

1. **Firebase Authentication** - For user login/registration
2. **Firestore Database** - For storing user data, clash details, and problems
3. **Realtime Database** - For matchmaking functionality (finding opponents)

## Step-by-Step Setup

### 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter a project name (e.g., "CodeClash")
4. Choose whether to enable Google Analytics (optional)
5. Complete the project creation process

### 2. Register a Web App

1. In your Firebase project dashboard, click the web icon (</>) to add a web app
2. Give your app a name (e.g., "CodeClash Web")
3. Register the app
4. Copy the Firebase configuration object - it will look like this:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};
```

### 3. Set Up Authentication

1. In the Firebase Console, go to "Authentication" from the left menu
2. Click "Get started"
3. Enable the "Email/Password" sign-in method
4. (Optional) Enable additional sign-in methods like Google, GitHub, etc.

### 4. Set Up Firestore Database

1. From the left menu, click "Firestore Database"
2. Click "Create database"
3. Choose "Start in production mode" (recommended) or "Start in test mode"
4. Select a region for your database
5. Click "Next" and wait for the database to be provisioned
6. Go to the "Rules" tab and set the following security rules:

```
rules_version = '2';
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
}
```

7. Click "Publish"

### 5. Set Up Realtime Database

This step is **crucial** for the matchmaking functionality!

1. From the left menu, click "Realtime Database"
2. Click "Create database"
3. Choose "Start in test mode" (you can update the rules later)
4. Select a region for your database
5. Click "Next" and wait for the database to be provisioned
6. Go to the "Rules" tab and set the following security rules:

```json
{
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
    "status": {
      "$userId": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid == $userId"
      }
    },
    "invitations": {
      "$userId": {
        ".read": "auth != null && auth.uid == $userId",
        ".write": "auth != null"
      }
    },
    "test_connection": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

7. Click "Publish"
8. **Important**: Copy the Realtime Database URL from the top of the page. It will look like:
   `https://your-project-id-default-rtdb.firebaseio.com`

### 6. Set Up Environment Variables

1. In your CodeClash project root, create a file named `.env.local`
2. Add the following environment variables:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com
```

3. Replace the placeholder values with your actual Firebase configuration

### 7. Restart Your Development Server

After setting up all the Firebase services and environment variables, restart your development server:

```bash
npm run dev
```

## Troubleshooting

### Common Issues

1. **Waiting for an Opponent Forever**
   - Check if your Realtime Database is properly configured
   - Ensure the `NEXT_PUBLIC_FIREBASE_DATABASE_URL` is correctly set in your `.env.local` file
   - Make sure your Realtime Database rules allow read/write to the matchmaking paths

2. **Authentication Issues**
   - Check if the Authentication service is properly enabled
   - Ensure you've enabled the Email/Password sign-in method

3. **Database Permission Errors**
   - Review your Firestore and Realtime Database security rules
   - Ensure they match the examples provided above

4. **Environment Variable Issues**
   - Double-check all environment variables in your `.env.local` file
   - Ensure there are no typos or missing values
   - Restart your development server after making changes

### Using the Diagnostic Tool

CodeClash includes a built-in diagnostic tool to help troubleshoot Firebase connection issues:

1. Go to the matching page
2. Click the "Run Diagnostics" button in the interface
3. The tool will check all Firebase connections and permissions
4. Follow the specific recommendations provided in the results

## Testing Matchmaking

To test matchmaking without a second user:

1. Use the "Test Mode" feature on the matching page
2. This creates a match with a simulated opponent
3. You can practice and test the clash interface without waiting for a real opponent

For real matchmaking tests with multiple users:

1. Open two different browsers or use an incognito window
2. Sign in with two different accounts
3. Navigate both to the matching page with the same topic selected
4. The users should be matched within a few seconds 