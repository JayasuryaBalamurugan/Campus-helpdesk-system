// Campus Helpdesk System - Frontend Application Logic
const API_BASE_URL = 'http://localhost:8080';
// Application State
let currentUser = null;
let tickets = [];
let activeTicket = null;
let agentsList = [];

// DOM Elements
const authPage = document.getElementById('auth-page');
const mainDashboard = document.getElementById('main-dashboard');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const toRegisterLink = document.getElementById('to-register');
const toLoginLink = document.getElementById('to-login');
const logoutBtn = document.getElementById('logout-btn');

// User Profile summary elements
const userAvatarInitials = document.getElementById('user-avatar-initials');
const userDisplayName = document.getElementById('user-display-name');
const userDisplayRole = document.getElementById('user-display-role');

// Dashboard Info
const statTotal = document.getElementById('stat-total');
const statOpen = document.getElementById('stat-open');
const statPending = document.getElementById('stat-pending');
const statResolved = document.getElementById('stat-resolved');
const ticketsListBody = document.getElementById('tickets-list-body');
const openCreateModalBtn = document.getElementById('open-create-modal-btn');
const navCreateTicketBtn = document.getElementById('nav-create-ticket-btn');

// Filters
const filterSearch = document.getElementById('filter-search');
const filterCategory = document.getElementById('filter-category');
const filterStatus = document.getElementById('filter-status');
const filterPriority = document.getElementById('filter-priority');

// Create Ticket Modal
const createTicketOverlay = document.getElementById('create-ticket-overlay');
const closeCreateModalBtn = document.getElementById('close-create-modal');
const cancelCreateBtn = document.getElementById('cancel-create-btn');
const createTicketForm = document.getElementById('create-ticket-form');

// Ticket Detail Panel
const ticketDetailOverlay = document.getElementById('ticket-detail-overlay');
const closeDetailBtn = document.getElementById('close-detail-btn');
const detailTicketId = document.getElementById('detail-ticket-id');
const detailTicketTitle = document.getElementById('detail-ticket-title');
const detailCategory = document.getElementById('detail-category');
const detailCreatorAvatar = document.getElementById('detail-creator-avatar');
const detailCreatorName = document.getElementById('detail-creator-name');
const detailCreatorDept = document.getElementById('detail-creator-dept');
const detailCreatedAt = document.getElementById('detail-created-at');
const detailDescription = document.getElementById('detail-description');
const commentsTimeline = document.getElementById('comments-timeline');
const commentForm = document.getElementById('comment-form');
const commentContentInput = document.getElementById('comment-content');

// Dynamic Action sections in Detail View
const agentOnlyActions = document.querySelectorAll('.agent-only-action');
const studentOnlyActions = document.querySelectorAll('.student-only-action');
const detailStatusDropdown = document.getElementById('detail-status');
const detailPriorityDropdown = document.getElementById('detail-priority');
const detailAssigneeDropdown = document.getElementById('detail-assignee');
const detailStatusBadge = document.getElementById('detail-status-badge');
const detailAssigneeText = document.getElementById('detail-assignee-text');
const studentCloseBtn = document.getElementById('student-close-btn');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    checkCurrentSession();
    setupEventListeners();
});

// Event Listeners Configuration
function setupEventListeners() {
    // Auth navigation
    toRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        showAuthForm('register');
    });
    toLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        showAuthForm('login');
    });

    // Form Submissions
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    logoutBtn.addEventListener('click', handleLogout);
    createTicketForm.addEventListener('submit', handleCreateTicket);
    commentForm.addEventListener('submit', handleAddComment);

    // Modal Triggers
    openCreateModalBtn.addEventListener('click', openCreateModal);
    navCreateTicketBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openCreateModal();
    });
    closeCreateModalBtn.addEventListener('click', closeCreateModal);
    cancelCreateBtn.addEventListener('click', closeCreateModal);
    closeDetailBtn.addEventListener('click', closeDetailModal);

    // Click outside overlay to close modal
    createTicketOverlay.addEventListener('click', (e) => {
        if (e.target === createTicketOverlay) closeCreateModal();
    });
    ticketDetailOverlay.addEventListener('click', (e) => {
        if (e.target === ticketDetailOverlay) closeDetailModal();
    });

    // Ticket List Filters
    filterSearch.addEventListener('keyup', applyFilters);
    filterCategory.addEventListener('change', applyFilters);
    filterStatus.addEventListener('change', applyFilters);
    filterPriority.addEventListener('change', applyFilters);

    // Instant Save Dropdowns in Ticket Detail (for Agents)
    detailStatusDropdown.addEventListener('change', updateActiveTicketStatus);
    detailPriorityDropdown.addEventListener('change', updateActiveTicketPriority);
    detailAssigneeDropdown.addEventListener('change', updateActiveTicketAssignment);
    
    // Close ticket for student
    studentCloseBtn.addEventListener('click', () => {
        if (activeTicket) {
            updateTicketStatusAPI(activeTicket.id, 'CLOSED');
        }
    });
}

// Navigation & Screen Updates
function showPage(pageId) {
    if (pageId === 'auth') {
        mainDashboard.classList.remove('active');
        mainDashboard.style.display = 'none';
        authPage.style.display = 'flex';
        setTimeout(() => authPage.classList.add('active'), 50);
    } else {
        authPage.classList.remove('active');
        authPage.style.display = 'none';
        mainDashboard.style.display = 'flex';
        setTimeout(() => mainDashboard.classList.add('active'), 50);
    }
}

function showAuthForm(type) {
    const authHeaderTitle = document.querySelector('.auth-header h2');
    const authHeaderSub = document.querySelector('.auth-header p');

    if (type === 'register') {
        loginForm.classList.remove('active');
        loginForm.style.display = 'none';
        registerForm.style.display = 'flex';
        setTimeout(() => registerForm.classList.add('active'), 50);
        authHeaderTitle.textContent = 'Create Account';
        authHeaderSub.textContent = 'Join our campus support portal today';
    } else {
        registerForm.classList.remove('active');
        registerForm.style.display = 'none';
        loginForm.style.display = 'flex';
        setTimeout(() => loginForm.classList.add('active'), 50);
        authHeaderTitle.textContent = 'Welcome Back';
        authHeaderSub.textContent = 'Login or register to manage support tickets';
    }
}

// UI Helpers (Toast Notifications)
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconClass = 'fa-circle-info';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-circle-exclamation';

    const icon = document.createElement('i');
    icon.className = `fa-solid ${iconClass}`;

    const msgDiv = document.createElement('div');
    msgDiv.className = 'toast-message';
    msgDiv.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(msgDiv);
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 2800);
}

// Generic Fetch Wrapper with Auth Check
async function makeRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (response.status === 401) {
            if (currentUser) {
                currentUser = null;
                showPage('auth');
                showToast('Session expired. Please login again.', 'error');
            }
            throw new Error('Unauthorized');
        }

        const text = await response.text();
        let data = {};
        if (text) {
            try {
                data = JSON.parse(text);
            } catch (_) {
                if (!response.ok) {
                    throw new Error(`Server error: ${response.status} ${response.statusText}`);
                }
            }
        }
        if (!response.ok) {
            throw new Error(data.message || data.error || `Server error (${response.status})`);
        }
        return data;
    } catch (err) {
        if (err.message !== 'Unauthorized') {
            console.error('Request Error:', err);
        }
        throw err;
    }
}

// Auth Handlers
async function checkCurrentSession() {
    try {
        const user = await makeRequest(`${API_BASE_URL}/api/auth/me`);
        onLoginSuccess(user);
    } catch (err) {
        showPage('auth');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const loginBtn = document.getElementById('login-btn');
    loginBtn.disabled = true;
    
    loginBtn.textContent = '';
    const spinner = document.createElement('i');
    spinner.className = 'fa-solid fa-spinner fa-spin';
    loginBtn.appendChild(spinner);
    loginBtn.appendChild(document.createTextNode(' Authenticating...'));

    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const user = await makeRequest(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        showToast(`Welcome back, ${user.fullName}!`, 'success');
        onLoginSuccess(user);
    } catch (err) {
        showToast(err.message || 'Login failed. Check credentials.', 'error');
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = '';
        const span = document.createElement('span');
        span.textContent = 'Sign In';
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-arrow-right-to-bracket';
        loginBtn.appendChild(span);
        loginBtn.appendChild(document.createTextNode(' '));
        loginBtn.appendChild(icon);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const registerBtn = document.getElementById('register-btn');
    registerBtn.disabled = true;

    registerBtn.textContent = '';
    const spinner = document.createElement('i');
    spinner.className = 'fa-solid fa-spinner fa-spin';
    registerBtn.appendChild(spinner);
    registerBtn.appendChild(document.createTextNode(' Registering...'));

    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const fullName = document.getElementById('reg-fullname').value;
    const role = document.getElementById('reg-role').value;
    const password = document.getElementById('reg-password').value;
    const department = document.getElementById('reg-dept').value;

    try {
        await makeRequest(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            body: JSON.stringify({ username, password, email, role, fullName, department })
        });
        showToast('Registration successful! Please login.', 'success');
        loginForm.reset();
        registerForm.reset();
        document.getElementById('login-username').value = username;
        showAuthForm('login');
    } catch (err) {
        showToast(err.message || 'Registration failed.', 'error');
    } finally {
        registerBtn.disabled = false;
        registerBtn.textContent = '';
        const span = document.createElement('span');
        span.textContent = 'Create Account';
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-user-plus';
        registerBtn.appendChild(span);
        registerBtn.appendChild(document.createTextNode(' '));
        registerBtn.appendChild(icon);
    }
}

async function handleLogout() {
    try {
        await makeRequest(`${API_BASE_URL}/api/auth/logout`, { method: 'POST' });
        currentUser = null;
        tickets = [];
        showToast('Successfully logged out.', 'info');
        loginForm.reset();
        showPage('auth');
    } catch (err) {
        showToast('Error logging out.', 'error');
    }
}

function onLoginSuccess(user) {
    currentUser = user;
    
    userAvatarInitials.textContent = getInitials(user.fullName);
    userDisplayName.textContent = user.fullName;
    userDisplayRole.textContent = formatRole(user.role);

    if (user.role === 'AGENT' || user.role === 'ADMIN') {
        document.getElementById('dashboard-title').textContent = 'Support Queue';
        document.getElementById('dashboard-subtitle').textContent = 'Assign, track, and resolve system issues';
        document.getElementById('open-create-modal-btn').style.display = 'none';
    } else {
        document.getElementById('dashboard-title').textContent = 'Student Desk';
        document.getElementById('dashboard-subtitle').textContent = 'Monitor and update your active requests';
        document.getElementById('open-create-modal-btn').style.display = 'block';
    }

    showPage('dashboard');
    loadDashboardData();
}

// Data Fetching
async function loadDashboardData() {
    try {
        loadStats();
        loadTickets();
        
        if (currentUser.role === 'AGENT' || currentUser.role === 'ADMIN') {
            loadAgentsList();
        }
    } catch (err) {
        console.error('Error loading dashboard:', err);
    }
}

async function loadStats() {
    try {
        const stats = await makeRequest(`${API_BASE_URL}/api/tickets/stats`);
        statTotal.textContent = stats.total;
        statOpen.textContent = stats.open;
        statPending.textContent = stats.inProgress;
        statResolved.textContent = stats.resolved + stats.closed;
    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

async function loadTickets() {
    ticketsListBody.textContent = '';
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 8;
    td.className = 'text-center';
    
    const spinner = document.createElement('i');
    spinner.className = 'fa-solid fa-spinner fa-spin';
    td.appendChild(spinner);
    td.appendChild(document.createTextNode(' Refreshing queue...'));
    tr.appendChild(td);
    ticketsListBody.appendChild(tr);

    try {
        tickets = await makeRequest(`${API_BASE_URL}/api/tickets`);
        renderTickets(tickets);
    } catch (err) {
        ticketsListBody.textContent = '';
        const errTr = document.createElement('tr');
        const errTd = document.createElement('td');
        errTd.colSpan = 8;
        errTd.className = 'text-center text-danger';
        errTd.textContent = 'Failed to load tickets.';
        errTr.appendChild(errTd);
        ticketsListBody.appendChild(errTr);
    }
}

async function loadAgentsList() {
    try {
        agentsList = await makeRequest(`${API_BASE_URL}/api/tickets/agents`);
        populateAgentDropdown(agentsList);
    } catch (err) {
        console.error('Failed to load agent lists:', err);
    }
}

// Rendering Tickets
function renderTickets(ticketsList) {
    ticketsListBody.textContent = '';

    if (ticketsList.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 8;
        td.className = 'text-center text-muted';
        td.textContent = 'No tickets found.';
        tr.appendChild(td);
        ticketsListBody.appendChild(tr);
        return;
    }

    ticketsList.forEach(t => {
        const tr = document.createElement('tr');
        tr.className = 'ticket-row-item';
        
        const createdDate = formatDate(t.createdAt);
        const priorityClass = t.priority.toLowerCase();
        const statusClass = t.status.toLowerCase();

        // 1. ID Cell
        const tdId = document.createElement('td');
        const idBadge = document.createElement('span');
        idBadge.className = 'id-badge';
        idBadge.textContent = `#TKT-${t.id}`;
        tdId.appendChild(idBadge);

        // 2. Title Cell
        const tdTitle = document.createElement('td');
        const cellTitleBox = document.createElement('div');
        cellTitleBox.className = 'ticket-cell-title';
        const h4 = document.createElement('h4');
        h4.textContent = t.title;
        const catDiv = document.createElement('div');
        const catBadge = document.createElement('span');
        catBadge.className = 'category-badge';
        catBadge.textContent = t.category;
        catDiv.appendChild(catBadge);
        cellTitleBox.appendChild(h4);
        cellTitleBox.appendChild(catDiv);
        tdTitle.appendChild(cellTitleBox);

        // 3. Creator Cell
        const tdCreator = document.createElement('td');
        tdCreator.textContent = t.createdBy.fullName;

        // 4. Assignee Cell
        const tdAssignee = document.createElement('td');
        if (t.assignedTo) {
            tdAssignee.textContent = t.assignedTo.fullName;
        } else {
            const muted = document.createElement('span');
            muted.className = 'text-muted';
            muted.textContent = 'Unassigned';
            tdAssignee.appendChild(muted);
        }

        // 5. Priority Cell
        const tdPriority = document.createElement('td');
        const prioSpan = document.createElement('span');
        prioSpan.className = `priority-indicator ${priorityClass}`;
        prioSpan.textContent = t.priority;
        tdPriority.appendChild(prioSpan);

        // 6. Status Cell
        const tdStatus = document.createElement('td');
        const statusSpan = document.createElement('span');
        statusSpan.className = `status-badge ${statusClass}`;
        statusSpan.textContent = formatStatus(t.status);
        tdStatus.appendChild(statusSpan);

        // 7. Date Cell
        const tdDate = document.createElement('td');
        tdDate.textContent = createdDate;

        // 8. Action Cell
        const tdAction = document.createElement('td');
        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn btn-secondary btn-sm btn-view-detail';
        viewBtn.dataset.id = t.id;
        const eyeIcon = document.createElement('i');
        eyeIcon.className = 'fa-regular fa-eye';
        viewBtn.appendChild(eyeIcon);
        viewBtn.appendChild(document.createTextNode(' View'));
        tdAction.appendChild(viewBtn);

        // Append all TDs to TR
        tr.appendChild(tdId);
        tr.appendChild(tdTitle);
        tr.appendChild(tdCreator);
        tr.appendChild(tdAssignee);
        tr.appendChild(tdPriority);
        tr.appendChild(tdStatus);
        tr.appendChild(tdDate);
        tr.appendChild(tdAction);

        // Event Listeners
        tr.addEventListener('click', (e) => {
            if (!e.target.closest('.btn-view-detail')) {
                openTicketDetail(t.id);
            }
        });

        viewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openTicketDetail(t.id);
        });

        ticketsListBody.appendChild(tr);
    });
}

// Filtering Logic
function applyFilters() {
    const query = filterSearch.value.toLowerCase().trim();
    const category = filterCategory.value;
    const status = filterStatus.value;
    const priority = filterPriority.value;

    const filtered = tickets.filter(t => {
        const matchesSearch = t.id.toString().includes(query) || 
                              t.title.toLowerCase().includes(query) ||
                              t.description.toLowerCase().includes(query);
                              
        const matchesCategory = category === 'ALL' || t.category === category;
        const matchesStatus = status === 'ALL' || t.status === status;
        const matchesPriority = priority === 'ALL' || t.priority === priority;

        return matchesSearch && matchesCategory && matchesStatus && matchesPriority;
    });

    renderTickets(filtered);
}

// Create Ticket Modal Handlers
function openCreateModal() {
    createTicketForm.reset();
    createTicketOverlay.style.display = 'flex';
    setTimeout(() => createTicketOverlay.classList.add('active'), 50);
}

function closeCreateModal() {
    createTicketOverlay.classList.remove('active');
    setTimeout(() => createTicketOverlay.style.display = 'none', 300);
}

async function handleCreateTicket(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-ticket-btn');
    submitBtn.disabled = true;

    submitBtn.textContent = '';
    const spinner = document.createElement('i');
    spinner.className = 'fa-solid fa-spinner fa-spin';
    submitBtn.appendChild(spinner);
    submitBtn.appendChild(document.createTextNode(' Submitting...'));

    const title = document.getElementById('ticket-title').value;
    const category = document.getElementById('ticket-category').value;
    const priority = document.getElementById('ticket-priority').value;
    const description = document.getElementById('ticket-description').value;

    try {
        await makeRequest(`${API_BASE_URL}/api/tickets`, {
            method: 'POST',
            body: JSON.stringify({ title, category, priority, description })
        });
        showToast('Ticket submitted successfully!', 'success');
        closeCreateModal();
        loadDashboardData();
    } catch (err) {
        showToast(err.message || 'Failed to submit ticket.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Ticket ';
        const checkIcon = document.createElement('i');
        checkIcon.className = 'fa-solid fa-check';
        submitBtn.appendChild(checkIcon);
    }
}

// Ticket Details Overlays
async function openTicketDetail(ticketId) {
    try {
        const ticket = await makeRequest(`${API_BASE_URL}/api/tickets/${ticketId}`);
        activeTicket = ticket;
        renderTicketDetails(ticket);
        loadComments(ticketId);
        
        ticketDetailOverlay.style.display = 'flex';
        setTimeout(() => ticketDetailOverlay.classList.add('active'), 50);
    } catch (err) {
        showToast('Could not load ticket details.', 'error');
    }
}

function closeDetailModal() {
    ticketDetailOverlay.classList.remove('active');
    setTimeout(() => {
        ticketDetailOverlay.style.display = 'none';
        activeTicket = null;
    }, 300);
}

function renderTicketDetails(ticket) {
    detailTicketId.textContent = `#TKT-${ticket.id}`;
    detailTicketTitle.textContent = ticket.title;
    detailCategory.textContent = ticket.category;
    detailCreatorAvatar.textContent = getInitials(ticket.createdBy.fullName);
    detailCreatorName.textContent = ticket.createdBy.fullName;
    detailCreatorDept.textContent = ticket.createdBy.department || 'General';
    detailCreatedAt.textContent = formatDateDetailed(ticket.createdAt);
    detailDescription.textContent = ticket.description;

    const isAgent = currentUser.role === 'AGENT' || currentUser.role === 'ADMIN';

    if (isAgent) {
        agentOnlyActions.forEach(el => el.style.display = 'flex');
        studentOnlyActions.forEach(el => el.style.display = 'none');

        detailStatusDropdown.value = ticket.status;
        detailPriorityDropdown.value = ticket.priority;
        detailAssigneeDropdown.value = ticket.assignedTo ? ticket.assignedTo.id : '';
    } else {
        agentOnlyActions.forEach(el => el.style.display = 'none');
        studentOnlyActions.forEach(el => el.style.display = 'flex');

        detailStatusBadge.className = `status-badge ${ticket.status.toLowerCase()}`;
        detailStatusBadge.textContent = formatStatus(ticket.status);

        detailAssigneeText.textContent = ticket.assignedTo ? ticket.assignedTo.fullName : 'Unassigned';

        if (ticket.status === 'CLOSED' || ticket.status === 'RESOLVED') {
            studentCloseBtn.style.display = 'none';
        } else {
            studentCloseBtn.style.display = 'block';
        }
    }
}

// Instant Save Handlers (Dropdown triggers)
async function updateActiveTicketStatus() {
    if (!activeTicket) return;
    const status = detailStatusDropdown.value;
    await updateTicketStatusAPI(activeTicket.id, status);
}

async function updateTicketStatusAPI(ticketId, status) {
    try {
        const updated = await makeRequest(`${API_BASE_URL}/api/tickets/${ticketId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
        activeTicket = updated;
        showToast(`Status updated to ${formatStatus(status)}`, 'success');
        
        renderTicketDetails(updated);
        loadDashboardData();
        
        addSystemLogComment(`changed status to "${formatStatus(status)}"`);
    } catch (err) {
        showToast('Failed to update status', 'error');
    }
}

async function updateActiveTicketPriority() {
    if (!activeTicket) return;
    const priority = detailPriorityDropdown.value;
    try {
        const updated = await makeRequest(`${API_BASE_URL}/api/tickets/${activeTicket.id}/priority`, {
            method: 'PATCH',
            body: JSON.stringify({ priority })
        });
        activeTicket = updated;
        showToast(`Priority updated to ${priority}`, 'success');
        renderTicketDetails(updated);
        loadDashboardData();
        addSystemLogComment(`changed priority to "${priority}"`);
    } catch (err) {
        showToast('Failed to update priority', 'error');
    }
}

async function updateActiveTicketAssignment() {
    if (!activeTicket) return;
    const val = detailAssigneeDropdown.value;
    const agentId = val ? parseInt(val) : null;
    try {
        const updated = await makeRequest(`${API_BASE_URL}/api/tickets/${activeTicket.id}/assign`, {
            method: 'PATCH',
            body: JSON.stringify({ agentId })
        });
        activeTicket = updated;
        const agentName = updated.assignedTo ? updated.assignedTo.fullName : 'Unassigned';
        showToast(`Ticket assigned to: ${agentName}`, 'success');
        renderTicketDetails(updated);
        loadDashboardData();
        addSystemLogComment(`assigned ticket to ${agentName}`);
    } catch (err) {
        showToast('Failed to assign ticket', 'error');
    }
}

// Comments / Conversation History
async function loadComments(ticketId) {
    commentsTimeline.textContent = '';
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'text-center text-muted';

    const spinner = document.createElement('i');
    spinner.className = 'fa-solid fa-spinner fa-spin';
    loadingDiv.appendChild(spinner);
    loadingDiv.appendChild(document.createTextNode(' Loading comments...'));
    commentsTimeline.appendChild(loadingDiv);

    try {
        const comments = await makeRequest(`${API_BASE_URL}/api/tickets/${ticketId}/comments`);
        renderComments(comments);
    } catch (err) {
        commentsTimeline.textContent = '';
        const errDiv = document.createElement('div');
        errDiv.className = 'text-center text-danger';
        errDiv.textContent = 'Could not load comments.';
        commentsTimeline.appendChild(errDiv);
    }
}

function renderComments(commentsList) {
    commentsTimeline.textContent = '';

    if (commentsList.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'text-center text-muted';
        emptyDiv.textContent = 'No messages yet. Send a response below.';
        commentsTimeline.appendChild(emptyDiv);
        return;
    }

    commentsList.forEach(c => {
        const div = document.createElement('div');
        
        if (c.content.startsWith('[SYSTEM]')) {
            div.className = 'comment-bubble system';
            div.textContent = c.content.replace('[SYSTEM]', '').trim();
        } else {
            const isOutgoing = c.author.id === currentUser.id;
            div.className = `comment-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`;
            
            const initials = getInitials(c.author.fullName);
            const time = formatDateDetailed(c.createdAt);

            const avatar = document.createElement('div');
            avatar.className = 'comment-avatar';
            avatar.title = c.author.fullName;
            avatar.textContent = initials;

            const mainBox = document.createElement('div');
            mainBox.className = 'comment-main';

            const metaBox = document.createElement('div');
            metaBox.className = 'comment-meta';

            const authorName = document.createElement('span');
            authorName.className = 'author-name';
            authorName.textContent = c.author.fullName;

            const roleBadge = document.createElement('span');
            roleBadge.className = 'role-badge';
            roleBadge.style.fontSize = '0.65rem';
            roleBadge.style.padding = '1px 4px';
            roleBadge.textContent = formatRole(c.author.role);

            const commentTime = document.createElement('span');
            commentTime.className = 'comment-time';
            commentTime.textContent = time;

            metaBox.appendChild(authorName);
            metaBox.appendChild(roleBadge);
            metaBox.appendChild(commentTime);

            const contentBox = document.createElement('div');
            contentBox.className = 'comment-content-box';
            contentBox.textContent = c.content;

            mainBox.appendChild(metaBox);
            mainBox.appendChild(contentBox);

            div.appendChild(avatar);
            div.appendChild(mainBox);
        }
        commentsTimeline.appendChild(div);
    });

    const commentsSec = document.querySelector('.comments-section');
    commentsSec.scrollTop = commentsSec.scrollHeight;
}

async function handleAddComment(e) {
    e.preventDefault();
    if (!activeTicket) return;

    const sendBtn = document.getElementById('send-comment-btn');
    sendBtn.disabled = true;

    sendBtn.textContent = '';
    const spinner = document.createElement('i');
    spinner.className = 'fa-solid fa-circle-notch fa-spin';
    sendBtn.appendChild(spinner);

    const content = commentContentInput.value;

    try {
        await makeRequest(`${API_BASE_URL}/api/tickets/${activeTicket.id}/comments`, {
            method: 'POST',
            body: JSON.stringify({ content })
        });
        commentContentInput.value = '';
        loadComments(activeTicket.id);
    } catch (err) {
        showToast('Failed to add comment.', 'error');
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = '';
        const span = document.createElement('span');
        span.textContent = 'Send';
        const planeIcon = document.createElement('i');
        planeIcon.className = 'fa-solid fa-paper-plane';
        sendBtn.appendChild(span);
        sendBtn.appendChild(document.createTextNode(' '));
        sendBtn.appendChild(planeIcon);
    }
}

// Add comments on behalf of actions automatically to form standard histories
async function addSystemLogComment(actionDescription) {
    if (!activeTicket) return;
    try {
        const systemMessage = `[SYSTEM] ${currentUser.fullName} (${formatRole(currentUser.role)}) ${actionDescription}.`;
        await makeRequest(`${API_BASE_URL}/api/tickets/${activeTicket.id}/comments`, {
            method: 'POST',
            body: JSON.stringify({ content: systemMessage })
        });
        loadComments(activeTicket.id);
    } catch (err) {
        console.error('Failed to create system log comment:', err);
    }
}

// Dropdown population
function populateAgentDropdown(agents) {
    detailAssigneeDropdown.textContent = '';
    
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = '-- Unassigned / Pool --';
    detailAssigneeDropdown.appendChild(defaultOpt);

    agents.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = `${a.fullName} (${formatRole(a.role)})`;
        detailAssigneeDropdown.appendChild(opt);
    });
}

// Formatters
function getInitials(name) {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
}

function formatRole(role) {
    if (role === 'AGENT') return 'Support Agent';
    if (role === 'ADMIN') return 'Administrator';
    if (role === 'FACULTY') return 'Faculty / Staff';
    return 'Student';
}

function formatStatus(status) {
    if (status === 'IN_PROGRESS') return 'In Progress';
    return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateDetailed(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}