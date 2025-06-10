// SFAP Competency Tracker - Frontend JavaScript
// Converted from Google Apps Script to standalone web application

let currentUser = null;
let competenciesData = null; 
let mentorSignaturePad = null; 
let isSaving = false;        
let currentSearchTerm = '';
let activeFilter = 'all';
const VALIDATOR_PLACEHOLDER = "[Validated]"; 

// --- Element Cache ---
const loadingEl = document.getElementById('loading');
const loginView = document.getElementById('login-view');
const registerView = document.getElementById('register-view');
const forgotPasswordView = document.getElementById('forgot-password-view');
const apprenticeDashboard = document.getElementById('apprentice-dashboard');
const userInfoEl = document.getElementById('user-info');
const userNameEl = document.getElementById('user-name');
const userDetailsEl = document.getElementById('user-details');
const logoutButton = document.getElementById('logout-button');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterLink = document.getElementById('show-register-link');
const showForgotPasswordLink = document.getElementById('show-forgot-password-link');
const backToLoginLinkReg = document.getElementById('back-to-login-link-reg');
const backToLoginLinkForgot = document.getElementById('back-to-login-link-forgot');
const printReportButton = document.getElementById('print-report-button'); 
const printBlankReportButton = document.getElementById('print-blank-report-button'); 
const reportViewEl = document.getElementById('report-view');
const reportUserInfoEl = document.getElementById('report-user-info');
const reportCompDetailsEl = document.getElementById('report-competency-details');
const reportSummaryEl = document.getElementById('report-summary');
const reportJobInfoEl = document.getElementById('report-job-info');
const reportRatingInfoEl = document.getElementById('report-rating-info');

// Modal Elements
const competencyDetailModal = document.getElementById('competency-detail-modal');
const competencyDetailModalContent = document.getElementById('competency-detail-modal-content');
const detailCompetencyId = document.getElementById('detail-competency-id');
const detailCurrentStatus = document.getElementById('detail-current-status');
const detailMode = document.getElementById('detail-mode');
const competencyDetailTitle = document.getElementById('competency-detail-title');
const competencyDetailText = document.getElementById('competency-detail-text');
const detailApprenticeNameDisplay = document.getElementById('detail-apprentice-name-display');
const closeDetailModalButton = document.getElementById('close-detail-modal-button');

// Modal Content Phases
const apprenticePhaseContent = document.getElementById('apprentice-phase-content');
const mentorPhaseContent = document.getElementById('mentor-phase-content');
const reviewedPhaseContent = document.getElementById('reviewed-phase-content');

// Apprentice Phase Elements
const detailWhatText = document.getElementById('detail-what-text');
const detailLooksLikeText = document.getElementById('detail-looks-like-text');
const detailCriticalText = document.getElementById('detail-critical-text');
const detailReferenceText = document.getElementById('detail-reference-text');
const apprenticeSelfAssessmentSection = document.getElementById('apprentice-self-assessment-section');
const selfRatingOptions = document.getElementById('self-rating-options');
const readyForMentorButton = document.getElementById('ready-for-mentor-button');
const readyButtonText = document.getElementById('ready-button-text');
const readySpinner = document.getElementById('ready-spinner');
const mentorProceedToReviewButton = document.getElementById('mentor-proceed-to-review-button');

// Mentor Phase Elements
const mentorViewSelfRating = document.getElementById('mentor-view-self-rating');
const mentorNameInput = document.getElementById('mentor-name-input');
const mentorRatingSelect = document.getElementById('mentor-rating-select');
const mentorValidationDateEl = document.getElementById('mentor-validation-date');
const mentorComments = document.getElementById('mentor-comments');
const signatureSection = document.getElementById('signature-section');
const mentorSignatureCanvas = document.getElementById('mentor-signature-canvas');
const mentorClearSignatureButton = document.getElementById('mentor-clear-signature-button');
const mentorCancelButton = document.getElementById('mentor-cancel-button');
const mentorSubmitButton = document.getElementById('mentor-submit-button');
const submitButtonText = document.getElementById('submit-button-text');
const submitSpinner = document.getElementById('submit-spinner');
const mentorRatingSystemDisplay = document.getElementById('mentor-rating-system-display');

// Reviewed Phase Elements
const reviewedViewSelfRating = document.getElementById('reviewed-view-self-rating');
const reviewedViewMentorName = document.getElementById('reviewed-view-mentor-name');
const reviewedViewMentorRating = document.getElementById('reviewed-view-mentor-rating');
const reviewedViewDate = document.getElementById('reviewed-view-date');
const reviewedViewComments = document.getElementById('reviewed-view-comments');
const reviewedViewSignature = document.getElementById('reviewed-view-signature');
const editValidationButton = document.getElementById('edit-validation-button');
const reviewedCloseButton = document.getElementById('reviewed-close-button');

// --- Constants & Maps ---
const ratingDescriptions = { 5: "Exceeds All", 4: "Meets & Exceeds", 3: "Meets Exp.", 2: "Meets Some", 1: "Needs Imprv.", 0: "Does Not Meet", null: "Pending" };
const ratingDescriptionsLong = { 
    5: "Consistently exceeds performance standard established for the time in position. Achieves results above and beyond what is required. Extends themselves in their roles to exceed personally and as a team to achieve exceptional results.",
    4: "Apprentice not only meets all expectations in a fully satisfactory way, but exceeds some of the objectives.",
    3: "Consistently meets the performance standards established for time in position. Handles routine tasks & some unexpected situation with the usual amount of supervision. Can continue to develop with coaching, advanced training or more experience",
    2: "Apprentice occasionally meets some of the objectives related to this goal, but does not meet others in a fully satisfactory way. This performance level generally indicates the need for additional coaching, training or other plan for performance improvements.",
    1: "Does not consistently meet performance standards established for time in position. Requires basic training, coaching or experience to improve performance and become consistent. Additional follow-up will be necessary.",
    0: "Clearly and repeatedly does not meet the performance standards established for time in position. Additional follow-up and specific suggestions for improvement mandatory."
};
const selfRatingDescriptions = { 1: "Need More Practice", 2: "Almost Ready", 3: "Ready to Perform", null: "Not Rated" };
const statusMap = {
    pending: { tag: '⚪', class: 'status-pending', text: 'Pending' },
    viewed: { tag: '👁️', class: 'status-viewed', text: 'Viewed' },
    selfRated: { tag: '⭐', class: 'status-selfRated', text: 'Self-Rated' },
    ready: { tag: '📬', class: 'status-ready', text: 'Ready for Mentor' },
    reviewed: { tag: '✅', class: 'status-reviewed', text: 'Reviewed' }
};

// --- UI Functions ---
function showLoading() { loadingEl.classList.remove('hidden'); }
function hideLoading() { loadingEl.classList.add('hidden'); }

function showToast(message, type = 'info') {
    Toastify({
        text: message,
        duration: type === 'error' ? 5000 : 3000,
        gravity: "top", position: "right", stopOnFocus: true, 
        style: { background: type === 'success' ? "#16a34a" : type === 'error' ? "#dc2626" : "#3b82f6", color: "white", borderRadius: "0.375rem", zIndex: 1000 },
    }).showToast();
}
function showError(message) { hideLoading(); showToast(message, 'error'); }
function showSuccess(message) { showToast(message, 'success'); }

function updateUserInfo() {
     if (currentUser) {
         userNameEl.textContent = `${currentUser.fullName || 'User'}`;
         userDetailsEl.textContent = `Company: ${currentUser.company || 'N/A'} | Cohort: ${currentUser.cohort || 'N/A'}`;
         userInfoEl.classList.remove('hidden');
     } else {
         userInfoEl.classList.add('hidden');
     }
}

function showView(viewId) {
    ['login-view', 'register-view', 'forgot-password-view', 'apprentice-dashboard'].forEach(id => {
        document.getElementById(id)?.classList.add('hidden');
    });
    const viewToShow = document.getElementById(viewId);
    if(viewToShow) {
        if (viewId === 'login-view') loginForm?.reset();
        if (viewId === 'register-view') registerForm?.reset();
        viewToShow.classList.remove('hidden');
    } else {
        showError(`Internal Error: Cannot display view (${viewId}).`);
    }
}

// --- Data Handling & Rendering ---
function findCompetencyById(competencyId) {
    if (!competenciesData) return null;
    for (const category in competenciesData) {
        const found = competenciesData[category].find(c => c && c.id === competencyId);
        if (found) return found;
    }
    return null;
}

function renderCompetencies(competencies) {
    const container = document.getElementById('apprentice-competency-list');
    if (!container) return;
    container.innerHTML = ''; 

    if (!competencies || Object.keys(competencies).length === 0) {
        container.innerHTML = '<p class="text-gray-600 p-4 text-center">No competencies found.</p>';
        printReportButton.disabled = true;
        printBlankReportButton.disabled = true;
        return;
    }

    updateDashboardSummary(competencies);

    const categoryOrder = ["General Competencies", "Demonstrate Safe Work Practices", "Quality Control", "Knives and Chippers", "Circular Saws", "Band Saws", "Mill Machine Set-Up"];
    Object.keys(competencies).forEach(cat => { if (!categoryOrder.includes(cat)) categoryOrder.push(cat); });

    let tippyInstances = []; 
    categoryOrder.forEach(category => {
        if (competencies[category]?.length > 0) {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200';
            categoryDiv.innerHTML = `<h3 class="text-lg font-semibold mb-3 text-indigo-700 border-b border-gray-200 pb-2">${category}</h3>`;
            const list = document.createElement('ul');
            list.className = 'space-y-3 competency-list max-h-[60vh] overflow-y-auto pr-2'; 

            competencies[category].forEach(comp => {
                const statusInfo = statusMap[comp.status] || statusMap.pending;
                let actionText = '';
                if (comp.status === 'reviewed' && comp.progress?.rating !== null) {
                    const ratingKey = comp.progress.rating;
                    const ratingBgColors = { 5: "bg-purple-600", 4: "bg-green-600", 3: "bg-blue-600", 2: "bg-yellow-400", 1: "bg-orange-500", 0: "bg-red-600" };
                    const ratingTextColors = { 5: "text-white", 4: "text-white", 3: "text-white", 2: "text-black", 1: "text-white", 0: "text-white" };
                    actionText = `<span class="px-2 py-0.5 rounded-full text-xs font-semibold ${ratingBgColors[ratingKey]} ${ratingTextColors[ratingKey]}"><strong class="mr-1">${ratingKey}</strong><span class="hidden sm:inline"> - ${ratingDescriptions[ratingKey]}</span></span>`;
                } else if (comp.status === 'ready') {
                    actionText = `<span class="text-xs font-semibold text-orange-600 uppercase tracking-wider">READY FOR MENTOR</span>`;
                }

                const listItem = document.createElement('li');
                listItem.setAttribute('data-competency-id', comp.id);
                listItem.className = `flex items-center justify-between p-3 border border-gray-200 rounded-md transition duration-150 cursor-pointer hover:bg-blue-50 hover:border-blue-300`;
                
                listItem.innerHTML = `
                    <div class="flex-grow flex items-center min-w-0">
                        <span class="status-tag ${statusInfo.class}" data-tippy-content="${statusInfo.text}">${statusInfo.tag}</span>
                        <span class="text-gray-800 text-sm sm:text-base break-words ml-2">${comp.text}</span>
                    </div>
                    <div class="action-div flex-shrink-0 flex items-center space-x-2 ml-4">${actionText}</div>`;
                
                listItem.onclick = () => showCompetencyDetailModal(findCompetencyById(comp.id));
                list.appendChild(listItem);
                tippyInstances.push(listItem.querySelector('.status-tag'));
            });
            categoryDiv.appendChild(list);
            container.appendChild(categoryDiv);
        }
    });
    tippy(tippyInstances, { theme: 'custom-light', placement: 'top' });
    printReportButton.disabled = false;
    printBlankReportButton.disabled = false;
    applyFilters();
}

function updateDashboardSummary(competencies) {
    let total = 0, reviewed = 0, ready = 0;
    for (const category in competencies) {
        competencies[category].forEach(comp => {
            total++;
            if (comp.status === 'reviewed') reviewed++;
            else if (comp.status === 'ready') ready++;
        });
    }
    const pending = total - reviewed - ready;
    const percentage = total > 0 ? (reviewed / total) * 100 : 0;

    document.getElementById('summary-total').textContent = total;
    document.getElementById('summary-reviewed').textContent = reviewed;
    document.getElementById('summary-ready').textContent = ready;
    document.getElementById('summary-pending').textContent = pending;
    document.getElementById('summary-percentage').textContent = Math.round(percentage);
    document.getElementById('summary-progress-bar').style.width = `${percentage}%`;
    
    // Trigger GSAP animations refresh
    if (window.refreshScrollTrigger) {
        window.refreshScrollTrigger();
    }
}

function applyFilters() {
    const listItems = document.querySelectorAll('#apprentice-competency-list li[data-competency-id]');
    const searchTerm = currentSearchTerm.toLowerCase();

    listItems.forEach(li => {
        const compId = li.getAttribute('data-competency-id');
        const comp = findCompetencyById(compId);
        if (!comp) return;

        const matchesFilter = activeFilter === 'all' || comp.status === activeFilter || (activeFilter === 'pending' && (comp.status === 'viewed' || comp.status === 'selfRated' || comp.status === 'pending'));
        const matchesSearch = searchTerm === '' || comp.text.toLowerCase().includes(searchTerm);

        li.style.display = (matchesFilter && matchesSearch) ? '' : 'none';
    });
}

function flashListItem(competencyId) {
    const listItem = document.querySelector(`li[data-competency-id="${competencyId}"]`);
    if (listItem) {
        listItem.classList.add('flash-update');
        setTimeout(() => {
            listItem.classList.remove('flash-update');
        }, 1500);
    }
}

// --- API Communication ---
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`/api${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            credentials: 'include',
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// --- Authentication ---
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if (!email || !password) return showError("Please enter both email and password.");
    
    showLoading();
    try {
        const response = await apiCall('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        if (response.success && response.user) {
            currentUser = response.user;
            updateUserInfo();
            await fetchDataForUser();
        } else {
            showError(response.message || "Login failed.");
        }
    } catch (error) {
        showError("Login failed. Please try again.");
    } finally {
        hideLoading();
    }
}

async function handleLogout() {
    try {
        await apiCall('/logout', { method: 'POST' });
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    currentUser = null;
    competenciesData = null;
    updateUserInfo();
    showView('login-view');
    showToast("You have been logged out.", "info");
}

async function fetchDataForUser() {
    if (!currentUser?.email) return showError("User information is missing.");
    
    showLoading();
    try {
        const response = await apiCall('/competencies');
        
        if (response.success) {
            competenciesData = response.competencies;
            renderCompetencies(competenciesData);
            showView('apprentice-dashboard');
        } else {
            showError(response.message || "Failed to fetch data after login.");
            handleLogout();
        }
    } catch (error) {
        showError("Failed to fetch competencies. Please try again.");
        handleLogout();
    } finally {
        hideLoading();
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const userData = {
        firstName: document.getElementById('reg-firstName').value.trim(),
        lastName: document.getElementById('reg-lastName').value.trim(),
        email: document.getElementById('reg-email').value.trim(),
        cohort: document.getElementById('reg-cohort').value.trim(),
        company: document.getElementById('reg-company').value.trim(),
        password: document.getElementById('reg-password').value,
    };
    const confirmPassword = document.getElementById('reg-confirmPassword').value;

    if (Object.values(userData).some(v => !v)) return showError("Please fill in all fields.");
    if (userData.password !== confirmPassword) return showError("Passwords do not match.");
    if (userData.password.length < 6) return showError("Password must be at least 6 characters.");
    
    showLoading();
    try {
        const response = await apiCall('/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        
        if (response.success) {
            showSuccess(response.message);
            showView('login-view');
        } else {
            showError(response.message || "Registration failed.");
        }
    } catch (error) {
        showError("Registration failed. Please try again.");
    } finally {
        hideLoading();
    }
}

// --- Modal Logic & Workflow ---
function showCompetencyDetailModal(comp) {
    if (!comp) return showError("Could not load competency details.");
    
    detailCompetencyId.value = comp.id;
    detailCurrentStatus.value = comp.status;
    detailMode.value = 'new'; // Default to new submission
    competencyDetailTitle.textContent = comp.text;
    competencyDetailText.textContent = comp.text;
    detailApprenticeNameDisplay.textContent = currentUser.fullName;

    apprenticePhaseContent.classList.add('hidden');
    mentorPhaseContent.classList.add('hidden');
    reviewedPhaseContent.classList.add('hidden');
    readyForMentorButton.classList.add('hidden');
    mentorProceedToReviewButton.classList.add('hidden');
    resetActionButtons();

    if (comp.status === 'reviewed') {
        reviewedPhaseContent.classList.remove('hidden');
        populateReviewedView(comp.progress);
    } else if (comp.status === 'ready') {
        apprenticePhaseContent.classList.remove('hidden');
        populateApprenticeView(comp);
        apprenticeSelfAssessmentSection.classList.add('hidden');
        mentorProceedToReviewButton.classList.remove('hidden');
    } else {
        apprenticePhaseContent.classList.remove('hidden');
        populateApprenticeView(comp);
        apprenticeSelfAssessmentSection.classList.remove('hidden');
        readyForMentorButton.classList.remove('hidden');
        if (comp.status === 'pending') {
            markCompetencyAsViewed(currentUser.email, comp.id);
        }
    }

    competencyDetailModalContent.scrollTop = 0;
    document.body.style.overflow = 'hidden';
    competencyDetailModal.classList.remove('hidden');
    gsap.fromTo(competencyDetailModal, { opacity: 0 }, { opacity: 1, duration: 0.2 });
    gsap.fromTo('#competency-detail-modal-content', { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25, ease: 'power2.out' });
}

function enterEditMode() {
    const comp = findCompetencyById(detailCompetencyId.value);
    if (!comp || !comp.progress) return;

    detailMode.value = 'edit';
    reviewedPhaseContent.classList.add('hidden');
    mentorPhaseContent.classList.remove('hidden');
    
    populateMentorView(comp.progress, true); // Pass true for edit mode
    initializeMentorSignaturePad();
    requestAnimationFrame(resizeMentorCanvas);
}

function proceedToMentorReview() {
    const comp = findCompetencyById(detailCompetencyId.value);
    if (!comp) return;
    apprenticePhaseContent.classList.add('hidden');
    mentorPhaseContent.classList.remove('hidden');
    populateMentorView(comp.progress, false); // Pass false for new submission
    initializeMentorSignaturePad();
    requestAnimationFrame(resizeMentorCanvas);
}

function populateApprenticeView(comp) {
    detailWhatText.textContent = comp.what || "Not specified.";
    detailLooksLikeText.textContent = comp.looksLike || "Not specified.";
    detailCriticalText.textContent = comp.critical || "Not specified.";
    detailReferenceText.textContent = comp.referenceCode || "N/A";
    document.querySelectorAll('input[name="self_rating"]').forEach(radio => radio.checked = false);
    readyForMentorButton.disabled = true;
    if (comp.progress?.selfRating) {
        const radio = document.getElementById(`self_rating_${comp.progress.selfRating}`);
        if (radio) radio.checked = true;
        readyForMentorButton.disabled = false;
    }
}

function populateMentorView(progress, isEditMode = false) {
    mentorViewSelfRating.textContent = progress?.selfRating ? `${progress.selfRating} - ${selfRatingDescriptions[progress.selfRating]}` : "Not Rated";
    mentorNameInput.value = isEditMode && progress?.mentorName ? progress.mentorName : '';
    
    let ratingSystemHTML = '<table><thead><tr><th class="text-left">Rating System</th><th class="text-left">Description</th><th class="text-center">Points</th></tr></thead><tbody>';
    for (const key in ratingDescriptionsLong) {
        ratingSystemHTML += `<tr><td class="py-1 pr-2 align-top">${ratingDescriptions[key]}</td><td class="py-1 pr-2 align-top">${ratingDescriptionsLong[key]}</td><td class="py-1 text-center align-top">${key}</td></tr>`;
    }
    ratingSystemHTML += '</tbody></table>';
    mentorRatingSystemDisplay.innerHTML = ratingSystemHTML;

    if (isEditMode) {
        mentorRatingSelect.value = progress.rating;
        mentorComments.value = progress.comments || '';
        mentorValidationDateEl.value = progress.dateValidatedStr ? progress.dateValidatedStr.substring(0, 10) : new Date().toISOString().substring(0, 10);
        signatureSection.classList.add('hidden');
        submitButtonText.textContent = 'Save Changes';
    } else {
        mentorRatingSelect.value = '';
        mentorComments.value = '';
        mentorValidationDateEl.value = new Date().toISOString().substring(0, 10);
        signatureSection.classList.remove('hidden');
        submitButtonText.textContent = 'Submit Signature';
        mentorSignaturePad?.clear();
    }
}

function populateReviewedView(progress) {
    if (!progress) return;
    reviewedViewSelfRating.textContent = progress.selfRating ? `${progress.selfRating} - ${selfRatingDescriptions[progress.selfRating]}` : "Not Rated";
    reviewedViewMentorName.textContent = progress.mentorName || VALIDATOR_PLACEHOLDER;
    reviewedViewMentorRating.textContent = progress.rating !== null ? `${progress.rating} - ${ratingDescriptions[progress.rating]}` : "N/A";
    reviewedViewDate.textContent = progress.dateValidatedStr ? new Date(progress.dateValidatedStr).toLocaleDateString() : "N/A";
    reviewedViewComments.textContent = progress.comments || "No comments provided.";
    reviewedViewSignature.src = progress.signature || '';
    reviewedViewSignature.classList.toggle('hidden', !progress.signature);
}

function hideCompetencyDetailModal() {
    if (competencyDetailModal.classList.contains('hidden')) return;
    const hideAnimation = () => {
        document.body.style.overflow = '';
        competencyDetailModal.classList.add('hidden');
        window.removeEventListener("resize", resizeMentorCanvas);
    };
    gsap.to('#competency-detail-modal-content', { scale: 0.95, opacity: 0, duration: 0.15 });
    gsap.to(competencyDetailModal, { opacity: 0, duration: 0.2, delay: 0.05, onComplete: hideAnimation });
}

function initializeMentorSignaturePad() {
    if (!mentorSignatureCanvas) return;
    if (!mentorSignaturePad) {
        try {
            mentorSignaturePad = new SignaturePad(mentorSignatureCanvas, { penColor: "rgb(0, 0, 100)", backgroundColor: 'rgb(249, 250, 251)' });
            window.addEventListener("resize", resizeMentorCanvas);
        } catch (e) { showError("Failed to initialize signature pad."); }
    }
    mentorSignaturePad.clear();
}

function resizeMentorCanvas() {
    if (!mentorSignaturePad || !mentorSignatureCanvas || mentorPhaseContent.classList.contains('hidden')) return;
    const canvas = mentorSignatureCanvas;
    const container = canvas.parentElement;
    if (!container || container.offsetWidth <= 0) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = container.offsetWidth * ratio;
    canvas.height = container.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
    mentorSignaturePad.clear();
}

async function markCompetencyAsViewed(apprenticeEmail, competencyId) {
    try {
        const response = await apiCall(`/competencies/${competencyId}/viewed`, {
            method: 'POST'
        });
        
        if (response.success) {
            const comp = findCompetencyById(competencyId);
            if(comp) {
                if (!comp.progress) comp.progress = {}; 
                comp.progress.viewedDateStr = response.viewedDate; 
                comp.status = 'viewed';
                renderCompetencies(competenciesData);
            }
        }
    } catch (error) {
        console.error('Error marking as viewed:', error);
    }
}

function handleSelfRatingChange() {
    const selectedRating = document.querySelector('#competency-detail-modal input[name="self_rating"]:checked');
    readyForMentorButton.disabled = !selectedRating; 
    const compId = detailCompetencyId.value;
    const comp = findCompetencyById(compId);
    if (selectedRating && comp && comp.status !== 'selfRated') {
         comp.status = 'selfRated'; 
         renderCompetencies(competenciesData);
    }
}

async function handleReadyForMentor() {
    if (isSaving) return;
    const competencyId = detailCompetencyId.value;
    const selectedRatingInput = document.querySelector('#competency-detail-modal input[name="self_rating"]:checked');
    if (!selectedRatingInput) return showError("Please select a self-assessment rating.");
    
    isSaving = true;
    readyButtonText.textContent = 'Submitting...';
    readySpinner.classList.remove('hidden');
    readyForMentorButton.disabled = true; 

    try {
        const response = await apiCall(`/competencies/${competencyId}/ready`, {
            method: 'POST',
            body: JSON.stringify({ selfRating: parseInt(selectedRatingInput.value) })
        });
        
        if (response.success) {
            showSuccess("Competency marked Ready for Mentor!");
            await fetchDataForUser();
            hideCompetencyDetailModal();
        } else {
            showError(response.message || "Failed to save self-rating.");
            readyForMentorButton.disabled = false;
        }
    } catch (error) {
        showError("Failed to save self-rating. Please try again.");
        readyForMentorButton.disabled = false;
    } finally {
        isSaving = false;
        resetActionButtons();
    }
}

async function handleFinalSubmission() {
    if (isSaving) return;
    if (mentorRatingSelect.value === "") return showError("Please select a mentor rating.");
    
    const mode = detailMode.value;
    let dataToSave;
    const mentorName = mentorNameInput.value.trim();

    if (!mentorName) {
         return showError("Mentor name is required.");
    }

    isSaving = true;
    showLoading();

    try {
        if (mode === 'edit') {
            dataToSave = {
                apprenticeEmail: currentUser.email,
                rating: parseInt(mentorRatingSelect.value, 10),
                comments: mentorComments.value.trim(), 
                manualValidationDate: mentorValidationDateEl.value,
                mentorName: mentorName 
            };
            
            const response = await apiCall(`/competencies/${detailCompetencyId.value}/validate`, {
                method: 'PUT',
                body: JSON.stringify(dataToSave)
            });
            
            if (response.success) {
                showSuccess(response.message || "Validation updated!");
                await fetchDataForUser();
            } else {
                showError(response.message || "Failed to update validation.");
            }
        } else {
            if (mentorSignaturePad?.isEmpty()) {
                return showError("Mentor signature is required.");
            }
            
            dataToSave = {
                apprenticeEmail: currentUser.email,
                rating: parseInt(mentorRatingSelect.value, 10),
                signatureDataUrl: mentorSignaturePad.toDataURL("image/png"),
                comments: mentorComments.value.trim(),
                manualValidationDate: mentorValidationDateEl.value,
                mentorName: mentorName
            };
            
            const response = await apiCall(`/competencies/${detailCompetencyId.value}/validate`, {
                method: 'POST',
                body: JSON.stringify(dataToSave)
            });
            
            if (response.success) {
                showSuccess(response.message || "Validation saved!");
                await fetchDataForUser();
            } else {
                showError(response.message || "Failed to save validation.");
            }
        }
        
        hideCompetencyDetailModal();
    } catch (error) {
        showError("Failed to save validation. Please try again.");
    } finally {
        isSaving = false;
        hideLoading();
        resetActionButtons();
    }
}

function resetActionButtons() {
    isSaving = false;
    if (readyButtonText && readySpinner && readyForMentorButton) {
        readyButtonText.textContent = 'Ready for Mentor';
        readySpinner.classList.add('hidden');
        readyForMentorButton.disabled = !document.querySelector('#competency-detail-modal input[name="self_rating"]:checked');
    }
    if (submitButtonText && submitSpinner && mentorSubmitButton) {
        submitButtonText.textContent = 'Submit Signature';
        submitSpinner.classList.add('hidden');
        mentorSubmitButton.disabled = false;
    }
}

// --- PRINT & SAVE FUNCTIONS ---
async function generateReportElement(isBlankForm = false) {
    if (!currentUser || !competenciesData) {
        showError("User or competency data not available for report.");
        return null;
    }
    showLoading();

    const reportContainer = document.createElement('div');
    reportContainer.innerHTML = reportViewEl.innerHTML; // Clone the structure

    const userInfoEl = reportContainer.querySelector('#report-user-info');
    const compDetailsEl = reportContainer.querySelector('#report-competency-details');
    const summaryEl = reportContainer.querySelector('#report-summary');
    const jobInfoEl = reportContainer.querySelector('#report-job-info');
    const ratingInfoEl = reportContainer.querySelector('#report-rating-info');
    
    jobInfoEl.innerHTML = `<h2>WORK PROCESS SCHEDULE - SAW FILER</h2><p class="codes">O*NET-SOC CODE: 51-4194.00 RAPIDS CODE: 0495CB</p><p><strong>Description:</strong> Perform precision smoothing, sharpening, polishing, or grinding of metal objects.</p>`;
    ratingInfoEl.innerHTML = `<h4>On-the-Job Learning - Rating System:</h4><table><thead><tr><th>Rating System</th><th>Description</th><th>Points</th></tr></thead><tbody><tr><td>Exceeds All Expectations</td><td>${ratingDescriptionsLong[5]}</td><td>5</td></tr><tr><td>Meets & Exceeds Some Expectations</td><td>${ratingDescriptionsLong[4]}</td><td>4</td></tr><tr><td>Meets Expectations</td><td>${ratingDescriptionsLong[3]}</td><td>3</td></tr><tr><td>Meets Some Expectations</td><td>${ratingDescriptionsLong[2]}</td><td>2</td></tr><tr><td>Does Not Meet / Meets Some Expectations</td><td>${ratingDescriptionsLong[1]}</td><td>1</td></tr><tr><td>Does Not Meet Expectations</td><td>${ratingDescriptionsLong[0]}</td><td>0</td></tr></tbody></table>`;
    jobInfoEl.classList.remove('hidden');
    ratingInfoEl.classList.remove('hidden');
    summaryEl.classList.add('hidden'); // Always hide summary for print/save
    
    if (isBlankForm) {
        userInfoEl.innerHTML = `<dl><div><dt>Name:</dt><dd class="blank-field"></dd></div><div><dt>Email:</dt><dd class="blank-field"></dd></div><div><dt>Cohort:</dt><dd class="blank-field"></dd></div><div><dt>Company:</dt><dd class="blank-field"></dd></div></dl>`;
        compDetailsEl.innerHTML = '';
        
        const categoryOrder = ["General Competencies", "Demonstrate Safe Work Practices", "Quality Control", "Knives and Chippers", "Circular Saws", "Band Saws", "Mill Machine Set-Up"];
         Object.keys(competenciesData).forEach(cat => { if (!categoryOrder.includes(cat)) categoryOrder.push(cat); });

        categoryOrder.forEach(category => {
            if (competenciesData[category]) {
                let tbodyHtml = '';
                competenciesData[category].forEach(comp => {
                    tbodyHtml += `<tr><td class="task">${comp.text}</td><td class="mentor-rating-blank"></td><td class="date-blank"></td><td class="signature-blank"></td></tr>`;
                });
                compDetailsEl.innerHTML += `<div class="report-category-section">
                    <h4 class="report-category-title">${category}</h4>
                    <table class="report-table">
                        <thead><tr><th class="task">Task</th><th class="mentor-rating-blank">Mentor Rate</th><th class="date-blank">Date</th><th class="signature-blank">Validated By (Sign)</th></tr></thead>
                        <tbody>${tbodyHtml}</tbody>
                    </table>
                </div>`;
            }
        });

    } else { // For Progress Report
        userInfoEl.innerHTML = `<dl><div><dt>Name:</dt><dd>${currentUser.fullName}</dd></div><div><dt>Email:</dt><dd>${currentUser.email}</dd></div><div><dt>Cohort:</dt><dd>${currentUser.cohort || 'N/A'}</dd></div><div><dt>Company:</dt><dd>${currentUser.company || 'N/A'}</dd></div></dl>`;
        compDetailsEl.innerHTML = '<p class="text-center p-4">Generating... Fetching signatures...</p>';
    
        const signaturePromises = [];
        const reportData = [];
        
        Object.values(competenciesData).flat().forEach(comp => {
            const progress = comp.progress;
            const rating = (progress && typeof progress.rating === 'number') ? progress.rating : null;
            const dateISO = progress?.dateValidatedStr || null;
            const progressId = progress?.progressId || `${currentUser.email}_${comp.id}`;

            let sigPromise = Promise.resolve(null);
            if (rating !== null && dateISO) {
                sigPromise = apiCall(`/progress/${progressId}/signature`)
                    .then(r => r.signature || null)
                    .catch(() => null);
            }
            signaturePromises.push(sigPromise);
            reportData.push({ comp, rating, dateISO });
        });

        try {
            const signatures = await Promise.all(signaturePromises);
            compDetailsEl.innerHTML = '';

            const categoryHtmlMap = {};
            reportData.forEach((item, index) => {
                const { comp, rating, dateISO } = item;
                const dateFormatted = dateISO ? new Date(dateISO).toLocaleDateString() : '';
                const signatureData = signatures[index];
                let signatureContent = '';
                if (signatureData) {
                    signatureContent = `<img src="${signatureData}" alt="Signature" style="max-height: 30px; max-width: 100px;">`;
                } else if (rating !== null) {
                    signatureContent = `<span style="font-style: italic; color: #555;">[Validated]</span>`;
                }

                const trHtml = `<tr>
                    <td class="task">${comp.text}</td>
                    <td class="mentor-rating">${rating ?? ''}</td>
                    <td class="date">${dateFormatted}</td>
                    <td class="signature">${signatureContent}</td>
                </tr>`;
                if (!categoryHtmlMap[comp.category]) categoryHtmlMap[comp.category] = '';
                categoryHtmlMap[comp.category] += trHtml;
            });

            const categoryOrder = ["General Competencies", "Demonstrate Safe Work Practices", "Quality Control", "Knives and Chippers", "Circular Saws", "Band Saws", "Mill Machine Set-Up"];
             Object.keys(competenciesData).forEach(cat => { if (!categoryOrder.includes(cat)) categoryOrder.push(cat); });

            categoryOrder.forEach(category => {
                if (categoryHtmlMap[category]) {
                    compDetailsEl.innerHTML += `<div class="report-category-section">
                        <h4 class="report-category-title">${category}</h4>
                        <table class="report-table">
                            <thead><tr><th class="task">Task</th><th class="mentor-rating">Mentor Rate</th><th class="date">Date</th><th class="signature">Validated By</th></tr></thead>
                            <tbody>${categoryHtmlMap[category]}</tbody>
                        </table>
                    </div>`;
                }
            });
        } catch (error) {
            console.error("Error generating report:", error);
            showError("Failed to generate report. Could not fetch signatures.");
            hideLoading();
            return null;
        }
    }
    hideLoading();
    return reportContainer;
}

async function handlePrintReport(isBlankForm = false) {
    const reportElement = await generateReportElement(isBlankForm);
    if (reportElement) {
        const tempReportView = document.createElement('div');
        tempReportView.innerHTML = reportElement.innerHTML;
        tempReportView.classList.add('hidden');
        document.body.appendChild(tempReportView);
        
        reportViewEl.innerHTML = tempReportView.innerHTML;
        reportViewEl.classList.remove('hidden');

        setTimeout(() => {
            window.print();
            reportViewEl.classList.add('hidden');
            tempReportView.remove();
        }, 300);
    }
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('footer-year').textContent = new Date().getFullYear();
    showView('login-view');
    updateUserInfo();

    // Main navigation
    showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); showView('register-view'); });
    showForgotPasswordLink.addEventListener('click', (e) => { e.preventDefault(); showView('forgot-password-view'); });
    backToLoginLinkReg.addEventListener('click', (e) => { e.preventDefault(); showView('login-view'); });
    backToLoginLinkForgot.addEventListener('click', (e) => { e.preventDefault(); showView('login-view'); });
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    logoutButton.addEventListener('click', handleLogout);
    
    // Dashboard buttons
    printReportButton.addEventListener('click', () => handlePrintReport(false));
    printBlankReportButton.addEventListener('click', () => handlePrintReport(true));

    // --- ROBUST EVENT LISTENERS USING EVENT DELEGATION ---
    
    // Main competency modal
    competencyDetailModal.addEventListener('click', (e) => {
        const target = e.target;
        if (target.closest('#close-detail-modal-button') || target === competencyDetailModal) {
            hideCompetencyDetailModal();
        } else if (target.closest('#ready-for-mentor-button')) {
            handleReadyForMentor();
        } else if (target.closest('#mentor-proceed-to-review-button')) {
            proceedToMentorReview();
        } else if (target.closest('#mentor-clear-signature-button')) {
            mentorSignaturePad?.clear();
        } else if (target.closest('#mentor-submit-button')) {
            handleFinalSubmission();
        } else if (target.closest('#mentor-cancel-button') || target.closest('#reviewed-close-button')) {
            hideCompetencyDetailModal();
        } else if (target.closest('#edit-validation-button')) {
            enterEditMode();
        }
    });
    selfRatingOptions.addEventListener('change', handleSelfRatingChange);

    // Filter and Search Listeners
    document.getElementById('search-input').addEventListener('input', (e) => {
        currentSearchTerm = e.target.value;
        applyFilters();
    });
    document.getElementById('filter-buttons').addEventListener('click', (e) => {
        const button = e.target.closest('.filter-btn');
        if (button) {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            activeFilter = button.dataset.filter;
            applyFilters();
        }
    });
});