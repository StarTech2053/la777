const { spawn } = require('child_process');

// Get port from environment variable or use default
const port = process.env.PORT || 3000;

console.log(`🚀 Starting server on port ${port}...`);

// Start Next.js server
const server = spawn('npx', ['next', 'start', '-p', port.toString()], {
  stdio: 'inherit',
  shell: true
});

server.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`✅ Server stopped with code ${code}`);
  process.exit(code);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  server.kill('SIGTERM');
});
