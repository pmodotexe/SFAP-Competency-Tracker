// Admin Panel JavaScript
let currentUser = null;
let allUsers = [];
let allProgress = [];
let admins = [];

// Admin emails - these users have admin privileges
const ADMIN_EMAILS = [
    'paolomorales@reliabilitysolutions.net',
    'jeremysymonds@reliabilitysolutions.net'
];

// Initialize admin panel
document.addEventListener('DOMContentLoaded', async () => {
    await checkAdminAuth();
    setupEventListeners();
    await loadInitialData();
});

// Check if user is authenticated and has admin privileges
async function checkAdminAuth() {
    try {
        const response = await fetch('/api/user', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            window.location.href = '/';
            return;
        }
        
        currentUser = await response.json();
        
        // Check if user is admin
        if (!isAdmin(currentUser.email)) {
            showError('Access denied. Admin privileges required.');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
            return;
        }
        
        document.getElementById('admin-user-name').textContent = currentUser.fullName;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/';
    }
}

// Check if email has admin privileges
function isAdmin(email) {
    return ADMIN_EMAILS.includes(email) || admins.some(admin => admin.email === email);
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            switchTab(tabName);
        });
    });
    
    // Header buttons
    document.getElementById('switch-to-apprentice').addEventListener('click', () => {
        window.location.href = '/';
    });
    
    document.getElementById('admin-logout').addEventListener('click', async () => {
        await fetch('/api/logout', { method: 'POST', credentials: 'include' });
        window.location.href = '/';
    });
    
    // User management
    document.getElementById('add-user-btn').addEventListener('click', () => openUserModal());
    document.getElementById('user-search').addEventListener('input', filterUsers);
    document.getElementById('company-filter').addEventListener('change', filterUsers);
    document.getElementById('cohort-filter').addEventListener('change', filterUsers);
    
    // Admin management
    document.getElementById('add-admin-btn').addEventListener('click', () => openAdminModal());
    
    // Export buttons
    document.getElementById('export-users-btn').addEventListener('click', exportUsers);
    document.getElementById('export-progress-btn').addEventListener('click', exportProgress);
    document.getElementById('export-by-company-btn').addEventListener('click', exportByCompany);
    document.getElementById('generate-custom-report').addEventListener('click', generateCustomReport);
    
    // Report type change handler
    document.getElementById('report-type').addEventListener('change', handleReportTypeChange);
    
    // Modal handlers
    document.getElementById('cancel-user-modal').addEventListener('click', closeUserModal);
    document.getElementById('cancel-admin-modal').addEventListener('click', closeAdminModal);
    document.getElementById('user-form').addEventListener('submit', handleUserSubmit);
    document.getElementById('admin-form').addEventListener('submit', handleAdminSubmit);
    
    // Event delegation for dynamically created buttons
    setupTableEventDelegation();
}

// Setup event delegation for table buttons
function setupTableEventDelegation() {
    // Users table event delegation
    document.getElementById('users-table-body').addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        
        const email = button.dataset.email;
        const action = button.dataset.action;
        
        switch(action) {
            case 'edit':
                editUser(email);
                break;
            case 'report':
                generateUserReport(email);
                break;
            case 'reset-password':
                resetPassword(email);
                break;
            case 'delete':
                deleteUser(email);
                break;
        }
    });
    
    // Progress table event delegation
    document.getElementById('progress-table-body').addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        
        const email = button.dataset.email;
        const action = button.dataset.action;
        
        if (action === 'view-progress') {
            viewUserProgress(email);
        }
    });
    
    // Admins table event delegation
    document.getElementById('admins-table-body').addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        
        const email = button.dataset.email;
        const action = button.dataset.action;
        
        if (action === 'remove-admin') {
            removeAdmin(email);
        }
    });
}

// Switch between tabs
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Show/hide content
    document.querySelectorAll('.admin-content').forEach(content => {
        content.classList.add('hidden');
    });
    document.getElementById(`${tabName}-tab`).classList.remove('hidden');
    
    // Load tab-specific data
    switch(tabName) {
        case 'users':
            loadUsers();
            break;
        case 'progress':
            loadProgressOverview();
            break;
        case 'admins':
            loadAdmins();
            break;
    }
}

// Load initial data
async function loadInitialData() {
    await loadUsers();
    await loadAdmins();
    populateFilters();
}

// Load all users
async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users', {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to load users');
        
        allUsers = await response.json();
        displayUsers(allUsers);
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Failed to load users');
    }
}

// Display users in table
function displayUsers(users) {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.firstName} ${user.lastName}</td>
            <td>${user.email}</td>
            <td>${user.company || 'N/A'}</td>
            <td>${user.cohort || 'N/A'}</td>
            <td>${user.role || 'Apprentice'}</td>
            <td>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-blue-600 h-2 rounded-full" style="width: ${user.progressPercentage || 0}%"></div>
                </div>
                <span class="text-sm text-gray-600">${user.progressPercentage || 0}%</span>
            </td>
            <td>
                <div class="flex flex-wrap gap-1">
                    <button data-email="${user.email}" data-action="edit" class="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 border rounded">Edit</button>
                    <button data-email="${user.email}" data-action="report" class="text-green-600 hover:text-green-800 text-sm px-2 py-1 border rounded">Report</button>
                    <button data-email="${user.email}" data-action="reset-password" class="text-yellow-600 hover:text-yellow-800 text-sm px-2 py-1 border rounded">Reset Pwd</button>
                    <button data-email="${user.email}" data-action="delete" class="text-red-600 hover:text-red-800 text-sm px-2 py-1 border rounded">Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Filter users
function filterUsers() {
    const search = document.getElementById('user-search').value.toLowerCase();
    const companyFilter = document.getElementById('company-filter').value;
    const cohortFilter = document.getElementById('cohort-filter').value;
    
    const filtered = allUsers.filter(user => {
        const matchesSearch = !search || 
            user.firstName.toLowerCase().includes(search) ||
            user.lastName.toLowerCase().includes(search) ||
            user.email.toLowerCase().includes(search);
        
        const matchesCompany = !companyFilter || user.company === companyFilter;
        const matchesCohort = !cohortFilter || user.cohort === cohortFilter;
        
        return matchesSearch && matchesCompany && matchesCohort;
    });
    
    displayUsers(filtered);
}

// Populate filter dropdowns
function populateFilters() {
    const companies = [...new Set(allUsers.map(u => u.company).filter(Boolean))];
    const cohorts = [...new Set(allUsers.map(u => u.cohort).filter(Boolean))];
    
    const companyFilter = document.getElementById('company-filter');
    const cohortFilter = document.getElementById('cohort-filter');
    
    companyFilter.innerHTML = '<option value="">All Companies</option>';
    companies.forEach(company => {
        companyFilter.innerHTML += `<option value="${company}">${company}</option>`;
    });
    
    cohortFilter.innerHTML = '<option value="">All Cohorts</option>';
    cohorts.forEach(cohort => {
        cohortFilter.innerHTML += `<option value="${cohort}">${cohort}</option>`;
    });
}

// Load progress overview
async function loadProgressOverview() {
    try {
        const response = await fetch('/api/admin/progress-overview', {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to load progress overview');
        
        const data = await response.json();
        
        // Update stats
        document.getElementById('total-users').textContent = data.totalUsers;
        document.getElementById('completed-competencies').textContent = data.completedCompetencies;
        document.getElementById('in-progress-competencies').textContent = data.inProgressCompetencies;
        document.getElementById('not-started-competencies').textContent = data.notStartedCompetencies;
        
        // Display detailed progress
        displayProgressTable(data.userProgress);
    } catch (error) {
        console.error('Error loading progress overview:', error);
        showError('Failed to load progress overview');
    }
}

// Display progress table
function displayProgressTable(userProgress) {
    const tbody = document.getElementById('progress-table-body');
    tbody.innerHTML = '';
    
    userProgress.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.firstName} ${user.lastName}</td>
            <td>${user.company || 'N/A'}</td>
            <td class="text-green-600 font-semibold">${user.completed}</td>
            <td class="text-yellow-600 font-semibold">${user.inProgress}</td>
            <td class="text-red-600 font-semibold">${user.notStarted}</td>
            <td>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-blue-600 h-2 rounded-full" style="width: ${user.progressPercentage}%"></div>
                </div>
                <span class="text-sm text-gray-600">${user.progressPercentage}%</span>
            </td>
            <td>
                <button data-email="${user.email}" data-action="view-progress" class="text-blue-600 hover:text-blue-800">
                    View Details
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Load admins
async function loadAdmins() {
    try {
        const response = await fetch('/api/admin/admins', {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to load admins');
        
        admins = await response.json();
        displayAdmins();
    } catch (error) {
        console.error('Error loading admins:', error);
        showError('Failed to load admins');
    }
}

// Display admins
function displayAdmins() {
    const tbody = document.getElementById('admins-table-body');
    tbody.innerHTML = '';
    
    // Show built-in admins
    ADMIN_EMAILS.forEach(email => {
        const user = allUsers.find(u => u.email === email);
        if (user) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.firstName} ${user.lastName}</td>
                <td>${email}</td>
                <td>Built-in Admin</td>
                <td>
                    <span class="text-gray-500">Cannot remove</span>
                </td>
            `;
            tbody.appendChild(row);
        }
    });
    
    // Show added admins
    admins.forEach(admin => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${admin.firstName} ${admin.lastName}</td>
            <td>${admin.email}</td>
            <td>${new Date(admin.createdAt).toLocaleDateString()}</td>
            <td>
                <button data-email="${admin.email}" data-action="remove-admin" class="text-red-600 hover:text-red-800">
                    Remove
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// User management functions
function openUserModal(userEmail = null) {
    const modal = document.getElementById('user-modal');
    const title = document.getElementById('user-modal-title');
    const form = document.getElementById('user-form');
    
    if (userEmail) {
        const user = allUsers.find(u => u.email === userEmail);
        title.textContent = 'Edit User';
        document.getElementById('user-first-name').value = user.firstName;
        document.getElementById('user-last-name').value = user.lastName;
        document.getElementById('user-email').value = user.email;
        document.getElementById('user-company').value = user.company || '';
        document.getElementById('user-cohort').value = user.cohort || '';
        document.getElementById('user-role').value = user.role || 'Apprentice';
        form.dataset.userEmail = userEmail;
    } else {
        title.textContent = 'Add New User';
        form.reset();
        delete form.dataset.userEmail;
    }
    
    modal.classList.remove('hidden');
}

function closeUserModal() {
    document.getElementById('user-modal').classList.add('hidden');
}

function openAdminModal() {
    document.getElementById('admin-modal').classList.remove('hidden');
}

function closeAdminModal() {
    document.getElementById('admin-modal').classList.add('hidden');
    document.getElementById('admin-form').reset();
}

// Handle user form submission
async function handleUserSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const isEdit = !!form.dataset.userEmail;
    
    const userData = {
        firstName: document.getElementById('user-first-name').value,
        lastName: document.getElementById('user-last-name').value,
        email: document.getElementById('user-email').value,
        company: document.getElementById('user-company').value,
        cohort: document.getElementById('user-cohort').value,
        role: document.getElementById('user-role').value
    };
    
    try {
        const url = isEdit ? `/api/admin/users/${form.dataset.userEmail}` : '/api/admin/users';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(userData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save user');
        }
        
        showSuccess(isEdit ? 'User updated successfully' : 'User created successfully');
        closeUserModal();
        await loadUsers();
        populateFilters();
    } catch (error) {
        console.error('Error saving user:', error);
        showError(error.message);
    }
}

// Handle admin form submission
async function handleAdminSubmit(e) {
    e.preventDefault();
    
    const email = document.getElementById('admin-email').value;
    
    try {
        const response = await fetch('/api/admin/admins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to add admin');
        }
        
        showSuccess('Admin added successfully');
        closeAdminModal();
        await loadAdmins();
    } catch (error) {
        console.error('Error adding admin:', error);
        showError(error.message);
    }
}

// Admin action functions - Define them globally
function editUser(email) {
    console.log('Edit user clicked:', email);
    openUserModal(email);
}

function viewUserProgress(email) {
    console.log('View progress clicked:', email);
    // Redirect to user progress view
    window.open(`/user-progress.html?email=${encodeURIComponent(email)}`, '_blank');
}

async function resetPassword(email) {
    console.log('Reset password clicked:', email);
    if (!confirm(`Reset password for ${email}?`)) return;
    
    try {
        const response = await fetch(`/api/admin/users/${email}/reset-password`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to reset password');
        
        const result = await response.json();
        showSuccess(`Password reset. New password: ${result.newPassword}`);
    } catch (error) {
        console.error('Error resetting password:', error);
        showError('Failed to reset password');
    }
}

async function deleteUser(email) {
    console.log('Delete user clicked:', email);
    if (!confirm(`Delete user ${email}? This action cannot be undone.`)) return;
    
    try {
        const response = await fetch(`/api/admin/users/${email}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to delete user');
        
        showSuccess('User deleted successfully');
        await loadUsers();
        populateFilters();
    } catch (error) {
        console.error('Error deleting user:', error);
        showError('Failed to delete user');
    }
}

async function removeAdmin(email) {
    console.log('Remove admin clicked:', email);
    if (!confirm(`Remove admin privileges for ${email}?`)) return;
    
    try {
        const response = await fetch(`/api/admin/admins/${email}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to remove admin');
        
        showSuccess('Admin removed successfully');
        await loadAdmins();
    } catch (error) {
        console.error('Error removing admin:', error);
        showError('Failed to remove admin');
    }
}

// Also attach to window object for compatibility
window.editUser = editUser;
window.viewUserProgress = viewUserProgress;
window.resetPassword = resetPassword;
window.deleteUser = deleteUser;
window.removeAdmin = removeAdmin;

// Export functions
async function exportUsers() {
    try {
        const response = await fetch('/api/admin/export/users', {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to export users');
        
        const blob = await response.blob();
        downloadFile(blob, 'users-export.csv');
    } catch (error) {
        console.error('Error exporting users:', error);
        showError('Failed to export users');
    }
}

async function exportProgress() {
    try {
        const response = await fetch('/api/admin/export/progress', {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to export progress');
        
        const blob = await response.blob();
        downloadFile(blob, 'progress-export.csv');
    } catch (error) {
        console.error('Error exporting progress:', error);
        showError('Failed to export progress');
    }
}

// Utility functions
function downloadFile(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

function showSuccess(message) {
    Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: "#10b981",
    }).showToast();
}

function showError(message) {
    Toastify({
        text: message,
        duration: 5000,
        gravity: "top",
        position: "right",
        backgroundColor: "#ef4444",
    }).showToast();
}
// Custom reporting functions
function handleReportTypeChange() {
    const reportType = document.getElementById('report-type').value;
    
    // Hide all select divs
    document.getElementById('user-select-div').classList.add('hidden');
    document.getElementById('cohort-select-div').classList.add('hidden');
    document.getElementById('company-select-div').classList.add('hidden');
    
    // Show relevant select div and populate options
    switch(reportType) {
        case 'individual':
            document.getElementById('user-select-div').classList.remove('hidden');
            populateUserSelect();
            break;
        case 'cohort':
            document.getElementById('cohort-select-div').classList.remove('hidden');
            populateCohortSelect();
            break;
        case 'company':
            document.getElementById('company-select-div').classList.remove('hidden');
            populateCompanySelect();
            break;
    }
}

function populateUserSelect() {
    const userSelect = document.getElementById('user-select');
    userSelect.innerHTML = '<option value="">Choose a user...</option>';
    
    allUsers.forEach(user => {
        const option = document.createElement('option');
        option.value = user.email;
        option.textContent = `${user.firstName} ${user.lastName} (${user.email})`;
        userSelect.appendChild(option);
    });
}

function populateCohortSelect() {
    const cohortSelect = document.getElementById('cohort-select');
    const cohorts = [...new Set(allUsers.map(u => u.cohort).filter(Boolean))];
    
    cohortSelect.innerHTML = '<option value="">Choose a cohort...</option>';
    cohorts.forEach(cohort => {
        const option = document.createElement('option');
        option.value = cohort;
        option.textContent = cohort;
        cohortSelect.appendChild(option);
    });
}

function populateCompanySelect() {
    const companySelect = document.getElementById('company-select');
    const companies = [...new Set(allUsers.map(u => u.company).filter(Boolean))];
    
    companySelect.innerHTML = '<option value="">Choose a company...</option>';
    companies.forEach(company => {
        const option = document.createElement('option');
        option.value = company;
        option.textContent = company;
        companySelect.appendChild(option);
    });
}

async function generateCustomReport() {
    const reportType = document.getElementById('report-type').value;
    const reportFormat = document.getElementById('report-format').value;
    
    let filterValue = '';
    let filterType = reportType;
    
    switch(reportType) {
        case 'individual':
            filterValue = document.getElementById('user-select').value;
            if (!filterValue) {
                showError('Please select a user');
                return;
            }
            break;
        case 'cohort':
            filterValue = document.getElementById('cohort-select').value;
            if (!filterValue) {
                showError('Please select a cohort');
                return;
            }
            break;
        case 'company':
            filterValue = document.getElementById('company-select').value;
            if (!filterValue) {
                showError('Please select a company');
                return;
            }
            break;
        case 'all':
            filterValue = 'all';
            break;
    }
    
    try {
        const response = await fetch(`/api/admin/custom-report?type=${filterType}&value=${encodeURIComponent(filterValue)}&format=${reportFormat}`, {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to generate custom report');
        
        const blob = await response.blob();
        const filename = `${reportType}-${filterValue || 'all'}-${reportFormat}-report.csv`;
        downloadFile(blob, filename);
        
        showSuccess('Custom report generated successfully');
    } catch (error) {
        console.error('Error generating custom report:', error);
        showError('Failed to generate custom report');
    }
}

async function generateUserReport(email) {
    try {
        const response = await fetch(`/api/admin/custom-report?type=individual&value=${encodeURIComponent(email)}&format=detailed`, {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to generate user report');
        
        const blob = await response.blob();
        const user = allUsers.find(u => u.email === email);
        const filename = `${user?.firstName || 'user'}-${user?.lastName || 'report'}-detailed.csv`;
        downloadFile(blob, filename);
        
        showSuccess('User report generated successfully');
    } catch (error) {
        console.error('Error generating user report:', error);
        showError('Failed to generate user report');
    }
}

async function exportByCompany() {
    try {
        const response = await fetch('/api/admin/export/by-company', {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to export by company');
        
        const blob = await response.blob();
        downloadFile(blob, 'company-breakdown-report.csv');
        
        showSuccess('Company report exported successfully');
    } catch (error) {
        console.error('Error exporting by company:', error);
        showError('Failed to export company report');
    }
}

// Make sure generateUserReport is also globally accessible
function generateUserReport(email) {
    console.log('Generate user report clicked:', email);
    try {
        const response = fetch(`/api/admin/custom-report?type=individual&value=${encodeURIComponent(email)}&format=detailed`, {
            credentials: 'include'
        }).then(response => {
            if (!response.ok) throw new Error('Failed to generate user report');
            return response.blob();
        }).then(blob => {
            const user = allUsers.find(u => u.email === email);
            const filename = `${user?.firstName || 'user'}-${user?.lastName || 'report'}-detailed.csv`;
            downloadFile(blob, filename);
            showSuccess('User report generated successfully');
        }).catch(error => {
            console.error('Error generating user report:', error);
            showError('Failed to generate user report');
        });
    } catch (error) {
        console.error('Error generating user report:', error);
        showError('Failed to generate user report');
    }
}

// Attach all functions to window object
window.generateUserReport = generateUserReport;