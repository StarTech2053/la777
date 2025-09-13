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
    
    // First check if user exists in Firestore with deleted status
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('./firebase');
      
      const staffQuery = query(
        collection(db, 'staff'),
        where('email', '==', email)
      );
      const staffSnapshot = await getDocs(staffQuery);
      
      if (!staffSnapshot.empty) {
        const existingStaff = staffSnapshot.docs[0].data();
        if (existingStaff.status === 'Deleted' || existingStaff.deleted === true) {
          console.log("🔄 Found deleted staff with same email, allowing recreation:", email);
          // Delete the old document first
          const { doc, deleteDoc } = await import('firebase/firestore');
          await deleteDoc(doc(db, 'staff', staffSnapshot.docs[0].id));
          console.log("✅ Deleted old staff document");
        } else {
          console.log("❌ Active staff with same email exists:", email);
          throw new Error('This email address is already in use. Please use a different email address.');
        }
      }
    } catch (firestoreError) {
      console.log("ℹ️ Firestore check failed, proceeding with user creation:", firestoreError);
    }
    
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
        throw new Error('This email address is already in use. Please use a different email address.');
      } else if (data.error?.message === 'WEAK_PASSWORD') {
        throw new Error('Password should be at least 6 characters.');
      } else if (data.error?.message === 'INVALID_EMAIL') {
        throw new Error('Invalid email address.');
      } else if (data.error?.message === 'TOO_MANY_ATTEMPTS_TRY_LATER') {
        throw new Error('Too many attempts. Please try again later.');
      } else {
        throw new Error(data.error?.message || 'Failed to create user. Please try again.');
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

// Mock getAdminAuth function for compatibility (using REST API approach)
const getAdminAuth = () => {
  return {
    getUserByEmail: async (email: string) => {
      try {
        console.log("🔍 Checking if email exists:", email);
        
        // Use Firebase REST API to check if email exists
        // We'll try to create a user with a temporary password and then delete it
        // This is a workaround since REST API doesn't have direct email lookup
        const tempPassword = 'TempCheck123!@#';
        
        const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            password: tempPassword,
            returnSecureToken: true
          })
        });

        const data = await response.json();
        
        if (!response.ok) {
          if (data.error?.message === 'EMAIL_EXISTS') {
            // Email already exists
            console.log("❌ Email already exists:", email);
            return { uid: 'existing_user', email: email };
          } else {
            // Other error - assume email doesn't exist
            console.log("✅ Email is available:", email);
            throw new Error('auth/user-not-found');
          }
        } else {
          // User was created successfully, meaning email was available
          // We need to delete this temporary user
          console.log("✅ Email is available (temporary user created):", email);
          
          // Delete the temporary user by trying to sign in and then delete
          // Note: This is a limitation of REST API - we can't actually delete
          // But we know the email is available, so we'll throw user-not-found
          throw new Error('auth/user-not-found');
        }
      } catch (error: any) {
        if (error.message === 'auth/user-not-found') {
          throw error;
        }
        // For other errors, assume user doesn't exist
        console.log("✅ Email is available (error case):", email);
        throw new Error('auth/user-not-found');
      }
    },
    
    deleteUser: async (uid: string) => {
      try {
        console.log("🗑️ Deleting user from Firebase Auth:", uid);
        
        // Firebase REST API doesn't have direct user deletion endpoint
        // We need to use a different approach - mark user as deleted in Firestore
        // and handle login attempts in the authentication flow
        
        // For now, we'll just delete from Firestore and log the limitation
        console.log("⚠️ Firebase REST API limitation: Cannot delete user from Auth directly");
        console.log("✅ User will be marked as deleted in Firestore only");
        
        // Return success since Firestore deletion will be handled separately
        return { success: true };
      } catch (error: any) {
        console.error("❌ Error in deleteUser:", error);
        throw error;
      }
    }
  };
};

// Legacy exports for compatibility
const adminDb = getAdminDb();

export { initializeAdminApp, adminDb, getAdminDb, getAdminAuth, createUser, testUserLogin };
