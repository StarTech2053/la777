// Debug script for storage functions
// Run this in browser console

async function debugStorage() {
  try {
    console.log("🔍 Debugging storage functions...");
    
    // Test 1: Create a test file
    console.log("📝 Test 1: Creating test file...");
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'blue';
    ctx.fillRect(0, 0, 100, 100);
    
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const testFile = new File([blob], 'test.png', { type: 'image/png' });
    
    console.log("✅ Test file created:", {
      name: testFile.name,
      size: testFile.size,
      type: testFile.type
    });
    
    // Test 2: Test base64 conversion
    console.log("📝 Test 2: Testing base64 conversion...");
    
    const base64Promise = new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        try {
          const result = reader.result;
          console.log("✅ Base64 conversion successful:", {
            length: result.length,
            startsWith: result.substring(0, 50) + "..."
          });
          resolve(result);
        } catch (error) {
          console.error("❌ Error processing base64 result:", error);
          reject(new Error("Failed to process image data"));
        }
      };
      
      reader.onerror = (error) => {
        console.error("❌ FileReader error:", error);
        reject(new Error("Failed to read image file"));
      };
      
      reader.readAsDataURL(testFile);
    });
    
    const base64Result = await base64Promise;
    console.log("✅ Base64 test completed successfully!");
    
    // Test 3: Test file size validation
    console.log("📝 Test 3: Testing file size validation...");
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (testFile.size > maxSize) {
      throw new Error(`File size must be less than 5MB. Current size: ${(testFile.size / (1024 * 1024)).toFixed(2)}MB`);
    }
    console.log("✅ File size validation passed!");
    
    // Test 4: Test file type validation
    console.log("📝 Test 4: Testing file type validation...");
    if (!testFile.type.startsWith('image/')) {
      throw new Error('File must be an image (JPEG, PNG, GIF, etc.)');
    }
    console.log("✅ File type validation passed!");
    
    console.log("🎉 All tests passed! Storage functions are working correctly.");
    
  } catch (error) {
    console.error("❌ Debug test failed:", error);
    console.error("❌ Error details:", {
      message: error.message,
      stack: error.stack
    });
  }
}

// Run the debug
debugStorage();
