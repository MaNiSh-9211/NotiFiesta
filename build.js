// build.js - Custom build script for Vercel deployment
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Set environment to production
process.env.NODE_ENV = 'production';

try {
  console.log('🚀 Starting build process...');
  
  // Build the client and server
  console.log('📦 Building client and server...');
  execSync('npm run build', { stdio: 'inherit' });
  
  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}