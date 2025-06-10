// Production setup script for SFAP Competency Tracker
// This script sets up the database and imports competencies for production deployment

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

async function setupProduction() {
    console.log('🚀 Setting up SFAP Competency Tracker for production...\n');
    
    try {
        // Initialize database
        await initializeDatabase();
        
        // Import competencies if CSV file exists
        await importCompetencies();
        
        console.log('\n✅ Production setup completed successfully!');
        console.log('🌐 Your application is ready to use.');
        
    } catch (error) {
        console.error('❌ Production setup failed:', error.message);
        console.log('\nPlease check the error above and try again.');
        process.exit(1);
    }
}

function initializeDatabase() {
    return new Promise((resolve, reject) => {
        console.log('🗄️  Initializing database...');
        
        const dbPath = path.join(__dirname, '..', 'data', 'competency_tracker.db');
        const dataDir = path.dirname(dbPath);
        
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        const db = new sqlite3.Database(dbPath);
        
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
        });
        
        db.close((err) => {
            if (err) {
                reject(err);
            } else {
                console.log('   ✅ Database initialized');
                resolve();
            }
        });
    });
}

function parseCSVWithMultilineFields(csvContent) {
    const records = [];
    let currentRecord = [];
    let currentField = '';
    let insideQuotes = false;
    let i = 0;
    
    while (i < csvContent.length) {
        const char = csvContent[i];
        
        if (char === '"' && !insideQuotes) {
            insideQuotes = true;
        } else if (char === '"' && insideQuotes) {
            if (i + 1 < csvContent.length && csvContent[i + 1] === '"') {
                currentField += '"';
                i++;
            } else {
                insideQuotes = false;
            }
        } else if (char === ',' && !insideQuotes) {
            currentRecord.push(currentField.trim());
            currentField = '';
        } else if ((char === '\n' || char === '\r') && !insideQuotes) {
            if (currentField.trim() || currentRecord.length > 0) {
                currentRecord.push(currentField.trim());
                if (currentRecord.some(field => field.length > 0)) {
                    records.push(currentRecord);
                }
                currentRecord = [];
                currentField = '';
            }
            if (char === '\r' && i + 1 < csvContent.length && csvContent[i + 1] === '\n') {
                i++;
            }
        } else {
            currentField += char;
        }
        
        i++;
    }
    
    if (currentField.trim() || currentRecord.length > 0) {
        currentRecord.push(currentField.trim());
        if (currentRecord.some(field => field.length > 0)) {
            records.push(currentRecord);
        }
    }
    
    return records;
}

function importCompetencies() {
    return new Promise((resolve, reject) => {
        console.log('📊 Importing competencies...');
        
        const csvPath = path.join(__dirname, '..', 'ETA 671 Tracking - Competencies.csv');
        
        if (!fs.existsSync(csvPath)) {
            console.log('   ⚠️  CSV file not found, skipping competency import');
            console.log('   You can import competencies later using the import scripts');
            resolve();
            return;
        }
        
        try {
            const csvContent = fs.readFileSync(csvPath, 'utf8');
            const records = parseCSVWithMultilineFields(csvContent);
            
            console.log(`   Found ${records.length} records in CSV`);
            
            const db = new sqlite3.Database('data/competency_tracker.db');
            
            db.serialize(() => {
                // Clear existing competencies
                db.run('DELETE FROM competencies', (err) => {
                    if (err) {
                        console.error('Error clearing competencies:', err);
                        reject(err);
                        return;
                    }
                });
                
                // Skip header and process data
                const dataRecords = records.slice(1);
                let insertCount = 0;
                let completedInserts = 0;
                
                if (dataRecords.length === 0) {
                    console.log('   ⚠️  No data records found in CSV');
                    db.close();
                    resolve();
                    return;
                }
                
                dataRecords.forEach((record, index) => {
                    if (record.length >= 7) {
                        const [competencyId, category, text, referenceCode, whatMeans, whatLooksLike, whyCritical] = record;
                        
                        const insertSQL = `
                            INSERT INTO competencies (
                                id, category, text, referenceCode, what, looksLike, critical
                            ) VALUES (?, ?, ?, ?, ?, ?, ?)
                        `;
                        
                        db.run(insertSQL, [
                            competencyId,
                            category,
                            text,
                            referenceCode,
                            whatMeans,
                            whatLooksLike,
                            whyCritical
                        ], function(err) {
                            completedInserts++;
                            
                            if (err) {
                                console.error(`   Error inserting competency ${competencyId}:`, err);
                            } else {
                                insertCount++;
                            }
                            
                            if (completedInserts === dataRecords.length) {
                                console.log(`   ✅ Imported ${insertCount} competencies`);
                                db.close((err) => {
                                    if (err) {
                                        reject(err);
                                    } else {
                                        resolve();
                                    }
                                });
                            }
                        });
                    } else {
                        completedInserts++;
                        if (completedInserts === dataRecords.length) {
                            console.log(`   ✅ Imported ${insertCount} competencies`);
                            db.close((err) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve();
                                }
                            });
                        }
                    }
                });
            });
            
        } catch (error) {
            console.error('   Error reading CSV file:', error);
            reject(error);
        }
    });
}

// Run setup if called directly
if (require.main === module) {
    setupProduction();
}

module.exports = { setupProduction };