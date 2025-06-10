const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Function to parse CSV with proper handling of multi-line quoted fields
function parseCSV(csvContent) {
    const lines = [];
    let currentLine = '';
    let insideQuotes = false;
    let quoteChar = null;
    
    for (let i = 0; i < csvContent.length; i++) {
        const char = csvContent[i];
        const nextChar = csvContent[i + 1];
        
        if ((char === '"' || char === '"' || char === '"') && !insideQuotes) {
            // Starting a quoted field
            insideQuotes = true;
            quoteChar = char;
            continue;
        } else if (char === quoteChar && insideQuotes) {
            // Check if this is an escaped quote or end of quoted field
            if (nextChar === quoteChar) {
                // Escaped quote - add one quote and skip the next
                currentLine += char;
                i++; // Skip the next quote
                continue;
            } else {
                // End of quoted field
                insideQuotes = false;
                quoteChar = null;
                continue;
            }
        } else if (char === '\n' && !insideQuotes) {
            // End of line outside quotes
            if (currentLine.trim()) {
                lines.push(currentLine);
            }
            currentLine = '';
            continue;
        }
        
        currentLine += char;
    }
    
    // Add the last line if it exists
    if (currentLine.trim()) {
        lines.push(currentLine);
    }
    
    return lines;
}

// Function to split CSV line into fields
function splitCSVLine(line) {
    const fields = [];
    let currentField = '';
    let insideQuotes = false;
    let quoteChar = null;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if ((char === '"' || char === '"' || char === '"') && !insideQuotes) {
            insideQuotes = true;
            quoteChar = char;
            continue;
        } else if (char === quoteChar && insideQuotes) {
            if (nextChar === quoteChar) {
                currentField += char;
                i++;
                continue;
            } else {
                insideQuotes = false;
                quoteChar = null;
                continue;
            }
        } else if (char === ',' && !insideQuotes) {
            fields.push(currentField.trim());
            currentField = '';
            continue;
        }
        
        currentField += char;
    }
    
    fields.push(currentField.trim());
    return fields;
}

async function importCompetenciesFromCSV() {
    console.log('Starting CSV import...');
    
    // Read the CSV file
    const csvPath = path.join(__dirname, '..', 'ETA 671 Tracking - Competencies.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    
    // Parse CSV
    const lines = parseCSV(csvContent);
    console.log(`Found ${lines.length} lines in CSV`);
    
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
            
            // Skip header line and process data
            const dataLines = lines.slice(1);
            let insertCount = 0;
            
            dataLines.forEach((line, index) => {
                const fields = splitCSVLine(line);
                
                if (fields.length >= 7) {
                    const [competencyId, category, text, referenceCode, whatMeans, whatLooksLike, whyCritical] = fields;
                    
                    // Clean up the fields
                    const cleanText = text.replace(/^[""]|[""]$/g, '').trim();
                    const cleanReferenceCode = referenceCode.replace(/^[""]|[""]$/g, '').trim();
                    const cleanWhatMeans = whatMeans.replace(/^[""]|[""]$/g, '').trim();
                    const cleanWhatLooksLike = whatLooksLike.replace(/^[""]|[""]$/g, '').trim();
                    const cleanWhyCritical = whyCritical.replace(/^[""]|[""]$/g, '').trim();
                    
                    const insertSQL = `
                        INSERT INTO competencies (
                            category, text, referenceCode, what, looksLike, critical
                        ) VALUES (?, ?, ?, ?, ?, ?)
                    `;
                    
                    db.run(insertSQL, [
                        category,
                        cleanText,
                        cleanReferenceCode,
                        cleanWhatMeans,
                        cleanWhatLooksLike,
                        cleanWhyCritical
                    ], function(err) {
                        if (err) {
                            console.error(`Error inserting competency ${competencyId}:`, err);
                        } else {
                            insertCount++;
                            console.log(`Inserted: ${competencyId} - ${cleanText.substring(0, 50)}...`);
                        }
                        
                        // Check if this is the last insert
                        if (index === dataLines.length - 1) {
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
                    console.log(`Skipping line ${index + 2}: insufficient fields (${fields.length})`);
                }
            });
        });
    });
}

// Run the import
importCompetenciesFromCSV().catch(console.error);