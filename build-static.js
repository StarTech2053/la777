const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Building static files for Firebase hosting...');

// Step 1: Build Next.js project
console.log('📦 Building Next.js project...');
execSync('npm run build', { stdio: 'inherit' });

// Step 2: Create out directory
const outDir = path.join(__dirname, 'out');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Step 3: Copy all files from .next to out
console.log('📁 Copying all Next.js files...');
const nextDir = path.join(__dirname, '.next');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const files = fs.readdirSync(src);
  files.forEach(file => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

// Copy static files
const staticDir = path.join(nextDir, 'static');
const outStaticDir = path.join(outDir, '_next', 'static');
if (fs.existsSync(staticDir)) {
  copyDir(staticDir, outStaticDir);
}

// Copy HTML files from .next/server/pages to out
const pagesDir = path.join(nextDir, 'server', 'pages');
const outPagesDir = path.join(outDir, 'pages');
if (fs.existsSync(pagesDir)) {
  copyDir(pagesDir, outPagesDir);
}

// Copy app directory files
const appDir = path.join(nextDir, 'server', 'app');
const outAppDir = path.join(outDir, 'app');
if (fs.existsSync(appDir)) {
  copyDir(appDir, outAppDir);
}

// Step 4: Create proper index.html
console.log('📄 Creating index.html...');
const indexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LA777 Casino</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: #1a1a1a; 
            color: white; 
            margin: 0;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 50px 20px;
        }
        h1 { color: #4CAF50; margin-bottom: 30px; }
        .btn { 
            display: inline-block; 
            padding: 15px 30px; 
            background: #4CAF50; 
            color: white; 
            text-decoration: none; 
            border-radius: 8px; 
            margin: 10px;
            font-weight: bold;
            transition: background 0.3s;
        }
        .btn:hover { background: #45a049; }
        .loading { 
            font-size: 18px; 
            margin: 20px 0; 
            color: #ccc; 
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎰 LA777 Casino</h1>
        <p class="loading">Loading your casino management system...</p>
        <div>
            <a href="/dashboard" class="btn">Go to Dashboard</a>
            <a href="/players" class="btn">Manage Players</a>
            <a href="/games" class="btn">Manage Games</a>
        </div>
    </div>
    <script>
        // Auto redirect after 3 seconds
        setTimeout(() => {
            window.location.href = '/dashboard';
        }, 3000);
    </script>
</body>
</html>
`;

fs.writeFileSync(path.join(outDir, 'index.html'), indexHtml);

// Step 5: Create 404.html
console.log('📄 Creating 404.html...');
const notFoundHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Not Found - LA777 Casino</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: #1a1a1a; 
            color: white; 
            margin: 0;
        }
        .container { max-width: 600px; margin: 0 auto; }
        h1 { color: #ff6b6b; margin-bottom: 30px; }
        .btn { 
            display: inline-block; 
            padding: 15px 30px; 
            background: #4CAF50; 
            color: white; 
            text-decoration: none; 
            border-radius: 8px; 
            margin: 10px;
            font-weight: bold;
            transition: background 0.3s;
        }
        .btn:hover { background: #45a049; }
    </style>
</head>
<body>
    <div class="container">
        <h1>404 - Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <div>
            <a href="/dashboard" class="btn">Go to Dashboard</a>
            <a href="/players" class="btn">Manage Players</a>
        </div>
    </div>
</body>
</html>
`;

fs.writeFileSync(path.join(outDir, '404.html'), notFoundHtml);

console.log('✅ Static build complete! Files are ready in the "out" directory.');
console.log('🚀 You can now run: firebase deploy --only hosting');
