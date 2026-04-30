// ===== NETLIFY IDENTITY SETUP =====
const netlifyIdentity = window.netlifyIdentity;
let currentUser = null;

// Initialize Netlify Identity
function initAuth() {
    netlifyIdentity.on('init', user => {
        currentUser = user;
        updateUI();
    });

    netlifyIdentity.on('login', user => {
        currentUser = user;
        netlifyIdentity.close();
        updateUI();
        loadUserCalendars();
    });

    netlifyIdentity.on('logout', () => {
        currentUser = null;
        updateUI();
    });

    netlifyIdentity.init();
}

// Update UI based on auth state
function updateUI() {
    const loginBtn = document.getElementById('login-btn');
    const userMenu = document.getElementById('user-menu');
    const userName = document.getElementById('user-name');
    const landingPage = document.getElementById('landing-page');
    const dashboardPage = document.getElementById('dashboard-page');

    if (currentUser) {
        // User is logged in
        loginBtn.classList.add('hidden');
        userMenu.classList.remove('hidden');
        userName.textContent = currentUser.user_metadata?.full_name || currentUser.email;

        landingPage.classList.add('hidden');
        dashboardPage.classList.remove('hidden');
    } else {
        // User is logged out
        loginBtn.classList.remove('hidden');
        userMenu.classList.add('hidden');

        landingPage.classList.remove('hidden');
        dashboardPage.classList.add('hidden');
    }
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    setupEventListeners();
    setDefaultDates();
});

function setupEventListeners() {
    // Login buttons
    document.getElementById('login-btn')?.addEventListener('click', () => {
        netlifyIdentity.open('login');
    });

    document.getElementById('hero-login-btn')?.addEventListener('click', () => {
        netlifyIdentity.open('login');
    });

    // Logout button
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        netlifyIdentity.logout();
    });

    // Create calendar buttons
    document.getElementById('create-calendar-btn')?.addEventListener('click', openCreateModal);
    document.getElementById('create-first-calendar-btn')?.addEventListener('click', openCreateModal);

    // Modal controls
    document.querySelector('.modal-close')?.addEventListener('click', closeCreateModal);
    document.querySelector('.modal-cancel')?.addEventListener('click', closeCreateModal);
    document.querySelector('.modal-backdrop')?.addEventListener('click', closeCreateModal);

    // Form handling
    document.getElementById('create-calendar-form')?.addEventListener('submit', handleCreateCalendar);

    // Date range type toggle
    document.querySelectorAll('input[name="date-range-type"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const customRange = document.getElementById('custom-date-range');
            if (e.target.value === 'custom') {
                customRange.style.display = 'flex';
            } else {
                customRange.style.display = 'none';
            }
        });
    });

    // Participants type toggle
    document.querySelectorAll('input[name="participants-type"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const definedParticipants = document.getElementById('defined-participants');
            if (e.target.value === 'defined') {
                definedParticipants.style.display = 'block';
            } else {
                definedParticipants.style.display = 'none';
            }
        });
    });
}

// Set default dates for the form
function setDefaultDates() {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 2);

    const formatDate = (date) => date.toISOString().split('T')[0];

    const startInput = document.getElementById('start-date');
    const endInput = document.getElementById('end-date');

    if (startInput) startInput.value = formatDate(nextMonth);
    if (endInput) endInput.value = formatDate(endDate);

    // Set min date to today
    if (startInput) startInput.min = formatDate(today);
    if (endInput) endInput.min = formatDate(today);
}

// ===== MODAL FUNCTIONS =====
function openCreateModal() {
    document.getElementById('create-calendar-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeCreateModal() {
    document.getElementById('create-calendar-modal').classList.add('hidden');
    document.body.style.overflow = '';
    document.getElementById('create-calendar-form').reset();
    setDefaultDates();
}

// ===== API FUNCTIONS =====
async function getAuthHeaders() {
    if (!currentUser) return {};
    const token = await netlifyIdentity.currentUser().jwt();
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

async function loadUserCalendars() {
    const calendarsList = document.getElementById('calendars-list');
    const noCalendars = document.getElementById('no-calendars');

    calendarsList.innerHTML = '<div class="loading-spinner">Loading your calendars...</div>';
    noCalendars.classList.add('hidden');

    try {
        const headers = await getAuthHeaders();
        const response = await fetch('/.netlify/functions/get-calendars', { headers });

        if (!response.ok) throw new Error('Failed to load calendars');

        const data = await response.json();

        if (data.calendars && data.calendars.length > 0) {
            renderCalendars(data.calendars);
        } else {
            calendarsList.innerHTML = '';
            noCalendars.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error loading calendars:', error);
        calendarsList.innerHTML = '<p class="error-message">Failed to load calendars. Please try again.</p>';
    }
}

function renderCalendars(calendars) {
    const calendarsList = document.getElementById('calendars-list');

    calendarsList.innerHTML = calendars.map(cal => {
        const dateRange = cal.dateRangeType === 'open'
            ? 'Open-ended'
            : `${formatDisplayDate(cal.startDate)} - ${formatDisplayDate(cal.endDate)}`;

        const participantsText = cal.participantsType === 'open'
            ? 'Anyone can join'
            : `${cal.participants?.length || 0} participants`;

        const shareUrl = `${window.location.origin}/c/${cal.id}`;

        return `
            <div class="calendar-card">
                <h3>${escapeHtml(cal.name)}</h3>
                ${cal.description ? `<p class="calendar-card-description">${escapeHtml(cal.description)}</p>` : ''}
                <div class="calendar-card-meta">
                    <span>📅 ${dateRange}</span>
                    <span>👥 ${participantsText}</span>
                </div>
                <div class="calendar-card-actions">
                    <a href="/c/${cal.id}" class="btn btn-primary btn-small">Open</a>
                    <button class="btn btn-outline btn-small" onclick="copyShareLink('${shareUrl}')">Share Link</button>
                    <button class="btn btn-outline btn-small" onclick="deleteCalendar('${cal.id}')">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

async function handleCreateCalendar(e) {
    e.preventDefault();

    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';

    const name = document.getElementById('calendar-name').value.trim();
    const description = document.getElementById('calendar-description').value.trim();
    const dateRangeType = document.querySelector('input[name="date-range-type"]:checked').value;
    const participantsType = document.querySelector('input[name="participants-type"]:checked').value;

    let startDate, endDate;
    if (dateRangeType === 'custom') {
        startDate = document.getElementById('start-date').value;
        endDate = document.getElementById('end-date').value;

        if (!startDate || !endDate) {
            alert('Please select both start and end dates');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Calendar';
            return;
        }

        if (new Date(endDate) <= new Date(startDate)) {
            alert('End date must be after start date');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Calendar';
            return;
        }
    } else {
        // Open-ended: next 6 months
        const today = new Date();
        startDate = today.toISOString().split('T')[0];
        const sixMonths = new Date(today);
        sixMonths.setMonth(sixMonths.getMonth() + 6);
        endDate = sixMonths.toISOString().split('T')[0];
    }

    let participants = [];
    if (participantsType === 'defined') {
        const participantsList = document.getElementById('participants-list').value;
        participants = participantsList
            .split(/[\n,]+/)
            .map(p => p.trim())
            .filter(p => p.length > 0);

        if (participants.length === 0) {
            alert('Please add at least one participant');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Calendar';
            return;
        }
    }

    try {
        const headers = await getAuthHeaders();
        const response = await fetch('/.netlify/functions/create-calendar', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                name,
                description,
                dateRangeType,
                startDate,
                endDate,
                participantsType,
                participants
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create calendar');
        }

        const data = await response.json();
        closeCreateModal();
        loadUserCalendars();

        // Show success and offer to copy link
        const shareUrl = `${window.location.origin}/c/${data.calendar.id}`;
        if (confirm(`Calendar created! Share this link with your group:\n\n${shareUrl}\n\nCopy to clipboard?`)) {
            copyShareLink(shareUrl);
        }
    } catch (error) {
        console.error('Error creating calendar:', error);
        alert('Failed to create calendar: ' + error.message);
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Calendar';
}

async function deleteCalendar(calendarId) {
    if (!confirm('Are you sure you want to delete this calendar? This cannot be undone.')) {
        return;
    }

    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`/.netlify/functions/delete-calendar?id=${calendarId}`, {
            method: 'DELETE',
            headers
        });

        if (!response.ok) throw new Error('Failed to delete calendar');

        loadUserCalendars();
    } catch (error) {
        console.error('Error deleting calendar:', error);
        alert('Failed to delete calendar. Please try again.');
    }
}

// ===== UTILITY FUNCTIONS =====
function copyShareLink(url) {
    navigator.clipboard.writeText(url).then(() => {
        alert('Link copied to clipboard!');
    }).catch(() => {
        prompt('Copy this link:', url);
    });
}

function formatDisplayDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions available globally for onclick handlers
window.copyShareLink = copyShareLink;
window.deleteCalendar = deleteCalendar;

