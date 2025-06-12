const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'competency_tracker.db');
const db = new sqlite3.Database(dbPath);

async function createTestUsers() {
    const users = [
        {
            email: 'john.doe@testcompany.com',
            password: 'password123',
            firstName: 'John',
            lastName: 'Doe',
            cohort: '2024',
            company: 'Test Company A',
            role: 'Apprentice'
        },
        {
            email: 'jane.smith@testcompany.com',
            password: 'password123',
            firstName: 'Jane',
            lastName: 'Smith',
            cohort: '2024',
            company: 'Test Company B',
            role: 'Apprentice'
        },
        {
            email: 'mike.johnson@testcompany.com',
            password: 'password123',
            firstName: 'Mike',
            lastName: 'Johnson',
            cohort: '2023',
            company: 'Test Company A',
            role: 'Apprentice'
        }
    ];

    console.log('Creating test users...');

    for (const user of users) {
        try {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            
            await new Promise((resolve, reject) => {
                const sql = `INSERT OR REPLACE INTO users (email, password, firstName, lastName, cohort, company, role, createdAt) 
                             VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`;
                
                db.run(sql, [
                    user.email,
                    hashedPassword,
                    user.firstName,
                    user.lastName,
                    user.cohort,
                    user.company,
                    user.role
                ], function(err) {
                    if (err) {
                        console.error(`Error creating user ${user.email}:`, err);
                        reject(err);
                    } else {
                        console.log(`✅ Created user: ${user.firstName} ${user.lastName} (${user.email})`);
                        resolve();
                    }
                });
            });
        } catch (error) {
            console.error(`Error processing user ${user.email}:`, error);
        }
    }

    console.log('\n🎉 Test users created successfully!');
    console.log('You can now test the admin panel with these users.');
    console.log('Default password for all test users: password123');
    
    db.close();
}

createTestUsers();