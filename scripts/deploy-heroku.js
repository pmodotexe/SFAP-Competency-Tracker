const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Heroku deployment process...\n');

// Check if Heroku CLI is installed
try {
    execSync('heroku --version', { stdio: 'pipe' });
    console.log('✅ Heroku CLI is installed');
} catch (error) {
    console.error('❌ Heroku CLI is not installed. Please install it first:');
    console.error('   Visit: https://devcenter.heroku.com/articles/heroku-cli');
    process.exit(1);
}

// Check if user is logged in to Heroku
try {
    execSync('heroku auth:whoami', { stdio: 'pipe' });
    console.log('✅ Logged in to Heroku');
} catch (error) {
    console.error('❌ Not logged in to Heroku. Please run: heroku login');
    process.exit(1);
}

// Check if git repository exists
if (!fs.existsSync('.git')) {
    console.log('📦 Initializing git repository...');
    execSync('git init', { stdio: 'inherit' });
    execSync('git add .', { stdio: 'inherit' });
    execSync('git commit -m "Initial commit for Heroku deployment"', { stdio: 'inherit' });
}

// Create Heroku app
const appName = process.argv[2] || 'sfap-competency-tracker';
console.log(`\n🏗️  Creating Heroku app: ${appName}`);

try {
    execSync(`heroku create ${appName}`, { stdio: 'inherit' });
    console.log(`✅ Heroku app created: ${appName}`);
} catch (error) {
    console.log('ℹ️  App might already exist or name is taken. Continuing...');
}

// Set environment variables
console.log('\n🔧 Setting environment variables...');
execSync('heroku config:set NODE_ENV=production', { stdio: 'inherit' });
execSync('heroku config:set SESSION_SECRET=' + (process.env.SESSION_SECRET || 'your-super-secret-session-key-change-this-in-production'), { stdio: 'inherit' });

// Check current branch and deploy to Heroku
console.log('\n🚀 Deploying to Heroku...');
execSync('git add .', { stdio: 'inherit' });

try {
    execSync('git commit -m "Deploy to Heroku"', { stdio: 'inherit' });
} catch (error) {
    console.log('ℹ️  No changes to commit');
}

// Get current branch name
let currentBranch;
try {
    currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
} catch (error) {
    currentBranch = 'main';
}

console.log(`📤 Pushing ${currentBranch} branch to Heroku...`);

try {
    execSync(`git push heroku ${currentBranch}:main`, { stdio: 'inherit' });
} catch (error) {
    console.error('\n❌ Git push failed. This might be due to:');
    console.error('   1. Git version compatibility (Heroku requires Git 2.40+)');
    console.error('   2. Authentication issues');
    console.error('   3. Network connectivity');
    console.error('\n💡 Solutions:');
    console.error('   1. Update Git: brew install git (on macOS)');
    console.error('   2. Try manual deployment:');
    console.error(`      git push heroku ${currentBranch}:main`);
    console.error('   3. Check Heroku login: heroku auth:whoami');
    process.exit(1);
}

// Run database setup on Heroku
console.log('\n🗄️  Setting up database on Heroku...');
execSync('heroku run npm run setup', { stdio: 'inherit' });

console.log('\n✅ Deployment complete!');
console.log(`🌐 Your app is available at: https://${appName}.herokuapp.com`);
console.log('\n📋 Next steps:');
console.log('   1. Visit your app URL to test it');
console.log('   2. Create a user account');
console.log('   3. Import competency data if needed');
console.log('\n💡 Useful Heroku commands:');
console.log('   heroku logs --tail                 # View live logs');
console.log('   heroku run node scripts/setup.js   # Re-run database setup');
console.log('   heroku config                      # View environment variables');
console.log('   heroku open                        # Open app in browser');