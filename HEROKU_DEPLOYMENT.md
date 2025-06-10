# Heroku Deployment Guide

This guide will help you deploy the SFAP Competency Tracker to Heroku.

## Prerequisites

1. **Heroku Account**: Sign up at [heroku.com](https://heroku.com)
2. **Heroku CLI**: Install from [devcenter.heroku.com/articles/heroku-cli](https://devcenter.heroku.com/articles/heroku-cli)
3. **Git**: Ensure git is installed and configured

## Quick Deployment (Automated)

The easiest way to deploy is using our automated script:

```bash
# Option 1: Use default app name
npm run deploy:heroku

# Option 2: Specify custom app name
node scripts/deploy-heroku.js your-custom-app-name
```

## Manual Deployment Steps

If you prefer to deploy manually or need more control:

### 1. Install Heroku CLI and Login

```bash
# Install Heroku CLI (if not already installed)
# Visit: https://devcenter.heroku.com/articles/heroku-cli

# Login to Heroku
heroku login
```

### 2. Initialize Git Repository (if needed)

```bash
git init
git add .
git commit -m "Initial commit"
```

### 3. Create Heroku App

```bash
# Create app with auto-generated name
heroku create

# OR create app with specific name
heroku create your-app-name
```

### 4. Set Environment Variables

```bash
heroku config:set NODE_ENV=production
heroku config:set SESSION_SECRET=your-super-secret-session-key-change-this
```

### 5. Deploy to Heroku

```bash
git push heroku main
```

### 6. Set Up Database

```bash
heroku run npm run setup
```

### 7. Import Competency Data

```bash
# If you have the CSV file, you can import it
heroku run node scripts/import-csv-robust.js
```

## Post-Deployment

1. **Open your app**: `heroku open`
2. **View logs**: `heroku logs --tail`
3. **Create admin user**: Visit your app and register the first user

## Environment Variables

The following environment variables are automatically set:

- `NODE_ENV`: Set to "production"
- `PORT`: Automatically set by Heroku
- `SESSION_SECRET`: Set during deployment

## Database

The app uses SQLite which works well for small to medium applications on Heroku. The database file is stored in the app's file system and will be reset when the app restarts (dyno cycling).

For production use with persistent data, consider upgrading to PostgreSQL:

```bash
# Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev

# You'll need to modify the app to use PostgreSQL instead of SQLite
```

## Useful Heroku Commands

```bash
# View app info
heroku info

# View logs
heroku logs --tail

# Run commands on Heroku
heroku run node scripts/setup.js

# Scale dynos
heroku ps:scale web=1

# View environment variables
heroku config

# Open app in browser
heroku open

# Restart app
heroku restart
```

## Troubleshooting

### App Won't Start
- Check logs: `heroku logs --tail`
- Ensure `Procfile` exists and contains: `web: node server.js`
- Verify `package.json` has correct start script

### Database Issues
- Run setup again: `heroku run npm run setup`
- Check if data directory exists and is writable

### Environment Variables
- List all config vars: `heroku config`
- Set missing variables: `heroku config:set VAR_NAME=value`

### Port Issues
- Heroku automatically sets the PORT environment variable
- Ensure your app uses `process.env.PORT || 3000`

## Security Notes

1. Change the default SESSION_SECRET in production
2. Consider adding additional security middleware
3. Set up proper CORS policies for your domain
4. Enable HTTPS (Heroku provides this automatically)

## Monitoring

- Use `heroku logs --tail` to monitor real-time logs
- Consider adding logging services like Papertrail
- Monitor app performance with Heroku metrics

## Scaling

```bash
# Scale to multiple dynos (requires paid plan)
heroku ps:scale web=2

# View current dyno usage
heroku ps
```

## Support

If you encounter issues:
1. Check the logs: `heroku logs --tail`
2. Review Heroku documentation
3. Check the app's GitHub repository for issues