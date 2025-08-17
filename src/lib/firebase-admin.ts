// Firebase REST API approach (simplified)
import { db } from './firebase';
import { doc, setDoc, collection, getDocs, limit, query } from 'firebase/firestore';

const FIREBASE_API_KEY = "AIzaSyBSrAtUGXDh2BzUzUzd3s4I51mxRx6XFzo";
const PROJECT_ID = "panelpilot-pro";

// Initialize (no-op for compatibility)
const initializeAdminApp = async (): Promise<void> => {
  console.log("✅ Using Firebase REST API approach");
  return Promise.resolve();
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

      if (updateResponse.ok) {
        console.log("✅ Display name updated");
      } else {
        console.warn("⚠️ Failed to update display name");
      }
    }
    
    return {
      uid: data.localId,
      email: data.email || email,
      displayName: displayName
    };
  } catch (error: any) {
    console.error("❌ Error creating user:", error);
    throw error;
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

// Test function to verify user creation
const testUserLogin = async (email: string, password: string) => {
  try {
    console.log("🧪 Testing user login for:", email);
    
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
    
    if (response.ok) {
      console.log("✅ Test login successful:", data.localId);
      return { success: true, uid: data.localId };
    } else {
      console.error("❌ Test login failed:", data.error?.message);
      return { success: false, error: data.error?.message };
    }
  } catch (error: any) {
    console.error("❌ Test login error:", error);
    return { success: false, error: error.message };
  }
};

// Legacy exports for compatibility
const adminDb = getAdminDb();

export { initializeAdminApp, adminDb, getAdminDb, createUser, testUserLogin };
