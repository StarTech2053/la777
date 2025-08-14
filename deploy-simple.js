const { execSync } = require('child_process');

console.log('🚀 Simple Firebase App Hosting Deployment');

try {
  // Step 1: Clean install
  console.log('📦 Installing dependencies...');
  execSync('npm ci --only=production', { stdio: 'inherit' });

  // Step 2: Build
  console.log('🔨 Building project...');
  execSync('npm run build', { stdio: 'inherit' });

  // Step 3: Deploy
  console.log('🚀 Deploying to Firebase App Hosting...');
  execSync('firebase deploy --only apphosting', { stdio: 'inherit' });

  console.log('✅ Deployment completed successfully!');
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}
