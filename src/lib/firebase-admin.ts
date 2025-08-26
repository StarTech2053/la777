import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as fs from 'fs';
import * as path from 'path';

// Use environment variable for API key instead of hardcoding
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

if (!FIREBASE_API_KEY) {
  throw new Error('FIREBASE_API_KEY environment variable is required');
}

let adminApp: any = null;
let adminDb: any = null;
let adminAuth: any = null;

const initializeAdminApp = async () => {
  if (adminApp) {
    console.log("✅ Firebase Admin SDK already initialized!");
    return;
  }

  try {
    // Try to find service account key file
    const possiblePaths = [
      './lib/serviceAccountKey.json',
      './src/lib/serviceAccountKey.json',
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH || './lib/serviceAccountKey.json'
    ];

    let serviceAccountPath = null;
    for (const path of possiblePaths) {
      if (fs.existsSync(path)) {
        serviceAccountPath = path;
        break;
      }
    }

    if (!serviceAccountPath) {
      throw new Error('Service account key file not found');
    }

    console.log("📁 Using service account from:", serviceAccountPath);
    
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    
    adminApp = initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    });

    adminDb = getFirestore(adminApp);
    adminAuth = getAuth(adminApp);
    
    console.log("✅ Firebase Admin SDK initialized successfully!");
    
  } catch (error: any) {
    console.error("❌ Firebase Admin SDK initialization failed:");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
    throw error;
  }
};

const getAdminDb = () => {
  if (!adminDb) {
    throw new Error('Firebase Admin SDK not initialized. Call initializeAdminApp() first.');
  }
  return adminDb;
};

const getAdminAuth = () => {
  if (!adminAuth) {
    throw new Error('Firebase Admin SDK not initialized. Call initializeAdminApp() first.');
  }
  return adminAuth;
};

// Create user using Firebase REST API
const createUser = async (email: string, password: string, displayName: string) => {
  try {
    console.log("🔧 Creating user with:", { email, displayName, passwordLength: password.length });
    
    // Use Firebase REST API to create user
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password,
        returnSecureToken: true
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("❌ Firebase API error:", data);
      if (data.error?.message === 'EMAIL_EXISTS') {
        throw new Error('This email address is already in use.');
      } else if (data.error?.message === 'WEAK_PASSWORD') {
        throw new Error('Password should be at least 6 characters.');
      } else if (data.error?.message === 'INVALID_EMAIL') {
        throw new Error('Invalid email address.');
      } else {
        throw new Error(data.error?.message || 'Failed to create user.');
      }
    }

    console.log("✅ User created successfully:", data.localId);
    console.log("✅ User data:", { uid: data.localId, email: data.email, idToken: data.idToken ? 'Present' : 'Missing' });
    
    // Update display name using REST API
    if (displayName && data.idToken) {
      const updateResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken: data.idToken,
          displayName: displayName,
          returnSecureToken: false
        })
      });

      if (!updateResponse.ok) {
        console.warn("⚠️ Failed to update display name, but user was created");
      }
    }
    
    return {
      uid: data.localId,
      email: data.email,
      displayName: displayName
    };
    
  } catch (error: any) {
    console.error("❌ Error creating user:", error);
    throw error;
  }
};

// Test function to verify user creation
const testUserLogin = async (email: string, password: string) => {
  try {
    console.log("🔧 Testing login for:", email);
    
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password,
        returnSecureToken: true
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Login failed');
    }

    console.log("✅ Login test successful for:", email);
    return { success: true, uid: data.localId };
    
  } catch (error: any) {
    console.error("❌ Login test failed:", error);
    throw error;
  }
};

export {
  initializeAdminApp,
  getAdminDb,
  getAdminAuth,
  createUser,
  testUserLogin
};
