/**
 * INCREDIBLE PRODUCTIVITY SETUP
 * Core Application Logic
 * Version 1.1.0
 */

// --- STATE MANAGEMENT ---
const AppState = {
    user: {
        name: 'Zevist',
        xp: 0,
        level: 1,
        streak: 0,
        lastLogin: null,
        badges: []
    },
    flows: [],
    workings: [], 
    tasks: [],
    mastery: [],
    journal: [],
    breathingPatterns: [], // User's custom breathing patterns
    settings: {
        theme: 'dark-gold',
        soundEnabled: true,
        hapticEnabled: true,
        notificationsEnabled: false,
        animationsEnabled: true,
        location: { lat: null, long: null },
        pomodoro: { work: 25, short: 5, long: 15, longBreakAfter: 4 }
    },
    history: {}, // Date -> { xp: number, flows: number, workings: number }
    activityLog: [], // Array of { type, title, xp, timestamp }
    
    // Global Stats
    totalPracticeTime: 0, // in seconds
    totalReps: 0,
    pomodorosToday: 0,
    totalPomodoros: 0,
    lastPomodoroDate: null,
    
    // Runtime state
    activeFlow: null,
    timerInterval: null,
    breathingInterval: null,
    pomoInterval: null,
    
    // Pomodoro State (persisted)
    pomoState: {
        time: 25 * 60,
        totalTime: 25 * 60,
        isRunning: false,
        mode: 'work',
        interval: null
    }
};

// --- CONSTANTS ---
// Loaded from CONFIG object if available, else defaults
const XP_LEVEL_BASE = (typeof CONFIG !== 'undefined' && CONFIG.LEVEL_SYSTEM) ? CONFIG.LEVEL_SYSTEM.BASE_XP : 100;
const XP_LEVEL_MULTIPLIER = (typeof CONFIG !== 'undefined' && CONFIG.LEVEL_SYSTEM) ? CONFIG.LEVEL_SYSTEM.MULTIPLIER : 1.5;
const LEVEL_TITLES = (typeof CONFIG !== 'undefined' && CONFIG.LEVEL_SYSTEM) ? CONFIG.LEVEL_SYSTEM.TITLES : ["Newbie", "Initiate", "Adept"];

const BADGES = [
    { id: 'novice', name: 'Novice Zevist', icon: '🌱', desc: 'Reach Level 2', condition: (s) => s.user.level >= 2 },
    { id: 'streak_3', name: 'Consistency', icon: '🔥', desc: '3 Day Streak', condition: (s) => s.user.streak >= 3 },
    { id: 'streak_7', name: 'Dedication', icon: '⚡', desc: '7 Day Streak', condition: (s) => s.user.streak >= 7 },
    { id: 'flow_master', name: 'Flow Master', icon: '🌊', desc: 'Complete 10 Flows', condition: (s) => countHistoryTotal(s, 'flows') >= 10 },
    { id: 'magick_initiate', name: 'Magick Initiate', icon: '✧', desc: 'Start a Working', condition: (s) => s.workings.length > 0 },
    { id: 'task_slayer', name: 'Task Slayer', icon: '⚔️', desc: 'Complete 50 Tasks', condition: (s) => countCompletedTasks(s) >= 50 }
];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initNavigation();
    initDashboard();
    initAstro();
    initFlows();
    initWorkings();
    initTasks();
    initPomodoro();
    initBreathing();
    initJournal();
    initMastery();
    initCalendar();
    initSettings();
    
    checkStreak();
    autoResetFlowCompletions();
    renderBadges();
    // renderHeatmap(); // Removed
    
    // Keyboard shortcuts
    initKeyboardShortcuts();
    
    // Mobile toggle
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.add('active');
    });

    // Mobile close button (if exists)
    document.querySelector('.sidebar-close-btn')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('active');
    });

    // Close sidebar when clicking outside (overlay)
    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        const toggle = document.getElementById('sidebarToggle');
        if (window.innerWidth <= 768 && 
            sidebar.classList.contains('active') && 
            !sidebar.contains(e.target) && 
            !toggle.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    });
});

// --- KEYBOARD SHORTCUTS ---
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Don't trigger shortcuts if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        // Don't trigger if modal is open
        const modalOpen = document.querySelector('.modal.active');
        if (modalOpen) return;
        
        switch(e.key.toLowerCase()) {
            case 'n':
                e.preventDefault();
                window.openFlowBuilder();
                break;
            case 'j':
                e.preventDefault();
                window.openJournalEntry();
                break;
            case 't':
                e.preventDefault();
                window.openTaskModal();
                break;
            case 'p':
                if (!document.getElementById('page-pomodoro').classList.contains('active')) {
                    e.preventDefault();
                    window.navigateTo('pomodoro');
                }
                break;
        }
    });
}

// --- GLOBAL HELPERS (Exposed for HTML onclick) ---
window.navigateTo = (pageId) => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    const navLink = document.querySelector(`.nav-item[data-page="${pageId}"]`);
    if (navLink) navLink.classList.add('active');
    
    const page = document.getElementById(`page-${pageId}`);
    if (page) page.classList.add('active');
    
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('active');
    }
};

window.openModal = (id) => document.getElementById(id).classList.add('active');
window.closeModal = (id) => document.getElementById(id).classList.remove('active');

// --- STATE FUNCTIONS ---
function loadState() {
    const saved = localStorage.getItem('zevist_app_state');
    if (saved) {
        const parsed = JSON.parse(saved);
        AppState.user = { ...AppState.user, ...parsed.user };
        AppState.flows = parsed.flows || [];
        AppState.workings = parsed.workings || [];
        AppState.tasks = parsed.tasks || [];
        AppState.mastery = parsed.mastery || [];
        AppState.journal = parsed.journal || [];
        AppState.breathingPatterns = parsed.breathingPatterns || [];
        AppState.schedule = parsed.schedule || [];
        AppState.settings = { ...AppState.settings, ...parsed.settings };
        AppState.history = parsed.history || {};
        AppState.activityLog = parsed.activityLog || [];
        AppState.totalPracticeTime = parsed.totalPracticeTime || 0;
        AppState.totalReps = parsed.totalReps || 0;
        AppState.pomodorosToday = parsed.pomodorosToday || 0;
        AppState.totalPomodoros = parsed.totalPomodoros || 0;
        AppState.lastPomodoroDate = parsed.lastPomodoroDate;
        
        // Restore pomodoro state
        if (parsed.pomoState) {
            AppState.pomoState.time = parsed.pomoState.time || 25 * 60;
            AppState.pomoState.totalTime = parsed.pomoState.totalTime || 25 * 60;
            AppState.pomoState.mode = parsed.pomoState.mode || 'work';
            AppState.pomoState.isRunning = false; // Never auto-resume on load
        }
        
        // Reset daily pomodoro counter if new day
        const today = new Date().toISOString().split('T')[0];
        if (AppState.lastPomodoroDate !== today) {
            AppState.pomodorosToday = 0;
            AppState.lastPomodoroDate = today;
        }
    } else {
        AppState.schedule = [];
    }
    updateXPDisplay();
    updateStatsDisplay();
}

function saveState() {
    try {
        localStorage.setItem('zevist_app_state', JSON.stringify({
            user: AppState.user,
            flows: AppState.flows,
            workings: AppState.workings,
            tasks: AppState.tasks,
            mastery: AppState.mastery,
            journal: AppState.journal,
            breathingPatterns: AppState.breathingPatterns || [],
            schedule: AppState.schedule || [],
            settings: AppState.settings,
            history: AppState.history,
            activityLog: AppState.activityLog || [],
            totalPracticeTime: AppState.totalPracticeTime || 0,
            totalReps: AppState.totalReps || 0,
            pomodorosToday: AppState.pomodorosToday || 0,
            totalPomodoros: AppState.totalPomodoros || 0,
            lastPomodoroDate: AppState.lastPomodoroDate,
            pomoState: {
                time: AppState.pomoState.time,
                totalTime: AppState.pomoState.totalTime,
                isRunning: AppState.pomoState.isRunning,
                mode: AppState.pomoState.mode
            }
        }));
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            showNotification('⚠️ Storage full! Please export your data and remove old images.', 'error');
            console.error('LocalStorage quota exceeded:', e);
        } else {
            console.error('Error saving state:', e);
        }
    }
}

function logActivity(type, title, xp) {
    if (!AppState.activityLog) AppState.activityLog = [];
    AppState.activityLog.unshift({
        type,
        title,
        xp,
        timestamp: new Date().toISOString()
    });
    // Keep log size manageable
    if (AppState.activityLog.length > 50) AppState.activityLog.pop();
    renderActivityLog();
}

function renderActivityLog() {
    const container = document.getElementById('activityLogList');
    if (!container) return;
    
    if (!AppState.activityLog || AppState.activityLog.length === 0) {
        container.innerHTML = '<div class="text-muted" style="text-align:center; padding: 20px;">No recent activity.</div>';
        return;
    }
    
    container.innerHTML = AppState.activityLog.map(log => {
        const date = new Date(log.timestamp);
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        let icon = '•';
        if (log.type === 'flow') icon = '🌊';
        if (log.type === 'working') icon = '✧';
        if (log.type === 'task') icon = '⚔️';
        
        return `
            <div class="activity-item ${log.type}">
                <div class="activity-time">${timeStr}</div>
                <div class="activity-details">
                    <div class="activity-title">${icon} ${log.title}</div>
                </div>
                <div class="activity-xp">+${log.xp} XP</div>
            </div>
        `;
    }).join('');
}

function addXP(amount) {
    AppState.user.xp += amount;
    
    // Level up check
    const nextLevelXP = Math.floor(XP_LEVEL_BASE * Math.pow(XP_LEVEL_MULTIPLIER, AppState.user.level - 1));
    
    if (AppState.user.xp >= nextLevelXP) {
        AppState.user.xp -= nextLevelXP;
        AppState.user.level++;
        showNotification(`Level Up! You are now level ${AppState.user.level}`, 'gold');
        checkBadges();
    }
    
    // Record history
    const today = new Date().toISOString().split('T')[0];
    if (!AppState.history[today]) AppState.history[today] = { xp: 0, flows: 0, workings: 0 };
    AppState.history[today].xp += amount;
    
    updateXPDisplay();
    saveState();
}

function updateXPDisplay() {
    document.getElementById('userLevel').textContent = AppState.user.level;
    document.getElementById('currentXP').textContent = Math.floor(AppState.user.xp);
    
    // Update Title based on Level
    const rankInterval = (typeof CONFIG !== 'undefined' && CONFIG.LEVEL_SYSTEM && CONFIG.LEVEL_SYSTEM.RANK_INTERVAL) ? CONFIG.LEVEL_SYSTEM.RANK_INTERVAL : 1;
    const titleIndex = Math.min(Math.floor((AppState.user.level - 1) / rankInterval), LEVEL_TITLES.length - 1);
    
    const titleEl = document.querySelector('.level-text');
    if (titleEl) titleEl.textContent = LEVEL_TITLES[titleIndex];

    const nextLevelXP = Math.floor(XP_LEVEL_BASE * Math.pow(XP_LEVEL_MULTIPLIER, AppState.user.level - 1));
    document.getElementById('nextLevelXP').textContent = nextLevelXP;
    
    const percentage = (AppState.user.xp / nextLevelXP) * 100;
    document.getElementById('userXPBar').style.width = `${percentage}%`;
}

function checkStreak() {
    const today = new Date().toISOString().split('T')[0];
    const lastLogin = AppState.user.lastLogin;
    
    if (lastLogin !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (lastLogin === yesterdayStr) {
            AppState.user.streak++;
        } else if (lastLogin && lastLogin !== today) {
            if (AppState.user.lastLogin) AppState.user.streak = 1;
        } else {
             AppState.user.streak = 1;
        }
        
        AppState.user.lastLogin = today;
        saveState();
    }
    
    document.getElementById('currentStreak').textContent = AppState.user.streak;
    document.getElementById('longestStreak').textContent = Math.max(AppState.user.streak, parseInt(document.getElementById('longestStreak').textContent) || 0);
}

function autoResetFlowCompletions() {
    // Auto-reset completed flows from previous days
    const today = new Date().toISOString().split('T')[0];
    let needsSave = false;
    
    AppState.flows.forEach(flow => {
        if (flow.completedDates && flow.completedDates.length > 0) {
            // Keep only today's completion (auto-reset for new day)
            const oldLength = flow.completedDates.length;
            flow.completedDates = flow.completedDates.filter(date => date === today);
            if (flow.completedDates.length !== oldLength) {
                needsSave = true;
            }
        }
    });
    
    if (needsSave) {
        saveState();
    }
}

// --- NAVIGATION ---
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = item.dataset.page;
            if (pageId) window.navigateTo(pageId);
        });
    });
}

// --- DASHBOARD ---
function getFlowsForDate(dateObj) {
    const dateStr = dateObj.toISOString().split('T')[0];
    const dayOfWeek = dateObj.getDay(); // 0 = Sun, 6 = Sat
    const dayOfMonth = dateObj.getDate(); // 1-31
    
    // 1. Recurring Flows
    const recurring = AppState.flows.filter(f => {
        if (!f.schedule) return false;
        const s = f.schedule;
        if (s.type === 'daily') return true;
        if (s.type === 'weekdays' && dayOfWeek >= 1 && dayOfWeek <= 5) return true;
        if (s.type === 'weekends' && (dayOfWeek === 0 || dayOfWeek === 6)) return true;
        if (s.type === 'weekly' && s.days && s.days.includes(dayOfWeek)) return true;
        if (s.type === 'monthly' && s.dates && s.dates.includes(dayOfMonth)) return true;
        if (s.type === 'specific' && s.date === dateStr) return true;
        return false;
    });
    
    // 2. One-off Scheduled Flows (from Calendar)
    const oneOffs = (AppState.schedule || []).filter(e => e.date === dateStr);
    
    return { recurring, oneOffs };
}

function initDashboard() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', options);
    
    renderTodaySchedule();
    updateStatsDisplay();
}

function renderTodaySchedule() {
    const list = document.getElementById('todaySchedule');
    const countBadge = document.getElementById('todayCount');
    if (!list) return;
    
    const { recurring, oneOffs } = getFlowsForDate(new Date());
    const total = recurring.length + oneOffs.length;
    
    if (countBadge) countBadge.textContent = `${total} items`;
    
    if (total === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">☽</span>
                <p>No flows scheduled for today</p>
                <button class="btn btn-outline" onclick="navigateTo('flows')">Create a Flow</button>
            </div>`;
        return;
    }
    
    list.innerHTML = '';
    
    // Render Recurring with drag-drop
    recurring.forEach((flow, displayIndex) => {
        // Find original index in AppState.flows for the click handler
        const originalIndex = AppState.flows.findIndex(f => f.id === flow.id);
        const today = new Date().toISOString().split('T')[0];
        const isCompletedToday = flow.completedDates && flow.completedDates.includes(today);
        
        const item = document.createElement('div');
        item.className = 'component-item';
        item.style.cursor = 'pointer';
        item.style.opacity = isCompletedToday ? '0.6' : '1';
        item.draggable = true;
        item.dataset.flowId = flow.id;
        item.onclick = () => openFlowPreview(originalIndex);
        item.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; flex:1;">
                <span class="drag-handle-inline" style="cursor:grab; color:var(--text-muted);">⋮⋮</span>
                <button class="flow-check-inline ${isCompletedToday ? 'checked' : ''}" 
                        onclick="event.stopPropagation(); toggleFlowDone(${flow.id}, event)"
                        title="${isCompletedToday ? 'Mark incomplete' : 'Mark complete'}">
                    ${isCompletedToday ? '✓' : ''}
                </button>
                <span style="font-size:1.2rem;">🌊</span>
                <div>
                    <div style="font-weight:bold; ${isCompletedToday ? 'text-decoration:line-through;' : ''}">${flow.title}</div>
                    <div style="font-size:0.8rem; color:var(--text-muted);">Scheduled ${isCompletedToday ? '• Completed' : ''}</div>
                </div>
            </div>
            <button class="btn-sm btn-gold" onclick="event.stopPropagation(); openFlowPreview(${originalIndex})">Start</button>
        `;
        
        // Drag events for dashboard reordering
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', flow.id);
            item.classList.add('dragging');
        });
        item.addEventListener('dragend', () => item.classList.remove('dragging'));
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            item.classList.add('drag-over');
        });
        item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            item.classList.remove('drag-over');
            const fromId = parseInt(e.dataTransfer.getData('text/plain'));
            const toId = flow.id;
            if (fromId !== toId) {
                const fromIndex = AppState.flows.findIndex(f => f.id === fromId);
                const toIndex = AppState.flows.findIndex(f => f.id === toId);
                const [moved] = AppState.flows.splice(fromIndex, 1);
                AppState.flows.splice(toIndex, 0, moved);
                saveState();
                renderTodaySchedule();
                renderFlows();
                showNotification('Schedule order updated', 'normal');
            }
        });
        
        list.appendChild(item);
    });
    
    // Render One-Offs
    oneOffs.forEach(item => {
        const el = document.createElement('div');
        el.className = 'component-item';
        el.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:1.2rem;">📅</span>
                <div>
                    <div style="font-weight:bold;">${item.title}</div>
                    <div style="font-size:0.8rem; color:var(--text-muted);">${item.time}</div>
                </div>
            </div>
        `;
        list.appendChild(el);
    });
}

function updateStatsDisplay() {
    const today = new Date().toISOString().split('T')[0];
    const todayStats = AppState.history[today] || { xp: 0, flows: 0, workings: 0 };
    
    // Dashboard Stats
    const todayCompletedEl = document.getElementById('todayCompleted');
    if (todayCompletedEl) todayCompletedEl.textContent = todayStats.flows;
    
    const activeWorkingsEl = document.getElementById('activeWorkings');
    if (activeWorkingsEl) activeWorkingsEl.textContent = AppState.workings.filter(w => w.status === 'active').length;
    
    // Pomodoro stats
    const pomodoroCountEl = document.getElementById('pomodoroCount');
    if (pomodoroCountEl) pomodoroCountEl.textContent = AppState.pomodorosToday || 0;
    
    // Practice time (use actual tracked time)
    const todayTimeEl = document.getElementById('todayTime');
    if (todayTimeEl) {
        const hours = Math.floor(AppState.totalPracticeTime / 3600);
        const mins = Math.floor((AppState.totalPracticeTime % 3600) / 60);
        todayTimeEl.textContent = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    }
    
    renderActivityLog();

    // Update total stats
    let totalFlows = 0;
    let totalXP = 0;
    Object.values(AppState.history).forEach(day => {
        totalFlows += day.flows || 0;
        totalXP += day.xp || 0;
    });
    
    const totalFlowsEl = document.getElementById('totalFlows');
    if (totalFlowsEl) totalFlowsEl.textContent = totalFlows;
    
    const totalTimeEl = document.getElementById('totalTime');
    if (totalTimeEl) {
        const totalHours = Math.floor(AppState.totalPracticeTime / 3600);
        totalTimeEl.textContent = totalHours + 'h';
    }
    
    // Statistics page stats
    const totalPomsEl = document.getElementById('totalPomodoros');
    if (totalPomsEl) totalPomsEl.textContent = AppState.totalPomodoros || 0;
    
    const totalRepsEl = document.getElementById('totalReps');
    if (totalRepsEl) totalRepsEl.textContent = AppState.totalReps || 0;
}

window.openQuickFlow = () => {
    window.navigateTo('flows');
    window.openFlowBuilder();
};

window.openQuickJournal = () => {
    window.navigateTo('journal');
    window.openJournalEntry();
};

window.startQuickTimer = () => {
    window.openModal('quickTimerModal');
};

window.launchQuickTimer = () => {
    const mins = parseInt(document.getElementById('quickTimerMinutes').value) || 0;
    const secs = parseInt(document.getElementById('quickTimerSeconds').value) || 0;
    const totalSecs = (mins * 60) + secs;
    
    if (totalSecs <= 0) return;
    
    window.closeModal('quickTimerModal');
    
    // Create a temporary flow for this timer
    const tempFlow = {
        title: "Quick Timer",
        steps: [{ title: "Focus", type: "timer", duration: mins + (secs/60) }]
    };
    
    runFlowObject(tempFlow);
};

// --- FLOWS ---
let currentFlowBuilderSteps = [];
let currentFlowCoverImage = null;

window.handleFlowCoverUpload = (input) => {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            currentFlowCoverImage = e.target.result;
            const preview = document.getElementById('flowImagePreview');
            if (preview) {
                preview.style.backgroundImage = `url('${currentFlowCoverImage}')`;
                preview.style.display = 'block';
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.applyCoverImagePreset = (presetFile) => {
    if (!presetFile) return;
    currentFlowCoverImage = presetFile;
    const preview = document.getElementById('flowImagePreview');
    if (preview) {
        preview.style.backgroundImage = `url('${currentFlowCoverImage}')`;
        preview.style.display = 'block';
    }
};

window.clearCoverImage = () => {
    currentFlowCoverImage = null;
    const preview = document.getElementById('flowImagePreview');
    if (preview) {
        preview.style.backgroundImage = '';
        preview.style.display = 'none';
    }
    document.getElementById('flowImage').value = '';
    document.getElementById('flowCoverPreset').value = '';
};

// Templates loaded from CONFIG
const FLOW_TEMPLATES = (typeof CONFIG !== 'undefined' && CONFIG.TEMPLATES) ? CONFIG.TEMPLATES : [];

function initFlows() {
    renderFlows();
    renderTemplates();
    
    // Tab switching
    document.querySelectorAll('.flows-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.flows-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const tabId = btn.dataset.tab;
            document.querySelectorAll('.flows-content').forEach(c => c.style.display = 'none');
            document.getElementById(`tab-${tabId}`).style.display = 'block';
        });
    });

    // Schedule Dropdown Toggle
    const scheduleSelect = document.getElementById('flowSchedule');
    if (scheduleSelect) {
        scheduleSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            document.getElementById('weeklyOptions').style.display = (val === 'weekly') ? 'block' : 'none';
            document.getElementById('specificDateOption').style.display = (val === 'specific') ? 'block' : 'none';
        });
    }
}

let editingFlowId = null;

window.openFlowBuilder = () => {
    editingFlowId = null;
    currentFlowBuilderSteps = [];
    currentFlowCoverImage = null;
    document.getElementById('flowName').value = '';
    document.getElementById('flowDescription').value = '';
    document.getElementById('flowImage').value = ''; // Clear file input
    const preview = document.getElementById('flowImagePreview');
    if (preview) {
        preview.style.display = 'none';
        preview.style.backgroundImage = '';
    }

    document.getElementById('componentsList').innerHTML = '<div class="empty-components"><p>Add components to build your flow</p></div>';
    
    // Reset Schedule Inputs
    document.getElementById('flowSchedule').value = 'manual';
    document.getElementById('flowSpecificDate').value = '';
    document.querySelectorAll('#weeklyOptions input').forEach(cb => cb.checked = false);
    document.getElementById('weeklyOptions').style.display = 'none';
    document.getElementById('specificDateOption').style.display = 'none';

    // Populate Image Preset Dropdown
    const coverPresetSelect = document.getElementById('flowCoverPreset');
    if (coverPresetSelect) {
        coverPresetSelect.innerHTML = '<option value="">Choose Preset...</option>' + 
            CONFIG.IMAGE_PRESETS.map(p => `<option value="${p.file}">${p.name}</option>`).join('');
        coverPresetSelect.value = '';
    }

    // Populate Mastery Dropdown
    const masterySelect = document.getElementById('flowMasteryLink');
    if (masterySelect) {
        masterySelect.innerHTML = '<option value="">None</option>' + 
            AppState.mastery.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
        masterySelect.value = '';
    }
    
    window.openModal('flowBuilderModal');
};

window.editFlow = (id) => {
    const flow = AppState.flows.find(f => f.id === id);
    if (!flow) return;
    
    editingFlowId = id;
    currentFlowCoverImage = flow.image || null;
    currentFlowBuilderSteps = JSON.parse(JSON.stringify(flow.steps)); // Deep copy
    
    document.getElementById('flowName').value = flow.title;
    document.getElementById('flowDescription').value = flow.description || '';
    document.getElementById('flowImage').value = ''; // Clear file input (can't set programmatically)
    
    // Populate Image Preset Dropdown
    const coverPresetSelect = document.getElementById('flowCoverPreset');
    if (coverPresetSelect) {
        coverPresetSelect.innerHTML = '<option value="">Choose Preset...</option>' + 
            CONFIG.IMAGE_PRESETS.map(p => `<option value="${p.file}">${p.name}</option>`).join('');
        coverPresetSelect.value = '';
    }
    
    const preview = document.getElementById('flowImagePreview');
    if (preview) {
        if (currentFlowCoverImage) {
            preview.style.backgroundImage = `url('${currentFlowCoverImage}')`;
            preview.style.display = 'block';
        } else {
            preview.style.display = 'none';
            preview.style.backgroundImage = '';
        }
    }
    
    // Populate Schedule
    const schedule = flow.schedule || { type: 'manual' };
    document.getElementById('flowSchedule').value = schedule.type;
    document.getElementById('flowSpecificDate').value = schedule.date || '';
    
    // Handle Schedule UI visibility
    const weeklyOptions = document.getElementById('weeklyOptions');
    const specificDateOption = document.getElementById('specificDateOption');
    
    weeklyOptions.style.display = (schedule.type === 'weekly' || schedule.type === 'weekdays' || schedule.type === 'weekends') ? 'block' : 'none';
    specificDateOption.style.display = schedule.type === 'specific' ? 'block' : 'none';

    // Check boxes
    document.querySelectorAll('#weeklyOptions input').forEach(cb => cb.checked = false);
    if (schedule.days && Array.isArray(schedule.days)) {
        schedule.days.forEach(day => {
            const cb = document.querySelector(`#weeklyOptions input[value="${day}"]`);
            if (cb) cb.checked = true;
        });
    }
    
    // Populate Mastery Dropdown
    const masterySelect = document.getElementById('flowMasteryLink');
    if (masterySelect) {
        masterySelect.innerHTML = '<option value="">None</option>' + 
            AppState.mastery.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
        masterySelect.value = flow.masteryId || '';
    }
    
    renderFlowBuilderSteps();
    window.openModal('flowBuilderModal');
};

window.addComponent = (type) => {
    const id = Date.now();
    const step = {
        id,
        type,
        title: type.charAt(0).toUpperCase() + type.slice(1),
        duration: 5, // default minutes
        targetReps: 10, // default reps
        instructions: '',
        image: '',
        masteryId: '',
        breathingPattern: '' // For breathing type
    };
    
    // Set default breathing pattern if available
    if (type === 'breathing') {
        const allPatterns = [...(typeof CONFIG !== 'undefined' && CONFIG.BREATHING_PATTERNS ? CONFIG.BREATHING_PATTERNS : []), ...AppState.breathingPatterns];
        if (allPatterns.length > 0) {
            step.breathingPattern = allPatterns[0].value;
        }
    }
    
    currentFlowBuilderSteps.push(step);
    renderFlowBuilderSteps();
};

function renderFlowBuilderSteps() {
    const list = document.getElementById('componentsList');
    if (!list) return;
    list.innerHTML = '';
    
    if (currentFlowBuilderSteps.length === 0) {
        list.innerHTML = '<div class="empty-components"><p>Add components to build your flow</p></div>';
        return;
    }
    
    // Generate Mastery Options
    const masteryOptions = AppState.mastery.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
    
    currentFlowBuilderSteps.forEach((step, index) => {
        const el = document.createElement('div');
        el.className = 'component-item';
        el.style.flexDirection = 'column';
        el.style.alignItems = 'stretch';
        el.style.gap = '10px';
        
        let valueInput = '';
        if (step.type === 'breathing') {
            const allPatterns = [...(typeof CONFIG !== 'undefined' && CONFIG.BREATHING_PATTERNS ? CONFIG.BREATHING_PATTERNS : []), ...AppState.breathingPatterns];
            const patternOptions = allPatterns.map(p => `<option value="${p.value}" ${step.breathingPattern === p.value ? 'selected' : ''}>${p.name}</option>`).join('');
            valueInput = `
                <label style="font-size:0.8rem; color:#888">Breathing Pattern</label>
                <select class="input" onchange="updateStepField(${index}, 'breathingPattern', this.value)">
                    ${patternOptions}
                </select>
                <label style="font-size:0.8rem; color:#888; margin-top:8px">Duration (cycles/minutes)</label>
                <input type="number" class="input" value="${step.duration || 5}" onchange="updateStepField(${index}, 'duration', this.value)">
                <button class="btn btn-sm btn-outline" onclick="openBreathingPatternManager()" style="margin-top:8px">Manage Patterns</button>
            `;
        } else if (step.type === 'reps') {
            valueInput = `
                <label style="font-size:0.8rem; color:#888">Target Reps</label>
                <input type="number" class="input" value="${step.targetReps || 10}" onchange="updateStepField(${index}, 'targetReps', this.value)">
            `;
        } else if (step.type === 'stopwatch') {
            valueInput = `
                <label style="font-size:0.8rem; color:#888">Goal Duration (min) - 0 for Indefinite</label>
                <input type="number" class="input" value="${step.duration || 0}" onchange="updateStepField(${index}, 'duration', this.value)">
            `;
        } else {
            // Timer
            valueInput = `
                <label style="font-size:0.8rem; color:#888">Duration (min)</label>
                <input type="number" class="input" value="${step.duration || 5}" onchange="updateStepField(${index}, 'duration', this.value)">
            `;
        }

        el.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:5px;">
                <span style="font-weight:bold; color:var(--gold-primary)">${index + 1}. ${step.type.toUpperCase()}</span>
                <button class="btn-danger btn-sm" onclick="removeFlowStep(${index})">×</button>
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <div>
                    <label style="font-size:0.8rem; color:#888">Title</label>
                    <input type="text" class="input" value="${step.title}" onchange="updateStepField(${index}, 'title', this.value)">
                </div>
                <div>
                    ${valueInput}
                </div>
            </div>
            
            <div>
                <label style="font-size:0.8rem; color:#888">Instructions</label>
                <textarea class="input" rows="2" onchange="updateStepField(${index}, 'instructions', this.value)">${step.instructions || ''}</textarea>
            </div>
            
            <div>
                <label style="font-size:0.8rem; color:#888">Image</label>
                <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                    <select class="input" style="flex:1; min-width:150px;" onchange="applyImagePreset(${index}, this.value)">
                        <option value="">Choose Preset...</option>
                        ${CONFIG.IMAGE_PRESETS.map(p => `<option value="${p.file}">${p.name}</option>`).join('')}
                    </select>
                    <span style="color:#666; font-size:0.8rem;">or</span>
                    <input type="file" class="input" style="flex:1; min-width:150px;" accept="image/*" onchange="handleStepImageUpload(${index}, this)">
                </div>
                ${step.image ? `<div style="display:flex; align-items:center; gap:10px; margin-top:8px;">
                    <img src="${step.image}" style="width:60px; height:40px; object-fit:cover; border-radius:4px; border:1px solid var(--gold-primary);">
                    <span style="font-size:0.75rem; color:var(--gold-primary);">✓ Image Set</span>
                    <button class="btn-secondary btn-sm" onclick="clearStepImage(${index})" style="font-size:0.7rem; padding:2px 8px;">Clear</button>
                </div>` : ''}
            </div>
            
            <div>
                <label style="font-size:0.8rem; color:#888">Link to Mastery (Optional)</label>
                <select class="input" onchange="updateStepField(${index}, 'masteryId', this.value)">
                    <option value="">None</option>
                    ${masteryOptions}
                </select>
            </div>
        `;
        
        // Set selected mastery manually after render
        const select = el.querySelector('select');
        if (select && step.masteryId) select.value = step.masteryId;
        
        list.appendChild(el);
    });
}

window.handleStepImageUpload = (index, input) => {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            // Size check removed as per user request
            currentFlowBuilderSteps[index].image = e.target.result;
            renderFlowBuilderSteps(); // Re-render to show "Image Loaded"
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.applyImagePreset = (index, presetFile) => {
    if (!presetFile) return;
    currentFlowBuilderSteps[index].image = presetFile;
    renderFlowBuilderSteps();
};

window.clearStepImage = (index) => {
    currentFlowBuilderSteps[index].image = '';
    renderFlowBuilderSteps();
};

window.updateStepField = (index, field, val) => {
    if (field === 'duration' || field === 'targetReps') {
        currentFlowBuilderSteps[index][field] = parseFloat(val);
    } else {
        currentFlowBuilderSteps[index][field] = val;
    }
};

window.removeFlowStep = (index) => {
    currentFlowBuilderSteps.splice(index, 1);
    renderFlowBuilderSteps();
};

window.saveFlow = () => {
    const title = document.getElementById('flowName').value;
    if (!title) return showNotification('Please enter a flow name', 'error');
    if (currentFlowBuilderSteps.length === 0) return showNotification('Add at least one component', 'error');
    
    const masteryId = document.getElementById('flowMasteryLink').value;
    
    // Capture Schedule
    const scheduleType = document.getElementById('flowSchedule').value;
    const scheduleDate = document.getElementById('flowSpecificDate').value;
    const scheduleDays = Array.from(document.querySelectorAll('#weeklyOptions input:checked')).map(cb => parseInt(cb.value));
    
    const schedule = {
        type: scheduleType,
        date: scheduleDate,
        days: scheduleDays
    };

    if (editingFlowId) {
        const flow = AppState.flows.find(f => f.id === editingFlowId);
        if (flow) {
            flow.title = title;
            flow.description = document.getElementById('flowDescription').value;
            flow.image = currentFlowCoverImage;
            flow.steps = currentFlowBuilderSteps;
            flow.masteryId = masteryId;
            flow.schedule = schedule;
            showNotification('Flow updated', 'gold');
        }
    } else {
        const flow = {
            id: Date.now(),
            title,
            description: document.getElementById('flowDescription').value,
            image: currentFlowCoverImage,
            steps: currentFlowBuilderSteps,
            masteryId,
            schedule,
            created: new Date().toISOString(),
            completedDates: [] // Track when flow was completed
        };
        AppState.flows.push(flow);
        showNotification('Flow created', 'gold');
        logActivity('flow', `Created Flow: ${title}`, 50);
    }
    
    saveState();
    renderFlows();
    window.closeModal('flowBuilderModal');
    editingFlowId = null;
};

window.deleteFlow = (id) => {
    if (confirm('Are you sure you want to delete this flow?')) {
        AppState.flows = AppState.flows.filter(f => f.id !== id);
        saveState();
        renderFlows();
        showNotification('Flow deleted', 'normal');
    }
};

window.toggleFlowDone = (id, event) => {
    if (event) event.stopPropagation();
    const flow = AppState.flows.find(f => f.id === id);
    if (!flow) return;
    
    if (!flow.completedDates) flow.completedDates = [];
    
    const today = new Date().toISOString().split('T')[0];
    const index = flow.completedDates.indexOf(today);
    
    if (index > -1) {
        flow.completedDates.splice(index, 1);
        showNotification('Flow marked incomplete', 'normal');
    } else {
        flow.completedDates.push(today);
        showNotification('Flow completed! ✓', 'gold');
        addXP(50);
        logActivity('flow', `Completed: ${flow.title}`, 50);
        
        // Update history
        const todayKey = new Date().toISOString().split('T')[0];
        if (!AppState.history[todayKey]) {
            AppState.history[todayKey] = { xp: 0, flows: 0, workings: 0 };
        }
        AppState.history[todayKey].flows += 1;
    }
    
    saveState();
    renderFlows();
    renderTodaySchedule();
    initCalendar();
};

function renderFlows() {
    const grid = document.getElementById('flowsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    if (AppState.flows.length === 0) {
        document.getElementById('noFlows').style.display = 'flex';
        return;
    }
    document.getElementById('noFlows').style.display = 'none';
    
    AppState.flows.forEach((flow, index) => {
        const card = document.createElement('div');
        card.className = 'flow-card';
        card.draggable = true;
        card.dataset.index = index;
        const duration = flow.steps.reduce((acc, s) => acc + (parseFloat(s.duration) || 0), 0);
        
        // Check if flow is scheduled and if completed today
        const today = new Date().toISOString().split('T')[0];
        const isScheduled = flow.schedule && flow.schedule.type !== 'manual';
        const isCompletedToday = flow.completedDates && flow.completedDates.includes(today);
        
        card.innerHTML = `
            <div class="drag-handle">⋮⋮</div>
            <div class="flow-image" style="background-image: url('${flow.image || ''}')">
                <div style="position:absolute; top:10px; right:10px; z-index:10; display:flex; gap:5px;">
                    <button class="btn-sm btn-gold" onclick="event.stopPropagation(); editFlow(${flow.id})">✎</button>
                    <button class="btn-sm btn-danger" onclick="event.stopPropagation(); deleteFlow(${flow.id})">×</button>
                </div>
                ${isScheduled ? `
                <div style="position:absolute; top:10px; left:10px; z-index:10;">
                    <button class="flow-check ${isCompletedToday ? 'checked' : ''}" 
                            onclick="toggleFlowDone(${flow.id}, event)"
                            title="${isCompletedToday ? 'Mark incomplete' : 'Mark complete'}">
                        ${isCompletedToday ? '✓' : ''}
                    </button>
                </div>` : ''}
            </div>
            <div class="flow-content">
                <h3 class="flow-title">${flow.title}</h3>
                <div class="flow-meta">
                    <span>${flow.steps.length} Steps</span>
                    <span>~${Math.ceil(duration)} min</span>
                </div>
            </div>
        `;
        
        // Drag events for reordering
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', index);
            card.classList.add('dragging');
        });
        card.addEventListener('dragend', () => card.classList.remove('dragging'));
        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            card.classList.add('drag-over');
        });
        card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
        card.addEventListener('drop', (e) => {
            e.preventDefault();
            card.classList.remove('drag-over');
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const toIndex = index;
            if (fromIndex !== toIndex) {
                const [moved] = AppState.flows.splice(fromIndex, 1);
                AppState.flows.splice(toIndex, 0, moved);
                saveState();
                renderFlows();
                showNotification('Flow order updated', 'normal');
            }
        });
        
        card.addEventListener('click', () => openFlowPreview(index));
        grid.appendChild(card);
    });
}

window.openFlowPreview = (index) => {
    const flow = AppState.flows[index];
    if (!flow) return;
    
    document.getElementById('previewFlowTitle').textContent = flow.title;
    document.getElementById('previewFlowDesc').textContent = flow.description || "No description.";
    
    const stepsList = document.getElementById('previewFlowSteps');
    if (stepsList) {
        stepsList.innerHTML = flow.steps.map((s, i) => `
            <div style="padding:10px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between;">
                <span>${i+1}. ${s.title}</span>
                <span style="color:var(--text-muted)">${s.type === 'reps' ? (s.targetReps + ' reps') : (s.duration + ' min')}</span>
            </div>
        `).join('');
    }
    
    const startBtn = document.getElementById('startFlowBtn');
    startBtn.onclick = () => {
        window.closeModal('flowPreviewModal');
        runFlow(index);
    };
    
    window.openModal('flowPreviewModal');
};

function renderTemplates() {
    const grid = document.getElementById('templatesGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    FLOW_TEMPLATES.forEach((tmpl, index) => {
        const card = document.createElement('div');
        card.className = 'flow-card';
        const duration = tmpl.steps.reduce((acc, s) => acc + (parseFloat(s.duration) || 0), 0);
        
        // Use template image if available
        const imageStyle = tmpl.image 
            ? `background-image: url('${tmpl.image}'); background-size: cover; background-position: center;`
            : `background: linear-gradient(45deg, #222, #333);`;
        
        card.innerHTML = `
            <div class="flow-image" style="${imageStyle}"></div>
            <div class="flow-content">
                <h3 class="flow-title">${tmpl.title}</h3>
                <p style="font-size:0.8rem; color:#888; margin-bottom:10px">${tmpl.description}</p>
                <div class="flow-meta">
                    <span>${tmpl.steps.length} Steps</span>
                    <span>~${Math.ceil(duration)} min</span>
                </div>
                <button class="btn-sm btn-gold" style="width:100%; margin-top:10px" onclick="useTemplate(${index})">Use Template</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

window.useTemplate = (index) => {
    const tmpl = FLOW_TEMPLATES[index];
    const flow = {
        id: Date.now(),
        title: tmpl.title,
        description: tmpl.description,
        steps: JSON.parse(JSON.stringify(tmpl.steps)), // Deep copy
        created: new Date().toISOString()
    };
    
    AppState.flows.push(flow);
    saveState();
    renderFlows();
    showNotification('Template added to your flows', 'gold');
    document.querySelector('[data-tab="all-flows"]').click();
};

// --- FLOW RUNNER ---
let runnerState = {
    flow: null,
    stepIndex: 0,
    timer: null,
    timeLeft: 0,
    isPaused: false
};

function runFlow(index) {
    runFlowObject(AppState.flows[index]);
}

function runFlowObject(flow) {
    runnerState.flow = flow;
    runnerState.stepIndex = 0;
    runnerState.isPaused = false;
    
    document.getElementById('flowRunner').classList.add('active');
    renderRunnerStep();
}

function renderRunnerStep() {
    const step = runnerState.flow.steps[runnerState.stepIndex];
    if (!step) {
        finishFlow();
        return;
    }
    
    const content = document.getElementById('runnerContent');
    const controls = document.getElementById('runnerControls');
    
    // Progress
    const progress = ((runnerState.stepIndex) / runnerState.flow.steps.length) * 100;
    document.getElementById('runnerProgressBar').style.width = `${progress}%`;
    document.getElementById('runnerProgressText').textContent = `Step ${runnerState.stepIndex + 1}/${runnerState.flow.steps.length}`;
    
    // Image
    let imageHtml = '';
    if (step.image) {
        imageHtml = `<img src="${step.image}" class="runner-image" alt="Step Image">`;
    }

    // Instructions
    let instructionsHtml = '';
    if (step.instructions) {
        instructionsHtml = `<p style="margin:10px 0; font-size:1.1rem; color:var(--text-main); white-space: pre-wrap;">${step.instructions}</p>`;
    }

    // Main Display (Timer or Reps)
    let mainDisplayHtml = '';
    if (step.type === 'breathing') {
        // Breathing exercise
        mainDisplayHtml = `
            <div style="text-align:center; padding:20px;">
                <div style="font-size:1.2rem; color:var(--gold-primary); margin-bottom:15px;">Breathing Exercise</div>
                <div style="font-size:0.9rem; color:var(--text-muted); margin-bottom:20px;">Pattern: ${step.breathingPattern || 'Default'}</div>
                <button class="btn btn-gold" onclick="startFlowBreathing()">Begin Breathing</button>
            </div>
        `;
    } else if (step.type === 'reps') {
        runnerState.currentReps = 0;
        runnerState.targetReps = step.targetReps || 10;
        mainDisplayHtml = `
            <div class="runner-reps" id="runnerRepsDisplay" onclick="incrementRunnerReps()" style="cursor:pointer; user-select:none;">
                <span style="font-size:4rem; font-weight:bold; color:var(--gold-primary)">0</span>
                <span style="font-size:1.5rem; color:var(--text-muted)">/ ${runnerState.targetReps}</span>
                <div style="font-size:0.9rem; color:var(--text-muted); margin-top:10px;">Tap to count</div>
            </div>
        `;
    } else if (step.type === 'stopwatch') {
        runnerState.elapsedTime = 0;
        mainDisplayHtml = `<div class="runner-timer" id="runnerTimerDisplay">00:00</div>`;
    } else {
        // Timer
        mainDisplayHtml = `<div class="runner-timer" id="runnerTimerDisplay">00:00</div>`;
    }

    // Content
    content.innerHTML = `
        ${imageHtml}
        <h2 class="runner-instruction">${step.title}</h2>
        ${instructionsHtml}
        ${mainDisplayHtml}
        <p style="color:#888; margin-top:10px;">${
            step.type === 'timer' ? 'Focus until the timer ends' : 
            (step.type === 'reps' ? 'Complete the reps' : 
            (step.type === 'stopwatch' ? 'Time your session' : 
            (step.type === 'breathing' ? 'Follow the breathing pattern' : 'Read and internalize')))
        }</p>
    `;
    
    // Controls
    controls.innerHTML = `
        ${step.type !== 'reps' ? '<button class="btn btn-outline" onclick="toggleRunnerPause()" id="runnerPauseBtn">Pause</button>' : ''}
        <button class="btn btn-outline" onclick="skipRunnerStep()">Skip</button>
        <button class="btn btn-gold" onclick="nextRunnerStep()">Next Step</button>
    `;
    
    // Start Timer if needed
    if (step.type === 'breathing') {
        // Breathing exercises handle their own overlay
        // No timer needed here
    } else if (step.type === 'timer' && step.duration > 0) {
        runnerState.timeLeft = step.duration * 60;
        updateRunnerTimerDisplay();
        startRunnerTimer('countdown');
    } else if (step.type === 'stopwatch') {
        runnerState.elapsedTime = 0;
        updateRunnerTimerDisplay();
        startRunnerTimer('countup');
    } else if (step.type !== 'reps') {
        // Manual or indefinite
    }
}

window.incrementRunnerReps = () => {
    if (runnerState.flow.steps[runnerState.stepIndex].type !== 'reps') return;
    
    runnerState.currentReps++;
    const el = document.getElementById('runnerRepsDisplay');
    if (el) {
        el.innerHTML = `
            <span style="font-size:4rem; font-weight:bold; color:var(--gold-primary)">${runnerState.currentReps}</span>
            <span style="font-size:1.5rem; color:var(--text-muted)">/ ${runnerState.targetReps}</span>
            <div style="font-size:0.9rem; color:var(--text-muted); margin-top:10px;">Tap to count</div>
        `;
    }
    
    if (runnerState.currentReps >= runnerState.targetReps) {
        showNotification("Target Reps Reached!", "gold");
        playNotificationSound();
    }
};

function startRunnerTimer(mode = 'countdown') {
    clearInterval(runnerState.timer);
    runnerState.timer = setInterval(() => {
        if (runnerState.isPaused) return;
        
        if (mode === 'countdown') {
            runnerState.timeLeft--;
            updateRunnerTimerDisplay();
            
            if (runnerState.timeLeft <= 0) {
                clearInterval(runnerState.timer);
                playNotificationSound();
                showNotification("Step Complete", "gold");
            }
        } else if (mode === 'countup') {
            runnerState.elapsedTime++;
            updateRunnerTimerDisplay(true);
            
            // Optional goal check for stopwatch
            const step = runnerState.flow.steps[runnerState.stepIndex];
            if (step.duration > 0 && runnerState.elapsedTime >= step.duration * 60) {
                 // Just notify, don't stop
                 if (!runnerState.goalReached) {
                     playNotificationSound();
                     showNotification("Goal Duration Reached", "gold");
                     runnerState.goalReached = true;
                 }
            }
        }
    }, 1000);
}

function updateRunnerTimerDisplay(isCountUp = false) {
    const time = isCountUp ? runnerState.elapsedTime : runnerState.timeLeft;
    const m = Math.floor(time / 60).toString().padStart(2, '0');
    const s = Math.floor(time % 60).toString().padStart(2, '0');
    const el = document.getElementById('runnerTimerDisplay');
    if (el) el.textContent = `${m}:${s}`;
}

window.toggleRunnerPause = () => {
    runnerState.isPaused = !runnerState.isPaused;
    document.getElementById('runnerPauseBtn').textContent = runnerState.isPaused ? "Resume" : "Pause";
};

window.skipRunnerStep = () => {
    clearInterval(runnerState.timer);
    // No XP for skipping
    showNotification("Step Skipped", "normal");
    runnerState.stepIndex++;
    renderRunnerStep();
};

window.nextRunnerStep = () => {
    clearInterval(runnerState.timer);
    
    // Handle Mastery Linking
    const currentStep = runnerState.flow.steps[runnerState.stepIndex];
    
    // Track Global Stats (regardless of mastery)
    if (currentStep.type === 'reps') {
        const repsCompleted = runnerState.currentReps || currentStep.targetReps || 0;
        AppState.totalReps += repsCompleted;
    } else if (currentStep.type === 'stopwatch') {
        AppState.totalPracticeTime += runnerState.elapsedTime || 0;
    } else if (currentStep.type === 'timer') {
        AppState.totalPracticeTime += (currentStep.duration || 0) * 60;
    }
    
    // Determine Mastery ID: Step-level ove
    const masteryId = currentStep.masteryId || runnerState.flow.masteryId;
    
    if (masteryId) {
        const masteryItem = AppState.mastery.find(m => m.id == masteryId);
        if (masteryItem) {
            let valueToAdd = 0;
            
            if (masteryItem.type === 'reps') {
                // If mastery is Reps based
                if (currentStep.type === 'reps') {
                    valueToAdd = runnerState.currentReps || currentStep.targetReps || 0;
                } else {
                    // Other types don't contribute to Reps mastery
                    valueToAdd = 0;
                }
            } else {
                // If mastery is Hours based (default)
                if (currentStep.type === 'reps') {
                    // Reps don't count towards hourly mastery
                    valueToAdd = 0; 
                } else if (currentStep.type === 'stopwatch') {
                    valueToAdd = (runnerState.elapsedTime || 0) / 3600; // Seconds to Hours
                } else {
                    // Timer - duration is in minutes
                    // Convert to hours for mastery
                    valueToAdd = (currentStep.duration || 0) / 60;
                }
            }
            
            if (valueToAdd > 0) {
                masteryItem.currentHours = (parseFloat(masteryItem.currentHours) + valueToAdd).toFixed(2);
                const unitLabel = masteryItem.type === 'reps' ? 'reps' : 'hrs';
                logActivity('working', `Mastery Progress: ${masteryItem.name} (+${valueToAdd.toFixed(2)} ${unitLabel})`, 10);
                showNotification(`Progress added to ${masteryItem.name}`, 'gold');
            }
        }
    }

    addXP(10);
    saveState();
    runnerState.stepIndex++;
    renderRunnerStep();
};

window.exitFlowRunner = () => {
    if (confirm("Exit current flow? Progress will be lost.")) {
        clearInterval(runnerState.timer);
        document.getElementById('flowRunner').classList.remove('active');
    }
};

function finishFlow() {
    clearInterval(runnerState.timer);
    document.getElementById('flowRunner').classList.remove('active');
    addXP(100);
    
    // Update history
    const today = new Date().toISOString().split('T')[0];
    if (!AppState.history[today]) AppState.history[today] = { xp: 0, flows: 0, workings: 0 };
    AppState.history[today].flows++;
    
    const flowName = AppState.activeFlow ? AppState.activeFlow.name : (runnerState.flow ? runnerState.flow.title : 'Flow');
    logActivity('flow', flowName, 100);

    showNotification("Flow Completed!", "gold");
    saveState();
    checkBadges();
    updateStatsDisplay();

    // Prompt for Journal
    setTimeout(() => {
        if (confirm("Would you like to add a journal entry for this flow?")) {
            document.getElementById('journalTitle').value = `Flow: ${flowName}`;
            document.getElementById('journalContent').value = `Completed flow session.\n\nReflections:\n`;
            window.openModal('journalModal');
        }
    }, 500);
}

// --- MAGICK WORKINGS ---
window.openWorkingBuilder = () => {
    // Reset form for new working
    document.getElementById('workingName').value = '';
    document.getElementById('workingIntention').value = '';
    document.getElementById('workingAffirmation').value = '';
    document.getElementById('workingDuration').value = '40';
    document.getElementById('workingStartDate').value = new Date().toISOString().split('T')[0];
    window.currentEditingWorkingId = null;
    window.openModal('workingBuilderModal');
};

window.saveWorking = () => {
    const name = document.getElementById('workingName').value;
    if (!name) return showNotification('Name required', 'error');
    
    if (window.currentEditingWorkingId) {
        // Edit existing working
        const w = AppState.workings.find(x => x.id === window.currentEditingWorkingId);
        if (w) {
            w.name = name;
            w.intention = document.getElementById('workingIntention').value;
            w.affirmation = document.getElementById('workingAffirmation').value;
            w.duration = parseInt(document.getElementById('workingDuration').value);
            w.startDate = document.getElementById('workingStartDate').value;
            showNotification('Working updated', 'gold');
        }
        window.currentEditingWorkingId = null;
    } else {
        // Create new working
        const working = {
            id: Date.now(),
            name,
            intention: document.getElementById('workingIntention').value,
            affirmation: document.getElementById('workingAffirmation').value,
            duration: parseInt(document.getElementById('workingDuration').value),
            startDate: document.getElementById('workingStartDate').value || new Date().toISOString().split('T')[0],
            status: 'active',
            daysCompleted: 0
        };
        AppState.workings.push(working);
        addXP(50);
    }
    
    saveState();
    initWorkings();
    window.closeModal('workingBuilderModal');
};

window.openWorkingBuilder = () => {
    // Reset form for new working
    document.getElementById('workingName').value = '';
    document.getElementById('workingIntention').value = '';
    document.getElementById('workingAffirmation').value = '';
    document.getElementById('workingDuration').value = '40';
    document.getElementById('workingStartDate').value = new Date().toISOString().split('T')[0];
    window.currentEditingWorkingId = null;
    window.openModal('workingBuilderModal');
};

function initWorkings(filterStatus = 'active') {
    const grid = document.getElementById('workingsGrid');
    const list = document.getElementById('activeWorkingsList');
    
    // Setup Tabs
    const tabs = document.querySelectorAll('.workings-tabs .tab-btn');
    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            initWorkings(tab.dataset.tab);
        };
        // Ensure UI matches current filter
        if (tab.dataset.tab === filterStatus) {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        }
    });
    
    if (grid) grid.innerHTML = '';
    if (list) list.innerHTML = '';
    
    const filteredWorkings = AppState.workings.filter(w => w.status === filterStatus);
    
    if (filteredWorkings.length === 0) {
        if (document.getElementById('noWorkings') && filterStatus === 'active') {
            document.getElementById('noWorkings').style.display = 'flex';
        } else if (grid) {
             grid.innerHTML = `<div class="text-muted" style="width:100%; text-align:center; padding:20px;">No ${filterStatus} workings found.</div>`;
             if (document.getElementById('noWorkings')) document.getElementById('noWorkings').style.display = 'none';
        }
    } else {
        if (document.getElementById('noWorkings')) document.getElementById('noWorkings').style.display = 'none';
    }
    
    // Main Grid
    filteredWorkings.forEach(w => {
        if (grid) {
            // Generate progress circles
            let circles = '';
            for (let i = 0; i < w.duration; i++) {
                const filled = i < w.daysCompleted;
                circles += `<div class="progress-circle ${filled ? 'filled' : ''}" title="Day ${i + 1}"></div>`;
            }
            
            const startDate = w.startDate ? new Date(w.startDate).toLocaleDateString() : 'N/A';
            
            const card = document.createElement('div');
            card.className = 'flow-card';
            card.innerHTML = `
                <div class="flow-content">
                    <h3 class="flow-title">${w.name}</h3>
                    <div class="flow-meta">
                        <span>Day ${w.daysCompleted}/${w.duration}</span>
                        <span>Started: ${startDate}</span>
                        <span>${w.status}</span>
                    </div>
                    ${w.intention ? `<div style="margin-top:10px; padding:10px; background:rgba(212,175,55,0.1); border-left:3px solid var(--gold-primary); border-radius:4px;">
                        <div style="font-size:0.75rem; color:var(--gold-primary); font-weight:600; margin-bottom:5px;">INTENTION</div>
                        <div style="font-size:0.9rem; color:var(--text-main);">${w.intention}</div>
                    </div>` : ''}
                    ${w.affirmation ? `<div style="margin-top:10px; padding:10px; background:rgba(212,175,55,0.1); border-left:3px solid var(--gold-primary); border-radius:4px;">
                        <div style="font-size:0.75rem; color:var(--gold-primary); font-weight:600; margin-bottom:5px;">AFFIRMATION</div>
                        <div style="font-size:0.9rem; color:var(--text-main); font-style:italic;">${w.affirmation}</div>
                    </div>` : ''}
                    <div class="progress-circles-container" style="margin-top:15px; display:flex; flex-wrap:wrap; gap:5px; max-height:100px; overflow-y:auto;">
                        ${circles}
                    </div>
                    <div style="margin-top:15px; display:flex; gap:10px; flex-wrap:wrap;">
                        ${w.status === 'active' ? `
                            <button class="btn-sm btn-gold" onclick="doWorkingDaily(${w.id})">+1 Day</button>
                            ${w.daysCompleted > 0 ? `<button class="btn-sm btn-outline" onclick="decrementWorkingDay(${w.id})">-1 Day</button>` : ''}
                        ` : ''}
                        <button class="btn-sm btn-outline" onclick="editWorking(${w.id})">Edit</button>
                        <button class="btn-sm btn-outline" onclick="toggleWorkingStatus(${w.id})">${w.status === 'active' ? 'Plan' : (w.status === 'planned' || w.status === 'paused' ? 'Activate' : 'Reopen')}</button>
                        <button class="btn-sm btn-danger" onclick="deleteWorking(${w.id})">Delete</button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        }
    });
        
    // Dashboard List (Always Active only)
    if (list) {
        AppState.workings.filter(w => w.status === 'active').forEach(w => {
            const daysLeft = w.duration - w.daysCompleted;
            const startDate = w.startDate ? new Date(w.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
            
            const item = document.createElement('div');
            item.className = 'component-item';
            item.style.flexDirection = 'column';
            item.style.alignItems = 'flex-start';
            item.style.gap = '8px';
            item.innerHTML = `
                <div style="width:100%; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:600; color:var(--gold-primary);">${w.name}</span>
                    <button class="btn-sm btn-gold" onclick="navigateTo('magick')">View</button>
                </div>
                <div style="display:flex; gap:15px; font-size:0.85rem; color:var(--text-muted);">
                    <span>📅 Started: ${startDate}</span>
                    <span>⏳ ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left</span>
                    <span>📍 Day ${w.daysCompleted}/${w.duration}</span>
                </div>
            `;
            list.appendChild(item);
        });
    }
}

window.toggleWorkingStatus = (id) => {
    const w = AppState.workings.find(x => x.id === id);
    if (w) {
        if (w.status === 'active') w.status = 'planned';
        else if (w.status === 'planned' || w.status === 'paused') w.status = 'active';
        else if (w.status === 'completed') w.status = 'active';
        saveState();
        const activeTab = document.querySelector('.workings-tabs .tab-btn.active')?.dataset.tab || 'active';
        initWorkings(activeTab);
    }
};

window.deleteWorking = (id) => {
    if(confirm('Delete this working?')) {
        AppState.workings = AppState.workings.filter(x => x.id !== id);
        saveState();
        const activeTab = document.querySelector('.workings-tabs .tab-btn.active')?.dataset.tab || 'active';
        initWorkings(activeTab);
    }
};

window.decrementWorkingDay = (id) => {
    const w = AppState.workings.find(x => x.id === id);
    if (w && w.daysCompleted > 0) {
        w.daysCompleted--;
        saveState();
        const activeTab = document.querySelector('.workings-tabs .tab-btn.active')?.dataset.tab || 'active';
        initWorkings(activeTab);
        showNotification(`Day count decreased for ${w.name}`, 'gold');
    }
};

window.editWorking = (id) => {
    const w = AppState.workings.find(x => x.id === id);
    if (!w) return;
    
    document.getElementById('workingName').value = w.name;
    document.getElementById('workingIntention').value = w.intention || '';
    document.getElementById('workingAffirmation').value = w.affirmation || '';
    document.getElementById('workingDuration').value = w.duration;
    document.getElementById('workingStartDate').value = w.startDate;
    
    // Store editing ID for save function
    window.currentEditingWorkingId = id;
    window.openModal('workingBuilderModal');
};

window.doWorkingDaily = (id) => {
    const w = AppState.workings.find(x => x.id === id);
    if (w) {
        w.daysCompleted++;
        addXP(20);
        logActivity('working', `Working: ${w.name}`, 20);
        showNotification(`Day ${w.daysCompleted} completed for ${w.name}`, 'gold');
        if (w.daysCompleted >= w.duration) {
            w.status = 'completed';
            showNotification(`Working ${w.name} Fully Completed!`, 'gold');
            addXP(500);
        }
        saveState();
        initWorkings();

        // Prompt for Journal
        setTimeout(() => {
            if (confirm("Would you like to add a journal entry for this session?")) {
                document.getElementById('journalTitle').value = `Working: ${w.name} - Day ${w.daysCompleted}`;
                document.getElementById('journalContent').value = `Completed day ${w.daysCompleted} of ${w.duration}.\n\nReflections:\n`;
                window.openModal('journalModal');
            }
        }, 500);
    }
};

// --- TASKS ---
let editingTaskId = null;

function initTasks() {
    renderTasks();
}

window.openTaskModal = () => {
    editingTaskId = null;
    document.getElementById('taskName').value = '';
    document.getElementById('taskCategory').value = 'Work';
    document.getElementById('taskPriority').value = 'Medium';
    window.openModal('taskModal');
};

window.editTask = (id) => {
    const task = AppState.tasks.find(t => t.id === id);
    if (!task) return;
    
    editingTaskId = id;
    document.getElementById('taskName').value = task.name;
    document.getElementById('taskCategory').value = task.category;
    document.getElementById('taskPriority').value = task.priority;
    window.openModal('taskModal');
};

window.saveTask = () => {
    const name = document.getElementById('taskName').value;
    if (!name) return;
    
    if (editingTaskId) {
        const task = AppState.tasks.find(t => t.id === editingTaskId);
        if (task) {
            task.name = name;
            task.category = document.getElementById('taskCategory').value;
            task.priority = document.getElementById('taskPriority').value;
            showNotification('Task updated', 'gold');
        }
    } else {
        const task = {
            id: Date.now(),
            name,
            category: document.getElementById('taskCategory').value,
            priority: document.getElementById('taskPriority').value,
            status: 'todo'
        };
        AppState.tasks.push(task);
        showNotification('Task created', 'gold');
    }
    
    saveState();
    renderTasks();
    window.closeModal('taskModal');
    document.getElementById('taskName').value = '';
    editingTaskId = null;
};

function renderTasks() {
    const todoList = document.getElementById('todoList');
    const progressList = document.getElementById('progressList');
    const doneList = document.getElementById('doneList');
    
    if (!todoList) return;
    
    todoList.innerHTML = '';
    progressList.innerHTML = '';
    doneList.innerHTML = '';
    
    let counts = { todo: 0, progress: 0, done: 0 };
    
    AppState.tasks.forEach(task => {
        counts[task.status]++;
        const el = document.createElement('div');
        el.className = 'task-card';
        
        const isDone = task.status === 'done';
        
        el.innerHTML = `
            <div class="task-check ${isDone ? 'checked' : ''}" onclick="toggleTaskDone(${task.id})"></div>
            <div class="task-content">
                <div class="task-title" style="${isDone ? 'text-decoration:line-through; opacity:0.5;' : ''}">${task.name}</div>
                <div class="task-meta">
                    <span class="task-badge">${task.category}</span>
                    <span class="task-badge" style="color:var(--gold-primary)">${task.priority}</span>
                </div>
            </div>
            <div style="display:flex; gap:5px">
                <button class="btn-sm btn-outline" onclick="editTask(${task.id})">✎</button>
                ${task.status !== 'todo' && !isDone ? `<button class="btn-sm btn-outline" onclick="moveTask(${task.id}, -1)">←</button>` : ''}
                ${task.status !== 'done' && task.status !== 'progress' ? `<button class="btn-sm btn-outline" onclick="moveTask(${task.id}, 1)">→</button>` : ''}
                <button class="btn-sm btn-danger" onclick="deleteTask(${task.id})">×</button>
            </div>
        `;
        
        if (task.status === 'todo') todoList.appendChild(el);
        if (task.status === 'progress') progressList.appendChild(el);
        if (task.status === 'done') doneList.appendChild(el);
    });
    
    document.getElementById('todoCount').textContent = counts.todo;
    document.getElementById('progressCount').textContent = counts.progress;
    document.getElementById('doneCount').textContent = counts.done;
}

window.toggleTaskDone = (id) => {
    const task = AppState.tasks.find(t => t.id === id);
    if (!task) return;
    
    if (task.status === 'done') {
        task.status = 'todo';
    } else {
        task.status = 'done';
        addXP(15);
        logActivity('task', `Completed Task: ${task.name}`, 15);
    }
    saveState();
    renderTasks();
};

window.moveTask = (id, dir) => {
    const task = AppState.tasks.find(t => t.id === id);
    if (!task) return;
    
    const states = ['todo', 'progress', 'done'];
    const currentIdx = states.indexOf(task.status);
    const newIdx = currentIdx + dir;
    
    if (newIdx >= 0 && newIdx < states.length) {
        task.status = states[newIdx];
        if (task.status === 'done') {
            addXP(15);
            logActivity('task', `Completed Task: ${task.name}`, 15);
        }
        saveState();
        renderTasks();
    }
};

window.deleteTask = (id) => {
    AppState.tasks = AppState.tasks.filter(t => t.id !== id);
    saveState();
    renderTasks();
};

// --- POMODORO ---
function initPomodoro() {
    // Initialize settings if missing
    if (!AppState.settings.pomodoro) {
        AppState.settings.pomodoro = {
            work: 25,
            short: 5,
            long: 15,
            longBreakAfter: 4
        };
    }

    // Bind inputs to settings and UI
    const bindSlider = (id, key) => {
        const input = document.getElementById(id);
        const label = document.getElementById(id + 'Val');
        if (!input || !label) return;

        // Set initial value from state
        input.value = AppState.settings.pomodoro[key];
        label.textContent = AppState.settings.pomodoro[key];

        // Listen for changes
        input.addEventListener('change', (e) => {
            const val = parseInt(e.target.value);
            label.textContent = val;
            AppState.settings.pomodoro[key] = val;
            saveState();
            
            // If currently in this mode and not running, update timer immediately
            const modeMap = {
                'work': 'work',
                'short': 'short',
                'long': 'long'
            };
            
            if (!AppState.pomoState.isRunning && AppState.pomoState.mode === modeMap[key]) {
                 AppState.pomoState.time = val * 60;
                 AppState.pomoState.totalTime = AppState.pomoState.time;
                 updatePomoDisplay();
            }
        });
    };

    bindSlider('workDuration', 'work');
    bindSlider('shortBreak', 'short');
    bindSlider('longBreak', 'long');
    bindSlider('longBreakAfter', 'longBreakAfter');

    // Initialize display
    resetPomodoro();
    
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const mode = btn.dataset.mode;
            AppState.pomoState.mode = mode;
            resetPomodoro();
        });
    });
}

window.togglePomodoro = () => {
    const btn = document.getElementById('pomodoroStartBtn');
    
    if (AppState.pomoState.isRunning) {
        clearInterval(AppState.pomoState.interval);
        AppState.pomoState.isRunning = false;
        btn.textContent = "Start";
        btn.classList.remove('btn-outline');
        btn.classList.add('btn-gold');
        saveState();
    } else {
        AppState.pomoState.isRunning = true;
        btn.textContent = "Pause";
        btn.classList.remove('btn-gold');
        btn.classList.add('btn-outline');
        
        AppState.pomoState.interval = setInterval(() => {
            AppState.pomoState.time--;
            updatePomoDisplay();
            saveState();
            
            if (AppState.pomoState.time <= 0) {
                clearInterval(AppState.pomoState.interval);
                AppState.pomoState.isRunning = false;
                btn.textContent = "Start";
                btn.classList.remove('btn-outline');
                btn.classList.add('btn-gold');
                playNotificationSound();
                showNotification("Timer Complete", "gold");
                
                if (AppState.pomoState.mode === 'work') {
                    AppState.pomodorosToday++;
                    AppState.totalPomodoros++;
                    AppState.lastPomodoroDate = new Date().toISOString().split('T')[0];
                    addXP(25);
                    logActivity('pomodoro', 'Pomodoro Session', 25);
                }
                saveState();
                updateStatsDisplay();
            }
        }, 1000);
    }
};

window.resetPomodoro = () => {
    clearInterval(AppState.pomoState.interval);
    AppState.pomoState.isRunning = false;
    
    // Ensure settings exist
    const settings = AppState.settings.pomodoro || { work: 25, short: 5, long: 15 };
    
    AppState.pomoState.time = settings[AppState.pomoState.mode] * 60;
    AppState.pomoState.totalTime = AppState.pomoState.time;
    updatePomoDisplay();
    saveState();
    
    const btn = document.getElementById('pomodoroStartBtn');
    if (btn) {
        btn.textContent = "Start";
        btn.classList.remove('btn-outline');
        btn.classList.add('btn-gold');
    }
};

function updatePomoDisplay() {
    const m = Math.floor(AppState.pomoState.time / 60).toString().padStart(2, '0');
    const s = (AppState.pomoState.time % 60).toString().padStart(2, '0');
    const el = document.getElementById('pomodoroTime');
    if (el) el.textContent = `${m}:${s}`;
    
    // Ring progress
    const ring = document.getElementById('pomodoroRing');
    if (ring) {
        const total = AppState.pomoState.totalTime || (25 * 60);
        const circumference = 2 * Math.PI * 90;
        const offset = circumference - ((AppState.pomoState.time / total) * circumference);
        ring.style.strokeDasharray = `${circumference} ${circumference}`;
        ring.style.strokeDashoffset = offset;
    }
}

// --- BREATHING ---
function initBreathing() {
    // Populate breathing patterns from config + custom patterns
    const patternSelect = document.getElementById('breathingPattern');
    if (patternSelect) {
        patternSelect.innerHTML = '';
        
        // Add CONFIG patterns
        if (typeof CONFIG !== 'undefined' && CONFIG.BREATHING_PATTERNS) {
            CONFIG.BREATHING_PATTERNS.forEach(pattern => {
                const option = document.createElement('option');
                option.value = pattern.value;
                option.textContent = pattern.name;
                patternSelect.appendChild(option);
            });
        }
        
        // Add custom patterns
        AppState.breathingPatterns.forEach(pattern => {
            const option = document.createElement('option');
            option.value = pattern.value;
            option.textContent = pattern.name + ' (Custom)';
            patternSelect.appendChild(option);
        });
    }
}

window.startBreathingExercise = () => {
    document.getElementById('breathingOverlay').classList.add('active');
    // Don't auto-start, let user click Start button
};

window.closeBreathingExercise = () => {
    stopBreathingLoop();
    document.getElementById('breathingOverlay').classList.remove('active');
    
    // If in flow mode, return to flow runner
    if (AppState.flowBreathingMode) {
        AppState.flowBreathingMode = false;
        // Let user decide when to continue
    }
};

window.startBreathingLoop = () => {
    const startBtn = document.getElementById('breathingStartBtn');
    const stopBtn = document.getElementById('breathingStopBtn');
    if (startBtn) startBtn.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'block';
    AppState.breathingActive = true;
    runBreathingLoop();
};

window.stopBreathingLoop = () => {
    const startBtn = document.getElementById('breathingStartBtn');
    const stopBtn = document.getElementById('breathingStopBtn');
    const text = document.getElementById('breathingText');
    const circle = document.querySelector('.breathing-circle');
    const timerDisplay = document.getElementById('breathingTimer');
    const instructionDisplay = document.getElementById('breathingInstruction');
    const particlesContainer = document.getElementById('breathingParticles');
    
    AppState.breathingActive = false;
    clearTimeout(AppState.breathingInterval);
    if (AppState.breathingTimerInterval) clearInterval(AppState.breathingTimerInterval);
    
    // Reset display
    if (text) text.textContent = 'Ready';
    if (timerDisplay) timerDisplay.textContent = '';
    if (instructionDisplay) instructionDisplay.textContent = 'Select a pattern and press Start';
    if (circle) {
        circle.style.transform = 'scale(1)';
        circle.style.opacity = '0.7';
        circle.style.background = 'radial-gradient(circle, rgba(212, 175, 55, 0.3), rgba(138, 43, 226, 0.2))';
        circle.style.boxShadow = '0 0 50px rgba(212, 175, 55, 0.6), 0 0 100px rgba(138, 43, 226, 0.4)';
    }
    if (particlesContainer) particlesContainer.innerHTML = '';
    
    if (startBtn) startBtn.style.display = 'block';
    if (stopBtn) stopBtn.style.display = 'none';
};

function createParticles(color) {
    const container = document.getElementById('breathingParticles');
    if (!container || !AppState.breathingActive) return;
    
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'breathing-particle';
        
        const size = Math.random() * 6 + 3;
        const left = Math.random() * 100;
        const delay = Math.random() * 2;
        const duration = Math.random() * 4 + 6;
        
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.left = left + '%';
        particle.style.animationDelay = delay + 's';
        particle.style.animationDuration = duration + 's';
        
        if (color === 'gold') {
            particle.style.background = `radial-gradient(circle, rgba(255, 215, 0, 0.9), rgba(255, 165, 0, 0.6))`;
            particle.style.boxShadow = `0 0 ${size * 3}px rgba(255, 215, 0, 0.8), 0 0 ${size * 5}px rgba(212, 175, 55, 0.5)`;
        } else if (color === 'cyan') {
            particle.style.background = `radial-gradient(circle, rgba(0, 255, 255, 0.9), rgba(0, 200, 255, 0.6))`;
            particle.style.boxShadow = `0 0 ${size * 3}px rgba(0, 255, 255, 0.8), 0 0 ${size * 5}px rgba(0, 150, 255, 0.5)`;
        }
        
        container.appendChild(particle);
        
        setTimeout(() => {
            if (particle.parentNode) particle.remove();
        }, duration * 1000 + delay * 1000);
    }
}

function runBreathingLoop() {
    const text = document.getElementById('breathingText');
    const circle = document.querySelector('.breathing-circle');
    const patternSelect = document.getElementById('breathingPattern');
    const timerDisplay = document.getElementById('breathingTimer');
    const instructionDisplay = document.getElementById('breathingInstruction');
    if (!text || !circle) return;
    
    // Parse breathing pattern from CONFIG + custom patterns
    let pattern = { inhale: 4, hold1: 4, exhale: 4, hold2: 4 }; // Default fallback
    let instructions = {}; // Store instructions if available
    
    if (patternSelect) {
        const selectedValue = patternSelect.value;
        
        // Check CONFIG patterns first
        if (typeof CONFIG !== 'undefined' && CONFIG.BREATHING_PATTERNS) {
            const configPattern = CONFIG.BREATHING_PATTERNS.find(p => p.value === selectedValue);
            if (configPattern && configPattern.timing) {
                pattern = configPattern.timing;
                instructions = configPattern.instructions || {};
            }
        }
        
        // Check custom patterns
        const customPattern = AppState.breathingPatterns.find(p => p.value === selectedValue);
        if (customPattern && customPattern.timing) {
            pattern = customPattern.timing;
            instructions = customPattern.instructions || {};
        }
    }
    
    let phase = 'inhale';
    let timeLeft = pattern.inhale;
    let timerInterval;
    
    // Store timer interval for cleanup
    AppState.breathingTimerInterval = null;
    
    const updateTimer = () => {
        if (timerDisplay) {
            timerDisplay.textContent = timeLeft > 0 ? timeLeft : '';
        }
    };
    
    const loop = () => {
        if (!document.getElementById('breathingOverlay').classList.contains('active') || !AppState.breathingActive) {
            if (timerInterval) clearInterval(timerInterval);
            return;
        }
        
        if (timerInterval) clearInterval(timerInterval);
        
        if (phase === 'inhale') {
            text.textContent = "Inhale";
            if (instructionDisplay) instructionDisplay.textContent = instructions.inhale || '';
            circle.style.transform = "scale(2.5)";
            circle.style.opacity = "1";
            circle.style.background = "radial-gradient(circle, rgba(255, 215, 0, 0.6), rgba(212, 175, 55, 0.4))";
            circle.style.boxShadow = "0 0 60px rgba(255, 215, 0, 0.8), 0 0 120px rgba(212, 175, 55, 0.6), inset 0 0 40px rgba(255, 215, 0, 0.3)";
            createParticles('gold');
            timeLeft = pattern.inhale;
            updateTimer();
            
            timerInterval = setInterval(() => {
                timeLeft--;
                updateTimer();
                if (timeLeft <= 0) clearInterval(timerInterval);
            }, 1000);
            AppState.breathingTimerInterval = timerInterval;
            
            AppState.breathingInterval = setTimeout(() => { 
                phase = pattern.hold1 > 0 ? 'hold1' : 'exhale'; 
                loop(); 
            }, pattern.inhale * 1000);
            
        } else if (phase === 'hold1' && pattern.hold1 > 0) {
            text.textContent = "Hold";
            if (instructionDisplay) instructionDisplay.textContent = instructions.hold1 || '';
            circle.style.background = "radial-gradient(circle, rgba(0, 255, 255, 0.5), rgba(0, 150, 255, 0.4))";
            circle.style.boxShadow = "0 0 60px rgba(0, 255, 255, 0.8), 0 0 120px rgba(0, 150, 255, 0.6), inset 0 0 40px rgba(0, 255, 255, 0.3)";
            createParticles('cyan');
            timeLeft = pattern.hold1;
            updateTimer();
            
            timerInterval = setInterval(() => {
                timeLeft--;
                updateTimer();
                if (timeLeft <= 0) clearInterval(timerInterval);
            }, 1000);
            AppState.breathingTimerInterval = timerInterval;
            
            AppState.breathingInterval = setTimeout(() => { phase = 'exhale'; loop(); }, pattern.hold1 * 1000);
            
        } else if (phase === 'exhale') {
            text.textContent = "Exhale";
            if (instructionDisplay) instructionDisplay.textContent = instructions.exhale || '';
            circle.style.transform = "scale(1)";
            circle.style.opacity = "0.8";
            circle.style.background = "radial-gradient(circle, rgba(255, 215, 0, 0.4), rgba(184, 134, 11, 0.3))";
            circle.style.boxShadow = "0 0 50px rgba(255, 215, 0, 0.6), 0 0 100px rgba(212, 175, 55, 0.4), inset 0 0 30px rgba(255, 215, 0, 0.2)";
            createParticles('gold');
            timeLeft = pattern.exhale;
            updateTimer();
            
            timerInterval = setInterval(() => {
                timeLeft--;
                updateTimer();
                if (timeLeft <= 0) clearInterval(timerInterval);
            }, 1000);
            AppState.breathingTimerInterval = timerInterval;
            
            AppState.breathingInterval = setTimeout(() => { 
                phase = pattern.hold2 > 0 ? 'hold2' : 'inhale'; 
                loop(); 
            }, pattern.exhale * 1000);
            
        } else if (phase === 'hold2' && pattern.hold2 > 0) {
            text.textContent = "Hold";
            if (instructionDisplay) instructionDisplay.textContent = instructions.hold2 || '';
            circle.style.background = "radial-gradient(circle, rgba(0, 255, 255, 0.5), rgba(0, 150, 255, 0.4))";
            circle.style.boxShadow = "0 0 60px rgba(0, 255, 255, 0.8), 0 0 120px rgba(0, 150, 255, 0.6), inset 0 0 40px rgba(0, 255, 255, 0.3)";
            createParticles('cyan');
            timeLeft = pattern.hold2;
            updateTimer();
            
            timerInterval = setInterval(() => {
                timeLeft--;
                updateTimer();
                if (timeLeft <= 0) clearInterval(timerInterval);
            }, 1000);
            AppState.breathingTimerInterval = timerInterval;
            
            AppState.breathingInterval = setTimeout(() => { phase = 'inhale'; loop(); }, pattern.hold2 * 1000);
        }
    };
    loop();
}

// --- BREATHING PATTERN MANAGER ---
window.openBreathingPatternManager = () => {
    renderCustomPatterns();
    window.openModal('breathingPatternModal');
};

window.closeBreathingPatternModal = () => {
    // Refresh flow builder if open
    if (document.getElementById('flowBuilderModal').classList.contains('active')) {
        renderFlowBuilderSteps();
    }
    window.closeModal('breathingPatternModal');
};

function renderCustomPatterns() {
    const list = document.getElementById('customPatternsList');
    if (!list) return;
    
    if (AppState.breathingPatterns.length === 0) {
        list.innerHTML = '<p style="color:var(--text-muted); text-align:center;">No custom patterns yet. Create one above!</p>';
        return;
    }
    
    list.innerHTML = '';
    AppState.breathingPatterns.forEach((pattern, index) => {
        const item = document.createElement('div');
        item.className = 'component-item';
        item.style.marginBottom = '10px';
        
        const timing = pattern.timing;
        const timingStr = `${timing.inhale}-${timing.hold1}-${timing.exhale}-${timing.hold2}`;
        
        item.innerHTML = `
            <div style="flex:1;">
                <div style="font-weight:600; color:var(--gold-primary); margin-bottom:5px;">${pattern.name}</div>
                <div style="font-size:0.85rem; color:var(--text-muted);">Pattern: ${timingStr}</div>
            </div>
            <div style="display:flex; gap:10px;">
                <button class="btn-sm btn-outline" onclick="editBreathingPattern(${index})">Edit</button>
                <button class="btn-sm btn-danger" onclick="deleteBreathingPattern(${index})">Delete</button>
            </div>
        `;
        
        list.appendChild(item);
    });
}

window.saveBreathingPattern = () => {
    const name = document.getElementById('breathPatternName').value.trim();
    if (!name) return showNotification('Please enter a pattern name', 'error');
    
    const inhale = parseInt(document.getElementById('breathInhale').value) || 0;
    const hold1 = parseInt(document.getElementById('breathHold1').value) || 0;
    const exhale = parseInt(document.getElementById('breathExhale').value) || 0;
    const hold2 = parseInt(document.getElementById('breathHold2').value) || 0;
    
    const instructInhale = document.getElementById('breathInstructInhale').value.trim();
    const instructHold1 = document.getElementById('breathInstructHold1').value.trim();
    const instructExhale = document.getElementById('breathInstructExhale').value.trim();
    const instructHold2 = document.getElementById('breathInstructHold2').value.trim();
    
    const pattern = {
        name,
        value: `custom-${Date.now()}`,
        timing: { inhale, hold1, exhale, hold2 },
        description: `Custom pattern: ${inhale}-${hold1}-${exhale}-${hold2}`,
        instructions: {
            inhale: instructInhale,
            hold1: instructHold1,
            exhale: instructExhale,
            hold2: instructHold2
        }
    };
    
    if (window.editingBreathPatternIndex !== undefined && window.editingBreathPatternIndex !== null) {
        // Edit existing
        AppState.breathingPatterns[window.editingBreathPatternIndex] = pattern;
        window.editingBreathPatternIndex = null;
        showNotification('Pattern updated', 'gold');
    } else {
        // Add new
        AppState.breathingPatterns.push(pattern);
        showNotification('Pattern added', 'gold');
    }
    
    saveState();
    renderCustomPatterns();
    initBreathing(); // Refresh breathing overlay dropdown
    
    // Refresh flow builder if open
    if (document.getElementById('flowBuilderModal').classList.contains('active')) {
        renderFlowBuilderSteps();
    }
    
    clearBreathingForm();
    
    // Auto-close modal after successful save
    setTimeout(() => {
        window.closeModal('breathingPatternModal');
    }, 500);
};

window.editBreathingPattern = (index) => {
    const pattern = AppState.breathingPatterns[index];
    document.getElementById('breathPatternName').value = pattern.name;
    document.getElementById('breathInhale').value = pattern.timing.inhale;
    document.getElementById('breathHold1').value = pattern.timing.hold1;
    document.getElementById('breathExhale').value = pattern.timing.exhale;
    document.getElementById('breathHold2').value = pattern.timing.hold2;
    
    const instr = pattern.instructions || {};
    document.getElementById('breathInstructInhale').value = instr.inhale || '';
    document.getElementById('breathInstructHold1').value = instr.hold1 || '';
    document.getElementById('breathInstructExhale').value = instr.exhale || '';
    document.getElementById('breathInstructHold2').value = instr.hold2 || '';
    
    window.editingBreathPatternIndex = index;
};

window.deleteBreathingPattern = (index) => {
    if (confirm('Delete this breathing pattern?')) {
        AppState.breathingPatterns.splice(index, 1);
        saveState();
        renderCustomPatterns();
        initBreathing();
        showNotification('Pattern deleted', 'normal');
    }
};

function clearBreathingForm() {
    document.getElementById('breathPatternName').value = '';
    document.getElementById('breathInhale').value = '4';
    document.getElementById('breathHold1').value = '4';
    document.getElementById('breathExhale').value = '4';
    document.getElementById('breathHold2').value = '4';
    document.getElementById('breathInstructInhale').value = '';
    document.getElementById('breathInstructHold1').value = '';
    document.getElementById('breathInstructExhale').value = '';
    document.getElementById('breathInstructHold2').value = '';
    window.editingBreathPatternIndex = null;
}

// --- FLOW BREATHING SUPPORT ---
window.startFlowBreathing = () => {
    const step = runnerState.flow.steps[runnerState.stepIndex];
    if (!step || step.type !== 'breathing') return;
    
    // Set the pattern in the overlay
    const patternSelect = document.getElementById('breathingPattern');
    if (patternSelect && step.breathingPattern) {
        patternSelect.value = step.breathingPattern;
    }
    
    // Open overlay and auto-start
    AppState.flowBreathingMode = true;
    document.getElementById('breathingOverlay').classList.add('active');
    startBreathingLoop();
};

// --- JOURNAL ---
function initJournal() {
    renderJournal();
}

window.openJournalEntry = () => {
    // Clear form
    document.getElementById('journalTitle').value = '';
    document.getElementById('journalContent').value = '';
    document.getElementById('journalTags').value = '';
    
    // Populate Related To dropdown
    const relatedSelect = document.getElementById('journalRelated');
    if (relatedSelect) {
        relatedSelect.innerHTML = '<option value="">None</option>';
        
        // Add flows
        AppState.flows.forEach(flow => {
            relatedSelect.innerHTML += `<option value="flow-${flow.id}">\u{1F30A} ${flow.title}</option>`;
        });
        
        // Add workings
        AppState.workings.forEach(working => {
            relatedSelect.innerHTML += `<option value="working-${working.id}">\u2727 ${working.name}</option>`;
        });
    }
    
    // Populate mood selector
    const moodOptions = document.querySelectorAll('input[name="journalMood"]');
    moodOptions.forEach(opt => opt.checked = false);
    
    window.openModal('journalModal');
};

window.saveJournalEntry = () => {
    const title = document.getElementById('journalTitle').value;
    const content = document.getElementById('journalContent').value;
    const relatedTo = document.getElementById('journalRelated')?.value || '';
    
    if (!content) return;
    
    const entry = {
        id: Date.now(),
        date: new Date().toISOString(),
        title: title || "Untitled Entry",
        content,
        mood: document.querySelector('input[name="journalMood"]:checked')?.value || 'neutral',
        tags: document.getElementById('journalTags').value,
        relatedTo: relatedTo // Store the related flow/working
    };
    
    AppState.journal.unshift(entry);
    saveState();
    renderJournal();
    window.closeModal('journalModal');
    document.getElementById('journalContent').value = '';
    document.getElementById('journalTitle').value = '';
    addXP(15);
    logActivity('working', 'Journal Entry', 15);
};

function renderJournal() {
    const list = document.getElementById('journalList');
    if (!list) return;
    
    list.innerHTML = '';
    if (AppState.journal.length === 0) {
        if (document.getElementById('noJournal')) document.getElementById('noJournal').style.display = 'flex';
        return;
    }
    if (document.getElementById('noJournal')) document.getElementById('noJournal').style.display = 'none';
    
    AppState.journal.forEach(entry => {
        const el = document.createElement('div');
        el.className = 'card';
        el.style.marginBottom = '15px';
        
        // Parse relatedTo to display name
        let relatedLabel = '';
        if (entry.relatedTo) {
            const [type, id] = entry.relatedTo.split('-');
            if (type === 'flow') {
                const flow = AppState.flows.find(f => f.id == id);
                if (flow) relatedLabel = `<span style="font-size:0.8rem; color:var(--accent-blue);">🌊 Related: ${flow.title}</span>`;
            } else if (type === 'working') {
                const working = AppState.workings.find(w => w.id == id);
                if (working) relatedLabel = `<span style="font-size:0.8rem; color:var(--accent-purple);">✧ Related: ${working.name}</span>`;
            }
        }
        
        el.innerHTML = `
            <div class="card-header">
                <h3>${entry.title}</h3>
                <span style="font-size:0.8rem; color:#888">${new Date(entry.date).toLocaleDateString()}</span>
            </div>
            <div class="card-content">
                <p>${entry.content}</p>
                <div style="margin-top:10px; display:flex; gap:15px; flex-wrap:wrap;">
                    <span style="font-size:0.8rem; color:var(--gold-dim)">Mood: ${entry.mood}</span>
                    ${relatedLabel}
                </div>
            </div>
        `;
        list.appendChild(el);
    });
}

// --- MASTERY ---
function initMastery() {
    renderMastery();
}

window.openMasteryModal = () => {
    // Reset form
    document.getElementById('masteryName').value = '';
    document.getElementById('masteryGoal').value = '10';
    document.getElementById('customHours').value = '';
    document.getElementById('customHoursGroup').style.display = 'none';
    window.openModal('masteryModal');
};

window.toggleCustomGoal = () => {
    const select = document.getElementById('masteryGoal');
    const customGroup = document.getElementById('customHoursGroup');
    if (select && customGroup) {
        customGroup.style.display = select.value === 'custom' ? 'block' : 'none';
    }
};

window.toggleMasteryInput = (type) => {
    const label = document.getElementById('masteryGoalLabel');
    if (label) label.textContent = type === 'hours' ? 'Goal (Hours)' : 'Goal (Reps/Count)';
};

window.saveMastery = () => {
    const name = document.getElementById('masteryName').value;
    if (!name) return showNotification('Please enter a goal name', 'error');
    
    const type = document.querySelector('input[name="masteryType"]:checked').value;
    let goal;
    
    if (document.getElementById('masteryGoal').value === 'custom') {
        goal = parseInt(document.getElementById('customHours').value);
        if (!goal || goal <= 0) return showNotification('Please enter a valid custom goal number', 'error');
    } else {
        goal = parseInt(document.getElementById('masteryGoal').value);
    }
        
    const item = {
        id: Date.now(),
        name,
        type,
        goalHours: goal, // Keeping variable name for compatibility, but it means "Goal Units"
        currentHours: 0,
        color: document.querySelector('input[name="masteryColor"]:checked').value
    };
    
    AppState.mastery.push(item);
    saveState();
    renderMastery();
    window.closeModal('masteryModal');
    showNotification('Mastery goal created!', 'gold');
};

function renderMastery() {
    const grid = document.getElementById('masteryGrid');
    const completedGrid = document.getElementById('masteryCompletedGrid');
    if (!grid) return;
    grid.innerHTML = '';
    if (completedGrid) completedGrid.innerHTML = '';
    
    const activeMastery = AppState.mastery.filter(m => m.currentHours < m.goalHours);
    const completedMastery = AppState.mastery.filter(m => m.currentHours >= m.goalHours);
    
    if (activeMastery.length === 0) {
        if (document.getElementById('noMastery')) document.getElementById('noMastery').style.display = 'flex';
    } else {
        if (document.getElementById('noMastery')) document.getElementById('noMastery').style.display = 'none';
    }
    
    // Show/hide completed section
    const completedSection = document.getElementById('masteryCompletedSection');
    if (completedSection) {
        completedSection.style.display = completedMastery.length > 0 ? 'block' : 'none';
    }
    
    activeMastery.forEach((m, index) => {
        const el = document.createElement('div');
        el.className = 'mastery-card-enhanced';
        el.style.setProperty('--card-color', m.color);
        el.draggable = true;
        el.dataset.id = m.id;
        
        const pct = Math.min((m.currentHours / m.goalHours) * 100, 100);
        const unitLabel = m.type === 'reps' ? 'Reps' : 'Hours';
        
        el.innerHTML = `
            <div class="drag-handle" style="position:absolute; top:5px; left:50%; transform:translateX(-50%);">⋮⋮</div>
            <div class="mastery-header">
                <span class="mastery-title">${m.name}</span>
                <span style="color:${m.color}; font-weight:bold;">${Math.round(pct)}%</span>
            </div>
            <div class="mastery-stats">
                <span>${parseFloat(m.currentHours).toFixed(1)} / ${m.goalHours} ${unitLabel}</span>
            </div>
            <div class="mastery-progress-bg">
                <div class="mastery-progress-fill" style="width:${pct}%"></div>
            </div>
            <div style="display:flex; gap:10px; margin-top:15px;">
                <button class="btn-sm btn-outline" style="flex:1; border-color:rgba(255,255,255,0.1);" onclick="openMasteryLogModal(${m.id})">Log</button>
                <button class="btn-sm btn-outline" style="width:40px; border-color:rgba(255,255,255,0.1);" onclick="editMastery(${m.id})">✎</button>
                <button class="btn-sm btn-danger" style="width:40px;" onclick="deleteMastery(${m.id})">×</button>
            </div>
        `;
        
        // Drag events
        el.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', m.id);
            el.classList.add('dragging');
        });
        el.addEventListener('dragend', () => el.classList.remove('dragging'));
        el.addEventListener('dragover', (e) => {
            e.preventDefault();
            el.classList.add('drag-over');
        });
        el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
        el.addEventListener('drop', (e) => {
            e.preventDefault();
            el.classList.remove('drag-over');
            const fromId = parseInt(e.dataTransfer.getData('text/plain'));
            const toId = m.id;
            if (fromId !== toId) {
                const fromIndex = AppState.mastery.findIndex(x => x.id === fromId);
                const toIndex = AppState.mastery.findIndex(x => x.id === toId);
                const [moved] = AppState.mastery.splice(fromIndex, 1);
                AppState.mastery.splice(toIndex, 0, moved);
                saveState();
                renderMastery();
                showNotification('Mastery order updated', 'normal');
            }
        });
        
        grid.appendChild(el);
    });
    
    // Render completed mastery
    completedMastery.forEach(m => {
        if (!completedGrid) return;
        const el = document.createElement('div');
        el.className = 'mastery-card-enhanced completed';
        el.style.setProperty('--card-color', m.color);
        
        const pct = 100;
        const unitLabel = m.type === 'reps' ? 'Reps' : 'Hours';
        
        el.innerHTML = `
            <div style="position:absolute; top:10px; right:10px; font-size:1.5rem;">🏆</div>
            <div class="mastery-header">
                <span class="mastery-title">${m.name}</span>
                <span style="color:var(--gold-primary); font-weight:bold;">COMPLETE!</span>
            </div>
            <div class="mastery-stats">
                <span>${parseFloat(m.currentHours).toFixed(1)} / ${m.goalHours} ${unitLabel}</span>
            </div>
            <div class="mastery-progress-bg">
                <div class="mastery-progress-fill" style="width:${pct}%"></div>
            </div>
            <div style="display:flex; gap:10px; margin-top:15px;">
                <button class="btn-sm btn-outline" style="flex:1; border-color:rgba(255,255,255,0.1);" onclick="deleteMastery(${m.id})">Archive</button>
            </div>
        `;
        completedGrid.appendChild(el);
    });
}

window.editMastery = (id) => {
    const m = AppState.mastery.find(x => x.id === id);
    if (!m) return;
    
    // Reuse the creation modal but populate it
    const modal = document.getElementById('masteryModal');
    if (!modal) return;
    
    document.getElementById('masteryName').value = m.name;
    
    // Handle Type Radio
    const typeRadio = document.querySelector(`input[name="masteryType"][value="${m.type}"]`);
    if (typeRadio) typeRadio.checked = true;
    
    // Handle Goal
    const goalSelect = document.getElementById('masteryGoal');
    const customInput = document.getElementById('customHours');
    const customGroup = document.getElementById('customHoursGroup');
    
    // Check if goal matches one of the presets
    const preset = Array.from(goalSelect.options).find(opt => opt.value == m.goalHours);
    if (preset && preset.value !== 'custom') {
        goalSelect.value = m.goalHours;
        customGroup.style.display = 'none';
    } else {
        goalSelect.value = 'custom';
        customGroup.style.display = 'block';
        customInput.value = m.goalHours;
    }
    
    // Handle Color
    const colorRadio = document.querySelector(`input[name="masteryColor"][value="${m.color}"]`);
    if (colorRadio) colorRadio.checked = true;
    
    // Change Save Button to Update
    const saveBtn = modal.querySelector('.btn-gold');
    saveBtn.textContent = 'Update Goal';
    saveBtn.onclick = () => updateMastery(id);
    
    window.openModal('masteryModal');
};

window.updateMastery = (id) => {
    const m = AppState.mastery.find(x => x.id === id);
    if (!m) return;
    
    const name = document.getElementById('masteryName').value;
    if (!name) return showNotification('Please enter a goal name', 'error');
    
    const type = document.querySelector('input[name="masteryType"]:checked').value;
    let goal;
    
    if (document.getElementById('masteryGoal').value === 'custom') {
        goal = parseInt(document.getElementById('customHours').value);
        if (!goal || goal <= 0) return showNotification('Please enter a valid custom goal number', 'error');
    } else {
        goal = parseInt(document.getElementById('masteryGoal').value);
    }
        
    m.name = name;
    m.type = type;
    m.goalHours = goal;
    m.color = document.querySelector('input[name="masteryColor"]:checked').value;
    
    saveState();
    renderMastery();
    window.closeModal('masteryModal');
    showNotification('Mastery goal updated!', 'gold');
    
    // Reset button for next time
    const modal = document.getElementById('masteryModal');
    const saveBtn = modal.querySelector('.btn-gold');
    saveBtn.textContent = 'Create Goal';
    saveBtn.onclick = window.saveMastery;
};

window.deleteMastery = (id) => {
    if (confirm("Delete this mastery goal? Progress will be lost.")) {
        AppState.mastery = AppState.mastery.filter(m => m.id !== id);
        saveState();
        renderMastery();
    }
};

window.openMasteryLogModal = (id) => {
    const m = AppState.mastery.find(x => x.id === id);
    if (!m) return;

    const modalId = 'masteryLogModal';
    let modal = document.getElementById(modalId);
    const unitLabel = m.type === 'reps' ? 'Reps' : 'Time';
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';
        modal.style.zIndex = '2000';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Log Mastery: <span id="masteryLogName"></span></h2>
                    <button class="modal-close" onclick="window.closeModal('${modalId}')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group" id="masteryTimeInputGroup" style="display:none;">
                        <label>Time Spent</label>
                        <div style="display:flex; gap:10px; margin-bottom:10px;">
                            <div style="flex:1;">
                                <label style="font-size:0.8rem; color:var(--text-muted);">Hours</label>
                                <input type="number" id="masteryLogHours" class="input" value="0" min="0" step="1">
                            </div>
                            <div style="flex:1;">
                                <label style="font-size:0.8rem; color:var(--text-muted);">Minutes</label>
                                <input type="number" id="masteryLogMinutes" class="input" value="0" min="0" max="59" step="1">
                            </div>
                        </div>
                        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px;">
                            <button class="btn-sm btn-outline quick-add-btn" onclick="quickAddTime(5)">+5m</button>
                            <button class="btn-sm btn-outline quick-add-btn" onclick="quickAddTime(15)">+15m</button>
                            <button class="btn-sm btn-outline quick-add-btn" onclick="quickAddTime(30)">+30m</button>
                            <button class="btn-sm btn-outline quick-add-btn" onclick="quickAddTime(60)">+1h</button>
                        </div>
                    </div>
                    <div class="form-group" id="masteryRepsInputGroup" style="display:none;">
                        <label>Reps/Count</label>
                        <input type="number" id="masteryLogReps" class="input" value="1" step="1">
                        <p style="font-size:0.7rem; color:#888; margin-top:5px;">Use negative numbers to subtract.</p>
                    </div>
                    <div class="form-group">
                        <label>Notes (Optional)</label>
                        <textarea id="masteryLogNotes" class="input" rows="3"></textarea>
                    </div>
                    <div class="form-actions">
                        <button class="btn btn-gold" id="confirmMasteryLog">Log Session</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    const nameEl = modal.querySelector('#masteryLogName');
    if (nameEl) nameEl.textContent = m.name;
    
    // Show correct input group
    const timeGroup = modal.querySelector('#masteryTimeInputGroup');
    const repsGroup = modal.querySelector('#masteryRepsInputGroup');
    if (m.type === 'hours') {
        if (timeGroup) timeGroup.style.display = 'block';
        if (repsGroup) repsGroup.style.display = 'none';
        const hoursInput = modal.querySelector('#masteryLogHours');
        const minutesInput = modal.querySelector('#masteryLogMinutes');
        if (hoursInput) hoursInput.value = 0;
        if (minutesInput) minutesInput.value = 0;
    } else {
        if (timeGroup) timeGroup.style.display = 'none';
        if (repsGroup) repsGroup.style.display = 'block';
        const repsInput = modal.querySelector('#masteryLogReps');
        if (repsInput) repsInput.value = 1;
    }
    
    const notesEl = modal.querySelector('#masteryLogNotes');
    if (notesEl) notesEl.value = '';
    
    // Re-bind click event to avoid multiple listeners
    const confirmBtn = modal.querySelector('#confirmMasteryLog');
    if (confirmBtn) {
        confirmBtn.onclick = () => {
            let amount = 0;
            if (m.type === 'hours') {
                const hoursInput = document.getElementById('masteryLogHours');
                const minutesInput = document.getElementById('masteryLogMinutes');
                const hours = hoursInput ? parseFloat(hoursInput.value) || 0 : 0;
                const minutes = minutesInput ? parseFloat(minutesInput.value) || 0 : 0;
                amount = hours + (minutes / 60); // Convert to hours
            } else {
                const repsInput = document.getElementById('masteryLogReps');
                amount = repsInput ? parseFloat(repsInput.value) || 0 : 0;
            }
            
            if (amount !== 0) {
                logMasterySession(id, amount);
                window.closeModal(modalId);
            }
        };
    }
    
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
};

window.quickAddTime = (minutes) => {
    const hoursInput = document.getElementById('masteryLogHours');
    const minutesInput = document.getElementById('masteryLogMinutes');
    if (!hoursInput || !minutesInput) return;
    
    let totalMinutes = (parseInt(hoursInput.value) || 0) * 60 + (parseInt(minutesInput.value) || 0);
    totalMinutes += minutes;
    
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    
    hoursInput.value = hours;
    minutesInput.value = mins;
};

window.logMasterySession = (id, amount) => {
    const m = AppState.mastery.find(x => x.id === id);
    if (m) {
        m.currentHours += amount;
        saveState();
        renderMastery();
        
        let xp = 0;
        if (m.type === 'reps') {
            xp = Math.round(amount * 0.5); // 1 rep = 0.5 XP (example)
        } else {
            xp = Math.round(amount * 60); // 1 hour = 60 XP
        }
        
        addXP(xp);
        logActivity('working', `Mastery: ${m.name} (${amount} ${m.type === 'reps' ? 'reps' : 'hrs'})`, xp);
        showNotification(`Logged ${amount} for ${m.name}`, 'gold');
    }
};

// --- CALENDAR ---
let currentCalendarDate = new Date();

function initCalendar() {
    renderCalendar();
    
    document.getElementById('calendarPrev').onclick = () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar();
    };
    
    document.getElementById('calendarNext').onclick = () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar();
    };
}

function renderCalendar() {
    const grid = document.getElementById('calendarDays');
    const monthLabel = document.getElementById('calendarMonth');
    if (!grid || !monthLabel) return;
    
    grid.innerHTML = '';
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    monthLabel.textContent = new Date(year, month, 1).toLocaleDateString('default', { month: 'long', year: 'numeric' });
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Empty slots for previous month
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day empty';
        grid.appendChild(empty);
    }
    
    // Days
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const day = document.createElement('div');
        day.className = 'calendar-day';
        day.textContent = i;
        
        // Check for events (Schedule + Journal + Recurring + Completed Flows)
        const d = new Date(year, month, i, 12, 0, 0);
        const { recurring, oneOffs } = getFlowsForDate(d);
        const journalEntries = (AppState.journal || []).filter(j => j.date.startsWith(dateStr));
        const workingEntries = (AppState.workings || []).filter(w => {
            if (w.sessions && Array.isArray(w.sessions)) {
                return w.sessions.some(s => s.date && s.date.startsWith(dateStr));
            }
            return false;
        });
        
        // Check for completed flows on this date
        const completedFlows = recurring.filter(f => f.completedDates && f.completedDates.includes(dateStr));
        
        // Create indicators container
        const indicatorsContainer = document.createElement('div');
        indicatorsContainer.style.display = 'flex';
        indicatorsContainer.style.gap = '3px';
        indicatorsContainer.style.justifyContent = 'center';
        indicatorsContainer.style.marginTop = '5px';
        indicatorsContainer.style.minHeight = '6px';
        
        // Add indicators based on what's present
        if (completedFlows.length > 0) {
            const indicator = document.createElement('div');
            indicator.className = 'day-indicator';
            indicator.style.background = 'var(--accent-green)';
            indicator.title = `${completedFlows.length} completed flow(s)`;
            indicatorsContainer.appendChild(indicator);
        }
        
        if (recurring.length > 0 || oneOffs.length > 0) {
            const indicator = document.createElement('div');
            indicator.className = 'day-indicator';
            indicator.style.background = 'var(--accent-blue)';
            indicator.title = `${recurring.length + oneOffs.length} scheduled flow(s)`;
            indicatorsContainer.appendChild(indicator);
        }
        
        if (journalEntries.length > 0) {
            const indicator = document.createElement('div');
            indicator.className = 'day-indicator';
            indicator.style.background = 'var(--accent-purple)';
            indicator.title = `${journalEntries.length} journal entry(s)`;
            indicatorsContainer.appendChild(indicator);
        }
        
        if (workingEntries.length > 0) {
            const indicator = document.createElement('div');
            indicator.className = 'day-indicator';
            indicator.style.background = 'var(--gold-primary)';
            indicator.title = `${workingEntries.length} working session(s)`;
            indicatorsContainer.appendChild(indicator);
        }
        
        day.appendChild(indicatorsContainer);
        
        day.onclick = () => selectCalendarDate(dateStr);
        
        // Highlight today
        const todayStr = new Date().toISOString().split('T')[0];
        if (dateStr === todayStr) {
            day.style.borderColor = 'var(--gold-primary)';
            day.style.background = 'rgba(212, 175, 55, 0.1)';
        }
        
        grid.appendChild(day);
    }
}

window.selectCalendarDate = (dateStr) => {
    const detailTitle = document.getElementById('selectedDateTitle');
    const eventsList = document.getElementById('dayEvents');
    const quickAdd = document.getElementById('calendarQuickAdd');
    
    if (detailTitle) detailTitle.textContent = new Date(dateStr).toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' });
    if (quickAdd) quickAdd.style.display = 'block';
    
    // Store selected date for quick add
    window.selectedCalendarDate = dateStr;
    
    if (eventsList) {
        eventsList.innerHTML = '';
        
        // Fix date parsing for getFlowsForDate
        const parts = dateStr.split('-');
        const d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]), 12, 0, 0);
        
        const { recurring, oneOffs } = getFlowsForDate(d);
        const journalEntries = (AppState.journal || []).filter(j => j.date.startsWith(dateStr));
        
        if (recurring.length === 0 && oneOffs.length === 0 && journalEntries.length === 0) {
            eventsList.innerHTML = '<p class="text-muted">No events or entries.</p>';
        } else {
            // Render Recurring Flows
            recurring.forEach(f => {
                const originalIndex = AppState.flows.findIndex(x => x.id === f.id);
                const item = document.createElement('div');
                item.className = 'activity-item';
                item.innerHTML = `
                    <div class="activity-time">↺</div>
                    <div class="activity-details">
                        <div class="activity-title">🌊 ${f.title}</div>
                        <div class="activity-xp">Recurring Flow</div>
                    </div>
                    <button class="btn-sm btn-gold" onclick="openFlowPreview(${originalIndex})">Start</button>
                `;
                eventsList.appendChild(item);
            });

            // Render Scheduled Flows (One-offs)
            oneOffs.forEach(e => {
                // Find the flow by ID if it exists
                const flowExists = e.flowId && AppState.flows.find(f => f.id === e.flowId);
                const flowIndex = flowExists ? AppState.flows.findIndex(f => f.id === e.flowId) : -1;
                
                const item = document.createElement('div');
                item.className = 'activity-item';
                item.innerHTML = `
                    <div class="activity-time">${e.time || 'Scheduled'}</div>
                    <div class="activity-details">
                        <div class="activity-title">🌊 ${e.title}</div>
                        <div class="activity-xp">${e.type || 'Event'}</div>
                    </div>
                    <div style="display:flex; gap:5px;">
                        ${flowExists ? `<button class="btn-sm btn-gold" onclick="event.stopPropagation(); openFlowPreview(${flowIndex})">Start</button>` : ''}
                        <button class="btn-sm btn-danger" onclick="deleteScheduledItem(${e.id})">×</button>
                    </div>
                `;
                eventsList.appendChild(item);
            });
            
            // Render Journal Entries
            journalEntries.forEach(j => {
                const item = document.createElement('div');
                item.className = 'activity-item';
                item.style.borderLeft = '3px solid var(--accent-purple)';
                item.innerHTML = `
                    <div class="activity-time">📝</div>
                    <div class="activity-details">
                        <div class="activity-title">${j.title}</div>
                        <div class="activity-xp">Journal</div>
                    </div>
                    <button class="btn-sm btn-outline" onclick="viewJournalEntry(${j.id})">View</button>
                `;
                eventsList.appendChild(item);
            });
        }
    }
};

window.viewJournalEntry = (id) => {
    const entry = AppState.journal.find(j => j.id === id);
    if (entry) {
        alert(`Title: ${entry.title}\n\n${entry.content}`);
    }
};

window.quickScheduleFlow = () => {
    const modalId = 'scheduleFlowModal';
    let modal = document.getElementById(modalId);
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Schedule Flow</h2>
                    <button class="modal-close" onclick="window.closeModal('${modalId}')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Select Flow</label>
                        <select id="scheduleFlowSelect" class="select-input"></select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Date</label>
                            <input type="date" id="scheduleDate" class="input">
                        </div>
                        <div class="form-group">
                            <label>Time</label>
                            <input type="time" id="scheduleTime" class="input">
                        </div>
                    </div>
                    <div class="form-actions">
                        <button class="btn btn-gold" onclick="saveScheduledFlow()">Schedule</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Populate Flows
    const select = modal.querySelector('#scheduleFlowSelect');
    if (select) {
        select.innerHTML = AppState.flows.map(f => `<option value="${f.id}">${f.title}</option>`).join('');
    }
    
    // Set Date/Time
    const dateInput = modal.querySelector('#scheduleDate');
    const timeInput = modal.querySelector('#scheduleTime');
    
    if (window.selectedCalendarDate) {
        dateInput.value = window.selectedCalendarDate;
    } else {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    
    const now = new Date();
    timeInput.value = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    
    window.openModal(modalId);
};

window.saveScheduledFlow = () => {
    const flowId = document.getElementById('scheduleFlowSelect').value;
    const date = document.getElementById('scheduleDate').value;
    const time = document.getElementById('scheduleTime').value;
    
    if (!flowId || !date || !time) return showNotification('All fields required', 'error');
    
    const flow = AppState.flows.find(f => f.id == flowId);
    if (!flow) return;
    
    const event = {
        id: Date.now(),
        type: 'flow',
        title: flow.title,
        flowId: flow.id,
        date,
        time
    };
    
    if (!AppState.schedule) AppState.schedule = [];
    AppState.schedule.push(event);
    saveState();
    
    renderCalendar();
    if (window.selectedCalendarDate === date) {
        selectCalendarDate(date); // Refresh sidebar
    }
    
    window.closeModal('scheduleFlowModal');
    showNotification('Flow Scheduled', 'gold');
};

window.deleteScheduledItem = (id) => {
    if (confirm('Remove this scheduled item?')) {
        AppState.schedule = AppState.schedule.filter(e => e.id !== id);
        saveState();
        renderCalendar();
        if (window.selectedCalendarDate) selectCalendarDate(window.selectedCalendarDate);
    }
};

// --- SETTINGS ---
function initSettings() {
    // Bind toggles
    ['soundEnabled', 'hapticEnabled', 'notificationsEnabled', 'animationsEnabled'].forEach(key => {
        const el = document.getElementById(key);
        if (el) {
            el.checked = AppState.settings[key];
            el.addEventListener('change', (e) => {
                AppState.settings[key] = e.target.checked;
                saveState();
            });
        }
    });

    // Bind Location Display
    const locResult = document.getElementById('locationResult');
    if (locResult && AppState.settings.location && AppState.settings.location.name) {
        locResult.style.display = 'block';
        locResult.innerHTML = `
            <div>Selected: <strong>${AppState.settings.location.name}</strong></div>
            <div style="font-size:0.8rem; color:var(--text-muted)">Lat: ${AppState.settings.location.lat.toFixed(4)}, Lon: ${AppState.settings.location.long.toFixed(4)}</div>
        `;
    }
}

window.searchLocation = async () => {
    const query = document.getElementById('locationSearch').value;
    if (!query) return showNotification("Please enter a city name", "error");
    
    const btn = document.querySelector('button[onclick="searchLocation()"]');
    const originalText = btn.textContent;
    btn.textContent = "Searching...";
    btn.disabled = true;
    
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const data = await res.json();
        
        if (data && data.length > 0) {
            const place = data[0];
            const lat = parseFloat(place.lat);
            const lon = parseFloat(place.lon);
            const name = place.display_name;
            
            AppState.settings.location = { lat, long: lon, name };
            saveState();
            
            const locResult = document.getElementById('locationResult');
            locResult.style.display = 'block';
            locResult.innerHTML = `
                <div>Selected: <strong>${name}</strong></div>
                <div style="font-size:0.8rem; color:var(--text-muted)">Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}</div>
            `;
            
            showNotification("Location updated!", "gold");
            initAstro(); // Recalculate planetary hours immediately
        } else {
            showNotification("Location not found", "error");
        }
    } catch (e) {
        console.error(e);
        showNotification("Error searching location", "error");
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
};



window.exportAllData = () => {
    // Create a deep copy to avoid modifying the actual AppState
    const exportData = JSON.parse(JSON.stringify(AppState));
    
    // Remove sensitive location data
    if (exportData.settings && exportData.settings.location) {
        delete exportData.settings.location;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "zevist_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
};

window.importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            // Basic validation
            if (data.user && data.flows && data.settings) {
                if (confirm("This will overwrite your current data. Continue?")) {
                    localStorage.setItem('zevist_app_state', JSON.stringify(data));
                    location.reload();
                }
            } else {
                showNotification("Invalid backup file format", "error");
            }
        } catch (err) {
            showNotification("Error reading file", "error");
            console.error(err);
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
};

window.importFlow = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const flow = JSON.parse(e.target.result);
            // Basic validation
            if (flow.title && flow.steps && Array.isArray(flow.steps)) {
                // Generate new ID to avoid conflicts
                flow.id = Date.now();
                flow.created = new Date().toISOString();
                
                AppState.flows.push(flow);
                saveState();
                renderFlows();
                showNotification(`Flow "${flow.title}" imported successfully`, "gold");
            } else {
                showNotification("Invalid flow file format", "error");
            }
        } catch (err) {
            showNotification("Error reading file", "error");
            console.error(err);
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
};

window.openExportFlowModal = () => {
    // Create a dynamic modal for flow selection
    const modalId = 'exportFlowModal';
    let modal = document.getElementById(modalId);
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Export Flow</h2>
                    <button class="modal-close" onclick="window.closeModal('${modalId}')">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Select a flow to export:</p>
                    <div id="exportFlowList" class="list-group"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    const list = modal.querySelector('#exportFlowList');
    if (list) {
        list.innerHTML = '';
        
        if (AppState.flows.length === 0) {
            list.innerHTML = '<div class="text-muted">No flows available.</div>';
        } else {
            AppState.flows.forEach(flow => {
                const item = document.createElement('div');
                item.className = 'list-item';
                item.style.display = 'flex';
                item.style.justifyContent = 'space-between';
                item.style.alignItems = 'center';
                item.style.padding = '10px';
                item.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
                
                item.innerHTML = `
                    <span>${flow.title}</span>
                    <button class="btn-sm btn-gold">Export</button>
                `;
                
                item.querySelector('button').onclick = () => {
                    if (flow.image && !confirm("Note: Flow images are not included in the export file to keep the file size small. Continue?")) {
                        return;
                    }
                    
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(flow));
                    const downloadAnchorNode = document.createElement('a');
                    downloadAnchorNode.setAttribute("href", dataStr);
                    downloadAnchorNode.setAttribute("download", `${flow.title.replace(/\s+/g, '_')}_flow.json`);
                    document.body.appendChild(downloadAnchorNode);
                    downloadAnchorNode.click();
                    downloadAnchorNode.remove();
                    window.closeModal(modalId);
                };
                
                list.appendChild(item);
            });
        }
    }
    
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10); // Ensure transition
};


window.confirmClearData = () => {
    if (confirm("Are you sure you want to wipe all data? This cannot be undone.")) {
        localStorage.removeItem('zevist_app_state');
        location.reload();
    }
};

// --- ASTRO & UTILS ---

// Planetary Hours API Cache (in-memory)
const planetaryHoursCache = {};

async function fetchPlanetaryHours(date, lat, lng) {
    // Format date as YYYY-MM-DD
    const dateStr = date.toISOString().split('T')[0];
    const cacheKey = `${dateStr}_${lat.toFixed(4)}_${lng.toFixed(4)}`;
    
    // Return cached result if available
    if (planetaryHoursCache[cacheKey]) {
        return planetaryHoursCache[cacheKey];
    }
    
    try {
        // Use https if page is served over https, otherwise http
        const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
        const response = await fetch(`${protocol}//www.planetaryhoursapi.com/api/${dateStr}/${lat},${lng}`, {
            cache: 'no-cache' // Prevent caching issues
        });
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        
        const data = await response.json();
        
        // Cache the result
        planetaryHoursCache[cacheKey] = data;
        
        console.log('Planetary Hours API success:', data);
        
        return data;
    } catch (error) {
        console.warn('Planetary Hours API failed:', error);
        return null; // Will trigger fallback to manual calculation
    }
}

function initAstro() {
    // Moon Phase Calculation (Synodic Month)
    const getMoonPhase = (date) => {
        const synodic = 29.53058867;
        const knownNewMoon = new Date('2000-01-06T18:14:00Z');
        const diffDays = (date.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
        const phase = diffDays % synodic;
        return phase < 0 ? phase + synodic : phase;
    };

    const moonAge = getMoonPhase(new Date());
    const synodic = 29.53058867;
    const phaseStep = synodic / 8;
    // Offset by half a step to center the phases
    const phaseIdx = Math.floor((moonAge + (phaseStep/2)) / phaseStep) % 8;
    
    const phases = ['🌑 New Moon', '🌒 Waxing Crescent', '🌓 First Quarter', '🌔 Waxing Gibbous', '🌕 Full Moon', '🌖 Waning Gibbous', '🌗 Last Quarter', '🌘 Waning Crescent'];
    document.getElementById('moonPhase').textContent = phases[phaseIdx];
    
    // Planetary Hour Calculation
    updatePlanetaryHour();
}

async function updatePlanetaryHour() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
    
    const planetNames = ['☉ Sun', '☽ Moon', '♂ Mars', '☿ Mercury', '♃ Jupiter', '♀ Venus', '♄ Saturn'];
    // Chaldean Order for planetary hours: Saturn, Jupiter, Mars, Sun, Venus, Mercury, Moon
    const chaldeanOrder = [6, 4, 2, 0, 5, 3, 1]; 
    
    // Day Rulers: Sunday=Sun, Monday=Moon, Tuesday=Mars, Wednesday=Mercury, Thursday=Jupiter, Friday=Venus, Saturday=Saturn
    const dayRulers = [0, 1, 2, 3, 4, 5, 6]; 
    
    let currentPlanetIndex = 0;
    let isDay = true;
    let useAPI = false;

    // Try API first if location is set
    if (AppState.settings.location && AppState.settings.location.lat) {
        const { lat, long } = AppState.settings.location;
        const apiData = await fetchPlanetaryHours(now, lat, long);
        
        if (apiData && apiData.planetary_hours) {
            // API succeeded - use its data
            useAPI = true;
            
            // API returns current planetary hour info
            const currentHour = apiData.planetary_hours.find(h => {
                const hourStart = new Date(h.start);
                const hourEnd = new Date(h.end);
                return now >= hourStart && now < hourEnd;
            });
            
            if (currentHour) {
                // Map API planet name to our index
                const planetMap = {
                    'Sun': 0, 'Moon': 1, 'Mars': 2, 'Mercury': 3,
                    'Jupiter': 4, 'Venus': 5, 'Saturn': 6
                };
                currentPlanetIndex = planetMap[currentHour.planet] || 0;
                isDay = currentHour.is_daytime;
                console.log('Using API planetary hour:', currentHour.planet, isDay ? '(Day)' : '(Night)');
            }
        }
    }
    
    // Fallback to manual calculation if API failed or no location
    if (!useAPI) {
        console.log('Using manual calculation for planetary hours');
        if (AppState.settings.location && AppState.settings.location.lat) {
            // Accurate Calculation with manual sunrise/sunset
            const { lat, long } = AppState.settings.location;
            const sunTimes = getSunTimes(now, lat, long);
            
            if (sunTimes) {
                const { sunrise, sunset } = sunTimes;
                
                // Check if before sunrise (belongs to previous day's night sequence)
                if (now < sunrise) {
                    // It's technically "yesterday" in magickal terms (night of previous day)
                    const yesterday = new Date(now);
                    yesterday.setDate(yesterday.getDate() - 1);
                    const prevDayOfWeek = yesterday.getDay();
                    const prevDayRuler = dayRulers[prevDayOfWeek];
                    
                    const prevSunTimes = getSunTimes(yesterday, lat, long);
                    const prevSunset = prevSunTimes.sunset;
                    
                    const nightDuration = sunrise.getTime() - prevSunset.getTime();
                    const nightHourLength = nightDuration / 12;
                    const timeSinceSunset = now.getTime() - prevSunset.getTime();
                    const currentNightHour = Math.floor(timeSinceSunset / nightHourLength); // 0-11
                    
                    const startIdx = chaldeanOrder.indexOf(prevDayRuler);
                    const offset = 12 + currentNightHour;
                    currentPlanetIndex = chaldeanOrder[(startIdx + offset) % 7];
                    isDay = false;
                    
                } else if (now >= sunrise && now < sunset) {
                    // Daytime
                    const dayDuration = sunset.getTime() - sunrise.getTime();
                    const dayHourLength = dayDuration / 12;
                    const timeSinceSunrise = now.getTime() - sunrise.getTime();
                    const currentDayHour = Math.floor(timeSinceSunrise / dayHourLength); // 0-11
                    
                    const currentDayRuler = dayRulers[dayOfWeek];
                    const startIdx = chaldeanOrder.indexOf(currentDayRuler);
                    currentPlanetIndex = chaldeanOrder[(startIdx + currentDayHour) % 7];
                    isDay = true;
                    
                } else {
                    // After sunset (Night of today)
                    const nextDay = new Date(now);
                    nextDay.setDate(nextDay.getDate() + 1);
                    const nextSunTimes = getSunTimes(nextDay, lat, long);
                    const nextSunrise = nextSunTimes.sunrise;
                    
                    const nightDuration = nextSunrise.getTime() - sunset.getTime();
                    const nightHourLength = nightDuration / 12;
                    const timeSinceSunset = now.getTime() - sunset.getTime();
                    const currentNightHour = Math.floor(timeSinceSunset / nightHourLength); // 0-11
                    
                    const currentDayRuler = dayRulers[dayOfWeek];
                    const startIdx = chaldeanOrder.indexOf(currentDayRuler);
                    const offset = 12 + currentNightHour;
                    currentPlanetIndex = chaldeanOrder[(startIdx + offset) % 7];
                    isDay = false;
                }
            }
        } else {
            // Fallback: Simple fixed hours (6am-6pm day, 6pm-6am night)
            const hour = now.getHours();
            
            if (hour < 6) {
                 // Night of previous day
                 const prevDay = (dayOfWeek + 6) % 7;
                 const prevRuler = dayRulers[prevDay];
                 const startIdx = chaldeanOrder.indexOf(prevRuler);
                 const offset = 18 + hour; // e.g. 2am = 20th hour (12 day + 6 night + 2)
                 currentPlanetIndex = chaldeanOrder[(startIdx + offset) % 7];
                 isDay = false;
            } else {
                // Same day
                const currentRuler = dayRulers[dayOfWeek];
                const startIdx = chaldeanOrder.indexOf(currentRuler);
                const offset = hour - 6;
                currentPlanetIndex = chaldeanOrder[(startIdx + offset) % 7];
                isDay = (hour < 18);
            }
        }
        
        // Show notification if API failed but we have location
        if (AppState.settings.location && AppState.settings.location.lat) {
            console.warn('Planetary Hours API unavailable, using manual calculation');
        }
    }

    const planetName = planetNames[currentPlanetIndex];
    const planetEl = document.getElementById('currentPlanet');
    if (planetEl) {
        planetEl.textContent = planetName + (isDay ? " (Day)" : " (Night)");
    }
    
    // Display location name in the widget if available
    const planetLabelEl = document.querySelector('.planet-label');
    if (planetLabelEl && AppState.settings.location && AppState.settings.location.name) {
        const cityName = AppState.settings.location.name.split(',')[0]; // Get city name only
        planetLabelEl.textContent = `Planetary Hour - ${cityName}`;
    } else if (planetLabelEl) {
        planetLabelEl.textContent = 'Planetary Hour - Default';
        // Show prompt to set location if not set
        if (!AppState.settings.location || !AppState.settings.location.lat) {
            setTimeout(() => {
                if (!localStorage.getItem('location_prompt_shown')) {
                    showNotification('Set your location in Settings for accurate planetary hours', 'normal');
                    localStorage.setItem('location_prompt_shown', 'true');
                }
            }, 3000);
        }
    }
}

// Simple Sun Calc (Sunrise Equation)
function getSunTimes(date, lat, lng) {
    // Source: https://en.wikipedia.org/wiki/Sunrise_equation
    // Simplified implementation
    
    const PI = Math.PI;
    const DR = PI / 180;
    const RD = 180 / PI;
    
    const zenith = 90.8333; // Official
    
    // Day of the year
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const N = Math.floor(diff / oneDay);
    
    // Convert lng to hour value and calculate approximate time
    const lngHour = lng / 15;
    
    const calculate = (isSunrise) => {
        const t = N + ((isSunrise ? 6 : 18) - lngHour) / 24;
        const M = (0.9856 * t) - 3.289;
        
        // Sun's true longitude
        let L = M + (1.916 * Math.sin(M * DR)) + (0.020 * Math.sin(2 * M * DR)) + 282.634;
        L = (L + 360) % 360; // Normalize
        
        // Right ascension
        let RA = RD * Math.atan(0.91764 * Math.tan(L * DR));
        RA = (RA + 360) % 360;
        
        // RA needs to be in same quadrant as L
        const Lquadrant = (Math.floor(L / 90)) * 90;
        const RAquadrant = (Math.floor(RA / 90)) * 90;
        RA = RA + (Lquadrant - RAquadrant);
        RA = RA / 15;
        
        // Sun's declination
        const sinDec = 0.39782 * Math.sin(L * DR);
        const cosDec = Math.cos(Math.asin(sinDec));
        
        // Sun's local hour angle
        const cosH = (Math.cos(zenith * DR) - (sinDec * Math.sin(lat * DR))) / (cosDec * Math.cos(lat * DR));
        
        if (cosH > 1 || cosH < -1) return null; // Sun never rises/sets
        
        const H = (isSunrise ? (360 - RD * Math.acos(cosH)) : (RD * Math.acos(cosH))) / 15;
        
        // Local mean time of rising/setting
        const T = H + RA - (0.06571 * t) - 6.622;
        
        // Adjust back to UTC
        let UT = T - lngHour;
        UT = (UT + 24) % 24;
        
        // Convert to local time object
        const result = new Date(date);
        result.setUTCHours(Math.floor(UT));
        result.setUTCMinutes(Math.floor((UT % 1) * 60));
        result.setUTCSeconds(0);
        
        return result;
    };
    
    const sunrise = calculate(true);
    const sunset = calculate(false);
    
    if (!sunrise || !sunset) return null;
    
    return { sunrise, sunset };
}

function renderBadges() {
    const grid = document.getElementById('badgesGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    BADGES.forEach(badge => {
        const unlocked = AppState.user.badges.includes(badge.id);
        const el = document.createElement('div');
        el.className = `badge-item ${unlocked ? 'unlocked' : ''}`;
        el.innerHTML = `
            <div class="badge-icon">${badge.icon}</div>
            <div class="badge-name">${badge.name}</div>
        `;
        grid.appendChild(el);
    });
}

function checkBadges() {
    let newBadge = false;
    BADGES.forEach(badge => {
        if (!AppState.user.badges.includes(badge.id)) {
            if (badge.condition(AppState)) {
                AppState.user.badges.push(badge.id);
                showNotification(`Badge Unlocked: ${badge.name}`, 'purple');
                newBadge = true;
            }
        }
    });
    if (newBadge) {
        saveState();
        renderBadges();
    }
}

/* Heatmap removed */

function showNotification(msg, type) {
    const toast = document.createElement('div');
    toast.style.background = type === 'gold' ? 'var(--gold-primary)' : '#333';
    toast.style.color = type === 'gold' ? '#000' : '#fff';
    toast.style.padding = '15px';
    toast.style.marginTop = '10px';
    toast.style.borderRadius = '4px';
    toast.style.boxShadow = '0 5px 15px rgba(0,0,0,0.5)';
    toast.textContent = msg;
    
    const container = document.getElementById('toastContainer');
    if (container) {
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    } else {
        // Fallback
        alert(msg);
    }
}

function playNotificationSound() {
    if (AppState.settings.soundEnabled) {
        // Simple beep
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        osc.connect(ctx.destination);
        osc.start();
        osc.stop(0.1);
    }
    triggerHaptic();
}

function triggerHaptic() {
    if (AppState.settings.hapticEnabled && navigator.vibrate) {
        navigator.vibrate(200);
    }
}

function countHistoryTotal(state, key) {
    let total = 0;
    Object.values(state.history).forEach(day => total += (day[key] || 0));
    return total;
}

function countCompletedTasks(state) {
    return state.tasks.filter(t => t.status === 'done').length;
}
