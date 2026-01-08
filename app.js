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

// Helper functions for XP/Level system
function getXPForLevel(level) {
    if (level <= 1) return 0;
    return Math.floor(XP_LEVEL_BASE * Math.pow(XP_LEVEL_MULTIPLIER, level - 2));
}

function getLevelTitle(level) {
    if (level <= 0) return LEVEL_TITLES[0] || 'Neophyte';
    const rankInterval = (typeof CONFIG !== 'undefined' && CONFIG.LEVEL_SYSTEM) ? CONFIG.LEVEL_SYSTEM.RANK_INTERVAL : 50;
    const index = Math.min(Math.floor((level - 1) / rankInterval), LEVEL_TITLES.length - 1);
    return LEVEL_TITLES[index] || `Level ${level}`;
}

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
    initWeeklySchedule();
    initSettings();

    checkStreak();
    autoResetFlowCompletions();
    renderBadges();
    
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Keyboard shortcuts
    initKeyboardShortcuts();

    // Mobile toggle
    const toggleSidebar = (force) => {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const isActive = force !== undefined ? force : !sidebar.classList.contains('active');

        sidebar.classList.toggle('active', isActive);
        overlay?.classList.toggle('active', isActive);

        if (isActive && window.innerWidth <= 768) {
            document.body.classList.add('no-scroll');
        } else if (!isActive) {
            document.body.classList.remove('no-scroll');
        }
    };

    document.getElementById('sidebarToggle')?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSidebar();
    });

    document.getElementById('sidebarToggleInternal')?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSidebar();
    });

    document.getElementById('sidebarOverlay')?.addEventListener('click', () => toggleSidebar(false));

    // Mobile close button (if exists)
    document.querySelector('.sidebar-close-btn')?.addEventListener('click', () => {
        toggleSidebar(false);
    });

    // Close sidebar on nav click (mobile)
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) toggleSidebar(false);
        });
    });
});

// --- KEYBOARD SHORTCUTS ---
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Check if flow runner is active and we're on a reps step
        const flowRunnerActive = document.getElementById('flowRunner')?.classList.contains('active');
        const isRepsStep = flowRunnerActive && runnerState.flow &&
            runnerState.flow.steps[runnerState.stepIndex]?.type === 'reps';

        // Handle reps shortcuts (spacebar, arrow keys, +/-)
        if (isRepsStep) {
            if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'ArrowUp' || e.key === '+' || e.key === '=') {
                e.preventDefault();
                window.incrementRunnerReps();
                return;
            }
            if (e.key === 'ArrowDown' || e.key === '-' || e.key === '_') {
                e.preventDefault();
                window.decrementRunnerReps();
                return;
            }
        }

        // Don't trigger shortcuts if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        // Don't trigger if modal is open
        const modalOpen = document.querySelector('.modal.active');
        if (modalOpen) return;

        switch (e.key.toLowerCase()) {
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

    // Click anywhere on flow runner to increment reps (except on buttons)
    document.getElementById('flowRunner')?.addEventListener('click', (e) => {
        // Don't increment if clicking on a button or interactive element
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return;

        const isRepsStep = runnerState.flow &&
            runnerState.flow.steps[runnerState.stepIndex]?.type === 'reps';

        if (isRepsStep) {
            window.incrementRunnerReps();
        }
    });

    // Volume button support for mobile (experimental - works on some Android browsers)
    // This uses the volumechange event which fires when volume buttons are pressed
    try {
        // Create a silent audio context to enable volume detection
        if ('AudioContext' in window || 'webkitAudioContext' in window) {
            let lastVolume = null;

            // Monitor volume changes
            const checkVolume = () => {
                const audio = document.createElement('audio');
                audio.volume = 0.5; // Reference volume
            };

            // Some browsers support this media key API
            if ('mediaSession' in navigator) {
                navigator.mediaSession.setActionHandler('pause', () => {
                    const isRepsStep = runnerState.flow &&
                        runnerState.flow.steps[runnerState.stepIndex]?.type === 'reps';
                    if (isRepsStep && document.getElementById('flowRunner')?.classList.contains('active')) {
                        window.incrementRunnerReps();
                    }
                });
            }
        }
    } catch (err) {
        // Volume button detection not supported
        console.log('Volume button shortcuts not available in this browser');
    }
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

window.openModal = (id) => {
    document.getElementById(id).classList.add('active');
    // Re-initialize Lucide icons for modal content
    if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 10);
    }
};
window.closeModal = (id) => document.getElementById(id).classList.remove('active');

// Styled confirm modal to replace browser confirm()
let confirmCallback = null;
window.showConfirmModal = (title, message, onConfirm) => {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    confirmCallback = onConfirm;
    document.getElementById('confirmAction').onclick = () => {
        window.closeModal('confirmModal');
        if (confirmCallback) confirmCallback();
        confirmCallback = null;
    };
    window.openModal('confirmModal');
};

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
        AppState.weeklySchedule = parsed.weeklySchedule || [];
        AppState.routineCompletions = parsed.routineCompletions || {};
        AppState.lastRoutineWeek = parsed.lastRoutineWeek || '';
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
            weeklySchedule: AppState.weeklySchedule || [],
            routineCompletions: AppState.routineCompletions || {},
            lastRoutineWeek: AppState.lastRoutineWeek || '',
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
    // Update hero section with date info
    const now = new Date();
    const hour = now.getHours();
    
    // Time-based greeting
    let greeting = 'Good Evening';
    if (hour < 12) greeting = 'Good Morning';
    else if (hour < 17) greeting = 'Good Afternoon';
    
    const greetingEl = document.getElementById('greetingTime');
    if (greetingEl) greetingEl.textContent = greeting;
    
    // Update hero date display
    const dayEl = document.getElementById('heroDay');
    const weekdayEl = document.getElementById('heroWeekday');
    const monthEl = document.getElementById('heroMonth');
    
    if (dayEl) dayEl.textContent = now.getDate().toString().padStart(2, '0');
    if (weekdayEl) weekdayEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long' });
    if (monthEl) monthEl.textContent = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    // Update motivational subtitle
    updateHeroSubtitle();
    
    // Setup focus timer presets
    setupFocusPresets();
    
    // Setup cosmic insight
    refreshCosmicInsight();

    renderTodaySchedule();
    renderDashboardTasks();
    renderDashboardWorkings();
    renderDashboardActivity();
    updateStatsDisplay();
    updateDashboardProgressRings();
    updateDashboardXP();
    updateWorkingsStats();
    
    // Re-init lucide icons
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Update hero subtitle with motivational messages
function updateHeroSubtitle() {
    const subtitles = [
        "The stars align in your favor today",
        "Every moment is a fresh beginning",
        "Your dedication shapes your destiny",
        "Magic flows through focused intention",
        "Small steps lead to great transformations",
        "Today's practice builds tomorrow's mastery",
        "The universe rewards consistent effort",
        "Your journey continues with each breath"
    ];
    const subtitleEl = document.getElementById('heroSubtitle');
    if (subtitleEl) {
        subtitleEl.textContent = subtitles[Math.floor(Math.random() * subtitles.length)];
    }
}

// Dashboard Progress Rings
function updateDashboardProgressRings() {
    // Streak ring (max 30 days = full circle)
    const streakRing = document.getElementById('streakRingProgress');
    if (streakRing) {
        const streak = AppState.streak || 0;
        const streakPercent = Math.min(streak / 30, 1);
        const circumference = 2 * Math.PI * 45;
        streakRing.style.strokeDasharray = circumference;
        streakRing.style.strokeDashoffset = circumference * (1 - streakPercent);
    }
    
    // Update streak message
    const streakMsg = document.getElementById('streakMessage');
    if (streakMsg) {
        const streak = AppState.streak || 0;
        if (streak === 0) streakMsg.textContent = 'Start your streak today!';
        else if (streak < 7) streakMsg.textContent = 'Keep the momentum going!';
        else if (streak < 30) streakMsg.textContent = 'You\'re on fire! 🔥';
        else streakMsg.textContent = 'Incredible dedication!';
    }
    
    // Today's metrics rings (goal-based)
    const todayStats = AppState.history[new Date().toISOString().split('T')[0]] || { flows: 0 };
    
    // Flows ring (goal: 3 flows)
    const flowsRing = document.getElementById('flowsRingProgress');
    if (flowsRing) {
        const flowsPercent = Math.min(todayStats.flows / 3, 1);
        flowsRing.style.strokeDashoffset = 100 * (1 - flowsPercent);
    }
    
    // Time ring (goal: 60 minutes)
    const timeRing = document.getElementById('timeRingProgress');
    if (timeRing) {
        const timePercent = Math.min(AppState.totalPracticeTime / 3600, 1);
        timeRing.style.strokeDashoffset = 100 * (1 - timePercent);
    }
    
    // Pomodoros ring (goal: 4)
    const pomsRing = document.getElementById('pomsRingProgress');
    if (pomsRing) {
        const pomsPercent = Math.min((AppState.pomodorosToday || 0) / 4, 1);
        pomsRing.style.strokeDashoffset = 100 * (1 - pomsPercent);
    }
    
    // Update XP display
    updateDashboardXP();
    
    // Update workings stats
    updateWorkingsStats();
}

// Update dashboard XP
function updateDashboardXP() {
    const levelEl = document.getElementById('dashLevel');
    const titleEl = document.getElementById('dashLevelTitle');
    const xpBarEl = document.getElementById('dashXPBar');
    const currentXPEl = document.getElementById('dashCurrentXP');
    const nextLevelXPEl = document.getElementById('dashNextLevelXP');
    
    if (levelEl) levelEl.textContent = AppState.user.level || 1;
    if (titleEl) titleEl.textContent = getLevelTitle(AppState.user.level || 1);
    
    const xpForCurrentLevel = getXPForLevel(AppState.user.level || 1);
    const xpForNextLevel = getXPForLevel((AppState.user.level || 1) + 1);
    const currentLevelXP = (AppState.user.xp || 0) - xpForCurrentLevel;
    const neededXP = xpForNextLevel - xpForCurrentLevel;
    const xpPercent = Math.min(currentLevelXP / neededXP * 100, 100);
    
    if (xpBarEl) xpBarEl.style.width = xpPercent + '%';
    if (currentXPEl) currentXPEl.textContent = currentLevelXP;
    if (nextLevelXPEl) nextLevelXPEl.textContent = neededXP;
}

// Update workings stats
function updateWorkingsStats() {
    const activeCount = document.getElementById('activeWorkings');
    const plannedCount = document.getElementById('plannedWorkings');
    const completedCount = document.getElementById('completedWorkings');
    
    const active = AppState.workings.filter(w => w.status === 'active').length;
    const planned = AppState.workings.filter(w => w.status === 'planned').length;
    const completed = AppState.workings.filter(w => w.status === 'completed').length;
    
    if (activeCount) activeCount.textContent = active;
    if (plannedCount) plannedCount.textContent = planned;
    if (completedCount) completedCount.textContent = completed;
}

// Render dashboard tasks (high priority tasks)
function renderDashboardTasks() {
    const container = document.getElementById('dashboardTasks');
    if (!container) return;
    
    // Get high priority uncompleted tasks from AppState.tasks
    const priorityTasks = (AppState.tasks || [])
        .filter(t => t.status !== 'done' && (t.priority === 'high' || t.priority === 'medium'))
        .sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
        })
        .slice(0, 5);
    
    if (priorityTasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state-mini">
                <i data-lucide="inbox"></i>
                <p>No priority tasks</p>
                <button class="btn-mini" onclick="navigateTo('todos')">
                    <i data-lucide="plus"></i> Add Task
                </button>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }
    
    container.innerHTML = priorityTasks.map(task => `
        <div class="priority-task-item" data-task-id="${task.id}">
            <span class="task-priority-dot ${task.priority}"></span>
            <div class="task-info">
                <span class="task-title">${task.name || task.title}</span>
                ${task.category ? `<span class="task-category">${task.category}</span>` : ''}
            </div>
            <button class="task-check" onclick="quickCompleteTask('${task.id}')">
                <i data-lucide="check"></i>
            </button>
        </div>
    `).join('');
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Quick complete task from dashboard
window.quickCompleteTask = function(taskId) {
    const task = (AppState.tasks || []).find(t => t.id == taskId);
    if (task) {
        task.status = 'done';
        task.completedAt = new Date().toISOString();
        saveState();
        renderDashboardTasks();
        renderTasks();
        showNotification('Task completed!', 'success');
        addActivity('task', `Completed task: ${task.name || task.title}`);
    }
};

// Render dashboard workings
function renderDashboardWorkings() {
    const container = document.getElementById('activeWorkingsList');
    if (!container) return;
    
    const activeWorkings = AppState.workings.filter(w => w.status === 'active').slice(0, 4);
    
    if (activeWorkings.length === 0) {
        container.innerHTML = `
            <div class="empty-state-mini">
                <i data-lucide="sparkles"></i>
                <p>No active workings</p>
                <button class="btn-mini" onclick="navigateTo('magick')">
                    <i data-lucide="plus"></i> Start Working
                </button>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }
    
    container.innerHTML = activeWorkings.map(working => {
        const progress = calculateWorkingProgress(working);
        return `
            <div class="working-item" onclick="navigateTo('magick')">
                <span class="working-intent-icon">${working.icon || '🔮'}</span>
                <div class="working-details">
                    <span class="working-name">${working.name}</span>
                    <div class="working-progress-mini">
                        <div class="progress-bar-mini">
                            <div class="progress-fill-mini" style="width: ${progress}%"></div>
                        </div>
                        <span class="progress-text-mini">${progress}%</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Calculate working progress
function calculateWorkingProgress(working) {
    if (!working.duration || working.duration === 'ongoing') return 0;
    const started = new Date(working.startDate);
    const now = new Date();
    const durationDays = parseInt(working.duration) || 30;
    const elapsed = Math.floor((now - started) / (1000 * 60 * 60 * 24));
    return Math.min(Math.round((elapsed / durationDays) * 100), 100);
}

// Dashboard activity tracking
let dashboardActivities = [];

function addActivity(type, text) {
    dashboardActivities.unshift({
        type,
        text,
        time: new Date().toISOString()
    });
    dashboardActivities = dashboardActivities.slice(0, 20); // Keep last 20
    renderDashboardActivity();
}

function renderDashboardActivity() {
    const container = document.getElementById('dashboardActivity');
    if (!container) return;
    
    // Load from history and recent actions
    const recentActivities = dashboardActivities.slice(0, 8);
    
    if (recentActivities.length === 0) {
        container.innerHTML = `
            <div class="empty-state-mini">
                <i data-lucide="clock"></i>
                <p>No recent activity</p>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }
    
    const iconMap = {
        flow: 'sparkles',
        working: 'wand-2',
        task: 'check-circle',
        mastery: 'trophy'
    };
    
    container.innerHTML = recentActivities.map(activity => {
        const timeAgo = getTimeAgo(new Date(activity.time));
        return `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}">
                    <i data-lucide="${iconMap[activity.type] || 'activity'}"></i>
                </div>
                <div class="activity-content">
                    <span class="activity-text">${activity.text}</span>
                    <span class="activity-time">${timeAgo}</span>
                </div>
            </div>
        `;
    }).join('');
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

// Focus timer functionality
let dashboardFocusMinutes = 15;
let dashboardFocusInterval = null;
let dashboardFocusRemaining = 0;

function setupFocusPresets() {
    document.querySelectorAll('.focus-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.focus-preset').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            dashboardFocusMinutes = parseInt(btn.dataset.minutes);
            const minutesEl = document.getElementById('focusMinutes');
            if (minutesEl) minutesEl.textContent = dashboardFocusMinutes;
        });
    });
}

window.startDashboardFocus = function() {
    const btn = document.getElementById('startFocusBtn');
    
    if (dashboardFocusInterval) {
        // Stop the timer
        clearInterval(dashboardFocusInterval);
        dashboardFocusInterval = null;
        btn.innerHTML = '<i data-lucide="play"></i><span>Start Focus</span>';
        document.getElementById('focusMinutes').textContent = dashboardFocusMinutes;
        document.getElementById('focusRingProgress').style.strokeDashoffset = 339;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }
    
    // Start the timer
    dashboardFocusRemaining = dashboardFocusMinutes * 60;
    const totalSeconds = dashboardFocusRemaining;
    btn.innerHTML = '<i data-lucide="pause"></i><span>Pause</span>';
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    dashboardFocusInterval = setInterval(() => {
        dashboardFocusRemaining--;
        const minutes = Math.floor(dashboardFocusRemaining / 60);
        const seconds = dashboardFocusRemaining % 60;
        document.getElementById('focusMinutes').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Update ring progress
        const progress = 1 - (dashboardFocusRemaining / totalSeconds);
        document.getElementById('focusRingProgress').style.strokeDashoffset = 339 * (1 - progress);
        
        if (dashboardFocusRemaining <= 0) {
            clearInterval(dashboardFocusInterval);
            dashboardFocusInterval = null;
            btn.innerHTML = '<i data-lucide="play"></i><span>Start Focus</span>';
            document.getElementById('focusMinutes').textContent = dashboardFocusMinutes;
            document.getElementById('focusRingProgress').style.strokeDashoffset = 0;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            
            // Play completion sound/notification
            addActivity('flow', `Completed ${dashboardFocusMinutes} minute focus session`);
            if (Notification.permission === 'granted') {
                new Notification('Focus Complete!', { body: `Great job! You completed a ${dashboardFocusMinutes} minute focus session.` });
            }
        }
    }, 1000);
};

// Cosmic insights
const cosmicInsights = [
    "The Moon waxes in a favorable sign. A good time for new beginnings and setting intentions.",
    "Mercury's influence today favors clear communication and deep study.",
    "Venus blesses your creative endeavors. Let beauty guide your practice.",
    "Mars energizes your will. Channel this power into focused action.",
    "Jupiter expands your horizons. Think big and trust your path.",
    "Saturn reminds us that discipline is freedom. Structure serves your goals.",
    "The cosmos align to support transformation. Embrace change as growth.",
    "Today's planetary dance favors inner reflection and spiritual work.",
    "The astral tides flow toward manifestation. Focus on what you wish to create.",
    "Ancient wisdom speaks through the stars. Listen to your intuition today."
];

window.refreshCosmicInsight = function() {
    const insightEl = document.getElementById('cosmicInsight');
    if (insightEl) {
        insightEl.textContent = cosmicInsights[Math.floor(Math.random() * cosmicInsights.length)];
    }
    const refreshBtn = document.querySelector('.insight-refresh');
    if (refreshBtn) {
        refreshBtn.style.transform = 'rotate(360deg)';
        setTimeout(() => refreshBtn.style.transform = '', 300);
    }
};

// --- ASTRO WIDGETS ---
// Zodiac sign symbols for display
const ZODIAC_SYMBOLS = {
    aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋',
    leo: '♌', virgo: '♍', libra: '♎', scorpio: '♏',
    sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓'
};

// Moon phase icons
const MOON_ICONS = {
    'New Moon': '🌑',
    'Waxing Crescent': '🌒',
    'First Quarter': '🌓',
    'Waxing Gibbous': '🌔',
    'Full Moon': '🌕',
    'Waning Gibbous': '🌖',
    'Last Quarter': '🌗',
    'Waning Crescent': '🌘'
};

// Planetary symbols and data
const PLANETS = {
    saturn: { symbol: '♄', name: 'Saturn', color: '#808080' },
    jupiter: { symbol: '♃', name: 'Jupiter', color: '#FFA500' },
    mars: { symbol: '♂', name: 'Mars', color: '#FF4040' },
    sun: { symbol: '☉', name: 'Sun', color: '#FFD700' },
    venus: { symbol: '♀', name: 'Venus', color: '#32CD32' },
    mercury: { symbol: '☿', name: 'Mercury', color: '#DDA0DD' },
    moon: { symbol: '☽', name: 'Moon', color: '#C0C0C0' }
};

// Chaldean order for planetary hours
const CHALDEAN_ORDER = ['saturn', 'jupiter', 'mars', 'sun', 'venus', 'mercury', 'moon'];

// Day rulers (Sunday=0)
const DAY_RULERS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];

function initAstro() {
    // Initial update
    updateAstroWidgets();

    // Update every minute for planetary hours
    setInterval(updateAstroWidgets, 60000);

    // Refresh moon data every 30 minutes
    setInterval(fetchMoonData, 30 * 60000);
}

async function updateAstroWidgets() {
    updatePlanetaryHour();
    await fetchMoonData();
}

// Fetch moon data from AstroApollo API
async function fetchMoonData() {
    try {
        const now = new Date();
        const isoDate = now.toISOString();

        const response = await fetch(`https://astroapollo.org/api/current-planets?date=${encodeURIComponent(isoDate)}`);

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();

        if (data.data && data.data.current_chart && data.data.current_chart.planets) {
            const planets = data.data.current_chart.planets;
            const moon = planets.find(p => p.name === 'moon');
            const sun = planets.find(p => p.name === 'sun');

            if (moon && moon.zodiac) {
                const moonSign = moon.zodiac.signName;
                const moonDegree = moon.zodiac.degree;
                const moonMinute = moon.zodiac.minute;

                // Update moon sign display
                const moonSignEl = document.getElementById('moonSign');
                if (moonSignEl) {
                    const zodiacSymbol = ZODIAC_SYMBOLS[moonSign.toLowerCase()] || '';
                    const signCapitalized = moonSign.charAt(0).toUpperCase() + moonSign.slice(1).toLowerCase();
                    moonSignEl.textContent = `${zodiacSymbol} in ${signCapitalized} ${moonDegree}°${moonMinute}'`;
                }

                // Calculate moon phase using ecliptic longitudes
                if (sun && sun.ecliptic && moon.ecliptic) {
                    const sunLong = sun.ecliptic.longitude;
                    const moonLong = moon.ecliptic.longitude;
                    const phaseName = calculateMoonPhase(sunLong, moonLong);

                    const moonPhaseEl = document.getElementById('moonPhase');
                    const moonIconEl = document.getElementById('moonIcon');

                    if (moonPhaseEl) moonPhaseEl.textContent = phaseName;
                    if (moonIconEl) moonIconEl.textContent = MOON_ICONS[phaseName] || '🌙';
                }
            }
        }
    } catch (error) {
        console.log('Moon data fetch failed, using fallback calculation:', error);
        // Fallback: calculate locally
        calculateMoonDataFallback();
    }
}

// Calculate moon phase from sun and moon longitudes
function calculateMoonPhase(sunLongitude, moonLongitude) {
    let phaseAngle = (moonLongitude - sunLongitude) % 360;
    if (phaseAngle < 0) phaseAngle += 360;

    if (phaseAngle < 22.5) return 'New Moon';
    if (phaseAngle < 67.5) return 'Waxing Crescent';
    if (phaseAngle < 112.5) return 'First Quarter';
    if (phaseAngle < 157.5) return 'Waxing Gibbous';
    if (phaseAngle < 202.5) return 'Full Moon';
    if (phaseAngle < 247.5) return 'Waning Gibbous';
    if (phaseAngle < 292.5) return 'Last Quarter';
    if (phaseAngle < 337.5) return 'Waning Crescent';
    return 'New Moon';
}

// Fallback moon calculations when API fails
function calculateMoonDataFallback() {
    const now = new Date();

    // Simple synodic month calculation (29.53 days)
    const SYNODIC_MONTH = 29.530588853;
    const KNOWN_NEW_MOON = new Date('2000-01-06T18:14:00Z').getTime();
    const daysSinceNewMoon = (now.getTime() - KNOWN_NEW_MOON) / (1000 * 60 * 60 * 24);
    const moonAge = daysSinceNewMoon % SYNODIC_MONTH;

    // Determine phase
    let phaseName;
    if (moonAge < 1.85) phaseName = 'New Moon';
    else if (moonAge < 7.38) phaseName = 'Waxing Crescent';
    else if (moonAge < 9.23) phaseName = 'First Quarter';
    else if (moonAge < 14.77) phaseName = 'Waxing Gibbous';
    else if (moonAge < 16.61) phaseName = 'Full Moon';
    else if (moonAge < 22.15) phaseName = 'Waning Gibbous';
    else if (moonAge < 24.00) phaseName = 'Last Quarter';
    else phaseName = 'Waning Crescent';

    // Simple approximate moon sign calculation (moon takes ~2.5 days per sign)
    const TROPICAL_MONTH = 27.321661;
    const KNOWN_ARIES_MOON = new Date('2000-01-01T00:00:00Z').getTime();
    const daysSinceAriesMoon = (now.getTime() - KNOWN_ARIES_MOON) / (1000 * 60 * 60 * 24);
    const moonDegree = (daysSinceAriesMoon / TROPICAL_MONTH * 360) % 360;
    const signIndex = Math.floor(moonDegree / 30);
    const signs = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
        'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
    const moonSign = signs[signIndex];

    // Update UI
    const moonPhaseEl = document.getElementById('moonPhase');
    const moonIconEl = document.getElementById('moonIcon');
    const moonSignEl = document.getElementById('moonSign');

    if (moonPhaseEl) moonPhaseEl.textContent = phaseName;
    if (moonIconEl) moonIconEl.textContent = MOON_ICONS[phaseName] || '🌙';
    if (moonSignEl) {
        const zodiacSymbol = ZODIAC_SYMBOLS[moonSign] || '';
        const signCapitalized = moonSign.charAt(0).toUpperCase() + moonSign.slice(1);
        moonSignEl.textContent = `${zodiacSymbol} in ${signCapitalized} (approx)`;
    }
}

// Calculate planetary hour using offline solar algorithm
function updatePlanetaryHour() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday

    // Get location from settings or use default (London)
    const lat = AppState.settings.location?.lat || 51.5074;
    const lon = AppState.settings.location?.long || -0.1278;

    // Calculate sunrise and sunset for today
    const { sunrise, sunset } = calculateSunTimes(now, lat, lon);

    // Determine if we're in a day or night hour
    const currentTime = now.getTime();
    const sunriseTime = sunrise.getTime();
    const sunsetTime = sunset.getTime();

    // Also need tomorrow's sunrise for night hours
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { sunrise: tomorrowSunrise } = calculateSunTimes(tomorrow, lat, lon);

    let hourIndex, dayRuler, hourDuration, hourStart;

    if (currentTime >= sunriseTime && currentTime < sunsetTime) {
        // Daytime - 12 hours from sunrise to sunset
        const dayLength = sunsetTime - sunriseTime;
        hourDuration = dayLength / 12;
        const timeSinceSunrise = currentTime - sunriseTime;
        hourIndex = Math.floor(timeSinceSunrise / hourDuration);
        hourStart = new Date(sunriseTime + hourIndex * hourDuration);
        dayRuler = DAY_RULERS[dayOfWeek];
    } else {
        // Nighttime - 12 hours from sunset to tomorrow's sunrise
        let nightStart, nightEnd;

        if (currentTime >= sunsetTime) {
            // After sunset today
            nightStart = sunsetTime;
            nightEnd = tomorrowSunrise.getTime();
        } else {
            // Before sunrise today - use yesterday's sunset
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            const { sunset: yesterdaySunset } = calculateSunTimes(yesterday, lat, lon);
            nightStart = yesterdaySunset.getTime();
            nightEnd = sunriseTime;
        }

        const nightLength = nightEnd - nightStart;
        hourDuration = nightLength / 12;
        const timeSinceNightStart = currentTime - nightStart;
        hourIndex = Math.floor(timeSinceNightStart / hourDuration) + 12; // Night hours are 12-23
        hourStart = new Date(nightStart + (hourIndex - 12) * hourDuration);

        // Night hours use the previous day's ruler if before midnight determination
        const adjustedDayOfWeek = currentTime < sunriseTime ? (dayOfWeek + 6) % 7 : dayOfWeek;
        dayRuler = DAY_RULERS[adjustedDayOfWeek];
    }

    // Calculate which planet rules this hour
    const dayRulerIndex = CHALDEAN_ORDER.indexOf(dayRuler);
    const planetIndex = (dayRulerIndex + hourIndex) % 7;
    const currentPlanet = CHALDEAN_ORDER[planetIndex];
    const planetData = PLANETS[currentPlanet];

    // Update UI
    const planetIconEl = document.getElementById('currentPlanetIcon');
    const planetNameEl = document.getElementById('currentPlanet');

    if (planetIconEl) {
        planetIconEl.textContent = planetData.symbol;
        planetIconEl.style.color = planetData.color;
    }

    if (planetNameEl) {
        planetNameEl.textContent = planetData.name;
    }
}

// Calculate sunrise and sunset using simplified solar algorithm
function calculateSunTimes(date, lat, lon) {
    // Based on NOAA Solar Calculations
    const dayOfYear = getDayOfYear(date);

    // Fractional year (in radians)
    const gamma = (2 * Math.PI / 365) * (dayOfYear - 1 + (date.getHours() - 12) / 24);

    // Equation of time (minutes)
    const eqTime = 229.18 * (
        0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
        - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma)
    );

    // Solar declination (radians)
    const decl = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
        - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
        - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);

    // Hour angle (radians)
    const latRad = lat * Math.PI / 180;
    const zenith = 90.833 * Math.PI / 180; // Official zenith for sunrise/sunset

    let ha;
    const cosHA = (Math.cos(zenith) / (Math.cos(latRad) * Math.cos(decl)) - Math.tan(latRad) * Math.tan(decl));

    if (cosHA > 1 || cosHA < -1) {
        // Sun never rises or never sets at this latitude/date
        // Return approximate times
        const noon = new Date(date);
        noon.setHours(12, 0, 0, 0);
        return {
            sunrise: new Date(noon.getTime() - 6 * 60 * 60 * 1000),
            sunset: new Date(noon.getTime() + 6 * 60 * 60 * 1000)
        };
    }

    ha = Math.acos(cosHA);

    // Sunrise time in minutes from midnight UTC
    const sunriseMinutes = 720 - 4 * (lon + ha * 180 / Math.PI) - eqTime;
    const sunsetMinutes = 720 - 4 * (lon - ha * 180 / Math.PI) - eqTime;

    // Convert to local time
    const timezoneOffset = date.getTimezoneOffset();

    const sunrise = new Date(date);
    sunrise.setHours(0, 0, 0, 0);
    sunrise.setMinutes(sunriseMinutes + timezoneOffset);

    const sunset = new Date(date);
    sunset.setHours(0, 0, 0, 0);
    sunset.setMinutes(sunsetMinutes + timezoneOffset);

    return { sunrise, sunset };
}

function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
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
            <div class="empty-state-mini">
                <i data-lucide="sunrise"></i>
                <p>No flows scheduled for today</p>
                <button class="btn-mini" onclick="navigateTo('flows')">
                    <i data-lucide="plus"></i> Create Flow
                </button>
            </div>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    list.innerHTML = '';

    // Render Recurring with new design
    recurring.forEach((flow, displayIndex) => {
        const originalIndex = AppState.flows.findIndex(f => f.id === flow.id);
        const today = new Date().toISOString().split('T')[0];
        const isCompletedToday = flow.completedDates && flow.completedDates.includes(today);

        const item = document.createElement('div');
        item.className = 'schedule-item' + (isCompletedToday ? ' completed' : '');
        item.draggable = true;
        item.dataset.flowId = flow.id;
        
        // Generate a random time for display (you could make this configurable)
        const hours = 9 + displayIndex;
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHour = hours > 12 ? hours - 12 : hours;
        
        item.innerHTML = `
            <div class="schedule-time">
                <span class="schedule-hour">${displayHour}:00</span>
                <span class="schedule-period">${period}</span>
            </div>
            <div class="schedule-divider"></div>
            <div class="schedule-info">
                <span class="schedule-title" style="${isCompletedToday ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${flow.title}</span>
                <span class="schedule-meta">${flow.components ? flow.components.length + ' components' : 'Flow'} ${isCompletedToday ? '• Completed' : ''}</span>
            </div>
            <button class="schedule-action" onclick="event.stopPropagation(); openFlowPreview(${originalIndex})" title="${isCompletedToday ? 'View' : 'Start'}">
                <i data-lucide="${isCompletedToday ? 'check' : 'play'}"></i>
            </button>
        `;
        
        item.addEventListener('click', () => openFlowPreview(originalIndex));

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

    // Render One-Offs with new design
    oneOffs.forEach(item => {
        const el = document.createElement('div');
        el.className = 'schedule-item';
        el.innerHTML = `
            <div class="schedule-time">
                <span class="schedule-hour">${item.time || '--'}</span>
            </div>
            <div class="schedule-divider"></div>
            <div class="schedule-info">
                <span class="schedule-title">${item.title}</span>
                <span class="schedule-meta">Scheduled event</span>
            </div>
            <button class="schedule-action" title="View">
                <i data-lucide="calendar"></i>
            </button>
        `;
        list.appendChild(el);
    });
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function updateStatsDisplay() {
    const today = new Date().toISOString().split('T')[0];
    const todayStats = AppState.history[today] || { xp: 0, flows: 0, workings: 0 };

    // Dashboard Stats
    const todayCompletedEl = document.getElementById('todayCompleted');
    if (todayCompletedEl) todayCompletedEl.textContent = todayStats.flows;

    const activeWorkingsEl = document.getElementById('activeWorkings');
    if (activeWorkingsEl) activeWorkingsEl.textContent = AppState.workings.filter(w => w.status === 'active').length;
    
    // Update today's pomodoros for dashboard
    const todayPomsEl = document.getElementById('todayPomodoros');
    if (todayPomsEl) todayPomsEl.textContent = AppState.pomodorosToday || 0;
    
    // Update dashboard progress rings
    updateDashboardProgressRings();

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
        steps: [{ title: "Focus", type: "timer", duration: mins + (secs / 60) }]
    };

    runFlowObject(tempFlow);
};

// --- FLOWS ---
let currentFlowBuilderSteps = [];
let currentFlowCoverImage = null;

window.handleFlowCoverUpload = (input) => {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
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
        el.draggable = true;
        el.dataset.stepIndex = index;
        el.style.flexDirection = 'column';
        el.style.alignItems = 'stretch';
        el.style.gap = '10px';

        // Drag events for step reordering
        el.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', index);
            el.classList.add('dragging');
        });

        el.addEventListener('dragend', () => {
            el.classList.remove('dragging');
        });

        el.addEventListener('dragover', (e) => {
            e.preventDefault();
            el.classList.add('drag-over');
        });

        el.addEventListener('dragleave', () => {
            el.classList.remove('drag-over');
        });

        el.addEventListener('drop', (e) => {
            e.preventDefault();
            el.classList.remove('drag-over');
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const toIndex = index;
            if (fromIndex !== toIndex) {
                const [moved] = currentFlowBuilderSteps.splice(fromIndex, 1);
                currentFlowBuilderSteps.splice(toIndex, 0, moved);
                renderFlowBuilderSteps();
            }
        });

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
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:5px; cursor:grab;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="color:var(--text-muted); cursor:grab;" title="Drag to reorder">⋮⋮</span>
                    <span style="font-weight:bold; color:var(--gold-primary)">${index + 1}. ${step.type.toUpperCase()}</span>
                </div>
                <div style="display:flex; gap:5px;">
                    ${index > 0 ? `<button class="btn-outline btn-sm" onclick="moveStepUp(${index})" title="Move up">↑</button>` : ''}
                    ${index < currentFlowBuilderSteps.length - 1 ? `<button class="btn-outline btn-sm" onclick="moveStepDown(${index})" title="Move down">↓</button>` : ''}
                    <button class="btn-danger btn-sm" onclick="removeFlowStep(${index})" title="Remove">×</button>
                </div>
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
        reader.onload = function (e) {
            currentFlowBuilderSteps[index].image = e.target.result;
            renderFlowBuilderSteps();
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

window.moveStepUp = (index) => {
    if (index <= 0) return;
    const temp = currentFlowBuilderSteps[index];
    currentFlowBuilderSteps[index] = currentFlowBuilderSteps[index - 1];
    currentFlowBuilderSteps[index - 1] = temp;
    renderFlowBuilderSteps();
};

window.moveStepDown = (index) => {
    if (index >= currentFlowBuilderSteps.length - 1) return;
    const temp = currentFlowBuilderSteps[index];
    currentFlowBuilderSteps[index] = currentFlowBuilderSteps[index + 1];
    currentFlowBuilderSteps[index + 1] = temp;
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
    showConfirmModal('Delete Flow', 'Are you sure you want to delete this flow?', () => {
        AppState.flows = AppState.flows.filter(f => f.id !== id);
        saveState();
        renderFlows();
        showNotification('Flow deleted', 'normal');
    });
};

window.duplicateFlow = (id) => {
    const flow = AppState.flows.find(f => f.id === id);
    if (!flow) return;

    const newFlow = {
        ...JSON.parse(JSON.stringify(flow)),
        id: Date.now(),
        title: flow.title + ' (Copy)',
        created: new Date().toISOString(),
        completedDates: []
    };

    AppState.flows.push(newFlow);
    saveState();
    renderFlows();
    showNotification(`Flow duplicated: "${newFlow.title}"`, 'gold');
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
                    <button class="btn-sm btn-outline" onclick="event.stopPropagation(); duplicateFlow(${flow.id})" title="Duplicate">⎘</button>
                    <button class="btn-sm btn-gold" onclick="event.stopPropagation(); editFlow(${flow.id})" title="Edit">✎</button>
                    <button class="btn-sm btn-danger" onclick="event.stopPropagation(); deleteFlow(${flow.id})" title="Delete">×</button>
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
            document.body.classList.add('no-scroll');
        });
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            document.body.classList.remove('no-scroll');
        });
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

        // Mobile Drag Support
        addMobileDragSupport(card, '.drag-handle', (from, to) => {
            const [moved] = AppState.flows.splice(from, 1);
            AppState.flows.splice(to, 0, moved);
            saveState();
            renderFlows();
            showNotification('Flow order updated', 'normal');
        });

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
                <span>${i + 1}. ${s.title}</span>
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
        image: tmpl.image || null,  // Copy template image
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
            <div class="runner-reps" id="runnerRepsDisplay" style="user-select:none;">
                <span id="repsCount" style="font-size:4rem; font-weight:bold; color:var(--gold-primary)">0</span>
                <span style="font-size:1.5rem; color:var(--text-muted)">/ ${runnerState.targetReps}</span>
                <div style="display:flex; gap:20px; justify-content:center; margin-top:15px;">
                    <button class="btn btn-outline btn-sm" onclick="decrementRunnerReps(event)" style="padding:10px 20px; font-size:1.2rem;">−</button>
                    <button class="btn btn-gold btn-sm" onclick="incrementRunnerReps(event)" style="padding:10px 30px; font-size:1.2rem;">+</button>
                </div>
                <div style="font-size:0.85rem; color:var(--text-muted); margin-top:15px;">Tap anywhere, press Space, or use +/− buttons</div>
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
        <p style="color:#888; margin-top:10px;">${step.type === 'timer' ? 'Focus until the timer ends' :
            (step.type === 'reps' ? 'Complete the reps' :
                (step.type === 'stopwatch' ? 'Time your session' :
                    (step.type === 'breathing' ? 'Follow the breathing pattern' : 'Read and internalize')))
        }</p>
    `;

    // Controls with Previous Step button
    const showPrevious = runnerState.stepIndex > 0;
    controls.innerHTML = `
        ${showPrevious ? '<button class="btn btn-outline" onclick="previousStep()">← Previous</button>' : ''}
        ${step.type !== 'reps' ? '<button class="btn btn-outline" onclick="toggleRunnerPause()" id="runnerPauseBtn">Pause</button>' : ''}
        <button class="btn btn-outline" onclick="skipRunnerStep()">Skip</button>
        <button class="btn btn-gold" onclick="nextRunnerStep()">Next Step →</button>
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

window.incrementRunnerReps = (event) => {
    if (event) event.stopPropagation(); // Prevent double-counting from click bubbling
    if (!runnerState.flow || runnerState.flow.steps[runnerState.stepIndex].type !== 'reps') return;

    runnerState.currentReps++;
    updateRepsDisplay();

    if (runnerState.currentReps >= runnerState.targetReps) {
        showNotification("Target Reps Reached!", "gold");
        playNotificationSound();
    }
};

window.decrementRunnerReps = (event) => {
    if (event) event.stopPropagation(); // Prevent triggering increment from click bubbling
    if (!runnerState.flow || runnerState.flow.steps[runnerState.stepIndex].type !== 'reps') return;
    if (runnerState.currentReps <= 0) return;

    runnerState.currentReps--;
    updateRepsDisplay();
};

function updateRepsDisplay() {
    const el = document.getElementById('repsCount');
    if (el) {
        el.textContent = runnerState.currentReps;
        // Quick pulse animation
        el.style.transform = 'scale(1.2)';
        setTimeout(() => el.style.transform = 'scale(1)', 100);
    }
}

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
    showConfirmModal('Exit Flow', 'Exit current flow? Progress will be lost.', () => {
        clearInterval(runnerState.timer);
        document.getElementById('flowRunner').classList.remove('active');
    });
};

window.previousStep = () => {
    if (runnerState.stepIndex > 0) {
        clearInterval(runnerState.timer);
        runnerState.stepIndex--;
        renderRunnerStep();
    }
};

function showCelebration() {
    // Create celebration overlay
    const celebration = document.createElement('div');
    celebration.className = 'celebration-overlay';
    celebration.innerHTML = `
        <div class="celebration-content">
            <div class="celebration-icon">🎉</div>
            <h2>Flow Complete!</h2>
            <p>Great work on finishing your flow</p>
            <div class="celebration-confetti"></div>
        </div>
    `;
    document.body.appendChild(celebration);

    // Create confetti particles
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-particle';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confetti.style.backgroundColor = ['#d4af37', '#ffd700', '#ffec8b', '#daa520', '#fff8dc'][Math.floor(Math.random() * 5)];
        celebration.querySelector('.celebration-confetti').appendChild(confetti);
    }

    // Remove after animation
    setTimeout(() => {
        celebration.remove();
    }, 3000);
}

function finishFlow() {
    clearInterval(runnerState.timer);
    document.getElementById('flowRunner').classList.remove('active');

    // Show celebration
    showCelebration();

    addXP(100);

    // Update history
    const today = new Date().toISOString().split('T')[0];
    if (!AppState.history[today]) AppState.history[today] = { xp: 0, flows: 0, workings: 0 };
    AppState.history[today].flows++;

    const flowName = AppState.activeFlow ? AppState.activeFlow.name : (runnerState.flow ? runnerState.flow.title : 'Flow');
    logActivity('flow', flowName, 100);

    showNotification("Flow Completed! 🎉", "gold");
    saveState();
    checkBadges();
    updateStatsDisplay();

    // Prompt for Journal with styled modal
    setTimeout(() => {
        showConfirmModal('Journal Entry', 'Would you like to add a journal entry for this flow?', () => {
            document.getElementById('journalTitle').value = `Flow: ${flowName}`;
            document.getElementById('journalContent').value = `Completed flow session.\n\nReflections:\n`;
            window.openModal('journalModal');
        });
    }, 3200);
}

// --- MAGICK WORKINGS ---
let currentWorkingImage = null;

window.handleWorkingImageUpload = (input) => {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            currentWorkingImage = e.target.result;
            document.getElementById('workingImage').value = currentWorkingImage;
            document.getElementById('workingImagePreviewImg').src = currentWorkingImage;
            document.getElementById('workingImagePreview').style.display = 'flex';
            document.getElementById('uploadPlaceholder').style.display = 'none';
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.clearWorkingImage = () => {
    currentWorkingImage = null;
    document.getElementById('workingImage').value = '';
    document.getElementById('workingImageFile').value = '';
    document.getElementById('workingImagePreview').style.display = 'none';
    document.getElementById('uploadPlaceholder').style.display = 'flex';
};

window.openWorkingBuilder = () => {
    // Reset form for new working
    document.getElementById('workingName').value = '';
    document.getElementById('workingIntention').value = '';
    document.getElementById('workingAffirmation').value = '';
    document.getElementById('workingDuration').value = '40';
    document.getElementById('workingStartDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('workingImage').value = '';
    document.getElementById('workingImageFile').value = '';
    document.getElementById('workingImagePreview').style.display = 'none';
    document.getElementById('uploadPlaceholder').style.display = 'flex';
    document.getElementById('workingModalTitle').textContent = 'Create Magick Working';
    document.getElementById('workingSaveBtn').innerHTML = '<span class="save-icon">✧</span> Begin Working';
    
    // Reset duration presets
    document.querySelectorAll('.duration-preset').forEach(p => p.classList.remove('active'));
    document.querySelector('.duration-preset[data-days="40"]')?.classList.add('active');
    
    currentWorkingImage = null;
    window.currentEditingWorkingId = null;
    window.openModal('workingBuilderModal');
    
    // Focus on name input
    setTimeout(() => document.getElementById('workingName').focus(), 100);
};

// Duration preset click handlers
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.duration-preset').forEach(preset => {
        preset.addEventListener('click', () => {
            document.querySelectorAll('.duration-preset').forEach(p => p.classList.remove('active'));
            preset.classList.add('active');
            document.getElementById('workingDuration').value = preset.dataset.days;
        });
    });
    
    // Custom duration input sync
    const durationInput = document.getElementById('workingDuration');
    if (durationInput) {
        durationInput.addEventListener('input', () => {
            document.querySelectorAll('.duration-preset').forEach(p => p.classList.remove('active'));
        });
    }
});

window.saveWorking = () => {
    const name = document.getElementById('workingName').value;
    if (!name) return showNotification('Name required', 'error');

    const imageData = document.getElementById('workingImage').value || currentWorkingImage;

    if (window.currentEditingWorkingId) {
        // Edit existing working
        const w = AppState.workings.find(x => x.id === window.currentEditingWorkingId);
        if (w) {
            w.name = name;
            w.intention = document.getElementById('workingIntention').value;
            w.affirmation = document.getElementById('workingAffirmation').value;
            w.duration = parseInt(document.getElementById('workingDuration').value);
            w.startDate = document.getElementById('workingStartDate').value;
            w.image = imageData;
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
            daysCompleted: 0,
            image: imageData,
            completedDays: [],
            sessionNotes: []
        };
        AppState.workings.push(working);
        addXP(50);
        logActivity('working', `Started Working: ${name}`, 50);
    }

    saveState();
    initWorkings();
    window.closeModal('workingBuilderModal');
};

function initWorkings(filterStatus = 'active') {
    const grid = document.getElementById('workingsGrid');
    const list = document.getElementById('activeWorkingsList');

    // Update stats
    updateWorkingsStats();

    // Setup Tabs
    const tabs = document.querySelectorAll('.workings-tabs-new .working-tab');
    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            initWorkings(tab.dataset.tab);
        };
        if (tab.dataset.tab === filterStatus) {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        }
    });

    if (grid) grid.innerHTML = '';
    if (list) list.innerHTML = '';

    const filteredWorkings = AppState.workings.filter(w => w.status === filterStatus);

    // Handle empty state
    const noWorkingsEl = document.getElementById('noWorkings');
    if (filteredWorkings.length === 0) {
        if (noWorkingsEl) {
            noWorkingsEl.style.display = 'flex';
            const statusText = filterStatus === 'active' ? 'Active' : filterStatus === 'planned' ? 'Planned' : 'Completed';
            noWorkingsEl.querySelector('h3').textContent = `No ${statusText} Workings`;
        }
    } else {
        if (noWorkingsEl) noWorkingsEl.style.display = 'none';
    }

    // Render working cards
    filteredWorkings.forEach(w => {
        if (grid) {
            const card = createWorkingCard(w);
            grid.appendChild(card);
        }
    });
    
    // Re-initialize Lucide icons for dynamic content
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

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
                    <span><i data-lucide="calendar" style="width:14px;height:14px;display:inline;vertical-align:middle;margin-right:3px;"></i> Started: ${startDate}</span>
                    <span><i data-lucide="hourglass" style="width:14px;height:14px;display:inline;vertical-align:middle;margin-right:3px;"></i> ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left</span>
                    <span><i data-lucide="map-pin" style="width:14px;height:14px;display:inline;vertical-align:middle;margin-right:3px;"></i> Day ${w.daysCompleted}/${w.duration}</span>
                </div>
            `;
            list.appendChild(item);
        });
    }
}

function createWorkingCard(w) {
    const card = document.createElement('div');
    card.className = `working-card ${w.status === 'completed' ? 'completed-card' : ''}`;
    
    const progress = Math.round((w.daysCompleted / w.duration) * 100);
    const startDate = w.startDate ? new Date(w.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A';
    const daysLeft = w.duration - w.daysCompleted;
    
    // Generate progress circles (max 40 visible, rest collapsed)
    let circlesHtml = '';
    const maxVisibleCircles = Math.min(w.duration, 40);
    for (let i = 0; i < maxVisibleCircles; i++) {
        const filled = i < w.daysCompleted;
        const isToday = i === w.daysCompleted && w.status === 'active';
        circlesHtml += `<div class="working-circle ${filled ? 'filled' : ''} ${isToday ? 'today' : ''}" title="Day ${i + 1}"></div>`;
    }
    if (w.duration > 40) {
        circlesHtml += `<span style="font-size:0.7rem; color:var(--text-muted); margin-left:5px;">+${w.duration - 40} more</span>`;
    }
    
    // Build image section if exists
    let imageHtml = '';
    if (w.image) {
        imageHtml = `<div class="working-card-image" style="background-image: url('${w.image}')"></div>`;
    }
    
    // Build intention/affirmation sections
    let intentionHtml = '';
    if (w.intention) {
        intentionHtml = `
            <div class="working-intention">
                <div class="working-intention-label">Intention</div>
                <div class="working-intention-text">${w.intention}</div>
            </div>
        `;
    }
    
    let affirmationHtml = '';
    if (w.affirmation) {
        affirmationHtml = `
            <div class="working-affirmation">
                <div class="working-affirmation-label">Affirmation</div>
                <div class="working-affirmation-text">"${w.affirmation}"</div>
            </div>
        `;
    }
    
    // Action buttons based on status
    let actionsHtml = '';
    if (w.status === 'active') {
        actionsHtml = `
            <button class="working-action-btn primary" onclick="doWorkingDaily(${w.id})">
                <i data-lucide="sparkle"></i> Complete Day
            </button>
            ${w.daysCompleted > 0 ? `<button class="working-action-btn" onclick="decrementWorkingDay(${w.id})"><i data-lucide="minus"></i></button>` : ''}
            <button class="working-action-btn" onclick="editWorking(${w.id})"><i data-lucide="pencil"></i></button>
            <button class="working-action-btn" onclick="toggleWorkingStatus(${w.id})"><i data-lucide="pause"></i></button>
            <button class="working-action-btn danger" onclick="deleteWorking(${w.id})"><i data-lucide="trash-2"></i></button>
        `;
    } else if (w.status === 'planned') {
        actionsHtml = `
            <button class="working-action-btn primary" onclick="toggleWorkingStatus(${w.id})">
                <i data-lucide="play"></i> Activate
            </button>
            <button class="working-action-btn" onclick="editWorking(${w.id})"><i data-lucide="pencil"></i></button>
            <button class="working-action-btn danger" onclick="deleteWorking(${w.id})"><i data-lucide="trash-2"></i></button>
        `;
    } else {
        actionsHtml = `
            <button class="working-action-btn" onclick="toggleWorkingStatus(${w.id})">
                <i data-lucide="refresh-cw"></i> Restart
            </button>
            <button class="working-action-btn danger" onclick="deleteWorking(${w.id})"><i data-lucide="trash-2"></i></button>
        `;
    }
    
    card.innerHTML = `
        ${imageHtml}
        <div class="working-card-header">
            <h3 class="working-card-title">${w.name}</h3>
        </div>
        <div class="working-card-body">
            <div class="working-progress-section">
                <div class="working-progress-header">
                    <span class="working-day-label">Day <strong>${w.daysCompleted}</strong> of ${w.duration}</span>
                    <span class="working-percentage">${progress}%</span>
                </div>
                <div class="working-progress-bar">
                    <div class="working-progress-fill" style="width: ${progress}%"></div>
                </div>
                <div class="working-circles-container">
                    ${circlesHtml}
                </div>
            </div>
            ${intentionHtml}
            ${affirmationHtml}
            <div class="working-card-meta">
                <span class="working-meta-item"><i data-lucide="calendar"></i> ${startDate}</span>
                ${w.status === 'active' ? `<span class="working-meta-item"><i data-lucide="hourglass"></i> ${daysLeft} days left</span>` : ''}
            </div>
        </div>
        <div class="working-card-footer">
            ${actionsHtml}
        </div>
    `;
    
    return card;
}

function updateWorkingsStats() {
    const activeCount = AppState.workings.filter(w => w.status === 'active').length;
    const plannedCount = AppState.workings.filter(w => w.status === 'planned').length;
    const completedCount = AppState.workings.filter(w => w.status === 'completed').length;
    
    // Calculate streak (consecutive days with at least one working completed)
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let d = 0; d < 365; d++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - d);
        const dateStr = checkDate.toISOString().split('T')[0];
        
        const hasCompletion = AppState.workings.some(w => 
            w.completedDays && w.completedDays.includes(dateStr)
        );
        
        if (hasCompletion) {
            streak++;
        } else if (d > 0) {
            break;
        }
    }
    
    // Update UI
    const activeEl = document.getElementById('workingsActiveCount');
    const plannedEl = document.getElementById('workingsPlannedCount');
    const completedEl = document.getElementById('workingsCompletedCount');
    const streakEl = document.getElementById('workingsStreak');
    
    if (activeEl) activeEl.textContent = activeCount;
    if (plannedEl) plannedEl.textContent = plannedCount;
    if (completedEl) completedEl.textContent = completedCount;
    if (streakEl) streakEl.textContent = streak;
    
    // Update tab counts
    const tabActiveCount = document.getElementById('tabActiveCount');
    const tabPlannedCount = document.getElementById('tabPlannedCount');
    const tabCompletedCount = document.getElementById('tabCompletedCount');
    
    if (tabActiveCount) tabActiveCount.textContent = activeCount;
    if (tabPlannedCount) tabPlannedCount.textContent = plannedCount;
    if (tabCompletedCount) tabCompletedCount.textContent = completedCount;
}

window.toggleWorkingStatus = (id) => {
    const w = AppState.workings.find(x => x.id === id);
    if (w) {
        if (w.status === 'active') w.status = 'planned';
        else if (w.status === 'planned' || w.status === 'paused') w.status = 'active';
        else if (w.status === 'completed') w.status = 'active';
        saveState();
        const activeTab = document.querySelector('.workings-tabs-new .working-tab.active')?.dataset.tab || 'active';
        initWorkings(activeTab);
    }
};

window.deleteWorking = (id) => {
    showConfirmModal('Delete Working', 'Delete this working? All progress will be lost.', () => {
        AppState.workings = AppState.workings.filter(x => x.id !== id);
        saveState();
        const activeTab = document.querySelector('.workings-tabs-new .working-tab.active')?.dataset.tab || 'active';
        initWorkings(activeTab);
        showNotification('Working deleted', 'normal');
    });
};

window.decrementWorkingDay = (id) => {
    const w = AppState.workings.find(x => x.id === id);
    if (w && w.daysCompleted > 0) {
        w.daysCompleted--;
        saveState();
        const activeTab = document.querySelector('.workings-tabs-new .working-tab.active')?.dataset.tab || 'active';
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
    document.getElementById('workingModalTitle').textContent = 'Edit Working';
    document.getElementById('workingSaveBtn').innerHTML = '<span class="save-icon">✧</span> Save Changes';

    // Reset duration presets and highlight matching one
    document.querySelectorAll('.duration-preset').forEach(p => {
        p.classList.remove('active');
        if (parseInt(p.dataset.days) === w.duration) {
            p.classList.add('active');
        }
    });

    // Handle image
    currentWorkingImage = w.image || null;
    document.getElementById('workingImage').value = currentWorkingImage || '';
    if (currentWorkingImage) {
        document.getElementById('workingImagePreviewImg').src = currentWorkingImage;
        document.getElementById('workingImagePreview').style.display = 'flex';
        document.getElementById('uploadPlaceholder').style.display = 'none';
    } else {
        document.getElementById('workingImagePreview').style.display = 'none';
        document.getElementById('uploadPlaceholder').style.display = 'flex';
    }

    window.currentEditingWorkingId = id;
    window.openModal('workingBuilderModal');
};

window.doWorkingDaily = (id) => {
    const w = AppState.workings.find(x => x.id === id);
    if (w) {
        const today = new Date().toISOString().split('T')[0];

        w.daysCompleted++;

        // Track completed days
        if (!w.completedDays) w.completedDays = [];
        if (!w.completedDays.includes(today)) {
            w.completedDays.push(today);
        }

        addXP(20);
        logActivity('working', `Working: ${w.name} - Day ${w.daysCompleted}`, 20);
        showNotification(`Day ${w.daysCompleted} completed for ${w.name}`, 'gold');

        if (w.daysCompleted >= w.duration) {
            w.status = 'completed';
            showCelebration();
            showNotification(`Working "${w.name}" Fully Completed! 🎉`, 'gold');
            addXP(500);
        }
        saveState();
        initWorkings();

        // Prompt for Journal
        setTimeout(() => {
            showConfirmModal('Add Session Note', 'Would you like to add a journal entry for this session?', () => {
                document.getElementById('journalTitle').value = `Working: ${w.name} - Day ${w.daysCompleted}`;
                document.getElementById('journalContent').value = `Completed day ${w.daysCompleted} of ${w.duration}.\n\nReflections:\n`;
                window.openModal('journalModal');
            });
        }, 500);
    }
};

// --- TASKS ---
let editingTaskId = null;
let currentTaskSubtasks = [];
let defaultTaskStatus = 'todo';

function initTasks() {
    renderTasks();
    initTaskDragDrop();
    initTaskModalControls();
}

function initTaskModalControls() {
    // Category chip selection
    document.querySelectorAll('.category-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            document.getElementById('taskCategory').value = chip.dataset.value;
        });
    });

    // Priority button selection
    document.querySelectorAll('.priority-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('taskPriority').value = btn.dataset.value;
        });
    });
}

function initTaskDragDrop() {
    // Setup drag-and-drop for task columns
    const columns = document.querySelectorAll('.tasks-list');
    columns.forEach(column => {
        column.addEventListener('dragover', (e) => {
            e.preventDefault();
            try { e.dataTransfer.dropEffect = 'move'; } catch (err) { }
            column.classList.add('drag-over');
        });

        column.addEventListener('dragleave', () => {
            column.classList.remove('drag-over');
        });

        column.addEventListener('drop', (e) => {
            e.preventDefault();
            column.classList.remove('drag-over');

            let taskId = parseInt(e.dataTransfer.getData('text/plain'));
            if (isNaN(taskId)) {
                const draggingEl = document.querySelector('.task-card.dragging') || e.target.closest('.task-card');
                if (draggingEl && draggingEl.dataset && draggingEl.dataset.taskId) {
                    taskId = parseInt(draggingEl.dataset.taskId);
                }
            }

            const newStatus = column.dataset.status;
            const task = AppState.tasks.find(t => t.id === taskId);
            if (task && task.status !== newStatus) {
                const wasNotDone = task.status !== 'done';
                task.status = newStatus;

                if (newStatus === 'done' && wasNotDone) {
                    addXP(15);
                    logActivity('task', `Completed Task: ${task.name}`, 15);
                }

                saveState();
                renderTasks();
            }
        });
    });

    // Column container drop handling
    const columnContainers = document.querySelectorAll('.tasks-column');
    columnContainers.forEach(container => {
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            try { e.dataTransfer.dropEffect = 'move'; } catch (err) { }
            const list = container.querySelector('.tasks-list');
            if (list) list.classList.add('drag-over');
        });

        container.addEventListener('dragleave', () => {
            const list = container.querySelector('.tasks-list');
            if (list) list.classList.remove('drag-over');
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            const list = container.querySelector('.tasks-list');
            if (list) list.classList.remove('drag-over');

            let taskId = parseInt(e.dataTransfer.getData('text/plain'));
            if (isNaN(taskId)) {
                const draggingEl = document.querySelector('.task-card.dragging') || e.target.closest('.task-card');
                if (draggingEl && draggingEl.dataset && draggingEl.dataset.taskId) {
                    taskId = parseInt(draggingEl.dataset.taskId);
                }
            }

            const newStatus = list ? list.dataset.status : null;
            const task = AppState.tasks.find(t => t.id === taskId);
            if (task && newStatus && task.status !== newStatus) {
                const wasNotDone = task.status !== 'done';
                task.status = newStatus;

                if (newStatus === 'done' && wasNotDone) {
                    addXP(15);
                    logActivity('task', `Completed Task: ${task.name}`, 15);
                }

                saveState();
                renderTasks();
            }
        });
    });
}

window.openTaskModal = (status = 'todo') => {
    editingTaskId = null;
    defaultTaskStatus = status;
    currentTaskSubtasks = [];

    // Reset form
    document.getElementById('taskName').value = '';
    document.getElementById('taskDueDate').value = '';
    document.getElementById('taskDescription').value = '';

    // Reset category chips
    document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
    document.querySelector('.category-chip[data-value="general"]').classList.add('active');
    document.getElementById('taskCategory').value = 'general';

    // Reset priority buttons
    document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.priority-btn[data-value="medium"]').classList.add('active');
    document.getElementById('taskPriority').value = 'medium';

    // Reset subtasks
    document.getElementById('subtasksList').innerHTML = '';
    document.getElementById('subtasksCount').textContent = '(0)';
    document.getElementById('subtasksPanel').style.display = 'none';
    document.querySelector('.subtasks-header').classList.remove('expanded');

    document.getElementById('taskModalTitle').innerHTML = '<span class="modal-title-icon">✨</span> New Task';
    window.openModal('taskModal');

    // Focus on name input
    setTimeout(() => document.getElementById('taskName').focus(), 100);
};

window.editTask = (id) => {
    const task = AppState.tasks.find(t => t.id === id);
    if (!task) return;

    editingTaskId = id;
    currentTaskSubtasks = task.subtasks ? [...task.subtasks] : [];

    document.getElementById('taskName').value = task.name;
    document.getElementById('taskDueDate').value = task.dueDate || '';
    document.getElementById('taskDescription').value = task.description || '';

    // Set category chip
    document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
    const categoryChip = document.querySelector(`.category-chip[data-value="${task.category.toLowerCase()}"]`);
    if (categoryChip) {
        categoryChip.classList.add('active');
        document.getElementById('taskCategory').value = task.category.toLowerCase();
    }

    // Set priority button
    document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
    const priorityBtn = document.querySelector(`.priority-btn[data-value="${task.priority.toLowerCase()}"]`);
    if (priorityBtn) {
        priorityBtn.classList.add('active');
        document.getElementById('taskPriority').value = task.priority.toLowerCase();
    }

    // Render subtasks
    renderSubtasksList();

    document.getElementById('taskModalTitle').innerHTML = '<span class="modal-title-icon"><i data-lucide="pencil"></i></span> Edit Task';
    window.openModal('taskModal');
};

window.saveTask = () => {
    const name = document.getElementById('taskName').value.trim();
    if (!name) {
        showNotification('Please enter a task name', 'error');
        return;
    }

    const category = document.getElementById('taskCategory').value;
    const priority = document.getElementById('taskPriority').value;
    const dueDate = document.getElementById('taskDueDate').value || null;
    const description = document.getElementById('taskDescription').value.trim() || null;

    if (editingTaskId) {
        const task = AppState.tasks.find(t => t.id === editingTaskId);
        if (task) {
            task.name = name;
            task.category = category;
            task.priority = priority;
            task.dueDate = dueDate;
            task.description = description;
            task.subtasks = currentTaskSubtasks;
            showNotification('Task updated', 'gold');
        }
    } else {
        const task = {
            id: Date.now(),
            name,
            category,
            priority,
            dueDate,
            description,
            subtasks: currentTaskSubtasks,
            status: defaultTaskStatus,
            created: new Date().toISOString()
        };
        AppState.tasks.push(task);
        showNotification('Task created', 'gold');
    }

    saveState();
    renderTasks();
    window.closeModal('taskModal');
    editingTaskId = null;
    currentTaskSubtasks = [];
};

window.clearTaskDueDate = () => {
    document.getElementById('taskDueDate').value = '';
};

window.toggleSubtasksPanel = () => {
    const panel = document.getElementById('subtasksPanel');
    const header = document.querySelector('.subtasks-header');
    const isExpanded = panel.style.display !== 'none';

    panel.style.display = isExpanded ? 'none' : 'block';
    header.classList.toggle('expanded', !isExpanded);
};

window.addSubtask = () => {
    const input = document.getElementById('newSubtaskInput');
    const text = input.value.trim();
    if (!text) return;

    currentTaskSubtasks.push({
        id: Date.now(),
        text,
        completed: false
    });

    input.value = '';
    renderSubtasksList();
};

window.handleSubtaskKeypress = (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        addSubtask();
    }
};

window.toggleSubtask = (subtaskId) => {
    const subtask = currentTaskSubtasks.find(s => s.id === subtaskId);
    if (subtask) {
        subtask.completed = !subtask.completed;
        renderSubtasksList();
    }
};

window.deleteSubtask = (subtaskId) => {
    currentTaskSubtasks = currentTaskSubtasks.filter(s => s.id !== subtaskId);
    renderSubtasksList();
};

function renderSubtasksList() {
    const list = document.getElementById('subtasksList');
    const countEl = document.getElementById('subtasksCount');

    const completedCount = currentTaskSubtasks.filter(s => s.completed).length;
    countEl.textContent = `(${completedCount}/${currentTaskSubtasks.length})`;

    list.innerHTML = currentTaskSubtasks.map(sub => `
        <div class="subtask-item ${sub.completed ? 'completed' : ''}">
            <div class="subtask-check ${sub.completed ? 'checked' : ''}" onclick="toggleSubtask(${sub.id})"></div>
            <span class="subtask-text">${sub.text}</span>
            <button class="subtask-delete" onclick="deleteSubtask(${sub.id})">×</button>
        </div>
    `).join('');
}

window.clearTaskFilters = () => {
    document.getElementById('taskSearch').value = '';
    document.getElementById('taskCategoryFilter').value = '';
    document.getElementById('taskPriorityFilter').value = '';
    renderTasks();
};

window.clearDoneTasks = () => {
    const doneCount = AppState.tasks.filter(t => t.status === 'done').length;
    if (doneCount === 0) return;

    if (confirm(`Clear ${doneCount} completed task${doneCount > 1 ? 's' : ''}?`)) {
        AppState.tasks = AppState.tasks.filter(t => t.status !== 'done');
        saveState();
        renderTasks();
        showNotification('Completed tasks cleared', 'gold');
    }
};

function renderTasks() {
    const todoList = document.getElementById('todoList');
    const progressList = document.getElementById('progressList');
    const doneList = document.getElementById('doneList');

    if (!todoList) return;

    // Get filter values
    const searchQuery = document.getElementById('taskSearch')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('taskCategoryFilter')?.value.toLowerCase() || '';
    const priorityFilter = document.getElementById('taskPriorityFilter')?.value.toLowerCase() || '';

    // Filter tasks
    const filteredTasks = AppState.tasks.filter(task => {
        if (searchQuery && !task.name.toLowerCase().includes(searchQuery)) return false;
        if (categoryFilter && task.category.toLowerCase() !== categoryFilter) return false;
        if (priorityFilter && task.priority.toLowerCase() !== priorityFilter) return false;
        return true;
    });

    todoList.innerHTML = '';
    progressList.innerHTML = '';
    doneList.innerHTML = '';

    let counts = { todo: 0, progress: 0, done: 0 };
    const today = new Date().toISOString().split('T')[0];

    // Category icons - using Lucide icon names
    const categoryIcons = {
        general: 'pin',
        work: 'briefcase',
        personal: 'user',
        health: 'heart-pulse',
        study: 'book-open',
        spiritual: 'sparkles',
        fitness: 'activity'
    };

    // Priority colors
    const priorityColors = {
        high: '#ff6b6b',
        medium: '#d4af37',
        low: '#4ade80'
    };

    filteredTasks.forEach(task => {
        counts[task.status]++;
        const el = document.createElement('div');
        el.className = 'task-card';
        el.draggable = true;
        el.dataset.taskId = task.id;

        const isDone = task.status === 'done';
        const isOverdue = task.dueDate && task.dueDate < today && !isDone;
        const priorityColor = priorityColors[task.priority.toLowerCase()] || '#d4af37';

        el.style.setProperty('--task-priority-color', priorityColor);

        if (isOverdue) el.classList.add('task-overdue');
        if (isDone) el.classList.add('completed');

        // Setup drag events
        el.addEventListener('dragstart', (e) => {
            try { e.dataTransfer.setData('text/plain', String(task.id)); } catch (err) { }
            try { e.dataTransfer.effectAllowed = 'move'; } catch (err) { }
            el.classList.add('dragging');
        });

        el.addEventListener('dragend', () => {
            el.classList.remove('dragging');
        });

        // Format due date
        let dueDateHtml = '';
        if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            const dateStr = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            dueDateHtml = `<span class="task-tag due-tag ${isOverdue ? 'overdue' : ''}"><i data-lucide="calendar"></i> ${dateStr}</span>`;
        }

        // Subtasks progress
        let subtasksHtml = '';
        if (task.subtasks && task.subtasks.length > 0) {
            const completedSubs = task.subtasks.filter(s => s.completed).length;
            const progress = (completedSubs / task.subtasks.length) * 100;
            subtasksHtml = `
                <div class="task-subtasks-progress">
                    <div class="subtasks-progress-bar">
                        <div class="subtasks-progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <span class="subtasks-progress-text">${completedSubs}/${task.subtasks.length} subtasks</span>
                </div>
            `;
        }

        const categoryIcon = categoryIcons[task.category.toLowerCase()] || 'pin';

        el.innerHTML = `
            <div class="task-card-main">
                <div class="task-checkbox ${isDone ? 'checked' : ''}" onclick="event.stopPropagation(); toggleTaskDone(${task.id})"></div>
                <div class="task-card-content">
                    <div class="task-card-title">${task.name}</div>
                    <div class="task-card-meta">
                        <span class="task-tag category-tag"><i data-lucide="${categoryIcon}"></i> ${task.category}</span>
                        <span class="task-tag priority-tag priority-${task.priority.toLowerCase()}">${task.priority}</span>
                        ${dueDateHtml}
                    </div>
                    ${subtasksHtml}
                </div>
                <div class="task-card-actions">
                    <button class="task-action-btn" onclick="event.stopPropagation(); editTask(${task.id})" title="Edit"><i data-lucide="pencil"></i></button>
                    <button class="task-action-btn delete-btn" onclick="event.stopPropagation(); deleteTask(${task.id})" title="Delete"><i data-lucide="trash-2"></i></button>
                </div>
            </div>
        `;

        if (task.status === 'todo') todoList.appendChild(el);
        if (task.status === 'progress') progressList.appendChild(el);
        if (task.status === 'done') doneList.appendChild(el);
    });

    // Update counts
    document.getElementById('todoCount').textContent = counts.todo;
    document.getElementById('progressCount').textContent = counts.progress;
    document.getElementById('doneCount').textContent = counts.done;

    // Update quick stats
    const totalEl = document.getElementById('tasksQuickTotal');
    const doneEl = document.getElementById('tasksQuickDone');
    if (totalEl) {
        totalEl.innerHTML = `<span class="stat-num">${AppState.tasks.length}</span> total`;
    }

    // Count done today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const doneToday = AppState.tasks.filter(t => 
        t.status === 'done' && t.completedAt && new Date(t.completedAt) >= todayStart
    ).length;
    if (doneEl) {
        doneEl.innerHTML = `<span class="stat-num">${doneToday}</span> done today`;
    }

    // Show/hide clear done button
    const clearDoneBtn = document.getElementById('clearDoneBtn');
    if (clearDoneBtn) {
        clearDoneBtn.style.display = counts.done > 0 ? 'block' : 'none';
    }
    
    // Re-initialize Lucide icons for dynamic content
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

window.toggleTaskDone = (id) => {
    const task = AppState.tasks.find(t => t.id === id);
    if (!task) return;

    if (task.status === 'done') {
        task.status = 'todo';
        task.completedAt = null;
    } else {
        task.status = 'done';
        task.completedAt = new Date().toISOString();
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
            task.completedAt = new Date().toISOString();
            addXP(15);
            logActivity('task', `Completed Task: ${task.name}`, 15);
        }
        saveState();
        renderTasks();
    }
};

window.deleteTask = (id) => {
    if (confirm('Delete this task?')) {
        AppState.tasks = AppState.tasks.filter(t => t.id !== id);
        saveState();
        renderTasks();
        showNotification('Task deleted', 'gold');
    }
};

// --- POMODORO ---
function initPomodoro() {
    // Initialize settings if missing
    if (!AppState.settings.pomodoro) {
        AppState.settings.pomodoro = {
            work: 25,
            short: 5,
            long: 15,
            longBreakAfter: 4,
            dailyGoal: 4
        };
    }

    // Initialize pomoState if missing or fix old state
    if (!AppState.pomoState) {
        AppState.pomoState = {
            mode: 'work',
            time: AppState.settings.pomodoro.work * 60,
            totalTime: AppState.settings.pomodoro.work * 60,
            isRunning: false,
            interval: null,
            sessionCount: 0
        };
    } else {
        // Ensure sessionCount exists for old saved states
        if (typeof AppState.pomoState.sessionCount !== 'number') {
            AppState.pomoState.sessionCount = 0;
        }
    }

    // Update settings displays
    updatePomoSettingsDisplay();

    // Populate Mastery Link selector
    updatePomoMasterySelector();

    // Initialize display
    resetPomodoro();
    updatePomoStats();

    // Mode tab handling
    const modeTabs = document.querySelectorAll('.pomo-tab');
    modeTabs.forEach(tab => {
        tab.onclick = () => {
            if (AppState.pomoState.isRunning) {
                showNotification('Stop timer before switching modes', 'normal');
                return;
            }
            modeTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            AppState.pomoState.mode = tab.dataset.mode;
            updatePomoModeColors();
            resetPomodoro();
        };
    });

    // Mastery link selector
    const pomoMasterySelect = document.getElementById('pomoMasterySelect');
    if (pomoMasterySelect) {
        pomoMasterySelect.onchange = (e) => {
            AppState.settings.pomodoro.linkedMasteryId = e.target.value || null;
            saveState();
            updatePomoLinkedDisplay();
        };
    }
}

function updatePomoSettingsDisplay() {
    const workEl = document.getElementById('workDurationDisplay');
    const shortEl = document.getElementById('shortBreakDisplay');
    const longEl = document.getElementById('longBreakDisplay');
    
    if (workEl) workEl.textContent = AppState.settings.pomodoro.work;
    if (shortEl) shortEl.textContent = AppState.settings.pomodoro.short;
    if (longEl) longEl.textContent = AppState.settings.pomodoro.long;
}

function updatePomoMasterySelector() {
    const select = document.getElementById('pomoMasterySelect');
    if (!select) return;

    const currentVal = AppState.settings.pomodoro.linkedMasteryId;
    select.innerHTML = '<option value="">No goal linked</option>';
    
    AppState.mastery.forEach(m => {
        if (m.type === 'hours' && !m.archived) {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = `${m.icon || '🧘'} ${m.name}`;
            if (currentVal == m.id) opt.selected = true;
            select.appendChild(opt);
        }
    });
}

function updatePomoLinkedDisplay() {
    const pill = document.getElementById('pomoLinkedPill');
    const nameEl = document.getElementById('pomoLinkedName');
    const dot = document.getElementById('pomoLinkedDot');

    const linkedId = AppState.settings.pomodoro?.linkedMasteryId;
    if (linkedId) {
        const m = AppState.mastery.find(x => x.id == linkedId);
        if (m) {
            if (pill) pill.style.display = 'inline-flex';
            if (nameEl) nameEl.textContent = `${m.icon || '🧘'} ${m.name}`;
            if (dot) dot.style.setProperty('--linked-color', m.color || 'var(--gold-primary)');
            return;
        }
    }
    if (pill) pill.style.display = 'none';
}

window.clearPomoLink = () => {
    AppState.settings.pomodoro.linkedMasteryId = null;
    const select = document.getElementById('pomoMasterySelect');
    if (select) select.value = '';
    saveState();
    updatePomoLinkedDisplay();
};

window.adjustPomoSetting = (key, delta) => {
    const settings = AppState.settings.pomodoro;
    const mins = { work: [5, 120], short: [1, 30], long: [5, 60] };
    const [min, max] = mins[key] || [1, 120];
    
    settings[key] = Math.max(min, Math.min(max, settings[key] + delta));
    saveState();
    updatePomoSettingsDisplay();
    
    // If not running and in this mode, update timer
    if (!AppState.pomoState.isRunning && AppState.pomoState.mode === key) {
        AppState.pomoState.time = settings[key] * 60;
        AppState.pomoState.totalTime = AppState.pomoState.time;
        updatePomoDisplay();
    }
};

function updatePomoModeColors() {
    const main = document.querySelector('.pomo-main');
    if (!main) return;
    
    const mode = AppState.pomoState.mode;
    if (mode === 'short' || mode === 'long') {
        main.classList.add('break-mode');
    } else {
        main.classList.remove('break-mode');
    }
}

window.togglePomodoro = () => {
    const playBtn = document.getElementById('pomoPlayBtn');
    const playIcon = document.getElementById('pomoPlayIcon');

    if (AppState.pomoState.isRunning) {
        // Pause
        clearInterval(AppState.pomoState.interval);
        AppState.pomoState.isRunning = false;
        if (playIcon) playIcon.innerHTML = '<i data-lucide="play"></i>';
        if (playBtn) playBtn.classList.remove('running');
        saveState();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } else {
        // Start
        AppState.pomoState.isRunning = true;
        if (playIcon) playIcon.innerHTML = '<i data-lucide="pause"></i>';
        if (playBtn) playBtn.classList.add('running');
        if (typeof lucide !== 'undefined') lucide.createIcons();
        
        updatePomoStatusText();

        AppState.pomoState.interval = setInterval(() => {
            AppState.pomoState.time--;
            updatePomoDisplay();

            if (AppState.pomoState.time % 10 === 0) saveState();

            if (AppState.pomoState.time <= 0) {
                clearInterval(AppState.pomoState.interval);
                AppState.pomoState.isRunning = false;
                if (playIcon) playIcon.innerHTML = '<i data-lucide="play"></i>';
                if (playBtn) playBtn.classList.remove('running');
                if (typeof lucide !== 'undefined') lucide.createIcons();

                playNotificationSound();
                
                if (AppState.pomoState.mode === 'work') {
                    // Work session complete
                    AppState.pomodorosToday++;
                    AppState.totalPomodoros++;
                    AppState.pomoState.sessionCount++;
                    AppState.lastPomodoroDate = new Date().toISOString().split('T')[0];

                    const durationMin = AppState.settings.pomodoro.work || 25;
                    const xpGained = durationMin;
                    addXP(xpGained);

                    // Add to linked Mastery goal
                    const linkedId = AppState.settings.pomodoro.linkedMasteryId;
                    if (linkedId) {
                        const mastery = AppState.mastery.find(m => m.id == linkedId);
                        if (mastery) {
                            const hoursGained = durationMin / 60;
                            mastery.currentHours += hoursGained;
                            mastery.lastLog = new Date().toISOString();
                            if (!mastery.logs) mastery.logs = [];
                            mastery.logs.push({
                                date: new Date().toISOString(),
                                amount: hoursGained,
                                note: 'Pomodoro session'
                            });
                            logActivity('pomodoro', `Session: ${mastery.name}`, xpGained);
                            showNotification(`🎉 Session complete! +${durationMin}m to ${mastery.name}`, 'gold');
                            renderMastery();
                        } else {
                            logActivity('pomodoro', 'Focus Session', xpGained);
                            showNotification('🎉 Focus session complete! +' + xpGained + ' XP', 'gold');
                        }
                    } else {
                        logActivity('pomodoro', 'Focus Session', xpGained);
                        showNotification('🎉 Focus session complete! +' + xpGained + ' XP', 'gold');
                    }

                    // Auto switch to break
                    const sessionCount = AppState.pomoState.sessionCount;
                    const longBreakAfter = AppState.settings.pomodoro.longBreakAfter || 4;
                    
                    if (sessionCount % longBreakAfter === 0) {
                        switchPomoMode('long');
                    } else {
                        switchPomoMode('short');
                    }
                } else {
                    // Break complete
                    showNotification('☕ Break over! Ready to focus?', 'normal');
                    switchPomoMode('work');
                }

                saveState();
                updatePomoStats();
            }
        }, 1000);
    }
};

function switchPomoMode(mode) {
    AppState.pomoState.mode = mode;
    
    const tabs = document.querySelectorAll('.pomo-tab');
    tabs.forEach(t => {
        t.classList.toggle('active', t.dataset.mode === mode);
    });
    
    updatePomoModeColors();
    resetPomodoro();
}

window.resetPomodoro = () => {
    clearInterval(AppState.pomoState.interval);
    AppState.pomoState.isRunning = false;

    const settings = AppState.settings.pomodoro || { work: 25, short: 5, long: 15 };
    AppState.pomoState.time = settings[AppState.pomoState.mode] * 60;
    AppState.pomoState.totalTime = AppState.pomoState.time;

    updatePomoDisplay();
    updatePomoLinkedDisplay();
    updatePomoStatusText();
    saveState();

    const playIcon = document.getElementById('pomoPlayIcon');
    const playBtn = document.getElementById('pomoPlayBtn');
    if (playIcon) playIcon.innerHTML = '<i data-lucide="play"></i>';
    if (playBtn) playBtn.classList.remove('running');
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.skipPomodoro = () => {
    if (AppState.pomoState.isRunning) {
        showNotification('Stop timer before skipping', 'normal');
        return;
    }
    
    const mode = AppState.pomoState.mode;
    if (mode === 'work') {
        const longBreakAfter = AppState.settings.pomodoro.longBreakAfter || 4;
        const sessionCount = AppState.pomoState.sessionCount;
        if ((sessionCount + 1) % longBreakAfter === 0) {
            switchPomoMode('long');
        } else {
            switchPomoMode('short');
        }
    } else {
        switchPomoMode('work');
    }
};

function updatePomoStatusText() {
    const statusEl = document.getElementById('pomoStatus');
    if (!statusEl) return;
    
    const mode = AppState.pomoState.mode;
    const isRunning = AppState.pomoState.isRunning;
    
    if (!isRunning && AppState.pomoState.time === AppState.pomoState.totalTime) {
        statusEl.textContent = mode === 'work' ? 'Ready to Focus' : 'Time for a Break';
    } else if (isRunning) {
        statusEl.textContent = mode === 'work' ? 'Deep Focus' : (mode === 'short' ? 'Short Break' : 'Long Break');
    } else {
        statusEl.textContent = 'Paused';
    }
}

function updatePomoDisplay() {
    const m = Math.floor(AppState.pomoState.time / 60).toString().padStart(2, '0');
    const s = (AppState.pomoState.time % 60).toString().padStart(2, '0');

    const timeEl = document.getElementById('pomoTimeDisplay');
    if (timeEl) timeEl.textContent = `${m}:${s}`;

    // Update session label
    const sessionLabel = document.getElementById('pomoSessionLabel');
    if (sessionLabel) {
        const sessionCount = AppState.pomoState.sessionCount || 0;
        const longBreakAfter = AppState.settings.pomodoro.longBreakAfter || 4;
        const current = (sessionCount % longBreakAfter) + 1;
        sessionLabel.textContent = `Session ${current} of ${longBreakAfter}`;
    }

    // Ring progress
    const ring = document.getElementById('pomoRingProgress');
    if (ring) {
        const total = AppState.pomoState.totalTime || (25 * 60);
        const circumference = 2 * Math.PI * 130; // radius 130
        const progress = AppState.pomoState.time / total;
        const offset = circumference * (1 - progress);
        ring.style.strokeDasharray = `${circumference}`;
        ring.style.strokeDashoffset = offset;
    }

    updatePomoStatusText();
}

function updatePomoStats() {
    // Today stats
    const todayEl = document.getElementById('todayPomos');
    if (todayEl) todayEl.textContent = AppState.pomodorosToday || 0;

    const todayMinEl = document.getElementById('todayMinutes');
    if (todayMinEl) {
        const mins = (AppState.pomodorosToday || 0) * (AppState.settings.pomodoro.work || 25);
        todayMinEl.textContent = mins;
    }

    // Today progress ring
    const todayRing = document.getElementById('todayProgressRing');
    if (todayRing) {
        const goal = AppState.settings.pomodoro.dailyGoal || 4;
        const done = AppState.pomodorosToday || 0;
        const pct = Math.min(done / goal, 1);
        const circumference = 2 * Math.PI * 16;
        todayRing.style.strokeDasharray = `${circumference}`;
        todayRing.style.strokeDashoffset = circumference * (1 - pct);
    }

    const goalTextEl = document.getElementById('todayGoalText');
    if (goalTextEl) {
        goalTextEl.textContent = `Goal: ${AppState.settings.pomodoro.dailyGoal || 4}`;
    }

    // Lifetime stats
    const totalSessionsEl = document.getElementById('totalPomoSessions');
    if (totalSessionsEl) totalSessionsEl.textContent = AppState.totalPomodoros || 0;

    const totalHoursEl = document.getElementById('totalPomoHours');
    if (totalHoursEl) {
        const hours = ((AppState.totalPomodoros || 0) * (AppState.settings.pomodoro.work || 25) / 60).toFixed(1);
        totalHoursEl.textContent = hours;
    }

    // Update mastery selector in case it changed
    updatePomoMasterySelector();
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
        // Show the flow runner again if it was hidden
        const flowRunner = document.getElementById('flowRunner');
        if (flowRunner && flowRunner.classList.contains('active')) {
            // Flow runner is active - the breathing step is complete
            // User can now click Next to proceed
            showNotification('Breathing complete - click Next to continue', 'gold');
        }
    }
};

window.startBreathingLoop = () => {
    const startBtn = document.getElementById('breathingStartBtn');
    const stopBtn = document.getElementById('breathingStopBtn');
    if (startBtn) startBtn.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'flex';
    AppState.breathingActive = true;
    runBreathingLoop();
};

window.stopBreathingLoop = () => {
    const startBtn = document.getElementById('breathingStartBtn');
    const stopBtn = document.getElementById('breathingStopBtn');
    const text = document.getElementById('breathingText');
    const orb = document.getElementById('breathingCircle');
    const timerDisplay = document.getElementById('breathingTimer');
    const instructionDisplay = document.getElementById('breathingInstruction');
    const particlesContainer = document.getElementById('breathingParticles');

    AppState.breathingActive = false;
    clearTimeout(AppState.breathingInterval);
    if (AppState.breathingTimerInterval) clearInterval(AppState.breathingTimerInterval);
    if (AppState.breathingSessionInterval) clearInterval(AppState.breathingSessionInterval);

    // Reset display
    if (text) text.textContent = 'Ready';
    if (timerDisplay) timerDisplay.textContent = '';
    if (instructionDisplay) {
        const span = instructionDisplay.querySelector('span');
        if (span) span.textContent = 'Select a pattern and press Start';
        else instructionDisplay.textContent = 'Select a pattern and press Start';
    }
    if (orb) {
        orb.classList.remove('inhale', 'hold', 'exhale');
        orb.style.transform = '';
    }
    if (particlesContainer) particlesContainer.innerHTML = '';
    
    // Reset stats
    const cycleEl = document.getElementById('breathCycleCount');
    const sessionEl = document.getElementById('breathSessionTime');
    if (cycleEl) cycleEl.textContent = '0';
    if (sessionEl) sessionEl.textContent = '0:00';

    if (startBtn) startBtn.style.display = 'flex';
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
            particle.style.background = `radial-gradient(circle, rgba(255, 240, 100, 1), rgba(255, 200, 50, 0.8))`;
            particle.style.boxShadow = `0 0 ${size * 4}px rgba(255, 220, 100, 1), 0 0 ${size * 8}px rgba(255, 180, 50, 0.8), 0 0 ${size * 12}px rgba(255, 140, 0, 0.5)`;
        } else if (color === 'cyan') {
            particle.style.background = `radial-gradient(circle, rgba(150, 255, 255, 1), rgba(0, 220, 255, 0.8))`;
            particle.style.boxShadow = `0 0 ${size * 4}px rgba(100, 255, 255, 1), 0 0 ${size * 8}px rgba(0, 200, 255, 0.8), 0 0 ${size * 12}px rgba(0, 150, 255, 0.5)`;
        }

        container.appendChild(particle);

        setTimeout(() => {
            if (particle.parentNode) particle.remove();
        }, duration * 1000 + delay * 1000);
    }
}

// Convert old timing format to new phases format
function convertToPhases(patternData) {
    // If already has phases array, return it
    if (patternData.phases && Array.isArray(patternData.phases)) {
        return patternData.phases;
    }

    // Convert old timing format to phases
    const timing = patternData.timing || { inhale: 4, hold1: 4, exhale: 4, hold2: 4 };
    const instructions = patternData.instructions || {};
    const phases = [];

    if (timing.inhale > 0) {
        phases.push({ type: 'inhale', duration: timing.inhale, instruction: instructions.inhale || '' });
    }
    if (timing.hold1 > 0) {
        phases.push({ type: 'hold', duration: timing.hold1, instruction: instructions.hold1 || '' });
    }
    if (timing.exhale > 0) {
        phases.push({ type: 'exhale', duration: timing.exhale, instruction: instructions.exhale || '' });
    }
    if (timing.hold2 > 0) {
        phases.push({ type: 'hold', duration: timing.hold2, instruction: instructions.hold2 || '' });
    }

    return phases.length > 0 ? phases : [{ type: 'inhale', duration: 4 }, { type: 'exhale', duration: 4 }];
}

// Get visual settings for each phase type
function getPhaseVisuals(phaseType) {
    const visuals = {
        inhale: {
            transform: 'scale(2.8)',
            opacity: '1',
            background: 'radial-gradient(circle at 30% 30%, rgba(255, 240, 150, 1), rgba(255, 200, 50, 0.9) 40%, rgba(255, 150, 0, 0.7) 100%)',
            boxShadow: '0 0 80px rgba(255, 220, 100, 1), 0 0 150px rgba(255, 180, 50, 0.9), 0 0 220px rgba(255, 140, 0, 0.6), inset 0 0 60px rgba(255, 255, 200, 0.5)',
            particles: 'gold',
            defaultLabel: 'Inhale'
        },
        hold: {
            transform: null, // Keep current transform
            opacity: null,
            background: 'radial-gradient(circle at 30% 30%, rgba(100, 255, 255, 1), rgba(0, 220, 255, 0.9) 40%, rgba(0, 150, 255, 0.7) 100%)',
            boxShadow: '0 0 80px rgba(0, 255, 255, 1), 0 0 150px rgba(0, 200, 255, 0.9), 0 0 220px rgba(100, 150, 255, 0.6), inset 0 0 60px rgba(200, 255, 255, 0.5)',
            particles: 'cyan',
            defaultLabel: 'Hold'
        },
        exhale: {
            transform: 'scale(1)',
            opacity: '0.9',
            background: 'radial-gradient(circle at 30% 30%, rgba(255, 200, 100, 0.9), rgba(255, 160, 50, 0.7) 40%, rgba(200, 100, 50, 0.5) 100%)',
            boxShadow: '0 0 60px rgba(255, 180, 80, 0.9), 0 0 120px rgba(255, 140, 50, 0.7), 0 0 180px rgba(200, 100, 50, 0.4), inset 0 0 40px rgba(255, 220, 150, 0.3)',
            particles: 'gold',
            defaultLabel: 'Exhale'
        }
    };
    return visuals[phaseType] || visuals.hold;
}

function runBreathingLoop() {
    const text = document.getElementById('breathingText');
    const orb = document.getElementById('breathingCircle');
    const patternSelect = document.getElementById('breathingPattern');
    const timerDisplay = document.getElementById('breathingTimer');
    const instructionDisplay = document.getElementById('breathingInstruction');
    if (!text || !orb) return;

    // Parse breathing pattern from CONFIG + custom patterns
    let phases = [{ type: 'inhale', duration: 4 }, { type: 'hold', duration: 4 }, { type: 'exhale', duration: 4 }, { type: 'hold', duration: 4 }]; // Default

    if (patternSelect) {
        const selectedValue = patternSelect.value;

        // Check CONFIG patterns first
        if (typeof CONFIG !== 'undefined' && CONFIG.BREATHING_PATTERNS) {
            const configPattern = CONFIG.BREATHING_PATTERNS.find(p => p.value === selectedValue);
            if (configPattern) {
                phases = convertToPhases(configPattern);
            }
        }

        // Check custom patterns (overrides CONFIG if same value)
        const customPattern = AppState.breathingPatterns.find(p => p.value === selectedValue);
        if (customPattern) {
            phases = convertToPhases(customPattern);
        }
    }

    let phaseIndex = 0;
    let timeLeft = phases[0].duration;
    let timerInterval;
    let cycleCount = 0;
    let sessionSeconds = 0;

    // Store timer interval for cleanup
    AppState.breathingTimerInterval = null;
    
    // Session timer
    AppState.breathingSessionInterval = setInterval(() => {
        sessionSeconds++;
        const mins = Math.floor(sessionSeconds / 60);
        const secs = sessionSeconds % 60;
        const sessionEl = document.getElementById('breathSessionTime');
        if (sessionEl) sessionEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }, 1000);

    const updateTimer = () => {
        if (timerDisplay) {
            timerDisplay.textContent = timeLeft > 0 ? timeLeft : '';
        }
    };
    
    const updateCycleCount = () => {
        const cycleEl = document.getElementById('breathCycleCount');
        if (cycleEl) cycleEl.textContent = cycleCount;
    };

    const runPhase = () => {
        if (!document.getElementById('breathingOverlay').classList.contains('active') || !AppState.breathingActive) {
            if (timerInterval) clearInterval(timerInterval);
            if (AppState.breathingSessionInterval) clearInterval(AppState.breathingSessionInterval);
            return;
        }

        if (timerInterval) clearInterval(timerInterval);

        const currentPhase = phases[phaseIndex];
        const visuals = getPhaseVisuals(currentPhase.type);

        // Set label (custom label or default)
        text.textContent = currentPhase.label || visuals.defaultLabel;

        // Set instruction if available
        if (instructionDisplay) {
            const span = instructionDisplay.querySelector('span');
            if (span) span.textContent = currentPhase.instruction || '';
            else instructionDisplay.textContent = currentPhase.instruction || '';
        }

        // Apply CSS class for animation (new system)
        orb.classList.remove('inhale', 'hold', 'exhale');
        orb.classList.add(currentPhase.type);

        timeLeft = currentPhase.duration;
        updateTimer();

        // Countdown timer
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimer();
            if (timeLeft <= 0) clearInterval(timerInterval);
        }, 1000);
        AppState.breathingTimerInterval = timerInterval;

        // Move to next phase
        AppState.breathingInterval = setTimeout(() => {
            phaseIndex = (phaseIndex + 1) % phases.length; // Loop back to start
            // Track cycle completion (when we return to first phase)
            if (phaseIndex === 0) {
                cycleCount++;
                updateCycleCount();
            }
            runPhase();
        }, currentPhase.duration * 1000);
    };

    runPhase();
}

// --- BREATHING PATTERN MANAGER ---
window.openBreathingPatternManager = () => {
    // Reset form for new pattern
    clearBreathingForm();
    renderCustomPatterns();
    renderBreathingPhases();
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

        // Generate phase summary
        let phaseSummary = '';
        if (pattern.phases && Array.isArray(pattern.phases)) {
            phaseSummary = pattern.phases.map(p => `${p.label || p.type}:${p.duration}s`).join(' → ');
        } else if (pattern.timing) {
            const t = pattern.timing;
            phaseSummary = `${t.inhale}-${t.hold1}-${t.exhale}-${t.hold2}`;
        }

        item.innerHTML = `
            <div style="flex:1;">
                <div style="font-weight:600; color:var(--gold-primary); margin-bottom:5px;">${pattern.name}</div>
                <div style="font-size:0.85rem; color:var(--text-muted);">${phaseSummary}</div>
            </div>
            <div style="display:flex; gap:10px;">
                <button class="btn-sm btn-outline" onclick="editBreathingPattern(${index})">Edit</button>
                <button class="btn-sm btn-danger" onclick="deleteBreathingPattern(${index})">Delete</button>
            </div>
        `;

        list.appendChild(item);
    });
}

// Temporary storage for phases being edited
window.breathingPhasesTemp = [];

window.addBreathingPhase = (type = 'inhale', duration = 4, label = '', instruction = '') => {
    window.breathingPhasesTemp.push({ type, duration, label, instruction });
    renderBreathingPhases();
};

window.removeBreathingPhase = (index) => {
    window.breathingPhasesTemp.splice(index, 1);
    renderBreathingPhases();
};

window.updateBreathingPhase = (index, field, value) => {
    if (window.breathingPhasesTemp[index]) {
        if (field === 'duration') {
            window.breathingPhasesTemp[index][field] = parseInt(value) || 0;
        } else {
            window.breathingPhasesTemp[index][field] = value;
        }
    }
};

window.movePhase = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= window.breathingPhasesTemp.length) return;
    const temp = window.breathingPhasesTemp[index];
    window.breathingPhasesTemp[index] = window.breathingPhasesTemp[newIndex];
    window.breathingPhasesTemp[newIndex] = temp;
    renderBreathingPhases();
};

function renderBreathingPhases() {
    const container = document.getElementById('breathingPhasesList');
    if (!container) return;

    if (window.breathingPhasesTemp.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:10px;">Click "Add Phase" to start building your pattern</p>';
        return;
    }

    container.innerHTML = window.breathingPhasesTemp.map((phase, index) => `
        <div class="component-item" style="margin-bottom:10px; padding:12px; background:var(--surface-elevated); border-radius:8px;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                <span style="color:var(--gold-primary); font-weight:600;">#${index + 1}</span>
                <select class="input" style="flex:1; max-width:120px;" onchange="updateBreathingPhase(${index}, 'type', this.value)">
                    <option value="inhale" ${phase.type === 'inhale' ? 'selected' : ''}>Inhale</option>
                    <option value="hold" ${phase.type === 'hold' ? 'selected' : ''}>Hold</option>
                    <option value="exhale" ${phase.type === 'exhale' ? 'selected' : ''}>Exhale</option>
                </select>
                <input type="number" class="input" style="width:70px;" value="${phase.duration}" min="1" placeholder="sec" onchange="updateBreathingPhase(${index}, 'duration', this.value)">
                <span style="color:var(--text-muted);">sec</span>
                <div style="display:flex; gap:4px; margin-left:auto;">
                    <button class="btn-sm btn-outline" onclick="movePhase(${index}, -1)" ${index === 0 ? 'disabled' : ''}>↑</button>
                    <button class="btn-sm btn-outline" onclick="movePhase(${index}, 1)" ${index === window.breathingPhasesTemp.length - 1 ? 'disabled' : ''}>↓</button>
                    <button class="btn-sm btn-danger" onclick="removeBreathingPhase(${index})">×</button>
                </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                <input type="text" class="input" placeholder="Custom label (e.g., Inhale Left)" value="${phase.label || ''}" onchange="updateBreathingPhase(${index}, 'label', this.value)">
                <input type="text" class="input" placeholder="Instruction (optional)" value="${phase.instruction || ''}" onchange="updateBreathingPhase(${index}, 'instruction', this.value)">
            </div>
        </div>
    `).join('');
}

window.saveBreathingPattern = () => {
    const name = document.getElementById('breathPatternName').value.trim();
    if (!name) return showNotification('Please enter a pattern name', 'error');

    if (window.breathingPhasesTemp.length === 0) {
        return showNotification('Please add at least one phase', 'error');
    }

    const description = document.getElementById('breathPatternDesc')?.value.trim() ||
        `Custom: ${window.breathingPhasesTemp.map(p => p.duration).join('-')}`;

    const pattern = {
        name,
        value: window.editingBreathPatternIndex !== null && window.editingBreathPatternIndex !== undefined
            ? AppState.breathingPatterns[window.editingBreathPatternIndex].value
            : `custom-${Date.now()}`,
        phases: [...window.breathingPhasesTemp],
        description
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
    if (document.getElementById('breathPatternDesc')) {
        document.getElementById('breathPatternDesc').value = pattern.description || '';
    }

    // Convert to phases format if needed
    window.breathingPhasesTemp = convertToPhases(pattern);
    renderBreathingPhases();

    window.editingBreathPatternIndex = index;
};

window.deleteBreathingPattern = (index) => {
    showConfirmModal('Delete Pattern', 'Delete this breathing pattern?', () => {
        AppState.breathingPatterns.splice(index, 1);
        saveState();
        renderCustomPatterns();
        initBreathing();
        showNotification('Pattern deleted', 'normal');
    });
};

function clearBreathingForm() {
    document.getElementById('breathPatternName').value = '';
    if (document.getElementById('breathPatternDesc')) {
        document.getElementById('breathPatternDesc').value = '';
    }
    window.breathingPhasesTemp = [];
    renderBreathingPhases();
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

// --- WEEKLY RITUALS (Checkbox-Based) ---
function initWeeklySchedule() {
    // Ensure weeklySchedule exists (now stores routines with completion tracking)
    if (!AppState.weeklySchedule) {
        AppState.weeklySchedule = [];
    }
    // Ensure completion tracking exists for current week
    if (!AppState.routineCompletions) {
        AppState.routineCompletions = {};
    }
    // Check if we need to auto-reset for a new week
    checkWeeklyReset();
    updateWeekDates();
    renderWeeklyRoutines();
    renderTodayRoutines();
}

// Get current week identifier (e.g., "2026-W02")
function getCurrentWeekId() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
    const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}

// Check if we need to reset completions for new week
function checkWeeklyReset() {
    const currentWeek = getCurrentWeekId();
    if (AppState.lastRoutineWeek !== currentWeek) {
        // New week - clear completions
        AppState.routineCompletions = {};
        AppState.lastRoutineWeek = currentWeek;
        saveState();
    }
}

// Update week dates in the UI
function updateWeekDates() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    days.forEach((day, index) => {
        const dateEl = document.getElementById(`${day}Date`);
        if (dateEl) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + index);
            dateEl.textContent = d.getDate();
        }
    });
    
    // Update week identifier
    const weekId = document.getElementById('weekIdentifier');
    if (weekId) {
        const weekNum = getCurrentWeekId().split('-W')[1];
        weekId.textContent = `Week ${parseInt(weekNum)}, ${now.getFullYear()}`;
    }
    
    // Update today's date display
    const dayNum = document.getElementById('ritualDayNum');
    const dayName = document.getElementById('ritualDayName');
    const fullDate = document.getElementById('ritualFullDate');
    
    if (dayNum) dayNum.textContent = now.getDate();
    if (dayName) dayName.textContent = now.toLocaleDateString('en-US', { weekday: 'short' });
    if (fullDate) fullDate.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// Open routine modal
window.openRoutineModal = (presetDay = null) => {
    // Clear form
    document.getElementById('routineItemId').value = '';
    document.getElementById('routineItemName').value = '';
    document.getElementById('routineItemNotes').value = '';
    document.getElementById('routineModalTitle').textContent = 'Create New Routine';
    document.getElementById('saveRoutineBtnText').textContent = 'Create Routine';
    document.getElementById('deleteRoutineBtn').style.display = 'none';
    
    // Clear all day checkboxes
    document.querySelectorAll('input[name="routineDays"]').forEach(cb => cb.checked = false);
    
    // If preset day, check that day
    if (presetDay) {
        const cb = document.querySelector(`input[name="routineDays"][value="${presetDay}"]`);
        if (cb) cb.checked = true;
    }
    
    // Reset category to default
    const defaultCategory = document.querySelector('input[name="routineCategory"][value="personal"]');
    if (defaultCategory) defaultCategory.checked = true;
    
    // Reset color to default
    const defaultColor = document.querySelector('input[name="routineColor"][value="#d4af37"]');
    if (defaultColor) defaultColor.checked = true;
    
    openModal('routineModal');
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

// Quick day selection helpers
window.selectAllDays = () => {
    document.querySelectorAll('input[name="routineDays"]').forEach(cb => cb.checked = true);
};

window.selectWeekdays = () => {
    document.querySelectorAll('input[name="routineDays"]').forEach(cb => {
        cb.checked = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(cb.value);
    });
};

window.selectWeekends = () => {
    document.querySelectorAll('input[name="routineDays"]').forEach(cb => {
        cb.checked = ['saturday', 'sunday'].includes(cb.value);
    });
};

// Edit existing routine
window.editRoutine = (routineId) => {
    const routine = AppState.weeklySchedule.find(r => r.id === routineId);
    if (!routine) return;
    
    document.getElementById('routineItemId').value = routine.id;
    document.getElementById('routineItemName').value = routine.name;
    document.getElementById('routineItemNotes').value = routine.notes || '';
    document.getElementById('routineModalTitle').textContent = 'Edit Routine';
    document.getElementById('saveRoutineBtnText').textContent = 'Save Changes';
    document.getElementById('deleteRoutineBtn').style.display = 'flex';
    
    // Clear and set day checkboxes
    document.querySelectorAll('input[name="routineDays"]').forEach(cb => {
        cb.checked = routine.days && routine.days.includes(cb.value);
    });
    
    // Set category
    const categoryRadio = document.querySelector(`input[name="routineCategory"][value="${routine.category || 'personal'}"]`);
    if (categoryRadio) categoryRadio.checked = true;
    
    // Set color
    const colorRadio = document.querySelector(`input[name="routineColor"][value="${routine.color || '#d4af37'}"]`);
    if (colorRadio) colorRadio.checked = true;
    
    openModal('routineModal');
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

// Save routine
window.saveRoutine = () => {
    const id = document.getElementById('routineItemId').value;
    const name = document.getElementById('routineItemName').value.trim();
    const category = document.querySelector('input[name="routineCategory"]:checked')?.value || 'personal';
    const notes = document.getElementById('routineItemNotes').value.trim();
    const color = document.querySelector('input[name="routineColor"]:checked')?.value || '#d4af37';
    
    // Get selected days
    const days = [];
    document.querySelectorAll('input[name="routineDays"]:checked').forEach(cb => {
        days.push(cb.value);
    });
    
    if (!name) {
        showNotification('Please enter a ritual name', 'error');
        return;
    }
    
    if (days.length === 0) {
        showNotification('Please select at least one day', 'error');
        return;
    }
    
    if (!AppState.weeklySchedule) {
        AppState.weeklySchedule = [];
    }
    
    if (id) {
        // Update existing
        const index = AppState.weeklySchedule.findIndex(r => r.id === id);
        if (index !== -1) {
            AppState.weeklySchedule[index] = {
                ...AppState.weeklySchedule[index],
                name, category, notes, color, days
            };
        }
        showNotification('Ritual updated!', 'success');
    } else {
        // Add new
        AppState.weeklySchedule.push({
            id: 'routine_' + Date.now(),
            name, category, notes, color, days,
            createdAt: new Date().toISOString()
        });
        showNotification('Ritual created!', 'success');
    }
    
    saveState();
    closeModal('routineModal');
    renderWeeklyRoutines();
    renderTodayRoutines();
};

// Delete routine
window.deleteRoutine = () => {
    const id = document.getElementById('routineItemId').value;
    if (!id) return;
    
    if (confirm('Delete this ritual from your weekly schedule?')) {
        AppState.weeklySchedule = AppState.weeklySchedule.filter(r => r.id !== id);
        // Also remove any completions for this routine
        Object.keys(AppState.routineCompletions).forEach(key => {
            if (key.startsWith(id + '_')) {
                delete AppState.routineCompletions[key];
            }
        });
        saveState();
        closeModal('routineModal');
        renderWeeklyRoutines();
        renderTodayRoutines();
        showNotification('Ritual deleted', 'success');
    }
};

// Toggle routine completion checkbox
window.toggleRoutineCheck = (routineId, day, event) => {
    if (event) event.stopPropagation();
    
    const key = `${routineId}_${day}`;
    if (!AppState.routineCompletions) {
        AppState.routineCompletions = {};
    }
    
    AppState.routineCompletions[key] = !AppState.routineCompletions[key];
    saveState();
    
    // Re-render for visual updates
    renderWeeklyRoutines();
    renderTodayRoutines();
    
    // Celebration for completing
    if (AppState.routineCompletions[key]) {
        const routine = AppState.weeklySchedule.find(r => r.id === routineId);
        if (routine) {
            showNotification(`✨ ${routine.name} complete!`, 'success');
        }
    }
};

// Reset all checkboxes for the week
window.resetWeeklyChecks = () => {
    if (confirm('Reset all checkboxes for this week? This will clear all completion marks.')) {
        AppState.routineCompletions = {};
        AppState.lastRoutineWeek = getCurrentWeekId();
        saveState();
        renderWeeklyRoutines();
        renderTodayRoutines();
        showNotification('Weekly schedule reset!', 'success');
    }
};

// Render the weekly routines grid
function renderWeeklyRoutines() {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const categoryIcons = {
        work: '💼', health: '💪', personal: '✨', social: '👥',
        learning: '📚', creative: '🎨', spiritual: '⭐', meditation: '🧘',
        chakra: '🌈', magick: '🔮', other: '📌'
    };
    
    const todayIndex = new Date().getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[todayIndex];
    
    days.forEach(day => {
        const container = document.getElementById(`${day}-routines`);
        if (!container) return;
        
        // Filter routines for this day
        const dayRoutines = (AppState.weeklySchedule || [])
            .filter(routine => routine.days && routine.days.includes(day));
        
        // Highlight today's column
        const column = container.closest('.week-day-column');
        if (column) {
            column.classList.toggle('today', day === todayName);
        }
        
        if (dayRoutines.length === 0) {
            container.innerHTML = `
                <div class="day-empty-state">
                    <i data-lucide="calendar-off"></i>
                    <span>No routines</span>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }
        
        container.innerHTML = dayRoutines.map(routine => {
            const key = `${routine.id}_${day}`;
            const isChecked = AppState.routineCompletions && AppState.routineCompletions[key];
            const icon = categoryIcons[routine.category] || '✨';
            
            return `
                <div class="day-routine-chip ${isChecked ? 'completed' : ''}" 
                     style="--routine-color: ${routine.color || '#d4af37'}"
                     onclick="editRoutine('${routine.id}')">
                    <div class="chip-check" onclick="toggleRoutineCheck('${routine.id}', '${day}', event)">
                        <i data-lucide="check"></i>
                    </div>
                    <span class="chip-name">${icon} ${routine.name}</span>
                </div>
            `;
        }).join('');
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });
    
    // Update stats
    updateRitualStats();
}

// Render today's routines with progress tracking
function renderTodayRoutines() {
    const container = document.getElementById('todayRitualsList');
    if (!container) return;
    
    const now = new Date();
    const todayIndex = now.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[todayIndex];
    
    // Filter routines for today
    const todayRoutines = (AppState.weeklySchedule || [])
        .filter(routine => routine.days && routine.days.includes(todayName));
    
    const categoryIcons = {
        work: '💼', health: '💪', personal: '✨', social: '👥',
        learning: '📚', creative: '🎨', spiritual: '⭐', meditation: '🧘',
        chakra: '🌈', magick: '🔮', other: '📌'
    };
    
    if (todayRoutines.length === 0) {
        container.innerHTML = `
            <div class="today-routines-empty">
                <i data-lucide="calendar-off"></i>
                <p>No routines scheduled for today</p>
                <button class="btn btn-sm btn-outline" onclick="openRoutineModal('${todayName}')">
                    <i data-lucide="plus"></i> Add
                </button>
            </div>
        `;
        updateProgressRing(0, 0);
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }
    
    const completed = todayRoutines.filter(routine => {
        const key = `${routine.id}_${todayName}`;
        return AppState.routineCompletions && AppState.routineCompletions[key];
    }).length;
    
    container.innerHTML = todayRoutines.map(routine => {
        const key = `${routine.id}_${todayName}`;
        const isChecked = AppState.routineCompletions && AppState.routineCompletions[key];
        const icon = categoryIcons[routine.category] || '✨';
        
        return `
            <div class="today-routine-card ${isChecked ? 'completed' : ''}" 
                 style="--routine-color: ${routine.color || '#d4af37'}">
                <button class="routine-check-btn ${isChecked ? 'checked' : ''}"
                        onclick="toggleRoutineCheck('${routine.id}', '${todayName}', event)">
                    <i data-lucide="${isChecked ? 'check' : 'circle'}"></i>
                </button>
                <div class="today-routine-info" onclick="editRoutine('${routine.id}')">
                    <span class="today-routine-name">${routine.name}</span>
                    <span class="today-routine-category">${icon} ${routine.category || 'Personal'}</span>
                </div>
            </div>
        `;
    }).join('');
    
    updateProgressRing(completed, todayRoutines.length);
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Update the circular progress ring
function updateProgressRing(completed, total) {
    const ring = document.getElementById('sacredProgressRing');
    const percentEl = document.getElementById('sacredProgressPercent');
    const completedEl = document.getElementById('ritualsCompletedToday');
    const remainingEl = document.getElementById('ritualsRemainingToday');
    
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    // New smaller ring: 2 * PI * 18 = 113.1
    const circumference = 113.1;
    const offset = circumference - (percent / 100) * circumference;
    
    if (ring) {
        ring.style.strokeDasharray = circumference;
        ring.style.strokeDashoffset = offset;
        ring.style.stroke = percent === 100 ? '#4caf50' : 'var(--gold-primary)';
    }
    if (percentEl) percentEl.textContent = `${percent}%`;
    if (completedEl) completedEl.textContent = completed;
    if (remainingEl) remainingEl.textContent = total - completed;
}

// Update ritual stats
function updateRitualStats() {
    const totalEl = document.getElementById('totalWeeklyRituals');
    if (totalEl) {
        const total = (AppState.weeklySchedule || []).reduce((sum, r) => sum + (r.days?.length || 0), 0);
        totalEl.textContent = total;
    }
}

// Legacy function wrappers for backwards compatibility
function renderWeeklySchedule() {
    renderWeeklyRoutines();
}

function renderTodayActivities() {
    renderTodayRoutines();
}

function formatTime12h(time24) {
    if (!time24) return '';
    const [hours, mins] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    return `${h}:${mins.toString().padStart(2, '0')} ${period}`;
}

// --- JOURNAL ---
function initJournal() {
    renderJournal();
}

window.openJournalEntry = (editId = null) => {
    // Clear form
    document.getElementById('journalTitle').value = '';
    document.getElementById('journalContent').value = '';
    document.getElementById('journalTags').value = '';
    document.getElementById('journalEditId').value = '';
    document.getElementById('journalModalTitle').textContent = 'New Journal Entry';
    document.getElementById('journalSaveBtn').textContent = 'Save Entry';

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

    // Reset mood selector
    const moodOptions = document.querySelectorAll('input[name="journalMood"]');
    moodOptions.forEach(opt => opt.checked = opt.value === 'neutral');

    // If editing, populate form
    if (editId) {
        const entry = AppState.journal.find(e => e.id === editId);
        if (entry) {
            document.getElementById('journalEditId').value = editId;
            document.getElementById('journalTitle').value = entry.title || '';
            document.getElementById('journalContent').value = entry.content || '';
            document.getElementById('journalTags').value = entry.tags || '';
            document.getElementById('journalModalTitle').textContent = 'Edit Journal Entry';
            document.getElementById('journalSaveBtn').textContent = 'Update Entry';

            if (relatedSelect && entry.relatedTo) {
                relatedSelect.value = entry.relatedTo;
            }

            moodOptions.forEach(opt => opt.checked = opt.value === entry.mood);
        }
    }

    window.openModal('journalModal');
};

window.saveJournalEntry = () => {
    const title = document.getElementById('journalTitle').value;
    const content = document.getElementById('journalContent').value;
    const relatedTo = document.getElementById('journalRelated')?.value || '';
    const editId = document.getElementById('journalEditId').value;

    if (!content) return;

    if (editId) {
        // Update existing entry
        const idx = AppState.journal.findIndex(e => e.id == editId);
        if (idx !== -1) {
            AppState.journal[idx].title = title || "Untitled Entry";
            AppState.journal[idx].content = content;
            AppState.journal[idx].mood = document.querySelector('input[name="journalMood"]:checked')?.value || 'neutral';
            AppState.journal[idx].tags = document.getElementById('journalTags').value;
            AppState.journal[idx].relatedTo = relatedTo;
            AppState.journal[idx].edited = new Date().toISOString();
            showNotification('Journal entry updated', 'gold');
        }
    } else {
        // Create new entry
        const entry = {
            id: Date.now(),
            date: new Date().toISOString(),
            title: title || "Untitled Entry",
            content,
            mood: document.querySelector('input[name="journalMood"]:checked')?.value || 'neutral',
            tags: document.getElementById('journalTags').value,
            relatedTo: relatedTo
        };

        AppState.journal.unshift(entry);
        addXP(15);
        logActivity('working', 'Journal Entry', 15);
        showNotification('Journal entry saved', 'gold');
    }

    saveState();
    renderJournal();
    window.closeModal('journalModal');
};

window.deleteJournalEntry = (id) => {
    showConfirmModal('Delete Entry', 'Are you sure you want to delete this journal entry?', () => {
        AppState.journal = AppState.journal.filter(e => e.id !== id);
        saveState();
        renderJournal();
        showNotification('Journal entry deleted', 'gold');
    });
};

window.filterJournal = () => {
    renderJournal();
};

function renderJournal() {
    const list = document.getElementById('journalList');
    if (!list) return;

    // Get filter values
    const searchQuery = document.getElementById('journalSearch')?.value.toLowerCase() || '';
    const moodFilter = document.getElementById('journalMoodFilter')?.value || '';
    const dateFilter = document.getElementById('journalDateFilter')?.value || '';

    // Filter entries
    let filteredEntries = AppState.journal.filter(entry => {
        // Search filter
        if (searchQuery) {
            const matchesSearch =
                (entry.title || '').toLowerCase().includes(searchQuery) ||
                (entry.content || '').toLowerCase().includes(searchQuery) ||
                (entry.tags || '').toLowerCase().includes(searchQuery);
            if (!matchesSearch) return false;
        }

        // Mood filter
        if (moodFilter && entry.mood !== moodFilter) return false;

        // Date filter
        if (dateFilter) {
            const entryDate = new Date(entry.date).toISOString().split('T')[0];
            if (entryDate !== dateFilter) return false;
        }

        return true;
    });

    list.innerHTML = '';
    if (filteredEntries.length === 0 && AppState.journal.length === 0) {
        if (document.getElementById('noJournal')) document.getElementById('noJournal').style.display = 'flex';
        return;
    }
    if (document.getElementById('noJournal')) document.getElementById('noJournal').style.display = 'none';

    if (filteredEntries.length === 0) {
        list.innerHTML = '<div class="empty-state" style="padding: 40px;"><p>No entries match your filters</p></div>';
        return;
    }

    const moodEmojis = { great: '😊', good: '🙂', neutral: '😐', low: '😔', bad: '😢' };

    filteredEntries.forEach(entry => {
        const el = document.createElement('div');
        el.className = 'card journal-card';
        el.style.marginBottom = '15px';

        // Parse relatedTo to display name
        let relatedLabel = '';
        if (entry.relatedTo) {
            const [type, id] = entry.relatedTo.split('-');
            if (type === 'flow') {
                const flow = AppState.flows.find(f => f.id == id);
                if (flow) relatedLabel = `<span class="journal-tag">🌊 ${flow.title}</span>`;
            } else if (type === 'working') {
                const working = AppState.workings.find(w => w.id == id);
                if (working) relatedLabel = `<span class="journal-tag">✧ ${working.name}</span>`;
            }
        }

        // Parse tags
        const tagsHtml = entry.tags ? entry.tags.split(',').map(t => t.trim()).filter(t => t).map(t =>
            `<span class="journal-tag" onclick="document.getElementById('journalSearch').value='${t}'; filterJournal();">#${t}</span>`
        ).join('') : '';

        el.innerHTML = `
            <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h3 style="margin-bottom: 5px;">${entry.title}</h3>
                    <span style="font-size:0.8rem; color:#888">${new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}${entry.edited ? ' (edited)' : ''}</span>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-sm btn-gold" onclick="openJournalEntry(${entry.id})" title="Edit">✎</button>
                    <button class="btn-sm btn-danger" onclick="deleteJournalEntry(${entry.id})" title="Delete">×</button>
                </div>
            </div>
            <div class="card-content">
                <p style="white-space: pre-wrap; line-height: 1.6;">${entry.content}</p>
                <div style="margin-top:15px; display:flex; gap:10px; flex-wrap:wrap; align-items: center;">
                    <span class="journal-mood">${moodEmojis[entry.mood] || '😐'} ${entry.mood}</span>
                    ${relatedLabel}
                    ${tagsHtml}
                </div>
            </div>
        `;
        list.appendChild(el);
    });
}

// --- MASTERY - COMPLETE REDESIGN ---
let masteryWizardStep = 1;
let masteryCurrentTab = 'active';

function initMastery() {
    // Icon selection logic
    const iconGrid = document.getElementById('masteryIconGrid');
    if (iconGrid) {
        iconGrid.querySelectorAll('.mastery-icon-btn').forEach(opt => {
            opt.onclick = () => {
                iconGrid.querySelectorAll('.mastery-icon-btn').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                document.getElementById('masteryIcon').value = opt.dataset.icon;
                updateMasteryPreview();
            };
        });
    }

    // Type selector logic
    document.querySelectorAll('.type-card').forEach(card => {
        card.onclick = () => {
            document.querySelectorAll('.type-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            card.querySelector('input[type="radio"]').checked = true;
            updateMasteryPreview();
        };
    });

    // Color selector logic
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            btn.querySelector('input[type="radio"]').checked = true;
            updateMasteryPreview();
        };
    });

    renderMastery();
    updateMasteryOverview();
}

// Wizard navigation
window.masteryWizardNext = () => {
    if (masteryWizardStep === 1) {
        const name = document.getElementById('masteryName').value.trim();
        if (!name) {
            showNotification('Please enter a goal name', 'error');
            return;
        }
    }

    if (masteryWizardStep < 3) {
        masteryWizardStep++;
        updateWizardUI();
    }
};

window.masteryWizardPrev = () => {
    if (masteryWizardStep > 1) {
        masteryWizardStep--;
        updateWizardUI();
    }
};

function updateWizardUI() {
    // Update step indicators
    document.querySelectorAll('.wizard-step').forEach((step, idx) => {
        const stepNum = idx + 1;
        step.classList.remove('active', 'completed');
        if (stepNum < masteryWizardStep) step.classList.add('completed');
        if (stepNum === masteryWizardStep) step.classList.add('active');
    });

    // Update panels
    document.querySelectorAll('.wizard-panel').forEach(panel => {
        panel.classList.remove('active');
        if (parseInt(panel.dataset.panel) === masteryWizardStep) {
            panel.classList.add('active');
        }
    });

    // Update buttons
    document.getElementById('masteryPrevBtn').style.display = masteryWizardStep > 1 ? 'block' : 'none';
    document.getElementById('masteryNextBtn').style.display = masteryWizardStep < 3 ? 'block' : 'none';
    document.getElementById('masterySaveBtn').style.display = masteryWizardStep === 3 ? 'block' : 'none';

    // Update preview on step 3
    if (masteryWizardStep === 3) {
        updateMasteryPreview();
    }
}

window.selectGoalPreset = (value) => {
    document.querySelectorAll('.goal-preset').forEach(p => p.classList.remove('active'));
    const btn = document.querySelector(`.goal-preset[data-value="${value}"]`);
    if (btn) btn.classList.add('active');

    const customGroup = document.getElementById('customHoursGroup');
    if (value === 'custom') {
        customGroup.style.display = 'block';
        document.getElementById('masteryGoal').value = 'custom';
    } else {
        customGroup.style.display = 'none';
        document.getElementById('masteryGoal').value = value;
    }
    updateMasteryPreview();
};

function updateMasteryPreview() {
    const name = document.getElementById('masteryName').value || 'Your Goal';
    const icon = document.getElementById('masteryIcon').value || '🧘';
    const type = document.querySelector('input[name="masteryType"]:checked')?.value || 'hours';
    const colorInput = document.querySelector('input[name="masteryColor"]:checked');
    const color = colorInput ? colorInput.value : '#d4af37';

    let goal = document.getElementById('masteryGoal').value;
    if (goal === 'custom') {
        goal = parseInt(document.getElementById('customHours').value) || 10000;
    } else {
        goal = parseInt(goal) || 10000;
    }

    const unitLabel = type === 'hours' ? 'hours' : 'reps';

    // Update preview card
    document.getElementById('previewIcon').textContent = icon;
    document.getElementById('previewName').textContent = name;
    document.getElementById('previewTarget').textContent = `0 / ${goal.toLocaleString()} ${unitLabel}`;

    // Update preview card color
    const previewCard = document.getElementById('masteryPreviewCard');
    if (previewCard) {
        previewCard.style.background = `linear-gradient(135deg, ${color}20, transparent)`;
        previewCard.style.borderColor = color;
    }
}

window.openMasteryModal = () => {
    masteryWizardStep = 1;

    // Reset form
    document.getElementById('masteryModalTitle').textContent = 'Create Mastery Goal';
    document.getElementById('masterySaveBtn').textContent = 'Create Goal';
    document.getElementById('masteryName').value = '';
    document.getElementById('masteryGoal').value = '10000';
    document.getElementById('customHours').value = '';
    document.getElementById('customHoursGroup').style.display = 'none';
    document.getElementById('masteryIcon').value = '🧘';

    // Reset icon grid
    const iconGrid = document.getElementById('masteryIconGrid');
    if (iconGrid) {
        iconGrid.querySelectorAll('.mastery-icon-btn').forEach(o => o.classList.remove('active'));
        const defaultIcon = iconGrid.querySelector('[data-icon="🧘"]');
        if (defaultIcon) defaultIcon.classList.add('active');
    }

    // Reset type selector
    document.querySelectorAll('.type-card').forEach(c => c.classList.remove('active'));
    const hoursCard = document.querySelector('.type-card[data-type="hours"]');
    if (hoursCard) hoursCard.classList.add('active');
    const hoursRadio = document.querySelector('input[name="masteryType"][value="hours"]');
    if (hoursRadio) hoursRadio.checked = true;

    // Reset goal presets
    document.querySelectorAll('.goal-preset').forEach(p => p.classList.remove('active'));
    const defaultPreset = document.querySelector('.goal-preset[data-value="10000"]');
    if (defaultPreset) defaultPreset.classList.add('active');

    // Reset color picker
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    const defaultColor = document.querySelector('.color-btn[data-color="#d4af37"]');
    if (defaultColor) defaultColor.classList.add('active');
    const goldRadio = document.querySelector('input[name="masteryColor"][value="#d4af37"]');
    if (goldRadio) goldRadio.checked = true;

    delete window.editingMasteryId;
    updateWizardUI();
    updateMasteryPreview();
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
    if (label) label.textContent = type === 'hours' ? 'Set your target (Hours)' : 'Set your target (Reps)';
};

window.switchMasteryTab = (tab) => {
    masteryCurrentTab = tab;
    document.querySelectorAll('.mastery-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
    });

    document.getElementById('masteryGrid').style.display = tab === 'active' ? 'grid' : 'none';
    document.getElementById('masteryCompletedGrid').style.display = tab === 'completed' ? 'grid' : 'none';
    document.getElementById('masteryArchivedGrid').style.display = tab === 'archived' ? 'grid' : 'none';
    document.getElementById('noMastery').style.display = 'none';

    renderMastery();
};

window.toggleMasteryView = () => {
    const grid = document.getElementById('masteryGrid');
    const icon = document.getElementById('masteryViewIcon');
    if (grid.style.gridTemplateColumns === '1fr') {
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(340px, 1fr))';
        icon.textContent = '◫';
    } else {
        grid.style.gridTemplateColumns = '1fr';
        icon.textContent = '☰';
    }
};

window.saveMastery = () => {
    const name = document.getElementById('masteryName').value.trim();
    if (!name) return showNotification('Please enter a goal name', 'error');

    const type = document.querySelector('input[name="masteryType"]:checked')?.value || 'hours';
    const icon = document.getElementById('masteryIcon').value || '🧘';
    const colorInput = document.querySelector('input[name="masteryColor"]:checked');
    const color = colorInput ? colorInput.value : '#d4af37';
    
    let goal = document.getElementById('masteryGoal').value;
    if (goal === 'custom') {
        goal = parseInt(document.getElementById('customHours').value);
        if (!goal || goal <= 0) return showNotification('Please enter a valid custom goal number', 'error');
    } else {
        goal = parseInt(goal) || 10000;
    }

    if (window.editingMasteryId) {
        const item = AppState.mastery.find(m => m.id === window.editingMasteryId);
        if (item) {
            item.name = name;
            item.type = type;
            item.icon = icon;
            item.goalHours = goal;
            item.color = color;
            showNotification('Mastery goal updated!', 'gold');
        }
    } else {
        const item = {
            id: Date.now(),
            name,
            type,
            icon,
            goalHours: goal,
            currentHours: 0,
            color: color,
            created: new Date().toISOString(),
            lastLog: null,
            logs: [],
            archived: false,
            streak: 0,
            lastStreakDate: null
        };
        AppState.mastery.push(item);
        showNotification('Mastery goal created! 🎯', 'gold');
    }

    saveState();
    renderMastery();
    updateMasteryOverview();
    window.closeModal('masteryModal');
};

function updateMasteryOverview() {
    const activeMastery = AppState.mastery.filter(m => !m.archived && m.currentHours < m.goalHours);
    const completedMastery = AppState.mastery.filter(m => m.currentHours >= m.goalHours);

    // Total active goals
    document.getElementById('totalMasteryGoals').textContent = activeMastery.length;

    // Total hours across all goals
    const totalHours = AppState.mastery.reduce((sum, m) => {
        return sum + (m.type === 'hours' ? m.currentHours : 0);
    }, 0);
    document.getElementById('totalMasteryHours').textContent = totalHours >= 1000 
        ? `${(totalHours / 1000).toFixed(1)}k` 
        : `${Math.round(totalHours)}h`;

    // Mastery streak (days with any log)
    const today = new Date().toISOString().split('T')[0];
    let streakCount = 0;
    const hasLogToday = AppState.mastery.some(m => m.lastLog && m.lastLog.startsWith(today));
    if (hasLogToday) streakCount = 1;

    // Count consecutive days backward
    let checkDate = new Date();
    checkDate.setDate(checkDate.getDate() - 1);
    for (let i = 0; i < 365; i++) {
        const dateStr = checkDate.toISOString().split('T')[0];
        const hasLog = AppState.mastery.some(m => 
            m.logs && m.logs.some(l => l.date && l.date.startsWith(dateStr))
        );
        if (hasLog) {
            streakCount++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }
    document.getElementById('masteryStreak').textContent = streakCount;

    // Completed masteries
    document.getElementById('completedMasteries').textContent = completedMastery.length;
}

function getMasteryTier(pct) {
    if (pct >= 100) return { name: 'Master', icon: '👑', color: '#ffd700' };
    if (pct >= 75) return { name: 'Expert', icon: '⭐', color: 'var(--mastery-platinum)' };
    if (pct >= 50) return { name: 'Skilled', icon: '💎', color: 'var(--mastery-gold)' };
    if (pct >= 25) return { name: 'Adept', icon: '🔷', color: 'var(--mastery-silver)' };
    if (pct >= 10) return { name: 'Novice', icon: '🔹', color: 'var(--mastery-bronze)' };
    return { name: 'Beginner', icon: '○', color: 'var(--text-muted)' };
}

function renderMastery() {
    const grid = document.getElementById('masteryGrid');
    const completedGrid = document.getElementById('masteryCompletedGrid');
    const archivedGrid = document.getElementById('masteryArchivedGrid');
    if (!grid) return;

    grid.innerHTML = '';
    if (completedGrid) completedGrid.innerHTML = '';
    if (archivedGrid) archivedGrid.innerHTML = '';

    const activeMastery = AppState.mastery.filter(m => !m.archived && m.currentHours < m.goalHours);
    const completedMastery = AppState.mastery.filter(m => !m.archived && m.currentHours >= m.goalHours);
    const archivedMastery = AppState.mastery.filter(m => m.archived);

    // Show empty state only for active tab
    if (masteryCurrentTab === 'active') {
        document.getElementById('noMastery').style.display = activeMastery.length === 0 ? 'flex' : 'none';
    } else {
        document.getElementById('noMastery').style.display = 'none';
    }

    // Render active mastery cards
    activeMastery.forEach(m => {
        grid.appendChild(createMasteryCard(m, false));
    });

    // Render completed mastery cards
    completedMastery.forEach(m => {
        if (completedGrid) completedGrid.appendChild(createMasteryCard(m, true));
    });

    // Render archived mastery cards
    archivedMastery.forEach(m => {
        if (archivedGrid) archivedGrid.appendChild(createMasteryCard(m, false, true));
    });

    updateMasteryOverview();
    
    // Re-initialize Lucide icons for dynamic content
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Track active mastery timers
let activeMasteryTimers = {};

function createMasteryCard(m, isCompleted = false, isArchived = false) {
    const el = document.createElement('div');
    const isTimerActive = activeMasteryTimers[m.id];
    el.className = `mastery-card-new${isCompleted ? ' completed' : ''}${isArchived ? ' archived' : ''}${isTimerActive ? ' timer-active' : ''}`;
    el.style.setProperty('--card-color', m.color || '#d4af37');
    el.style.setProperty('--card-glow', `${m.color || '#d4af37'}40`);
    el.dataset.id = m.id;

    const pct = Math.min((m.currentHours / m.goalHours) * 100, 100);
    const tier = getMasteryTier(pct);
    const unitLabel = m.type === 'reps' ? 'reps' : 'hrs';
    const unitLabelFull = m.type === 'reps' ? 'Reps' : 'Hours';
    const lastLogText = m.lastLog ? formatRelativeTime(m.lastLog) : 'Never logged';

    // Calculate progress ring stroke
    const circumference = 314; // 2 * PI * 50 (radius)
    const strokeOffset = circumference - (pct / 100) * circumference;

    // Format numbers nicely
    const currentFormatted = m.type === 'reps' 
        ? Math.round(m.currentHours).toLocaleString()
        : m.currentHours.toFixed(1);
    const goalFormatted = m.goalHours.toLocaleString();

    // Milestone achievements
    const milestones = [
        { pct: 25, achieved: pct >= 25 },
        { pct: 50, achieved: pct >= 50 },
        { pct: 75, achieved: pct >= 75 },
        { pct: 100, achieved: pct >= 100 }
    ];

    // Timer/Counter display
    const timerState = activeMasteryTimers[m.id];
    const timerDisplay = timerState ? formatMasteryTimerDisplay(timerState.elapsed) : '00:00:00';
    const repsCount = timerState ? timerState.reps : 0;

    el.innerHTML = `
        <div class="mastery-card-header">
            <div class="mastery-tier-new" style="--tier-color: ${tier.color}">
                <span class="tier-icon">${tier.icon}</span>
                ${tier.name}
            </div>
            <div class="mastery-card-icon">${m.icon || '🧘'}</div>
            <div class="mastery-card-title">${m.name}</div>
            <div class="mastery-card-meta">
                <span><i data-lucide="calendar"></i> ${lastLogText}</span>
                ${m.streak > 0 ? `<span class="streak-badge"><i data-lucide="flame"></i> ${m.streak}</span>` : ''}
            </div>
        </div>
        
        <div class="mastery-card-body">
            <div class="mastery-progress-ring">
                <div class="progress-ring-container">
                    <svg class="progress-ring-svg" viewBox="0 0 120 120">
                        <circle class="progress-ring-bg" cx="60" cy="60" r="50"/>
                        <circle class="progress-ring-fill" cx="60" cy="60" r="50" 
                            style="stroke-dashoffset: ${strokeOffset}; stroke: ${m.color || 'var(--gold-primary)'}"/>
                    </svg>
                    <div class="progress-ring-center">
                        <span class="progress-pct">${Math.round(pct)}%</span>
                        <span class="progress-label">Complete</span>
                    </div>
                </div>
            </div>
            
            <div class="mastery-stats-row">
                <div class="mastery-stat">
                    <div class="mastery-stat-value">${currentFormatted}</div>
                    <div class="mastery-stat-label">${unitLabelFull} Logged</div>
                </div>
                <div class="mastery-stat">
                    <div class="mastery-stat-value">${goalFormatted}</div>
                    <div class="mastery-stat-label">${unitLabelFull} Goal</div>
                </div>
            </div>

            <div class="mastery-milestones">
                ${milestones.map(ms => `
                    <div class="milestone ${ms.achieved ? 'achieved' : ''}" style="--card-color: ${m.color}">
                        <div class="milestone-marker">${ms.achieved ? '<i data-lucide="check"></i>' : ms.pct}</div>
                        <span class="milestone-label">${ms.pct}%</span>
                    </div>
                `).join('')}
            </div>

            <div class="mastery-actions-new" id="masteryActions-${m.id}">
                ${isArchived ? `
                    <button class="mastery-btn mastery-btn-secondary" onclick="unarchiveMastery(${m.id})">
                        <i data-lucide="upload"></i> Restore
                    </button>
                    <button class="mastery-btn mastery-btn-icon danger" onclick="deleteMastery(${m.id})" title="Delete permanently">
                        <i data-lucide="trash-2"></i>
                    </button>
                ` : isCompleted ? `
                    <button class="mastery-btn mastery-btn-primary" onclick="openMasteryLogModal(${m.id})">
                        <i data-lucide="plus"></i> Continue
                    </button>
                    <button class="mastery-btn mastery-btn-icon" onclick="archiveMastery(${m.id})" title="Archive">
                        <i data-lucide="archive"></i>
                    </button>
                ` : m.type === 'hours' ? `
                    ${isTimerActive ? `
                        <button class="mastery-btn timer-active-btn" id="timerBtn-${m.id}">
                            <span class="timer-time" id="timerDisplay-${m.id}">${timerDisplay}</span>
                        </button>
                        <button class="mastery-btn mastery-btn-icon" onclick="pauseMasteryTimer(${m.id})" title="Pause">
                            <i data-lucide="pause"></i>
                        </button>
                        <button class="mastery-btn mastery-btn-icon save" onclick="stopMasteryTimer(${m.id})" title="Save">
                            <i data-lucide="check"></i>
                        </button>
                    ` : `
                        <button class="mastery-btn mastery-btn-primary" onclick="startMasteryTimer(${m.id})">
                            <i data-lucide="play"></i> Start
                        </button>
                        <button class="mastery-btn mastery-btn-secondary" onclick="openMasteryLogModal(${m.id})">
                            <i data-lucide="pencil"></i> Log
                        </button>
                    `}
                    <button class="mastery-btn mastery-btn-icon" onclick="showMasteryMenu(${m.id}, event)" title="More">
                        <i data-lucide="more-vertical"></i>
                    </button>
                ` : `
                    <div class="counter-inline" id="counterArea-${m.id}">
                        <button class="counter-btn-mini" onclick="adjustMasteryCounter(${m.id}, -1)"><i data-lucide="minus"></i></button>
                        <span class="counter-num" id="counterDisplay-${m.id}">${repsCount}</span>
                        <button class="counter-btn-mini plus" onclick="adjustMasteryCounter(${m.id}, 1)"><i data-lucide="plus"></i></button>
                    </div>
                    ${repsCount > 0 ? `
                        <button class="mastery-btn mastery-btn-primary" onclick="saveMasteryCounter(${m.id})">
                            <i data-lucide="check"></i> Save
                        </button>
                    ` : `
                        <button class="mastery-btn mastery-btn-secondary" onclick="openMasteryLogModal(${m.id})">
                            <i data-lucide="pencil"></i> Log
                        </button>
                    `}
                    <button class="mastery-btn mastery-btn-icon" onclick="showMasteryMenu(${m.id}, event)" title="More">
                        <i data-lucide="more-vertical"></i>
                    </button>
                `}
            </div>
        </div>
    `;

    return el;
}

window.showMasteryMenu = (id, event) => {
    event.stopPropagation();
    
    // Remove any existing menu
    document.querySelectorAll('.mastery-context-menu').forEach(m => m.remove());
    
    const menu = document.createElement('div');
    menu.className = 'mastery-context-menu';
    menu.innerHTML = `
        <button onclick="archiveMastery(${id})"><i data-lucide="archive"></i> Archive</button>
        <button onclick="resetMasteryProgress(${id})"><i data-lucide="refresh-cw"></i> Reset Progress</button>
        <div class="menu-divider"></div>
        <button onclick="deleteMastery(${id})" class="danger"><i data-lucide="trash-2"></i> Delete</button>
    `;
    
    document.body.appendChild(menu);
    
    // Smart positioning - check bounds after adding to DOM
    const menuRect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let top = event.clientY;
    let left = event.clientX;
    
    // Adjust if menu would go off right edge
    if (left + menuRect.width > viewportWidth - 10) {
        left = viewportWidth - menuRect.width - 10;
    }
    
    // Adjust if menu would go off bottom edge - show above click point
    if (top + menuRect.height > viewportHeight - 10) {
        top = top - menuRect.height - 10;
        if (top < 10) top = 10;
    }
    
    // Ensure left doesn't go negative
    if (left < 10) left = 10;
    
    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
    
    // Close on click outside
    setTimeout(() => {
        document.addEventListener('click', function closeMenu() {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        });
    }, 10);
};

window.archiveMastery = (id) => {
    const m = AppState.mastery.find(x => x.id === id);
    if (m) {
        m.archived = true;
        saveState();
        renderMastery();
        showNotification('Goal archived', 'normal');
    }
};

window.unarchiveMastery = (id) => {
    const m = AppState.mastery.find(x => x.id === id);
    if (m) {
        m.archived = false;
        saveState();
        renderMastery();
        showNotification('Goal restored', 'gold');
    }
};

window.resetMasteryProgress = (id) => {
    showConfirmModal('Reset Progress', 'Reset all progress for this goal? This cannot be undone.', () => {
        const m = AppState.mastery.find(x => x.id === id);
        if (m) {
            m.currentHours = 0;
            m.logs = [];
            m.lastLog = null;
            saveState();
            renderMastery();
            showNotification('Progress reset', 'normal');
        }
    });
};

// ============================================
// MASTERY LIVE TIMER & COUNTER FUNCTIONS
// ============================================

function formatMasteryTimerDisplay(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

window.startMasteryTimer = (id) => {
    const m = AppState.mastery.find(x => x.id === id);
    if (!m) return;

    // Initialize timer state
    activeMasteryTimers[id] = {
        elapsed: 0,
        startTime: Date.now(),
        interval: null,
        paused: false
    };

    // Start the interval
    activeMasteryTimers[id].interval = setInterval(() => {
        if (!activeMasteryTimers[id].paused) {
            activeMasteryTimers[id].elapsed++;
            const display = document.getElementById(`timerDisplay-${id}`);
            if (display) {
                display.textContent = formatMasteryTimerDisplay(activeMasteryTimers[id].elapsed);
            }
        }
    }, 1000);

    // Re-render just this card to show controls
    renderMastery();
    showNotification(`Timer started for ${m.name}`, 'gold');
};

window.pauseMasteryTimer = (id) => {
    const timer = activeMasteryTimers[id];
    if (!timer) return;

    timer.paused = !timer.paused;
    
    const card = document.querySelector(`.mastery-card-new[data-id="${id}"]`);
    if (card) {
        const pauseBtn = card.querySelector('.timer-btn.pause');
        if (pauseBtn) {
            pauseBtn.innerHTML = timer.paused ? '<i data-lucide="play"></i>' : '<i data-lucide="pause"></i>';
            pauseBtn.title = timer.paused ? 'Resume' : 'Pause';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
        const timerEl = card.querySelector('.live-timer');
        if (timerEl) {
            timerEl.classList.toggle('paused', timer.paused);
        }
    }
};

window.stopMasteryTimer = (id) => {
    const timer = activeMasteryTimers[id];
    const m = AppState.mastery.find(x => x.id === id);
    if (!timer || !m) return;

    // Clear interval
    if (timer.interval) clearInterval(timer.interval);

    const elapsedSeconds = timer.elapsed;
    const elapsedHours = elapsedSeconds / 3600;

    // Only save if there's meaningful time
    if (elapsedSeconds >= 60) { // At least 1 minute
        m.currentHours = (m.currentHours || 0) + elapsedHours;
        m.lastLog = new Date().toISOString();
        
        if (!m.logs) m.logs = [];
        m.logs.push({
            date: new Date().toISOString(),
            amount: elapsedHours,
            note: `Timer session: ${formatMasteryTimerDisplay(elapsedSeconds)}`
        });

        // XP reward
        const xpEarned = Math.round(elapsedHours * 50); // 50 XP per hour
        addXP(xpEarned);
        logActivity('mastery', `Logged ${formatMasteryTimerDisplay(elapsedSeconds)} for ${m.name}`);

        saveState();
        showNotification(`Saved ${formatMasteryTimerDisplay(elapsedSeconds)} to ${m.name}! +${xpEarned} XP`, 'gold');
    } else {
        showNotification('Timer stopped (less than 1 minute, not saved)', 'normal');
    }

    // Clean up
    delete activeMasteryTimers[id];
    renderMastery();
};

window.adjustMasteryCounter = (id, delta) => {
    if (!activeMasteryTimers[id]) {
        activeMasteryTimers[id] = { reps: 0 };
    }

    activeMasteryTimers[id].reps = Math.max(0, (activeMasteryTimers[id].reps || 0) + delta);
    
    const display = document.getElementById(`counterDisplay-${id}`);
    if (display) {
        display.textContent = activeMasteryTimers[id].reps;
        display.classList.add('bump');
        setTimeout(() => display.classList.remove('bump'), 150);
    }

    // Re-render actions area to update buttons
    renderMastery();
};

window.saveMasteryCounter = (id) => {
    const counter = activeMasteryTimers[id];
    const m = AppState.mastery.find(x => x.id === id);
    if (!counter || !m || counter.reps <= 0) return;

    const reps = counter.reps;
    m.currentHours = (m.currentHours || 0) + reps;
    m.lastLog = new Date().toISOString();
    
    if (!m.logs) m.logs = [];
    m.logs.push({
        date: new Date().toISOString(),
        amount: reps,
        note: `Counter: ${reps} reps`
    });

    // XP reward
    const xpEarned = Math.round(reps * 2); // 2 XP per rep
    addXP(xpEarned);
    logActivity('mastery', `Logged ${reps} reps for ${m.name}`);

    saveState();
    showNotification(`Saved ${reps} reps to ${m.name}! +${xpEarned} XP`, 'gold');

    // Clean up
    delete activeMasteryTimers[id];
    renderMastery();
};

window.resetMasteryCounter = (id) => {
    if (activeMasteryTimers[id]) {
        activeMasteryTimers[id].reps = 0;
    }
    
    const display = document.getElementById(`counterDisplay-${id}`);
    if (display) display.textContent = '0';
    
    const tracker = document.getElementById(`masteryTracker-${id}`);
    if (tracker) {
        const controlsDiv = tracker.querySelector('.counter-controls');
        if (controlsDiv) {
            controlsDiv.innerHTML = `<span class="counter-hint">Tap +/- to count</span>`;
        }
    }
};

window.editMastery = (id) => {
    const m = AppState.mastery.find(x => x.id === id);
    if (!m) return;

    masteryWizardStep = 1;
    window.editingMasteryId = id;

    document.getElementById('masteryModalTitle').textContent = 'Edit Mastery Goal';
    document.getElementById('masterySaveBtn').textContent = 'Update Goal';
    document.getElementById('masteryName').value = m.name;

    // Icon selection
    const iconGrid = document.getElementById('masteryIconGrid');
    if (iconGrid) {
        iconGrid.querySelectorAll('.mastery-icon-btn').forEach(o => o.classList.remove('active'));
        const opt = iconGrid.querySelector(`[data-icon="${m.icon || '🧘'}"]`);
        if (opt) opt.classList.add('active');
        document.getElementById('masteryIcon').value = m.icon || '🧘';
    }

    // Goal type
    document.querySelectorAll('.type-card').forEach(c => c.classList.remove('active'));
    const typeCard = document.querySelector(`.type-card[data-type="${m.type}"]`);
    if (typeCard) typeCard.classList.add('active');
    const typeRadio = document.querySelector(`input[name="masteryType"][value="${m.type}"]`);
    if (typeRadio) typeRadio.checked = true;

    // Goal value
    document.querySelectorAll('.goal-preset').forEach(p => p.classList.remove('active'));
    const customGroup = document.getElementById('customHoursGroup');

    if (['10', '100', '1000', '10000'].includes(String(m.goalHours))) {
        const preset = document.querySelector(`.goal-preset[data-value="${m.goalHours}"]`);
        if (preset) preset.classList.add('active');
        document.getElementById('masteryGoal').value = String(m.goalHours);
        customGroup.style.display = 'none';
    } else {
        const customPreset = document.querySelector('.goal-preset[data-value="custom"]');
        if (customPreset) customPreset.classList.add('active');
        document.getElementById('masteryGoal').value = 'custom';
        document.getElementById('customHours').value = m.goalHours;
        customGroup.style.display = 'block';
    }

    // Color
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    const colorBtn = document.querySelector(`.color-btn[data-color="${m.color}"]`);
    if (colorBtn) colorBtn.classList.add('active');
    const colorRadio = document.querySelector(`input[name="masteryColor"][value="${m.color}"]`);
    if (colorRadio) colorRadio.checked = true;

    updateWizardUI();
    updateMasteryPreview();
    window.openModal('masteryModal');
};

window.deleteMastery = (id) => {
    showConfirmModal('Delete Mastery Goal', 'Delete this mastery goal permanently? All progress will be lost.', () => {
        AppState.mastery = AppState.mastery.filter(m => m.id !== id);
        saveState();
        renderMastery();
        showNotification('Mastery goal deleted', 'normal');
    });
};

window.openMasteryLogModal = (id) => {
    const m = AppState.mastery.find(x => x.id === id);
    if (!m) return;

    const modalId = 'masteryLogModal';
    let modal = document.getElementById(modalId);

    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';
        modal.style.zIndex = '2000';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="window.closeModal('${modalId}')"></div>
            <div class="modal-content mastery-log-modal">
                <div class="modal-header">
                    <h2>Log Progress</h2>
                    <button class="modal-close" onclick="window.closeModal('${modalId}')"><i data-lucide="x"></i></button>
                </div>
                <div class="modal-body">
                    <div class="log-header">
                        <span class="log-icon" id="logMasteryIcon">🧘</span>
                        <div class="log-info">
                            <h3 id="masteryLogName">Goal Name</h3>
                            <p id="masteryLogProgress">0 / 10,000 hours</p>
                        </div>
                    </div>
                    
                    <div class="log-input-section" id="masteryTimeInputGroup">
                        <label style="margin-bottom:10px; display:block; color:var(--text-muted); font-size:0.85rem;">How long did you practice?</label>
                        <div class="time-input-grid">
                            <div class="time-input-group">
                                <label>Hours</label>
                                <input type="number" id="masteryLogHours" class="input" value="0" min="0" step="1">
                            </div>
                            <div class="time-input-group">
                                <label>Minutes</label>
                                <input type="number" id="masteryLogMinutes" class="input" value="30" min="0" max="59" step="1">
                            </div>
                        </div>
                        <div class="quick-time-btns">
                            <button type="button" class="quick-time-btn" onclick="quickAddTime(5)">+5m</button>
                            <button type="button" class="quick-time-btn" onclick="quickAddTime(15)">+15m</button>
                            <button type="button" class="quick-time-btn" onclick="quickAddTime(30)">+30m</button>
                            <button type="button" class="quick-time-btn" onclick="quickAddTime(60)">+1h</button>
                            <button type="button" class="quick-time-btn" onclick="quickAddTime(120)">+2h</button>
                        </div>
                    </div>
                    
                    <div class="log-input-section reps-input-section" id="masteryRepsInputGroup" style="display:none;">
                        <label style="margin-bottom:15px; display:block; color:var(--text-muted); font-size:0.85rem;">How many reps/count?</label>
                        <div class="reps-counter">
                            <button type="button" class="reps-btn" onclick="adjustLogReps(-10)">-10</button>
                            <button type="button" class="reps-btn" onclick="adjustLogReps(-1)">-</button>
                            <span class="reps-value" id="masteryLogRepsDisplay">1</span>
                            <button type="button" class="reps-btn" onclick="adjustLogReps(1)">+</button>
                            <button type="button" class="reps-btn" onclick="adjustLogReps(10)">+10</button>
                        </div>
                        <input type="hidden" id="masteryLogReps" value="1">
                    </div>
                    
                    <div class="form-group" style="margin-top:20px;">
                        <label style="color:var(--text-muted); font-size:0.85rem;">Notes (optional)</label>
                        <textarea id="masteryLogNotes" class="input" rows="2" placeholder="What did you work on?"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="window.closeModal('${modalId}')">Cancel</button>
                    <button class="btn btn-gold" id="confirmMasteryLog">
                        <span>✓</span> Log Progress
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Update modal content
    const nameEl = modal.querySelector('#masteryLogName');
    const iconEl = modal.querySelector('#logMasteryIcon');
    const progressEl = modal.querySelector('#masteryLogProgress');
    
    if (nameEl) nameEl.textContent = m.name;
    if (iconEl) iconEl.textContent = m.icon || '🧘';
    
    const unitLabel = m.type === 'reps' ? 'reps' : 'hours';
    const current = m.type === 'reps' ? Math.round(m.currentHours) : m.currentHours.toFixed(1);
    if (progressEl) progressEl.textContent = `${current} / ${m.goalHours.toLocaleString()} ${unitLabel}`;

    // Show correct input group
    const timeGroup = modal.querySelector('#masteryTimeInputGroup');
    const repsGroup = modal.querySelector('#masteryRepsInputGroup');
    
    if (m.type === 'hours') {
        if (timeGroup) timeGroup.style.display = 'block';
        if (repsGroup) repsGroup.style.display = 'none';
        const hoursInput = modal.querySelector('#masteryLogHours');
        const minutesInput = modal.querySelector('#masteryLogMinutes');
        if (hoursInput) hoursInput.value = 0;
        if (minutesInput) minutesInput.value = 30;
    } else {
        if (timeGroup) timeGroup.style.display = 'none';
        if (repsGroup) repsGroup.style.display = 'block';
        const repsInput = modal.querySelector('#masteryLogReps');
        const repsDisplay = modal.querySelector('#masteryLogRepsDisplay');
        if (repsInput) repsInput.value = 1;
        if (repsDisplay) repsDisplay.textContent = '1';
    }

    const notesEl = modal.querySelector('#masteryLogNotes');
    if (notesEl) notesEl.value = '';

    // Bind confirm button
    const confirmBtn = modal.querySelector('#confirmMasteryLog');
    if (confirmBtn) {
        confirmBtn.onclick = () => {
            let amount = 0;
            if (m.type === 'hours') {
                const hoursInput = document.getElementById('masteryLogHours');
                const minutesInput = document.getElementById('masteryLogMinutes');
                const hours = hoursInput ? parseFloat(hoursInput.value) || 0 : 0;
                const minutes = minutesInput ? parseFloat(minutesInput.value) || 0 : 0;
                amount = hours + (minutes / 60);
            } else {
                const repsInput = document.getElementById('masteryLogReps');
                amount = repsInput ? parseFloat(repsInput.value) || 0 : 0;
            }

            if (amount !== 0) {
                const notes = document.getElementById('masteryLogNotes')?.value || '';
                logMasterySession(id, amount, notes);
                window.closeModal(modalId);
            } else {
                showNotification('Please enter a value to log', 'error');
            }
        };
    }

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
};

window.adjustLogReps = (delta) => {
    const input = document.getElementById('masteryLogReps');
    const display = document.getElementById('masteryLogRepsDisplay');
    if (!input || !display) return;
    
    let value = parseInt(input.value) || 0;
    value = Math.max(0, value + delta);
    input.value = value;
    display.textContent = value;
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

window.logMasterySession = (id, amount, notes = '') => {
    const m = AppState.mastery.find(x => x.id === id);
    if (m) {
        const now = new Date().toISOString();
        
        // Update progress
        m.currentHours += amount;
        m.lastLog = now;
        
        // Initialize logs array if needed
        if (!m.logs) m.logs = [];
        
        // Add log entry
        m.logs.push({
            date: now,
            amount: amount,
            notes: notes
        });
        
        // Check for milestone achievements
        const pct = (m.currentHours / m.goalHours) * 100;
        const milestones = [25, 50, 75, 100];
        const previousPct = ((m.currentHours - amount) / m.goalHours) * 100;
        
        for (const ms of milestones) {
            if (previousPct < ms && pct >= ms) {
                if (ms === 100) {
                    showNotification(`🏆 MASTERY ACHIEVED! You've completed ${m.name}!`, 'gold');
                } else {
                    showNotification(`🎉 ${ms}% milestone reached for ${m.name}!`, 'gold');
                }
            }
        }
        
        saveState();
        renderMastery();
        updateMasteryOverview();

        // Calculate XP
        let xp = 0;
        if (m.type === 'reps') {
            xp = Math.round(Math.abs(amount) * 0.5);
        } else {
            xp = Math.round(amount * 60); // 1 XP per minute
        }

        if (xp > 0) {
            addXP(xp);
            const amountStr = m.type === 'reps' 
                ? `+${Math.round(amount)} reps` 
                : `+${amount.toFixed(1)} hrs`;
            logActivity('mastery', `${m.name} ${amountStr}`, xp);
            showNotification(`Progress logged! +${xp} XP ⚡`, 'gold');
        } else {
            showNotification(`Progress updated`, 'normal');
        }
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
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);

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
                    <button class="modal-close" onclick="window.closeModal('${modalId}')"><i data-lucide="x"></i></button>
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
    timeInput.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

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
    showConfirmModal('Remove Scheduled Item', 'Remove this scheduled item?', () => {
        AppState.schedule = AppState.schedule.filter(e => e.id !== id);
        saveState();
        renderCalendar();
        if (window.selectedCalendarDate) selectCalendarDate(window.selectedCalendarDate);
        showNotification('Scheduled item removed', 'normal');
    });
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

    // We keep location by default now as per user request for "perfect export"
    // but we can add an optional flag later if needed.

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

// Flow Import Handler - must be on window for onclick to work
window.triggerFlowImport = function () {
    console.log('Import button clicked');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        console.log('File selected:', e.target.files);
        const file = e.target.files[0];
        if (!file) {
            console.log('No file');
            return;
        }

        console.log('Reading file:', file.name);
        const reader = new FileReader();

        reader.onerror = (err) => {
            console.error('FileReader error:', err);
            showNotification("Error reading file", "error");
        };

        reader.onload = (evt) => {
            console.log('File content loaded');
            try {
                const data = JSON.parse(evt.target.result);
                console.log('Parsed data:', data);

                let flowsToImport = [];

                // Check if it's a wrapped export format (from multi-flow export)
                if (data.type === 'arcana_flows_export' && Array.isArray(data.flows)) {
                    flowsToImport = data.flows;
                    console.log('Detected wrapped export format with', flowsToImport.length, 'flows');
                }
                // Check if it's a plain array of flows
                else if (Array.isArray(data)) {
                    flowsToImport = data;
                    console.log('Detected plain array format with', flowsToImport.length, 'flows');
                }
                // Single flow object
                else if (data.title && data.steps && Array.isArray(data.steps)) {
                    flowsToImport = [data];
                    console.log('Detected single flow format');
                }
                else {
                    console.log('Invalid format - not a flow, array, or wrapped export');
                    showNotification("Invalid flow file format. Expected a flow object, array of flows, or exported flows file.", "error");
                    return;
                }

                // Import the flows
                let imported = 0;
                let skipped = 0;
                flowsToImport.forEach((flow, idx) => {
                    if (flow.title && flow.steps && Array.isArray(flow.steps)) {
                        flow.id = Date.now() + imported;
                        flow.created = new Date().toISOString();
                        flow.completedDates = flow.completedDates || [];
                        AppState.flows.push(flow);
                        imported++;
                    } else {
                        console.log(`Skipping invalid flow at index ${idx}`);
                        skipped++;
                    }
                });

                if (imported > 0) {
                    saveState();
                    renderFlows();
                    console.log(`${imported} flow(s) imported!`);
                    const msg = skipped > 0
                        ? `${imported} flow(s) imported (${skipped} skipped - invalid format)`
                        : `${imported} flow(s) imported successfully`;
                    showNotification(msg, "gold");
                } else {
                    showNotification("No valid flows found in file", "error");
                }
            } catch (err) {
                console.error('Parse error:', err);
                showNotification("Error parsing file: " + err.message, "error");
            }
        };

        reader.readAsText(file);
    };
    input.click();
};

window.importFlow = (event) => {
    const file = event.target.files[0];
    if (!file) {
        console.log('No file selected');
        return;
    }

    console.log('Importing file:', file.name);

    const reader = new FileReader();

    reader.onerror = (err) => {
        console.error('FileReader error:', err);
        showNotification("Error reading file", "error");
    };

    reader.onload = (e) => {
        console.log('File loaded, parsing JSON...');
        try {
            const flow = JSON.parse(e.target.result);
            console.log('Parsed flow:', flow);

            // Basic validation
            if (flow.title && flow.steps && Array.isArray(flow.steps)) {
                // Generate new ID to avoid conflicts
                flow.id = Date.now();
                flow.created = new Date().toISOString();
                flow.completedDates = flow.completedDates || [];

                AppState.flows.push(flow);
                saveState();
                renderFlows();
                console.log('Flow imported successfully');
                showNotification(`Flow "${flow.title}" imported successfully`, "gold");
            } else {
                console.log('Invalid format - title:', flow.title, 'steps:', flow.steps);
                showNotification("Invalid flow file format", "error");
            }
        } catch (err) {
            showNotification("Error parsing file: " + err.message, "error");
            console.error('Parse error:', err);
        }
    };

    reader.readAsText(file);
    event.target.value = ''; // Reset input
};

window.openExportFlowModal = () => {
    // Create a dynamic modal for multi-flow selection
    const modalId = 'exportFlowModal';
    let modal = document.getElementById(modalId);

    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="window.closeModal('${modalId}')"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Export Flows</h2>
                    <button class="modal-close" onclick="window.closeModal('${modalId}')"><i data-lucide="x"></i></button>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom:15px;">Select flows to export:</p>
                    <div style="margin-bottom:15px;">
                        <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                            <input type="checkbox" id="exportSelectAll" onchange="toggleAllFlowsExport(this.checked)">
                            <span style="color:var(--gold-primary);">Select All</span>
                        </label>
                    </div>
                    <div id="exportFlowList" class="list-group" style="max-height:300px; overflow-y:auto;"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="window.closeModal('${modalId}')">Cancel</button>
                    <button class="btn btn-gold" onclick="exportSelectedFlows()">Export Selected</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const list = modal.querySelector('#exportFlowList');
    if (list) {
        list.innerHTML = '';

        if (AppState.flows.length === 0) {
            list.innerHTML = '<div class="text-muted" style="padding:20px; text-align:center;">No flows available.</div>';
        } else {
            AppState.flows.forEach((flow, index) => {
                const item = document.createElement('div');
                item.className = 'list-item';
                item.style.cssText = 'display:flex; align-items:center; gap:12px; padding:12px; border-bottom:1px solid rgba(255,255,255,0.1); cursor:pointer;';

                item.innerHTML = `
                    <input type="checkbox" class="flow-export-checkbox" data-flow-id="${flow.id}" id="export-flow-${flow.id}">
                    <label for="export-flow-${flow.id}" style="flex:1; cursor:pointer; display:flex; justify-content:space-between;">
                        <span>${flow.title}</span>
                        <span style="color:var(--text-muted); font-size:0.85rem;">${flow.steps.length} steps</span>
                    </label>
                `;

                // Click anywhere to toggle
                item.onclick = (e) => {
                    if (e.target.tagName !== 'INPUT') {
                        const checkbox = item.querySelector('input');
                        checkbox.checked = !checkbox.checked;
                    }
                };

                list.appendChild(item);
            });
        }
    }

    // Reset select all
    document.getElementById('exportSelectAll').checked = false;

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
};

window.toggleAllFlowsExport = (checked) => {
    document.querySelectorAll('.flow-export-checkbox').forEach(cb => cb.checked = checked);
};

window.exportSelectedFlows = () => {
    const selectedIds = Array.from(document.querySelectorAll('.flow-export-checkbox:checked'))
        .map(cb => parseInt(cb.dataset.flowId));

    if (selectedIds.length === 0) {
        showNotification('Please select at least one flow', 'error');
        return;
    }

    const selectedFlows = AppState.flows.filter(f => selectedIds.includes(f.id));

    // Check for images
    const hasImages = selectedFlows.some(f => f.image || f.steps.some(s => s.image));

    const doExport = () => {
        let exportData;
        let filename;

        if (selectedFlows.length === 1) {
            // Single flow export
            exportData = selectedFlows[0];
            filename = `${selectedFlows[0].title.replace(/\s+/g, '_')}_flow.json`;
        } else {
            // Multiple flows export
            exportData = {
                type: 'arcana_flows_export',
                version: '1.0',
                exportDate: new Date().toISOString(),
                flows: selectedFlows
            };
            filename = `arcana_flows_${selectedFlows.length}_exported.json`;
        }

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", filename);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();

        window.closeModal('exportFlowModal');
        showNotification(`${selectedFlows.length} flow(s) exported!`, 'gold');
    };

    if (hasImages) {
        showConfirmModal('Export Notice', 'Flow images are not included in exports to keep file sizes small. Continue?', doExport);
    } else {
        doExport();
    }
};

// Verified Backup System: Import Preview
window.triggerSelectiveImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = JSON.parse(evt.target.result);
                showImportPreview(data);
            } catch (err) {
                showNotification('Error reading file: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
};

function showImportPreview(data) {
    const modalId = 'importPreviewModal';
    let modal = document.getElementById(modalId);

    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="window.closeModal('${modalId}')"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Import Backup</h2>
                    <button class="modal-close" onclick="window.closeModal('${modalId}')"><i data-lucide="x"></i></button>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom:15px;">This file contains the following data:</p>
                    <div id="importPreviewSummary" style="display:flex; flex-wrap:wrap; gap:15px; margin-bottom:20px;"></div>
                    <p style="font-size:0.9em; color:var(--text-muted);">Existing items with the same ID or name will be skipped to prevent duplicates.</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="window.closeModal('${modalId}')">Cancel</button>
                    <button class="btn btn-gold" id="confirmImportBtn">Import Selected</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const summaryEl = document.getElementById('importPreviewSummary');
    if (!summaryEl) return;

    // Detect if multi-flow export format
    const isMultiFlow = data.type === 'arcana_flows_export' && data.flows;
    const flows = isMultiFlow ? data.flows : (data.steps ? [data] : (data.flows || []));

    // Analyze data
    const stats = [
        { label: 'Flows', count: flows.length, id: 'flows' },
        { label: 'Workings', count: data.workings?.length || 0, id: 'workings' },
        { label: 'Tasks', count: data.tasks?.length || 0, id: 'tasks' },
        { label: 'Journal', count: data.journal?.length || 0, id: 'journal' },
        { label: 'Mastery', count: data.mastery?.length || 0, id: 'mastery' }
    ].filter(s => s.count > 0);

    if (stats.length === 0) {
        showNotification('This file does not appear to contain valid Arcana data.', 'error');
        return;
    }

    summaryEl.innerHTML = stats.map(s => `
        <div class="import-summary-item">
            <span class="count">${s.count}</span>
            <span class="label">${s.label}</span>
        </div>
    `).join('');

    const confirmBtn = document.getElementById('confirmImportBtn');
    if (confirmBtn) {
        confirmBtn.onclick = () => {
            executeImport(data);
            window.closeModal('importPreviewModal');
        };
    }

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

function executeImport(data) {
    let importedCount = 0;
    const isMultiFlow = data.type === 'arcana_flows_export' && data.flows;
    const flowsToImport = isMultiFlow ? data.flows : (data.steps ? [data] : (data.flows || []));

    // Merge logic
    if (flowsToImport.length > 0) {
        flowsToImport.forEach(f => {
            if (!AppState.flows.find(existing => existing.id === f.id || existing.title === f.title)) {
                const newFlow = { ...f, id: Date.now() + importedCount };
                AppState.flows.push(newFlow);
                importedCount++;
            }
        });
    }

    if (data.workings) {
        data.workings.forEach(w => {
            if (!AppState.workings.find(existing => existing.id === w.id)) {
                AppState.workings.push(w);
                importedCount++;
            }
        });
    }

    if (data.tasks) {
        data.tasks.forEach(t => {
            if (!AppState.tasks.find(existing => existing.id === t.id)) {
                AppState.tasks.push(t);
                importedCount++;
            }
        });
    }

    if (data.journal) {
        data.journal.forEach(j => {
            if (!AppState.journal.find(existing => existing.date === j.date && existing.content === j.content)) {
                AppState.journal.push(j);
                importedCount++;
            }
        });
    }

    if (data.mastery) {
        data.mastery.forEach(m => {
            if (!AppState.mastery.find(existing => existing.id === m.id || existing.name === m.name)) {
                AppState.mastery.push(m);
                importedCount++;
            }
        });
    }

    // Settings merge (shallow)
    if (data.settings) {
        AppState.settings = { ...AppState.settings, ...data.settings };
    }

    if (data.user) {
        AppState.user.xp = Math.max(AppState.user.xp, data.user.xp || 0);
        AppState.user.level = Math.max(AppState.user.level, data.user.level || 1);
    }

    saveState();

    // Refresh all views
    renderFlows();
    if (typeof initWorkings === 'function') initWorkings();
    renderTasks();
    if (typeof renderJournal === 'function') renderJournal();
    renderMastery();
    if (typeof renderActivityLog === 'function') renderActivityLog();
    if (typeof updateXPDisplay === 'function') updateXPDisplay();

    showNotification(`Successfully merged ${importedCount} items from backup!`, 'gold');
}


window.confirmClearData = () => {
    showConfirmModal('⚠️ Clear All Data', 'Are you sure you want to wipe all data? This cannot be undone!', () => {
        localStorage.removeItem('zevist_app_state');
        location.reload();
    });
};

// --- ASTRO & UTILS ---
// Note: Astro functions (initAstro, updatePlanetaryHour, fetchMoonData, etc.) 
// are now defined earlier in the file (around lines 500-800) to use offline calculations only.





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

// ============================================
// PDF EXPORT FUNCTIONALITY
// ============================================

window.openExportPDFModal = (type) => {
    const modalId = 'exportPDFModal';
    let modal = document.getElementById(modalId);

    const title = type === 'journal' ? 'Export Journal' : 'Export Calendar';
    const iconName = type === 'journal' ? 'book-open' : 'calendar';

    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-overlay" onclick="window.closeModal('${modalId}')"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h2><i data-lucide="${iconName}"></i> ${title}</h2>
                <button class="modal-close" onclick="window.closeModal('${modalId}')"><i data-lucide="x"></i></button>
            </div>
            <div class="modal-body">
                <p style="margin-bottom:20px;">Select date range for export:</p>
                
                <div style="display:flex; flex-direction:column; gap:15px;">
                    <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                        <input type="radio" name="exportRange" value="all" checked onchange="toggleDateRange(false)">
                        <span>Export All Entries</span>
                    </label>
                    
                    <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                        <input type="radio" name="exportRange" value="range" onchange="toggleDateRange(true)">
                        <span>Select Date Range</span>
                    </label>
                    
                    <div id="dateRangeInputs" style="display:none; padding-left:25px; margin-top:10px;">
                        <div style="display:flex; gap:15px; flex-wrap:wrap;">
                            <div>
                                <label style="display:block; margin-bottom:5px; color:var(--text-muted); font-size:0.9rem;">From</label>
                                <input type="date" id="exportFromDate" class="input" style="width:160px;">
                            </div>
                            <div>
                                <label style="display:block; margin-bottom:5px; color:var(--text-muted); font-size:0.9rem;">To</label>
                                <input type="date" id="exportToDate" class="input" style="width:160px;">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="window.closeModal('${modalId}')">Cancel</button>
                <button class="btn btn-gold" onclick="generatePDF('${type}')">📄 Generate PDF</button>
            </div>
        </div>
    `;

    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setTimeout(() => {
        document.getElementById('exportFromDate').value = monthAgo;
        document.getElementById('exportToDate').value = today;
    }, 10);

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
};

window.toggleDateRange = (show) => {
    document.getElementById('dateRangeInputs').style.display = show ? 'block' : 'none';
};

window.generatePDF = (type) => {
    const isRange = document.querySelector('input[name="exportRange"]:checked').value === 'range';
    let fromDate = null, toDate = null;

    if (isRange) {
        fromDate = document.getElementById('exportFromDate').value;
        toDate = document.getElementById('exportToDate').value;

        if (!fromDate || !toDate) {
            showNotification('Please select both dates', 'error');
            return;
        }

        if (new Date(fromDate) > new Date(toDate)) {
            showNotification('From date must be before To date', 'error');
            return;
        }
    }

    if (type === 'journal') {
        exportJournalPDF(fromDate, toDate);
    } else {
        exportCalendarPDF(fromDate, toDate);
    }

    window.closeModal('exportPDFModal');
};

function exportJournalPDF(fromDate, toDate) {
    let entries = [...AppState.journal].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (fromDate && toDate) {
        const from = new Date(fromDate);
        const to = new Date(toDate);
        to.setHours(23, 59, 59);

        entries = entries.filter(e => {
            const entryDate = new Date(e.date);
            return entryDate >= from && entryDate <= to;
        });
    }

    if (entries.length === 0) {
        showNotification('No journal entries found in selected range', 'error');
        return;
    }

    const dateRangeText = fromDate && toDate
        ? `${formatDateForDisplay(fromDate)} - ${formatDateForDisplay(toDate)}`
        : 'All Time';

    const moodEmojis = { great: '😊', good: '🙂', neutral: '😐', low: '😔', bad: '😢' };

    let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Journal Export - Arcana</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    background: #1a1a2e; 
                    color: #e0e0e0;
                    padding: 40px;
                    line-height: 1.6;
                }
                .header { 
                    text-align: center; 
                    margin-bottom: 40px;
                    border-bottom: 2px solid #d4af37;
                    padding-bottom: 20px;
                }
                .header h1 { 
                    color: #d4af37; 
                    font-size: 2.5rem;
                    margin-bottom: 10px;
                }
                .header .subtitle { color: #888; font-size: 1rem; }
                .entry { 
                    background: #252542;
                    border-radius: 10px;
                    padding: 25px;
                    margin-bottom: 25px;
                    border-left: 4px solid #d4af37;
                    page-break-inside: avoid;
                }
                .entry-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                    flex-wrap: wrap;
                    gap: 10px;
                }
                .entry-date { 
                    color: #d4af37; 
                    font-weight: 600;
                    font-size: 1.1rem;
                }
                .entry-mood { 
                    background: rgba(212, 175, 55, 0.2);
                    padding: 5px 12px;
                    border-radius: 20px;
                    font-size: 0.9rem;
                }
                .entry-content { 
                    white-space: pre-wrap;
                    margin-bottom: 15px;
                }
                .entry-tags { 
                    display: flex; 
                    gap: 8px; 
                    flex-wrap: wrap;
                }
                .tag {
                    background: rgba(212, 175, 55, 0.15);
                    color: #d4af37;
                    padding: 4px 10px;
                    border-radius: 15px;
                    font-size: 0.85rem;
                }
                .footer {
                    text-align: center;
                    margin-top: 40px;
                    color: #666;
                    font-size: 0.9rem;
                }
                @media print {
                    body { background: white; color: #333; }
                    .entry { background: #f5f5f5; border-left-color: #b8860b; }
                    .header h1 { color: #b8860b; }
                    .entry-date { color: #b8860b; }
                    .tag { background: #f0e6d0; color: #8b7355; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📓 Journal</h1>
                <div class="subtitle">${dateRangeText} • ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}</div>
            </div>
    `;

    entries.forEach(entry => {
        const date = new Date(entry.date);
        const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
        const mood = entry.mood ? `${moodEmojis[entry.mood] || ''} ${entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1)}` : '';
        const tags = entry.tags ? entry.tags.split(',').map(t => t.trim()).filter(t => t) : [];

        html += `
            <div class="entry">
                <div class="entry-header">
                    <span class="entry-date">${formattedDate}</span>
                    ${mood ? `<span class="entry-mood">${mood}</span>` : ''}
                </div>
                <div class="entry-content">${escapeHtml(entry.content)}</div>
                ${tags.length > 0 ? `
                    <div class="entry-tags">
                        ${tags.map(t => `<span class="tag">#${t}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    });

    html += `
            <div class="footer">
                Exported from Arcana Productivity • ${new Date().toLocaleString()}
            </div>
        </body>
        </html>
    `;

    openPrintWindow(html, 'journal');
}

function exportCalendarPDF(fromDate, toDate) {
    // Get scheduled items
    let scheduled = [...(AppState.scheduled || [])].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Get journal entries for dates
    let journalByDate = {};
    AppState.journal.forEach(j => {
        const dateKey = new Date(j.date).toISOString().split('T')[0];
        if (!journalByDate[dateKey]) journalByDate[dateKey] = [];
        journalByDate[dateKey].push(j);
    });

    // Get completed flows for dates
    let flowsByDate = {};
    AppState.flows.forEach(flow => {
        if (flow.completedDates) {
            flow.completedDates.forEach(dateStr => {
                const dateKey = dateStr.split('T')[0];
                if (!flowsByDate[dateKey]) flowsByDate[dateKey] = [];
                flowsByDate[dateKey].push(flow.title);
            });
        }
    });

    if (fromDate && toDate) {
        const from = new Date(fromDate);
        const to = new Date(toDate);
        to.setHours(23, 59, 59);

        scheduled = scheduled.filter(s => {
            const d = new Date(s.date);
            return d >= from && d <= to;
        });

        // Filter journal and flows by date
        Object.keys(journalByDate).forEach(key => {
            const d = new Date(key);
            if (d < from || d > to) delete journalByDate[key];
        });
        Object.keys(flowsByDate).forEach(key => {
            const d = new Date(key);
            if (d < from || d > to) delete flowsByDate[key];
        });
    }

    // Collect all dates with activity
    const allDates = new Set();
    scheduled.forEach(s => allDates.add(s.date));
    Object.keys(journalByDate).forEach(d => allDates.add(d));
    Object.keys(flowsByDate).forEach(d => allDates.add(d));

    if (allDates.size === 0) {
        showNotification('No calendar activity found in selected range', 'error');
        return;
    }

    const dateRangeText = fromDate && toDate
        ? `${formatDateForDisplay(fromDate)} - ${formatDateForDisplay(toDate)}`
        : 'All Time';

    let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Calendar Export - Arcana</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    background: #1a1a2e; 
                    color: #e0e0e0;
                    padding: 40px;
                    line-height: 1.6;
                }
                .header { 
                    text-align: center; 
                    margin-bottom: 40px;
                    border-bottom: 2px solid #d4af37;
                    padding-bottom: 20px;
                }
                .header h1 { 
                    color: #d4af37; 
                    font-size: 2.5rem;
                    margin-bottom: 10px;
                }
                .header .subtitle { color: #888; font-size: 1rem; }
                .date-section {
                    background: #252542;
                    border-radius: 10px;
                    padding: 20px;
                    margin-bottom: 20px;
                    page-break-inside: avoid;
                }
                .date-header {
                    color: #d4af37;
                    font-size: 1.2rem;
                    font-weight: 600;
                    margin-bottom: 15px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid rgba(212, 175, 55, 0.3);
                }
                .activity-group {
                    margin-bottom: 15px;
                }
                .activity-label {
                    color: #888;
                    font-size: 0.85rem;
                    text-transform: uppercase;
                    margin-bottom: 8px;
                }
                .activity-item {
                    background: rgba(255,255,255,0.05);
                    padding: 10px 15px;
                    border-radius: 6px;
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .activity-icon { font-size: 1.2rem; }
                .activity-time { color: #d4af37; font-size: 0.9rem; min-width: 60px; }
                .completed-flow {
                    color: #4ade80;
                }
                .footer {
                    text-align: center;
                    margin-top: 40px;
                    color: #666;
                    font-size: 0.9rem;
                }
                @media print {
                    body { background: white; color: #333; }
                    .date-section { background: #f5f5f5; }
                    .header h1, .date-header { color: #b8860b; }
                    .activity-item { background: #eee; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📅 Calendar</h1>
                <div class="subtitle">${dateRangeText}</div>
            </div>
    `;

    // Sort dates
    const sortedDates = Array.from(allDates).sort((a, b) => new Date(a) - new Date(b));

    sortedDates.forEach(dateStr => {
        const date = new Date(dateStr);
        const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        const dayScheduled = scheduled.filter(s => s.date === dateStr);
        const dayJournals = journalByDate[dateStr] || [];
        const dayFlows = flowsByDate[dateStr] || [];

        html += `<div class="date-section">
            <div class="date-header">${formattedDate}</div>`;

        // Scheduled items
        if (dayScheduled.length > 0) {
            html += `<div class="activity-group">
                <div class="activity-label">Scheduled</div>`;
            dayScheduled.forEach(item => {
                const flow = AppState.flows.find(f => f.id === item.flowId);
                const title = flow ? flow.title : 'Unknown Flow';
                html += `<div class="activity-item">
                    <span class="activity-icon">🔮</span>
                    <span class="activity-time">${item.time || '--:--'}</span>
                    <span>${escapeHtml(title)}</span>
                </div>`;
            });
            html += `</div>`;
        }

        // Completed flows
        if (dayFlows.length > 0) {
            html += `<div class="activity-group">
                <div class="activity-label">Completed Flows</div>`;
            dayFlows.forEach(title => {
                html += `<div class="activity-item completed-flow">
                    <span class="activity-icon">✓</span>
                    <span>${escapeHtml(title)}</span>
                </div>`;
            });
            html += `</div>`;
        }

        // Journal entries
        if (dayJournals.length > 0) {
            html += `<div class="activity-group">
                <div class="activity-label">Journal Entries</div>`;
            dayJournals.forEach(j => {
                const preview = j.content.length > 100 ? j.content.substring(0, 100) + '...' : j.content;
                html += `<div class="activity-item">
                    <span class="activity-icon">📝</span>
                    <span>${escapeHtml(preview)}</span>
                </div>`;
            });
            html += `</div>`;
        }

        html += `</div>`;
    });

    html += `
            <div class="footer">
                Exported from Arcana Productivity • ${new Date().toLocaleString()}
            </div>
        </body>
        </html>
    `;

    openPrintWindow(html, 'calendar');
}

function openPrintWindow(html, type) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showNotification('Please allow popups to export PDF', 'error');
        return;
    }

    printWindow.document.write(html);
    printWindow.document.close();

    // Auto-trigger print dialog after content loads
    printWindow.onload = () => {
        setTimeout(() => {
            printWindow.print();
        }, 250);
    };

    showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} ready! Use Print → Save as PDF`, 'gold');
}

function formatDateForDisplay(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatRelativeTime(dateStr) {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 172800) return 'Yesterday';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// --- MOBILE DRAG SUPPORT ---
function addMobileDragSupport(element, handleSelector, onReorder) {
    const handle = element.querySelector(handleSelector);
    if (!handle) return;

    let startY = 0;
    let draggedItem = null;
    let initialIndex = 0;

    handle.addEventListener('touchstart', (e) => {
        e.preventDefault();
        document.body.classList.add('no-scroll');

        draggedItem = element;
        startY = e.touches[0].clientY;

        draggedItem.classList.add('dragging');
        draggedItem.style.opacity = '0.5';

        const parent = draggedItem.parentNode;
        initialIndex = Array.from(parent.children).indexOf(draggedItem);
    }, { passive: false });

    handle.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!draggedItem) return;

        const touch = e.touches[0];

        // Temporarily disable pointer events on the item we're dragging
        // so we can see what's actually underneath the finger
        const originalPointerEvents = draggedItem.style.pointerEvents;
        draggedItem.style.pointerEvents = 'none';

        const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
        const closestItem = targetElement?.closest(element.tagName);

        // Restore pointer events
        draggedItem.style.pointerEvents = originalPointerEvents;

        if (closestItem && closestItem !== draggedItem && closestItem.parentNode === draggedItem.parentNode) {
            const parent = draggedItem.parentNode;
            const fromIndex = Array.from(parent.children).indexOf(draggedItem);
            const toIndex = Array.from(parent.children).indexOf(closestItem);

            if (fromIndex < toIndex) {
                parent.insertBefore(draggedItem, closestItem.nextSibling);
            } else {
                parent.insertBefore(draggedItem, closestItem);
            }

            // Tactile feedback
            if (navigator.vibrate) navigator.vibrate(10);
        }
    }, { passive: false });

    handle.addEventListener('touchend', (e) => {
        document.body.classList.remove('no-scroll');
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
            draggedItem.style.opacity = '';

            const parent = draggedItem.parentNode;
            const newIndex = Array.from(parent.children).indexOf(draggedItem);

            if (initialIndex !== newIndex && onReorder) {
                onReorder(initialIndex, newIndex);
            }
        }
        draggedItem = null;
    });
}
