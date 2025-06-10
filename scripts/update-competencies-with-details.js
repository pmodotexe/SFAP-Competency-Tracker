// Script to update competencies with detailed information from CSV
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'competency_tracker.db');

// Complete competencies data with all details from the CSV
const competenciesWithDetails = [
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
    {
        id: 'DSWP01',
        category: 'Demonstrate Safe Work Practices',
        text: 'Explain proper PPE.',
        referenceCode: '• Personal Apparel & Safety Equipment\nSaw Filer 1, Sections 2-1-1 to 2-1-12\n• Knife Safety & Glove Standards\nSaw Filer 1, Sections 8-1-1 to 8-1-2\n• Hearing Protection Requirements\nSaw Filer 1, Section 2-1-8',
        what: 'Personal Protective Equipment (PPE) in the filing trade is specialized and mandatory. Filing tools are high-precision instruments that require proper care, and routine maintenance to remain accurate and safe to use. When tools like micrometers, dial indicators, or straightedges are damaged, they can provide false readings that lead to unsafe saw setups.\nAs a filer, you must understand the specific PPE requirements for each task—from basic shop safety to specialized protection during welding, grinding, or handling knives and saws.',
        looksLike: '• You wear safety glasses with side shields at all times in the filing room, and switch to welding helmets or face shields during grinding or welding operations.\n• You use cut-resistant gloves when handling knives, but remove them when operating precision measuring tools to maintain tactile sensitivity.\n• You wear hearing protection in areas where noise levels exceed safe limits, especially near grinders, saws in operation, or pneumatic tools.\n• You ensure your clothing is appropriate—no loose sleeves, jewelry, or untied shoelaces that could catch in machinery.\n• You use respiratory protection when grinding or working with chemicals, and ensure proper ventilation in enclosed spaces.\n• You inspect your PPE before each shift and replace damaged items immediately.\n• You understand when specialized PPE is required, such as:\no Welding helmets and leather aprons for crack repair\no Cut-resistant sleeves for knife handling\no Steel-toed boots in all shop areas\no Hard hats in designated areas',
        critical: 'Filing work involves sharp tools, precision machinery, high-speed rotating equipment, and potentially hazardous materials. Proper PPE prevents:\n• Cuts and lacerations from knives and saw teeth\n• Eye injuries from metal particles, sparks, or chemical splashes\n• Hearing damage from prolonged exposure to machinery noise\n• Respiratory issues from grinding dust or chemical vapors\n• Burns from welding operations or hot metal\n• Crushing injuries from heavy saws or equipment\nPPE is your first line of defense. A single moment of carelessness—like removing safety glasses to get a "better look" at a measurement—can result in permanent injury. Professional filers understand that PPE is not optional; it\'s an essential part of the job.'
    },
    {
        id: 'DSWP02',
        category: 'Demonstrate Safe Work Practices',
        text: 'Demonstrate safe handling of knives and saws.',
        referenceCode: '• Knife Handling and Storage Procedures\nSaw Filer 1, Sections 8-1-1 to 8-1-3\n• Saw Transportation and Lifting Techniques\nSaw Filer 1, Sections 4-1-1 to 4-1-4\n• Lockout/Tagout Procedures\nSaw Filer 1, Section 2-2-1',
        what: 'Knives and saws are the primary cutting tools in lumber processing, and they present significant safety hazards due to their sharp edges, weight, and the forces involved in their operation. Safe handling requires understanding proper lifting techniques, storage methods, transportation procedures, and the use of appropriate safety equipment.\nThis competency covers both the physical handling of these tools and the safety protocols that must be followed to prevent injury to yourself and others.',
        looksLike: '• When handling knives, you:\no Always wear cut-resistant gloves and safety glasses\no Carry knives with the cutting edge away from your body\no Use proper lifting techniques for heavy knife assemblies\no Store knives in designated racks with guards or covers\no Never leave knives unattended on work surfaces\n• When moving saws, you:\no Use proper lifting techniques and get assistance for heavy saws\no Carry saws vertically when possible to prevent warping\no Use saw carts or handling equipment for large circular saws\no Ensure clear pathways before moving saws\no Communicate with others in the area about saw movement\n• You follow lockout/tagout procedures when:\no Removing or installing cutting tools\no Performing maintenance on equipment\no Working on machinery that could unexpectedly start\n• You inspect tools before handling to identify:\no Damaged or cracked cutting edges\no Loose or missing components\no Signs of excessive wear or fatigue',
        critical: 'Knives and saws are among the most dangerous tools in the lumber industry. Improper handling can result in:\n• Severe lacerations requiring emergency medical attention\n• Back injuries from improper lifting techniques\n• Crushing injuries from dropped saws or knives\n• Equipment damage from improper storage or handling\n• Production delays from damaged cutting tools\nThe weight and sharpness of these tools demand constant vigilance. A moment of inattention or failure to follow proper procedures can result in life-changing injuries. Safe handling practices protect not only you but also your coworkers and the valuable equipment you work with.'
    },
    {
        id: 'DSWP03',
        category: 'Demonstrate Safe Work Practices',
        text: 'Demonstrate proper utilization of equipment.',
        referenceCode: '• Equipment Operating Procedures\nSaw Filer 1, Sections 5-1-1 to 5-1-8\n• Machine Safety and Guards\nSaw Filer 1, Section 2-3-1\n• Lockout/Tagout Procedures\nSaw Filer 1, Section 2-2-1',
        what: 'Proper utilization means using machines within their specifications, following established operating procedures, and maintaining all safety systems. This applies to all measuring equipment, grinding machines, tensioning equipment, welding apparatus, and material handling systems used in the filing trade.\nYou must understand the capabilities and limitations of each piece of equipment, follow manufacturer guidelines, and recognize when equipment is not functioning properly.',
        looksLike: '• Before operating any equipment, you:\no Inspect safety guards and emergency stops\no Verify that all safety systems are functional\no Check for proper lubrication and maintenance\no Ensure the work area is clear of obstacles\n• You operate equipment within design parameters:\no Use appropriate speeds and feeds for the material\no Do not exceed weight or size limitations\no Follow proper startup and shutdown procedures\no Monitor equipment performance during operation\n• You maintain situational awareness by:\no Keeping hands and loose clothing away from moving parts\no Using push sticks or other safety devices when appropriate\no Stopping equipment immediately if unusual sounds or vibrations occur\no Following lockout/tagout procedures when making adjustments\n• You properly maintain equipment by:\no Following scheduled maintenance procedures\no Reporting unusual wear or damage immediately\no Keeping equipment clean and properly lubricated\no Storing equipment properly when not in use',
        critical: 'Filing equipment operates at high speeds and with significant force. Improper use can result in:\n• Serious injury from contact with moving parts\n• Equipment damage requiring costly repairs\n• Poor quality work that affects production\n• Workplace accidents that could have been prevented\nAs a filer, you are responsible for understanding and following all safety procedures. Equipment that is used improperly not only poses immediate safety risks but can also develop problems that affect its accuracy and reliability. Your commitment to proper utilization protects both people and equipment.'
    },
    {
        id: 'DSWP04',
        category: 'Demonstrate Safe Work Practices',
        text: 'Properly store and maintain equipment and tools.',
        referenceCode: '• Tool Storage and Organization\nSaw Filer 1, Section 7-2-1\n• Equipment Maintenance Schedules\nSaw Filer 1, Sections 5-2-1 to 5-2-4\n• Calibration and Inspection Requirements\nSaw Filer 1, Section 7-1-2',
        what: 'Filing tools are high-precision instruments that require proper care and routine maintenance to remain accurate and safe to use. When tools like micrometers, dial indicators, or straightedges are damaged, they can provide false readings that lead to unsafe saw setups.\nProper storage protects tools from damage, contamination, and environmental factors that could affect their accuracy. Regular maintenance ensures that equipment continues to function safely and reliably.',
        looksLike: '• You store precision measuring tools in:\no Protective cases or designated storage areas\no Climate-controlled environments when possible\no Locations where they won\'t be dropped or damaged\no Clean, dry conditions free from contamination\n• You maintain cutting tools by:\no Cleaning them after each use\no Applying appropriate lubricants or rust preventatives\no Storing them in racks or holders that prevent damage\no Inspecting them regularly for wear or damage\n• You follow maintenance schedules for:\no Lubrication of moving parts\no Calibration of measuring instruments\no Replacement of worn components\no Cleaning and inspection procedures\n• You document maintenance activities:\no Recording calibration dates and results\no Noting any repairs or adjustments made\no Tracking tool condition and performance\no Reporting problems or concerns to supervision',
        critical: 'Precision tools are expensive and critical to safe, accurate work. Poor storage and maintenance can result in:\n• Inaccurate measurements leading to unsafe saw setups\n• Premature tool failure and replacement costs\n• Production delays while tools are repaired or replaced\n• Safety hazards from malfunctioning equipment\nA micrometer that reads incorrectly by even 0.001" can cause significant problems in saw setup. Your responsibility for tool care directly impacts the quality and safety of your work. Well-maintained tools are reliable tools, and reliable tools are essential for professional filing work.'
    },
    {
        id: 'DSWP05',
        category: 'Demonstrate Safe Work Practices',
        text: 'Understands and exhibits proper housekeeping.',
        referenceCode: '• Workplace Organization and Cleanliness\nSaw Filer 1, Section 2-4-1\n• Material Handling and Storage\nSaw Filer 1, Section 4-2-1\n• Waste Disposal and Environmental Compliance\nSaw Filer 1, Section 2-4-2',
        what: 'Proper housekeeping in the filing trade goes beyond basic cleanliness—it\'s a safety requirement and a mark of professionalism. A well-organized workspace reduces the risk of accidents, improves efficiency, and demonstrates respect for tools, equipment, and coworkers.\nHousekeeping includes maintaining clean work surfaces, properly storing materials and tools, disposing of waste appropriately, and keeping walkways and emergency exits clear.',
        looksLike: '• You maintain clean work surfaces by:\no Removing metal shavings and debris after each operation\no Wiping down surfaces with appropriate cleaners\no Keeping work areas free from oil, grease, and other contaminants\no Organizing tools and materials in designated locations\n• You manage materials properly by:\no Storing saws and knives in appropriate racks\no Keeping raw materials organized and accessible\no Disposing of scrap metal in designated containers\no Maintaining inventory of supplies and consumables\n• You ensure safe walkways by:\no Keeping aisles clear of obstacles\no Cleaning up spills immediately\no Properly storing equipment when not in use\no Maintaining adequate lighting in work areas\n• You follow environmental procedures by:\no Disposing of hazardous materials according to regulations\no Using appropriate containers for different types of waste\no Minimizing waste through efficient work practices\no Reporting environmental concerns to supervision',
        critical: 'Poor housekeeping is a leading cause of workplace accidents. In the filing trade, where sharp tools and precision equipment are used daily, housekeeping failures can result in:\n• Slip, trip, and fall accidents\n• Cuts from improperly stored tools\n• Equipment damage from contamination\n• Fire hazards from accumulated debris\n• Regulatory violations and fines\nA cluttered, dirty workspace also reflects poorly on your professionalism and can affect the quality of your work. Clean, organized work areas promote safety, efficiency, and pride in craftsmanship. Your commitment to good housekeeping protects everyone in the workplace.'
    },
    {
        id: 'DSWP06',
        category: 'Demonstrate Safe Work Practices',
        text: 'Exhibit safety.',
        referenceCode: '• General Safety Principles\nSaw Filer 1, Chapter 2\n• Hazard Recognition and Risk Assessment\nSaw Filer 1, Section 2-5-1\n• Emergency Procedures\nSaw Filer 1, Section 2-6-1',
        what: 'Exhibiting safety means making safety a priority in every aspect of your work. This goes beyond following specific safety rules—it means developing a safety mindset where you actively look for hazards, think about the consequences of your actions, and take responsibility for creating a safe work environment.\nSafety is not just about protecting yourself; it\'s about protecting your coworkers, the equipment, and the overall operation.',
        looksLike: '• You demonstrate safety awareness by:\no Conducting pre-task safety assessments\no Identifying potential hazards before beginning work\no Using appropriate PPE for each task\no Following established safety procedures consistently\n• You communicate safety concerns by:\no Reporting unsafe conditions immediately\no Discussing safety issues with coworkers and supervisors\no Participating in safety meetings and training\no Sharing lessons learned from near-misses or incidents\n• You maintain situational awareness by:\no Staying alert to changing conditions\no Watching for hazards that could affect others\no Avoiding shortcuts that compromise safety\no Taking breaks when fatigue could impair judgment\n• You respond appropriately to emergencies by:\no Knowing the location of emergency equipment\no Understanding evacuation procedures\no Providing first aid when trained and appropriate\no Following incident reporting procedures',
        critical: 'Safety is everyone\'s responsibility, but as a skilled tradesperson, you have a special obligation to model safe behavior and look out for others. The filing trade involves numerous hazards that can cause serious injury or death:\n• High-speed rotating equipment\n• Sharp cutting tools and edges\n• Heavy materials and equipment\n• Electrical hazards\n• Chemical exposures\nA single unsafe act can have consequences that extend far beyond the immediate situation. Your commitment to safety protects lives, prevents injuries, maintains productivity, and demonstrates the professionalism expected of a certified saw filer.'
    },
    {
        id: 'DSWP07',
        category: 'Demonstrate Safe Work Practices',
        text: 'Knife and chipper safety (access and replacement of components).',
        referenceCode: '• Knife Installation and Removal Procedures\nSaw Filer 1, Sections 8-2-1 to 8-2-4\n• Chipper Safety and Maintenance\nSaw Filer 1, Section 8-3-1\n• Lockout/Tagout for Knife Systems\nSaw Filer 1, Section 2-2-2',
        what: 'Knife and chipper systems operate at extremely high speeds and involve multiple sharp cutting edges. Safe access and component replacement requires understanding the specific hazards associated with these systems, following proper lockout/tagout procedures, and using appropriate tools and techniques.\nThis competency covers the safe procedures for accessing knife systems, replacing worn or damaged components, and ensuring that all safety systems are properly restored before returning equipment to service.',
        looksLike: '• Before accessing knife systems, you:\no Follow complete lockout/tagout procedures\no Verify that all energy sources are isolated\no Use appropriate PPE including cut-resistant gloves\no Ensure adequate lighting and workspace\n• During component replacement, you:\no Use proper tools designed for knife handling\no Support heavy components to prevent dropping\no Inspect new components for defects before installation\no Follow torque specifications for fasteners\n• You maintain safety throughout the process by:\no Keeping cutting edges covered when possible\no Working methodically to avoid rushing\no Communicating with team members about your activities\no Double-checking all connections and adjustments\n• Before returning to service, you:\no Remove all tools and debris from the work area\no Verify that all guards and safety devices are in place\no Test all safety systems and emergency stops\no Document the work performed and components replaced',
        critical: 'Knife and chipper systems are among the most dangerous equipment in lumber processing. The combination of high rotational speeds, multiple cutting edges, and significant mass creates extreme hazards:\n• Severe lacerations from contact with cutting edges\n• Crushing injuries from heavy rotating components\n• Projectile hazards from loose or improperly installed parts\n• Equipment damage from improper installation\nFailure to follow proper safety procedures can result in fatal accidents. The energy stored in rotating knife systems is enormous, and any mistake in lockout/tagout or component installation can have catastrophic consequences. Your expertise in safe knife and chipper procedures protects lives and prevents devastating accidents.'
    }
];

function updateDatabase() {
    console.log('Starting competency details update...');
    
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
        
        // Insert updated competencies with details
        const stmt = db.prepare(`
            INSERT INTO competencies (id, category, text, referenceCode, what, looksLike, critical)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        let insertedCount = 0;
        
        competenciesWithDetails.forEach(comp => {
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
                console.log(`\nUpdate completed! Inserted ${insertedCount} competencies with detailed information.`);
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