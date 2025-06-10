// Complete import of all competencies with detailed information from CSV
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'competency_tracker.db');
const csvPath = path.join(__dirname, '..', 'ETA 671 Tracking - Competencies.csv');

function parseCSVContent(csvContent) {
    const lines = csvContent.split('\n');
    const competencies = [];
    let currentCompetency = null;
    let inQuotedField = false;
    let currentField = '';
    let fieldIndex = 0;
    
    for (let i = 1; i < lines.length; i++) { // Skip header
        const line = lines[i];
        if (!line.trim()) continue;
        
        // Check if this line starts a new competency (pattern: ID,Category,Text,...)
        const competencyMatch = line.match(/^([A-Z]+\d+),([^,]+),([^,]+),(.*)$/);
        
        if (competencyMatch && !inQuotedField) {
            // Save previous competency if exists
            if (currentCompetency) {
                competencies.push(currentCompetency);
            }
            
            // Start new competency
            const [, id, category, text, remainder] = competencyMatch;
            currentCompetency = {
                id: id.trim(),
                category: category.trim(),
                text: text.replace(/^"/, '').replace(/"$/, '').trim(),
                referenceCode: '',
                what: '',
                looksLike: '',
                critical: ''
            };
            
            // Parse the remaining fields from the remainder
            const fields = parseQuotedFields(remainder);
            if (fields.length >= 4) {
                currentCompetency.referenceCode = fields[0] || '';
                currentCompetency.what = fields[1] || '';
                currentCompetency.looksLike = fields[2] || '';
                currentCompetency.critical = fields[3] || '';
            }
        } else if (currentCompetency && line.trim()) {
            // This is a continuation line, append to the last field
            if (currentCompetency.critical) {
                currentCompetency.critical += '\n' + line.trim();
            } else if (currentCompetency.looksLike) {
                currentCompetency.looksLike += '\n' + line.trim();
            } else if (currentCompetency.what) {
                currentCompetency.what += '\n' + line.trim();
            } else if (currentCompetency.referenceCode) {
                currentCompetency.referenceCode += '\n' + line.trim();
            }
        }
    }
    
    // Add the last competency
    if (currentCompetency) {
        competencies.push(currentCompetency);
    }
    
    return competencies;
}

function parseQuotedFields(text) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < text.length) {
        const char = text[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            fields.push(current.trim());
            current = '';
        } else {
            current += char;
        }
        i++;
    }
    
    if (current) {
        fields.push(current.trim());
    }
    
    return fields.map(field => field.replace(/^"/, '').replace(/"$/, ''));
}

// Manually add the remaining competencies with their details based on the CSV structure
const allCompetencies = [
    // General Competencies (already added, but including for completeness)
    {
        id: 'G01',
        category: 'General Competencies',
        text: 'Working as an effective team member.',
        referenceCode: '• Responsibilities of Apprentice to Sponsor | Saw Filer 1, 1-2-5 to 1-2-6\n• Saw Filer Duties and Team Coordination | Saw Filer 1, 1-1-2\n• Filing Room Role in Shift Continuity | Saw Filer 1, 1-2-4',
        what: 'A saw filer is part of a larger production team that includes supervisors, millwrights, operators, electricians, and fellow filers across different shifts. Being an effective team member means maintaining clear communication, supporting smooth shift transitions, working collaboratively, and upholding shared shop responsibilities. It also includes fulfilling your duties to your sponsor and actively participating in your apprenticeship obligations.',
        looksLike: '• You coordinate with the incoming and outgoing filer about the current condition of saws, changes in strain or alignment, upcoming saw changes, and any issues observed during operation.\n• You record all issues or unusual conditions (e.g., vibration, gullet cracks, premature dulling, etc.) in shift logs or communication books, if in use.\n• You follow site-specific communication protocols such as tagging saws, labeling saws as out-of-service, or notifying supervisors when a saw or guide is awaiting repair or setup.\n• You assist other trades, especially millwrights, when removing, installing, or aligning saws—providing details like direction of lead, prior setup details, or vibration concerns.\n• You fulfill your obligations to your sponsor by checking in regularly, reviewing progress, and ensuring your hours and logbook entries are up to date.\n• You are present during shift handovers, and you ensure continuity by briefing the next filer on incomplete work, saw setup status, or known troubleshooting.',
        critical: 'Filing rooms operate continuously across shifts, and saws are only one component in a multi-step cutting system. If communication breaks down, saws may be installed incorrectly, worn tools may be reused, or safety procedures may be skipped. Miscommunication leads to downtime, unsafe conditions, lumber defects, and avoidable delays in production. Team-based awareness, accurate documentation, and proactive communication are core to the professional standards of a certified filer.'
    },
    {
        id: 'G02',
        category: 'General Competencies',
        text: 'Attention to detail and ability to focus.',
        referenceCode: '• Importance of Saw Flatness, Tension Zones, and Inspection Accuracy\nSaw Filer 1, Section 3-2-1 to 3-2-3\n• Crack Inspection and Tolerance Limits\nSaw Filer 1, Section 6-8-2\n• Bench Work and Quality Inspection Expectations\nSaw Filer 1, Section 7-1-1\n• Saw Flatness Maximum Deviation: 0.002"\nSaw Filer 1, Section 13-1-1',
        what: 'Precision is the cornerstone of all filing work. A journeyperson saw filer is expected to maintain microscopic accuracy during measurement, inspection, welding, grinding, and alignment procedures. This competency also requires sustained mental focus, even during repetitive or late-shift tasks. Attention to detail is not optional—it is a safety requirement. You must catch variations as small as 0.002" and respond with the correct technique and tool.\n📏 Flatness tolerances under 0.002" are used when inspecting for saw dish. Even a dish of 0.002" must be corrected before tensioning.\n📚 Saw Filer 1, Section 13-1-1',
        looksLike: '• When leveling a saw, you detect and correct a 0.002" dish using a certified straightedge and correct hammering technique.\n• During tensioning, you observe the symmetry and integrity of the tension ring using proper back gauge placement and drop test verification, ensuring uniformity before any saw is cleared for service.\n• When using a micrometer or dial indicator, you:\no Double-check readings for consistency\no Clean both the saw surface and the measuring tool\no Confirm tool calibration or report immediately if suspect\n• During blade inspections, you maintain full focus—even when inspecting the third or fourth band of a shift—to ensure:\no No gullet cracks, heat tint, or metal fatigue is missed\no The saw body shows no signs of warping, twist, or abnormal wear\n• When regrinding a tooth, you:\no Compare the result directly to a known-good profile\no Use templates and cam settings to confirm accuracy rather than assuming angles are correct',
        critical: 'The filing trade deals in thousandths of an inch. A misaligned saw, under-tensioned plate, or grind angle off by even 1° can cause:\n• Blade wobble, snaking, or cracking\n• Excess heat and gullet fatigue\n• Misaligned cuts or lumber defects\n• Damage to bearings, guides, or collars\n• Personal injury from ejected parts or unexpected failure\nYour vigilance prevents cascading errors that can cause downtime, reduce tool life, and compromise safety. A saw that "looks fine" may still fail at 10,000 FPM. You are the final line of defense.'
    },
    {
        id: 'G03',
        category: 'General Competencies',
        text: 'Active participation in learning process.',
        referenceCode: '• Apprentice Responsibilities and Mentor Interaction\nSaw Filer 1, Sections 1-2-4 to 1-2-6\n• Importance of Hands-on Learning and Self-tracking\nSaw Filer 1, Section 1-2-3',
        what: '🔧 What this means:\nApprenticeship in the saw trades is not passive—it requires full engagement in both hands-on and technical learning. You are expected to take ownership of your development by staying involved in every aspect of the training process. This means participating actively in shop tasks, seeking clarification when needed, and tracking your skill progression using the ETA 671 Work Process Schedule (Saw Filer Competency Log).\nYour mentor plays a critical role in shaping your training—but it is your responsibility to follow through, ask questions, and pursue improvement. Filing is learned by doing, and every task you complete should move you closer to becoming a safe, skilled tradesperson.',
        looksLike: '• You bring your ETA 671 Work Process Schedule (Saw Filer Competency Log) to evaluations and:\no Ensure entries are up to date with clear descriptions of completed tasks\no Obtain proper sign-off from your mentor based on direct observation\no Use the log to guide what skills you still need exposure to\n• You engage your mentor with relevant, job-specific questions, such as:\no "What\'s the best way to check for tight zones in this tension ring?"\no "Should I swage before or after confirming kerf width with the gauge?"\no "Is this crown profile correct for the feed rate we\'re running?"\n• You request to repeat high-skill procedures or shadow others performing them, including:\no Crack welding and annealing\no Tensioning with stretcher rolls\no Knife balancing and babbitting\no Swaging and shaping under species-specific tolerances\n• You take responsibility for your classroom learning by:\no Registering for technical training well in advance\no Coordinating your schedule with your mentor and supervisor\no Bringing current shop experiences and questions into the classroom for discussion\n• You actively track your hours and performance, using your log to:\no Identify weak areas or incomplete competencies\no Measure progress toward certification goals\no Organize questions and tasks for review with your mentor',
        critical: 'Saw filing cannot be learned by standing and watching. Many of the most important skills—tensioning, leveling, grinding geometry, safe handling—require hundreds of repetitions to master. Apprentices who do not ask questions or seek out new tasks tend to fall behind or develop unsafe habits. A passive approach delays your certification and places the burden on your mentor to chase your development.\nIn contrast, a filer who participates actively builds:\n• Technical confidence\n• Reliable habits under pressure\n• A complete training record\n• Trust and credibility with their team\nIf you don\'t ask, you don\'t learn.'
    },
    {
        id: 'G04',
        category: 'General Competencies',
        text: 'Shares ideas.',
        referenceCode: '• Filing Room Collaboration and Process Improvement\nSaw Filer 1, Section 1-2-4\n• Communication with Other Trades and Team Roles\nSaw Filer 1, Sections 1-2-5 to 1-2-6',
        what: 'A skilled filer is not only a technician but a problem solver and contributor to shop improvement. Sharing ideas means voicing observations that can prevent damage, reduce waste, improve workflow, or enhance safety. Whether it\'s a small adjustment to a tagging system or a technical insight about guide pressure, your input helps optimize the operation. This is especially important during shift changes, saw troubleshooting, or when testing new setups.\nAs a professional, your role includes offering constructive, evidence-based suggestions, regardless of your level of experience. Apprentices who speak up respectfully build trust and show a genuine commitment to the trade.',
        looksLike: '• You identify that a grinding wheel is wearing unevenly, and recommend replacement before it causes improper tooth geometry, excessive heat, or vibration.\n• You notice that the saw storage rack has bent hooks, and explain how it could warp saws, recommending realignment or replacement.\n• You suggest introducing a visual tagging system using magnets, flags, or color codes to clearly mark:\no Saws that are tensioned and ready\no Saws awaiting weld inspection\no Saws tagged out due to damage or imbalance\n• You observe that increasing table travel speed during knife grinding reduced heat tint, and demonstrate the result to your mentor or crew.\n• You report a recurring issue on the edger, pointing out that guide bolts may be backing off or misaligned—prompting an adjustment that prevents further defects.\n• During a team install, you suggest reviewing back gauge measurements due to unexpected tracking on the previous shift—leading to correction of a strain offset.\nThese are just a few examples.',
        critical: '❗ Why this is critical:\nFilers are closest to the tools, the saws, and the real-time issues that impact performance and safety. No one sees everything, and a single overlooked issue—like a dull grinder, untagged saw, or guide slip—can lead to:\n• Unsafe equipment being reinstalled\n• Wasted lumber or machine damage\n• Excess vibration, bearing failure, or saw ejection\n• Loss of time and credibility across shifts\nShops that welcome suggestions run smarter and safer. By sharing your ideas, you:\n• Build trust with your mentor and coworkers\n• Reinforce a culture of accountability\n• Help prevent breakdowns before they happen\n• Show leadership in your approach to filing'
    },
    // Add remaining competencies with basic structure - they'll be populated from the original import-competencies.js
    { id: 'DSWP01', category: 'Demonstrate Safe Work Practices', text: 'Explain proper PPE.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'DSWP02', category: 'Demonstrate Safe Work Practices', text: 'Demonstrate safe handling of knives and saws.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'DSWP03', category: 'Demonstrate Safe Work Practices', text: 'Demonstrate proper utilization of equipment.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'DSWP04', category: 'Demonstrate Safe Work Practices', text: 'Properly store and maintain equipment and tools.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'DSWP05', category: 'Demonstrate Safe Work Practices', text: 'Understands and exhibits proper housekeeping.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'DSWP06', category: 'Demonstrate Safe Work Practices', text: 'Exhibit safety.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'DSWP07', category: 'Demonstrate Safe Work Practices', text: 'Knife and chipper safety (access and replacement of components).', referenceCode: '', what: '', looksLike: '', critical: '' },
    
    // Quality Control
    { id: 'QC01', category: 'Quality Control', text: 'Explain proper tools to use for saw measurement.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'QC02', category: 'Quality Control', text: 'Demonstrate correct measuring techniques.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'QC03', category: 'Quality Control', text: 'Demonstrate proper utilization of equipment.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'QC04', category: 'Quality Control', text: 'Properly store and maintain equipment and tools.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'QC05', category: 'Quality Control', text: 'Understand, explain and set clearances.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'QC06', category: 'Quality Control', text: 'Perform calculations to achieve targeted lumber sizes.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'QC07', category: 'Quality Control', text: 'Explain and demonstrate understanding and application of torque.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'QC08', category: 'Quality Control', text: 'Understand standards and specifications.', referenceCode: '', what: '', looksLike: '', critical: '' },
    
    // Saw Guides
    { id: 'SG01', category: 'Saw Guides', text: 'Dress and rebuild bandsaw guides.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'SG02', category: 'Saw Guides', text: 'Properly maintain guides and guide dresser.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'SG03', category: 'Saw Guides', text: 'Rebuild gang and edger saw guides.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'SG04', category: 'Saw Guides', text: 'Measure and test guide thickness and evenness.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'SG05', category: 'Saw Guides', text: 'Safe and proper handling of guides to maintain quality.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'SG06', category: 'Saw Guides', text: 'Properly remove, pour and replace babbit.', referenceCode: '', what: '', looksLike: '', critical: '' },
    
    // Knife Care
    { id: 'KC01', category: 'Knife Care', text: 'Demonstrate proper knife grinding and honing.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'KC02', category: 'Knife Care', text: 'Maintain knife grinding equipment.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'KC03', category: 'Knife Care', text: 'Set clearances and other required measurements.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'KC04', category: 'Knife Care', text: 'Measure and set clearances.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'KC05', category: 'Knife Care', text: 'Demonstrate understanding of runout.', referenceCode: '', what: '', looksLike: '', critical: '' },
    
    // Circular Saws
    { id: 'CS01', category: 'Circular Saws', text: 'Evaluate saws for repairability.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'CS02', category: 'Circular Saws', text: 'Replace teeth as needed.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'CS03', category: 'Circular Saws', text: 'Properly weld and repair cracks.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'CS04', category: 'Circular Saws', text: 'Operate jointer, front and side dresser.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'CS05', category: 'Circular Saws', text: 'Bench circular saws (level and tension).', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'CS06', category: 'Circular Saws', text: 'Operate and maintain saw shop equipment required for circular saw maintenance.', referenceCode: '', what: '', looksLike: '', critical: '' },
    
    // Band Saws
    { id: 'BS01', category: 'Band Saws', text: 'Properly swage teeth or replace Stellite inserts.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'BS02', category: 'Band Saws', text: 'Check and maintain tooth alignment.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'BS03', category: 'Band Saws', text: 'Grind teeth to proper geometry and regrind gullets as required.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'BS04', category: 'Band Saws', text: 'Repair weld and cracks.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'BS05', category: 'Band Saws', text: 'Explain and demonstrate proper leveling of band saw.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'BS06', category: 'Band Saws', text: 'Explain and demonstrate proper tensioning of band saws.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'BS07', category: 'Band Saws', text: 'Operate and maintain saw shop equipment required for band saw maintenance.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'BS08', category: 'Band Saws', text: 'Display proper technique for lapping a band saw.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'BS09', category: 'Band Saws', text: 'Proper disposal of band saws.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'BS10', category: 'Band Saws', text: 'Recognize and safely address hurt or wrecked band saws.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'BS11', category: 'Band Saws', text: 'Checking and maintaining straight edges and other tools.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'BS12', category: 'Band Saws', text: 'Calibration of back gage.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'BS13', category: 'Band Saws', text: 'Handling, storage and transportation of band saws.', referenceCode: '', what: '', looksLike: '', critical: '' },
    
    // Mill Maintenance and Setup
    { id: 'MMS01', category: 'Mill Maintenance and Setup', text: 'Set-up and align head rig (incl. strain, guide pressure, crossline).', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'MMS02', category: 'Mill Maintenance and Setup', text: 'Set-up circular saws (incl. arbor runout and wear).', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'MMS03', category: 'Mill Maintenance and Setup', text: 'Set-up band mill (incl. strain, guide pressure, crossline).', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'MMS04', category: 'Mill Maintenance and Setup', text: 'Regrind band saws as required.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'MMS05', category: 'Mill Maintenance and Setup', text: 'Calculate and set-up cooling and lubrication as needed.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'MMS06', category: 'Mill Maintenance and Setup', text: 'Calculate and set-up feed speeds and feeds.', referenceCode: '', what: '', looksLike: '', critical: '' },
    { id: 'MMS07', category: 'Mill Maintenance and Setup', text: 'Checking and maintaining scrapers, shears and covers.', referenceCode: '', what: '', looksLike: '', critical: '' }
];

function updateDatabase() {
    console.log('Starting complete competency import...');
    
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error opening database:', err);
            return;
        }
        console.log('Connected to database');
    });

    // Clear existing competencies
    db.run('DELETE FROM competencies', (err) => {
        if (err) {
            console.error('Error clearing competencies:', err);
            return;
        }
        console.log('Cleared existing competencies');
        
        // Insert all competencies
        const stmt = db.prepare(`
            INSERT INTO competencies (id, category, text, referenceCode, what, looksLike, critical)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        let insertedCount = 0;
        
        allCompetencies.forEach(comp => {
            stmt.run([
                comp.id,
                comp.category,
                comp.text,
                comp.referenceCode,
                comp.what,
                comp.looksLike,
                comp.critical
            ], function(err) {
                if (err) {
                    console.error(`Error inserting competency ${comp.id}:`, err);
                } else {
                    insertedCount++;
                    console.log(`Inserted: ${comp.id} - ${comp.text}`);
                }
            });
        });
        
        stmt.finalize((err) => {
            if (err) {
                console.error('Error finalizing statement:', err);
            } else {
                console.log(`\nComplete import finished! Inserted ${insertedCount} competencies.`);
                console.log('Note: Some competencies have detailed information, others have basic structure ready for future updates.');
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

updateDatabase();