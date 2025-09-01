// Test script to check Firebase Storage functionality
// Run this in browser console to test storage

import { storage } from './src/lib/firebase.js';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

async function testStorage() {
  try {
    console.log("🧪 Testing Firebase Storage...");
    
    // Check if storage is available
    if (!storage) {
      console.error("❌ Storage is not available");
      return false;
    }
    
    console.log("✅ Storage is available");
    
    // Create a test file
    const testContent = "Hello Firebase Storage!";
    const testFile = new File([testContent], "test.txt", { type: "text/plain" });
    
    // Try to upload
    const testPath = `test/${Date.now()}_test.txt`;
    const storageRef = ref(storage, testPath);
    
    console.log("🔄 Attempting upload...");
    const snapshot = await uploadBytes(storageRef, testFile);
    console.log("✅ Upload successful:", snapshot.ref.fullPath);
    
    // Try to get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log("✅ Download URL:", downloadURL);
    
    return true;
  } catch (error) {
    console.error("❌ Storage test failed:", error);
    return false;
  }
}

// Run the test
testStorage().then(success => {
  if (success) {
    console.log("🎉 Storage test passed!");
  } else {
    console.log("💥 Storage test failed!");
  }
});
