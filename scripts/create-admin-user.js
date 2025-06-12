const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'competency_tracker.db');
const db = new sqlite3.Database(dbPath);

async function createAdminUser() {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const sql = `INSERT OR REPLACE INTO users (email, password, firstName, lastName, cohort, company, role, createdAt) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`;
    
    db.run(sql, [
        'paolomorales@reliabilitysolutions.net',
        hashedPassword,
        'Paolo',
        'Morales',
        '2024',
        'Reliability Solutions',
        'Admin'
    ], function(err) {
        if (err) {
            console.error('Error creating admin user:', err);
        } else {
            console.log('Admin user created successfully with ID:', this.lastID);
            console.log('Email: paolomorales@reliabilitysolutions.net');
            console.log('Password: admin123');
        }
        db.close();
    });
}

createAdminUser();