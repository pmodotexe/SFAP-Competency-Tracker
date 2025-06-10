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

// Deploy to Heroku
console.log('\n🚀 Deploying to Heroku...');
execSync('git add .', { stdio: 'inherit' });
execSync('git commit -m "Deploy to Heroku" || echo "No changes to commit"', { stdio: 'inherit' });
execSync('git push heroku main || git push heroku master', { stdio: 'inherit' });

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