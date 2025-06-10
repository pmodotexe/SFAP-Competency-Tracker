// ========================================================================
// --- Global Variables ---
const SPREADSHEET_ID = "11mGP1jQ60HyLmhjOJxxliN1-A-fABd7fqYbUEAXIQGk"; // <<< YOUR SPREADSHEET ID HERE (VERIFY THIS!)
const USERS_SHEET_NAME = "Users";           // <<< MUST MATCH YOUR SHEET NAME EXACTLY
const COMPETENCIES_SHEET_NAME = "Competencies"; // <<< MUST MATCH YOUR SHEET NAME EXACTLY
const PROGRESS_SHEET_NAME = "Progress";       // <<< MUST MATCH YOUR SHEET NAME EXACTLY
const VALIDATOR_PLACEHOLDER = "[Validated]";    // Placeholder for MentorEmail column

// --- Column Indices (CRITICAL: Update these based on your ACTUAL sheet order!) ---
// --- If these are wrong, data fetching WILL fail or be incorrect! ---

// Users Sheet Columns (Example: A=0, B=1, ...)
const USERS_EMAIL_COL = 0;      // Column A: Email
const USERS_PASSWORD_COL = 1;   // Column B: Password
const USERS_FIRSTNAME_COL = 2;  // Column C: FirstName
const USERS_LASTNAME_COL = 3;   // Column D: LastName
const USERS_COHORT_COL = 4;     // Column E: Cohort
const USERS_COMPANY_COL = 5;    // Column F: Company
const USERS_ROLE_COL = 6;       // Column G: Role

// Competencies Sheet Columns (Example: A=0, B=1, ...)
const COMP_ID_COL = 0;          // Column A: CompetencyID
const COMP_CAT_COL = 1;         // Column B: Category
const COMP_TEXT_COL = 2;        // Column C: Text
const COMP_REF_COL = 3;         // Column D: ReferenceCode
const COMP_WHAT_COL = 4;        // Column E: What this means
const COMP_LOOKS_LIKE_COL = 5;  // Column F: What it looks like
const COMP_CRITICAL_COL = 6;    // Column G: Why critical

// Progress Sheet Columns (CRITICAL: Match your sheet order EXACTLY)
const PROG_ID_COL = 0;          // Column A: ProgressID ({ApprenticeEmail}_{CompetencyID})
const PROG_APP_EMAIL_COL = 1;   // Column B: ApprenticeEmail
const PROG_COMP_ID_COL = 2;     // Column C: CompetencyID
const PROG_RATING_COL = 3;      // Column D: Rating (Mentor 0-5)
const PROG_DATE_COL = 4;        // Column E: DateValidated (Mentor timestamp)
const PROG_MENTOR_COL = 5;      // Column F: MentorName
const PROG_SIG_COL = 6;         // Column G: MentorSignature (Data URL)
const PROG_TIMESTAMP_COL = 7;   // Column H: Timestamp (Original/LastModified?)
const PROG_SELF_RATING_COL = 8; // Column I: SelfRating (Apprentice 1-3)
const PROG_VIEWED_DATE_COL = 9; // Column J: ViewedDate (Timestamp)
const PROG_HANDOFF_DATE_COL = 10;// Column K: HandoffDate (Timestamp)
const PROG_COMMENTS_COL = 11;   // Column L: Comments (Mentor text)
const PROG_MAX_COL_INDEX = 11;  // Index of the last column we care about (L=11) - UPDATE IF YOU ADD MORE PROGRESS COLUMNS

// --- Web App Entry Point ---
function doGet(e) {
  Logger.log(`GET request received. Params: ${JSON.stringify(e?.parameter)}`);
  try {
    let htmlOutput = HtmlService.createTemplateFromFile('Index').evaluate();
    htmlOutput
      .setTitle('ETA 671 Competency Tracker')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
    return htmlOutput;
  } catch (error) {
      Logger.log(`Error in doGet: ${error.toString()}\nStack: ${error.stack}`);
      return HtmlService.createHtmlOutput(`<p>Error loading application: ${error.message}. Please contact administrator.</p>`);
  }
}

function include(filename) {
  try {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (error) {
      Logger.log(`Error including file ${filename}: ${error.toString()}`);
      return `<p>Error including ${filename}</p>`;
  }
}

// --- API Functions (called from Frontend JS via google.script.run) ---

function login(email, password) {
  Logger.log(`Login attempt for: ${email}`);
  try {
    if (!email || !password) {
        return { success: false, message: "Email and password are required." };
    }
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(USERS_SHEET_NAME);
    if (!sheet) throw new Error(`Configuration Error: User sheet "${USERS_SHEET_NAME}" not found.`);
    
    const data = sheet.getDataRange().getValues();
    const inputEmailLower = email.toLowerCase().trim();

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const maxUserCol = Math.max(USERS_EMAIL_COL, USERS_PASSWORD_COL, USERS_FIRSTNAME_COL, USERS_LASTNAME_COL, USERS_COHORT_COL, USERS_COMPANY_COL, USERS_ROLE_COL);
      if (!row || row.length <= maxUserCol) continue;
      
      const sheetEmail = String(row[USERS_EMAIL_COL] || '').toLowerCase().trim();
      const sheetPassword = String(row[USERS_PASSWORD_COL] || '');

      if (sheetEmail === inputEmailLower && sheetPassword === password) {
        const user = {
          email: row[USERS_EMAIL_COL],
          firstName: row[USERS_FIRSTNAME_COL] || '',
          lastName: row[USERS_LASTNAME_COL] || '',
          fullName: `${row[USERS_FIRSTNAME_COL] || ''} ${row[USERS_LASTNAME_COL] || ''}`.trim(),
          cohort: row[USERS_COHORT_COL] || 'N/A',
          company: row[USERS_COMPANY_COL] || 'N/A',
          role: 'Apprentice' // Role is always Apprentice now
        };
        Logger.log(`Login successful for: ${user.email}`);
        return { success: true, user: user };
      }
    }
    Logger.log(`Login failed for: ${email} - No matching user/password found.`);
    return { success: false, message: "Invalid email or password." };
  } catch (error) {
    Logger.log(`Login Error for ${email}: ${error.toString()}\nStack: ${error.stack}`);
    return { success: false, message: "An internal error occurred during login." };
  }
}

/**
 * SIMPLIFIED: Fetches competencies and merges progress data for the logged-in user.
 */
function getCompetenciesAndProgress(userEmail) {
  Logger.log(`Fetching data for user: ${userEmail}`);
  try {
    if (!userEmail) {
        return { success: false, message: "User email is required." };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const compSheet = ss.getSheetByName(COMPETENCIES_SHEET_NAME);
    const progSheet = ss.getSheetByName(PROGRESS_SHEET_NAME);

    if (!compSheet || !progSheet) {
        throw new Error(`Configuration Error: A required sheet was not found.`);
    }

    const competenciesData = compSheet.getDataRange().getValues();
    const progressData = progSheet.getDataRange().getValues();

    // 1. Process Competencies
    const competencies = {};
    for (let i = 1; i < competenciesData.length; i++) {
      const row = competenciesData[i];
      const maxCompCol = Math.max(COMP_ID_COL, COMP_CAT_COL, COMP_TEXT_COL, COMP_REF_COL, COMP_WHAT_COL, COMP_LOOKS_LIKE_COL, COMP_CRITICAL_COL);
      if (!row || row.length <= maxCompCol || !row[COMP_ID_COL] || !row[COMP_CAT_COL] || !row[COMP_TEXT_COL]) continue;
      
      const category = row[COMP_CAT_COL];
      if (!competencies[category]) competencies[category] = [];
      
      competencies[category].push({
          id: String(row[COMP_ID_COL]).trim(), 
          text: String(row[COMP_TEXT_COL]).trim(),
          referenceCode: String(row[COMP_REF_COL] || '').trim(),
          category: String(category).trim(),
          what: String(row[COMP_WHAT_COL] || '').trim(),
          looksLike: String(row[COMP_LOOKS_LIKE_COL] || '').trim(),
          critical: String(row[COMP_CRITICAL_COL] || '').trim(),
          status: 'pending',
          progress: null
      });
    }

    // 2. Process Progress into a map for the specific user
    const relevantProgress = {};
    const apprenticeEmailToCheckLower = userEmail.toLowerCase();
    for (let i = 1; i < progressData.length; i++) {
      const row = progressData[i];
      if (!row || row.length <= PROG_MAX_COL_INDEX || !row[PROG_APP_EMAIL_COL] || !row[PROG_COMP_ID_COL]) continue;

      const progApprenticeEmailLower = String(row[PROG_APP_EMAIL_COL]).toLowerCase().trim();
      if (progApprenticeEmailLower === apprenticeEmailToCheckLower) {
        const cleanCompId = String(row[PROG_COMP_ID_COL]).trim();
        
        const validValidationDate = row[PROG_DATE_COL] instanceof Date ? row[PROG_DATE_COL] : null;
        const validViewedDate = row[PROG_VIEWED_DATE_COL] instanceof Date ? row[PROG_VIEWED_DATE_COL] : null;
        const validHandoffDate = row[PROG_HANDOFF_DATE_COL] instanceof Date ? row[PROG_HANDOFF_DATE_COL] : null;
        
        relevantProgress[cleanCompId] = {
          progressId: row[PROG_ID_COL] ? String(row[PROG_ID_COL]).trim() : `${progApprenticeEmailLower}_${cleanCompId}`,
          apprentice: String(row[PROG_APP_EMAIL_COL]).trim(),
          competencyId: cleanCompId,
          rating: (row[PROG_RATING_COL] !== '' && !isNaN(Number(row[PROG_RATING_COL]))) ? parseInt(row[PROG_RATING_COL], 10) : null,
          mentorName: row[PROG_MENTOR_COL] ? String(row[PROG_MENTOR_COL]).trim() : null,
          signature: row[PROG_SIG_COL] || null,
          selfRating: (row[PROG_SELF_RATING_COL] !== '' && !isNaN(Number(row[PROG_SELF_RATING_COL]))) ? parseInt(row[PROG_SELF_RATING_COL], 10) : null,
          comments: row[PROG_COMMENTS_COL] ? String(row[PROG_COMMENTS_COL]).trim() : null,
          dateValidatedStr: validValidationDate ? validValidationDate.toISOString() : null,
          viewedDateStr: validViewedDate ? validViewedDate.toISOString() : null,
          handoffDateStr: validHandoffDate ? validHandoffDate.toISOString() : null
        };
      }
    }

    // 3. Merge progress into competencies
    for (const category in competencies) {
      competencies[category].forEach(comp => {
        const progress = relevantProgress[comp.id];
        if (progress) {
          comp.progress = progress;
          if (progress.rating !== null && progress.dateValidatedStr) comp.status = 'reviewed';
          else if (progress.handoffDateStr) comp.status = 'ready';
          else if (progress.selfRating !== null) comp.status = 'selfRated';
          else if (progress.viewedDateStr) comp.status = 'viewed';
          else comp.status = 'pending';
        } else {
          comp.status = 'pending';
          comp.progress = null;
        }
      });
    }
    
    Logger.log(`Data processed successfully for ${userEmail}.`);
    return { success: true, competencies: competencies };

  } catch (error) {
    Logger.log(`!!! UNCAUGHT ERROR in getCompetenciesAndProgress for ${userEmail}: ${error.toString()}\nStack: ${error.stack}`);
    return { success: false, message: `An internal server error occurred while fetching competency data: ${error.message}.` };
  }
}

// --- Helper Function to Find or Create Progress Row ---
function findOrCreateProgressRow(sheet, progressId, apprenticeEmail, competencyId) {
  Logger.log(`Searching for progress row with ID: ${progressId}`);
  try {
    const sheetData = sheet.getDataRange().getValues();
    for (let i = 1; i < sheetData.length; i++) {
      if (sheetData[i] && sheetData[i].length > PROG_ID_COL && sheetData[i][PROG_ID_COL] === progressId) {
        Logger.log(`Found existing progress row ${i + 1} for ID: ${progressId}`);
        const rowCopy = [...sheetData[i]];
        while (rowCopy.length <= PROG_MAX_COL_INDEX) { rowCopy.push(null); }
        return { rowIndex: i + 1, rowData: rowCopy, isNew: false };
      }
    }
    Logger.log(`Progress ID ${progressId} not found. Preparing new row data.`);
    const newRow = new Array(PROG_MAX_COL_INDEX + 1).fill(null);
    newRow[PROG_ID_COL] = progressId;
    newRow[PROG_APP_EMAIL_COL] = apprenticeEmail;
    newRow[PROG_COMP_ID_COL] = competencyId;
    return { rowIndex: null, rowData: newRow, isNew: true };
  } catch (error) {
      Logger.log(`Error in findOrCreateProgressRow for ${progressId}: ${error.toString()}`);
      throw new Error(`Failed to access progress data sheet: ${error.message}`);
  }
}

function markAsViewed(apprenticeEmail, competencyId) {
    Logger.log(`Marking as viewed: Appr: ${apprenticeEmail}, Comp: ${competencyId}`);
    try {
        if (!apprenticeEmail || !competencyId) {
            return { success: false, message: "Missing apprentice email or competency ID." };
        }
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        const sheet = ss.getSheetByName(PROGRESS_SHEET_NAME);
        if (!sheet) throw new Error(`Configuration Error: Sheet "${PROGRESS_SHEET_NAME}" not found.`);

        const progressId = `${apprenticeEmail}_${competencyId}`;
        const { rowIndex, rowData, isNew } = findOrCreateProgressRow(sheet, progressId, apprenticeEmail, competencyId);
        const currentDate = new Date();

        if (!isNew && rowData[PROG_VIEWED_DATE_COL] instanceof Date) {
             Logger.log(`Row ${rowIndex} for ${progressId} already marked as viewed. No update needed.`);
             return { success: true, message: "Already marked as viewed.", viewedDate: rowData[PROG_VIEWED_DATE_COL].toISOString() };
        }

        rowData[PROG_VIEWED_DATE_COL] = currentDate;
        rowData[PROG_TIMESTAMP_COL] = currentDate;

        if (isNew) {
            sheet.appendRow(rowData);
            Logger.log(`Appended new progress row for ${progressId} and marked as viewed.`);
        } else {
            const range = sheet.getRange(rowIndex, 1, 1, rowData.length);
            range.setValues([rowData]);
            Logger.log(`Updated row ${rowIndex} for ${progressId}, setting viewed date.`);
        }
        SpreadsheetApp.flush();
        return { success: true, message: "Marked as viewed.", viewedDate: currentDate.toISOString() };
    } catch (error) {
        Logger.log(`markAsViewed Error: ${error.toString()}\nStack: ${error.stack}`);
        return { success: false, message: "An internal error occurred." };
    }
}

function saveSelfRatingAndReady(apprenticeEmail, competencyId, selfRating) {
    Logger.log(`Saving self-rating & ready: Appr: ${apprenticeEmail}, Comp: ${competencyId}, SelfRate: ${selfRating}`);
    try {
        const ratingNum = parseInt(selfRating, 10);
        if (!apprenticeEmail || !competencyId || isNaN(ratingNum) || ratingNum < 1 || ratingNum > 3) {
            return { success: false, message: "Missing required data or invalid self-rating." };
        }
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        const sheet = ss.getSheetByName(PROGRESS_SHEET_NAME);
        if (!sheet) throw new Error(`Configuration Error: Sheet "${PROGRESS_SHEET_NAME}" not found.`);

        const progressId = `${apprenticeEmail}_${competencyId}`;
        const { rowIndex, rowData, isNew } = findOrCreateProgressRow(sheet, progressId, apprenticeEmail, competencyId);
        const currentDate = new Date();

        rowData[PROG_SELF_RATING_COL] = ratingNum;
        rowData[PROG_HANDOFF_DATE_COL] = currentDate;
        rowData[PROG_TIMESTAMP_COL] = currentDate;
        if (!(rowData[PROG_VIEWED_DATE_COL] instanceof Date)) {
            rowData[PROG_VIEWED_DATE_COL] = currentDate;
        }

        if (isNew) {
            sheet.appendRow(rowData);
        } else {
            sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
        }
        SpreadsheetApp.flush();
        return { success: true, message: "Self-rating saved and marked ready for mentor.", handoffDate: currentDate.toISOString() };
    } catch (error) {
        Logger.log(`saveSelfRatingAndReady Error: ${error.toString()}\nStack: ${error.stack}`);
        return { success: false, message: "An internal error occurred." };
    }
}

function saveCompetencyValidation(data) {
  Logger.log('--- saveCompetencyValidation STARTED ---');
  try {
    const { apprenticeEmail, competencyId, rating, signatureDataUrl, comments, manualValidationDate, mentorName } = data || {};

    if (!apprenticeEmail || !competencyId || (rating !== 0 && !rating) || !signatureDataUrl || !mentorName) {
      Logger.log('Validation failed: Missing required data.');
      return { success: false, message: "Missing required validation data (Rating, Signature, Mentor Name)." };
    }
    const ratingNum = parseInt(rating, 10);
    if (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 5) {
      Logger.log('Validation failed: Invalid rating value.');
      return { success: false, message: "Invalid rating value (must be 0-5)." };
    }
    if (!signatureDataUrl.startsWith("data:image/")) {
        Logger.log('Validation failed: Invalid signature format.');
        return { success: false, message: "Invalid signature data format." };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(PROGRESS_SHEET_NAME);
    if (!sheet) throw new Error(`Configuration Error: Sheet "${PROGRESS_SHEET_NAME}" not found.`);

    const progressId = `${apprenticeEmail}_${competencyId}`;
    const { rowIndex, rowData, isNew } = findOrCreateProgressRow(sheet, progressId, apprenticeEmail, competencyId);
    
    let validationDateToUse = new Date();
    if (manualValidationDate) {
        try {
            const parsedManualDate = new Date(manualValidationDate);
            if (!isNaN(parsedManualDate.getTime())) validationDateToUse = parsedManualDate;
        } catch (e) { /* Ignore parse error, use current date */ }
    }

    rowData[PROG_RATING_COL] = ratingNum;
    rowData[PROG_DATE_COL] = validationDateToUse; 
    rowData[PROG_MENTOR_COL] = mentorName; 
    rowData[PROG_SIG_COL] = signatureDataUrl;
    rowData[PROG_COMMENTS_COL] = comments || null; 
    rowData[PROG_TIMESTAMP_COL] = new Date(); 

    if (isNew) {
        Logger.log(`Warning: Saving final validation for ${progressId}, but row was new.`);
        if (!(rowData[PROG_VIEWED_DATE_COL] instanceof Date)) rowData[PROG_VIEWED_DATE_COL] = validationDateToUse; 
        if (!(rowData[PROG_HANDOFF_DATE_COL] instanceof Date)) rowData[PROG_HANDOFF_DATE_COL] = validationDateToUse; 
        sheet.appendRow(rowData);
    } else {
        sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]); 
    }
    SpreadsheetApp.flush(); 
    return { success: true, message: "Competency validation saved successfully.", dateValidated: validationDateToUse.toISOString() };
  } catch (error) {
    Logger.log(`!!! CRITICAL ERROR in saveCompetencyValidation: ${error.toString()} \nStack: ${error.stack}`);
    return { success: false, message: `Server-side error: ${error.message}` };
  }
}

function registerUser(userData) {
  Logger.log(`Register attempt for email: ${userData?.email}`);
  try {
    const requiredFields = ['firstName', 'lastName', 'email', 'password', 'cohort', 'company'];
    for (const field of requiredFields) {
      if (!userData || !userData[field]) {
        return { success: false, message: `Missing required field: ${field}` };
      }
    }
    if (userData.password.length < 6) {
      return { success: false, message: "Password must be at least 6 characters."};
    }
    if (!/\S+@\S+\.\S+/.test(userData.email)) {
        return { success: false, message: "Please enter a valid email address." };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(USERS_SHEET_NAME);
    if (!sheet) throw new Error(`Configuration Error: Sheet "${USERS_SHEET_NAME}" not found.`);

    const data = sheet.getDataRange().getValues();
    const newEmailLower = userData.email.toLowerCase().trim();
    const emailExists = data.some((row, i) => i > 0 && String(row[USERS_EMAIL_COL] || '').toLowerCase().trim() === newEmailLower);

    if (emailExists) {
      return { success: false, message: "This email address is already registered." };
    }

    const newUserRow = new Array(sheet.getMaxColumns()).fill('');
    newUserRow[USERS_EMAIL_COL] = userData.email.trim();
    newUserRow[USERS_PASSWORD_COL] = userData.password;
    newUserRow[USERS_FIRSTNAME_COL] = userData.firstName.trim();
    newUserRow[USERS_LASTNAME_COL] = userData.lastName.trim();
    newUserRow[USERS_COHORT_COL] = userData.cohort.trim();
    newUserRow[USERS_COMPANY_COL] = userData.company.trim();
    newUserRow[USERS_ROLE_COL] = 'Apprentice'; // Default Role

    sheet.appendRow(newUserRow);
    SpreadsheetApp.flush();
    return { success: true, message: "Registration successful! You can now log in." };
  } catch (error) {
    Logger.log(`Registration Error: ${error.toString()}\nStack: ${error.stack}`);
    return { success: false, message: "An internal error occurred during registration." };
  }
}

function getSignatureForProgress(progressId) {
    Logger.log(`Fetching signature for Progress ID: ${progressId}`);
    try {
        if (!progressId) return { success: false, signature: null };
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        const sheet = ss.getSheetByName(PROGRESS_SHEET_NAME);
        if (!sheet) throw new Error(`Configuration Error: Sheet "${PROGRESS_SHEET_NAME}" not found.`);
        
        const data = sheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
            if (data[i] && data[i][PROG_ID_COL] === progressId) {
                const signatureData = data[i][PROG_SIG_COL];
                if (signatureData && typeof signatureData === 'string' && signatureData.startsWith('data:image/')) {
                     return { success: true, signature: signatureData };
                }
                return { success: true, signature: null }; // Found row, but no valid signature
            }
        }
        return { success: false, signature: null, message: "Progress record not found." };
    } catch (error) {
        Logger.log(`getSignatureForProgress Error: ${error.toString()}\nStack: ${error.stack}`);
        return { success: false, signature: null };
    }
}

function getCompetencyListOnly() {
    Logger.log("Fetching competency list only for blank form generation.");
    try {
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        const compSheet = ss.getSheetByName(COMPETENCIES_SHEET_NAME);
        if (!compSheet) throw new Error(`Configuration Error: Sheet "${COMPETENCIES_SHEET_NAME}" not found.`);

        const competenciesData = compSheet.getDataRange().getValues();
        const competencies = {};
        for (let i = 1; i < competenciesData.length; i++) {
            const row = competenciesData[i];
            const maxCompCol = Math.max(COMP_ID_COL, COMP_CAT_COL, COMP_TEXT_COL, COMP_REF_COL);
            if (!row || row.length <= maxCompCol || !row[COMP_ID_COL] || !row[COMP_CAT_COL] || !row[COMP_TEXT_COL]) continue;
            
            const category = row[COMP_CAT_COL];
            if (!competencies[category]) competencies[category] = [];
            
            competencies[category].push({
                id: String(row[COMP_ID_COL]).trim(),
                text: String(row[COMP_TEXT_COL]).trim(),
                referenceCode: String(row[COMP_REF_COL] || '').trim()
            });
        }
        return { success: true, competencies: competencies };
    } catch (error) {
        Logger.log(`getCompetencyListOnly Error: ${error.toString()}\nStack: ${error.stack}`);
        return { success: false, message: "An error occurred fetching the competency list." };
    }
}

/**
 * UPDATES an existing validation record without changing the signature.
 * Used for correcting dates, ratings, or comments.
 */
function updateCompetencyValidation(data) {
  Logger.log('--- updateCompetencyValidation STARTED ---');
  try {
    const { apprenticeEmail, competencyId, rating, comments, manualValidationDate, mentorName } = data;
    if (!apprenticeEmail || !competencyId || (rating !== 0 && !rating) || !mentorName) {
      throw new Error("Missing required data for update.");
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(PROGRESS_SHEET_NAME);
    if (!sheet) throw new Error(`Configuration Error: Sheet "${PROGRESS_SHEET_NAME}" not found.`);

    const progressId = `${apprenticeEmail}_${competencyId}`;
    const { rowIndex, rowData } = findOrCreateProgressRow(sheet, progressId, apprenticeEmail, competencyId);

    if (!rowIndex) {
      throw new Error("Cannot update a competency that has no progress record.");
    }

    let validationDateToUse = new Date(rowData[PROG_DATE_COL]); // Default to existing date
    if (manualValidationDate) {
        try {
            const parsedManualDate = new Date(manualValidationDate);
            if (!isNaN(parsedManualDate.getTime())) validationDateToUse = parsedManualDate;
        } catch (e) { /* Ignore parse error, use existing date */ }
    }

    // Update only the relevant fields
    rowData[PROG_RATING_COL] = parseInt(rating, 10);
    rowData[PROG_COMMENTS_COL] = comments || null;
    rowData[PROG_DATE_COL] = validationDateToUse;
    rowData[PROG_MENTOR_COL] = mentorName;
    rowData[PROG_TIMESTAMP_COL] = new Date(); // Update the last modified timestamp

    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    SpreadsheetApp.flush();
    
    Logger.log('--- updateCompetencyValidation SUCCESS ---');
    return { success: true, message: "Validation updated successfully.", dateValidated: validationDateToUse.toISOString() };

  } catch (error) {
    Logger.log(`!!! CRITICAL ERROR in updateCompetencyValidation: ${error.toString()}`);
    return { success: false, message: `Server-side error during update: ${error.message}` };
  }
}