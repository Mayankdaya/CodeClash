// Enhanced Vercel Deployment Script
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n🚀 CodeClash Vercel Deployment Script\n');

// Check for .env.local file
if (!fs.existsSync('.env.local')) {
  console.log('⚠️  No .env.local file found. Creating template...');
  const envTemplate = `# CodeClash Firebase Configuration
# Fill in your Firebase project credentials

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
`;
  fs.writeFileSync('.env.local', envTemplate);
  console.log('✅ Created .env.local template. Please fill in your Firebase credentials before deploying.');
  console.log('ℹ️  Edit the .env.local file and run this script again.');
  process.exit(1);
}

// Check for Vercel CLI
try {
  execSync('vercel --version', { stdio: 'ignore' });
  console.log('✅ Vercel CLI is installed.');
} catch (error) {
  console.log('⚠️  Vercel CLI is not installed. Installing now...');
  try {
    execSync('npm install -g vercel', { stdio: 'inherit' });
    console.log('✅ Vercel CLI installed successfully.');
  } catch (installError) {
    console.error('❌ Failed to install Vercel CLI:', installError.message);
    console.log('ℹ️  Try running: npm install -g vercel');
    process.exit(1);
  }
}

// Check if project exists on Vercel
console.log('🔍 Checking if project exists on Vercel...');
const isProd = process.argv.includes('--prod');

// Check for Firebase configuration
console.log('🔍 Checking Firebase configuration...');
const envContent = fs.readFileSync('.env.local', 'utf8');
const missingEnvVars = [];

[
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'NEXT_PUBLIC_FIREBASE_DATABASE_URL'
].forEach(envVar => {
  const regex = new RegExp(`${envVar}=(.+)`);
  if (!regex.test(envContent) || (envContent.match(regex) && envContent.match(regex)[1].trim() === '')) {
    missingEnvVars.push(envVar);
  }
});

if (missingEnvVars.length > 0) {
  console.log('⚠️  Missing Firebase configuration variables:');
  missingEnvVars.forEach(envVar => console.log(`   - ${envVar}`));
  console.log('\nPlease fill in these variables in your .env.local file before deploying.');
  process.exit(1);
}

console.log('✅ Firebase configuration found.');

// Deploy to Vercel
console.log(`\n🔄 Deploying to ${isProd ? 'production' : 'preview'}...`);

try {
  console.log('\n📝 Running Vercel deployment...');
  console.log('ℹ️  You might need to log in if prompted and answer some configuration questions.\n');
  
  const command = isProd ? 'vercel --prod' : 'vercel';
  const deployment = spawnSync(command, { 
    stdio: 'inherit', 
    shell: true 
  });
  
  if (deployment.status !== 0) {
    throw new Error(`Command exited with status ${deployment.status}`);
  }
  
  console.log('\n✅ Deployment initiated successfully!');
  console.log('\nℹ️  Visit your Vercel dashboard to check deployment status.');
} catch (error) {
  console.error('\n❌ Deployment failed:', error.message);
  console.log('\nTry running the vercel command manually:');
  console.log(isProd ? '  vercel --prod' : '  vercel');
} 