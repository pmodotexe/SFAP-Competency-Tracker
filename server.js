const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const helmet = require('helmet');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
const dbPath = path.join(__dirname, 'data', 'competency_tracker.db');
const dataDir = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com", "https://unpkg.com", "https://cdn.jsdelivr.net"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com", "https://unpkg.com", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            connectSrc: ["'self'"]
        }
    }
}));

app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : 'http://localhost:3000',
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Database initialization
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Users table
            db.run(`CREATE TABLE IF NOT EXISTS users (
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
            )`);

            // Competencies table
            db.run(`CREATE TABLE IF NOT EXISTS competencies (
                id TEXT PRIMARY KEY,
                category TEXT NOT NULL,
                text TEXT NOT NULL,
                referenceCode TEXT,
                what TEXT,
                looksLike TEXT,
                critical TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Progress table
            db.run(`CREATE TABLE IF NOT EXISTS progress (
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
            )`);

            resolve();
        });
    });
}


// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Authentication required' });
    }
}

// API Routes

// Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()], async (err, user) => {
        if (err) {
            console.error('Login error:', err);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }

        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        req.session.user = {
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: `${user.firstName} ${user.lastName}`,
            cohort: user.cohort,
            company: user.company,
            role: user.role
        };

        res.json({ success: true, user: req.session.user });
    });
});

// Register
app.post('/api/register', async (req, res) => {
    const { firstName, lastName, email, password, cohort, company } = req.body;
    
    const requiredFields = { firstName, lastName, email, password, cohort, company };
    for (const [field, value] of Object.entries(requiredFields)) {
        if (!value) {
            return res.status(400).json({ success: false, message: `Missing required field: ${field}` });
        }
    }

    if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
        return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const emailLower = email.toLowerCase().trim();

        db.run(
            'INSERT INTO users (email, password, firstName, lastName, cohort, company) VALUES (?, ?, ?, ?, ?, ?)',
            [emailLower, hashedPassword, firstName.trim(), lastName.trim(), cohort.trim(), company.trim()],
            function(err) {
                if (err) {
                    if (err.code === 'SQLITE_CONSTRAINT') {
                        return res.status(409).json({ success: false, message: 'This email address is already registered' });
                    }
                    console.error('Registration error:', err);
                    return res.status(500).json({ success: false, message: 'Internal server error' });
                }
                res.json({ success: true, message: 'Registration successful! You can now log in.' });
            }
        );
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Could not log out' });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

// Get competencies and progress
app.get('/api/competencies', requireAuth, (req, res) => {
    const userEmail = req.session.user.email;

    // Get all competencies
    db.all('SELECT * FROM competencies ORDER BY category, id', (err, competencies) => {
        if (err) {
            console.error('Error fetching competencies:', err);
            return res.status(500).json({ success: false, message: 'Error fetching competencies' });
        }

        // Get progress for this user
        db.all('SELECT * FROM progress WHERE apprenticeEmail = ?', [userEmail], (err, progressRows) => {
            if (err) {
                console.error('Error fetching progress:', err);
                return res.status(500).json({ success: false, message: 'Error fetching progress' });
            }

            // Create progress map
            const progressMap = {};
            progressRows.forEach(row => {
                progressMap[row.competencyId] = {
                    progressId: row.id,
                    apprentice: row.apprenticeEmail,
                    competencyId: row.competencyId,
                    rating: row.rating,
                    mentorName: row.mentorName,
                    signature: row.signature,
                    selfRating: row.selfRating,
                    comments: row.comments,
                    dateValidatedStr: row.dateValidated,
                    viewedDateStr: row.viewedDate,
                    handoffDateStr: row.handoffDate
                };
            });

            // Group competencies by category and merge with progress
            const competenciesData = {};
            competencies.forEach(comp => {
                if (!competenciesData[comp.category]) {
                    competenciesData[comp.category] = [];
                }

                const progress = progressMap[comp.id];
                let status = 'pending';
                
                if (progress) {
                    if (progress.rating !== null && progress.dateValidatedStr) {
                        status = 'reviewed';
                    } else if (progress.handoffDateStr) {
                        status = 'ready';
                    } else if (progress.selfRating !== null) {
                        status = 'selfRated';
                    } else if (progress.viewedDateStr) {
                        status = 'viewed';
                    }
                }

                competenciesData[comp.category].push({
                    id: comp.id,
                    text: comp.text,
                    referenceCode: comp.referenceCode,
                    category: comp.category,
                    what: comp.what,
                    looksLike: comp.looksLike,
                    critical: comp.critical,
                    status: status,
                    progress: progress
                });
            });

            res.json({ success: true, competencies: competenciesData });
        });
    });
});

// Mark competency as viewed
app.post('/api/competencies/:id/viewed', requireAuth, (req, res) => {
    const competencyId = req.params.id;
    const userEmail = req.session.user.email;
    const progressId = `${userEmail}_${competencyId}`;
    const currentDate = new Date().toISOString();

    db.get('SELECT * FROM progress WHERE id = ?', [progressId], (err, existing) => {
        if (err) {
            console.error('Error checking progress:', err);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }

        if (existing && existing.viewedDate) {
            return res.json({ success: true, message: 'Already marked as viewed', viewedDate: existing.viewedDate });
        }

        const query = existing ? 
            'UPDATE progress SET viewedDate = ?, updatedAt = ? WHERE id = ?' :
            'INSERT INTO progress (id, apprenticeEmail, competencyId, viewedDate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)';
        
        const params = existing ? 
            [currentDate, currentDate, progressId] :
            [progressId, userEmail, competencyId, currentDate, currentDate, currentDate];

        db.run(query, params, function(err) {
            if (err) {
                console.error('Error marking as viewed:', err);
                return res.status(500).json({ success: false, message: 'Internal server error' });
            }
            res.json({ success: true, message: 'Marked as viewed', viewedDate: currentDate });
        });
    });
});

// Save self-rating and mark ready
app.post('/api/competencies/:id/ready', requireAuth, (req, res) => {
    const competencyId = req.params.id;
    const { selfRating } = req.body;
    const userEmail = req.session.user.email;
    const progressId = `${userEmail}_${competencyId}`;
    const currentDate = new Date().toISOString();

    if (!selfRating || selfRating < 1 || selfRating > 3) {
        return res.status(400).json({ success: false, message: 'Invalid self-rating' });
    }

    db.get('SELECT * FROM progress WHERE id = ?', [progressId], (err, existing) => {
        if (err) {
            console.error('Error checking progress:', err);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }

        const query = existing ? 
            'UPDATE progress SET selfRating = ?, handoffDate = ?, viewedDate = COALESCE(viewedDate, ?), updatedAt = ? WHERE id = ?' :
            'INSERT INTO progress (id, apprenticeEmail, competencyId, selfRating, handoffDate, viewedDate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        
        const params = existing ? 
            [selfRating, currentDate, currentDate, currentDate, progressId] :
            [progressId, userEmail, competencyId, selfRating, currentDate, currentDate, currentDate, currentDate];

        db.run(query, params, function(err) {
            if (err) {
                console.error('Error saving self-rating:', err);
                return res.status(500).json({ success: false, message: 'Internal server error' });
            }
            res.json({ success: true, message: 'Self-rating saved and marked ready for mentor', handoffDate: currentDate });
        });
    });
});

// Save competency validation (mentor review)
app.post('/api/competencies/:id/validate', requireAuth, (req, res) => {
    const competencyId = req.params.id;
    const { apprenticeEmail, rating, signatureDataUrl, comments, manualValidationDate, mentorName } = req.body;
    const progressId = `${apprenticeEmail}_${competencyId}`;
    const currentDate = new Date().toISOString();
    const validationDate = manualValidationDate || currentDate;

    if (!apprenticeEmail || !competencyId || rating === undefined || !signatureDataUrl || !mentorName) {
        return res.status(400).json({ success: false, message: 'Missing required validation data' });
    }

    if (rating < 0 || rating > 5) {
        return res.status(400).json({ success: false, message: 'Invalid rating value' });
    }

    if (!signatureDataUrl.startsWith('data:image/')) {
        return res.status(400).json({ success: false, message: 'Invalid signature data format' });
    }

    db.get('SELECT * FROM progress WHERE id = ?', [progressId], (err, existing) => {
        if (err) {
            console.error('Error checking progress:', err);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }

        const query = existing ? 
            'UPDATE progress SET rating = ?, dateValidated = ?, mentorName = ?, signature = ?, comments = ?, updatedAt = ? WHERE id = ?' :
            'INSERT INTO progress (id, apprenticeEmail, competencyId, rating, dateValidated, mentorName, signature, comments, viewedDate, handoffDate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        
        const params = existing ? 
            [rating, validationDate, mentorName, signatureDataUrl, comments, currentDate, progressId] :
            [progressId, apprenticeEmail, competencyId, rating, validationDate, mentorName, signatureDataUrl, comments, validationDate, validationDate, currentDate, currentDate];

        db.run(query, params, function(err) {
            if (err) {
                console.error('Error saving validation:', err);
                return res.status(500).json({ success: false, message: 'Internal server error' });
            }
            res.json({ success: true, message: 'Competency validation saved successfully', dateValidated: validationDate });
        });
    });
});

// Update competency validation (edit mode)
app.put('/api/competencies/:id/validate', requireAuth, (req, res) => {
    const competencyId = req.params.id;
    const { apprenticeEmail, rating, comments, manualValidationDate, mentorName } = req.body;
    const progressId = `${apprenticeEmail}_${competencyId}`;
    const currentDate = new Date().toISOString();

    if (!apprenticeEmail || !competencyId || rating === undefined || !mentorName) {
        return res.status(400).json({ success: false, message: 'Missing required data for update' });
    }

    db.get('SELECT * FROM progress WHERE id = ?', [progressId], (err, existing) => {
        if (err) {
            console.error('Error checking progress:', err);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }

        if (!existing) {
            return res.status(404).json({ success: false, message: 'Cannot update a competency that has no progress record' });
        }

        const validationDate = manualValidationDate || existing.dateValidated || currentDate;

        db.run(
            'UPDATE progress SET rating = ?, comments = ?, dateValidated = ?, mentorName = ?, updatedAt = ? WHERE id = ?',
            [rating, comments, validationDate, mentorName, currentDate, progressId],
            function(err) {
                if (err) {
                    console.error('Error updating validation:', err);
                    return res.status(500).json({ success: false, message: 'Internal server error' });
                }
                res.json({ success: true, message: 'Validation updated successfully', dateValidated: validationDate });
            }
        );
    });
});

// Get signature for progress
app.get('/api/progress/:id/signature', requireAuth, (req, res) => {
    const progressId = req.params.id;

    db.get('SELECT signature FROM progress WHERE id = ?', [progressId], (err, row) => {
        if (err) {
            console.error('Error fetching signature:', err);
            return res.status(500).json({ success: false, signature: null });
        }

        if (!row) {
            return res.status(404).json({ success: false, signature: null, message: 'Progress record not found' });
        }

        res.json({ success: true, signature: row.signature });
    });
});

// Get competency list only (for blank forms)
app.get('/api/competencies/list', requireAuth, (req, res) => {
    db.all('SELECT id, category, text, referenceCode FROM competencies ORDER BY category, id', (err, competencies) => {
        if (err) {
            console.error('Error fetching competency list:', err);
            return res.status(500).json({ success: false, message: 'Error fetching competency list' });
        }

        const competenciesData = {};
        competencies.forEach(comp => {
            if (!competenciesData[comp.category]) {
                competenciesData[comp.category] = [];
            }
            competenciesData[comp.category].push({
                id: comp.id,
                text: comp.text,
                referenceCode: comp.referenceCode
            });
        });

        res.json({ success: true, competencies: competenciesData });
    });
});

// Serve the main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

// Initialize database and start server
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`SFAP Competency Tracker server running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});