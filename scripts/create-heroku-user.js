// Script to create a test user on Heroku
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

async function createTestUser() {
    console.log('Creating test user on Heroku...');
    
    const db = new sqlite3.Database('data/competency_tracker.db');
    
    const email = 'test@example.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    return new Promise((resolve, reject) => {
        db.run(`
            INSERT OR REPLACE INTO users (
                email, password, firstName, lastName, cohort, company, role
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            email,
            hashedPassword,
            'Test',
            'User',
            '2024',
            'Test Company',
            'Apprentice'
        ], function(err) {
            if (err) {
                console.error('Error creating user:', err);
                reject(err);
            } else {
                console.log('✅ Test user created successfully!');
                console.log('Email:', email);
                console.log('Password:', password);
                resolve();
            }
            
            db.close();
        });
    });
}

// Run if called directly
if (require.main === module) {
    createTestUser().catch(console.error);
}

module.exports = { createTestUser };