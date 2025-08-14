// Firebase REST API approach to avoid Next.js compatibility issues
import { db } from './firebase';
import { doc, setDoc, collection, getDocs, limit, query } from 'firebase/firestore';

const FIREBASE_API_KEY = "AIzaSyBSrAtUGXDh2BzUzUzd3s4I51mxRx6XFzo";
const PROJECT_ID = "panelpilot-pro";

// Initialize (no-op for compatibility)
const initializeAdminApp = async (): Promise<void> => {
  console.log("✅ Using Firebase REST API approach");
  return Promise.resolve();
};

// Create user using Firebase client SDK (more reliable)
const createUser = async (email: string, password: string, displayName: string) => {
  try {
    console.log("🔧 Creating user with:", { email, displayName, passwordLength: password.length });
    
    // Use Firebase client SDK for user creation
    const { createUserWithEmailAndPassword, updateProfile, signOut } = await import('firebase/auth');
    const { auth } = await import('./firebase');
    
    // Create user account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("✅ User created successfully:", userCredential.user.uid);
    
    // Update display name
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, {
        displayName: displayName
      });
      console.log("✅ Display name updated");
    }
    
    // Sign out the newly created user so they can sign in manually
    await signOut(auth);
    console.log("🔓 User signed out after creation");
    
    return {
      uid: userCredential.user.uid,
      email: userCredential.user.email || email,
      displayName: displayName
    };
  } catch (error: any) {
    console.error("❌ Error creating user:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    
    // Handle specific Firebase errors
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('This email address is already in use.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password should be at least 6 characters.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address.');
    } else if (error.code === 'auth/configuration-not-found') {
      throw new Error('Firebase Authentication is not enabled. Please enable Email/Password authentication in Firebase Console.');
    } else {
      throw new Error(error.message || 'Failed to create user. Please check Firebase Authentication setup.');
    }
  }
};

// Firestore operations using client SDK
const getAdminDb = () => {
  return {
    collection: (collectionName: string) => {
      return {
        doc: (docId: string) => {
          return {
            set: async (data: any) => {
              await setDoc(doc(db, collectionName, docId), data);
            }
          };
        },
        limit: (limitCount: number) => {
          return {
            get: async () => {
              const q = query(collection(db, collectionName), limit(limitCount));
              const snapshot = await getDocs(q);
              return {
                empty: snapshot.empty,
                docs: snapshot.docs
              };
            }
          };
        }
      };
    }
  };
};

// Legacy exports for compatibility
const adminDb = getAdminDb();

export { initializeAdminApp, adminDb, getAdminDb, createUser };
