// Simple test script for image upload
// Run this in browser console

async function simpleTest() {
  try {
    console.log("🧪 Simple test for image upload...");
    
    // Create a simple test file
    const canvas = document.createElement('canvas');
    canvas.width = 50;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 50, 50);
    
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
    console.log("✅ Test completed successfully!");
    console.log("✅ Base64 starts with:", base64Result.substring(0, 30) + "...");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
simpleTest();
