// Test script for direct Firebase upload
// Run this in browser console

async function testDirectUpload() {
  try {
    console.log("🧪 Testing direct Firebase upload...");
    
    // Create a test image file
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'green';
    ctx.fillRect(0, 0, 100, 100);
    
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const testFile = new File([blob], 'test.png', { type: 'image/png' });
    
    console.log("✅ Test file created:", testFile.name, "Size:", testFile.size);
    
    // Test base64 conversion
    const base64Promise = new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const result = reader.result;
        console.log("✅ Base64 conversion successful, length:", result.length);
        resolve(result);
      };
      
      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };
      
      reader.readAsDataURL(testFile);
    });
    
    const base64Result = await base64Promise;
    console.log("✅ Base64 starts with:", base64Result.substring(0, 50) + "...");
    
    // Test Firebase import
    console.log("📝 Testing Firebase imports...");
    
    try {
      const { collection, addDoc } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      
      console.log("✅ Firebase imports successful");
      console.log("✅ Collection function:", typeof collection);
      console.log("✅ AddDoc function:", typeof addDoc);
      console.log("✅ DB object:", typeof db);
      
      console.log("🎉 All tests passed! Direct upload should work.");
      
    } catch (firebaseError) {
      console.error("❌ Firebase import failed:", firebaseError);
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testDirectUpload();
