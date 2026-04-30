// ===== CALENDAR PAGE =====
// This handles the shared calendar view where participants submit their unavailability

// State
let calendarData = null;
let selectedDates = [];
let userSubmittedDates = [];
let flatpickrInstance = null;
let allUnavailability = {};
let currentParticipant = '';

// Get calendar ID from URL
function getCalendarId() {
    const path = window.location.pathname;
    const match = path.match(/\/c\/([a-zA-Z0-9-]+)/);
    return match ? match[1] : null;
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const calendarId = getCalendarId();

    if (!calendarId) {
        showError();
        return;
    }

    await loadCalendar(calendarId);
});

// Load calendar data
async function loadCalendar(calendarId) {
    try {
        const response = await fetch(`/.netlify/functions/get-calendar?id=${calendarId}`);

        if (!response.ok) {
            showError();
            return;
        }

        calendarData = await response.json();

        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('calendar-content').classList.remove('hidden');

        renderCalendarInfo();
        setupParticipantInput();
        initDatePicker();
        initTabs();
        initFormHandlers();
        await loadAllUnavailability();

    } catch (error) {
        console.error('Error loading calendar:', error);
        showError();
    }
}

function showError() {
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('error-state').classList.remove('hidden');
}

function renderCalendarInfo() {
    document.getElementById('calendar-title').textContent = calendarData.name;

    if (calendarData.description) {
        document.getElementById('calendar-description').textContent = calendarData.description;
    }

    const startDate = formatDisplayDate(calendarData.startDate);
    const endDate = formatDisplayDate(calendarData.endDate);
    document.getElementById('date-range-display').textContent = `${startDate} - ${endDate}`;

    // Update page title
    document.title = `${calendarData.name} - NotThisDate`;
}

function setupParticipantInput() {
    const container = document.getElementById('participant-input-container');

    if (calendarData.participantsType === 'defined' && calendarData.participants?.length > 0) {
        // Show dropdown for defined participants
        const select = document.createElement('select');
        select.id = 'participant-select';
        select.innerHTML = `
            <option value="">Select your name...</option>
            ${calendarData.participants.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('')}
        `;
        container.appendChild(select);
    } else {
        // Show text input for open calendars
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'participant-input';
        input.placeholder = 'Enter your name...';
        container.appendChild(input);
    }
}

// Tab switching
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;

            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tabId}-tab`).classList.add('active');

            if (tabId === 'view') {
                loadAllUnavailability();
            }
        });
    });
}

// Date Picker
function initDatePicker() {
    const startDate = new Date(calendarData.startDate + 'T00:00:00');
    const endDate = new Date(calendarData.endDate + 'T00:00:00');
    const isMobile = window.innerWidth <= 600;

    flatpickrInstance = flatpickr('#date-picker', {
        mode: 'range',
        minDate: startDate,
        maxDate: endDate,
        dateFormat: 'Y-m-d',
        inline: true,
        showMonths: isMobile ? 1 : 2,
        onChange: (selectedDateRange) => {
            if (selectedDateRange.length === 2 || selectedDateRange.length === 1) {
                const currentMonth = flatpickrInstance.currentMonth;
                const currentYear = flatpickrInstance.currentYear;

                const start = selectedDateRange[0];
                const end = selectedDateRange.length === 2 ? selectedDateRange[1] : selectedDateRange[0];
                addDateRange(start, end);
                flatpickrInstance.clear();

                if (isMobile) {
                    flatpickrInstance.changeMonth(currentMonth, false);
                    flatpickrInstance.changeYear(currentYear);
                }
            }
        },
        onDayCreate: (dObj, dStr, fp, dayElem) => {
            const dateStr = formatDateLocal(dayElem.dateObj);

            if (userSubmittedDates.includes(dateStr)) {
                dayElem.classList.add('user-submitted');
            } else if (selectedDates.includes(dateStr)) {
                dayElem.classList.add('user-pending');
            }
        }
    });
}

function refreshDatePicker() {
    if (flatpickrInstance) {
        const isMobile = window.innerWidth <= 600;
        const currentMonth = isMobile ? flatpickrInstance.currentMonth : null;
        const currentYear = isMobile ? flatpickrInstance.currentYear : null;

        flatpickrInstance.redraw();

        if (isMobile && currentMonth !== null) {
            flatpickrInstance.changeMonth(currentMonth, false);
            flatpickrInstance.changeYear(currentYear);
        }
    }
}

function addDateRange(start, end) {
    const dates = [];
    let current = new Date(start);
    while (current <= end) {
        dates.push(formatDateLocal(current));
        current.setDate(current.getDate() + 1);
    }

    dates.forEach(date => {
        if (!selectedDates.includes(date)) {
            selectedDates.push(date);
        }
    });

    selectedDates.sort();
    updateSelectedDatesUI();
    updateSubmitButton();
    refreshDatePicker();
}

// Form handlers
function initFormHandlers() {
    const participantEl = document.getElementById('participant-select') || document.getElementById('participant-input');

    participantEl?.addEventListener('change', () => {
        currentParticipant = participantEl.value.trim();
        updateSubmitButton();
        loadUserSubmissions();
    });

    participantEl?.addEventListener('input', () => {
        currentParticipant = participantEl.value.trim();
        updateSubmitButton();
    });

    document.getElementById('submit-btn')?.addEventListener('click', submitUnavailability);
    document.getElementById('reset-btn')?.addEventListener('click', resetUserDates);
}

function updateSubmitButton() {
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = !currentParticipant;
}

function updateSelectedDatesUI() {
    const container = document.getElementById('selected-dates-list');

    if (selectedDates.length === 0) {
        container.innerHTML = '<p class="empty-message">No dates selected for this session</p>';
        return;
    }

    const ranges = groupIntoRanges(selectedDates);

    container.innerHTML = ranges.map((range, index) => {
        const displayText = range.start === range.end
            ? formatDateDisplay(range.start)
            : `${formatDateDisplay(range.start)} - ${formatDateDisplay(range.end)}`;

        return `
            <span class="date-tag">
                ${displayText}
                <span class="remove-btn" data-range-index="${index}">&times;</span>
            </span>
        `;
    }).join('');

    container.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const rangeIndex = parseInt(e.target.dataset.rangeIndex);
            removeRange(ranges[rangeIndex]);
        });
    });
}

function removeRange(range) {
    const start = new Date(range.start + 'T12:00:00');
    const end = new Date(range.end + 'T12:00:00');

    selectedDates = selectedDates.filter(dateStr => {
        const date = new Date(dateStr + 'T12:00:00');
        return date < start || date > end;
    });

    updateSelectedDatesUI();
    updateSubmitButton();
    refreshDatePicker();
}

// Submit unavailability
async function submitUnavailability() {
    if (!currentParticipant) return;

    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
        const response = await fetch('/.netlify/functions/submit-unavailability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                calendarId: calendarData.id,
                participant: currentParticipant,
                dates: selectedDates
            })
        });

        const result = await response.json();

        if (response.ok) {
            const message = selectedDates.length === 0
                ? 'Recorded! You\'re available for all dates! 🎉'
                : 'Your unavailability has been recorded!';
            showStatus('success', message);
            selectedDates = [];
            updateSelectedDatesUI();
            loadUserSubmissions();
            loadAllUnavailability();
        } else {
            showStatus('error', result.error || 'Failed to submit');
        }
    } catch (error) {
        showStatus('error', 'Network error. Please try again.');
        console.error(error);
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Unavailability';
    updateSubmitButton();
}

async function resetUserDates() {
    if (!currentParticipant) {
        showStatus('error', 'Please enter your name first');
        return;
    }

    if (!confirm('Are you sure you want to reset all your unavailable dates?')) {
        return;
    }

    const resetBtn = document.getElementById('reset-btn');
    resetBtn.disabled = true;
    resetBtn.textContent = 'Resetting...';

    try {
        const response = await fetch('/.netlify/functions/reset-unavailability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                calendarId: calendarData.id,
                participant: currentParticipant
            })
        });

        if (response.ok) {
            showStatus('success', 'Your dates have been reset!');
            selectedDates = [];
            updateSelectedDatesUI();
            loadUserSubmissions();
            loadAllUnavailability();
        } else {
            showStatus('error', 'Failed to reset');
        }
    } catch (error) {
        showStatus('error', 'Network error. Please try again.');
        console.error(error);
    }

    resetBtn.disabled = false;
    resetBtn.textContent = 'Reset My Dates';
}

function showStatus(type, message) {
    const submitStatus = document.getElementById('submit-status');
    submitStatus.className = `status-message ${type}`;
    submitStatus.textContent = message;

    setTimeout(() => {
        submitStatus.className = 'status-message';
    }, 4000);
}

// Load user submissions
async function loadUserSubmissions() {
    const container = document.getElementById('user-submissions');

    if (!currentParticipant) {
        container.innerHTML = '<p class="empty-message">Enter your name to see your submissions</p>';
        userSubmittedDates = [];
        refreshDatePicker();
        return;
    }

    try {
        const response = await fetch(`/.netlify/functions/get-user-submissions?calendarId=${calendarData.id}&participant=${encodeURIComponent(currentParticipant)}`);
        const data = await response.json();

        userSubmittedDates = [];
        if (data.submissions && data.submissions.length > 0) {
            data.submissions.forEach(sub => {
                if (sub.dates) {
                    sub.dates.forEach(d => {
                        if (!userSubmittedDates.includes(d)) {
                            userSubmittedDates.push(d);
                        }
                    });
                }
            });

            container.innerHTML = data.submissions.map(sub => {
                let datesDisplay;
                if (!sub.dates || sub.dates.length === 0) {
                    datesDisplay = '<span style="color: var(--success-color);">Available for all dates! 🎉</span>';
                } else {
                    const ranges = groupIntoRanges(sub.dates);
                    datesDisplay = ranges.map(r =>
                        r.start === r.end
                            ? formatDateDisplay(r.start)
                            : `${formatDateDisplay(r.start)} - ${formatDateDisplay(r.end)}`
                    ).join(', ');
                }

                return `
                    <div class="submission-item">
                        <div class="submission-date">Submitted: ${new Date(sub.timestamp).toLocaleString()}</div>
                        <div class="submission-dates">${sub.dates && sub.dates.length > 0 ? 'Unavailable: ' : ''}${datesDisplay}</div>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = '<p class="empty-message">No submissions yet</p>';
        }

        refreshDatePicker();
    } catch (error) {
        console.error('Failed to load submissions:', error);
        container.innerHTML = '<p class="empty-message">Failed to load submissions</p>';
        userSubmittedDates = [];
        refreshDatePicker();
    }
}

// Load all unavailability
async function loadAllUnavailability() {
    try {
        const response = await fetch(`/.netlify/functions/get-unavailability?calendarId=${calendarData.id}`);
        const data = await response.json();
        allUnavailability = data.unavailability || {};
        renderAvailabilityCalendar();
    } catch (error) {
        console.error('Failed to load unavailability:', error);
        allUnavailability = {};
        renderAvailabilityCalendar();
    }
}

// Render availability calendar
function renderAvailabilityCalendar() {
    const container = document.getElementById('availability-calendar');
    const startDate = new Date(calendarData.startDate + 'T00:00:00');
    const endDate = new Date(calendarData.endDate + 'T00:00:00');

    // Group dates by month
    const months = [];
    let current = new Date(startDate);
    current.setDate(1);

    while (current <= endDate) {
        months.push({
            year: current.getFullYear(),
            month: current.getMonth()
        });
        current.setMonth(current.getMonth() + 1);
    }

    container.innerHTML = months.map(({ year, month }) => {
        const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        return `
            <div class="month-calendar">
                <h2>${monthName}</h2>
                <div class="calendar-grid" id="month-${year}-${month}"></div>
            </div>
        `;
    }).join('');

    months.forEach(({ year, month }) => {
        renderMonth(document.getElementById(`month-${year}-${month}`), year, month, startDate, endDate);
    });
}

function renderMonth(container, year, month, rangeStart, rangeEnd) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();

    const totalPeople = calendarData.participantsType === 'defined'
        ? calendarData.participants?.length || 1
        : Object.keys(getAllParticipants()).length || 1;

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let html = days.map(d => `<div class="calendar-header">${d}</div>`).join('');

    for (let i = 0; i < startDayOfWeek; i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dateObj = new Date(dateStr + 'T12:00:00');

        // Check if date is in range
        if (dateObj < rangeStart || dateObj > rangeEnd) {
            html += '<div class="calendar-day empty"></div>';
            continue;
        }

        const unavailablePeople = allUnavailability[dateStr] || [];
        const unavailableCount = unavailablePeople.length;

        const grayness = Math.min(unavailableCount / totalPeople, 1);
        const color = getAvailabilityColor(grayness);
        const textColor = grayness > 0.5 ? '#fff' : '#333';

        html += `
            <div class="calendar-day"
                 style="background: ${color}; color: ${textColor};"
                 data-date="${dateStr}"
                 title="${unavailableCount} unavailable">
                <span class="day-number">${day}</span>
                ${unavailableCount > 0 ? `<span class="unavailable-count">${unavailableCount}</span>` : ''}
            </div>
        `;
    }

    container.innerHTML = html;

    container.querySelectorAll('.calendar-day:not(.empty)').forEach(dayEl => {
        dayEl.addEventListener('click', () => {
            showDateDetails(dayEl.dataset.date);
        });
    });
}

function getAllParticipants() {
    const participants = {};
    Object.values(allUnavailability).forEach(people => {
        people.forEach(p => participants[p] = true);
    });
    return participants;
}

function getAvailabilityColor(grayness) {
    if (grayness === 0) {
        return '#4ade80';
    }

    const green = { r: 74, g: 222, b: 128 };
    const gray = { r: 26, g: 26, b: 26 };

    const r = Math.round(green.r + (gray.r - green.r) * grayness);
    const g = Math.round(green.g + (gray.g - green.g) * grayness);
    const b = Math.round(green.b + (gray.b - green.b) * grayness);

    return `rgb(${r}, ${g}, ${b})`;
}

function showDateDetails(dateStr) {
    const unavailablePeople = allUnavailability[dateStr] || [];
    const date = new Date(dateStr + 'T12:00:00');
    const dateDisplay = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    let content = `<h4>${dateDisplay}</h4>`;

    if (unavailablePeople.length === 0) {
        content += '<p class="available-message">🎉 Everyone is available on this date!</p>';
    } else {
        const allParticipants = calendarData.participantsType === 'defined'
            ? calendarData.participants
            : Object.keys(getAllParticipants());

        const availablePeople = allParticipants.filter(p => !unavailablePeople.includes(p));

        content += `
            <p><strong>${unavailablePeople.length} unavailable:</strong></p>
            <ul class="unavailable-list">
                ${unavailablePeople.map(p => `<li>❌ ${escapeHtml(p)}</li>`).join('')}
            </ul>
        `;

        if (availablePeople.length > 0) {
            content += `
                <p style="margin-top: 1rem;"><strong>${availablePeople.length} available:</strong></p>
                <p style="color: var(--success-color);">✅ ${availablePeople.map(escapeHtml).join(', ')}</p>
            `;
        }
    }

    const detailsEl = document.getElementById('date-details');
    document.getElementById('date-details-content').innerHTML = content;
    detailsEl.classList.remove('hidden');
    detailsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ===== UTILITY FUNCTIONS =====
function formatDateLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateDisplay(dateStr) {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDisplayDate(dateStr) {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function groupIntoRanges(dates) {
    if (dates.length === 0) return [];

    const sorted = [...dates].sort();
    const ranges = [];
    let rangeStart = sorted[0];
    let rangeEnd = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
        const prevDate = new Date(sorted[i-1] + 'T12:00:00');
        const currDate = new Date(sorted[i] + 'T12:00:00');
        const diffDays = (currDate - prevDate) / (1000 * 60 * 60 * 24);

        if (diffDays === 1) {
            rangeEnd = sorted[i];
        } else {
            ranges.push({ start: rangeStart, end: rangeEnd });
            rangeStart = sorted[i];
            rangeEnd = sorted[i];
        }
    }

    ranges.push({ start: rangeStart, end: rangeEnd });
    return ranges;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

