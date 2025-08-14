import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

let adminDb: admin.firestore.Firestore;
let isInitialized = false;

const initializeAdminApp = async (): Promise<void> => {
  // Check if already initialized
  if (isInitialized && adminDb) {
    return;
  }

  try {
    // Check if app is already initialized
    if (admin.apps.length > 0) {
      adminDb = admin.firestore();
      isInitialized = true;
      console.log("✅ Firebase Admin SDK already initialized!");
      return;
    }

    // Try multiple paths for service account
    const possiblePaths = [
      path.join(process.cwd(), 'serviceAccountKey.json'),
      path.join(process.cwd(), 'src', 'lib', 'serviceAccountKey.json'),
      path.join(process.cwd(), 'lib', 'serviceAccountKey.json'),
    ];

    let serviceAccountPath = null;
    for (const path of possiblePaths) {
      if (fs.existsSync(path)) {
        serviceAccountPath = path;
        break;
      }
    }

    if (!serviceAccountPath) {
      throw new Error("serviceAccountKey.json file not found in any of the expected locations");
    }

    console.log("📁 Using service account from:", serviceAccountPath);

    const serviceAccountFile = fs.readFileSync(serviceAccountPath, 'utf8');
    const serviceAccount = JSON.parse(serviceAccountFile);

    // Validate service account
    if (!serviceAccount.type || !serviceAccount.private_key || !serviceAccount.client_email) {
      throw new Error("Invalid service account structure - missing required fields");
    }

    // Initialize Firebase Admin
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      projectId: serviceAccount.project_id
    });

    // Initialize Firestore
    adminDb = admin.firestore();
    isInitialized = true;
    
    console.log("✅ Firebase Admin SDK initialized successfully!");

  } catch (error: any) {
    console.error("❌ Firebase Admin SDK initialization failed:");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
    
    throw new Error(`Firebase Admin SDK initialization failed: ${error.message}`);
  }
};

const getAdminDb = (): admin.firestore.Firestore => {
  if (!adminDb) {
    throw new Error("Firebase Admin SDK not initialized. Call initializeAdminApp() first.");
  }
  return adminDb;
};

export { initializeAdminApp, adminDb, getAdminDb };
