import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

let adminDb: admin.firestore.Firestore;

const initializeAdminApp = async (): Promise<void> => {
  // Check if already initialized
  if (admin.apps.length > 0) {
    if (!adminDb) {
      adminDb = admin.firestore();
    }
    return;
  }

  try {
    // Use local service account file
    const serviceAccountPath = path.join(process.cwd(), 'src', 'lib', 'serviceAccountKey.json');
    
    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error("serviceAccountKey.json file not found at: " + serviceAccountPath);
    }

    const serviceAccountFile = fs.readFileSync(serviceAccountPath, 'utf8');
    const serviceAccount = JSON.parse(serviceAccountFile);

    // Validate service account
    if (!serviceAccount.type || !serviceAccount.private_key || !serviceAccount.client_email) {
      throw new Error("Invalid service account structure");
    }

    // Initialize Firebase Admin
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
    });

    // Initialize Firestore
    adminDb = admin.firestore();
    
    console.log("✅ Firebase Admin SDK initialized successfully with local file!");

  } catch (error: any) {
    console.error("❌ Firebase Admin SDK initialization failed:");
    console.error("Error:", error.message);
    
    throw new Error(`Firebase Admin SDK initialization failed: ${error.message}`);
  }
};

export { initializeAdminApp, adminDb };
