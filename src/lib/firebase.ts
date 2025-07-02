import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getDatabase, type Database } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

export const isConfigured = 
  !!firebaseConfig.apiKey &&
  !!firebaseConfig.authDomain &&
  !!firebaseConfig.projectId &&
  !!firebaseConfig.storageBucket &&
  !!firebaseConfig.messagingSenderId &&
  !!firebaseConfig.appId &&
  !!firebaseConfig.databaseURL;

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let rtdb: Database;

if (isConfigured) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    rtdb = getDatabase(app);
} else {
    console.warn(
        "Firebase configuration is missing or incomplete. " +
        "Please check your `.env` file and ensure all `NEXT_PUBLIC_FIREBASE_*` variables are set. " +
        "The application will be rendered in a 'configuration needed' state."
    );
    // Provide dummy objects to prevent crashes server-side
    app = {} as FirebaseApp;
    auth = {} as Auth;
    db = {} as Firestore;
    rtdb = {} as Database;
}

export { app, auth, db, rtdb };
