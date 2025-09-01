// Simple test script for image upload
// Run this in browser console

async function testImageUpload() {
  try {
    console.log("🧪 Testing image upload...");
    
    // Create a test image file
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 100, 100);
    
    // Convert canvas to blob
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const testFile = new File([blob], 'test.png', { type: 'image/png' });
    
    console.log("✅ Test file created:", testFile.name, "Size:", testFile.size);
    
    // Test base64 conversion
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result;
      console.log("✅ Base64 conversion successful, length:", base64.length);
      console.log("✅ Test completed successfully!");
    };
    
    reader.onerror = (error) => {
      console.error("❌ Base64 conversion failed:", error);
    };
    
    reader.readAsDataURL(testFile);
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testImageUpload();
