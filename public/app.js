// Configuration
const YEAR = 2026;
const TOTAL_PEOPLE = 11;
const FRIENDS = ['Vidya', 'Joey', 'Hazel', 'Mariya', 'Pim', 'Sanskar', 'Thijs', 'Andrei', 'Szymon', 'Egor', 'Sandro'];

// Blocked dates (events that block everyone)
const BLOCKED_DATES = {
    '2026-07-03': { reason: 'Golf Trip', blockedFor: 'everyone' }
};

// State
let selectedDates = [];
let userSubmittedDates = []; // Dates the current user has already submitted
let flatpickrInstance = null;
let allUnavailability = {};

// DOM Elements
const nameSelect = document.getElementById('name-select');
const submitBtn = document.getElementById('submit-btn');
const resetBtn = document.getElementById('reset-btn');
const selectedDatesList = document.getElementById('selected-dates-list');
const submitStatus = document.getElementById('submit-status');
const userSubmissions = document.getElementById('user-submissions');
const julyCalendar = document.getElementById('july-calendar');
const augustCalendar = document.getElementById('august-calendar');
const dateDetails = document.getElementById('date-details');
const dateDetailsContent = document.getElementById('date-details-content');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initDatePicker();
    initFormHandlers();
    loadAllUnavailability();
});

// Tab Switching
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;

            // Update buttons
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tabId}-tab`).classList.add('active');

            // Refresh calendar when switching to it
            if (tabId === 'calendar') {
                loadAllUnavailability();
            }
        });
    });
}

// Date Picker
function initDatePicker() {
    const minDate = new Date(YEAR, 6, 1); // July 1
    const maxDate = new Date(YEAR, 7, 31); // August 31

    // Show 1 month on mobile, 2 on desktop
    const isMobile = window.innerWidth <= 600;

    flatpickrInstance = flatpickr('#date-picker', {
        mode: 'range',
        minDate: minDate,
        maxDate: maxDate,
        dateFormat: 'Y-m-d',
        inline: true,
        showMonths: isMobile ? 1 : 2,
        onChange: (selectedDateRange) => {
            if (selectedDateRange.length === 2 || selectedDateRange.length === 1) {
                const start = selectedDateRange[0];
                const end = selectedDateRange.length === 2 ? selectedDateRange[1] : selectedDateRange[0];
                addDateRange(start, end);
                flatpickrInstance.clear();
            }
        },
        onDayCreate: (dObj, dStr, fp, dayElem) => {
            const dateStr = formatDateLocal(dayElem.dateObj);

            // Check if this date is in user's submitted dates (bold red)
            if (userSubmittedDates.includes(dateStr)) {
                dayElem.classList.add('user-submitted');
            }
            // Check if this date is currently selected but not yet submitted (translucent red)
            else if (selectedDates.includes(dateStr)) {
                dayElem.classList.add('user-pending');
            }
        }
    });
}

// Refresh flatpickr to update highlighting
function refreshDatePicker() {
    if (flatpickrInstance) {
        flatpickrInstance.redraw();
    }
}

// Add date range to selection
function addDateRange(start, end) {
    // Generate all dates in range using local date formatting
    const dates = [];
    let current = new Date(start);
    while (current <= end) {
        dates.push(formatDateLocal(current));
        current.setDate(current.getDate() + 1);
    }

    // Add to selectedDates, avoiding duplicates
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

// Format date as YYYY-MM-DD using LOCAL time (fixes timezone issue)
function formatDateLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Format date for display
function formatDateDisplay(dateStr) {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Update selected dates UI
function updateSelectedDatesUI() {
    if (selectedDates.length === 0) {
        selectedDatesList.innerHTML = '<p class="empty-message">No dates selected for this session; previous submissions below</p>';
        return;
    }

    // Group consecutive dates into ranges
    const ranges = groupIntoRanges(selectedDates);

    selectedDatesList.innerHTML = ranges.map((range, index) => {
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

    // Add remove handlers
    selectedDatesList.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const rangeIndex = parseInt(e.target.dataset.rangeIndex);
            removeRange(ranges[rangeIndex]);
        });
    });
}

// Group dates into consecutive ranges
function groupIntoRanges(dates) {
    if (dates.length === 0) return [];

    const ranges = [];
    let rangeStart = dates[0];
    let rangeEnd = dates[0];

    for (let i = 1; i < dates.length; i++) {
        const prevDate = new Date(dates[i-1] + 'T12:00:00');
        const currDate = new Date(dates[i] + 'T12:00:00');
        const diffDays = (currDate - prevDate) / (1000 * 60 * 60 * 24);

        if (diffDays === 1) {
            rangeEnd = dates[i];
        } else {
            ranges.push({ start: rangeStart, end: rangeEnd });
            rangeStart = dates[i];
            rangeEnd = dates[i];
        }
    }

    ranges.push({ start: rangeStart, end: rangeEnd });
    return ranges;
}

// Remove a range
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

// Update submit button state
function updateSubmitButton() {
    const name = nameSelect.value;
    // Allow submitting even with no dates (means available all summer)
    submitBtn.disabled = !name;
}

// Form handlers
function initFormHandlers() {
    nameSelect.addEventListener('change', () => {
        updateSubmitButton();
        loadUserSubmissions();
    });

    submitBtn.addEventListener('click', submitUnavailability);
    resetBtn.addEventListener('click', resetUserDates);
}

// Submit unavailability
async function submitUnavailability() {
    const name = nameSelect.value;
    if (!name) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
        const response = await fetch('/.netlify/functions/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, dates: selectedDates })
        });

        const result = await response.json();

        if (response.ok) {
            const message = selectedDates.length === 0
                ? 'Recorded! You\'re available all summer! 🎉'
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

// Reset user dates
async function resetUserDates() {
    const name = nameSelect.value;
    if (!name) {
        showStatus('error', 'Please select your name first');
        return;
    }

    if (!confirm(`Are you sure you want to reset all your unavailable dates? This will clear all your previous submissions.`)) {
        return;
    }

    resetBtn.disabled = true;
    resetBtn.textContent = 'Resetting...';

    try {
        const response = await fetch('/.netlify/functions/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });

        const result = await response.json();

        if (response.ok) {
            showStatus('success', 'Your dates have been reset! You can now submit new dates.');
            selectedDates = [];
            updateSelectedDatesUI();
            loadUserSubmissions();
            loadAllUnavailability();
        } else {
            showStatus('error', result.error || 'Failed to reset');
        }
    } catch (error) {
        showStatus('error', 'Network error. Please try again.');
        console.error(error);
    }

    resetBtn.disabled = false;
    resetBtn.textContent = 'Reset My Dates';
}

// Show status message
function showStatus(type, message) {
    submitStatus.className = `status-message ${type}`;
    submitStatus.textContent = message;

    setTimeout(() => {
        submitStatus.className = 'status-message';
    }, 4000);
}

// Load user's submissions
async function loadUserSubmissions() {
    const name = nameSelect.value;
    if (!name) {
        userSubmissions.innerHTML = '<p class="empty-message">Select your name to see your submissions</p>';
        userSubmittedDates = [];
        refreshDatePicker();
        return;
    }

    try {
        const response = await fetch(`/.netlify/functions/get-user?name=${encodeURIComponent(name)}`);
        const data = await response.json();

        // Collect all submitted dates for this user
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

            userSubmissions.innerHTML = data.submissions.map(sub => {
                let datesDisplay;
                if (!sub.dates || sub.dates.length === 0) {
                    datesDisplay = '<span style="color: #065f46;">Available all summer! 🎉</span>';
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
            userSubmissions.innerHTML = '<p class="empty-message">No submissions yet</p>';
        }

        // Refresh date picker to show submitted dates
        refreshDatePicker();
    } catch (error) {
        console.error('Failed to load submissions:', error);
        userSubmissions.innerHTML = '<p class="empty-message">Failed to load submissions</p>';
        userSubmittedDates = [];
        refreshDatePicker();
    }
}

// Load all unavailability data
async function loadAllUnavailability() {
    try {
        const response = await fetch('/.netlify/functions/get-all');
        const data = await response.json();
        allUnavailability = data.unavailability || {};
        renderCalendars();
    } catch (error) {
        console.error('Failed to load unavailability:', error);
        allUnavailability = {};
        renderCalendars();
    }
}

// Render both calendars
function renderCalendars() {
    renderMonth(julyCalendar, 6, 'July'); // Month is 0-indexed
    renderMonth(augustCalendar, 7, 'August');
}

// Render a single month calendar
function renderMonth(container, month, monthName) {
    const firstDay = new Date(YEAR, month, 1);
    const lastDay = new Date(YEAR, month + 1, 0);
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

    // Header
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let html = days.map(d => `<div class="calendar-header">${d}</div>`).join('');

    // Empty cells before first day
    for (let i = 0; i < startDayOfWeek; i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    // Days
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dateStr = `${YEAR}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // Check if this is a blocked date
        const blockedInfo = BLOCKED_DATES[dateStr];

        let unavailablePeople = allUnavailability[dateStr] || [];
        let unavailableCount = unavailablePeople.length;
        let isBlocked = false;
        let blockedReason = '';

        if (blockedInfo) {
            isBlocked = true;
            blockedReason = blockedInfo.reason;
            // For blocked dates, show as fully gray
            unavailableCount = TOTAL_PEOPLE;
        }

        // Calculate color - from green to gray
        const grayness = unavailableCount / TOTAL_PEOPLE;
        const color = getAvailabilityColor(grayness);
        const textColor = grayness > 0.5 ? '#fff' : '#333';

        const blockedClass = isBlocked ? 'blocked' : '';
        const tooltip = isBlocked
            ? `Blocked: ${blockedReason}`
            : `${unavailableCount} unavailable`;

        html += `
            <div class="calendar-day ${blockedClass}"
                 style="background: ${color}; color: ${textColor};"
                 data-date="${dateStr}"
                 data-blocked="${isBlocked}"
                 data-blocked-reason="${blockedReason}"
                 title="${tooltip}">
                <span class="day-number">${day}</span>
                ${isBlocked ? '<span class="blocked-icon">🚫</span>' : ''}
                ${!isBlocked && unavailableCount > 0 ? `<span class="unavailable-count">${unavailableCount}</span>` : ''}
            </div>
        `;
    }

    container.innerHTML = html;

    // Add click handlers
    container.querySelectorAll('.calendar-day:not(.empty)').forEach(dayEl => {
        dayEl.addEventListener('click', () => {
            showDateDetails(dayEl.dataset.date);
        });
    });
}

// Calculate availability color (green to gray)
function getAvailabilityColor(grayness) {
    if (grayness === 0) {
        return '#4ade80'; // Bright green
    }

    // Interpolate from light green to dark gray
    const green = { r: 74, g: 222, b: 128 }; // #4ade80
    const gray = { r: 26, g: 26, b: 26 }; // #1a1a1a

    const r = Math.round(green.r + (gray.r - green.r) * grayness);
    const g = Math.round(green.g + (gray.g - green.g) * grayness);
    const b = Math.round(green.b + (gray.b - green.b) * grayness);

    return `rgb(${r}, ${g}, ${b})`;
}

// Show date details
function showDateDetails(dateStr) {
    const blockedInfo = BLOCKED_DATES[dateStr];
    const unavailablePeople = allUnavailability[dateStr] || [];
    const date = new Date(dateStr + 'T12:00:00');
    const dateDisplay = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    let content = `<h4>${dateDisplay}</h4>`;

    if (blockedInfo) {
        content += `
            <div class="blocked-message">
                <p>🚫 <strong>This date is blocked</strong></p>
                <p>Reason: ${blockedInfo.reason}</p>
            </div>
        `;
    } else if (unavailablePeople.length === 0) {
        content += '<p class="available-message">🎉 Everyone is available on this date!</p>';
    } else {
        const availablePeople = FRIENDS.filter(f => !unavailablePeople.includes(f));

        content += `
            <p><strong>${unavailablePeople.length} people unavailable:</strong></p>
            <ul class="unavailable-list">
                ${unavailablePeople.map(p => `<li>❌ ${p}</li>`).join('')}
            </ul>
        `;

        if (availablePeople.length > 0) {
            content += `
                <p style="margin-top: 15px;"><strong>${availablePeople.length} people available:</strong></p>
                <p style="color: #065f46;">✅ ${availablePeople.join(', ')}</p>
            `;
        }
    }

    dateDetailsContent.innerHTML = content;
    dateDetails.classList.remove('hidden');
    dateDetails.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

