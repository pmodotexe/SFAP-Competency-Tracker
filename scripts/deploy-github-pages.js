// Script to prepare frontend files for GitHub Pages deployment
// This creates a static version that can work with a separate backend API

const fs = require('fs');
const path = require('path');

const GITHUB_PAGES_DIR = './docs'; // GitHub Pages serves from /docs folder
const PUBLIC_DIR = './public';

function createGitHubPagesDeployment() {
    console.log('Preparing GitHub Pages deployment...');
    
    try {
        // Create docs directory if it doesn't exist
        if (!fs.existsSync(GITHUB_PAGES_DIR)) {
            fs.mkdirSync(GITHUB_PAGES_DIR, { recursive: true });
        }
        
        // Copy public files to docs
        copyDirectory(PUBLIC_DIR, GITHUB_PAGES_DIR);
        
        // Update the app.js to use production API URL
        updateApiUrls();
        
        // Create a simple 404.html for client-side routing
        create404Page();
        
        // Create CNAME file if needed (uncomment and set your domain)
        // createCNAME('your-domain.com');
        
        console.log('GitHub Pages deployment prepared successfully!');
        console.log('');
        console.log('Next steps:');
        console.log('1. Commit and push the /docs folder to your repository');
        console.log('2. Enable GitHub Pages in repository settings');
        console.log('3. Set source to "Deploy from a branch" and select "main" branch "/docs" folder');
        console.log('4. Deploy your backend API to a service like Heroku, Railway, or DigitalOcean');
        console.log('5. Update the API_BASE_URL in docs/app.js to point to your backend');
        
    } catch (error) {
        console.error('Error preparing GitHub Pages deployment:', error);
    }
}

function copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    
    const files = fs.readdirSync(src);
    
    files.forEach(file => {
        const srcPath = path.join(src, file);
        const destPath = path.join(dest, file);
        
        if (fs.statSync(srcPath).isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
            console.log(`Copied: ${file}`);
        }
    });
}

function updateApiUrls() {
    const appJsPath = path.join(GITHUB_PAGES_DIR, 'app.js');
    
    if (fs.existsSync(appJsPath)) {
        let content = fs.readFileSync(appJsPath, 'utf8');
        
        // Add API base URL configuration at the top
        const apiConfig = `
// Production API Configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://your-backend-api.herokuapp.com' // Update this with your backend URL
    : '';

`;
        
        // Update the apiCall function to use the base URL
        content = content.replace(
            'async function apiCall(endpoint, options = {}) {',
            `${apiConfig}
async function apiCall(endpoint, options = {}) {`
        );
        
        content = content.replace(
            "const response = await fetch(`/api${endpoint}`,",
            "const response = await fetch(`${API_BASE_URL}/api${endpoint}`,"
        );
        
        fs.writeFileSync(appJsPath, content);
        console.log('Updated API URLs for production');
    }
}

function create404Page() {
    const html404 = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SFAP Competency Tracker</title>
    <script>
        // Redirect to main page for client-side routing
        window.location.href = '/';
    </script>
</head>
<body>
    <p>Redirecting...</p>
</body>
</html>`;
    
    fs.writeFileSync(path.join(GITHUB_PAGES_DIR, '404.html'), html404);
    console.log('Created 404.html');
}

function createCNAME(domain) {
    fs.writeFileSync(path.join(GITHUB_PAGES_DIR, 'CNAME'), domain);
    console.log(`Created CNAME file for domain: ${domain}`);
}

// Run the deployment preparation
if (require.main === module) {
    createGitHubPagesDeployment();
}

module.exports = { createGitHubPagesDeployment };