// Setup script for SFAP Competency Tracker
// This script helps you get started quickly with the application

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function setupApplication() {
    console.log('🚀 Setting up SFAP Competency Tracker...\n');
    
    try {
        // Check Node.js version
        checkNodeVersion();
        
        // Create necessary directories
        createDirectories();
        
        // Setup environment file
        setupEnvironment();
        
        // Install dependencies if not already installed
        installDependencies();
        
        // Initialize database
        initializeDatabase();
        
        // Show next steps
        showNextSteps();
        
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        console.log('\nPlease check the error above and try again.');
    }
}

function checkNodeVersion() {
    console.log('📋 Checking Node.js version...');
    
    try {
        const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
        const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
        
        console.log(`   Node.js version: ${nodeVersion}`);
        
        if (majorVersion < 16) {
            throw new Error('Node.js 16 or higher is required. Please update Node.js.');
        }
        
        console.log('   ✅ Node.js version is compatible\n');
    } catch (error) {
        throw new Error('Node.js is not installed or not accessible. Please install Node.js 16+.');
    }
}

function createDirectories() {
    console.log('📁 Creating necessary directories...');
    
    const directories = [
        './data',
        './backups',
        './logs'
    ];
    
    directories.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`   Created: ${dir}`);
        } else {
            console.log(`   Exists: ${dir}`);
        }
    });
    
    console.log('   ✅ Directories ready\n');
}

function setupEnvironment() {
    console.log('⚙️  Setting up environment configuration...');
    
    const envPath = './.env';
    const envExamplePath = './.env.example';
    
    if (!fs.existsSync(envPath)) {
        if (fs.existsSync(envExamplePath)) {
            // Copy .env.example to .env
            let envContent = fs.readFileSync(envExamplePath, 'utf8');
            
            // Generate a random session secret
            const sessionSecret = generateRandomString(64);
            envContent = envContent.replace(
                'SESSION_SECRET=your-very-secure-session-secret-change-this-in-production',
                `SESSION_SECRET=${sessionSecret}`
            );
            
            fs.writeFileSync(envPath, envContent);
            console.log('   Created .env file with generated session secret');
        } else {
            // Create basic .env file
            const basicEnv = `PORT=3000
NODE_ENV=development
SESSION_SECRET=${generateRandomString(64)}
`;
            fs.writeFileSync(envPath, basicEnv);
            console.log('   Created basic .env file');
        }
    } else {
        console.log('   .env file already exists');
    }
    
    console.log('   ✅ Environment configuration ready\n');
}

function installDependencies() {
    console.log('📦 Installing dependencies...');
    
    try {
        // Check if node_modules exists
        if (!fs.existsSync('./node_modules')) {
            console.log('   Running npm install...');
            execSync('npm install', { stdio: 'inherit' });
        } else {
            console.log('   Dependencies already installed');
        }
        
        console.log('   ✅ Dependencies ready\n');
    } catch (error) {
        throw new Error('Failed to install dependencies. Please run "npm install" manually.');
    }
}

function initializeDatabase() {
    console.log('🗄️  Initializing database...');
    
    try {
        // Import the server to initialize the database
        console.log('   Creating database tables...');
        
        // We'll create a simple initialization script
        const initScript = `
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'competency_tracker.db');
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Users table
    db.run(\`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        cohort TEXT NOT NULL,
        company TEXT NOT NULL,
        role TEXT DEFAULT 'Apprentice',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )\`);

    // Competencies table
    db.run(\`CREATE TABLE IF NOT EXISTS competencies (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        text TEXT NOT NULL,
        referenceCode TEXT,
        what TEXT,
        looksLike TEXT,
        critical TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )\`);

    // Progress table
    db.run(\`CREATE TABLE IF NOT EXISTS progress (
        id TEXT PRIMARY KEY,
        apprenticeEmail TEXT NOT NULL,
        competencyId TEXT NOT NULL,
        rating INTEGER,
        dateValidated DATETIME,
        mentorName TEXT,
        signature TEXT,
        selfRating INTEGER,
        viewedDate DATETIME,
        handoffDate DATETIME,
        comments TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (apprenticeEmail) REFERENCES users(email),
        FOREIGN KEY (competencyId) REFERENCES competencies(id)
    )\`);
});

db.close(() => {
    console.log('Database initialized successfully');
});
`;
        
        fs.writeFileSync('./scripts/init-db.js', initScript);
        execSync('node ./scripts/init-db.js', { stdio: 'inherit' });
        fs.unlinkSync('./scripts/init-db.js'); // Clean up
        
        console.log('   ✅ Database initialized\n');
    } catch (error) {
        console.log('   ⚠️  Database initialization skipped (will be created on first run)\n');
    }
}

function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function showNextSteps() {
    console.log('🎉 Setup completed successfully!\n');
    console.log('📋 Next Steps:');
    console.log('');
    console.log('1. Import your competencies:');
    console.log('   • If you have an Excel file: npm install xlsx && node scripts/excel-to-json.js');
    console.log('   • Then: node scripts/import-competencies.js');
    console.log('');
    console.log('2. Start the application:');
    console.log('   • Development: npm run dev');
    console.log('   • Production: npm start');
    console.log('');
    console.log('3. Open your browser and go to: http://localhost:3000');
    console.log('');
    console.log('4. Create your first user account by clicking "Register"');
    console.log('');
    console.log('📚 Additional Resources:');
    console.log('   • README.md - Complete documentation');
    console.log('   • scripts/ - Utility scripts for import and deployment');
    console.log('   • .env - Environment configuration');
    console.log('');
    console.log('🆘 Need Help?');
    console.log('   • Check the troubleshooting section in README.md');
    console.log('   • Review the logs if something goes wrong');
    console.log('   • Make sure your Excel file is in the correct format');
    console.log('');
    console.log('Happy tracking! 🎯');
}

// Run setup if called directly
if (require.main === module) {
    setupApplication();
}

module.exports = { setupApplication };