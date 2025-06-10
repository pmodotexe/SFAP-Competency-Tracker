// Script to convert Excel file to JSON format for competency import
// This script helps you convert your ETA 671 Tracking.xlsx file to the format needed by the application

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Configuration - adjust these based on your Excel file structure
const EXCEL_FILE_PATH = '../ETA 671 Tracking.xlsx'; // Path to your Excel file
const SHEET_NAME = 'Competencies'; // Name of the sheet containing competencies
const OUTPUT_FILE = './competencies-data.json'; // Output JSON file

// Column mapping - adjust these based on your Excel columns
const COLUMN_MAPPING = {
    A: 'id',           // Competency ID (e.g., GC001, SWP001)
    B: 'category',     // Category (e.g., General Competencies)
    C: 'text',         // Competency description
    D: 'referenceCode', // Reference code (e.g., GC-1)
    E: 'what',         // What this means
    F: 'looksLike',    // What it looks like
    G: 'critical'      // Why critical
};

function convertExcelToJson() {
    try {
        console.log('Reading Excel file...');
        
        // Check if Excel file exists
        const excelPath = path.resolve(__dirname, EXCEL_FILE_PATH);
        if (!fs.existsSync(excelPath)) {
            console.error(`Excel file not found: ${excelPath}`);
            console.log('Please make sure the Excel file path is correct in the script.');
            return;
        }
        
        // Read the Excel file
        const workbook = XLSX.readFile(excelPath);
        
        // Get sheet names
        console.log('Available sheets:', workbook.SheetNames);
        
        // Check if the specified sheet exists
        if (!workbook.SheetNames.includes(SHEET_NAME)) {
            console.error(`Sheet "${SHEET_NAME}" not found. Available sheets:`, workbook.SheetNames);
            console.log('Please update the SHEET_NAME variable in this script.');
            return;
        }
        
        // Get the worksheet
        const worksheet = workbook.Sheets[SHEET_NAME];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        console.log(`Found ${jsonData.length} rows in the sheet`);
        
        // Process the data
        const competencies = [];
        
        // Skip header row (index 0) and process data rows
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            
            // Skip empty rows
            if (!row || row.length === 0 || !row[0]) continue;
            
            const competency = {
                id: row[0] || `COMP${i.toString().padStart(3, '0')}`, // Column A or auto-generate
                category: row[1] || 'General',                        // Column B
                text: row[2] || '',                                   // Column C
                referenceCode: row[3] || '',                          // Column D
                what: row[4] || '',                                   // Column E
                looksLike: row[5] || '',                             // Column F
                critical: row[6] || ''                               // Column G
            };
            
            // Only add if we have at least an ID and text
            if (competency.id && competency.text) {
                competencies.push(competency);
                console.log(`Processed: ${competency.id} - ${competency.text.substring(0, 50)}...`);
            }
        }
        
        console.log(`\nProcessed ${competencies.length} competencies`);
        
        // Group by category for better organization
        const groupedCompetencies = {};
        competencies.forEach(comp => {
            if (!groupedCompetencies[comp.category]) {
                groupedCompetencies[comp.category] = [];
            }
            groupedCompetencies[comp.category].push(comp);
        });
        
        console.log('\nCategories found:');
        Object.keys(groupedCompetencies).forEach(category => {
            console.log(`- ${category}: ${groupedCompetencies[category].length} competencies`);
        });
        
        // Save to JSON file
        const outputPath = path.resolve(__dirname, OUTPUT_FILE);
        fs.writeFileSync(outputPath, JSON.stringify(competencies, null, 2));
        
        console.log(`\nData saved to: ${outputPath}`);
        console.log('\nNext steps:');
        console.log('1. Review the generated JSON file');
        console.log('2. Copy the competencies array to scripts/import-competencies.js');
        console.log('3. Run: node scripts/import-competencies.js');
        
        // Also save grouped version
        const groupedOutputPath = path.resolve(__dirname, './competencies-grouped.json');
        fs.writeFileSync(groupedOutputPath, JSON.stringify(groupedCompetencies, null, 2));
        console.log(`4. Grouped version saved to: ${groupedOutputPath}`);
        
    } catch (error) {
        console.error('Error converting Excel to JSON:', error);
        console.log('\nTroubleshooting:');
        console.log('1. Make sure the Excel file path is correct');
        console.log('2. Check that the sheet name is correct');
        console.log('3. Verify the Excel file is not open in another program');
        console.log('4. Install xlsx package: npm install xlsx');
    }
}

// Helper function to preview Excel structure
function previewExcelStructure() {
    try {
        const excelPath = path.resolve(__dirname, EXCEL_FILE_PATH);
        if (!fs.existsSync(excelPath)) {
            console.error(`Excel file not found: ${excelPath}`);
            return;
        }
        
        const workbook = XLSX.readFile(excelPath);
        
        console.log('Excel File Structure:');
        console.log('===================');
        
        workbook.SheetNames.forEach(sheetName => {
            console.log(`\nSheet: ${sheetName}`);
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (jsonData.length > 0) {
                console.log('Headers (first row):', jsonData[0]);
                if (jsonData.length > 1) {
                    console.log('Sample data (second row):', jsonData[1]);
                }
                console.log(`Total rows: ${jsonData.length}`);
            }
        });
        
    } catch (error) {
        console.error('Error previewing Excel structure:', error);
    }
}

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--preview') || args.includes('-p')) {
        previewExcelStructure();
    } else if (args.includes('--help') || args.includes('-h')) {
        console.log('Excel to JSON Converter for SFAP Competency Tracker');
        console.log('');
        console.log('Usage:');
        console.log('  node excel-to-json.js           Convert Excel to JSON');
        console.log('  node excel-to-json.js --preview Preview Excel structure');
        console.log('  node excel-to-json.js --help    Show this help');
        console.log('');
        console.log('Configuration:');
        console.log('  Edit the script to update file paths and column mappings');
    } else {
        convertExcelToJson();
    }
}

module.exports = { convertExcelToJson, previewExcelStructure };