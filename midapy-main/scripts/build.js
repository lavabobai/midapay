const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

async function build() {
  try {
    console.log('🚀 Starting build process...\n');

    // 1. Build TypeScript
    console.log('📦 Building TypeScript...');
    execSync('tsc && tsc-alias', { stdio: 'inherit' });
    console.log('✅ TypeScript build completed\n');

    // 2. Run database migrations
    console.log('🗄️  Running database migrations...');
    const migrate = require('./migrate');
    await migrate();

    console.log('\n✨ Build completed successfully!');
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Si le script est exécuté directement (pas importé comme module)
if (require.main === module) {
  build();
}
