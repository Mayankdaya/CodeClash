// Deployment script for CodeClash
const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🚀 CodeClash Deployment Script\n');

// Check if .env.local exists and create if not
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
  process.exit(0);
}

// Check if Firebase config is set
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
  if (!regex.test(envContent) || envContent.match(regex)[1].trim() === '') {
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

// Ask for deployment environment
rl.question('\nDeploy to production? (y/n) ', (answer) => {
  const isProd = answer.toLowerCase() === 'y';
  
  console.log(`\n🔄 Deploying to ${isProd ? 'production' : 'preview'}...`);
  
  try {
    // Run vercel command
    const command = isProd ? 'vercel --prod' : 'vercel';
    execSync(command, { stdio: 'inherit' });
    console.log('\n✅ Deployment initiated successfully!');
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    console.log('\nTry running the vercel command manually:');
    console.log(isProd ? '  vercel --prod' : '  vercel');
  }
  
  rl.close();
}); 