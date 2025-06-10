const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'competency_tracker.db');
const db = new sqlite3.Database(dbPath);

async function createTestUser() {
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const sql = `INSERT OR REPLACE INTO users (email, password, first_name, last_name, cohort, company, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`;
    
    db.run(sql, [
        'test@example.com',
        hashedPassword,
        'John',
        'Doe',
        '2024',
        'Test Company'
    ], function(err) {
        if (err) {
            console.error('Error creating test user:', err);
        } else {
            console.log('Test user created successfully with ID:', this.lastID);
        }
        db.close();
    });
}

createTestUser();