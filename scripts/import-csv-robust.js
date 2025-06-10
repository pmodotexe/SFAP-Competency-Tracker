const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

function parseCSVWithMultilineFields(csvContent) {
    const records = [];
    let currentRecord = [];
    let currentField = '';
    let insideQuotes = false;
    let i = 0;
    
    while (i < csvContent.length) {
        const char = csvContent[i];
        
        if (char === '"' && !insideQuotes) {
            // Start of quoted field
            insideQuotes = true;
        } else if (char === '"' && insideQuotes) {
            // Check if this is an escaped quote or end of field
            if (i + 1 < csvContent.length && csvContent[i + 1] === '"') {
                // Escaped quote - add one quote and skip the next
                currentField += '"';
                i++; // Skip the next quote
            } else {
                // End of quoted field
                insideQuotes = false;
            }
        } else if (char === ',' && !insideQuotes) {
            // Field separator
            currentRecord.push(currentField.trim());
            currentField = '';
        } else if ((char === '\n' || char === '\r') && !insideQuotes) {
            // End of record
            if (currentField.trim() || currentRecord.length > 0) {
                currentRecord.push(currentField.trim());
                if (currentRecord.some(field => field.length > 0)) {
                    records.push(currentRecord);
                }
                currentRecord = [];
                currentField = '';
            }
            // Skip \r\n combinations
            if (char === '\r' && i + 1 < csvContent.length && csvContent[i + 1] === '\n') {
                i++;
            }
        } else {
            // Regular character
            currentField += char;
        }
        
        i++;
    }
    
    // Add the last field and record if they exist
    if (currentField.trim() || currentRecord.length > 0) {
        currentRecord.push(currentField.trim());
        if (currentRecord.some(field => field.length > 0)) {
            records.push(currentRecord);
        }
    }
    
    return records;
}

async function importCompetenciesFromCSV() {
    console.log('Starting robust CSV import...');
    
    // Read the CSV file
    const csvPath = path.join(__dirname, '..', 'ETA 671 Tracking - Competencies.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    
    // Parse CSV
    const records = parseCSVWithMultilineFields(csvContent);
    console.log(`Found ${records.length} records in CSV`);
    
    // Log the header to verify structure
    if (records.length > 0) {
        console.log('Header:', records[0]);
    }
    
    // Connect to database
    const db = new sqlite3.Database('data/competency_tracker.db');
    
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Clear existing competencies
            db.run('DELETE FROM competencies', (err) => {
                if (err) {
                    console.error('Error clearing competencies:', err);
                    reject(err);
                    return;
                }
                console.log('Cleared existing competencies');
            });
            
            // Skip header and process data
            const dataRecords = records.slice(1);
            let insertCount = 0;
            let completedInserts = 0;
            
            dataRecords.forEach((record, index) => {
                if (record.length >= 7) {
                    const [competencyId, category, text, referenceCode, whatMeans, whatLooksLike, whyCritical] = record;
                    
                    console.log(`Processing ${competencyId}: ${text.substring(0, 50)}...`);
                    
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
                            console.error(`Error inserting competency ${competencyId}:`, err);
                        } else {
                            insertCount++;
                            console.log(`✓ Inserted: ${competencyId}`);
                        }
                        
                        // Check if this is the last insert
                        if (completedInserts === dataRecords.length) {
                            console.log(`\nImport completed! Inserted ${insertCount} competencies.`);
                            db.close((err) => {
                                if (err) {
                                    console.error('Error closing database:', err);
                                    reject(err);
                                } else {
                                    console.log('Database connection closed.');
                                    resolve();
                                }
                            });
                        }
                    });
                } else {
                    console.log(`Skipping record ${index + 2}: insufficient fields (${record.length})`);
                    console.log('Record:', record);
                    completedInserts++;
                    
                    if (completedInserts === dataRecords.length) {
                        console.log(`\nImport completed! Inserted ${insertCount} competencies.`);
                        db.close((err) => {
                            if (err) {
                                console.error('Error closing database:', err);
                                reject(err);
                            } else {
                                console.log('Database connection closed.');
                                resolve();
                            }
                        });
                    }
                }
            });
        });
    });
}

// Run the import
importCompetenciesFromCSV().catch(console.error);