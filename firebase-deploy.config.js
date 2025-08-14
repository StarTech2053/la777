const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Firebase App Hosting Deployment Configuration');

// Check if we're in the correct directory
const packageJsonPath = path.join(__dirname, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ package.json not found. Please run this from the project root.');
  process.exit(1);
}

// Check if firebase.json exists
const firebaseJsonPath = path.join(__dirname, 'firebase.json');
if (!fs.existsSync(firebaseJsonPath)) {
  console.error('❌ firebase.json not found.');
  process.exit(1);
}

console.log('✅ Project structure verified');

// Create a simple verification file
const verificationContent = `
# Firebase App Hosting Verification
# This file confirms that the root directory is correctly identified
# Generated at: ${new Date().toISOString()}
# Project: LA777 Casino Management System
`;

fs.writeFileSync(path.join(__dirname, 'FIREBASE_VERIFICATION.md'), verificationContent);

console.log('✅ Verification file created');

// Show current directory structure
console.log('\n📁 Current directory structure:');
const files = fs.readdirSync(__dirname);
files.forEach(file => {
  if (fs.statSync(path.join(__dirname, file)).isDirectory()) {
    console.log(`📁 ${file}/`);
  } else {
    console.log(`📄 ${file}`);
  }
});

console.log('\n🚀 Ready for deployment!');
console.log('Run: firebase deploy --only apphosting');
