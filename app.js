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

window.openModal = (id) => document.getElementById(id).classList.add('active');
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
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.clearWorkingImage = () => {
    currentWorkingImage = null;
    document.getElementById('workingImage').value = '';
    document.getElementById('workingImageFile').value = '';
    document.getElementById('workingImagePreview').style.display = 'none';
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
    document.getElementById('workingModalTitle').textContent = 'Create Magick Working';
    document.getElementById('workingSaveBtn').textContent = 'Begin Working';
    currentWorkingImage = null;
    window.currentEditingWorkingId = null;
    window.openModal('workingBuilderModal');
};

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
            completedDays: [], // Track which days were completed
            sessionNotes: [] // Track notes for each session
        };
        AppState.workings.push(working);
        addXP(50);
    }

    saveState();
    initWorkings();
    window.closeModal('workingBuilderModal');
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
    showConfirmModal('Delete Working', 'Delete this working? All progress will be lost.', () => {
        AppState.workings = AppState.workings.filter(x => x.id !== id);
        saveState();
        const activeTab = document.querySelector('.workings-tabs .tab-btn.active')?.dataset.tab || 'active';
        initWorkings(activeTab);
        showNotification('Working deleted', 'normal');
    });
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
    document.getElementById('workingModalTitle').textContent = 'Edit Working';
    document.getElementById('workingSaveBtn').textContent = 'Save Changes';

    // Handle image
    currentWorkingImage = w.image || null;
    document.getElementById('workingImage').value = currentWorkingImage || '';
    if (currentWorkingImage) {
        document.getElementById('workingImagePreviewImg').src = currentWorkingImage;
        document.getElementById('workingImagePreview').style.display = 'flex';
    } else {
        document.getElementById('workingImagePreview').style.display = 'none';
    }

    // Store editing ID for save function
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
        logActivity('working', `Working: ${w.name}`, 20);
        showNotification(`Day ${w.daysCompleted} completed for ${w.name}`, 'gold');

        if (w.daysCompleted >= w.duration) {
            w.status = 'completed';
            showCelebration(); // Show celebration for completing working
            showNotification(`Working ${w.name} Fully Completed! 🎉`, 'gold');
            addXP(500);
        }
        saveState();
        initWorkings();

        // Prompt for Journal with styled modal
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

function initTasks() {
    renderTasks();
    initTaskDragDrop();
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

            // Try to read id from dataTransfer, fall back to the dragging element
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

    // Also attach handlers to the column container so empty lists accept drops
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

window.openTaskModal = () => {
    editingTaskId = null;
    document.getElementById('taskName').value = '';
    document.getElementById('taskCategory').value = 'Work';
    document.getElementById('taskPriority').value = 'Medium';
    document.getElementById('taskDueDate').value = '';
    document.getElementById('taskModalTitle').textContent = 'Add Task';
    window.openModal('taskModal');
};

window.editTask = (id) => {
    const task = AppState.tasks.find(t => t.id === id);
    if (!task) return;

    editingTaskId = id;
    document.getElementById('taskName').value = task.name;
    document.getElementById('taskCategory').value = task.category;
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskDueDate').value = task.dueDate || '';
    document.getElementById('taskModalTitle').textContent = 'Edit Task';
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
            task.dueDate = document.getElementById('taskDueDate').value || null;
            showNotification('Task updated', 'gold');
        }
    } else {
        const task = {
            id: Date.now(),
            name,
            category: document.getElementById('taskCategory').value,
            priority: document.getElementById('taskPriority').value,
            dueDate: document.getElementById('taskDueDate').value || null,
            status: 'todo',
            created: new Date().toISOString()
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

    // Get filter values
    const searchQuery = document.getElementById('taskSearch')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('taskCategoryFilter')?.value || '';
    const priorityFilter = document.getElementById('taskPriorityFilter')?.value || '';

    // Filter tasks
    const filteredTasks = AppState.tasks.filter(task => {
        if (searchQuery && !task.name.toLowerCase().includes(searchQuery)) return false;
        if (categoryFilter && task.category.toLowerCase() !== categoryFilter.toLowerCase()) return false;
        if (priorityFilter && task.priority.toLowerCase() !== priorityFilter.toLowerCase()) return false;
        return true;
    });

    todoList.innerHTML = '';
    progressList.innerHTML = '';
    doneList.innerHTML = '';

    let counts = { todo: 0, progress: 0, done: 0 };
    const today = new Date().toISOString().split('T')[0];

    // Priority colors
    const priorityColors = {
        high: '#ff6b6b',
        medium: 'var(--gold-primary)',
        low: '#6bff8e'
    };

    filteredTasks.forEach(task => {
        counts[task.status]++;
        const el = document.createElement('div');
        el.className = 'task-card';
        el.draggable = true;
        el.dataset.taskId = task.id;

        const isDone = task.status === 'done';
        const isOverdue = task.dueDate && task.dueDate < today && !isDone;

        if (isOverdue) {
            el.classList.add('task-overdue');
        }

        // Setup drag events
        el.addEventListener('dragstart', (e) => {
            // store the task id as a string and allow move
            try { e.dataTransfer.setData('text/plain', String(task.id)); } catch (err) { }
            try { e.dataTransfer.effectAllowed = 'move'; } catch (err) { }
            el.classList.add('dragging');
            document.body.classList.add('no-scroll');
        });

        el.addEventListener('dragend', () => {
            el.classList.remove('dragging');
            document.body.classList.remove('no-scroll');
        });

        // Format due date display
        let dueDateHtml = '';
        if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            const dateStr = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const overdueClass = isOverdue ? 'task-badge-overdue' : '';
            dueDateHtml = `<span class="task-badge ${overdueClass}">📅 ${dateStr}</span>`;
        }

        el.innerHTML = `
            <div class="task-check ${isDone ? 'checked' : ''}" onclick="toggleTaskDone(${task.id})"></div>
            <div class="task-content">
                <div class="task-title" style="${isDone ? 'text-decoration:line-through; opacity:0.5;' : ''}">${task.name}</div>
                <div class="task-meta">
                    <span class="task-badge">${task.category}</span>
                    <span class="task-badge" style="color:${priorityColors[task.priority.toLowerCase()] || 'var(--gold-primary)'}">${task.priority}</span>
                    ${dueDateHtml}
                </div>
            </div>
            <div style="display:flex; gap:5px">
                <button class="btn-sm btn-outline" onclick="editTask(${task.id})" title="Edit">✎</button>
                <button class="btn-sm btn-danger" onclick="deleteTask(${task.id})" title="Delete">×</button>
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

    // Populate Mastery Link selector
    const updateMasterySelector = () => {
        const pomoMasterySelect = document.getElementById('pomoMasteryLink');
        if (!pomoMasterySelect) return;

        const currentVal = AppState.settings.pomodoro.linkedMasteryId;
        pomoMasterySelect.innerHTML = '<option value="">None (General Focus)</option>';
        AppState.mastery.forEach(m => {
            if (m.type === 'hours') {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = `${m.icon || '🧘'} ${m.name}`;
                if (currentVal == m.id) opt.selected = true;
                pomoMasterySelect.appendChild(opt);
            }
        });
    };

    updateMasterySelector();

    // Listen for mastery changes to refresh selector
    const originalRenderMastery = window.renderMastery;
    window.renderMastery = (...args) => {
        if (originalRenderMastery) originalRenderMastery(...args);
        updateMasterySelector();
        updateLinkedGoalDisplay();
    };

    const pomoMasterySelect = document.getElementById('pomoMasteryLink');
    if (pomoMasterySelect) {
        pomoMasterySelect.onchange = (e) => {
            AppState.settings.pomodoro.linkedMasteryId = e.target.value || null;
            saveState();
            updateLinkedGoalDisplay();
        };
    }

    // Initialize display
    resetPomodoro();
    updateStatsDisplay();

    // Mode handling for V2 (from side tabs or any future mode switchers)
    const modeBtns = document.querySelectorAll('.mode-btn');
    if (modeBtns.length > 0) {
        modeBtns.forEach(btn => {
            btn.onclick = () => {
                modeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                AppState.pomoState.mode = btn.dataset.mode;
                resetPomodoro();
            };
        });
    }
}

function updateLinkedGoalDisplay() {
    const display = document.getElementById('pomoLinkedGoalDisplay');
    const nameEl = document.getElementById('pomoLinkedGoalName');
    const dot = document.getElementById('pomoGoalDot');

    const linkedId = AppState.settings.pomodoro?.linkedMasteryId;
    if (linkedId) {
        const m = AppState.mastery.find(x => x.id == linkedId);
        if (m) {
            if (display) display.style.display = 'inline-flex';
            if (nameEl) nameEl.textContent = `${m.icon || '🧘'} ${m.name}`;
            if (dot) dot.style.setProperty('--goal-color', m.color);
            return;
        }
    }
    if (display) display.style.display = 'none';
}

window.togglePomodoro = () => {
    const btn = document.getElementById('pomoToggleBtn');

    if (AppState.pomoState.isRunning) {
        clearInterval(AppState.pomoState.interval);
        AppState.pomoState.isRunning = false;
        if (btn) btn.innerHTML = '<span>▶️</span>';
        saveState();
    } else {
        AppState.pomoState.isRunning = true;
        if (btn) btn.innerHTML = '<span>⏸️</span>';

        AppState.pomoState.interval = setInterval(() => {
            AppState.pomoState.time--;
            updatePomoDisplay();

            if (AppState.pomoState.time % 10 === 0) saveState(); // Save every 10s to avoid lag

            if (AppState.pomoState.time <= 0) {
                clearInterval(AppState.pomoState.interval);
                AppState.pomoState.isRunning = false;
                if (btn) btn.innerHTML = '<span>▶️</span>';

                playNotificationSound();
                showNotification("Focus Session Complete!", "gold");

                if (AppState.pomoState.mode === 'work') {
                    AppState.pomodorosToday++;
                    AppState.totalPomodoros++;
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
                            logActivity('pomodoro', `Session: ${mastery.name}`, xpGained);
                            showNotification(`+${durationMin}m added to ${mastery.name}`, 'gold');
                            renderMastery();
                        } else {
                            logActivity('pomodoro', 'Focus Session', xpGained);
                        }
                    } else {
                        logActivity('pomodoro', 'Focus Session', xpGained);
                    }
                }
                saveState();
                updateStatsDisplay();
                resetPomodoro(); // Reset to next mode if logic is added later, for now just reset
            }
        }, 1000);
    }
};

window.resetPomodoro = () => {
    clearInterval(AppState.pomoState.interval);
    AppState.pomoState.isRunning = false;

    const settings = AppState.settings.pomodoro || { work: 25, short: 5, long: 15 };
    AppState.pomoState.time = settings[AppState.pomoState.mode] * 60;
    AppState.pomoState.totalTime = AppState.pomoState.time;

    updatePomoDisplay();
    updateLinkedGoalDisplay();
    saveState();

    const btn = document.getElementById('pomoToggleBtn');
    if (btn) btn.innerHTML = '<span>▶️</span>';
};

function updatePomoDisplay() {
    const m = Math.floor(AppState.pomoState.time / 60).toString().padStart(2, '0');
    const s = (AppState.pomoState.time % 60).toString().padStart(2, '0');

    // Update main display
    const el = document.getElementById('timerDisplay');
    if (el) el.textContent = `${m}:${s}`;

    // Update badge and colors
    const badge = document.getElementById('pomoModeBadge');
    const glow = document.getElementById('pomoGlow');

    if (badge) {
        if (!AppState.pomoState.isRunning && AppState.pomoState.time === AppState.pomoState.totalTime) {
            badge.textContent = 'Ready to Focus';
            badge.className = 'pomo-mode-badge';
            if (glow) glow.style.setProperty('--pomo-glow', 'var(--gold-glow)');
        } else {
            const mode = AppState.pomoState.mode;
            badge.textContent = mode === 'work' ? 'Deep Focus' : (mode === 'short' ? 'Short Rest' : 'Long Rest');
            badge.className = 'pomo-mode-badge active-work';

            if (glow) {
                const color = mode === 'work' ? 'var(--gold-glow)' : 'var(--accent-blue)';
                glow.style.setProperty('--pomo-glow', color);
            }
        }
    }

    // Ring progress
    const ring = document.getElementById('pomodoroRing');
    if (ring) {
        const total = AppState.pomoState.totalTime || (25 * 60);
        const circumference = 2 * Math.PI * 110;
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
    const circle = document.querySelector('.breathing-circle');
    const patternSelect = document.getElementById('breathingPattern');
    const timerDisplay = document.getElementById('breathingTimer');
    const instructionDisplay = document.getElementById('breathingInstruction');
    if (!text || !circle) return;

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

    // Store timer interval for cleanup
    AppState.breathingTimerInterval = null;

    const updateTimer = () => {
        if (timerDisplay) {
            timerDisplay.textContent = timeLeft > 0 ? timeLeft : '';
        }
    };

    const runPhase = () => {
        if (!document.getElementById('breathingOverlay').classList.contains('active') || !AppState.breathingActive) {
            if (timerInterval) clearInterval(timerInterval);
            return;
        }

        if (timerInterval) clearInterval(timerInterval);

        const currentPhase = phases[phaseIndex];
        const visuals = getPhaseVisuals(currentPhase.type);

        // Set label (custom label or default)
        text.textContent = currentPhase.label || visuals.defaultLabel;

        // Set instruction if available
        if (instructionDisplay) {
            instructionDisplay.textContent = currentPhase.instruction || '';
        }

        // Apply visuals (only if not null - allows hold to keep previous transform)
        if (visuals.transform !== null) circle.style.transform = visuals.transform;
        if (visuals.opacity !== null) circle.style.opacity = visuals.opacity;
        circle.style.background = visuals.background;
        circle.style.boxShadow = visuals.boxShadow;
        createParticles(visuals.particles);

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

// --- MASTERY ---
function initMastery() {
    // Icon selection logic
    const iconGrid = document.getElementById('masteryIconGrid');
    if (iconGrid) {
        iconGrid.querySelectorAll('.mastery-icon-option').forEach(opt => {
            opt.onclick = () => {
                iconGrid.querySelectorAll('.mastery-icon-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                document.getElementById('masteryIcon').value = opt.dataset.icon;
            };
        });
    }
    renderMastery();
}

window.openMasteryModal = () => {
    // Reset form
    document.getElementById('masteryModalTitle').textContent = 'New Mastery Goal';
    document.getElementById('masterySaveBtn').textContent = 'Create Mastery';
    document.getElementById('masteryName').value = '';
    document.getElementById('masteryGoal').value = '10';
    document.getElementById('customHours').value = '';
    document.getElementById('customHoursGroup').style.display = 'none';
    document.getElementById('masteryIcon').value = '🧘';

    // Reset icon grid
    const iconGrid = document.getElementById('masteryIconGrid');
    if (iconGrid) {
        iconGrid.querySelectorAll('.mastery-icon-option').forEach(o => o.classList.remove('active'));
        iconGrid.querySelector('[data-icon="🧘"]').classList.add('active');
    }

    delete window.editingMasteryId;
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
    const icon = document.getElementById('masteryIcon').value || '🧘';
    const color = document.querySelector('input[name="masteryColor"]:checked').value;
    let goal;

    if (document.getElementById('masteryGoal').value === 'custom') {
        goal = parseInt(document.getElementById('customHours').value);
        if (!goal || goal <= 0) return showNotification('Please enter a valid custom goal number', 'error');
    } else {
        goal = parseInt(document.getElementById('masteryGoal').value);
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
            lastLog: null
        };
        AppState.mastery.push(item);
        showNotification('Mastery goal created!', 'gold');
    }

    saveState();
    renderMastery();
    window.closeModal('masteryModal');
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

    activeMastery.forEach((m) => {
        const el = document.createElement('div');
        el.className = 'mastery-card-enhanced';
        el.style.setProperty('--card-color', m.color);
        el.draggable = true;
        el.dataset.id = m.id;

        const pct = Math.min((m.currentHours / m.goalHours) * 100, 100);
        const unitLabel = m.type === 'reps' ? 'Reps' : 'Hrs';

        let tier = 'Bronze';
        let tierColor = 'var(--mastery-bronze)';
        if (pct >= 100) { tier = 'Master'; tierColor = 'var(--mastery-platinum)'; }
        else if (pct >= 75) { tier = 'Platinum'; tierColor = 'var(--mastery-platinum)'; }
        else if (pct >= 50) { tier = 'Gold'; tierColor = 'var(--mastery-gold)'; }
        else if (pct >= 25) { tier = 'Silver'; tierColor = 'var(--mastery-silver)'; }

        const lastLogText = m.lastLog ? formatRelativeTime(m.lastLog) : 'Never';

        el.innerHTML = `
            <div class="drag-handle">⋮⋮</div>
            <div class="mastery-tier-badge" style="--tier-color: ${tierColor}">${tier}</div>
            
            <div class="mastery-title-group">
                <span class="mastery-title">${m.icon || '🧘'} ${m.name}</span>
                <span class="mastery-subtitle">Last log: ${lastLogText}</span>
            </div>

            <div class="mastery-stats-v2">
                <div class="stat-item-v2">
                    <span class="stat-label-v2">Progress</span>
                    <span class="stat-value-v2">${parseFloat(m.currentHours).toFixed(m.type === 'reps' ? 0 : 1)} ${unitLabel}</span>
                </div>
                <div class="stat-item-v2" style="align-items: flex-end;">
                    <span class="stat-label-v2">Target</span>
                    <span class="stat-value-v2">${m.goalHours} ${unitLabel}</span>
                </div>
            </div>

            <div class="mastery-progress-section">
                <div class="progress-header-v2">
                    <span class="stat-label-v2">Mastery level</span>
                    <span class="pct-v2">${Math.round(pct)}%</span>
                </div>
                <div class="mastery-progress-bg-v2">
                    <div class="mastery-progress-fill-v2" style="width:${pct}%"></div>
                </div>
            </div>

            <div class="mastery-actions-v3">
                <button class="btn-mastery-action" onclick="openMasteryLogModal(${m.id})">
                    <span>➕</span> Log
                </button>
                <button class="btn-mastery-action" style="flex:0 0 45px;" onclick="editMastery(${m.id})" title="Edit">
                    ✎
                </button>
                <button class="btn-mastery-action" style="flex:0 0 45px; color:var(--accent-red);" onclick="deleteMastery(${m.id})" title="Delete">
                    ×
                </button>
            </div>
        `;

        // Drag events
        el.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', m.id);
            el.classList.add('dragging');
            document.body.classList.add('no-scroll');
        });
        el.addEventListener('dragend', () => {
            el.classList.remove('dragging');
            document.body.classList.remove('no-scroll');
        });
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

        // Mobile Drag Support
        addMobileDragSupport(el, '.drag-handle', (from, to) => {
            const [moved] = AppState.mastery.splice(from, 1);
            AppState.mastery.splice(to, 0, moved);
            saveState();
            renderMastery();
            showNotification('Mastery order updated', 'normal');
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

    window.editingMasteryId = id;

    document.getElementById('masteryModalTitle').textContent = 'Edit Mastery Goal';
    document.getElementById('masterySaveBtn').textContent = 'Update Mastery';
    document.getElementById('masteryName').value = m.name;

    // Icon selection
    const iconGrid = document.getElementById('masteryIconGrid');
    if (iconGrid) {
        iconGrid.querySelectorAll('.mastery-icon-option').forEach(o => o.classList.remove('active'));
        const opt = iconGrid.querySelector(`[data-icon="${m.icon || '🧘'}"]`);
        if (opt) opt.classList.add('active');
        document.getElementById('masteryIcon').value = m.icon || '🧘';
    }

    // Goal type
    const typeRadio = document.querySelector(`input[name="masteryType"][value="${m.type}"]`);
    if (typeRadio) {
        typeRadio.checked = true;
        toggleMasteryInput(m.type);
    }

    // Goal value
    const goalSelect = document.getElementById('masteryGoal');
    const customGroup = document.getElementById('customHoursGroup');
    const customInput = document.getElementById('customHours');

    if (['10', '100', '1000', '10000'].includes(String(m.goalHours))) {
        goalSelect.value = String(m.goalHours);
        customGroup.style.display = 'none';
    } else {
        goalSelect.value = 'custom';
        customGroup.style.display = 'block';
        customInput.value = m.goalHours;
    }

    // Color
    const colorRadio = document.querySelector(`input[name="masteryColor"][value="${m.color}"]`);
    if (colorRadio) colorRadio.checked = true;

    window.openModal('masteryModal');
};

window.updateMastery = (id) => {
    // This is now handled by saveMastery but we keep it as a wrapper or redirect if needed
    window.editingMasteryId = id;
    saveMastery();
};

window.deleteMastery = (id) => {
    showConfirmModal('Delete Mastery Goal', 'Delete this mastery goal? Progress will be lost.', () => {
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
        m.lastLog = new Date().toISOString();
        saveState();
        renderMastery();

        let xp = 0;
        if (m.type === 'reps') {
            xp = Math.round(Math.abs(amount) * 0.5);
        } else {
            xp = Math.round(amount * 60);
        }

        if (xp > 0) {
            addXP(xp);
            logActivity('working', `Mastery: ${m.name} (+${amount.toFixed(1)} ${m.type === 'reps' ? 'reps' : 'hrs'})`, xp);
            showNotification(`Progress logged! +${xp} XP`, 'gold');
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
                    <button class="modal-close" onclick="window.closeModal('${modalId}')">&times;</button>
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
                    <button class="modal-close" onclick="window.closeModal('${modalId}')">&times;</button>
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
    const icon = type === 'journal' ? '📓' : '📅';

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
                <h2>${icon} ${title}</h2>
                <button class="modal-close" onclick="window.closeModal('${modalId}')">&times;</button>
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
