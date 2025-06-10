// Script to import competencies from CSV file to database
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'competency_tracker.db');
const csvPath = path.join(__dirname, '..', 'ETA 671 Tracking - Competencies.csv');

function parseCSV(csvContent) {
    const lines = csvContent.split('\n');
    const competencies = [];
    
    let currentCompetency = null;
    let currentField = null;
    let fieldContent = '';
    
    for (let i = 1; i < lines.length; i++) { // Skip header
        const line = lines[i].trim();
        if (!line) continue;
        
        // Check if this line starts a new competency (has CompetencyID pattern)
        const competencyMatch = line.match(/^([A-Z]+\d+),(.+)/);
        
        if (competencyMatch) {
            // Save previous competency if exists
            if (currentCompetency) {
                if (currentField && fieldContent) {
                    currentCompetency[currentField] = fieldContent.trim();
                }
                competencies.push(currentCompetency);
            }
            
            // Parse the new competency line
            const parts = line.split(',');
            const id = parts[0];
            const category = parts[1];
            const text = parts[2];
            
            // Find where ReferenceCode starts (after the third comma)
            const afterText = line.substring(line.indexOf(',', line.indexOf(',', line.indexOf(',') + 1) + 1) + 1);
            const fields = parseCSVFields(afterText);
            
            currentCompetency = {
                id: id,
                category: category,
                text: text.replace(/^"/, '').replace(/"$/, ''), // Remove quotes
                referenceCode: fields[0] || '',
                what: fields[1] || '',
                looksLike: fields[2] || '',
                critical: fields[3] || ''
            };
            
            currentField = null;
            fieldContent = '';
        } else {
            // This is a continuation line
            if (currentCompetency) {
                fieldContent += (fieldContent ? '\n' : '') + line;
            }
        }
    }
    
    // Don't forget the last competency
    if (currentCompetency) {
        if (currentField && fieldContent) {
            currentCompetency[currentField] = fieldContent.trim();
        }
        competencies.push(currentCompetency);
    }
    
    return competencies;
}

function parseCSVFields(csvLine) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < csvLine.length) {
        const char = csvLine[i];
        
        if (char === '"') {
            if (inQuotes && csvLine[i + 1] === '"') {
                // Escaped quote
                current += '"';
                i += 2;
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
                i++;
            }
        } else if (char === ',' && !inQuotes) {
            // Field separator
            fields.push(current.trim());
            current = '';
            i++;
        } else {
            current += char;
            i++;
        }
    }
    
    // Add the last field
    fields.push(current.trim());
    
    return fields;
}

function importCompetenciesFromCSV() {
    console.log('Starting CSV import...');
    
    // Read CSV file
    if (!fs.existsSync(csvPath)) {
        console.error('CSV file not found:', csvPath);
        return;
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    console.log('CSV file read successfully');
    
    // Parse CSV manually (since it has complex multiline fields)
    const lines = csvContent.split('\n');
    const competencies = [];
    
    for (let i = 1; i < lines.length; i++) { // Skip header
        const line = lines[i].trim();
        if (!line) continue;
        
        // Split by comma, but handle quoted fields
        const fields = [];
        let current = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                fields.push(current.trim().replace(/^"/, '').replace(/"$/, ''));
                current = '';
            } else {
                current += char;
            }
        }
        fields.push(current.trim().replace(/^"/, '').replace(/"$/, ''));
        
        if (fields.length >= 7) {
            competencies.push({
                id: fields[0],
                category: fields[1],
                text: fields[2],
                referenceCode: fields[3],
                what: fields[4],
                looksLike: fields[5],
                critical: fields[6]
            });
        }
    }
    
    console.log(`Parsed ${competencies.length} competencies from CSV`);
    
    // Ensure data directory exists
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const db = new sqlite3.Database(dbPath);
    
    db.serialize(() => {
        // Create competencies table if it doesn't exist
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
        
        // Clear existing competencies
        db.run('DELETE FROM competencies', (err) => {
            if (err) {
                console.error('Error clearing existing competencies:', err);
                return;
            }
            console.log('Cleared existing competencies');
        });
        
        // Insert new competencies
        const stmt = db.prepare(`INSERT INTO competencies (id, category, text, referenceCode, what, looksLike, critical) VALUES (?, ?, ?, ?, ?, ?, ?)`);
        
        let insertCount = 0;
        competencies.forEach(comp => {
            stmt.run(comp.id, comp.category, comp.text, comp.referenceCode, comp.what, comp.looksLike, comp.critical, (err) => {
                if (err) {
                    console.error(`Error inserting competency ${comp.id}:`, err);
                } else {
                    insertCount++;
                    console.log(`Inserted: ${comp.id} - ${comp.text}`);
                }
            });
        });
        
        stmt.finalize((err) => {
            if (err) {
                console.error('Error finalizing statement:', err);
            } else {
                console.log(`\nCSV Import completed! Inserted ${insertCount} competencies.`);
            }
            
            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('Database connection closed.');
                }
            });
        });
    });
}

// Run the import
if (require.main === module) {
    importCompetenciesFromCSV();
}

module.exports = { importCompetenciesFromCSV };