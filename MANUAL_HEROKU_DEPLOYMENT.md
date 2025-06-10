# Manual Heroku Deployment Guide

Since you're encountering Git version compatibility issues with Heroku, here's a step-by-step manual deployment guide.

## Issue: Git Version Compatibility

Heroku requires Git version 2.40+ but your system has Git 2.39.3 (Apple Git-146), which is not supported.

## Solution Options

### Option 1: Update Git (Recommended)

```bash
# Update Git using Homebrew (macOS)
brew install git

# Verify the new version
git --version

# You may need to restart your terminal or reload your shell
```

### Option 2: Manual Deployment Steps

If you can't update Git immediately, follow these manual steps:

#### 1. Ensure you're logged into Heroku

```bash
heroku login
```

#### 2. Create Heroku app (if not already created)

```bash
heroku create sfap-competency-tracker
# Or use a different name if this one is taken
```

#### 3. Add Heroku remote (if needed)

```bash
heroku git:remote -a sfap-competency-tracker
```

#### 4. Set environment variables

```bash
heroku config:set NODE_ENV=production
heroku config:set SESSION_SECRET=your-super-secret-session-key-change-this-in-production
```

#### 5. Commit your changes

```bash
git add .
git commit -m "Prepare for Heroku deployment"
```

#### 6. Deploy using alternative methods

**Method A: Try force push**
```bash
git push heroku main:main --force
```

**Method B: Use GitHub integration**
1. Push your code to GitHub first:
   ```bash
   git push origin main
   ```
2. In Heroku Dashboard:
   - Go to your app
   - Click "Deploy" tab
   - Connect to GitHub
   - Select your repository
   - Enable automatic deploys or deploy manually

**Method C: Use Heroku CLI with tarball**
```bash
# Create a tarball of your project
tar -czf app.tar.gz --exclude=node_modules --exclude=.git .

# Deploy using Heroku CLI
heroku builds:create --source-tar app.tar.gz
```

#### 7. Set up the database

```bash
heroku run npm run setup
```

#### 8. Import competency data

```bash
heroku run node scripts/import-csv-robust.js
```

## Verification Steps

1. **Check app status**
   ```bash
   heroku ps
   ```

2. **View logs**
   ```bash
   heroku logs --tail
   ```

3. **Open your app**
   ```bash
   heroku open
   ```

## Troubleshooting

### If the app won't start:
- Check logs: `heroku logs --tail`
- Verify Procfile exists: `cat Procfile`
- Check package.json start script

### If database issues occur:
- Run setup again: `heroku run npm run setup`
- Check if SQLite is working: `heroku run node -e "console.log(require('sqlite3'))"`

### If environment variables are missing:
- List config: `heroku config`
- Set missing vars: `heroku config:set VAR_NAME=value`

## Alternative: Use GitHub Integration

If Git issues persist, the easiest alternative is:

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Connect Heroku to GitHub**
   - Go to Heroku Dashboard
   - Select your app
   - Go to "Deploy" tab
   - Choose "GitHub" as deployment method
   - Connect your repository
   - Enable automatic deploys from main branch

3. **Manual deploy**
   - Click "Deploy Branch" button in Heroku Dashboard

This bypasses the local Git issues entirely.

## Post-Deployment

Once deployed successfully:

1. Visit your app URL
2. Create the first user account
3. Test the competency tracking functionality
4. Verify all detailed competency information is displaying correctly

Your app will be available at: `https://your-app-name.herokuapp.com`