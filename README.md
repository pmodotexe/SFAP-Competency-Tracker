# SFAP Competency Tracker

A standalone web application for tracking apprentice competencies in the Saw Filer Apprenticeship Program (ETA671). This application was converted from a Google Apps Script to a modern web application that can be hosted on GitHub and deployed to various platforms.

## Features

- **User Authentication**: Secure registration and login system with bcrypt password hashing
- **Competency Tracking**: Track progress through various competency categories
- **Self-Assessment**: Apprentices can rate their readiness (1-3 scale)
- **Mentor Review**: Mentors can validate competencies with ratings (0-5 scale) and digital signatures
- **Progress Dashboard**: Visual overview of completion status
- **Search & Filter**: Find specific competencies quickly
- **Print Reports**: Generate PDF reports for record keeping
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **Frontend**: HTML5, CSS3 (Tailwind), JavaScript (ES6+)
- **Backend**: Node.js with Express
- **Database**: SQLite3
- **Authentication**: Express-session with bcrypt
- **Security**: Helmet.js, CORS, Rate limiting
- **UI Libraries**: Anime.js, Signature Pad, Tippy.js, Toastify

## Quick Start

### Prerequisites

- Node.js 16+ installed
- Git installed

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd sfap-competency-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and update the values:
   ```env
   PORT=3000
   NODE_ENV=development
   SESSION_SECRET=your-very-secure-session-secret-change-this
   ```

4. **Import competencies from your Excel file**
   
   Option A: Use the import script (recommended)
   ```bash
   node scripts/import-competencies.js
   ```
   
   Option B: Manually update the competencies in `scripts/import-competencies.js` with your ETA 671 data, then run the script.

5. **Start the application**
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

6. **Access the application**
   Open your browser and go to `http://localhost:3000`

## Importing Your Competencies

To import your specific competencies from the "ETA 671 Tracking.xlsx" file:

1. **Convert Excel to JSON**: You can use online tools or the `xlsx` npm package to convert your Excel data to JSON format.

2. **Update the import script**: Edit `scripts/import-competencies.js` and replace the sample competencies array with your actual data.

3. **Run the import**: Execute `node scripts/import-competencies.js`

### Excel Data Structure Expected

Your Excel file should have columns for:
- `id`: Unique identifier (e.g., "GC001", "SWP001")
- `category`: Category name (e.g., "General Competencies")
- `text`: Competency description
- `referenceCode`: Reference code (e.g., "GC-1")
- `what`: What this competency means
- `looksLike`: What it looks like in practice
- `critical`: Why this is critical

## Deployment

### Option 1: Heroku

1. **Create a Heroku app**
   ```bash
   heroku create your-app-name
   ```

2. **Set environment variables**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set SESSION_SECRET=your-production-secret
   ```

3. **Deploy**
   ```bash
   git push heroku main
   ```

### Option 2: Railway

1. **Connect your GitHub repository to Railway**
2. **Set environment variables** in Railway dashboard
3. **Deploy automatically** on git push

### Option 3: DigitalOcean App Platform

1. **Create a new app** from your GitHub repository
2. **Configure environment variables**
3. **Deploy**

### Option 4: Self-hosted (VPS)

1. **Set up a VPS** (Ubuntu/CentOS)
2. **Install Node.js and PM2**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo npm install -g pm2
   ```

3. **Clone and setup the application**
   ```bash
   git clone <your-repo-url>
   cd sfap-competency-tracker
   npm install --production
   ```

4. **Start with PM2**
   ```bash
   pm2 start server.js --name "sfap-tracker"
   pm2 startup
   pm2 save
   ```

5. **Set up reverse proxy** (Nginx recommended)

## Database

The application uses SQLite3 for simplicity and portability. The database file is created automatically at `data/competency_tracker.db`.

### Database Schema

- **users**: User accounts and profiles
- **competencies**: Competency definitions and descriptions
- **progress**: Tracking progress, ratings, and signatures

### Backup

Regularly backup your database file:
```bash
cp data/competency_tracker.db backups/competency_tracker_$(date +%Y%m%d).db
```

## API Endpoints

- `POST /api/login` - User login
- `POST /api/register` - User registration
- `POST /api/logout` - User logout
- `GET /api/competencies` - Get competencies and progress
- `POST /api/competencies/:id/viewed` - Mark competency as viewed
- `POST /api/competencies/:id/ready` - Submit self-rating and mark ready
- `POST /api/competencies/:id/validate` - Mentor validation
- `PUT /api/competencies/:id/validate` - Update validation
- `GET /api/progress/:id/signature` - Get signature image
- `GET /api/competencies/list` - Get competency list only

## Security Features

- Password hashing with bcrypt
- Session-based authentication
- CSRF protection
- Rate limiting
- Input validation
- SQL injection prevention
- XSS protection via Content Security Policy

## Development

### Project Structure

```
sfap-competency-tracker/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── .env.example          # Environment variables template
├── public/               # Frontend files
│   ├── index.html        # Main HTML file
│   └── app.js           # Frontend JavaScript
├── scripts/             # Utility scripts
│   └── import-competencies.js
├── data/                # Database files (created automatically)
└── README.md           # This file
```

### Adding New Features

1. **Backend**: Add routes in `server.js`
2. **Frontend**: Update `public/app.js` and `public/index.html`
3. **Database**: Modify schema in the initialization function

### Testing

Currently, the application doesn't include automated tests. Consider adding:
- Unit tests with Jest
- Integration tests with Supertest
- End-to-end tests with Playwright

## Troubleshooting

### Common Issues

1. **Database locked error**: Ensure only one instance is running
2. **Port already in use**: Change the PORT in `.env` file
3. **Session issues**: Clear browser cookies and restart server
4. **Signature pad not working**: Check if canvas is properly initialized

### Logs

Check application logs:
```bash
# If using PM2
pm2 logs sfap-tracker

# If running directly
node server.js
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support or questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the troubleshooting section above

## Acknowledgments

- Original Google Apps Script version by Paolo M.
- Powered by Reliability Solutions
- Built for the Saw Filer Apprenticeship Program (ETA671)