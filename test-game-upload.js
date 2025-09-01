// Test script for game image upload
// Run this in browser console

async function testGameImageUpload() {
  try {
    console.log("🧪 Testing game image upload...");
    
    // Create a test image file
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    
    // Create a gradient background
    const gradient = ctx.createLinearGradient(0, 0, 200, 150);
    gradient.addColorStop(0, '#ff6b6b');
    gradient.addColorStop(1, '#4ecdc4');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 200, 150);
    
    // Add some text
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Test Game', 100, 75);
    
    // Convert canvas to blob
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const testFile = new File([blob], 'test-game.png', { type: 'image/png' });
    
    console.log("✅ Test game file created:", testFile.name, "Size:", testFile.size, "Type:", testFile.type);
    
    // Test base64 conversion (simulating uploadGameImage)
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result;
      console.log("✅ Game image base64 conversion successful, length:", base64.length);
      console.log("✅ Base64 starts with:", base64.substring(0, 50) + "...");
      console.log("✅ Test completed successfully!");
    };
    
    reader.onerror = (error) => {
      console.error("❌ Game image base64 conversion failed:", error);
    };
    
    reader.readAsDataURL(testFile);
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testGameImageUpload();
