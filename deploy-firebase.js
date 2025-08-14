const { execSync } = require('child_process');

console.log('🚀 Starting Firebase deployment...');

try {
  // Step 1: Install dependencies
  console.log('📦 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });

  // Step 2: Build the project
  console.log('🔨 Building project...');
  execSync('npm run build:apphosting', { stdio: 'inherit' });

  // Step 3: Deploy to Firebase
  console.log('🚀 Deploying to Firebase...');
  execSync('firebase deploy --only apphosting', { stdio: 'inherit' });

  console.log('✅ Deployment completed successfully!');
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}
