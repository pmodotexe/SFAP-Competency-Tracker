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
    
    // Modal handlers
    document.getElementById('cancel-user-modal').addEventListener('click', closeUserModal);
    document.getElementById('cancel-admin-modal').addEventListener('click', closeAdminModal);
    document.getElementById('user-form').addEventListener('submit', handleUserSubmit);
    document.getElementById('admin-form').addEventListener('submit', handleAdminSubmit);
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
                <div class="flex space-x-2">
                    <button onclick="editUser('${user.email}')" class="text-blue-600 hover:text-blue-800">Edit</button>
                    <button onclick="viewUserProgress('${user.email}')" class="text-green-600 hover:text-green-800">Progress</button>
                    <button onclick="resetPassword('${user.email}')" class="text-yellow-600 hover:text-yellow-800">Reset Password</button>
                    <button onclick="deleteUser('${user.email}')" class="text-red-600 hover:text-red-800">Delete</button>
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
                <button onclick="viewUserProgress('${user.email}')" class="text-blue-600 hover:text-blue-800">
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
                <button onclick="removeAdmin('${admin.email}')" class="text-red-600 hover:text-red-800">
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

// Admin action functions
window.editUser = function(email) {
    openUserModal(email);
};

window.viewUserProgress = function(email) {
    // Redirect to user progress view
    window.open(`/user-progress.html?email=${encodeURIComponent(email)}`, '_blank');
};

window.resetPassword = async function(email) {
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
};

window.deleteUser = async function(email) {
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
};

window.removeAdmin = async function(email) {
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
};

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