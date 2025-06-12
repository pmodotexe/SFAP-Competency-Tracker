const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const helmet = require('helmet');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Heroku
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

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
        secure: false, // Set to false for now to fix Heroku issues
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

            // Admins table
            db.run(`CREATE TABLE IF NOT EXISTS admins (
                email TEXT PRIMARY KEY,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (email) REFERENCES users(email)
            )`);

            // Password reset tokens table
            db.run(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                token TEXT UNIQUE NOT NULL,
                expiresAt DATETIME NOT NULL,
                used BOOLEAN DEFAULT FALSE,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (email) REFERENCES users(email)
            )`);

            resolve();
        });
    });
}

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Verify email configuration
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter.verify((error, success) => {
        if (error) {
            console.log('Email configuration error:', error);
        } else {
            console.log('Email server is ready to send messages');
        }
    });
} else {
    console.log('Email configuration not found. Password reset will not work.');
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

// Forgot password
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }
    
    try {
        // Check if user exists
        db.get('SELECT email, firstName, lastName FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            
            if (!user) {
                // Don't reveal if email exists or not for security
                return res.json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });
            }
            
            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now
            
            // Save token to database
            db.run(
                'INSERT INTO password_reset_tokens (email, token, expiresAt) VALUES (?, ?, ?)',
                [email, resetToken, expiresAt.toISOString()],
                async function(err) {
                    if (err) {
                        console.error('Error saving reset token:', err);
                        return res.status(500).json({ success: false, message: 'Failed to generate reset token' });
                    }
                    
                    // Send email
                    const resetUrl = `${req.protocol}://${req.get('host')}/?token=${resetToken}`;
                    
                    const mailOptions = {
                        from: process.env.EMAIL_USER,
                        to: email,
                        subject: 'SFAP Competency Tracker - Password Reset',
                        html: `
                            <h2>Password Reset Request</h2>
                            <p>Hello ${user.firstName} ${user.lastName},</p>
                            <p>You requested a password reset for your SFAP Competency Tracker account.</p>
                            <p>Click the link below to reset your password:</p>
                            <p><a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
                            <p>Or copy and paste this link into your browser:</p>
                            <p>${resetUrl}</p>
                            <p>This link will expire in 1 hour.</p>
                            <p>If you didn't request this reset, please ignore this email.</p>
                            <br>
                            <p>Best regards,<br>SFAP Competency Tracker Team</p>
                        `
                    };
                    
                    try {
                        await transporter.sendMail(mailOptions);
                        res.json({ success: true, message: 'Password reset link sent to your email address.' });
                    } catch (emailError) {
                        console.error('Error sending email:', emailError);
                        res.status(500).json({ success: false, message: 'Failed to send reset email' });
                    }
                }
            );
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Reset password
app.post('/api/reset-password', async (req, res) => {
    const { token, password } = req.body;
    
    if (!token || !password) {
        return res.status(400).json({ success: false, message: 'Token and password are required' });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    
    try {
        // Find valid token
        db.get(
            'SELECT * FROM password_reset_tokens WHERE token = ? AND used = FALSE AND expiresAt > datetime("now")',
            [token],
            async (err, tokenRecord) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ success: false, message: 'Database error' });
                }
                
                if (!tokenRecord) {
                    return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
                }
                
                try {
                    // Hash new password
                    const hashedPassword = await bcrypt.hash(password, 10);
                    
                    // Update user password
                    db.run(
                        'UPDATE users SET password = ? WHERE email = ?',
                        [hashedPassword, tokenRecord.email],
                        function(err) {
                            if (err) {
                                console.error('Error updating password:', err);
                                return res.status(500).json({ success: false, message: 'Failed to update password' });
                            }
                            
                            // Mark token as used
                            db.run(
                                'UPDATE password_reset_tokens SET used = TRUE WHERE token = ?',
                                [token],
                                (err) => {
                                    if (err) {
                                        console.error('Error marking token as used:', err);
                                    }
                                }
                            );
                            
                            res.json({ success: true, message: 'Password updated successfully' });
                        }
                    );
                } catch (hashError) {
                    console.error('Error hashing password:', hashError);
                    res.status(500).json({ success: false, message: 'Failed to process password' });
                }
            }
        );
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
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

// Admin middleware - check if user has admin privileges
function requireAdmin(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    const adminEmails = [
        'paolomorales@reliabilitysolutions.net',
        'jeremysymonds@reliabilitysolutions.net'
    ];
    
    // Check if user is built-in admin or added admin
    const isBuiltInAdmin = adminEmails.includes(req.session.user.email);
    
    if (isBuiltInAdmin) {
        return next();
    }
    
    // Check if user is in admins table
    db.get('SELECT * FROM admins WHERE email = ?', [req.session.user.email], (err, admin) => {
        if (err || !admin) {
            return res.status(403).json({ error: 'Admin privileges required' });
        }
        next();
    });
}

// Get current user info
app.get('/api/user', requireAuth, (req, res) => {
    res.json(req.session.user);
});

// Admin API Routes

// Get all users
app.get('/api/admin/users', requireAdmin, (req, res) => {
    const query = `
        SELECT u.*,
               COUNT(p.id) as totalProgress,
               COUNT(CASE WHEN p.rating IS NOT NULL THEN 1 END) as completedProgress,
               ROUND((COUNT(CASE WHEN p.rating IS NOT NULL THEN 1 END) * 100.0 /
                     (SELECT COUNT(*) FROM competencies)), 2) as progressPercentage
        FROM users u
        LEFT JOIN progress p ON u.email = p.apprenticeEmail
        GROUP BY u.email
        ORDER BY u.lastName, u.firstName
    `;
    
    db.all(query, (err, users) => {
        if (err) {
            console.error('Error fetching users:', err);
            return res.status(500).json({ error: 'Failed to fetch users' });
        }
        
        res.json(users);
    });
});

// Create new user
app.post('/api/admin/users', requireAdmin, async (req, res) => {
    const { firstName, lastName, email, company, cohort, role } = req.body;
    
    if (!firstName || !lastName || !email) {
        return res.status(400).json({ error: 'First name, last name, and email are required' });
    }
    
    try {
        // Generate random password
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        
        db.run(
            'INSERT INTO users (firstName, lastName, email, password, company, cohort, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [firstName, lastName, email, hashedPassword, company, cohort, role || 'Apprentice'],
            function(err) {
                if (err) {
                    if (err.code === 'SQLITE_CONSTRAINT') {
                        return res.status(409).json({ error: 'User with this email already exists' });
                    }
                    console.error('Error creating user:', err);
                    return res.status(500).json({ error: 'Failed to create user' });
                }
                
                res.json({
                    success: true,
                    message: 'User created successfully',
                    tempPassword: tempPassword
                });
            }
        );
    } catch (error) {
        console.error('Error hashing password:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Update user
app.put('/api/admin/users/:email', requireAdmin, (req, res) => {
    const { email } = req.params;
    const { firstName, lastName, email: newEmail, company, cohort, role } = req.body;
    
    db.run(
        'UPDATE users SET firstName = ?, lastName = ?, email = ?, company = ?, cohort = ?, role = ? WHERE email = ?',
        [firstName, lastName, newEmail, company, cohort, role, email],
        function(err) {
            if (err) {
                console.error('Error updating user:', err);
                return res.status(500).json({ error: 'Failed to update user' });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            res.json({ success: true, message: 'User updated successfully' });
        }
    );
});

// Delete user
app.delete('/api/admin/users/:email', requireAdmin, (req, res) => {
    const { email } = req.params;
    
    db.serialize(() => {
        // Delete user's progress first
        db.run('DELETE FROM progress WHERE apprenticeEmail = ?', [email]);
        
        // Delete user
        db.run('DELETE FROM users WHERE email = ?', [email], function(err) {
            if (err) {
                console.error('Error deleting user:', err);
                return res.status(500).json({ error: 'Failed to delete user' });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            res.json({ success: true, message: 'User deleted successfully' });
        });
    });
});

// Reset user password
app.post('/api/admin/users/:email/reset-password', requireAdmin, async (req, res) => {
    const { email } = req.params;
    
    try {
        const newPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        db.run('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email], function(err) {
            if (err) {
                console.error('Error resetting password:', err);
                return res.status(500).json({ error: 'Failed to reset password' });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            res.json({ success: true, newPassword: newPassword });
        });
    } catch (error) {
        console.error('Error hashing password:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// Get progress overview
app.get('/api/admin/progress-overview', requireAdmin, (req, res) => {
    const queries = {
        totalUsers: 'SELECT COUNT(*) as count FROM users',
        totalCompetencies: 'SELECT COUNT(*) as count FROM competencies',
        userProgress: `
            SELECT u.email, u.firstName, u.lastName, u.company,
                   COUNT(p.id) as totalProgress,
                   COUNT(CASE WHEN p.rating IS NOT NULL THEN 1 END) as completed,
                   COUNT(CASE WHEN p.rating IS NULL AND p.selfRating IS NOT NULL THEN 1 END) as inProgress,
                   ((SELECT COUNT(*) FROM competencies) - COUNT(p.id)) as notStarted,
                   ROUND((COUNT(CASE WHEN p.rating IS NOT NULL THEN 1 END) * 100.0 /
                         (SELECT COUNT(*) FROM competencies)), 2) as progressPercentage
            FROM users u
            LEFT JOIN progress p ON u.email = p.apprenticeEmail
            GROUP BY u.email
            ORDER BY progressPercentage DESC, u.lastName
        `
    };
    
    db.get(queries.totalUsers, (err, totalUsersResult) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch data' });
        
        db.get(queries.totalCompetencies, (err, totalCompetenciesResult) => {
            if (err) return res.status(500).json({ error: 'Failed to fetch data' });
            
            db.all(queries.userProgress, (err, userProgress) => {
                if (err) return res.status(500).json({ error: 'Failed to fetch data' });
                
                const totalCompetencies = totalCompetenciesResult.count;
                const totalUsers = totalUsersResult.count;
                
                // Calculate aggregate stats
                let completedCompetencies = 0;
                let inProgressCompetencies = 0;
                let notStartedCompetencies = 0;
                
                userProgress.forEach(user => {
                    completedCompetencies += user.completed;
                    inProgressCompetencies += user.inProgress;
                    notStartedCompetencies += user.notStarted;
                });
                
                res.json({
                    totalUsers,
                    completedCompetencies,
                    inProgressCompetencies,
                    notStartedCompetencies,
                    userProgress
                });
            });
        });
    });
});

// Get admins
app.get('/api/admin/admins', requireAdmin, (req, res) => {
    db.all(`
        SELECT a.email, u.firstName, u.lastName, a.createdAt
        FROM admins a
        JOIN users u ON a.email = u.email
        ORDER BY a.createdAt DESC
    `, (err, admins) => {
        if (err) {
            console.error('Error fetching admins:', err);
            return res.status(500).json({ error: 'Failed to fetch admins' });
        }
        
        res.json(admins);
    });
});

// Add admin
app.post('/api/admin/admins', requireAdmin, (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }
    
    // Check if user exists
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) {
            console.error('Error checking user:', err);
            return res.status(500).json({ error: 'Failed to check user' });
        }
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Add to admins table
        db.run('INSERT INTO admins (email) VALUES (?)', [email], function(err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT') {
                    return res.status(409).json({ error: 'User is already an admin' });
                }
                console.error('Error adding admin:', err);
                return res.status(500).json({ error: 'Failed to add admin' });
            }
            
            res.json({ success: true, message: 'Admin added successfully' });
        });
    });
});

// Remove admin
app.delete('/api/admin/admins/:email', requireAdmin, (req, res) => {
    const { email } = req.params;
    
    db.run('DELETE FROM admins WHERE email = ?', [email], function(err) {
        if (err) {
            console.error('Error removing admin:', err);
            return res.status(500).json({ error: 'Failed to remove admin' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Admin not found' });
        }
        
        res.json({ success: true, message: 'Admin removed successfully' });
    });
});

// Export users CSV
app.get('/api/admin/export/users', requireAdmin, (req, res) => {
    db.all(`
        SELECT u.firstName, u.lastName, u.email, u.company, u.cohort, u.role, u.createdAt,
               COUNT(p.id) as totalProgress,
               COUNT(CASE WHEN p.rating IS NOT NULL THEN 1 END) as completedProgress
        FROM users u
        LEFT JOIN progress p ON u.email = p.apprenticeEmail
        GROUP BY u.email
        ORDER BY u.lastName, u.firstName
    `, (err, users) => {
        if (err) {
            console.error('Error exporting users:', err);
            return res.status(500).json({ error: 'Failed to export users' });
        }
        
        // Generate CSV
        const headers = ['First Name', 'Last Name', 'Email', 'Company', 'Cohort', 'Role', 'Created At', 'Total Progress', 'Completed'];
        const csvRows = [headers.join(',')];
        
        users.forEach(user => {
            const row = [
                user.firstName,
                user.lastName,
                user.email,
                user.company || '',
                user.cohort || '',
                user.role || 'Apprentice',
                new Date(user.createdAt).toLocaleDateString(),
                user.totalProgress,
                user.completedProgress
            ];
            csvRows.push(row.map(field => `"${field}"`).join(','));
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="users-export.csv"');
        res.send(csvRows.join('\n'));
    });
});

// Export progress CSV
app.get('/api/admin/export/progress', requireAdmin, (req, res) => {
    db.all(`
        SELECT u.firstName, u.lastName, u.email, u.company, c.category, c.text, c.referenceCode,
               p.rating, p.dateValidated, p.mentorName, p.comments, p.selfRating
        FROM users u
        CROSS JOIN competencies c
        LEFT JOIN progress p ON u.email = p.apprenticeEmail AND c.id = p.competencyId
        ORDER BY u.lastName, u.firstName, c.category, c.id
    `, (err, progress) => {
        if (err) {
            console.error('Error exporting progress:', err);
            return res.status(500).json({ error: 'Failed to export progress' });
        }
        
        // Generate CSV
        const headers = ['First Name', 'Last Name', 'Email', 'Company', 'Category', 'Competency', 'Reference Code', 'Rating', 'Date Validated', 'Mentor', 'Comments', 'Self Rating'];
        const csvRows = [headers.join(',')];
        
        progress.forEach(item => {
            const row = [
                item.firstName,
                item.lastName,
                item.email,
                item.company || '',
                item.category,
                item.text,
                item.referenceCode || '',
                item.rating || '',
                item.dateValidated ? new Date(item.dateValidated).toLocaleDateString() : '',
                item.mentorName || '',
                item.comments || '',
                item.selfRating || ''
            ];
            csvRows.push(row.map(field => `"${field}"`).join(','));
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="progress-export.csv"');
        res.send(csvRows.join('\n'));
    });
});

// Custom report generator
app.get('/api/admin/custom-report', requireAdmin, (req, res) => {
    const { type, value, format } = req.query;
    
    if (!type || !format) {
        return res.status(400).json({ error: 'Type and format are required' });
    }
    
    let whereClause = '';
    let params = [];
    
    // Build where clause based on type
    switch(type) {
        case 'individual':
            if (!value) return res.status(400).json({ error: 'User email is required' });
            whereClause = 'WHERE u.email = ?';
            params = [value];
            break;
        case 'cohort':
            if (!value) return res.status(400).json({ error: 'Cohort is required' });
            whereClause = 'WHERE u.cohort = ?';
            params = [value];
            break;
        case 'company':
            if (!value) return res.status(400).json({ error: 'Company is required' });
            whereClause = 'WHERE u.company = ?';
            params = [value];
            break;
        case 'all':
            whereClause = '';
            params = [];
            break;
        default:
            return res.status(400).json({ error: 'Invalid report type' });
    }
    
    // Build query based on format
    let query;
    let headers;
    
    switch(format) {
        case 'detailed':
            query = `
                SELECT u.firstName, u.lastName, u.email, u.company, u.cohort,
                       c.category, c.text, c.referenceCode, c.what, c.looksLike, c.critical,
                       p.rating, p.dateValidated, p.mentorName, p.comments, p.selfRating
                FROM users u
                CROSS JOIN competencies c
                LEFT JOIN progress p ON u.email = p.apprenticeEmail AND c.id = p.competencyId
                ${whereClause}
                ORDER BY u.lastName, u.firstName, c.category, c.id
            `;
            headers = ['First Name', 'Last Name', 'Email', 'Company', 'Cohort', 'Category', 'Competency', 'Reference Code', 'What This Means', 'What It Looks Like', 'Why Critical', 'Rating', 'Date Validated', 'Mentor', 'Comments', 'Self Rating'];
            break;
            
        case 'summary':
            query = `
                SELECT u.firstName, u.lastName, u.email, u.company, u.cohort,
                       COUNT(p.id) as totalProgress,
                       COUNT(CASE WHEN p.rating IS NOT NULL THEN 1 END) as completedProgress,
                       COUNT(CASE WHEN p.rating IS NULL AND p.selfRating IS NOT NULL THEN 1 END) as inProgress,
                       (SELECT COUNT(*) FROM competencies) as totalCompetencies,
                       ROUND((COUNT(CASE WHEN p.rating IS NOT NULL THEN 1 END) * 100.0 /
                             (SELECT COUNT(*) FROM competencies)), 2) as progressPercentage
                FROM users u
                LEFT JOIN progress p ON u.email = p.apprenticeEmail
                ${whereClause}
                GROUP BY u.email
                ORDER BY u.lastName, u.firstName
            `;
            headers = ['First Name', 'Last Name', 'Email', 'Company', 'Cohort', 'Completion Summary', 'Total Competencies', 'Completed', 'In Progress', 'Not Started', 'Progress %'];
            break;
            
        case 'competencies':
            query = `
                SELECT u.firstName, u.lastName, u.email, u.company, u.cohort,
                       c.category, c.text, c.referenceCode,
                       CASE WHEN p.rating IS NOT NULL THEN 'Completed'
                            WHEN p.selfRating IS NOT NULL THEN 'In Progress'
                            ELSE 'Not Started' END as status
                FROM users u
                CROSS JOIN competencies c
                LEFT JOIN progress p ON u.email = p.apprenticeEmail AND c.id = p.competencyId
                ${whereClause}
                ORDER BY u.lastName, u.firstName, c.category, c.id
            `;
            headers = ['First Name', 'Last Name', 'Email', 'Company', 'Cohort', 'Category', 'Competency', 'Reference Code', 'Status'];
            break;
            
        default:
            return res.status(400).json({ error: 'Invalid report format' });
    }
    
    db.all(query, params, (err, data) => {
        if (err) {
            console.error('Error generating custom report:', err);
            return res.status(500).json({ error: 'Failed to generate custom report' });
        }
        
        // Generate CSV
        const csvRows = [headers.join(',')];
        
        data.forEach(item => {
            const row = headers.map(header => {
                let value = '';
                
                // Map headers to data fields
                switch(header) {
                    case 'First Name': value = item.firstName; break;
                    case 'Last Name': value = item.lastName; break;
                    case 'Email': value = item.email; break;
                    case 'Company': value = item.company || ''; break;
                    case 'Cohort': value = item.cohort || ''; break;
                    case 'Category': value = item.category || ''; break;
                    case 'Competency': value = item.text || ''; break;
                    case 'Reference Code': value = item.referenceCode || ''; break;
                    case 'What This Means': value = item.what || ''; break;
                    case 'What It Looks Like': value = item.looksLike || ''; break;
                    case 'Why Critical': value = item.critical || ''; break;
                    case 'Rating': value = item.rating || ''; break;
                    case 'Date Validated': value = item.dateValidated ? new Date(item.dateValidated).toLocaleDateString() : ''; break;
                    case 'Mentor': value = item.mentorName || ''; break;
                    case 'Comments': value = item.comments || ''; break;
                    case 'Self Rating': value = item.selfRating || ''; break;
                    case 'Completion Summary':
                        const completed = item.completedProgress || 0;
                        const total = item.totalCompetencies || 0;
                        value = `${completed} out of ${total} competencies completed`;
                        break;
                    case 'Total Competencies': value = item.totalCompetencies || 0; break;
                    case 'Completed': value = item.completedProgress || 0; break;
                    case 'In Progress': value = item.inProgress || 0; break;
                    case 'Not Started':
                        const notStarted = (item.totalCompetencies || 0) - (item.completedProgress || 0) - (item.inProgress || 0);
                        value = notStarted;
                        break;
                    case 'Progress %': value = item.progressPercentage || 0; break;
                    case 'Status': value = item.status || ''; break;
                    default: value = '';
                }
                
                return value;
            });
            csvRows.push(row.map(field => `"${field}"`).join(','));
        });
        
        const filename = `${type}-${value || 'all'}-${format}-report.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvRows.join('\n'));
    });
});

// Export by company CSV
app.get('/api/admin/export/by-company', requireAdmin, (req, res) => {
    db.all(`
        SELECT u.company, u.firstName, u.lastName, u.email, u.cohort,
               COUNT(p.id) as totalProgress,
               COUNT(CASE WHEN p.rating IS NOT NULL THEN 1 END) as completedProgress,
               ROUND((COUNT(CASE WHEN p.rating IS NOT NULL THEN 1 END) * 100.0 /
                     (SELECT COUNT(*) FROM competencies)), 2) as progressPercentage
        FROM users u
        LEFT JOIN progress p ON u.email = p.apprenticeEmail
        GROUP BY u.email
        ORDER BY u.company, u.lastName, u.firstName
    `, (err, data) => {
        if (err) {
            console.error('Error exporting by company:', err);
            return res.status(500).json({ error: 'Failed to export by company' });
        }
        
        // Generate CSV
        const headers = ['Company', 'First Name', 'Last Name', 'Email', 'Cohort', 'Total Progress', 'Completed', 'Progress %'];
        const csvRows = [headers.join(',')];
        
        data.forEach(item => {
            const row = [
                item.company || 'N/A',
                item.firstName,
                item.lastName,
                item.email,
                item.cohort || '',
                item.totalProgress,
                item.completedProgress,
                item.progressPercentage
            ];
            csvRows.push(row.map(field => `"${field}"`).join(','));
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="company-breakdown-report.csv"');
        res.send(csvRows.join('\n'));
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