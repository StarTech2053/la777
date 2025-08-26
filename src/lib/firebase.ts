
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  "projectId": "panelpilot-pro",
  "appId": "1:173367953493:web:415d1f3d8652859b92acdc",
  "storageBucket": "panelpilot-pro.appspot.com",
  "apiKey": "AIzaSyBSrAtUGXDh2BzUzUzd3s4I51mxRx6XFzo",
  "authDomain": "panelpilot-pro.firebaseapp.com",
  "messagingSenderId": "173367953493"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };
