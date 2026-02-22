// Global Variables
let metaModelData = {};
let practiceCount = 0;
let currentStatementIndex = 0;
const MAX_STREAK_CHARGES = 3;
const DEFAULT_DAILY_GOAL = 3;
const DEFAULT_USER_PROGRESS = {
    xp: 0,
    stars: 0,
    streak: 0,
    badges: [],
    sessions: 0,
    lastSessionDate: null,
    dailyGoal: DEFAULT_DAILY_GOAL,
    todayActions: 0,
    todayDate: null,
    streakCharges: 0,
    lastChargeAwardedDate: null,
    lastChargeUsedDate: null
};
let userProgress = { ...DEFAULT_USER_PROGRESS };
let trainerState = {
    isActive: false,
    currentQuestion: 0,
    questions: [],
    selectedCategory: '',
    phaseCorrectCount: 0,
    phaseSkippedCount: 0,
    sessionXP: 0,
    sessionStars: 0,
    answered: false,
    hintLevel: 0,
    reviewMode: false,
    reviewPool: [],
    reviewPoolKeys: {},
    mainTotalCount: 0,
    mainCorrectCount: null,
    mainSkippedCount: null,
    reviewTotalCount: 0,
    reviewCorrectCount: 0,
    reviewSkippedCount: 0,
    didRecordSession: false,
    deletionCoachMode: false,
    currentOptionSet: []
};

let scenarioTrainerData = {
    domains: [],
    difficulties: [],
    optionTemplates: {
        red: [],
        green: null
    },
    consequenceTemplates: {},
    scenarios: [],
    prismWheel: [],
    safetyKeywords: []
};

const SCENARIO_STORAGE_KEYS = {
    settings: 'scenario_trainer_settings_v1',
    progress: 'scenario_trainer_progress_v1'
};

const SCENARIO_STATES = {
    HOME: 'HOME',
    DOMAIN_PICK: 'DOMAIN_PICK',
    SCENARIO: 'SCENARIO',
    OPTION_PICK: 'OPTION_PICK',
    FEEDBACK: 'FEEDBACK',
    BLUEPRINT: 'BLUEPRINT',
    SCORE: 'SCORE',
    NEXT_SCENARIO: 'NEXT_SCENARIO'
};

const SCENARIO_ALLOWED_TRANSITIONS = {
    [SCENARIO_STATES.HOME]: [SCENARIO_STATES.DOMAIN_PICK],
    [SCENARIO_STATES.DOMAIN_PICK]: [SCENARIO_STATES.SCENARIO, SCENARIO_STATES.HOME],
    [SCENARIO_STATES.SCENARIO]: [SCENARIO_STATES.OPTION_PICK, SCENARIO_STATES.HOME],
    [SCENARIO_STATES.OPTION_PICK]: [SCENARIO_STATES.FEEDBACK],
    [SCENARIO_STATES.FEEDBACK]: [SCENARIO_STATES.BLUEPRINT],
    [SCENARIO_STATES.BLUEPRINT]: [SCENARIO_STATES.SCORE, SCENARIO_STATES.HOME],
    [SCENARIO_STATES.SCORE]: [SCENARIO_STATES.NEXT_SCENARIO, SCENARIO_STATES.HOME],
    [SCENARIO_STATES.NEXT_SCENARIO]: [SCENARIO_STATES.SCENARIO, SCENARIO_STATES.HOME]
};

let scenarioTrainer = {
    state: SCENARIO_STATES.HOME,
    settings: null,
    progress: null,
    session: null,
    activeScenario: null,
    selectedOption: null,
    currentPredicateAnalysis: null,
    safetyLocked: false,
    didRecordSession: false
};

let audioState = {
    context: null,
    muted: false,
    openingPlayed: false,
    openingTrack: null,
    firstEntryDone: false
};

const OPENING_TRACK_SRC = 'assets/audio/The_Inner_Task.mp3';
const OPENING_TRACK_FIRST_ENTRY_KEY = 'meta_opening_track_first_entry_done';

const TRAINER_CATEGORY_LABELS = {
    DELETION: '׳׳—׳™׳§׳” (Deletion)',
    DISTORTION: '׳¢׳™׳•׳•׳× (Distortion)',
    GENERALIZATION: '׳”׳›׳׳׳” (Generalization)'
};

const TRAINER_STAR_REWARDS = Object.freeze({
    easy: Object.freeze({ success: 2, partial: 1, fail: 1 }),
    medium: Object.freeze({ success: 3, partial: 2, fail: 1 }),
    hard: Object.freeze({ success: 4, partial: 2, fail: 1 })
});

let trainerRewardEffectTimer = null;
const PRACTICE_PAGE_KEYS = Object.freeze(['question', 'radar', 'triples-radar', 'wizard', 'sentence-morpher', 'verb-unzip']);
const PRACTICE_ACTIVE_TAB_STORAGE_KEY = 'practice_active_tab_v1';
const PRACTICE_TAB_BY_PAGE_KEY = Object.freeze({
    question: 'practice-question',
    radar: 'practice-radar',
    'triples-radar': 'practice-triples-radar',
    wizard: 'practice-wizard',
    'sentence-morpher': 'practice-sentence-morpher',
    'verb-unzip': 'practice-verb-unzip'
});
const PRACTICE_TAB_IDS = Object.freeze(Object.values(PRACTICE_TAB_BY_PAGE_KEY));
const WIZARD_REQUIRED_TITLE_STRING = 'כמתים נסתרים – ההכללות שמשתמעות אבל לא נאמרות';
const WIZARD_REQUIRED_FORMULA_STRING = 'חוץ (מצלמה) + כמת נסתר → עוצמה בפנים';

const SUBCATEGORY_TO_CATEGORY = {
    SIMPLE_DELETION: 'DELETION',
    COMPARATIVE_DELETION: 'DELETION',
    LACK_REFERENTIAL_INDEX: 'DELETION',
    LACK_OF_REFERENTIAL_INDEX: 'DELETION',
    NOMINALIZATION: 'DISTORTION',
    'CAUSE-EFFECT': 'DISTORTION',
    MIND_READING: 'DISTORTION',
    LOST_PERFORMATIVE: 'DISTORTION',
    PRESUPPOSITION: 'DISTORTION',
    COMPLEX_EQUIVALENCE: 'DISTORTION',
    UNIVERSAL_QUANTIFIER: 'GENERALIZATION',
    MODAL_OPERATOR: 'GENERALIZATION'
};

function shuffleArray(items) {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function getQuestionCategoryKey(question) {
    const directCategory = (question.category || '').toUpperCase().trim();
    if (TRAINER_CATEGORY_LABELS[directCategory]) return directCategory;

    const directViolation = (question.violation || '').toUpperCase().trim();
    if (TRAINER_CATEGORY_LABELS[directViolation]) return directViolation;

    const normalizedViolation = directViolation.replace(/\s+/g, '_');
    return SUBCATEGORY_TO_CATEGORY[normalizedViolation] || '';
}

function loadAudioSettings() {
    const saved = localStorage.getItem('meta_audio_muted');
    audioState.muted = saved === 'true';
    audioState.firstEntryDone = localStorage.getItem(OPENING_TRACK_FIRST_ENTRY_KEY) === 'true';
}

function ensureAudioContext() {
    if (audioState.context) return audioState.context;
    try {
        audioState.context = new (window.AudioContext || window.webkitAudioContext)();
        return audioState.context;
    } catch (e) {
        return null;
    }
}

function ensureOpeningTrack() {
    if (audioState.openingTrack) return audioState.openingTrack;
    try {
        const track = new Audio(OPENING_TRACK_SRC);
        track.preload = 'auto';
        track.loop = false;
        track.addEventListener('play', updateMusicToggleButtonUI);
        track.addEventListener('pause', updateMusicToggleButtonUI);
        track.addEventListener('ended', updateMusicToggleButtonUI);
        audioState.openingTrack = track;
        return track;
    } catch (e) {
        return null;
    }
}

function isOpeningTrackPlaying() {
    const track = audioState.openingTrack;
    return !!(track && !track.paused && !track.ended);
}

function updateMusicToggleButtonUI() {
    const btn = document.getElementById('music-toggle-btn');
    if (!btn) return;

    if (audioState.muted) {
        btn.textContent = 'נ”‡';
        btn.setAttribute('aria-label', 'Enable audio and play opening music');
        btn.setAttribute('title', 'Enable audio and play opening music');
        btn.classList.add('is-muted');
        btn.classList.remove('is-playing');
        return;
    }

    if (isOpeningTrackPlaying()) {
        btn.textContent = 'ג¹';
        btn.setAttribute('aria-label', 'Stop opening music');
        btn.setAttribute('title', 'Stop opening music');
        btn.classList.add('is-playing');
        btn.classList.remove('is-muted');
        return;
    }

    btn.textContent = 'נµ';
    btn.setAttribute('aria-label', 'Play opening music');
    btn.setAttribute('title', 'Play opening music');
    btn.classList.remove('is-playing', 'is-muted');
}

function setupMusicToggleButton() {
    let btn = document.getElementById('music-toggle-btn');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'music-toggle-btn';
        btn.className = 'music-toggle-btn';
        btn.type = 'button';
        btn.textContent = 'נµ';
        document.body.appendChild(btn);
    }

    if (btn.dataset.audioBound !== 'true') {
        btn.dataset.audioBound = 'true';
        btn.addEventListener('click', async () => {
            ensureAudioContext();
            if (audioState.muted) setMutedAudio(false);
            if (isOpeningTrackPlaying()) {
                stopOpeningMusic(true);
                return;
            }
            await playOpeningMusic({ force: true, markFirstEntry: false });
        });
    }

    updateMusicToggleButtonUI();
}

function updateMuteButtonUI() {
    const btns = document.querySelectorAll('.audio-mute-btn');
    if (!btns.length) {
        updateMusicToggleButtonUI();
        return;
    }
    btns.forEach(btn => {
        btn.textContent = audioState.muted ? '׳¡׳׳•׳ ׳“ ׳›׳‘׳•׳™' : '׳¡׳׳•׳ ׳“ ׳₪׳¢׳™׳';
        btn.classList.toggle('is-muted', audioState.muted);
    });
    updateMusicToggleButtonUI();
}

function setMutedAudio(isMuted) {
    audioState.muted = isMuted;
    localStorage.setItem('meta_audio_muted', String(isMuted));
    if (isMuted && audioState.openingTrack && !audioState.openingTrack.paused) {
        audioState.openingTrack.pause();
        audioState.openingTrack.currentTime = 0;
    }
    updateMuteButtonUI();
}

function toggleAudioMute() {
    setMutedAudio(!audioState.muted);
}

function setupAudioMuteButtons() {
    const btns = document.querySelectorAll('.audio-mute-btn');
    btns.forEach(btn => {
        if (btn.dataset.audioBound === 'true') return;
        btn.dataset.audioBound = 'true';
        btn.addEventListener('click', toggleAudioMute);
    });
    updateMuteButtonUI();
}

function playTone(frequency, duration = 0.12, type = 'sine', volume = 0.05, delay = 0) {
    if (audioState.muted) return;
    const ctx = ensureAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.value = frequency;
    osc.type = type;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.start(now);
    osc.stop(now + duration + 0.01);
}

function playUISound(kind) {
    if (audioState.muted) return;
    if (kind === 'correct') {
        playTone(660, 0.12, 'triangle', 0.06, 0);
        playTone(880, 0.14, 'triangle', 0.06, 0.08);
    } else if (kind === 'wrong') {
        playTone(220, 0.14, 'sawtooth', 0.05, 0);
        playTone(165, 0.16, 'sawtooth', 0.05, 0.08);
    } else if (kind === 'hint') {
        playTone(540, 0.08, 'sine', 0.04, 0);
        playTone(620, 0.08, 'sine', 0.04, 0.06);
    } else if (kind === 'skip') {
        playTone(380, 0.08, 'square', 0.04, 0);
    } else if (kind === 'next') {
        playTone(520, 0.08, 'triangle', 0.04, 0);
    } else if (kind === 'start') {
        playTone(523.25, 0.12, 'sine', 0.04, 0);
        playTone(659.25, 0.12, 'sine', 0.04, 0.1);
    } else if (kind === 'finish') {
        playTone(523.25, 0.11, 'triangle', 0.05, 0);
        playTone(659.25, 0.11, 'triangle', 0.05, 0.08);
        playTone(783.99, 0.15, 'triangle', 0.05, 0.16);
    } else if (kind === 'buzzer') {
        playTone(980, 0.06, 'square', 0.06, 0);
        playTone(740, 0.08, 'square', 0.06, 0.06);
        playTone(190, 0.22, 'sawtooth', 0.065, 0.14);
    } else if (kind === 'stars_big') {
        playTone(659.25, 0.08, 'triangle', 0.06, 0);
        playTone(880, 0.1, 'triangle', 0.06, 0.07);
        playTone(1174.66, 0.12, 'triangle', 0.06, 0.15);
    } else if (kind === 'stars_soft') {
        playTone(520, 0.07, 'sine', 0.045, 0);
        playTone(620, 0.08, 'sine', 0.045, 0.06);
    } else if (kind === 'prism_open') {
        playTone(440, 0.1, 'sine', 0.05, 0);
        playTone(554, 0.1, 'sine', 0.05, 0.09);
    } else if (kind === 'prism_pick') {
        playTone(720, 0.06, 'triangle', 0.04, 0);
    } else if (kind === 'prism_warn') {
        playTone(240, 0.1, 'square', 0.04, 0);
        playTone(210, 0.1, 'square', 0.04, 0.08);
    } else if (kind === 'prism_submit') {
        playTone(600, 0.08, 'triangle', 0.05, 0);
        playTone(760, 0.08, 'triangle', 0.05, 0.08);
        playTone(920, 0.12, 'triangle', 0.05, 0.16);
    } else if (kind === 'prism_back') {
        playTone(460, 0.08, 'sine', 0.04, 0);
    } else if (kind === 'prism_error') {
        playTone(180, 0.12, 'sawtooth', 0.05, 0);
        playTone(150, 0.12, 'sawtooth', 0.05, 0.1);
    }
}

function stopOpeningMusic(resetToStart = false) {
    const track = audioState.openingTrack;
    if (!track) return;
    if (!track.paused) track.pause();
    if (resetToStart) track.currentTime = 0;
    updateMusicToggleButtonUI();
}

// Play opening track once on first entry, or manually via the music button.
async function playOpeningMusic({ force = false, markFirstEntry = false } = {}) {
    if ((audioState.muted && !force) || (audioState.openingPlayed && !force)) return false;
    try {
        const track = ensureOpeningTrack();
        if (!track) return false;
        track.currentTime = 0;
        await track.play();
        audioState.openingPlayed = true;
        if (markFirstEntry) {
            audioState.firstEntryDone = true;
            localStorage.setItem(OPENING_TRACK_FIRST_ENTRY_KEY, 'true');
        }
        updateMusicToggleButtonUI();
        return true;
    } catch (e) {
        // Autoplay may fail until the first user interaction.
        updateMusicToggleButtonUI();
        return false;
    }
}

function setupOpeningMusicOnFirstEntry() {
    if (audioState.firstEntryDone || audioState.muted) {
        updateMusicToggleButtonUI();
        return;
    }

    const onFirstInteraction = () => {
        ensureAudioContext();
        playOpeningMusic({ markFirstEntry: true });
    };

    // Browsers may block autoplay until the first user interaction.
    document.addEventListener('pointerdown', onFirstInteraction, { once: true });

    playOpeningMusic({ markFirstEntry: true }).then((started) => {
        if (started) {
            document.removeEventListener('pointerdown', onFirstInteraction);
        }
    });
}

// Hide Splash Screen
function hideSplashScreen() {
    const splashScreen = document.getElementById('splash-screen');
    if (!splashScreen) return;

    if (document.body.classList.contains('embed-mode')) {
        splashScreen.classList.add('hidden');
        splashScreen.style.pointerEvents = 'none';
        splashScreen.style.display = 'none';
        return;
    }

    // The animation handles the fade out after 3 seconds
    // Just ensure it's hidden after animation
    setTimeout(() => {
        if (splashScreen) {
            splashScreen.classList.add('hidden');
            splashScreen.style.pointerEvents = 'none'; // Ensure clicks pass through
        }
    }, 3600);
}

function applyViewModeOverride() {
    const params = new URLSearchParams(window.location.search);
    const viewMode = String(params.get('view') || params.get('layout') || '').trim().toLowerCase();
    if (!viewMode) return;

    const forceMobile = viewMode === 'mobile' || viewMode === 'm' || viewMode === 'phone';
    const forceDesktop = viewMode === 'desktop' || viewMode === 'd' || viewMode === 'pc';

    if (forceMobile) {
        document.body.classList.add('force-mobile-view');
        document.body.classList.remove('force-desktop-view');
    } else if (forceDesktop) {
        document.body.classList.add('force-desktop-view');
        document.body.classList.remove('force-mobile-view');
    }
}

function applyEmbeddedCompactMode() {
    let embedded = false;
    try {
        embedded = window.self !== window.top;
    } catch (error) {
        embedded = true;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('compact') === '1' || params.get('embed') === '1') {
        embedded = true;
    }

    const forceSimple = params.get('simple') === '1';
    const disableSimple = params.get('simple') === '0';
    const forceMobileView = document.body.classList.contains('force-mobile-view');
    const forceDesktopView = document.body.classList.contains('force-desktop-view');

    if (embedded) {
        document.body.classList.add('embed-mode');
    }

    if (forceSimple || ((embedded || forceMobileView) && !disableSimple && !forceDesktopView)) {
        document.body.classList.add('minimal-ui');
    }
}

function applyHeaderDensityPreference() {
    const params = new URLSearchParams(window.location.search);
    const forceFull = params.get('fullheader') === '1';
    const forceCompact = params.get('compactheader') === '1';
    const savedMode = (localStorage.getItem('header_density_v1') || 'compact').toLowerCase();

    let mode = savedMode === 'full' ? 'full' : 'compact';
    if (forceFull) mode = 'full';
    if (forceCompact) mode = 'compact';

    document.body.classList.toggle('compact-header', mode === 'compact');
    localStorage.setItem('header_density_v1', mode);
}

function normalizeRequestedTab(tabName = '') {
    const raw = String(tabName || '').trim();
    const key = raw.toLowerCase();
    if (!raw) return '';
    if (key === 'practice' || key === 'practice-question' || key === 'question') return 'practice-question';
    if (key === 'practice-radar' || key === 'radar' || key === 'meta-radar' || key === 'meta_radar') return 'practice-radar';
    if (key === 'practice-triples-radar' || key === 'triples-radar' || key === 'triples_radar' || key === 'breen-radar' || key === 'michael-breen') return 'practice-triples-radar';
    if (key === 'practice-wizard' || key === 'wizard' || key === 'sqhcel') return 'practice-wizard';
    if (key === 'practice-sentence-morpher' || key === 'sentence-morpher' || key === 'sentence_morpher' || key === 'live-sentence' || key === 'quantifier-morph') return 'practice-sentence-morpher';
    if (key === 'practice-verb-unzip' || key === 'verb-unzip' || key === 'unspecified-verb' || key === 'unzip') return 'practice-verb-unzip';
    return raw;
}

function persistPracticeTabPreference(tabName = '') {
    const normalized = normalizeRequestedTab(tabName);
    if (PRACTICE_TAB_IDS.includes(normalized)) {
        localStorage.setItem(PRACTICE_ACTIVE_TAB_STORAGE_KEY, normalized);
    }
}

function applyInitialTabPreference() {
    const params = new URLSearchParams(window.location.search);
    const requestedTab = normalizeRequestedTab(params.get('tab') || '');
    const savedPracticeTab = normalizeRequestedTab(localStorage.getItem(PRACTICE_ACTIVE_TAB_STORAGE_KEY) || '');
    const defaultEmbedTab = document.body.classList.contains('embed-mode') ? (savedPracticeTab || 'practice-question') : '';
    const targetTab = requestedTab || defaultEmbedTab;
    if (!targetTab || !document.getElementById(targetTab)) return;

    persistPracticeTabPreference(targetTab);
    navigateTo(targetTab);
    const mobileTabSelect = document.getElementById('mobile-tab-select');
    if (mobileTabSelect) mobileTabSelect.value = targetTab;
}

function setupMobileViewportSizing() {
    const setViewportHeight = () => {
        const height = window.innerHeight || document.documentElement.clientHeight || 0;
        if (height > 0) {
            document.documentElement.style.setProperty('--app-dvh', `${height}px`);
        }
    };

    setViewportHeight();
    window.addEventListener('resize', setViewportHeight, { passive: true });
    window.addEventListener('orientationchange', setViewportHeight, { passive: true });
}

const DEFAULT_SCREEN_READ_GUIDE = Object.freeze({
    logic: '׳”׳×׳¨׳’׳•׳ ׳‘׳ ׳•׳™ ׳׳׳׳˜׳” ׳׳׳¢׳׳”: ׳׳–׳”׳™׳ ׳”׳ ׳—׳” ׳¡׳׳•׳™׳”, ׳׳“׳™׳™׳§׳™׳ ׳©׳₪׳”, ׳•׳׳– ׳₪׳•׳¢׳׳™׳ ׳¦׳¢׳“ ׳§׳˜׳.',
    goal: '׳׳”׳—׳׳™׳£ ׳׳•׳˜׳•׳׳˜ ׳©׳ ׳”׳׳©׳׳”/׳‘׳׳‘׳•׳ ׳‘׳—׳©׳™׳‘׳” ׳₪׳¨׳§׳˜׳™׳× ׳©׳׳•׳‘׳™׳׳” ׳׳‘׳™׳¦׳•׳¢.',
    approach: '׳¢׳•׳‘׳“׳™׳ ׳׳׳˜: ׳§׳•׳¨׳׳™׳ ׳׳× ׳”׳”׳ ׳—׳™׳”, ׳¢׳•׳ ׳™׳ ׳§׳¦׳¨, ׳•׳‘׳•׳“׳§׳™׳ ׳”׳׳ ׳”׳×׳©׳•׳‘׳” ׳׳•׳‘׳™׳׳” ׳׳₪׳¢׳•׳׳” ׳‘׳¨׳•׳¨׳”.',
    expected: '׳‘׳¡׳™׳•׳ ׳”׳×׳¨׳’׳•׳ ׳×׳“׳¢/׳™ ׳׳–׳”׳•׳× ׳‘׳׳”׳™׳¨׳•׳× ׳׳™׳₪׳” ׳”׳׳©׳₪׳˜ ׳¢׳׳•׳, ׳׳©׳׳•׳ ׳©׳׳׳” ׳׳“׳•׳™׳§׳×, ׳•׳׳×׳¨׳’׳ ׳׳× ׳–׳” ׳׳¦׳¢׳“ ׳׳¢׳©׳™.',
    success: '׳×׳•׳›׳/׳™ ׳׳”׳¡׳‘׳™׳¨ ׳׳¢׳¦׳׳ ׳׳” ׳–׳™׳”׳™׳×, ׳׳׳” ׳‘׳—׳¨׳× ׳›׳, ׳•׳׳” ׳”׳¦׳¢׳“ ׳”׳‘׳ ׳©׳‘׳׳׳× ׳׳₪׳©׳¨ ׳׳‘׳¦׳¢.'
});

const SCREEN_READ_GUIDES = Object.freeze({
    home: Object.freeze({
        logic: '׳”׳׳¡׳ ׳׳¨׳›׳– ׳׳× ׳›׳ ׳׳¡׳׳•׳׳™ ׳”׳×׳¨׳’׳•׳ ׳‘׳׳§׳•׳ ׳׳—׳“ ׳›׳“׳™ ׳׳‘׳—׳•׳¨ ׳׳” ׳ ׳›׳•׳ ׳׳ ׳¢׳›׳©׳™׳•.',
        goal: '׳׳”׳×׳—׳™׳ ׳¢׳‘׳•׳“׳” ׳׳׳•׳§׳“׳× ׳‘׳׳™ ׳׳§׳₪׳•׳¥ ׳‘׳™׳ ׳›׳׳™׳.',
        approach: '׳‘׳—׳¨/׳™ ׳׳¡׳׳•׳ ׳׳—׳“, ׳¡׳™׳™׳/׳™ ׳׳•׳×׳•, ׳•׳׳– ׳—׳–׳•׳¨/׳™ ׳׳‘׳™׳× ׳׳׳¡׳׳•׳ ׳”׳‘׳.'
    }),
    'scenario-screen-home': Object.freeze({
        logic: '׳׳×׳¨׳’׳׳™׳ ׳׳¢׳‘׳¨ ׳׳׳©׳₪׳˜ ׳¢׳׳•׳ ׳׳×׳’׳•׳‘׳” ׳©׳׳§׳“׳׳× ׳₪׳¢׳•׳׳”.',
        goal: '׳׳”׳•׳¨׳™׳“ ׳׳©׳׳” ׳•׳׳”׳¢׳׳•׳× ׳‘׳”׳™׳¨׳•׳× ׳‘׳×׳•׳ ׳׳™׳ ׳˜׳¨׳׳§׳¦׳™׳” ׳׳׳™׳×׳™׳×.',
        approach: '׳”׳×׳—׳/׳™ ׳׳¡׳¦׳ ׳•׳×, ׳¢׳‘׳¨/׳™ ׳׳׳¡׳ ׳‘׳—׳™׳¨׳”, ׳•׳׳– ׳§׳‘׳/׳™ ׳׳©׳•׳‘ ׳•׳‘׳ ׳”/׳™ ׳₪׳™׳¨׳•׳§.'
    }),
    'scenario-screen-domain': Object.freeze({
        logic: '׳¡׳™׳ ׳•׳ ׳×׳—׳•׳ ׳•׳¨׳׳” ׳׳×׳׳™׳ ׳׳× ׳”׳¡׳¦׳ ׳•׳× ׳׳¢׳•׳׳¡ ׳”׳¨׳’׳©׳™ ׳•׳׳©׳׳‘ ׳”׳׳׳™׳“׳” ׳©׳׳.',
        goal: '׳׳×׳¨׳’׳ ׳‘׳“׳™׳•׳§ ׳‘׳¨׳׳× ׳§׳•׳©׳™ ׳ ׳›׳•׳ ׳”.',
        approach: '׳‘׳—׳¨/׳™ ׳×׳—׳•׳, ׳¨׳׳” ׳•׳›׳׳•׳× ׳¡׳¦׳ ׳•׳× ׳•׳׳– ׳”׳×׳—׳/׳™ ׳¨׳™׳¦׳” ׳¨׳¦׳™׳₪׳”.'
    }),
    'scenario-screen-play': Object.freeze({
        logic: '׳›׳ ׳¡׳¦׳ ׳” ׳׳¦׳™׳’׳” ׳׳©׳₪׳˜ ׳׳-׳׳₪׳•׳¨׳© ׳•׳“׳•׳¨׳©׳× ׳‘׳—׳™׳¨׳” ׳‘׳™׳ ׳×׳’׳•׳‘׳” ׳׳“׳•׳׳” ׳׳™׳¨׳•׳§׳”.',
        goal: '׳׳–׳”׳•׳× ׳׳”׳¨ ׳׳” ׳×׳•׳§׳¢ ׳•׳׳” ׳׳§׳“׳.',
        approach: '׳§׳¨׳/׳™ ׳׳× ׳”׳¡׳™׳₪׳•׳¨, ׳¡׳׳/׳™ ׳×׳’׳•׳‘׳” ׳׳—׳×, ׳•׳©׳™׳/׳™ ׳׳‘ ׳׳”׳©׳₪׳¢׳” ׳©׳׳”.'
    }),
    'scenario-screen-feedback': Object.freeze({
        logic: '׳”׳׳©׳•׳‘ ׳׳—׳‘׳¨ ׳‘׳™׳ ׳‘׳—׳™׳¨׳” ׳׳‘׳™׳ ׳×׳•׳¦׳׳” ׳׳™׳™׳“׳™׳× ׳•׳׳ ׳¨׳§ "׳ ׳›׳•׳/׳׳ ׳ ׳›׳•׳".',
        goal: '׳׳‘׳ ׳•׳× ׳׳™׳ ׳˜׳•׳׳™׳¦׳™׳” ׳©׳ ׳¡׳™׳‘׳”-׳×׳•׳¦׳׳” ׳‘׳©׳™׳—׳”.',
        approach: '׳§׳¨׳/׳™ ׳׳× ׳”׳”׳¡׳‘׳¨ ׳¢׳“ ׳”׳¡׳•׳£ ׳•׳¨׳§ ׳׳– ׳”׳×׳§׳“׳/׳™ ׳׳₪׳™׳¨׳•׳§.'
    }),
    'scenario-screen-blueprint': Object.freeze({
        logic: '׳׳—׳¨׳™ ׳‘׳—׳™׳¨׳” ׳˜׳•׳‘׳” ׳׳₪׳¨׳§׳™׳ ׳׳•׳×׳” ׳׳×׳•׳›׳ ׳™׳× ׳‘׳™׳¦׳•׳¢ ׳§׳¦׳¨׳” ׳•׳™׳©׳™׳׳”.',
        goal: '׳׳×׳¨׳’׳ ׳×׳•׳‘׳ ׳” ׳׳₪׳¢׳•׳׳” ׳©׳×׳•׳›׳/׳™ ׳׳‘׳¦׳¢ ׳‘׳¢׳•׳׳ ׳”׳׳׳™׳×׳™.',
        approach: '׳”׳×׳׳§׳“/׳™ ׳‘׳¦׳¢׳“ ׳¨׳׳©׳•׳, ׳ ׳§׳•׳“׳× ׳×׳§׳™׳¢׳” ׳•-Plan B ׳‘׳¨׳•׳¨.'
    }),
    'scenario-screen-score': Object.freeze({
        logic: '׳¡׳™׳›׳•׳ ׳”׳¡׳¦׳ ׳” ׳ ׳•׳¢׳“ ׳׳§׳‘׳¢ ׳“׳₪׳•׳¡ ׳—׳©׳™׳‘׳” ׳׳₪׳ ׳™ ׳׳¢׳‘׳¨ ׳׳¡׳¦׳ ׳” ׳”׳‘׳׳”.',
        goal: '׳׳”׳₪׳•׳ ׳©׳™׳₪׳•׳¨ ׳¨׳’׳¢׳™ ׳׳”׳¨׳’׳.',
        approach: '׳§׳¨׳/׳™ ׳׳× ׳”׳׳©׳₪׳˜ ׳”׳™׳¨׳•׳§ ׳”׳‘׳ ׳•׳”׳—׳׳™׳˜/׳™ ׳׳ ׳׳׳©׳™׳›׳™׳ ׳׳• ׳׳¡׳™׳™׳׳™׳ ׳¡׳©׳.'
    }),
    'scenario-screen-history': Object.freeze({
        logic: '׳”׳™׳¡׳˜׳•׳¨׳™׳” ׳—׳•׳©׳₪׳× ׳׳’׳׳•׳× ׳•׳׳ ׳¨׳§ ׳”׳¦׳׳—׳” ׳ ׳§׳•׳“׳×׳™׳×.',
        goal: '׳׳¨׳׳•׳× ׳׳™׳₪׳” ׳™׳© ׳©׳™׳₪׳•׳¨ ׳¢׳§׳‘׳™ ׳•׳׳™׳₪׳” ׳¢׳“׳™׳™׳ ׳ ׳×׳§׳¢׳™׳.',
        approach: '׳¡׳§׳•׳¨/׳™ ׳¨׳©׳•׳׳•׳× ׳§׳¦׳¨׳•׳×, ׳•׳׳– ׳”׳—׳׳˜/׳™ ׳¢׳ ׳׳•׳§׳“ ׳×׳¨׳’׳•׳ ׳”׳‘׳.'
    }),
    'scenario-screen-settings': Object.freeze({
        logic: '׳”׳’׳“׳¨׳•׳× ׳©׳•׳׳¨׳•׳× ׳‘׳¨׳™׳¨׳× ׳׳—׳“׳ ׳›׳“׳™ ׳׳—׳¡׳•׳ ׳—׳™׳›׳•׳ ׳‘׳›׳ ׳›׳ ׳™׳¡׳” ׳׳—׳“׳©.',
        goal: '׳׳”׳×׳—׳™׳ ׳×׳¨׳’׳•׳ ׳׳”׳¨ ׳¢׳ ׳₪׳—׳•׳× ׳§׳׳™׳§׳™׳.',
        approach: '׳§׳‘׳¢/׳™ ׳×׳—׳•׳, ׳¨׳׳” ׳•׳”׳¢׳“׳₪׳•׳× ׳¡׳׳•׳ ׳“/׳₪׳¨׳™׳–׳׳” ׳׳₪׳™ ׳׳™׳ ׳©׳ ׳•׳— ׳׳.'
    }),
    'comic-engine': Object.freeze({
        logic: '׳”׳–׳¨׳™׳׳” ׳׳“׳׳” ׳“׳™׳׳׳•׳’ ׳׳׳™׳×׳™: ׳‘׳—׳™׳¨׳”, ׳×׳’׳•׳‘׳× ׳ ׳’׳“, ׳ ׳™׳¡׳•׳— ׳׳—׳“׳© ׳•׳₪׳™׳¨׳•׳§.',
        goal: '׳׳׳׳•׳“ ׳×׳’׳•׳‘׳” ׳׳“׳•׳™׳§׳× ׳×׳—׳× ׳׳—׳¥ ׳©׳™׳—.',
        approach: '׳‘׳—׳¨/׳™ ׳×׳’׳•׳‘׳”, ׳׳©׳¨/׳™ ׳ ׳™׳¡׳•׳— ׳§׳¦׳¨, ׳•׳׳– ׳₪׳×׳—/׳™ Power Card ׳•-Blueprint.'
    }),
    prismlab: Object.freeze({
        logic: '׳”׳׳™׳₪׳•׳™ ׳‘׳•׳“׳§ ׳‘׳׳™׳–׳• ׳¨׳׳” ׳׳•׳’׳™׳× ׳™׳•׳©׳‘׳× ׳”׳‘׳¢׳™׳” ׳›׳“׳™ ׳׳‘׳—׳•׳¨ Pivot ׳ ׳›׳•׳.',
        goal: '׳׳”׳₪׳¡׳™׳§ ׳׳˜׳₪׳ ׳‘׳¡׳™׳׳₪׳˜׳•׳ ׳•׳׳₪׳’׳•׳¢ ׳‘׳©׳•׳¨׳©.',
        approach: '׳׳׳/׳™ ׳×׳©׳•׳‘׳•׳× ׳׳›׳ ׳¨׳׳”, ׳׳©׳¨/׳™ ׳׳™׳₪׳•׳™ ׳•׳§׳¨׳/׳™ ׳׳× ׳”׳”׳׳׳¦׳” ׳”׳׳¢׳©׳™׳×.'
    }),
    categories: Object.freeze({
        logic: '׳–׳”׳• ׳׳¡׳ ׳™׳“׳¢: ׳׳—׳™׳§׳”, ׳¢׳™׳•׳•׳× ׳•׳”׳›׳׳׳” ׳›׳׳₪׳× ׳ ׳™׳•׳•׳˜ ׳׳×׳¨׳’׳•׳.',
        goal: '׳׳–׳”׳•׳× ׳׳”׳¨ ׳׳™׳–׳” ׳¡׳•׳’ ׳”׳₪׳¨׳” ׳׳•׳₪׳™׳¢ ׳‘׳׳©׳₪׳˜.',
        approach: '׳¢׳‘׳•׳¨/׳™ ׳¢׳ ׳”׳“׳•׳’׳׳׳•׳× ׳•׳׳– ׳—׳–׳•׳¨/׳™ ׳׳׳¡׳ ׳×׳¨׳’׳•׳ ׳׳¢׳©׳™.'
    }),
    practice: Object.freeze({
        logic: '׳׳¡׳ ׳”׳×׳¨׳’׳•׳ ׳₪׳•׳¦׳ ׳-5 ׳“׳₪׳™׳: ׳©׳׳׳•׳×, Meta Radar, ׳›׳׳×׳™׳ ׳ ׳¡׳×׳¨׳™׳, ׳׳©׳₪׳˜ ׳—׳™, ׳•׳₪׳•׳¢׳ ׳׳ ׳׳₪׳•׳¨׳˜.',
        goal: '׳׳¢׳‘׳•׳“ ׳‘׳¦׳•׳¨׳” ׳׳׳•׳§׳“׳× - ׳›׳ ׳₪׳¢׳ ׳׳™׳•׳׳ ׳•׳× ׳׳—׳×.',
        approach: '׳‘׳—׳¨/׳™ ׳“׳£ ׳׳—׳“, ׳¡׳™׳™׳/׳™ ׳¡׳‘׳‘ ׳§׳¦׳¨, ׳•׳¨׳§ ׳׳– ׳¢׳‘׳¨/׳™ ׳׳“׳£ ׳”׳‘׳.'
    }),
        'practice-triples-radar': Object.freeze({
        logic: 'זהו אימון זיהוי בתוך טבלת השלשות של מייקל ברין: 5 שורות, 15 קטגוריות.',
        goal: 'לפגוע בקטגוריה המדויקת או לפחות לזהות נכון את השלשה.',
        approach: 'קרא/י משפט מטופל, בחר/י קטגוריה אחת וקבל/י משוב מדורג.',
        success: 'הצלחה = יותר דיוק בפחות ניסיונות ושיפור קבוע בזיהוי שורה וקטגוריה.'
    }),    'practice-radar': Object.freeze({
        logic: '׳”׳“׳£ ׳”׳–׳” ׳׳׳׳ ׳–׳™׳”׳•׳™ ׳×׳‘׳ ׳™׳•׳× ׳‘׳–׳׳ ׳׳׳× ׳¢׳ ׳׳—׳¥ ׳–׳׳.',
        goal: '׳׳—׳–׳§ ׳¨׳₪׳׳§׳¡ ׳“׳™׳•׳§ ׳׳”׳™׳¨ ׳‘׳׳•׳ ׳•׳׳•׳’ ׳—׳™.',
        approach: '׳¨׳׳”/׳™ ׳׳× ׳”׳”׳™׳™׳׳™׳™׳˜, ׳‘׳—׳¨/׳™ ׳×׳‘׳ ׳™׳× ׳‘׳׳”׳™׳¨׳•׳×, ׳•׳‘׳“׳•׳§/׳™ ׳׳” ׳׳×׳§׳ ׳‘׳¡׳™׳›׳•׳.'
    }),
    'practice-triples-radar': Object.freeze({
        logic: '׳”׳“׳£ ׳”׳–׳” ׳׳׳׳ ׳–׳™׳”׳•׳™ ׳׳×׳•׳ ׳˜׳‘׳׳× ׳׳™׳™׳§׳ ׳‘׳¨׳™׳: 5 ׳©׳׳©׳•׳×, 15 ׳§׳˜׳’׳•׳¨׳™׳•׳×.',
        goal: '׳׳₪׳’׳•׳¢ ׳‘׳§׳˜׳’׳•׳¨׳™׳” ׳”׳׳“׳•׳™׳§׳× ׳׳• ׳׳₪׳—׳•׳× ׳׳–׳”׳•׳× ׳׳× ׳”׳©׳׳©׳” ׳”׳ ׳›׳•׳ ׳”.',
        approach: '׳§׳¨׳/׳™ ׳׳©׳₪׳˜, ׳‘׳—׳¨/׳™ ׳§׳˜׳’׳•׳¨׳™׳”, ׳•׳§׳‘׳/׳™ ׳׳©׳•׳‘ ׳׳“׳•׳¨׳’: ׳׳“׳•׳™׳§/׳§׳¨׳•׳‘/׳©׳’׳•׳™.'
    }),
    'practice-wizard': Object.freeze({
        logic: '׳”׳“׳£ ׳”׳–׳” ׳׳׳׳ ׳¢׳‘׳•׳“׳” ׳‘׳©׳›׳‘׳•׳× ׳§׳‘׳•׳¢׳•׳×: ׳—׳•׳¥, ׳₪׳ ׳™׳, ׳•׳›׳׳×׳™׳ ׳ ׳¡׳×׳¨׳™׳.',
        goal: '׳׳‘׳ ׳•׳× ׳׳©׳₪׳˜ ׳׳’׳©׳¨ ׳׳“׳•׳™׳§ ׳׳₪׳ ׳™ ׳‘׳—׳™׳¨׳× PATH.',
        approach: '׳¢׳‘׳•׳“/׳™ ׳‘׳¡׳“׳¨ ׳§׳‘׳•׳¢: S -> Q -> H -> C -> PATH -> E/L, ׳•׳‘׳›׳ ׳©׳׳‘ ׳‘׳“׳•׳§/׳™ ׳׳™׳–׳• ׳©׳›׳‘׳” ׳ ׳“׳׳§׳×.'
    }),
    'practice-sentence-morpher': Object.freeze({
        logic: '׳”׳“׳£ ׳”׳–׳” ׳׳׳׳ ׳”׳–׳¨׳§׳× ׳›׳׳×׳™׳ ׳•׳×׳ ׳׳™׳ ׳׳׳©׳₪׳˜ ׳‘׳¡׳™׳¡׳™ ׳‘׳–׳׳ ׳׳׳×.',
        goal: '׳׳—׳©׳•׳£ ׳›׳׳×׳™׳ ׳ ׳¡׳×׳¨׳™׳ ׳•׳׳¨׳׳•׳× ׳׳™׳“ ׳׳™׳ ׳”׳ ׳׳©׳ ׳™׳ ׳׳× ׳”׳׳©׳₪׳˜ ׳”׳’׳“׳•׳.',
        approach: '׳‘׳—׳¨/׳™ ׳¦׳³׳™׳₪׳™׳ ׳׳₪׳™ ׳¦׳™׳¨׳™׳, ׳¢׳§׳•׳‘/׳™ ׳׳—׳¨׳™ ׳”׳׳©׳₪׳˜ ׳”׳—׳™, ׳•׳—׳“׳“/׳™ ׳׳× ׳”׳ ׳™׳¡׳•׳—.'
    }),
    'practice-verb-unzip': Object.freeze({
        logic: '׳”׳“׳£ ׳”׳–׳” ׳׳׳׳ ׳₪׳™׳¨׳•׳§ ׳₪׳•׳¢׳ ׳׳ ׳׳₪׳•׳¨׳˜ ׳‘׳׳׳¦׳¢׳•׳× 15 ׳©׳׳׳•׳× ׳§׳‘׳•׳¢׳•׳× ׳•׳’׳¨׳™׳¨׳” ׳׳¡׳›׳׳” ׳§׳©׳™׳—׳”.',
        goal: '׳׳×׳¨׳’׳ ׳׳™׳׳” ׳“׳—׳•׳¡׳” ׳׳×׳”׳׳™׳ ׳׳₪׳•׳¨׳˜, ׳›׳•׳׳ ׳˜׳¨׳™׳’׳¨, ׳¦׳¢׳“׳™׳, ׳¢׳¨׳, ׳§׳¨׳™׳˜׳¨׳™׳•׳ ׳¡׳™׳•׳ ׳•׳—׳¨׳™׳’׳™׳.',
        approach: '׳©׳׳/׳™ ׳©׳׳׳”, ׳’׳¨׳•׳¨/׳™ ׳׳× ׳”׳×׳©׳•׳‘׳” ׳׳׳§׳•׳ ׳”׳ ׳›׳•׳, ׳•׳§׳‘׳/׳™ X ׳׳“׳•׳ ׳׳ ׳˜׳¢׳™׳×. ׳׳¡׳™׳™׳׳™׳ ׳¨׳§ ׳›׳©׳”׳¡׳›׳׳” ׳׳׳׳” ׳•׳׳– ׳§׳•׳¨׳׳™׳ ׳¡׳™׳›׳•׳.'
    }),
    blueprint: Object.freeze({
        logic: '׳”׳׳¡׳ ׳׳₪׳¨׳§ ׳׳©׳™׳׳” ׳¢׳׳•׳׳” ׳׳™׳¢׳“, ׳¦׳¢׳“׳™׳, ׳₪׳¢׳¨ ׳¦׳™׳₪׳™׳•׳× ׳•׳×׳•׳›׳ ׳™׳× ׳‘׳™׳¦׳•׳¢.',
        goal: '׳׳¢׳‘׳•׳¨ ׳"׳¦׳¨׳™׳ ׳׳¢׳©׳•׳×" ׳"׳׳” ׳¢׳•׳©׳™׳ ׳¢׳›׳©׳™׳•".',
        approach: '׳”׳×׳§׳“׳/׳™ ׳¦׳¢׳“-׳¦׳¢׳“, ׳׳׳/׳™ ׳¨׳§ ׳׳” ׳©׳¦׳¨׳™׳, ׳•׳•׳“׳/׳™ ׳©׳™׳© ׳¦׳¢׳“ ׳¨׳׳©׳•׳ ׳‘׳¨׳•׳¨.'
    }),
    about: Object.freeze({
        logic: '׳”׳׳¡׳ ׳׳¡׳‘׳™׳¨ ׳׳× ׳”׳¨׳§׳¢ ׳”׳׳×׳•׳“׳•׳׳•׳’׳™ ׳•׳׳× ׳׳§׳•׳¨ ׳”׳›׳׳™׳ ׳‘׳₪׳¨׳•׳™׳§׳˜.',
        goal: '׳׳—׳‘׳¨ ׳‘׳™׳ ׳”׳×׳¨׳’׳•׳ ׳׳‘׳™׳ ׳¢׳§׳¨׳•׳ ׳•׳× ׳”-NLP ׳©׳׳׳—׳•׳¨׳™׳•.',
        approach: '׳§׳¨׳/׳™ ׳‘׳§׳¦׳¨׳” ׳•׳—׳–׳•׳¨/׳™ ׳׳׳¡׳›׳™ ׳”׳×׳¨׳’׳•׳ ׳׳™׳™׳©׳•׳ ׳‘׳₪׳•׳¢׳.'
    })
});

const SCREEN_READ_GUIDE_TARGET_IDS = Object.freeze([
    'home',
    'scenario-screen-home',
    'scenario-screen-domain',
    'scenario-screen-play',
    'scenario-screen-feedback',
    'scenario-screen-blueprint',
    'scenario-screen-score',
    'scenario-screen-history',
    'scenario-screen-settings',
    'comic-engine',
    'prismlab',
    'categories',
    'practice-question',
    'practice-radar',
    'practice-triples-radar',
    'practice-wizard',
    'practice-sentence-morpher',
    'practice-verb-unzip',
    'blueprint',
    'about'
]);

const SCREEN_READ_GUIDE_OVERRIDES = Object.freeze({
    'scenario-screen-play': Object.freeze({
        logic: '׳׳×׳” ׳¨׳•׳׳” ׳¡׳¦׳ ׳” ׳׳׳™׳×׳™׳× ׳¢׳ ׳₪׳•׳¢׳ ׳¢׳׳•׳. ׳›׳׳ ׳‘׳•׳“׳§׳™׳ ׳׳™׳–׳• ׳×׳’׳•׳‘׳” ׳©׳ ׳׳˜׳₪׳ ׳׳§׳“׳׳× ׳×׳”׳׳™׳.',
        goal: '׳׳‘׳—׳•׳¨ ׳×׳’׳•׳‘׳” ׳©׳׳™׳™׳¦׳¨׳× ׳‘׳”׳™׳¨׳•׳×, ׳¦׳¢׳“ ׳¨׳׳©׳•׳ ׳•׳×׳—׳•׳©׳× ׳›׳™׳•׳•׳.',
        approach: '׳§׳¨׳/׳™ ׳׳× ׳”׳¡׳™׳₪׳•׳¨, ׳‘׳—׳¨/׳™ ׳×׳’׳•׳‘׳” ׳׳—׳×, ׳•׳׳– ׳”׳׳©׳/׳™ ׳׳׳©׳•׳‘.',
        success: '׳”׳¦׳׳—׳” = ׳‘׳—׳¨׳× ׳×׳’׳•׳‘׳” ׳™׳¨׳•׳§׳” ׳©׳׳₪׳¨׳§׳× ׳׳× ׳”׳‘׳¢׳™׳” ׳׳¦׳¢׳“ ׳‘׳™׳¦׳•׳¢.'
    }),
    'scenario-screen-feedback': Object.freeze({
        logic: '׳”׳׳¡׳ ׳”׳–׳” ׳׳¡׳‘׳™׳¨ ׳׳” ׳§׳¨׳” ׳‘׳’׳׳ ׳”׳‘׳—׳™׳¨׳” ׳©׳׳, ׳•׳׳ ׳¨׳§ ׳ ׳›׳•׳/׳׳ ׳ ׳›׳•׳.',
        goal: '׳׳”׳‘׳™׳ ׳׳׳” ׳×׳’׳•׳‘׳” ׳׳—׳× ׳¡׳•׳’׳¨׳× ׳©׳™׳—׳” ׳•׳×׳’׳•׳‘׳” ׳׳—׳¨׳× ׳₪׳•׳×׳—׳× ׳×׳”׳׳™׳.',
        approach: '׳§׳¨׳/׳™ ׳׳× ׳”׳”׳©׳₪׳¢׳” ׳”׳׳™׳™׳“׳™׳× ׳•׳׳– ׳׳—׳¥/׳™ "׳”׳¨׳׳” ׳׳× ׳”׳₪׳™׳¨׳•׳§".',
        success: '׳”׳¦׳׳—׳” = ׳׳₪׳©׳¨ ׳׳”׳¡׳‘׳™׳¨ ׳׳” ׳™׳§׳¨׳” ׳׳™׳“ ׳׳—׳¨׳™ ׳”׳×׳’׳•׳‘׳” ׳©׳‘׳—׳¨׳×.'
    }),
    'scenario-screen-blueprint': Object.freeze({
        logic: '׳›׳׳ ׳”׳•׳₪׳›׳™׳ ׳׳©׳₪׳˜ ׳׳-׳׳₪׳•׳¨׳˜ ׳׳׳₪׳× ׳₪׳¢׳•׳׳” ׳‘׳¨׳•׳¨׳” ׳׳₪׳™ TOTE.',
        goal: '׳׳¦׳׳× ׳׳×׳§׳™׳¢׳•׳× ׳¢׳ ׳¦׳¢׳“ ׳¨׳׳©׳•׳ ׳׳“׳™׳“ ׳•-Plan B.',
        approach: '׳¢׳‘׳¨/׳™ ׳¢׳ 9 ׳”׳¡׳׳•׳˜׳™׳, ׳§׳¨׳/׳™ ׳׳× ׳©׳׳׳•׳× ׳”׳”׳©׳׳׳”, ׳•׳¡׳™׳™׳/׳™ ׳‘׳¡׳™׳›׳•׳ ׳§׳¦׳¨.',
        success: '׳”׳¦׳׳—׳” = ׳™׳© ׳˜׳¨׳™׳’׳¨ ׳‘׳¨׳•׳¨, ׳©׳׳‘׳™ ׳₪׳¢׳•׳׳”, ׳—׳¡׳, ׳•׳§׳¨׳™׳˜׳¨׳™׳•׳ ׳™׳¦׳™׳׳”.'
    }),
        'practice-triples-radar': Object.freeze({
        logic: 'זהו אימון זיהוי בתוך טבלת השלשות של מייקל ברין: 5 שורות, 15 קטגוריות.',
        goal: 'לפגוע בקטגוריה המדויקת או לפחות לזהות נכון את השלשה.',
        approach: 'קרא/י משפט מטופל, בחר/י קטגוריה אחת וקבל/י משוב מדורג.',
        success: 'הצלחה = יותר דיוק בפחות ניסיונות ושיפור קבוע בזיהוי שורה וקטגוריה.'
    }),
    'practice-wizard': Object.freeze({
        logic: '׳‘׳׳¡׳ ׳”׳–׳” ׳¢׳•׳‘׳“׳™׳ ׳¢׳ 3 ׳©׳›׳‘׳•׳×: ׳₪׳ ׳™׳, ׳—׳•׳¥, ׳•׳”׳׳₪׳” ׳”׳׳“׳•׳‘׳¨׳×; ׳§׳•׳“׳ ׳”׳׳™׳׳”, ׳׳—׳¨ ׳›׳ ׳‘׳“׳™׳§׳× ׳׳¦׳™׳׳•׳×.',
        goal: '׳׳”׳₪׳•׳ "׳׳ ׳׳©׳ ׳” ׳׳”" ׳׳׳₪׳” ׳׳™׳ ׳˜׳’׳¨׳˜׳™׳‘׳™׳× ׳©׳׳—׳–׳™׳§׳” ׳’׳ ׳—׳•׳¥ ׳•׳’׳ ׳₪׳ ׳™׳.',
        approach: 'S ׳×׳—׳•׳©׳” ג†’ Q ׳×׳₪׳¨׳™׳˜ ׳˜׳•׳˜׳׳׳™׳•׳× ג†’ H ׳•׳׳™׳“׳¦׳™׳” ׳׳׳׳” ג†’ C Filter/Paradox + ׳׳™׳ ׳˜׳’׳¨׳¦׳™׳” ג†’ PATH.',
        success: '׳”׳¦׳׳—׳” = ׳׳©׳₪׳˜ ׳׳™׳ ׳˜׳’׳¨׳˜׳™׳‘׳™ ׳‘׳׳™ "׳׳‘׳", ׳•׳׳– ׳‘׳—׳™׳¨׳× ׳›׳™׳•׳•׳ ׳¢׳‘׳•׳“׳” (׳—׳•׳¥/׳₪׳ ׳™׳/׳’׳©׳¨).'
    }),
    'practice-sentence-morpher': Object.freeze({
        logic: '׳›׳׳ ׳׳ ׳₪׳•׳×׳¨׳™׳ ׳׳× ׳›׳ ׳”׳˜׳™׳₪׳•׳, ׳׳׳ ׳׳׳׳ ׳™׳ ׳¨׳›׳™׳‘ ׳׳—׳“: ׳׳”׳₪׳•׳ ׳׳©׳₪׳˜ ׳‘׳¡׳™׳¡׳™ ׳׳׳₪׳” ׳—׳™׳” ׳¢׳ ׳›׳׳×׳™׳ ׳•׳×׳ ׳׳™׳.',
        goal: '׳׳–׳”׳•׳× ׳׳” ׳ ׳•׳¡׳£ ׳׳׳©׳₪׳˜ ׳›׳©׳‘׳•׳—׳¨׳™׳ ׳–׳׳/׳׳™׳׳™׳/׳₪׳¢׳•׳׳”/׳׳ ׳©׳™׳/׳”׳§׳©׳¨/׳¨׳’׳©.',
        approach: '׳‘׳—׳¨/׳™ ׳¦׳³׳™׳₪, ׳‘׳“׳•׳§/׳™ ׳׳× ׳”׳׳©׳₪׳˜ ׳”׳’׳“׳•׳, ׳•׳׳ ׳¦׳¨׳™׳ ׳—׳–׳•׳¨/׳™ ׳¦׳¢׳“ ׳׳• ׳׳₪׳¡/׳™.',
        success: '׳”׳¦׳׳—׳” = ׳”׳׳©׳₪׳˜ ׳”׳—׳™ ׳׳©׳§׳£ ׳‘׳¦׳•׳¨׳” ׳׳₪׳•׳¨׳©׳× ׳׳× ׳”׳›׳׳×׳™׳ ׳”׳¡׳׳•׳™׳™׳.'
    }),
    'practice-verb-unzip': Object.freeze({
        logic: '׳‘׳׳¡׳ ׳”׳–׳” ׳”׳׳˜׳₪׳ ׳©׳•׳׳ ׳©׳׳׳”, ׳”׳׳˜׳•׳₪׳ ׳¢׳•׳ ׳”, ׳•׳׳– ׳׳©׳‘׳¦׳™׳ ׳׳× ׳”׳×׳©׳•׳‘׳” ׳‘׳¡׳›׳׳”.',
        goal: '׳׳₪׳¨׳§ ׳₪׳•׳¢׳ ׳׳ ׳׳₪׳•׳¨׳˜ ׳׳×׳”׳׳™׳ ׳‘׳¨׳•׳¨: ׳”׳§׳©׳¨, ׳¦׳¢׳“׳™׳, ׳׳˜׳¨׳”, ׳¢׳¨׳ ׳•׳§׳¨׳™׳˜׳¨׳™׳•׳.',
        approach: '׳‘׳—׳¨ ׳©׳׳׳× ׳׳˜׳₪׳, ׳§׳‘׳ ׳×׳©׳•׳‘׳× ׳׳˜׳•׳₪׳, ׳•׳©׳‘׳¥ ׳׳•׳×׳” ׳׳¡׳׳•׳˜ ׳”׳׳×׳׳™׳.',
        success: '׳”׳¦׳׳—׳” = ׳›׳ ׳”׳¡׳׳•׳˜׳™׳ ׳©׳•׳™׳›׳• ׳ ׳›׳•׳ ׳•׳׳×׳” ׳™׳›׳•׳ ׳׳”׳¡׳‘׳™׳¨ ׳׳” ׳™׳“׳•׳¢ ׳•׳׳” ׳—׳¡׳¨.'
    })
});

const SCREEN_QUICK_GUIDE_STEPS = Object.freeze({
    'scenario-screen-play': Object.freeze([
        'קרא את הסצנה ואת הפועל הלא-מפורט.',
        'בחר תגובת מטפל אחת בלבד.',
        'בדוק במשוב אם התגובה מקדמת פירוק תהליך.'
    ]),
    'scenario-screen-feedback': Object.freeze([
        'קרא מה ההשפעה המיידית של הבחירה שלך.',
        'שים לב מה מקדם ומה מעכב בסצנה.',
        'לחץ "הראה את הפירוק" כדי לעבור למפה פרקטית.'
    ]),
    'scenario-screen-blueprint': Object.freeze([
        'קרא את מפת TOTE: טריגר, צעדים, חסם ויציאה.',
        'השתמש בשאלות ההשלמה כדי לדייק נקודות חסרות.',
        'סיים עם צעד ראשון קצר שאפשר לבצע בפועל.'
    ]),
    'practice-question': Object.freeze([
        'קרא את המשפט שמופיע בתיבה.',
        'כתוב שאלה אחת שמבררת מילה או הנחה עמומה.',
        'בחר קטגוריה ולחץ על "בדוק שאלה".'
    ]),
    'practice-triples-radar': Object.freeze([
        'קרא/י את משפט המטופל.',
        'בחר/י קטגוריה אחת מתוך 15 הקטגוריות.',
        'השתמש/י במשוב: מדויק, קרוב (אותה שלשה), או שורה שגויה.'
    ]),
    'practice-wizard': Object.freeze([
        'בחר תחושת גוף דומיננטית (S) וניסוח טוטאליות מדויק (Q).',
        'נסח ולידציה מלאה לחוויה לפני בדיקת עובדות (H).',
        'בנה משפט אינטגרטיבי בחוץ+פנים ורק אז בחר PATH.'
    ]),
    'practice-sentence-morpher': Object.freeze([
        'קרא את המשפט הגדול בתחילת המסך.',
        'בחר צ׳יפ אחד או יותר מהצירים שמתחת.',
        'בדוק איך המשפט מתעדכן בזמן אמת עם קטעי הכמתים.'
    ]),
    'practice-verb-unzip': Object.freeze([
        'בחר שאלת מטפל מהרשימה.',
        'קבל את תשובת המטופל שנוצרה.',
        'שבץ את תשובת המטופל בסלוט הנכון בלוח.'
    ])
});

function resolveScreenReadGuideCopy(screenId) {
    const base = SCREEN_READ_GUIDES[screenId] || DEFAULT_SCREEN_READ_GUIDE;
    const override = SCREEN_READ_GUIDE_OVERRIDES[screenId];
    return override ? { ...base, ...override } : base;
}

function getQuickGuideSteps(screenId) {
    return SCREEN_QUICK_GUIDE_STEPS[screenId] || [
        '׳§׳¨׳ ׳׳” ׳׳•׳¦׳’ ׳›׳¨׳’׳¢ ׳¢׳ ׳”׳׳¡׳.',
        '׳‘׳¦׳¢ ׳¦׳¢׳“ ׳׳—׳“ ׳‘׳¨׳•׳¨.',
        '׳‘׳“׳•׳§ ׳׳× ׳”׳׳©׳•׳‘ ׳•׳”׳׳©׳ ׳׳¦׳¢׳“ ׳”׳‘׳.'
    ];
}

function buildScreenReadGuide(screenId) {
    const copy = resolveScreenReadGuideCopy(screenId);
    const wrapper = document.createElement('div');
    wrapper.className = 'screen-read-guide';
    wrapper.dataset.screenGuide = screenId;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-primary screen-read-guide-btn';
    button.innerHTML =
        '<span class="screen-read-guide-btn-main">׳׳” ׳¢׳•׳©׳™׳ ׳›׳׳? (20 ׳©׳ ׳™׳•׳×)</span>' +
        '<span class="screen-read-guide-btn-sub">3 ׳¦׳¢׳“׳™׳ ׳‘׳¨׳•׳¨׳™׳ ׳׳”׳×׳—׳׳”</span>';

    const modal = document.createElement('div');
    const modalId = 'screen-read-guide-modal-' + screenId;
    modal.className = 'screen-read-guide-modal hidden';
    modal.id = modalId;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    button.setAttribute('aria-controls', modalId);
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-expanded', 'false');

    const title = getScreenReadGuideTitle(screenId);
    const success = copy.success || DEFAULT_SCREEN_READ_GUIDE.success;
    const steps = getQuickGuideSteps(screenId)
        .map((step) => '<li>' + escapeHtml(step) + '</li>')
        .join('');

    modal.innerHTML =
        '<div class="screen-read-guide-dialog">' +
            '<button type="button" class="screen-read-guide-close" aria-label="׳¡׳’׳™׳¨׳”">ֳ—</button>' +
            '<h3>׳”׳¡׳‘׳¨ ׳§׳¦׳¨: ' + escapeHtml(title) + '</h3>' +
            '<p class="screen-read-guide-lead">' + escapeHtml(copy.goal) + '</p>' +
            '<div class="screen-read-guide-content">' +
                '<h4>׳׳” ׳”׳¨׳¢׳™׳•׳?</h4>' +
                '<p>' + escapeHtml(copy.logic) + '</p>' +
                '<h4>׳׳™׳ ׳׳×׳—׳™׳׳™׳ ׳¢׳›׳©׳™׳•?</h4>' +
                '<ol class="screen-read-guide-steps">' + steps + '</ol>' +
                '<h4>׳׳” ׳ ׳—׳©׳‘ ׳˜׳•׳‘?</h4>' +
                '<p>' + escapeHtml(copy.approach) + '</p>' +
                '<p class="screen-read-guide-summary">' + escapeHtml(success) + '</p>' +
            '</div>' +
            '<div class="screen-read-guide-actions">' +
                '<button type="button" class="btn btn-primary screen-read-guide-confirm">׳”׳‘׳ ׳×׳™, ׳׳×׳—׳™׳׳™׳</button>' +
            '</div>' +
        '</div>';

    const closeBtn = modal.querySelector('.screen-read-guide-close');
    const confirmBtn = modal.querySelector('.screen-read-guide-confirm');
    const openModal = () => {
        modal.classList.remove('hidden');
        button.setAttribute('aria-expanded', 'true');
        document.body.classList.add('screen-guide-open');
        playUISound('hint');
    };
    const closeModal = () => {
        modal.classList.add('hidden');
        button.setAttribute('aria-expanded', 'false');
        if (!document.querySelector('.screen-read-guide-modal:not(.hidden)')) {
            document.body.classList.remove('screen-guide-open');
        }
    };

    button.addEventListener('click', openModal);
    closeBtn?.addEventListener('click', closeModal);
    confirmBtn?.addEventListener('click', closeModal);
    modal.addEventListener('click', (event) => {
        if (event.target === modal) closeModal();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
            closeModal();
        }
    });

    wrapper.appendChild(button);
    wrapper.appendChild(modal);
    return wrapper;
}

function getScreenReadGuideTitle(screenId) {
    const screen = document.getElementById(screenId);
    if (!screen) return '׳׳¡׳ ׳×׳¨׳’׳•׳';
    const heading = screen.querySelector('h2, h3');
    const title = heading?.textContent?.trim();
    return title || '׳׳¡׳ ׳×׳¨׳’׳•׳';
}

function setupReadBeforeStartGuides() {
    SCREEN_READ_GUIDE_TARGET_IDS.forEach((screenId) => {
        const screen = document.getElementById(screenId);
        if (!screen) return;
        if (screen.querySelector(`.screen-read-guide[data-screen-guide="${screenId}"]`)) return;
        screen.prepend(buildScreenReadGuide(screenId));
    });
}

function getVersionFromAppScriptQuery() {
    const appScript = document.querySelector('script[src*="js/app.js"]');
    const src = appScript?.getAttribute('src') || '';
    const match = src.match(/[?&]v=([^&]+)/i);
    return match ? decodeURIComponent(match[1]).trim() : '';
}

async function resolveAppVersion() {
    try {
        const response = await fetch('package.json', { cache: 'no-store' });
        if (response.ok) {
            const pkg = await response.json();
            const version = typeof pkg?.version === 'string' ? pkg.version.trim() : '';
            if (version) return version;
        }
    } catch (error) {
        console.warn('Could not read package.json version:', error);
    }

    return getVersionFromAppScriptQuery() || 'unknown';
}

function applyAppVersion(version) {
    const chip = document.getElementById('app-version-chip');
    if (chip) {
        chip.textContent = `׳’׳¨׳¡׳”: ${version}`;
        chip.setAttribute('title', `Build ${version}`);
    }

    const floating = document.getElementById('app-version-floating');
    if (floating) {
        floating.textContent = `v${version}`;
        floating.setAttribute('title', `Build ${version}`);
    }
}

async function setupAppVersionChip() {
    const hasChip = Boolean(document.getElementById('app-version-chip'));
    const hasFloating = Boolean(document.getElementById('app-version-floating'));
    if (!hasChip && !hasFloating) return;

    const immediateVersion = getVersionFromAppScriptQuery();
    if (immediateVersion) applyAppVersion(immediateVersion);

    const version = await resolveAppVersion();
    applyAppVersion(version);
}

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    setupAppVersionChip();
    setupMobileViewportSizing();
    applyViewModeOverride();
    applyEmbeddedCompactMode();
    applyHeaderDensityPreference();
    loadAudioSettings();
    setupAudioMuteButtons();
    setupMusicToggleButton();
    setupOpeningMusicOnFirstEntry();
    
    // Hide splash after animation
    hideSplashScreen();
    
    loadUserProgress();
    showLoadingIndicator();
    loadMetaModelData();
    setupTabNavigation();
    setupReadBeforeStartGuides();
    applyInitialTabPreference();
    setupGlobalComicStripActions();
    setupPracticeMode();
    setupQuestionDrill();
    setupRapidPatternArena();
    setupWrinkleGame();
    if (typeof setupSentenceMorpherDemo === 'function') {
        setupSentenceMorpherDemo();
    }
    if (typeof setupTriplesRadarModule === 'function') {
        setupTriplesRadarModule();
    }
    setupTrainerMode();
    setupBlueprintBuilder();
    setupPrismModule();
    setupScenarioTrainerModule();
    if (typeof setupLivingTriplesModule === 'function') {
        setupLivingTriplesModule();
    }
    setupComicEngine2();
    setupCommunityFeedbackWall();
    initializeProgressHub();
    renderGlobalComicStrip(getActiveTabName());
});

// Load Meta Model data from JSON
async function loadMetaModelData() {
    try {
        const response = await fetch('data/meta-model-violations.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        metaModelData = await response.json();
        
        // Populate categories
        populateCategories();
        
        // Populate category select in practice
        populateCategorySelect();
        
        // Initialize Prism Lab (after data loads)
        if (document.getElementById('prism-library')) {
            renderPrismLibrary();
        }
        
        hideLoadingIndicator();
    } catch (error) {
        console.error('Error loading data:', error);
        hideLoadingIndicator();
        showErrorMessage('׳©׳’׳™׳׳” ׳‘׳˜׳¢׳™׳ ׳× ׳”׳ ׳×׳•׳ ׳™׳');
    }
}

// Setup Tab Navigation
function setupTabNavigation() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const mobileTabSelect = document.getElementById('mobile-tab-select');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            
            // Add active class to clicked button
            btn.classList.add('active');
            
            // Show corresponding content
            const tabName = btn.getAttribute('data-tab');
            document.getElementById(tabName).classList.add('active');
            if (tabName !== 'practice-radar') {
                setRapidPatternFocusMode(false);
                hideRapidPatternExplanation({ resumeIfNeeded: false });
            }
            persistPracticeTabPreference(tabName);
            if (mobileTabSelect) mobileTabSelect.value = tabName;
            const scenarioContext = tabName === 'scenario-trainer' ? scenarioTrainer.activeScenario : null;
            closeComicPreviewModal();
            renderGlobalComicStrip(tabName, scenarioContext);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            playUISound('next');
        });
    });

    if (mobileTabSelect) {
        mobileTabSelect.innerHTML = Array.from(tabBtns)
            .map(btn => `<option value="${btn.getAttribute('data-tab')}">${btn.textContent.trim()}</option>`)
            .join('');

        const activeBtn = document.querySelector('.tab-btn.active');
        if (activeBtn) mobileTabSelect.value = activeBtn.getAttribute('data-tab');

        mobileTabSelect.addEventListener('change', () => {
            const targetTab = mobileTabSelect.value;
            const btn = document.querySelector(`.tab-btn[data-tab="${targetTab}"]`);
            if (btn) btn.click();
        });
    }
}

// Populate Categories Section
function populateCategories() {
    const container = document.getElementById('categories-container');
    container.innerHTML = '';
    
    metaModelData.categories.forEach(category => {
        const categoryCard = document.createElement('div');
        categoryCard.className = `category-card ${category.id}`;
        
        let subcategoriesHtml = '';
        category.subcategories.forEach(sub => {
            subcategoriesHtml += `
                <div class="subcategory-item">
                    <strong>${sub.hebrew}:</strong> ${sub.description}
                </div>
            `;
        });
        
        categoryCard.innerHTML = `
            <div class="category-icon">${category.icon}</div>
            <h3>${category.name}</h3>
            <p>${category.description}</p>
            <div class="subcategories">
                ${subcategoriesHtml}
            </div>
        `;
        
        container.appendChild(categoryCard);
    });
}

// Populate Category Select in Practice Mode
function populateCategorySelect() {
    const select = document.getElementById('category-select');
    
    metaModelData.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.hebrew_name;
        select.appendChild(option);
    });
}

function normalizePracticePageKey(pageKey = '') {
    const key = String(pageKey || '').trim().toLowerCase();
    if (key === 'meta-radar' || key === 'meta_radar') return 'radar';
    if (key === 'triples_radar' || key === 'breen-radar') return 'triples-radar';
    if (key === 'sqhcel' || key === 'wizard') return 'wizard';
    if (key === 'sentence_morpher' || key === 'live-sentence' || key === 'quantifier-morph') return 'sentence-morpher';
    if (key === 'question' || key === 'questions' || key === 'drill') return 'question';
    return PRACTICE_PAGE_KEYS.includes(key) ? key : 'question';
}

function getPracticeTabIdFromPageKey(pageKey = 'question') {
    const resolvedPage = normalizePracticePageKey(pageKey);
    return PRACTICE_TAB_BY_PAGE_KEY[resolvedPage] || PRACTICE_TAB_BY_PAGE_KEY.question;
}

function navigateToPracticePage(pageKey = 'question') {
    const targetTab = getPracticeTabIdFromPageKey(pageKey);
    persistPracticeTabPreference(targetTab);
    navigateTo(targetTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Setup Practice Mode
function setupPracticeMode() {
    const nextBtn = document.getElementById('next-btn');
    const showAnswerBtn = document.getElementById('show-answer-btn');
    const hintBtn = document.getElementById('hint-btn');

    // Legacy practice controls may not exist in the current UI.
    if (!nextBtn || !showAnswerBtn || !hintBtn) return;

    nextBtn.addEventListener('click', getNextStatement);
    showAnswerBtn.addEventListener('click', showAnswer);
    hintBtn.addEventListener('click', showLegacyPracticeHint);
}

const QUESTION_DRILL_PACK = [
    {
        id: 'question1',
        statement: '׳”׳‘׳•׳¡ ׳׳׳¨ ׳©׳”׳׳§׳•׳— ׳׳ ׳׳‘׳™׳ ׳׳׳” ׳–׳” ׳׳ ׳׳₪׳©׳¨׳™ ׳›׳¢׳×.',
        focus: ['DISTORTION']
    },
    {
        id: 'question2',
        statement: '׳׳ ׳™ ׳×׳׳™׳“ ׳׳׳—׳¨ ׳›׳™ ׳”׳¨׳‘׳” ׳¢׳•׳׳¡.',
        focus: ['GENERALIZATION']
    },
    {
        id: 'question3',
        statement: '׳”׳ ׳©׳•׳׳׳™׳ ׳׳•׳×׳™ ׳׳” ׳‘׳“׳™׳•׳§ ׳—׳¡׳¨.',
        focus: ['DELETION']
    },
    {
        id: 'question4',
        statement: '׳›׳•׳׳ ׳׳•׳׳¨׳™׳ ׳©׳–׳” ׳׳ ׳¢׳•׳׳“ ׳׳”׳©׳×׳ ׳•׳×.',
        focus: ['GENERALIZATION']
    },
    {
        id: 'question5',
        statement: '׳”׳ ׳˜׳•׳¢׳ ׳™׳ ׳©׳›׳‘׳¨ ׳ ׳™׳¡׳• ׳”׳›׳ ׳¢׳ ׳¡׳׳ ׳”׳¨׳’׳©׳”.',
        focus: ['DISTORTION']
    }
];

const QUESTION_DRILL_KEYWORDS = {
    DELETION: ['׳׳”', '׳׳™׳', '׳׳™׳–׳”', '׳׳™', '׳”׳׳', '׳׳׳”', '׳›׳׳”'],
    DISTORTION: ['׳”׳׳ ׳–׳” ׳׳•׳׳¨', '׳׳₪׳™ ׳׳”', '׳׳™׳ ׳׳×׳” ׳™׳•׳“׳¢', '׳–׳” ׳‘׳˜׳•׳—', '׳׳׳” ׳׳×׳” ׳׳¡׳™׳§', '׳׳₪׳™ ׳”׳”׳¨׳’׳©׳”'],
    GENERALIZATION: ['׳×׳׳™׳“', '׳›׳ ׳׳—׳“', '׳›׳•׳׳', '׳׳¢׳•׳׳', '׳׳™׳', '׳×׳׳™׳“', '׳›׳', '׳›׳ ׳”׳–׳׳']
};

const QUESTION_DRILL_CATEGORY_LABELS_HE = Object.freeze({
    DELETION: '׳׳—׳™׳§׳”',
    DISTORTION: '׳¢׳™׳•׳•׳×',
    GENERALIZATION: '׳”׳›׳׳׳”'
});

const questionDrillState = {
    current: null,
    attempts: 0,
    hits: 0,
    elements: {}
};

function setupQuestionDrill() {
    const drillRoot = document.getElementById('question-drill');
    if (!drillRoot) return;

    questionDrillState.elements = {
        statement: document.getElementById('question-drill-statement'),
        input: document.getElementById('question-drill-input'),
        category: document.getElementById('question-drill-category'),
        feedback: document.getElementById('question-drill-feedback'),
        attempts: document.getElementById('question-drill-attempts'),
        hits: document.getElementById('question-drill-hits')
    };

    document.getElementById('question-drill-check')?.addEventListener('click', evaluateQuestionDrill);
    document.getElementById('question-drill-next')?.addEventListener('click', loadNextQuestionDrill);
    loadNextQuestionDrill();
}

function loadNextQuestionDrill() {
    if (!QUESTION_DRILL_PACK.length) return;
    const next = QUESTION_DRILL_PACK[Math.floor(Math.random() * QUESTION_DRILL_PACK.length)];
    questionDrillState.current = next;
    questionDrillState.elements.statement.textContent = next.statement;
    questionDrillState.elements.input.value = '';
    questionDrillState.elements.feedback.textContent = '';
    questionDrillState.elements.category.value = next.focus[0] || 'DELETION';
}

function normalizeText(value) {
    return (value || '').toLowerCase();
}

function getMatchedCategories(value) {
    const normalized = normalizeText(value);
    return Object.entries(QUESTION_DRILL_KEYWORDS).reduce((matches, [category, keywords]) => {
        const found = keywords.some(keyword => normalized.includes(keyword));
        if (found) matches.push(category);
        return matches;
    }, []);
}

function evaluateQuestionDrill() {
    const input = questionDrillState.elements.input;
    const feedbackEl = questionDrillState.elements.feedback;
    if (!input || !feedbackEl || !questionDrillState.current) return;

    const text = input.value.trim();
    if (!text) {
        feedbackEl.textContent = '׳›׳×׳‘׳• ׳©׳׳׳” ׳׳₪׳ ׳™ ׳©׳‘׳•׳“׳§׳™׳.';
        return;
    }

    const selected = questionDrillState.elements.category.value || 'DELETION';
    const selectedLabel = QUESTION_DRILL_CATEGORY_LABELS_HE[selected] || selected;
    const matched = getMatchedCategories(text);
    const expected = questionDrillState.current.focus || [];
    const focusMatchesExpected = expected.length === 0 || expected.includes(selected);
    const keywordMatches = matched.includes(selected);
    const success = focusMatchesExpected && keywordMatches;

    questionDrillState.attempts += 1;
    if (success) questionDrillState.hits += 1;
    updateQuestionDrillStats();

    if (success) {
        feedbackEl.textContent = `׳׳¦׳•׳™׳. ׳–׳• ׳©׳׳׳× ${selectedLabel} ׳˜׳•׳‘׳” ׳©׳׳§׳“׳׳× ׳”׳‘׳”׳¨׳”.`;
    } else {
        const missing = !keywordMatches ? '׳”׳•׳¡׳™׳₪׳• ׳׳™׳׳•׳× ׳׳₪׳×׳— ׳›׳׳• ' + QUESTION_DRILL_KEYWORDS[selected].slice(0, 3).join(', ') : '';
        const expectedLabels = expected
            .map((category) => QUESTION_DRILL_CATEGORY_LABELS_HE[category] || category)
            .join(' / ');
        const expectedMessage = expected.length ? ` ׳”׳›׳™׳•׳•׳ ׳”׳׳•׳׳׳¥ ׳›׳׳: ${expectedLabels}` : '';
        feedbackEl.textContent = `׳ ׳¡׳”/׳ ׳™׳¡׳™ ׳©׳•׳‘. ${missing} ${expectedMessage}`.trim();
    }
}

function updateQuestionDrillStats() {
    if (!questionDrillState.elements.attempts || !questionDrillState.elements.hits) return;
    questionDrillState.elements.attempts.textContent = String(questionDrillState.attempts);
    questionDrillState.elements.hits.textContent = String(questionDrillState.hits);
}

const RAPID_PATTERN_BUTTONS = Object.freeze([
    Object.freeze({ id: 'lost_performative', label: 'Lost Performative', hint: '׳©׳׳©׳” 1 | ׳©׳׳׳' }),
    Object.freeze({ id: 'assumptions', label: 'Assumptions +1', hint: '׳©׳׳©׳” 1 | ׳׳¨׳›׳–' }),
    Object.freeze({ id: 'mind_reading', label: 'Mind Reading', hint: '׳©׳׳©׳” 1 | ׳™׳׳™׳' }),
    Object.freeze({ id: 'universal_quantifier', label: 'Universal Quantifier', hint: '׳©׳׳©׳” 2 | ׳©׳׳׳' }),
    Object.freeze({ id: 'modal_operator', label: 'Modal Operator', hint: '׳©׳׳©׳” 2 | ׳׳¨׳›׳–' }),
    Object.freeze({ id: 'cause_effect', label: 'Cause & Effect', hint: '׳©׳׳©׳” 2 | ׳™׳׳™׳' }),
    Object.freeze({ id: 'nominalisations', label: 'Nominalisations', hint: '׳©׳׳©׳” 3 | ׳©׳׳׳' }),
    Object.freeze({ id: 'identity_predicates', label: 'Identity Predicates', hint: '׳©׳׳©׳” 3 | ׳׳¨׳›׳–' }),
    Object.freeze({ id: 'complex_equivalence', label: 'Complex Equivalence', hint: '׳©׳׳©׳” 3 | ׳™׳׳™׳' }),
    Object.freeze({ id: 'comparative_deletion', label: 'Comparative Deletion', hint: '׳©׳׳©׳” 4 | ׳©׳׳׳' }),
    Object.freeze({ id: 'time_space_predicates', label: 'Time & Space Predicates', hint: '׳©׳׳©׳” 4 | ׳׳¨׳›׳–' }),
    Object.freeze({ id: 'lack_referential_index', label: 'Lack of Referential Index', hint: '׳©׳׳©׳” 4 | ׳™׳׳™׳' }),
    Object.freeze({ id: 'non_referring_nouns', label: 'Non-referring nouns', hint: '׳©׳׳©׳” 5 | ׳©׳׳׳' }),
    Object.freeze({ id: 'sensory_predicates', label: 'Sensory Predicates', hint: '׳©׳׳©׳” 5 | ׳׳¨׳›׳–' }),
    Object.freeze({ id: 'unspecified_verbs', label: 'Unspecified Verbs', hint: '׳©׳׳©׳” 5 | ׳™׳׳™׳' })
]);

const RAPID_PATTERN_ALIASES = Object.freeze({
    simple_deletion: 'assumptions',
    presupposition: 'assumptions',
    modal_necessity: 'modal_operator',
    modal_possibility: 'modal_operator',
    nominalization: 'nominalisations',
    unspecified_noun: 'non_referring_nouns',
    unspecified_verb: 'unspecified_verbs'
});

function normalizeRapidPatternId(patternId) {
    const raw = String(patternId || '').trim().toLowerCase().replace(/\s+/g, '_');
    if (!raw) return '';
    return RAPID_PATTERN_ALIASES[raw] || raw;
}

const RAPID_PATTERN_CUES = Object.freeze([
    Object.freeze({
        id: 'rp_work_1',
        type: '׳¢׳‘׳•׳“׳”',
        monologue: '׳׳ ׳™ ׳₪׳•׳×׳— ׳׳× ׳”׳™׳•׳ ׳¢׳ ׳¢׳©׳¨ ׳׳©׳™׳׳•׳×, ׳¢׳•׳“ ׳׳₪׳ ׳™ ׳§׳₪׳” ׳›׳‘׳¨ ׳™׳© ׳׳—׳¥, ׳•׳”׳׳ ׳”׳ ׳׳׳¨ ׳׳™ ׳©׳—׳™׳™׳‘ ׳׳¡׳™׳™׳ ׳”׳›׳ ׳”׳™׳•׳ ׳׳—׳¨׳× ׳׳™׳ ׳׳™ ׳׳” ׳׳‘׳•׳ ׳׳—׳¨.',
        highlight: '׳—׳™׳™׳‘ ׳׳¡׳™׳™׳ ׳”׳›׳ ׳”׳™׳•׳',
        patternId: 'modal_necessity',
        acceptedPatterns: ['modal_necessity', 'modal_operator']
    }),
    Object.freeze({
        id: 'rp_work_2',
        type: '׳¢׳‘׳•׳“׳”',
        monologue: '׳›׳©׳©׳ ׳™ ׳׳ ׳©׳™׳ ׳׳”׳¦׳•׳•׳× ׳“׳™׳‘׳¨׳• ׳‘׳¦׳“ ׳׳™׳“ ׳”׳׳•׳—, ׳™׳©׳¨ ׳”׳™׳” ׳׳™ ׳‘׳¨׳•׳¨ ׳©׳”׳ ׳—׳•׳©׳‘׳™׳ ׳©׳׳ ׳™ ׳—׳׳© ׳׳§׳¦׳•׳¢׳™׳× ׳•׳–׳” ׳©׳™׳×׳§ ׳׳•׳×׳™.',
        highlight: '׳”׳ ׳—׳•׳©׳‘׳™׳ ׳©׳׳ ׳™ ׳—׳׳© ׳׳§׳¦׳•׳¢׳™׳×',
        patternId: 'mind_reading',
        acceptedPatterns: ['mind_reading']
    }),
    Object.freeze({
        id: 'rp_work_3',
        type: '׳¢׳‘׳•׳“׳”',
        monologue: '׳׳ ׳”׳׳§׳•׳— ׳׳ ׳¢׳•׳ ׳” ׳׳™ ׳×׳•׳ ׳©׳¢׳”, ׳–׳” ׳׳•׳׳¨ ׳©׳׳™׳ ׳׳• ׳׳׳•׳ ׳‘׳™, ׳•׳׳– ׳׳ ׳™ ׳›׳‘׳¨ ׳׳׳‘׳“ ׳§׳¦׳‘ ׳•׳׳ ׳©׳•׳׳— ׳›׳׳•׳.',
        highlight: '׳–׳” ׳׳•׳׳¨ ׳©׳׳™׳ ׳׳• ׳׳׳•׳ ׳‘׳™',
        patternId: 'complex_equivalence',
        acceptedPatterns: ['complex_equivalence']
    }),
    Object.freeze({
        id: 'rp_work_4',
        type: '׳¢׳‘׳•׳“׳”',
        monologue: '׳‘׳׳—׳׳§׳” ׳©׳׳ ׳• ׳›׳•׳׳ ׳×׳׳™׳“ ׳™׳•׳“׳¢׳™׳ ׳׳” ׳׳¢׳©׳•׳×, ׳•׳¨׳§ ׳׳ ׳™ ׳׳™׳›׳©׳”׳• ׳ ׳×׳§׳¢ ׳‘׳›׳ ׳₪׳¢׳ ׳©׳”׳₪׳¨׳•׳™׳§׳˜ ׳׳×׳”׳“׳§.',
        highlight: '׳›׳•׳׳ ׳×׳׳™׳“ ׳™׳•׳“׳¢׳™׳ ׳׳” ׳׳¢׳©׳•׳×',
        patternId: 'universal_quantifier',
        acceptedPatterns: ['universal_quantifier']
    }),
    Object.freeze({
        id: 'rp_work_5',
        type: '׳¢׳‘׳•׳“׳”',
        monologue: '׳§׳™׳‘׳׳×׳™ ׳₪׳™׳“׳‘׳§ ׳©׳–׳” ׳׳ ׳׳¡׳₪׳™׳§ ׳˜׳•׳‘, ׳•׳׳׳– ׳׳ ׳™ ׳׳ ׳‘׳˜׳•׳— ׳׳” ׳׳×׳§׳ ׳§׳•׳“׳ ׳׳– ׳׳ ׳™ ׳₪׳©׳•׳˜ ׳§׳•׳₪׳.',
        highlight: '׳–׳” ׳׳ ׳׳¡׳₪׳™׳§ ׳˜׳•׳‘',
        patternId: 'simple_deletion',
        acceptedPatterns: ['simple_deletion']
    }),
    Object.freeze({
        id: 'rp_work_6',
        type: '׳¢׳‘׳•׳“׳”',
        monologue: '׳›׳ ׳”׳™׳•׳ ׳׳ ׳™ ׳׳•׳׳¨ ׳׳¢׳¦׳׳™ ׳©׳¦׳¨׳™׳ ׳׳˜׳₪׳ ׳‘׳–׳” ׳›׳‘׳¨, ׳׳‘׳ ׳‘׳₪׳•׳¢׳ ׳׳ ׳™ ׳׳ ׳™׳•׳“׳¢ ׳׳” ׳”׳₪׳¢׳•׳׳” ׳”׳¨׳׳©׳•׳ ׳” ׳©׳׳ ׳™ ׳׳׳•׳¨ ׳׳‘׳¦׳¢.',
        highlight: '׳׳˜׳₪׳ ׳‘׳–׳” ׳›׳‘׳¨',
        patternId: 'unspecified_verb',
        acceptedPatterns: ['unspecified_verb', 'simple_deletion']
    }),
    Object.freeze({
        id: 'rp_work_7',
        type: '׳¢׳‘׳•׳“׳”',
        monologue: '׳”׳˜׳•׳ ׳©׳׳• ׳”׳•׳¨׳™׳“ ׳׳™ ׳׳× ׳›׳ ׳”׳׳•׳˜׳™׳‘׳¦׳™׳”, ׳•׳‘׳¨׳’׳¢ ׳©׳–׳” ׳§׳¨׳” ׳׳ ׳”׳¦׳׳—׳×׳™ ׳׳›׳×׳•׳‘ ׳׳₪׳™׳׳• ׳¢׳“׳›׳•׳ ׳׳—׳“ ׳§׳˜׳.',
        highlight: '׳”׳•׳¨׳™׳“ ׳׳™ ׳׳× ׳›׳ ׳”׳׳•׳˜׳™׳‘׳¦׳™׳”',
        patternId: 'cause_effect',
        acceptedPatterns: ['cause_effect']
    }),
    Object.freeze({
        id: 'rp_relationship_1',
        type: '׳–׳•׳’׳™׳•׳×',
        monologue: '׳׳ ׳׳ ׳™ ׳׳׳—׳¨ ׳׳₪׳’׳™׳©׳” ׳׳—׳×, ׳–׳” ׳׳•׳׳¨ ׳©׳׳ ׳™ ׳׳ ׳׳•׳”׳‘ ׳‘׳׳׳×, ׳•׳׳– ׳›׳ ׳”׳©׳™׳—׳” ׳ ׳”׳™׳™׳× ׳׳×׳’׳•׳ ׳ ׳× ׳•׳׳ ׳¢׳ ׳™׳™׳ ׳™׳×.',
        highlight: '׳–׳” ׳׳•׳׳¨ ׳©׳׳ ׳™ ׳׳ ׳׳•׳”׳‘ ׳‘׳׳׳×',
        patternId: 'complex_equivalence',
        acceptedPatterns: ['complex_equivalence']
    }),
    Object.freeze({
        id: 'rp_relationship_2',
        type: '׳–׳•׳’׳™׳•׳×',
        monologue: '׳”׳™׳ ׳׳¡׳×׳›׳׳× ׳‘׳˜׳׳₪׳•׳ ׳׳›׳׳” ׳“׳§׳•׳× ׳•׳׳ ׳™ ׳™׳©׳¨ ׳™׳•׳“׳¢ ׳©׳”׳™׳ ׳›׳‘׳¨ ׳›׳•׳¢׳¡׳× ׳¢׳׳™׳™, ׳¢׳•׳“ ׳׳₪׳ ׳™ ׳©׳׳׳¨׳” ׳׳™׳׳”.',
        highlight: '׳׳ ׳™ ׳™׳©׳¨ ׳™׳•׳“׳¢ ׳©׳”׳™׳ ׳›׳‘׳¨ ׳›׳•׳¢׳¡׳× ׳¢׳׳™׳™',
        patternId: 'mind_reading',
        acceptedPatterns: ['mind_reading']
    }),
    Object.freeze({
        id: 'rp_relationship_3',
        type: '׳–׳•׳’׳™׳•׳×',
        monologue: '׳‘׳‘׳™׳× ׳–׳” ׳₪׳©׳•׳˜ ׳׳ ׳ ׳›׳•׳ ׳׳“׳‘׳¨ ׳›׳›׳”, ׳ ׳§׳•׳“׳”, ׳•׳׳™׳ ׳‘׳›׳׳ ׳¢׳ ׳׳” ׳׳“׳•׳ ׳׳• ׳׳‘׳“׳•׳§.',
        highlight: '׳–׳” ׳₪׳©׳•׳˜ ׳׳ ׳ ׳›׳•׳ ׳׳“׳‘׳¨ ׳›׳›׳”',
        patternId: 'lost_performative',
        acceptedPatterns: ['lost_performative']
    }),
    Object.freeze({
        id: 'rp_relationship_4',
        type: '׳–׳•׳’׳™׳•׳×',
        monologue: '׳׳×׳™ ׳×׳₪׳¡׳™׳§ ׳©׳•׳‘ ׳׳”׳¨׳•׳¡ ׳׳¢׳¦׳׳ ׳׳× ׳”׳§׳©׳¨? ׳–׳• ׳©׳׳׳” ׳©׳¨׳¦׳” ׳׳™ ׳‘׳¨׳׳© ׳›׳ ׳₪׳¢׳ ׳©׳™׳© ׳•׳™׳›׳•׳— ׳§׳˜׳.',
        highlight: '׳׳×׳™ ׳×׳₪׳¡׳™׳§ ׳©׳•׳‘ ׳׳”׳¨׳•׳¡ ׳׳¢׳¦׳׳ ׳׳× ׳”׳§׳©׳¨',
        patternId: 'presupposition',
        acceptedPatterns: ['presupposition']
    }),
    Object.freeze({
        id: 'rp_relationship_5',
        type: '׳–׳•׳’׳™׳•׳×',
        monologue: '׳׳™ ׳׳₪׳©׳¨ ׳׳“׳‘׳¨ ׳׳™׳×׳• ׳¢׳ ׳›׳¡׳£ ׳‘׳׳™ ׳₪׳™׳¦׳•׳¥, ׳׳– ׳׳ ׳™ ׳›׳‘׳¨ ׳׳¨׳׳© ׳׳•׳•׳×׳¨ ׳•׳ ׳›׳ ׳¡ ׳׳©׳§׳˜.',
        highlight: '׳׳™ ׳׳₪׳©׳¨ ׳׳“׳‘׳¨ ׳׳™׳×׳• ׳¢׳ ׳›׳¡׳£',
        patternId: 'modal_possibility',
        acceptedPatterns: ['modal_possibility', 'modal_operator']
    }),
    Object.freeze({
        id: 'rp_parent_1',
        type: '׳”׳•׳¨׳•׳×',
        monologue: '׳׳•׳׳¨׳™׳ ׳׳™ ׳©׳׳ ׳™ ׳”׳•׳¨׳” ׳׳ ׳¢׳§׳‘׳™, ׳•׳׳ ׳™ ׳ ׳׳—׳¥ ׳›׳™ ׳׳ ׳‘׳¨׳•׳¨ ׳׳™ ׳‘׳“׳™׳•׳§ ׳׳•׳׳¨ ׳׳× ׳–׳” ׳•׳¢׳ ׳׳” ׳”׳•׳ ׳ ׳©׳¢׳.',
        highlight: '׳׳•׳׳¨׳™׳ ׳׳™ ׳©׳׳ ׳™ ׳”׳•׳¨׳” ׳׳ ׳¢׳§׳‘׳™',
        patternId: 'lack_referential_index',
        acceptedPatterns: ['lack_referential_index']
    }),
    Object.freeze({
        id: 'rp_parent_2',
        type: '׳”׳•׳¨׳•׳×',
        monologue: '׳›׳•׳׳ ׳‘׳‘׳™׳× ׳׳•׳׳¨׳™׳ ׳©׳”׳“׳¨׳ ׳”׳–׳׳× ׳™׳•׳×׳¨ ׳˜׳•׳‘׳” ׳׳™׳׳“, ׳׳‘׳ ׳׳£ ׳׳—׳“ ׳׳ ׳׳¡׳‘׳™׳¨ ׳™׳•׳×׳¨ ׳˜׳•׳‘׳” ׳‘׳™׳—׳¡ ׳׳׳”.',
        highlight: '׳™׳•׳×׳¨ ׳˜׳•׳‘׳” ׳׳™׳׳“',
        patternId: 'comparative_deletion',
        acceptedPatterns: ['comparative_deletion']
    }),
    Object.freeze({
        id: 'rp_parent_3',
        type: '׳”׳•׳¨׳•׳×',
        monologue: '׳™׳© ׳‘׳‘׳™׳× ׳¢׳ ׳™׳™׳ ׳©׳—׳•׳–׳¨ ׳›׳ ׳¢׳¨׳‘ ׳¡׳‘׳™׳‘ ׳©׳™׳¢׳•׳¨׳™׳, ׳•׳׳ ׳™ ׳׳¨׳’׳™׳© ׳©׳׳ ׳™ ׳׳׳‘׳“ ׳©׳׳™׳˜׳” ׳¢׳•׳“ ׳׳₪׳ ׳™ ׳©׳׳×׳—׳™׳׳™׳.',
        highlight: '׳¢׳ ׳™׳™׳ ׳©׳—׳•׳–׳¨ ׳›׳ ׳¢׳¨׳‘',
        patternId: 'unspecified_noun',
        acceptedPatterns: ['unspecified_noun', 'simple_deletion']
    }),
    Object.freeze({
        id: 'rp_parent_4',
        type: '׳”׳•׳¨׳•׳×',
        monologue: '׳׳—׳¨׳™ ׳›׳ ׳¨׳™׳‘ ׳§׳˜׳ ׳׳ ׳™ ׳׳¨׳’׳™׳© ׳©׳”׳×׳§׳©׳•׳¨׳× ׳‘׳‘׳™׳× ׳ ׳©׳‘׳¨׳” ׳׳’׳׳¨׳™, ׳•׳׳™׳ ׳›׳‘׳¨ ׳“׳¨׳ ׳׳©׳§׳ ׳׳× ׳–׳”.',
        highlight: '׳”׳×׳§׳©׳•׳¨׳× ׳‘׳‘׳™׳× ׳ ׳©׳‘׳¨׳”',
        patternId: 'nominalization',
        acceptedPatterns: ['nominalization']
    }),
    Object.freeze({
        id: 'rp_self_1',
        type: '׳‘׳™׳˜׳—׳•׳ ׳¢׳¦׳׳™',
        monologue: '׳›׳©׳׳ ׳™ ׳¦׳¨׳™׳ ׳׳“׳‘׳¨ ׳׳•׳ ׳§׳‘׳•׳¦׳”, ׳”׳׳©׳₪׳˜ ׳©׳¢׳•׳׳” ׳׳™׳“ ׳”׳•׳ ׳©׳׳ ׳™ ׳׳ ׳™׳›׳•׳ ׳׳¢׳׳•׳“ ׳׳•׳ ׳׳ ׳©׳™׳ ׳•׳–׳” ׳¢׳•׳¦׳¨ ׳׳•׳×׳™ ׳׳’׳׳¨׳™.',
        highlight: '׳׳ ׳™ ׳׳ ׳™׳›׳•׳ ׳׳¢׳׳•׳“ ׳׳•׳ ׳׳ ׳©׳™׳',
        patternId: 'modal_possibility',
        acceptedPatterns: ['modal_possibility', 'modal_operator']
    }),
    Object.freeze({
        id: 'rp_self_2',
        type: '׳‘׳™׳˜׳—׳•׳ ׳¢׳¦׳׳™',
        monologue: '׳׳׳– ׳”׳˜׳¢׳•׳× ׳”׳׳—׳¨׳•׳ ׳” ׳”׳‘׳™׳˜׳—׳•׳ ׳©׳׳™ ׳ ׳”׳¨׳¡, ׳•׳׳׳•׳×׳• ׳¨׳’׳¢ ׳׳ ׳™ ׳ ׳׳ ׳¢ ׳׳™׳•׳–׳׳•׳× ׳—׳“׳©׳•׳× ׳‘׳¢׳‘׳•׳“׳”.',
        highlight: '׳”׳‘׳™׳˜׳—׳•׳ ׳©׳׳™ ׳ ׳”׳¨׳¡',
        patternId: 'nominalization',
        acceptedPatterns: ['nominalization']
    }),
    Object.freeze({
        id: 'rp_self_3',
        type: '׳‘׳™׳˜׳—׳•׳ ׳¢׳¦׳׳™',
        monologue: '׳׳ ׳™ ׳₪׳—׳•׳× ׳˜׳•׳‘ ׳׳”׳ ׳׳– ׳¢׳“׳™׳£ ׳׳ ׳׳ ׳¡׳•׳× ׳׳”׳•׳‘׳™׳ ׳©׳•׳ ׳“׳‘׳¨ ׳›׳“׳™ ׳׳ ׳׳”׳™׳—׳©׳£ ׳©׳•׳‘ ׳׳›׳™׳©׳׳•׳.',
        highlight: '׳׳ ׳™ ׳₪׳—׳•׳× ׳˜׳•׳‘ ׳׳”׳',
        patternId: 'comparative_deletion',
        acceptedPatterns: ['comparative_deletion']
    }),
    Object.freeze({
        id: 'rp_money_1',
        type: '׳›׳¡׳£',
        monologue: '׳›׳©׳׳ ׳™ ׳׳¡׳×׳›׳ ׳¢׳ ׳—׳©׳‘׳•׳ ׳”׳‘׳ ׳§, ׳–׳” ׳×׳׳™׳“ ׳§׳•׳¨׳” ׳׳™ ׳“׳•׳•׳§׳ ׳‘׳–׳׳ ׳”׳›׳™ ׳׳ ׳ ׳•׳— ׳•׳׳ ׳™ ׳׳×׳ ׳×׳§ ׳׳›׳ ׳×׳›׳ ׳•׳.',
        highlight: '׳–׳” ׳×׳׳™׳“ ׳§׳•׳¨׳” ׳׳™',
        patternId: 'universal_quantifier',
        acceptedPatterns: ['universal_quantifier']
    }),
    Object.freeze({
        id: 'rp_money_2',
        type: '׳›׳¡׳£',
        monologue: '׳׳ ׳™ ׳׳•׳׳¨ ׳׳¢׳¦׳׳™ ׳©׳–׳” ׳—׳™׳™׳‘ ׳׳”׳™׳•׳× ׳›׳›׳” ׳•׳׳™׳ ׳©׳•׳ ׳׳₪׳©׳¨׳•׳× ׳׳—׳¨׳×, ׳׳– ׳׳ ׳™ ׳׳ ׳‘׳•׳“׳§ ׳—׳׳•׳₪׳•׳× ׳‘׳›׳׳.',
        highlight: '׳–׳” ׳—׳™׳™׳‘ ׳׳”׳™׳•׳× ׳›׳›׳” ׳•׳׳™׳ ׳©׳•׳ ׳׳₪׳©׳¨׳•׳× ׳׳—׳¨׳×',
        patternId: 'modal_operator',
        acceptedPatterns: ['modal_operator', 'modal_necessity', 'modal_possibility']
    }),
    Object.freeze({
        id: 'rp_health_1',
        type: '׳‘׳¨׳™׳׳•׳×',
        monologue: '׳׳—׳¨׳™ ׳‘׳™׳§׳•׳¨ ׳§׳¦׳¨ ׳™׳¦׳׳×׳™ ׳¢׳ ׳׳©׳₪׳˜ ׳©׳–׳” ׳‘׳¡׳“׳¨ ׳™׳—׳¡׳™׳×, ׳׳‘׳ ׳׳ ׳”׳‘׳ ׳×׳™ ׳‘׳¡׳“׳¨ ׳‘׳™׳—׳¡ ׳׳׳” ׳•׳׳” ׳‘׳›׳׳ ׳”׳׳“׳“.',
        highlight: '׳–׳” ׳‘׳¡׳“׳¨ ׳™׳—׳¡׳™׳×',
        patternId: 'comparative_deletion',
        acceptedPatterns: ['comparative_deletion', 'simple_deletion']
    }),
    Object.freeze({
        id: 'rp_health_2',
        type: '׳‘׳¨׳™׳׳•׳×',
        monologue: '׳›׳•׳׳ ׳׳•׳׳¨׳™׳ ׳©׳¦׳¨׳™׳ ׳׳¢׳©׳•׳× ׳©׳™׳ ׳•׳™ ׳¢׳›׳©׳™׳•, ׳•׳׳ ׳™ ׳ ׳›׳ ׳¡ ׳׳₪׳—׳“ ׳׳₪׳ ׳™ ׳©׳‘׳›׳׳ ׳‘׳™׳¨׳¨׳×׳™ ׳׳” ׳¨׳׳•׳•׳ ׳˜׳™ ׳׳׳™׳™.',
        highlight: '׳›׳•׳׳ ׳׳•׳׳¨׳™׳ ׳©׳¦׳¨׳™׳ ׳׳¢׳©׳•׳× ׳©׳™׳ ׳•׳™ ׳¢׳›׳©׳™׳•',
        patternId: 'lack_referential_index',
        acceptedPatterns: ['lack_referential_index', 'universal_quantifier']
    }),
    Object.freeze({
        id: 'rp_general_1',
        type: '׳›׳׳׳™',
        monologue: '׳׳ ׳׳ ׳”׳¦׳׳—׳×׳™ ׳”׳™׳•׳, ׳–׳” ׳׳•׳׳¨ ׳©׳׳ ׳™ ׳׳ ׳‘׳ ׳•׳™ ׳׳–׳”, ׳•׳׳– ׳׳ ׳™ ׳“׳•׳—׳” ׳©׳•׳‘ ׳׳× ׳›׳ ׳”׳ ׳™׳¡׳™׳•׳ ׳”׳‘׳.',
        highlight: '׳׳ ׳׳ ׳”׳¦׳׳—׳×׳™ ׳”׳™׳•׳, ׳–׳” ׳׳•׳׳¨ ׳©׳׳ ׳™ ׳׳ ׳‘׳ ׳•׳™ ׳׳–׳”',
        patternId: 'complex_equivalence',
        acceptedPatterns: ['complex_equivalence']
    }),
    Object.freeze({
        id: 'rp_identity_1',
        type: '׳›׳׳׳™',
        monologue: '׳‘׳¨׳’׳¢ ׳©׳׳ ׳™ ׳ ׳×׳§׳¢ ׳‘׳׳©׳™׳׳” ׳׳—׳×, ׳׳ ׳™ ׳׳™׳“ ׳׳•׳׳¨ ׳׳¢׳¦׳׳™ ׳©׳׳ ׳™ ׳₪׳©׳•׳˜ ׳׳“׳ ׳׳ ׳׳׳•׳¨׳’׳ ׳•׳–׳” ׳”׳¡׳™׳₪׳•׳¨ ׳©׳׳™.',
        highlight: '׳׳ ׳™ ׳₪׳©׳•׳˜ ׳׳“׳ ׳׳ ׳׳׳•׳¨׳’׳',
        patternId: 'identity_predicates',
        acceptedPatterns: ['identity_predicates']
    }),
    Object.freeze({
        id: 'rp_time_space_1',
        type: '׳¢׳‘׳•׳“׳”',
        monologue: '׳‘׳™׳©׳™׳‘׳•׳× ׳©׳ ׳™׳•׳ ׳¨׳׳©׳•׳ ׳‘׳‘׳•׳§׳¨, ׳‘׳—׳“׳¨ ׳”׳–׳” ׳¡׳₪׳¦׳™׳₪׳™׳×, ׳׳ ׳™ ׳×׳׳™׳“ ׳§׳•׳₪׳ ׳•׳׳ ׳׳¦׳׳™׳— ׳׳“׳‘׳¨ ׳—׳•׳₪׳©׳™.',
        highlight: '׳‘׳™׳©׳™׳‘׳•׳× ׳©׳ ׳™׳•׳ ׳¨׳׳©׳•׳ ׳‘׳‘׳•׳§׳¨, ׳‘׳—׳“׳¨ ׳”׳–׳” ׳¡׳₪׳¦׳™׳₪׳™׳×',
        patternId: 'time_space_predicates',
        acceptedPatterns: ['time_space_predicates']
    }),
    Object.freeze({
        id: 'rp_sensory_1',
        type: '׳–׳•׳’׳™׳•׳×',
        monologue: '׳׳ ׳™ ׳׳¨׳’׳™׳© ׳©׳–׳” ׳׳ ׳ ׳›׳•׳ ׳‘׳™׳ ׳™׳ ׳•, ׳׳‘׳ ׳׳™׳ ׳׳™ ׳©׳•׳ ׳×׳׳•׳ ׳” ׳‘׳¨׳•׳¨׳” ׳©׳ ׳׳” ׳‘׳“׳™׳•׳§ ׳׳ ׳™ ׳¨׳•׳׳” ׳׳• ׳©׳•׳׳¢ ׳©׳§׳•׳¨׳” ׳©׳.',
        highlight: '׳׳¨׳’׳™׳© ׳©׳–׳” ׳׳ ׳ ׳›׳•׳ ׳‘׳™׳ ׳™׳ ׳•',
        patternId: 'sensory_predicates',
        acceptedPatterns: ['sensory_predicates']
    })
]);

const RAPID_PATTERN_NEXT_DELAY_MS = 1050;
const RAPID_PATTERN_WARNING_RATIO = 0.34;
const RAPID_PATTERN_CONTEXT_LINES = 4;
const RAPID_PATTERN_FEEDBACK_INTERVAL = 10;
const RAPID_PATTERN_MODE_STORAGE_KEY = 'rapid_pattern_mode_v1';

let rapidPatternArenaState = {
    active: false,
    paused: false,
    mode: 'learning',
    pauseReason: '',
    focusMode: false,
    pendingNextCue: false,
    pausedRemainingMs: 0,
    score: 0,
    streak: 0,
    round: 0,
    errors: 0,
    currentCue: null,
    lastCueId: '',
    history: [],
    timeLimitSec: 12,
    startedAtMs: 0,
    endsAtMs: 0,
    tickTimer: null,
    nextTimer: null,
    elements: {}
};

function setupRapidPatternArena() {
    const root = document.getElementById('rapid-pattern-arena');
    if (!root || root.dataset.rapidBound === 'true') return;
    root.dataset.rapidBound = 'true';

    rapidPatternArenaState.elements = {
        root,
        typeSelect: document.getElementById('rapid-case-type'),
        timeLimit: document.getElementById('rapid-time-limit'),
        timeLimitValue: document.getElementById('rapid-time-limit-value'),
        modeLearningBtn: document.getElementById('rapid-mode-learning-btn'),
        modeExamBtn: document.getElementById('rapid-mode-exam-btn'),
        modeNote: document.getElementById('rapid-mode-note'),
        traffic: document.getElementById('rapid-traffic-light'),
        errorsLabel: document.getElementById('rapid-errors-label'),
        score: document.getElementById('rapid-score'),
        streak: document.getElementById('rapid-streak'),
        round: document.getElementById('rapid-round'),
        startBtn: document.getElementById('rapid-start-btn'),
        pauseBtn: document.getElementById('rapid-pause-btn'),
        helpBtn: document.getElementById('rapid-help-btn'),
        explainBtn: document.getElementById('rapid-explain-btn'),
        focusExitBtn: document.getElementById('rapid-focus-exit-btn'),
        monologue: document.getElementById('rapid-monologue-text'),
        timerFill: document.getElementById('rapid-timer-fill'),
        feedback: document.getElementById('rapid-feedback'),
        buttons: document.getElementById('rapid-pattern-buttons'),
        aiFeedback: document.getElementById('rapid-ai-feedback'),
        helpPanel: document.getElementById('rapid-help-panel'),
        helpContent: document.getElementById('rapid-help-content'),
        explainModal: document.getElementById('rapid-explain-modal'),
        explainCloseBtn: document.getElementById('rapid-explain-close-btn'),
        explainConfirmBtn: document.getElementById('rapid-explain-confirm-btn')
    };

    const timeLimit = Number(rapidPatternArenaState.elements.timeLimit?.value || 12);
    rapidPatternArenaState.timeLimitSec = Number.isFinite(timeLimit) ? Math.max(6, Math.min(25, timeLimit)) : 12;
    updateRapidPatternTimeLabel();
    populateRapidPatternTypes();
    renderRapidPatternButtons();
    setRapidPatternTrafficLight('green');
    updateRapidPatternScoreboard();
    setRapidPatternFeedback('׳׳׳×׳™׳ ׳׳×׳—׳™׳׳× ׳¡׳‘׳‘...', 'info');
    setRapidPatternButtonsDisabled(true);
    setRapidPatternPauseButtonState(false, false);
    setRapidPatternHelpButtonState(false);
    updateRapidPatternExplainButtonState();
    clearRapidPatternAiFeedback();
    hideRapidPatternHelpPanel();
    hideRapidPatternExplanation({ resumeIfNeeded: false });
    setRapidPatternFocusMode(false);

    const savedMode = localStorage.getItem(RAPID_PATTERN_MODE_STORAGE_KEY) || 'learning';
    setRapidPatternMode(savedMode, { persist: false, announce: false });

    rapidPatternArenaState.elements.startBtn?.addEventListener('click', startRapidPatternSession);
    rapidPatternArenaState.elements.pauseBtn?.addEventListener('click', toggleRapidPatternPause);
    rapidPatternArenaState.elements.helpBtn?.addEventListener('click', showRapidPatternHelp);
    rapidPatternArenaState.elements.explainBtn?.addEventListener('click', showRapidPatternExplanation);
    rapidPatternArenaState.elements.focusExitBtn?.addEventListener('click', () => {
        setRapidPatternFocusMode(false);
        setRapidPatternFeedback('׳—׳–׳¨׳×׳ ׳׳×׳¦׳•׳’׳” ׳׳׳׳”.', 'info');
    });
    rapidPatternArenaState.elements.explainCloseBtn?.addEventListener('click', () => {
        hideRapidPatternExplanation({ resumeIfNeeded: true });
    });
    rapidPatternArenaState.elements.explainConfirmBtn?.addEventListener('click', () => {
        hideRapidPatternExplanation({ resumeIfNeeded: true });
    });
    rapidPatternArenaState.elements.explainModal?.addEventListener('click', (event) => {
        if (event.target === rapidPatternArenaState.elements.explainModal) {
            hideRapidPatternExplanation({ resumeIfNeeded: true });
        }
    });
    document.addEventListener('keydown', handleRapidPatternGlobalKeydown);
    rapidPatternArenaState.elements.timeLimit?.addEventListener('input', () => {
        const value = Number(rapidPatternArenaState.elements.timeLimit?.value || 12);
        rapidPatternArenaState.timeLimitSec = Number.isFinite(value) ? Math.max(6, Math.min(25, value)) : 12;
        updateRapidPatternTimeLabel();
    });
    rapidPatternArenaState.elements.modeLearningBtn?.addEventListener('click', () => setRapidPatternMode('learning'));
    rapidPatternArenaState.elements.modeExamBtn?.addEventListener('click', () => setRapidPatternMode('exam'));
    rapidPatternArenaState.elements.buttons?.addEventListener('click', handleRapidPatternButtonClick);
}

function updateRapidPatternTimeLabel() {
    const valueEl = rapidPatternArenaState.elements.timeLimitValue;
    if (!valueEl) return;
    valueEl.textContent = String(rapidPatternArenaState.timeLimitSec);
}

function normalizeRapidPatternMode(mode = '') {
    return String(mode || '').trim().toLowerCase() === 'exam' ? 'exam' : 'learning';
}

function setRapidPatternMode(mode = 'learning', { persist = true, announce = true } = {}) {
    const resolvedMode = normalizeRapidPatternMode(mode);
    rapidPatternArenaState.mode = resolvedMode;

    if (persist) {
        localStorage.setItem(RAPID_PATTERN_MODE_STORAGE_KEY, resolvedMode);
    }

    const isLearning = resolvedMode === 'learning';
    const learningBtn = rapidPatternArenaState.elements.modeLearningBtn;
    const examBtn = rapidPatternArenaState.elements.modeExamBtn;
    const modeNote = rapidPatternArenaState.elements.modeNote;
    const root = rapidPatternArenaState.elements.root;

    if (learningBtn) {
        learningBtn.classList.toggle('is-active', isLearning);
        learningBtn.setAttribute('aria-pressed', isLearning ? 'true' : 'false');
    }
    if (examBtn) {
        examBtn.classList.toggle('is-active', !isLearning);
        examBtn.setAttribute('aria-pressed', !isLearning ? 'true' : 'false');
    }
    if (modeNote) {
        modeNote.textContent = isLearning
            ? '׳׳׳™׳“׳”: ׳׳₪׳©׳¨ ׳׳¢׳¦׳•׳¨ ׳•׳׳§׳‘׳ HELP.'
            : '׳׳‘׳—׳: ׳׳™׳ ׳¢׳¦׳™׳¨׳” ׳•׳׳™׳ HELP.';
    }
    if (root) {
        root.dataset.rapidMode = resolvedMode;
    }

    if (isLearning) {
        setRapidPatternPauseButtonState(
            rapidPatternArenaState.active || rapidPatternArenaState.paused,
            rapidPatternArenaState.paused
        );
        setRapidPatternHelpButtonState(true);
        updateRapidPatternExplainButtonState();
        if (announce) {
            setRapidPatternFeedback('׳׳¦׳‘ ׳׳׳™׳“׳” ׳₪׳¢׳™׳: HELP ׳¢׳•׳¦׳¨ ׳׳× ׳”׳¡׳‘׳‘ ׳•׳׳¦׳™׳’ ׳”׳¡׳‘׳¨.', 'info');
        }
        return;
    }

    hideRapidPatternHelpPanel();
    hideRapidPatternExplanation({ resumeIfNeeded: true });
    if (rapidPatternArenaState.paused) {
        resumeRapidPatternSession();
    }
    setRapidPatternPauseButtonState(false, false);
    setRapidPatternHelpButtonState(false);
    updateRapidPatternExplainButtonState();
    if (announce) {
        setRapidPatternFeedback('׳׳¦׳‘ ׳׳‘׳—׳ ׳₪׳¢׳™׳: ׳׳™׳ ׳¢׳¦׳™׳¨׳” ׳•׳׳™׳ HELP.', 'info');
    }
}

function setRapidPatternHelpButtonState(enabled = true) {
    const btn = rapidPatternArenaState.elements.helpBtn;
    if (!btn) return;

    const examMode = rapidPatternArenaState.mode === 'exam';
    btn.disabled = examMode || !enabled;
    btn.classList.toggle('is-hidden', examMode);
}

function updateRapidPatternExplainButtonState() {
    const btn = rapidPatternArenaState.elements.explainBtn;
    if (!btn) return;
    const blockedInExam = rapidPatternArenaState.mode === 'exam' && rapidPatternArenaState.active;
    btn.disabled = blockedInExam;
    btn.setAttribute('title', blockedInExam
        ? '׳‘׳׳¦׳‘ ׳׳‘׳—׳ ׳”׳”׳¡׳‘׳¨ ׳–׳׳™׳ ׳‘׳™׳ ׳¡׳‘׳‘׳™׳ ׳‘׳׳‘׳“.'
        : '׳”׳¡׳‘׳¨ ׳§׳¦׳¨: ׳׳” ׳¢׳•׳©׳™׳ ׳‘׳×׳¨׳’׳™׳ ׳•׳׳׳”');
}

function showRapidPatternExplanation() {
    const modal = rapidPatternArenaState.elements.explainModal;
    if (!modal) return;

    if (rapidPatternArenaState.mode === 'exam' && rapidPatternArenaState.active) {
        setRapidPatternFeedback('׳‘׳׳¦׳‘ ׳׳‘׳—׳ ׳”׳”׳¡׳‘׳¨ ׳–׳׳™׳ ׳‘׳™׳ ׳¡׳‘׳‘׳™׳ ׳‘׳׳‘׳“.', 'warn');
        return;
    }

    if (rapidPatternArenaState.mode === 'learning' && rapidPatternArenaState.active) {
        pauseRapidPatternSession('explain');
    }

    modal.classList.remove('hidden');
    updateRapidPatternExplainButtonState();
}

function hideRapidPatternExplanation({ resumeIfNeeded = false } = {}) {
    const modal = rapidPatternArenaState.elements.explainModal;
    if (modal) modal.classList.add('hidden');

    if (
        resumeIfNeeded &&
        rapidPatternArenaState.mode === 'learning' &&
        rapidPatternArenaState.paused &&
        rapidPatternArenaState.pauseReason === 'explain'
    ) {
        resumeRapidPatternSession();
        return;
    }

    updateRapidPatternExplainButtonState();
}

function isRapidRadarTabActive() {
    const tab = document.getElementById('practice-radar');
    return Boolean(tab && tab.classList.contains('active'));
}

function setRapidPatternFocusMode(enabled = false) {
    const shouldEnable = Boolean(enabled) && isRapidRadarTabActive();
    rapidPatternArenaState.focusMode = shouldEnable;
    document.body.classList.toggle('rapid-radar-focus', shouldEnable);
    const root = rapidPatternArenaState.elements.root;
    if (root) {
        root.dataset.rapidFocus = shouldEnable ? 'on' : 'off';
    }
    const exitBtn = rapidPatternArenaState.elements.focusExitBtn;
    if (exitBtn) {
        exitBtn.classList.toggle('hidden', !shouldEnable);
    }
}

function handleRapidPatternGlobalKeydown(event) {
    if (event.key !== 'Escape') return;

    const explainModal = rapidPatternArenaState.elements.explainModal;
    if (explainModal && !explainModal.classList.contains('hidden')) {
        hideRapidPatternExplanation({ resumeIfNeeded: true });
        event.preventDefault();
        return;
    }

    if (rapidPatternArenaState.focusMode) {
        setRapidPatternFocusMode(false);
        setRapidPatternFeedback('׳—׳–׳¨׳×׳ ׳׳×׳¦׳•׳’׳” ׳׳׳׳”.', 'info');
        event.preventDefault();
    }
}

function hideRapidPatternHelpPanel() {
    const panel = rapidPatternArenaState.elements.helpPanel;
    if (!panel) return;
    panel.classList.add('hidden');
}

function buildRapidPatternHelpHtml(cue) {
    const patternId = normalizeRapidPatternId(cue?.patternId || '');
    const label = getRapidPatternLabel(patternId);
    const buttonMeta = RAPID_PATTERN_BUTTONS.find((item) => item.id === patternId);
    const hint = buttonMeta?.hint || '׳‘׳“׳§׳• ׳׳™׳–׳• ׳”׳ ׳—׳” ׳׳©׳•׳ ׳™׳× ׳ ׳—׳©׳₪׳× ׳‘׳׳™׳׳” ׳”׳׳•׳“׳’׳©׳×.';
    const highlight = String(cue?.highlight || '').trim() || '׳”׳׳™׳׳” ׳”׳׳•׳“׳’׳©׳× ׳‘׳׳©׳₪׳˜';

    return `
        <p><strong>׳׳™׳ ׳׳—׳©׳•׳‘ ׳›׳׳:</strong> ׳§׳•׳“׳ ׳׳¡׳×׳›׳׳™׳ ׳¢׳ ׳”׳׳™׳׳” ׳”׳׳•׳“׳’׳©׳×, ׳•׳¨׳§ ׳׳—׳¨ ׳›׳ ׳‘׳•׳—׳¨׳™׳ ׳›׳₪׳×׳•׳¨.</p>
        <p><strong>׳¨׳׳– ׳׳”׳™׳¨:</strong> "${escapeHtml(highlight)}" ׳׳¦׳‘׳™׳¢ ׳‘׳“׳¨׳ ׳›׳׳ ׳¢׳ <strong>${escapeHtml(label)}</strong>.</p>
        <p><strong>׳׳׳”:</strong> ${escapeHtml(hint)}.</p>
        <p><strong>׳×׳”׳׳™׳ 3 ׳¦׳¢׳“׳™׳:</strong> ׳˜׳¨׳™׳’׳¨ ׳׳•׳“׳’׳© -> ׳–׳™׳”׳•׳™ ׳¡׳•׳’ ׳”׳”׳₪׳¨׳” -> ׳‘׳—׳™׳¨׳× ׳×׳‘׳ ׳™׳× ׳׳—׳× ׳׳×׳•׳ 15.</p>
    `;
}

function showRapidPatternHelp() {
    if (rapidPatternArenaState.mode === 'exam') return;

    if (!rapidPatternArenaState.currentCue) {
        setRapidPatternFeedback('׳”׳×׳—׳™׳׳• ׳¡׳‘׳‘ ׳•׳׳– ׳׳—׳¦׳• HELP ׳׳”׳¡׳‘׳¨ ׳‘׳–׳׳ ׳׳׳×.', 'warn');
        return;
    }

    pauseRapidPatternSession('help');
    const panel = rapidPatternArenaState.elements.helpPanel;
    const content = rapidPatternArenaState.elements.helpContent;
    if (!panel || !content) return;

    content.innerHTML = buildRapidPatternHelpHtml(rapidPatternArenaState.currentCue);
    panel.classList.remove('hidden');
}

function populateRapidPatternTypes() {
    const select = rapidPatternArenaState.elements.typeSelect;
    if (!select) return;
    const selected = select.value || 'random';
    const uniqueTypes = Array.from(new Set(RAPID_PATTERN_CUES.map(item => item.type))).sort((a, b) => a.localeCompare(b, 'he'));
    select.innerHTML = '<option value="random">׳¨׳ ׳“׳•׳׳׳™</option>';
    uniqueTypes.forEach((type) => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        select.appendChild(option);
    });
    select.value = uniqueTypes.includes(selected) || selected === 'random' ? selected : 'random';
}

function renderRapidPatternButtons() {
    const container = rapidPatternArenaState.elements.buttons;
    if (!container) return;
    container.innerHTML = RAPID_PATTERN_BUTTONS.map(item => `
        <button type="button" class="rapid-pattern-btn" data-rapid-pattern-id="${escapeHtml(item.id)}">
            ${escapeHtml(item.label)}
            <span class="rapid-pattern-sub">${escapeHtml(item.hint)}</span>
        </button>
    `).join('');
}

function startRapidPatternSession() {
    stopRapidPatternTimer();
    clearRapidPatternNextTimer();
    hideRapidPatternExplanation({ resumeIfNeeded: false });
    setRapidPatternFocusMode(true);

    rapidPatternArenaState.active = true;
    rapidPatternArenaState.paused = false;
    rapidPatternArenaState.pauseReason = '';
    rapidPatternArenaState.pendingNextCue = false;
    rapidPatternArenaState.pausedRemainingMs = 0;
    rapidPatternArenaState.score = 0;
    rapidPatternArenaState.streak = 0;
    rapidPatternArenaState.round = 0;
    rapidPatternArenaState.errors = 0;
    rapidPatternArenaState.currentCue = null;
    rapidPatternArenaState.lastCueId = '';
    rapidPatternArenaState.history = [];
    hideRapidPatternHelpPanel();
    updateRapidPatternScoreboard();
    setRapidPatternTrafficLight('green');
    clearRapidPatternAiFeedback();
    playUISound('start');

    if (rapidPatternArenaState.elements.startBtn) {
        rapidPatternArenaState.elements.startBtn.textContent = '׳׳™׳₪׳•׳¡ ׳•׳”׳×׳—׳׳” ׳׳—׳“׳©';
    }
    setRapidPatternPauseButtonState(true, false);
    setRapidPatternHelpButtonState(true);
    updateRapidPatternExplainButtonState();

    moveToNextRapidPatternCue();
}

function setRapidPatternPauseButtonState(enabled, paused = false) {
    const btn = rapidPatternArenaState.elements.pauseBtn;
    if (!btn) return;
    const examMode = rapidPatternArenaState.mode === 'exam';
    btn.disabled = examMode || !enabled;
    btn.classList.toggle('is-hidden', examMode);
    btn.classList.toggle('is-paused', !!paused);
    btn.textContent = paused ? 'RESUME' : 'PAUSE';
}

function toggleRapidPatternPause() {
    if (rapidPatternArenaState.mode === 'exam') return;
    if (rapidPatternArenaState.paused) {
        resumeRapidPatternSession();
        return;
    }
    pauseRapidPatternSession('manual');
}

function pauseRapidPatternSession(reason = 'manual') {
    if (rapidPatternArenaState.mode === 'exam') return;
    if (!rapidPatternArenaState.active) return;

    rapidPatternArenaState.paused = true;
    rapidPatternArenaState.pauseReason = reason;
    rapidPatternArenaState.active = false;
    rapidPatternArenaState.pausedRemainingMs = Math.max(0, rapidPatternArenaState.endsAtMs - Date.now());
    stopRapidPatternTimer();
    clearRapidPatternNextTimer();
    setRapidPatternButtonsDisabled(true);
    setRapidPatternFeedback('׳”׳¡׳‘׳‘ ׳‘׳”׳©׳”׳™׳”. ׳׳—׳¦׳• RESUME ׳›׳“׳™ ׳׳”׳׳©׳™׳.', 'warn');
    if (reason === 'help') {
        setRapidPatternFeedback('HELP ׳₪׳×׳•׳—: ׳”׳¡׳‘׳‘ ׳‘׳”׳©׳”׳™׳”. ׳׳—׳¦׳• RESUME ׳›׳“׳™ ׳׳”׳׳©׳™׳.', 'warn');
    }
    if (reason === 'explain') {
        setRapidPatternFeedback('׳—׳׳•׳ ׳”׳”׳¡׳‘׳¨ ׳₪׳×׳•׳—: ׳”׳¡׳‘׳‘ ׳‘׳”׳©׳”׳™׳”. ׳׳—׳¦׳• "׳”׳‘׳ ׳×׳™, ׳׳׳©׳™׳›׳™׳" ׳›׳“׳™ ׳׳—׳–׳•׳¨.', 'warn');
    }
    setRapidPatternPauseButtonState(true, true);
    updateRapidPatternExplainButtonState();
}

function resumeRapidPatternSession() {
    if (!rapidPatternArenaState.paused) return;

    rapidPatternArenaState.paused = false;
    rapidPatternArenaState.pauseReason = '';
    rapidPatternArenaState.active = true;
    hideRapidPatternHelpPanel();
    hideRapidPatternExplanation({ resumeIfNeeded: false });
    setRapidPatternPauseButtonState(true, false);

    if (!rapidPatternArenaState.currentCue || rapidPatternArenaState.pendingNextCue) {
        rapidPatternArenaState.pendingNextCue = false;
        moveToNextRapidPatternCue();
        return;
    }

    const resumeMs = Math.max(200, rapidPatternArenaState.pausedRemainingMs || 0);
    rapidPatternArenaState.pausedRemainingMs = 0;
    setRapidPatternButtonsDisabled(false);
    updateRapidPatternExplainButtonState();
    setRapidPatternFeedback('׳”׳׳©׳ ׳¡׳‘׳‘: ׳–׳”׳” ׳׳× ׳”׳×׳‘׳ ׳™׳× ׳׳₪׳ ׳™ ׳©׳”׳–׳׳ ׳ ׳’׳׳¨.', 'info');
    startRapidPatternTimer(resumeMs);
}

function handleRapidPatternButtonClick(event) {
    const button = event.target.closest('button[data-rapid-pattern-id]');
    if (!button || button.disabled) return;
    if (!rapidPatternArenaState.active || !rapidPatternArenaState.currentCue) return;

    const chosenPattern = normalizeRapidPatternId(button.getAttribute('data-rapid-pattern-id') || '');
    if (!chosenPattern) return;

    const cue = rapidPatternArenaState.currentCue;
    const accepted = (Array.isArray(cue.acceptedPatterns) && cue.acceptedPatterns.length
        ? cue.acceptedPatterns
        : [cue.patternId]).map(normalizeRapidPatternId).filter(Boolean);
    const isCorrect = accepted.includes(chosenPattern);

    if (isCorrect) {
        handleRapidPatternCorrectAnswer(button, cue, chosenPattern);
        return;
    }
    handleRapidPatternWrongAnswer(button, cue, chosenPattern);
}

function handleRapidPatternCorrectAnswer(button, cue, resolvedPatternId = '') {
    stopRapidPatternTimer();
    setRapidPatternButtonsDisabled(true);

    const totalMs = Math.max(1000, rapidPatternArenaState.timeLimitSec * 1000);
    const remainingMs = Math.max(0, rapidPatternArenaState.endsAtMs - Date.now());
    const speedBonus = Math.round((remainingMs / totalMs) * 6);
    const normalizedPatternId = normalizeRapidPatternId(resolvedPatternId || cue.patternId);
    const assumptionsBonus = normalizedPatternId === 'assumptions' ? 1 : 0;
    const gained = 8 + Math.max(0, speedBonus) + assumptionsBonus;

    rapidPatternArenaState.score += gained;
    rapidPatternArenaState.streak += 1;
    button.classList.add('is-correct');
    setRapidPatternTrafficLight('green');
    setRapidPatternFeedback(`׳׳¢׳•׳׳”! ׳–׳™׳”׳•׳™ ׳׳“׳•׳™׳§ (+${gained} ׳ ׳§׳³).`, 'success');
    playUISound('correct');
    addXP(Math.max(2, Math.min(8, Math.round(gained / 2))));
    if (rapidPatternArenaState.streak > 0 && rapidPatternArenaState.streak % 5 === 0) {
        addStars(1);
        playUISound('stars_soft');
    }

    recordRapidPatternAttempt({
        cue,
        chosenPatternId: normalizedPatternId,
        isCorrect: true,
        outcome: 'correct',
        remainingMs
    });
    updateRapidPatternScoreboard();
    if (finishRapidPatternRoundIfNeeded()) return;
    queueNextRapidPatternCue();
}

function handleRapidPatternWrongAnswer(button, cue, chosenPattern = '') {
    rapidPatternArenaState.errors += 1;
    rapidPatternArenaState.streak = 0;
    button.classList.add('is-wrong');
    playUISound('wrong');

    if (rapidPatternArenaState.errors >= 2) {
        stopRapidPatternTimer();
        setRapidPatternButtonsDisabled(true);
        revealRapidPatternCorrectButton(normalizeRapidPatternId(cue.patternId));
        setRapidPatternTrafficLight('red');
        setRapidPatternFeedback(`׳˜׳¢׳•׳× ׳©׳ ׳™׳™׳”. ׳”׳×׳©׳•׳‘׳” ׳”׳™׳™׳×׳”: ${getRapidPatternLabel(normalizeRapidPatternId(cue.patternId))}.`, 'danger');
        updateRapidPatternScoreboard();
        recordRapidPatternAttempt({
            cue,
            chosenPatternId: normalizeRapidPatternId(chosenPattern),
            isCorrect: false,
            outcome: 'two_errors',
            remainingMs: Math.max(0, rapidPatternArenaState.endsAtMs - Date.now())
        });
        if (finishRapidPatternRoundIfNeeded()) return;
        queueNextRapidPatternCue();
        return;
    }

    setRapidPatternTrafficLight('yellow');
    setRapidPatternFeedback('׳˜׳¢׳•׳× ׳¨׳׳©׳•׳ ׳”. ׳ ׳¡׳• ׳©׳•׳‘ ׳׳₪׳ ׳™ ׳©׳ ׳’׳׳¨ ׳”׳–׳׳.', 'warn');
    updateRapidPatternScoreboard();
}

function handleRapidPatternTimeout() {
    const cue = rapidPatternArenaState.currentCue;
    if (!rapidPatternArenaState.active || !cue) return;
    stopRapidPatternTimer();

    rapidPatternArenaState.errors = 2;
    rapidPatternArenaState.streak = 0;
    setRapidPatternButtonsDisabled(true);
    revealRapidPatternCorrectButton(normalizeRapidPatternId(cue.patternId));
    setRapidPatternTrafficLight('red');
    setRapidPatternFeedback(`׳ ׳’׳׳¨ ׳”׳–׳׳! ׳”׳×׳©׳•׳‘׳”: ${getRapidPatternLabel(normalizeRapidPatternId(cue.patternId))}.`, 'danger');
    recordRapidPatternAttempt({
        cue,
        chosenPatternId: '',
        isCorrect: false,
        outcome: 'timeout',
        remainingMs: 0
    });
    playUISound('buzzer');
    updateRapidPatternScoreboard();
    if (finishRapidPatternRoundIfNeeded()) return;
    queueNextRapidPatternCue();
}

function queueNextRapidPatternCue() {
    clearRapidPatternNextTimer();
    rapidPatternArenaState.pendingNextCue = true;
    if (rapidPatternArenaState.paused || !rapidPatternArenaState.active) return;
    rapidPatternArenaState.nextTimer = window.setTimeout(() => {
        rapidPatternArenaState.pendingNextCue = false;
        moveToNextRapidPatternCue();
    }, RAPID_PATTERN_NEXT_DELAY_MS);
}

function moveToNextRapidPatternCue() {
    if (!rapidPatternArenaState.active || rapidPatternArenaState.paused) {
        rapidPatternArenaState.pendingNextCue = true;
        return;
    }
    stopRapidPatternTimer();
    clearRapidPatternNextTimer();
    clearRapidPatternButtonStates();
    hideRapidPatternHelpPanel();
    hideRapidPatternExplanation({ resumeIfNeeded: false });
    rapidPatternArenaState.pendingNextCue = false;

    const cue = pickRapidPatternCue();
    if (!cue) {
        setRapidPatternFeedback('׳׳ ׳ ׳׳¦׳׳• ׳׳•׳ ׳•׳׳•׳’׳™׳ ׳–׳׳™׳ ׳™׳ ׳׳׳¡׳ ׳ ׳©׳ ׳‘׳—׳¨.', 'warn');
        setRapidPatternButtonsDisabled(true);
        setRapidPatternPauseButtonState(false);
        setRapidPatternHelpButtonState(false);
        updateRapidPatternExplainButtonState();
        return;
    }

    rapidPatternArenaState.currentCue = cue;
    rapidPatternArenaState.errors = 0;
    rapidPatternArenaState.round += 1;
    updateRapidPatternScoreboard();
    setRapidPatternTrafficLight('green');
    setRapidPatternButtonsDisabled(false);
    setRapidPatternHelpButtonState(true);
    updateRapidPatternExplainButtonState();
    renderRapidPatternMonologue(cue);
    setRapidPatternFeedback('׳–׳”׳•/׳™ ׳׳× ׳”׳×׳‘׳ ׳™׳× ׳©׳ ׳”׳‘׳™׳˜׳•׳™ ׳”׳׳•׳“׳’׳©.', 'info');
    startRapidPatternTimer(null);
}

function getRapidPatternCuePool() {
    const selectedType = rapidPatternArenaState.elements.typeSelect?.value || 'random';
    if (selectedType === 'random') return RAPID_PATTERN_CUES;
    const filtered = RAPID_PATTERN_CUES.filter(item => item.type === selectedType);
    return filtered.length ? filtered : RAPID_PATTERN_CUES;
}

function pickRapidPatternCue() {
    const pool = getRapidPatternCuePool();
    if (!pool.length) return null;

    let options = pool;
    if (pool.length > 1 && rapidPatternArenaState.lastCueId) {
        const withoutLast = pool.filter(item => item.id !== rapidPatternArenaState.lastCueId);
        if (withoutLast.length) options = withoutLast;
    }

    const cue = options[Math.floor(Math.random() * options.length)];
    rapidPatternArenaState.lastCueId = cue.id;
    return cue;
}

function renderRapidPatternMonologue(cue) {
    const el = rapidPatternArenaState.elements.monologue;
    if (!el || !cue) return;
    const text = String(cue.monologue || '');
    const highlight = String(cue.highlight || '').trim();
    const lines = buildRapidMonologueLines(text, RAPID_PATTERN_CONTEXT_LINES, highlight);
    const token = '__RAPID_HIGHLIGHT_TOKEN__';
    el.innerHTML = lines.map((line) => {
        const escaped = escapeHtml(line || '');
        if (!highlight || !escaped.includes(token)) return escaped;
        return escaped.replace(token, `<mark class="rapid-highlight">${escapeHtml(highlight)}</mark>`);
    }).join('<br>');
}

function buildRapidMonologueLines(text, targetLines = 4, highlight = '') {
    const normalizedText = String(text || '').replace(/\s+/g, ' ').trim();
    if (!normalizedText) return [];
    const safeTarget = Math.max(1, targetLines);
    const token = '__RAPID_HIGHLIGHT_TOKEN__';
    const withToken = highlight && normalizedText.includes(highlight)
        ? normalizedText.replace(highlight, token)
        : normalizedText;

    const clauses = withToken
        .split(/(?<=[.!?])\s+|,\s+/)
        .map(item => item.trim())
        .filter(Boolean);

    let lines = clauses.length ? clauses : [withToken];
    if (lines.length < safeTarget) {
        const words = withToken.split(/\s+/).filter(Boolean);
        const chunkSize = Math.max(3, Math.ceil(words.length / safeTarget));
        const chunks = [];
        for (let i = 0; i < words.length; i += chunkSize) {
            chunks.push(words.slice(i, i + chunkSize).join(' '));
        }
        if (chunks.length >= lines.length) {
            lines = chunks;
        }
    }

    if (lines.length > safeTarget) {
        lines = [...lines.slice(0, safeTarget - 1), lines.slice(safeTarget - 1).join(' ')];
    }

    while (lines.length < safeTarget) {
        lines.push('');
    }

    if (highlight && !normalizedText.includes(highlight)) {
        return lines.map(line => line.replace(token, highlight));
    }
    return lines;
}

function recordRapidPatternAttempt({
    cue,
    chosenPatternId = '',
    isCorrect = false,
    outcome = 'unknown',
    remainingMs = 0
}) {
    if (!cue) return;
    const resolvedCorrectPatternId = normalizeRapidPatternId(cue.patternId || '');
    const resolvedChosenPatternId = normalizeRapidPatternId(chosenPatternId || '');
    rapidPatternArenaState.history.push({
        round: rapidPatternArenaState.round,
        cueId: cue.id || '',
        type: cue.type || '',
        statement: String(cue.monologue || ''),
        highlight: String(cue.highlight || ''),
        chosenPatternId: resolvedChosenPatternId,
        chosenPatternLabel: getRapidPatternLabel(resolvedChosenPatternId),
        correctPatternId: resolvedCorrectPatternId,
        correctPatternLabel: getRapidPatternLabel(resolvedCorrectPatternId),
        isCorrect: !!isCorrect,
        outcome,
        remainingMs: Math.max(0, Number(remainingMs) || 0)
    });
}

function finishRapidPatternRoundIfNeeded() {
    if (rapidPatternArenaState.round <= 0 || rapidPatternArenaState.round % RAPID_PATTERN_FEEDBACK_INTERVAL !== 0) {
        return false;
    }
    stopRapidPatternTimer();
    clearRapidPatternNextTimer();
    rapidPatternArenaState.active = false;
    rapidPatternArenaState.paused = false;
    rapidPatternArenaState.pauseReason = '';
    rapidPatternArenaState.pendingNextCue = false;
    rapidPatternArenaState.pausedRemainingMs = 0;
    hideRapidPatternHelpPanel();
    hideRapidPatternExplanation({ resumeIfNeeded: false });
    setRapidPatternButtonsDisabled(true);
    setRapidPatternPauseButtonState(false);
    setRapidPatternHelpButtonState(false);
    updateRapidPatternExplainButtonState();
    setRapidPatternTrafficLight('green');
    setRapidPatternFeedback(`׳¡׳™׳›׳•׳ AI ׳׳—׳¨׳™ ${RAPID_PATTERN_FEEDBACK_INTERVAL} ׳©׳׳׳•׳×.`, 'info');
    if (rapidPatternArenaState.elements.startBtn) {
        rapidPatternArenaState.elements.startBtn.textContent = `׳”׳×׳—׳ ${RAPID_PATTERN_FEEDBACK_INTERVAL} ׳©׳׳׳•׳× ׳—׳“׳©׳•׳×`;
    }
    renderRapidPatternAiFeedback();
    return true;
}

function clearRapidPatternAiFeedback() {
    const panel = rapidPatternArenaState.elements.aiFeedback;
    if (!panel) return;
    panel.innerHTML = '';
    panel.classList.add('hidden');
}

function renderRapidPatternAiFeedback() {
    const panel = rapidPatternArenaState.elements.aiFeedback;
    if (!panel) return;
    const history = rapidPatternArenaState.history.slice(-RAPID_PATTERN_FEEDBACK_INTERVAL);
    if (!history.length) {
        clearRapidPatternAiFeedback();
        return;
    }

    panel.innerHTML = buildRapidPatternAiFeedbackHtml(history);
    panel.classList.remove('hidden');
}

function buildRapidPatternAiFeedbackHtml(history) {
    const rounds = history.length;
    const correctCount = history.filter(item => item.isCorrect).length;
    const wrongCount = rounds - correctCount;
    const accuracy = rounds > 0 ? Math.round((correctCount / rounds) * 100) : 0;
    const avgRemainingMs = correctCount > 0
        ? Math.round(history.filter(item => item.isCorrect).reduce((sum, item) => sum + item.remainingMs, 0) / correctCount)
        : 0;

    const misses = history
        .filter(item => !item.isCorrect)
        .reduce((acc, item) => {
            const key = item.correctPatternId || 'unknown';
            if (!acc[key]) {
                acc[key] = {
                    id: key,
                    label: item.correctPatternLabel || getRapidPatternLabel(key),
                    count: 0,
                    examples: []
                };
            }
            acc[key].count += 1;
            if (acc[key].examples.length < 2) {
                acc[key].examples.push(item);
            }
            return acc;
        }, {});

    const topMisses = Object.values(misses).sort((a, b) => b.count - a.count).slice(0, 3);
    const strongHits = history
        .filter(item => item.isCorrect && item.remainingMs >= (rapidPatternArenaState.timeLimitSec * 1000 * 0.35))
        .slice(0, 2);

    const strengthsHtml = strongHits.length
        ? `<ul class="rapid-ai-list">${strongHits.map(item => `<li>${escapeHtml(item.highlight || item.statement)} -> ${escapeHtml(item.correctPatternLabel)}</li>`).join('')}</ul>`
        : '<p class="rapid-ai-note">׳¢׳“׳™׳™׳ ׳׳™׳ ׳׳¡׳₪׳™׳§ ׳”׳¦׳׳—׳•׳× ׳׳”׳™׳¨׳•׳×. ׳ ׳¡׳• ׳§׳•׳“׳ ׳׳–׳”׳•׳× ׳׳× ׳׳™׳׳× ׳”׳˜׳¨׳™׳’׳¨ ׳•׳¨׳§ ׳׳– ׳׳‘׳—׳•׳¨ ׳›׳₪׳×׳•׳¨.</p>';

    const missesHtml = topMisses.length
        ? `<ul class="rapid-ai-list">${topMisses.map(group => {
            const examples = group.examples.map(example => `<li>${escapeHtml(example.highlight || example.statement)} -> ׳×׳©׳•׳‘׳” ׳ ׳›׳•׳ ׳”: ${escapeHtml(group.label)}</li>`).join('');
            return `<li><strong>${escapeHtml(group.label)}</strong> (${group.count})<ul class="rapid-ai-sublist">${examples}</ul></li>`;
        }).join('')}</ul>`
        : '<p class="rapid-ai-note">׳׳¢׳•׳׳”: ׳׳™׳ ׳˜׳¢׳•׳™׳•׳× ׳‘׳‘׳׳•׳§ ׳”׳׳—׳¨׳•׳.</p>';

    const missingFocus = wrongCount >= 4
        ? '׳”׳׳׳¦׳”: ׳¢׳¦׳¨׳• ׳׳—׳¦׳™ ׳©׳ ׳™׳™׳” ׳¢׳ ׳”׳׳™׳׳” ׳”׳׳•׳“׳’׳©׳× ׳׳₪׳ ׳™ ׳‘׳—׳™׳¨׳”, ׳–׳” ׳׳•׳¨׳™׳“ ׳ ׳™׳—׳•׳©׳™׳.'
        : '׳”׳׳׳¦׳”: ׳”׳׳©׳™׳›׳• ׳‘׳׳•׳×׳• ׳§׳¦׳‘, ׳׳₪׳©׳¨ ׳’׳ ׳׳”׳•׳¨׳™׳“ ׳–׳׳ ׳›׳“׳™ ׳׳—׳“׳“ ׳“׳™׳•׳§.';

    const avgSeconds = (avgRemainingMs / 1000).toFixed(1);
    return `
        <h4>AI Coach: ׳¡׳™׳›׳•׳ ${rounds} ׳©׳׳׳•׳×</h4>
        <p>׳“׳™׳•׳§: <strong>${accuracy}%</strong> | ׳ ׳›׳•׳ ׳•׳×: <strong>${correctCount}/${rounds}</strong> | ׳–׳׳ ׳׳׳•׳¦׳¢ ׳©׳ ׳•׳×׳¨ ׳‘׳×׳©׳•׳‘׳•׳× ׳ ׳›׳•׳ ׳•׳×: <strong>${avgSeconds} ׳©׳ ׳³</strong></p>
        <p class="rapid-ai-title">׳׳” ׳—׳–׳§ ׳׳¦׳׳ ׳¢׳›׳©׳™׳•</p>
        ${strengthsHtml}
        <p class="rapid-ai-title">׳׳” ׳—׳¡׳¨ ׳׳• ׳‘׳¢׳™׳™׳×׳™ ׳›׳¨׳’׳¢</p>
        ${missesHtml}
        <p class="rapid-ai-summary">${escapeHtml(missingFocus)}</p>
        <p class="rapid-ai-summary">׳׳”׳׳©׳: ׳׳—׳¦׳• "׳׳™׳₪׳•׳¡ ׳•׳”׳×׳—׳׳” ׳׳—׳“׳©" ׳׳¢׳•׳“ ׳‘׳׳•׳§ ׳©׳ ${RAPID_PATTERN_FEEDBACK_INTERVAL} ׳©׳׳׳•׳×.</p>
    `;
}

function startRapidPatternTimer(remainingMsOverride = null) {
    stopRapidPatternTimer();
    const totalMs = Math.max(1000, rapidPatternArenaState.timeLimitSec * 1000);
    const activeDurationMs = remainingMsOverride === null
        ? totalMs
        : Math.max(120, Math.min(totalMs, Number(remainingMsOverride) || totalMs));
    rapidPatternArenaState.startedAtMs = Date.now() - (totalMs - activeDurationMs);
    rapidPatternArenaState.endsAtMs = Date.now() + activeDurationMs;
    updateRapidPatternTimerVisual(activeDurationMs);

    rapidPatternArenaState.tickTimer = window.setInterval(() => {
        if (!rapidPatternArenaState.active || !rapidPatternArenaState.currentCue) return;
        const remaining = rapidPatternArenaState.endsAtMs - Date.now();
        if (remaining <= 0) {
            updateRapidPatternTimerVisual(0);
            handleRapidPatternTimeout();
            return;
        }
        updateRapidPatternTimerVisual(remaining);
    }, 90);
}

function stopRapidPatternTimer() {
    if (rapidPatternArenaState.tickTimer) {
        clearInterval(rapidPatternArenaState.tickTimer);
        rapidPatternArenaState.tickTimer = null;
    }
}

function clearRapidPatternNextTimer() {
    if (rapidPatternArenaState.nextTimer) {
        clearTimeout(rapidPatternArenaState.nextTimer);
        rapidPatternArenaState.nextTimer = null;
    }
}

function updateRapidPatternTimerVisual(remainingOverride = null) {
    const fill = rapidPatternArenaState.elements.timerFill;
    if (!fill) return;
    const totalMs = Math.max(1000, rapidPatternArenaState.timeLimitSec * 1000);
    const remaining = remainingOverride === null
        ? Math.max(0, rapidPatternArenaState.endsAtMs - Date.now())
        : Math.max(0, remainingOverride);
    const ratio = Math.max(0, Math.min(1, remaining / totalMs));
    fill.style.transform = `scaleX(${ratio})`;
    fill.style.filter = ratio <= RAPID_PATTERN_WARNING_RATIO ? 'saturate(1.35)' : 'none';
}

function setRapidPatternFeedback(text, tone = 'info') {
    const el = rapidPatternArenaState.elements.feedback;
    if (!el) return;
    el.textContent = text;
    el.dataset.tone = tone;
}

function setRapidPatternTrafficLight(state) {
    const traffic = rapidPatternArenaState.elements.traffic;
    const errorsLabel = rapidPatternArenaState.elements.errorsLabel;
    if (traffic) traffic.dataset.state = state;
    if (errorsLabel) {
        const errors = Math.max(0, Math.min(2, rapidPatternArenaState.errors));
        errorsLabel.textContent = `׳˜׳¢׳•׳™׳•׳× ׳‘׳©׳׳׳”: ${errors}/2`;
    }
}

function setRapidPatternButtonsDisabled(disabled) {
    const container = rapidPatternArenaState.elements.buttons;
    if (!container) return;
    container.querySelectorAll('button[data-rapid-pattern-id]').forEach((btn) => {
        btn.disabled = !!disabled;
    });
}

function clearRapidPatternButtonStates() {
    const container = rapidPatternArenaState.elements.buttons;
    if (!container) return;
    container.querySelectorAll('button[data-rapid-pattern-id]').forEach((btn) => {
        btn.classList.remove('is-correct', 'is-wrong');
    });
}

function revealRapidPatternCorrectButton(patternId) {
    const container = rapidPatternArenaState.elements.buttons;
    const resolved = normalizeRapidPatternId(patternId);
    if (!container || !resolved) return;
    const button = container.querySelector(`button[data-rapid-pattern-id="${resolved}"]`);
    if (button) button.classList.add('is-correct');
}

function updateRapidPatternScoreboard() {
    const scoreEl = rapidPatternArenaState.elements.score;
    const streakEl = rapidPatternArenaState.elements.streak;
    const roundEl = rapidPatternArenaState.elements.round;
    if (scoreEl) scoreEl.textContent = String(rapidPatternArenaState.score);
    if (streakEl) streakEl.textContent = String(rapidPatternArenaState.streak);
    if (roundEl) roundEl.textContent = String(rapidPatternArenaState.round);
}

function getRapidPatternLabel(patternId) {
    const resolved = normalizeRapidPatternId(patternId);
    const found = RAPID_PATTERN_BUTTONS.find(item => item.id === resolved);
    return found?.label || resolved || patternId;
}

const WRINKLE_GAME_STORAGE_KEY = 'wrinkle_game_v1';
const WRINKLE_GAME_RETRY_MINUTES = 25;
const WRINKLE_GAME_INTERVAL_HOURS = [0, 24, 72, 168, 336, 720];

const WRINKLE_FOLD_LIBRARY = Object.freeze([
    {
        key: 'ABSOLUTE_IMPOSSIBLE',
        label: '׳׳™-׳™׳›׳•׳׳× ׳׳•׳—׳׳˜׳×',
        emoji: 'נ«',
        hiddenAssumption: '׳™׳© ׳₪׳” ׳”׳ ׳—׳” ׳©׳´׳׳™׳ ׳™׳›׳•׳׳× ׳‘׳©׳•׳ ׳׳¦׳‘׳´.',
        challengeQuestion: '׳‘׳׳׳× ׳‘׳©׳•׳ ׳׳¦׳‘? ׳׳” ׳›׳ ׳׳₪׳©׳¨ ׳׳¢׳©׳•׳× ׳›׳‘׳¨ ׳¢׳›׳©׳™׳• ׳‘-10 ׳“׳§׳•׳×?'
    },
    {
        key: 'NO_CHOICE',
        label: '׳׳™׳ ׳‘׳¨׳™׳¨׳” / ׳—׳™׳™׳‘',
        emoji: 'נ”’',
        hiddenAssumption: '׳™׳© ׳₪׳” ׳”׳ ׳—׳” ׳©׳׳™׳ ׳‘׳—׳™׳¨׳” ׳₪׳ ׳™׳׳™׳×.',
        challengeQuestion: '׳׳” ׳™׳§׳¨׳” ׳׳ ׳׳? ׳׳™׳–׳• ׳‘׳—׳™׳¨׳” ׳§׳˜׳ ׳” ׳›׳ ׳§׳™׳™׳׳× ׳₪׳”?'
    },
    {
        key: 'IDENTITY_LOCK',
        label: '׳–׳”׳•׳× ׳׳§׳•׳‘׳¢׳×',
        emoji: 'נ§±',
        hiddenAssumption: '׳”׳×׳ ׳”׳’׳•׳× ׳¨׳’׳¢׳™׳× ׳”׳•׳’׳“׳¨׳” ׳›׳´׳׳™ ׳©׳׳ ׳™/׳׳™ ׳©׳”׳•׳׳´.',
        challengeQuestion: '׳׳” ׳”׳•׳/׳׳×׳” ׳¢׳•׳©׳” ׳‘׳₪׳•׳¢׳ ׳©׳׳•׳‘׳™׳ ׳׳–׳”, ׳‘׳׳§׳•׳ ׳׳™ ׳”׳•׳?'
    },
    {
        key: 'GLOBAL_RULE',
        label: '׳”׳›׳׳׳” ׳’׳•׳¨׳₪׳×',
        emoji: 'נ',
        hiddenAssumption: '׳”׳׳©׳₪׳˜ ׳”׳•׳₪׳ ׳׳™׳¨׳•׳¢ ׳׳¡׳•׳™׳ ׳׳—׳•׳§ ׳’׳•׳¨׳£.',
        challengeQuestion: '׳×׳׳™׳“? ׳׳£ ׳₪׳¢׳? ׳×׳ ׳׳§׳¨׳” ׳׳—׳“ ׳©׳¡׳•׳×׳¨ ׳׳× ׳–׳”.'
    }
]);

const WRINKLE_BASE_CARDS = Object.freeze([
    { id: 'wr_001', statement: '׳׳ ׳™ ׳׳ ׳™׳›׳•׳ ׳׳”׳•׳‘׳™׳ ׳₪׳’׳™׳©׳” ׳¦׳•׳•׳×.', foldKey: 'ABSOLUTE_IMPOSSIBLE' },
    { id: 'wr_002', statement: '׳”׳•׳ ׳‘׳¢׳™׳™׳×׳™, ׳׳™ ׳׳₪׳©׳¨ ׳׳¢׳‘׳•׳“ ׳׳™׳×׳•.', foldKey: 'IDENTITY_LOCK' },
    { id: 'wr_003', statement: '׳׳ ׳™ ׳—׳™׳™׳‘ ׳׳”׳¡׳›׳™׳, ׳׳—׳¨׳× ׳”׳›׳•׳ ׳™׳×׳₪׳¨׳§.', foldKey: 'NO_CHOICE' },
    { id: 'wr_004', statement: '׳׳ ׳™ ׳×׳׳™׳“ ׳”׳•׳¨׳¡ ׳©׳™׳—׳•׳× ׳—׳©׳•׳‘׳•׳×.', foldKey: 'GLOBAL_RULE' },
    { id: 'wr_005', statement: '׳׳™׳ ׳׳™ ׳‘׳¨׳™׳¨׳”, ׳׳ ׳™ ׳—׳™׳™׳‘ ׳׳¢׳ ׳•׳× ׳׳›׳ ׳”׳•׳“׳¢׳” ׳׳™׳™׳“.', foldKey: 'NO_CHOICE' },
    { id: 'wr_006', statement: '׳׳ ׳™ ׳׳ ׳™׳›׳•׳ ׳׳”׳©׳×׳ ׳•׳× ׳‘׳›׳׳.', foldKey: 'ABSOLUTE_IMPOSSIBLE' },
    { id: 'wr_007', statement: '׳”׳™׳ ׳₪׳©׳•׳˜ ׳׳’׳•׳׳™׳¡׳˜׳™׳×, ׳–׳” ׳׳” ׳©׳”׳™׳.', foldKey: 'IDENTITY_LOCK' },
    { id: 'wr_008', statement: '׳›׳•׳׳ ׳׳–׳׳–׳׳™׳ ׳‘׳™ ׳›׳ ׳”׳–׳׳.', foldKey: 'GLOBAL_RULE' },
    { id: 'wr_009', statement: '׳׳™ ׳׳₪׳©׳¨ ׳׳”׳™׳¨׳’׳¢ ׳׳₪׳ ׳™ ׳©׳׳¡׳™׳™׳׳™׳ ׳”׳›׳•׳.', foldKey: 'ABSOLUTE_IMPOSSIBLE' },
    { id: 'wr_010', statement: '׳׳ ׳™ ׳׳•׳›׳¨׳— ׳׳”׳™׳•׳× ׳׳•׳©׳׳ ׳‘׳›׳ ׳׳©׳™׳׳”.', foldKey: 'NO_CHOICE' },
    { id: 'wr_011', statement: '׳׳ ׳™ ׳›׳™׳©׳׳•׳ ׳›׳©׳׳ ׳™ ׳׳×׳‘׳׳‘׳ ׳׳•׳ ׳׳ ׳©׳™׳.', foldKey: 'IDENTITY_LOCK' },
    { id: 'wr_012', statement: '׳׳£ ׳₪׳¢׳ ׳׳ ׳׳¦׳׳™׳— ׳׳™ ׳‘׳–׳׳.', foldKey: 'GLOBAL_RULE' }
]);

const DEFAULT_WRINKLE_GAME_STATS = Object.freeze({
    rounds: 0,
    perfect: 0,
    streak: 0,
    points: 0
});

let wrinkleGameState = {
    cards: [],
    currentCard: null,
    phase: 'expose',
    exposeOptions: [],
    challengeOptions: [],
    exposeFirstTry: true,
    challengeFirstTry: true,
    reviewAhead: false,
    stats: { ...DEFAULT_WRINKLE_GAME_STATS },
    elements: {}
};

function setupWrinkleGame() {
    const root = document.getElementById('wrinkle-game');
    if (!root) return;

    wrinkleGameState.elements = {
        root,
        stepLabel: document.getElementById('wrinkle-step-label'),
        statement: document.getElementById('wrinkle-statement'),
        options: document.getElementById('wrinkle-options'),
        feedback: document.getElementById('wrinkle-feedback'),
        nextBtn: document.getElementById('wrinkle-next-btn'),
        streak: document.getElementById('wrinkle-streak'),
        points: document.getElementById('wrinkle-points'),
        dueCount: document.getElementById('wrinkle-due-count'),
        fxLayer: document.getElementById('wrinkle-fx-layer'),
        selfInput: document.getElementById('wrinkle-self-input'),
        addSelfBtn: document.getElementById('wrinkle-add-self-btn'),
        selfList: document.getElementById('wrinkle-self-list')
    };

    loadWrinkleGameState();
    renderWrinkleSelfList();
    updateWrinkleScoreboard();

    wrinkleGameState.elements.options?.addEventListener('click', handleWrinkleOptionClick);
    wrinkleGameState.elements.nextBtn?.addEventListener('click', startWrinkleRound);
    wrinkleGameState.elements.addSelfBtn?.addEventListener('click', addSelfStatementToWrinkleGame);

    startWrinkleRound();
}

function loadWrinkleGameState() {
    let parsed = null;
    try {
        parsed = JSON.parse(localStorage.getItem(WRINKLE_GAME_STORAGE_KEY) || 'null');
    } catch (error) {
        parsed = null;
    }

    const savedCards = Array.isArray(parsed?.cards)
        ? parsed.cards.map(item => normalizeWrinkleCard(item)).filter(Boolean)
        : [];

    wrinkleGameState.cards = mergeWrinkleCards(savedCards);
    wrinkleGameState.stats = normalizeWrinkleStats(parsed?.stats);
}

function saveWrinkleGameState() {
    const payload = {
        cards: wrinkleGameState.cards,
        stats: wrinkleGameState.stats
    };
    localStorage.setItem(WRINKLE_GAME_STORAGE_KEY, JSON.stringify(payload));
}

function normalizeWrinkleStats(raw) {
    const merged = { ...DEFAULT_WRINKLE_GAME_STATS, ...(raw || {}) };
    merged.rounds = Math.max(0, Math.floor(Number(merged.rounds) || 0));
    merged.perfect = Math.max(0, Math.floor(Number(merged.perfect) || 0));
    merged.streak = Math.max(0, Math.floor(Number(merged.streak) || 0));
    merged.points = Math.max(0, Math.floor(Number(merged.points) || 0));
    return merged;
}

function normalizeWrinkleCard(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const statement = String(raw.statement || '').trim();
    if (!statement) return null;

    const safeFold = getWrinkleFoldByKey(raw.foldKey) ? raw.foldKey : 'NO_CHOICE';
    const sr = raw.sr || {};

    return {
        id: String(raw.id || `wr_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`),
        statement,
        foldKey: safeFold,
        source: raw.source === 'self' ? 'self' : 'seed',
        createdAt: Number(raw.createdAt) || Date.now(),
        sr: {
            box: clampWrinkleNumber(sr.box, 0, WRINKLE_GAME_INTERVAL_HOURS.length - 1, 0),
            dueAt: Number(sr.dueAt) || Date.now(),
            seen: Math.max(0, Math.floor(Number(sr.seen) || 0)),
            wins: Math.max(0, Math.floor(Number(sr.wins) || 0)),
            misses: Math.max(0, Math.floor(Number(sr.misses) || 0))
        }
    };
}

function mergeWrinkleCards(savedCards) {
    const byId = new Map();

    savedCards.forEach(card => {
        byId.set(card.id, card);
    });

    WRINKLE_BASE_CARDS.forEach(seed => {
        const existing = byId.get(seed.id);
        if (existing) {
            existing.statement = seed.statement;
            existing.foldKey = seed.foldKey;
            existing.source = 'seed';
            return;
        }

        const normalized = normalizeWrinkleCard({
            ...seed,
            source: 'seed',
            createdAt: Date.now(),
            sr: { box: 0, dueAt: Date.now(), seen: 0, wins: 0, misses: 0 }
        });
        if (normalized) byId.set(normalized.id, normalized);
    });

    return Array.from(byId.values());
}

function clampWrinkleNumber(value, min, max, fallback = min) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function getWrinkleFoldByKey(key) {
    return WRINKLE_FOLD_LIBRARY.find(item => item.key === key) || null;
}

function pickNextWrinkleCard() {
    if (!wrinkleGameState.cards.length) return null;

    const now = Date.now();
    const sorted = [...wrinkleGameState.cards].sort((a, b) => {
        const dueA = Number(a?.sr?.dueAt) || 0;
        const dueB = Number(b?.sr?.dueAt) || 0;
        if (dueA !== dueB) return dueA - dueB;
        const boxA = Number(a?.sr?.box) || 0;
        const boxB = Number(b?.sr?.box) || 0;
        return boxA - boxB;
    });

    const dueNow = sorted.filter(card => (Number(card?.sr?.dueAt) || 0) <= now);
    if (dueNow.length) {
        const pool = dueNow.slice(0, Math.min(4, dueNow.length));
        return {
            card: pool[Math.floor(Math.random() * pool.length)],
            isDueNow: true
        };
    }

    return {
        card: sorted[0],
        isDueNow: false
    };
}

function buildWrinkleExposeOptions(correctFoldKey) {
    const fold = getWrinkleFoldByKey(correctFoldKey);
    if (!fold) return [];
    const distractors = shuffleArray(WRINKLE_FOLD_LIBRARY.filter(item => item.key !== correctFoldKey)).slice(0, 3);
    return shuffleArray([fold, ...distractors]).map(item => ({
        key: item.key,
        label: `${item.emoji} ${item.label}`
    }));
}

function buildWrinkleChallengeOptions(correctFoldKey) {
    const fold = getWrinkleFoldByKey(correctFoldKey);
    if (!fold) return [];
    const distractors = shuffleArray(WRINKLE_FOLD_LIBRARY.filter(item => item.key !== correctFoldKey)).slice(0, 3);
    return shuffleArray([fold, ...distractors]).map(item => ({
        key: item.key,
        label: item.challengeQuestion
    }));
}

function startWrinkleRound() {
    const picked = pickNextWrinkleCard();
    if (!picked || !picked.card) {
        setWrinkleFeedback('׳׳™׳ ׳›׳¨׳’׳¢ ׳›׳¨׳˜׳™׳¡׳™׳ ׳–׳׳™׳ ׳™׳ ׳׳×׳¨׳’׳•׳.', 'warn');
        return;
    }

    wrinkleGameState.currentCard = picked.card;
    wrinkleGameState.reviewAhead = !picked.isDueNow;
    wrinkleGameState.phase = 'expose';
    wrinkleGameState.exposeFirstTry = true;
    wrinkleGameState.challengeFirstTry = true;
    wrinkleGameState.exposeOptions = buildWrinkleExposeOptions(picked.card.foldKey);
    wrinkleGameState.challengeOptions = buildWrinkleChallengeOptions(picked.card.foldKey);

    if (wrinkleGameState.elements.nextBtn) {
        wrinkleGameState.elements.nextBtn.classList.add('hidden');
    }

    if (picked.isDueNow) {
        setWrinkleFeedback('׳©׳׳‘ 1: ׳—׳©׳₪׳• ׳׳× ׳”׳”׳ ׳—׳” ׳”׳¡׳׳•׳™׳”, ׳•׳¨׳§ ׳׳—׳¨ ׳›׳ ׳¢׳‘׳¨׳• ׳׳©׳׳׳× ׳׳×׳’׳•׳¨.', 'info');
    } else {
        setWrinkleFeedback('׳”׳›׳¨׳˜׳™׳¡׳™׳ ׳”׳‘׳׳™׳ ׳׳×׳•׳–׳׳ ׳™׳ ׳׳¢׳×׳™׳“. ׳׳‘׳¦׳¢׳™׳ ׳—׳™׳–׳•׳§ ׳™׳–׳•׳.', 'warn');
    }

    renderWrinkleRound();
}

function renderWrinkleRound() {
    const card = wrinkleGameState.currentCard;
    if (!card) return;

    if (wrinkleGameState.elements.statement) {
        wrinkleGameState.elements.statement.textContent = card.statement;
    }

    if (wrinkleGameState.elements.stepLabel) {
        wrinkleGameState.elements.stepLabel.textContent = wrinkleGameState.phase === 'expose'
            ? '׳©׳׳‘ 1/2: ׳—׳©׳™׳₪׳× ׳”׳›׳׳×'
            : '׳©׳׳‘ 2/2: ׳‘׳—׳™׳¨׳× ׳©׳׳׳× ׳”׳׳×׳’׳•׳¨';
    }

    const options = wrinkleGameState.phase === 'expose'
        ? wrinkleGameState.exposeOptions
        : wrinkleGameState.challengeOptions;

    renderWrinkleOptions(options);
    updateWrinkleScoreboard();
}

function renderWrinkleOptions(options) {
    const container = wrinkleGameState.elements.options;
    if (!container) return;
    container.innerHTML = '';

    options.forEach(option => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn wrinkle-option-btn';
        button.dataset.value = option.key;
        button.textContent = option.label;
        container.appendChild(button);
    });
}

function handleWrinkleOptionClick(event) {
    const button = event.target.closest('.wrinkle-option-btn');
    if (!button || button.disabled || !wrinkleGameState.currentCard) return;

    const selectedKey = button.dataset.value;
    if (!selectedKey) return;

    if (wrinkleGameState.phase === 'expose') {
        handleWrinkleExposeChoice(selectedKey, button);
        return;
    }

    handleWrinkleChallengeChoice(selectedKey, button);
}

function handleWrinkleExposeChoice(selectedKey, button) {
    const card = wrinkleGameState.currentCard;
    if (!card) return;

    if (selectedKey === card.foldKey) {
        button.classList.add('is-correct');
        const fold = getWrinkleFoldByKey(card.foldKey);
        setWrinkleFeedback(`׳׳¢׳•׳׳”. ׳ ׳—׳©׳£ ׳”׳›׳׳×: ${fold?.hiddenAssumption || ''} ׳¢׳›׳©׳™׳• ׳‘׳—׳¨/׳™ ׳©׳׳׳× ׳׳×׳’׳•׳¨.`, 'success');
        playUISound('correct');
        wrinkleGameState.phase = 'challenge';
        renderWrinkleRound();
        return;
    }

    wrinkleGameState.exposeFirstTry = false;
    button.disabled = true;
    button.classList.add('is-wrong');
    const fold = getWrinkleFoldByKey(card.foldKey);
    setWrinkleFeedback(`׳¢׳“׳™׳™׳ ׳׳. ׳¨׳׳–: ${fold?.hiddenAssumption || '׳—׳₪׳©/׳™ ׳׳× ׳”׳”׳ ׳—׳” ׳©׳׳ ׳ ׳׳׳¨׳” ׳‘׳׳₪׳•׳¨׳©.'}`, 'warn');
    playUISound('wrong');
}

function handleWrinkleChallengeChoice(selectedKey, button) {
    const card = wrinkleGameState.currentCard;
    if (!card) return;

    if (selectedKey === card.foldKey) {
        button.classList.add('is-correct');
        completeWrinkleRound();
        return;
    }

    wrinkleGameState.challengeFirstTry = false;
    button.disabled = true;
    button.classList.add('is-wrong');
    const fold = getWrinkleFoldByKey(card.foldKey);
    setWrinkleFeedback(`׳›׳׳¢׳˜. ׳©׳׳׳× ׳”׳¢׳•׳’׳ ׳”׳׳“׳•׳™׳§׳× ׳›׳׳: "${fold?.challengeQuestion || ''}"`, 'warn');
    playUISound('wrong');
}

function completeWrinkleRound() {
    const card = wrinkleGameState.currentCard;
    if (!card) return;

    const fold = getWrinkleFoldByKey(card.foldKey);
    const hadMistake = !wrinkleGameState.exposeFirstTry || !wrinkleGameState.challengeFirstTry;
    const now = Date.now();

    card.sr.seen += 1;
    wrinkleGameState.stats.rounds += 1;

    if (hadMistake) {
        card.sr.misses += 1;
        card.sr.box = Math.max(0, card.sr.box - 1);
        card.sr.dueAt = now + WRINKLE_GAME_RETRY_MINUTES * 60 * 1000;
        wrinkleGameState.stats.streak = 0;
        wrinkleGameState.stats.points += card.source === 'self' ? 6 : 5;

        addXP(4);
        playUISound('hint');
        setWrinkleFeedback(
            `׳ ׳—׳©׳£ ׳”׳›׳׳× ׳׳—׳¨׳™ ׳×׳™׳§׳•׳. ׳”׳©׳׳׳” ׳”׳ ׳›׳•׳ ׳”: "${fold?.challengeQuestion || ''}". ׳ ׳—׳–׳•׳¨ ׳׳–׳” ׳‘׳¢׳•׳“ ${WRINKLE_GAME_RETRY_MINUTES} ׳“׳§׳•׳×.`,
            'success'
        );
    } else {
        card.sr.wins += 1;
        card.sr.box = Math.min(card.sr.box + 1, WRINKLE_GAME_INTERVAL_HOURS.length - 1);
        const nextHours = WRINKLE_GAME_INTERVAL_HOURS[card.sr.box] || 24;
        card.sr.dueAt = now + nextHours * 60 * 60 * 1000;
        wrinkleGameState.stats.streak += 1;
        wrinkleGameState.stats.perfect += 1;
        wrinkleGameState.stats.points += card.source === 'self' ? 14 : 12;

        addXP(8);
        if (wrinkleGameState.stats.streak > 0 && wrinkleGameState.stats.streak % 4 === 0) {
            addStars(1);
            playUISound('stars_big');
        } else {
            playUISound('correct');
        }

        const waitLabel = nextHours >= 24
            ? `${Math.round(nextHours / 24)} ׳™׳׳™׳`
            : `${nextHours} ׳©׳¢׳•׳×`;

        setWrinkleFeedback(
            `׳§׳¨׳¢׳× ׳׳× ׳”׳›׳׳×! "${fold?.challengeQuestion || ''}" ׳ ׳©׳׳¨ ׳׳”׳¨׳’׳ ׳׳•׳˜׳•׳׳˜׳™. ׳—׳–׳¨׳” ׳”׳‘׳׳” ׳‘׳¢׳•׳“ ${waitLabel}.`,
            'success'
        );
    }

    triggerWrinkleBreakFx();
    saveWrinkleGameState();
    updateWrinkleScoreboard();
    renderWrinkleSelfList();

    if (wrinkleGameState.elements.nextBtn) {
        wrinkleGameState.elements.nextBtn.classList.remove('hidden');
    }
}

function updateWrinkleScoreboard() {
    const dueCount = wrinkleGameState.cards.filter(card => (Number(card?.sr?.dueAt) || 0) <= Date.now()).length;

    if (wrinkleGameState.elements.streak) {
        wrinkleGameState.elements.streak.textContent = String(wrinkleGameState.stats.streak);
    }

    if (wrinkleGameState.elements.points) {
        wrinkleGameState.elements.points.textContent = String(wrinkleGameState.stats.points);
    }

    if (wrinkleGameState.elements.dueCount) {
        wrinkleGameState.elements.dueCount.textContent = String(dueCount);
    }
}

function setWrinkleFeedback(message, tone = 'info') {
    const feedback = wrinkleGameState.elements.feedback;
    if (!feedback) return;
    feedback.textContent = message;
    feedback.dataset.tone = tone;
}

function triggerWrinkleBreakFx() {
    const layer = wrinkleGameState.elements.fxLayer;
    if (!layer) return;

    layer.innerHTML = '';
    const brickChars = ['נ§±', 'נ§©'];
    const confettiChars = ['ג¨', 'נ‰', 'נ’¥', 'נ¨', 'נ¦'];

    for (let i = 0; i < 9; i += 1) {
        const brick = document.createElement('span');
        brick.className = 'wrinkle-brick';
        brick.textContent = brickChars[i % brickChars.length];
        brick.style.left = `${24 + Math.random() * 52}%`;
        brick.style.top = `${48 + Math.random() * 10}%`;
        brick.style.setProperty('--x', `${Math.round((Math.random() - 0.5) * 190)}px`);
        brick.style.setProperty('--r', `${Math.round((Math.random() - 0.5) * 220)}deg`);
        layer.appendChild(brick);
    }

    for (let i = 0; i < 18; i += 1) {
        const confetti = document.createElement('span');
        confetti.className = 'wrinkle-confetti';
        confetti.textContent = confettiChars[i % confettiChars.length];
        confetti.style.left = `${8 + Math.random() * 84}%`;
        confetti.style.top = `${10 + Math.random() * 16}%`;
        confetti.style.setProperty('--x', `${Math.round((Math.random() - 0.5) * 120)}px`);
        confetti.style.setProperty('--r', `${Math.round((Math.random() - 0.5) * 400)}deg`);
        layer.appendChild(confetti);
    }

    layer.classList.remove('is-active');
    void layer.offsetWidth;
    layer.classList.add('is-active');

    setTimeout(() => {
        if (!layer) return;
        layer.classList.remove('is-active');
        layer.innerHTML = '';
    }, 1200);
}

function addSelfStatementToWrinkleGame() {
    const input = wrinkleGameState.elements.selfInput;
    if (!input) return;

    const raw = input.value.trim();
    if (raw.length < 6) {
        setWrinkleFeedback('׳›׳×׳‘׳• ׳׳©׳₪׳˜ ׳׳™׳©׳™ ׳§׳¦׳¨ ׳›׳“׳™ ׳׳”׳•׳¡׳™׳£ ׳׳•׳×׳• ׳׳׳©׳—׳§.', 'warn');
        return;
    }

    const normalizedInput = normalizeText(raw).replace(/\s+/g, ' ').trim();
    const alreadyExists = wrinkleGameState.cards.some(card => normalizeText(card.statement).replace(/\s+/g, ' ').trim() === normalizedInput);

    if (alreadyExists) {
        setWrinkleFeedback('׳”׳׳©׳₪׳˜ ׳”׳–׳” ׳›׳‘׳¨ ׳§׳™׳™׳ ׳‘׳×׳¨׳’׳•׳. ׳ ׳¡׳• ׳ ׳™׳¡׳•׳— ׳׳—׳¨.', 'warn');
        return;
    }

    const foldKey = detectWrinkleFoldFromText(raw);
    const newCard = normalizeWrinkleCard({
        id: `wr_self_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
        statement: raw,
        foldKey,
        source: 'self',
        createdAt: Date.now(),
        sr: { box: 0, dueAt: Date.now(), seen: 0, wins: 0, misses: 0 }
    });

    if (!newCard) return;

    wrinkleGameState.cards.unshift(newCard);
    if (wrinkleGameState.cards.length > 240) {
        wrinkleGameState.cards = wrinkleGameState.cards.slice(0, 240);
    }

    input.value = '';
    const fold = getWrinkleFoldByKey(foldKey);
    setWrinkleFeedback(`׳ ׳•׳¡׳£ ׳׳©׳₪׳˜ ׳׳™׳©׳™ ׳¢׳ ׳›׳׳× ׳׳©׳•׳¢׳¨: ${fold?.label || '׳›׳׳׳™'}.`, 'success');
    playUISound('next');

    saveWrinkleGameState();
    renderWrinkleSelfList();
    updateWrinkleScoreboard();
}

function detectWrinkleFoldFromText(text) {
    const normalized = normalizeText(text);

    if (/(׳׳ ׳™׳›׳•׳|׳׳™ ׳׳₪׳©׳¨|׳׳™׳ ׳׳¦׳‘|׳‘׳׳×׳™ ׳׳₪׳©׳¨׳™|׳‘׳—׳™׳™׳ ׳׳)/.test(normalized)) {
        return 'ABSOLUTE_IMPOSSIBLE';
    }

    if (/(׳—׳™׳™׳‘|׳¦׳¨׳™׳|׳׳•׳›׳¨׳—|׳׳™׳ ׳‘׳¨׳™׳¨׳”|׳׳¡׳•׳¨ ׳׳™ ׳׳)/.test(normalized)) {
        return 'NO_CHOICE';
    }

    if (/(׳×׳׳™׳“|׳׳£ ׳₪׳¢׳|׳›׳•׳׳|׳›׳ ׳”׳–׳׳|׳׳£ ׳׳—׳“)/.test(normalized)) {
        return 'GLOBAL_RULE';
    }

    if (/(׳׳ ׳™ .*׳›׳™׳©׳׳•׳|׳׳ ׳™ .*׳“׳₪׳•׳§|׳”׳•׳ .*׳‘׳¢׳™׳™׳×׳™|׳”׳™׳ .*׳‘׳¢׳™׳™׳×׳™׳×|׳”׳•׳ .*׳¢׳¦׳׳|׳”׳™׳ .*׳¢׳¦׳׳ ׳™׳×|׳׳ ׳™ .*׳׳ ׳™׳•׳¦׳׳—)/.test(normalized)) {
        return 'IDENTITY_LOCK';
    }

    return 'NO_CHOICE';
}

function renderWrinkleSelfList() {
    const list = wrinkleGameState.elements.selfList;
    if (!list) return;
    list.innerHTML = '';

    const selfCards = wrinkleGameState.cards
        .filter(card => card.source === 'self')
        .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0))
        .slice(0, 5);

    if (!selfCards.length) {
        const empty = document.createElement('li');
        empty.className = 'muted';
        empty.textContent = '׳¢׳“׳™׳™׳ ׳׳ ׳”׳•׳–׳ ׳׳©׳₪׳˜ ׳׳™׳©׳™.';
        list.appendChild(empty);
        return;
    }

    selfCards.forEach(card => {
        const fold = getWrinkleFoldByKey(card.foldKey);
        const row = document.createElement('li');
        row.textContent = `ג€${card.statement}ג€ ג†’ ${fold?.label || '׳›׳׳× ׳›׳׳׳™'}`;
        list.appendChild(row);
    });
}

// Get Next Practice Statement
function getNextStatement() {
    const categorySelect = document.getElementById('category-select');
    const selectedCategory = categorySelect.value;
    
    let filteredStatements = metaModelData.practice_statements;
    
    if (selectedCategory) {
        filteredStatements = filteredStatements.filter(s => s.category === getCategoryName(selectedCategory));
    }
    
    if (filteredStatements.length === 0) {
        alert('׳׳™׳ ׳׳©׳₪׳˜׳™׳ ׳–׳׳™׳ ׳™׳ ׳‘׳§׳˜׳’׳•׳¨׳™׳” ׳–׳•');
        return;
    }
    
    // Get random statement
    currentStatementIndex = Math.floor(Math.random() * filteredStatements.length);
    const statement = filteredStatements[currentStatementIndex];
    
    // Display statement
    const statementBox = document.getElementById('practice-statement');
    statementBox.innerHTML = `<p>"${statement.statement}"</p>`;
    
    // Hide answer box
    hideAnswer();
    
    // Update practice count
    practiceCount++;
    document.getElementById('practice-count').textContent = practiceCount;
}

// Get Category Full Name
function getCategoryName(categoryId) {
    const categoryMap = {
        'deletion': 'DELETION',
        'distortion': 'DISTORTION',
        'generalization': 'GENERALIZATION'
    };
    return categoryMap[categoryId] || '';
}

// Show Answer
function showAnswer() {
    const categorySelect = document.getElementById('category-select');
    const selectedCategory = categorySelect.value;
    
    let filteredStatements = metaModelData.practice_statements;
    
    if (selectedCategory) {
        filteredStatements = filteredStatements.filter(s => s.category === getCategoryName(selectedCategory));
    }
    
    if (filteredStatements.length === 0) return;
    
    const statement = filteredStatements[currentStatementIndex];
    
    const answerBox = document.getElementById('practice-answer');
    const answerText = document.getElementById('answer-text');
    const answerExplanation = document.getElementById('answer-explanation');
    
    answerText.textContent = `נ¯ ${statement.suggested_question}`;
    answerExplanation.textContent = `נ’¡ ${statement.explanation} | ׳§׳˜׳’׳•׳¨׳™׳”: ${statement.violation}`;
    
    answerBox.classList.remove('hidden');
}

// Show Hint (legacy practice mode)
function showLegacyPracticeHint() {
    const categorySelect = document.getElementById('category-select');
    const selectedCategory = categorySelect.value;
    
    let filteredStatements = metaModelData.practice_statements;
    
    if (selectedCategory) {
        filteredStatements = filteredStatements.filter(s => s.category === getCategoryName(selectedCategory));
    }
    
    if (filteredStatements.length === 0) return;
    
    const statement = filteredStatements[currentStatementIndex];
    
    const hints = {
        'DELETION': 'נ” ׳׳—׳₪׳©׳™׳ ׳׳× ׳”׳׳™׳“׳¢ ׳”׳—׳¡׳¨ - ׳׳™? ׳׳”? ׳׳₪׳™ ׳׳™?',
        'DISTORTION': 'נ”„ ׳׳—׳₪׳©׳™׳ ׳׳× ׳”׳©׳™׳ ׳•׳™ ׳׳• ׳”׳”׳ ׳—׳” - ׳׳” ׳›׳׳ ׳׳ ׳‘׳“׳™׳•׳§? ׳׳” ׳׳•׳›׳?',
        'GENERALIZATION': 'נ“ˆ ׳׳—׳₪׳©׳™׳ ׳׳× ׳”׳”׳›׳׳׳” - ׳‘׳׳׳× ׳×׳׳™׳“? ׳‘׳׳׳× ׳׳£ ׳₪׳¢׳?'
    };
    
    const difficultyHint = {
        'easy': '׳”׳₪׳¨׳” ׳–׳• ׳׳ ׳›׳ ׳›׳ ׳׳•׳¨׳›׳‘׳× - ׳—׳©׳•׳‘ ׳¢׳ ׳₪׳¨׳˜׳™׳ ׳›׳•׳₪׳™׳',
        'medium': '׳–׳• ׳”׳₪׳¨׳” ׳׳¢׳˜ ׳™׳•׳×׳¨ ׳׳¡׳•׳‘׳›׳× - ׳—׳©׳•׳‘ ׳׳¢׳•׳׳§ ׳™׳•׳×׳¨',
        'hard': '׳–׳• ׳”׳₪׳¨׳” ׳׳¡׳•׳‘׳›׳× - ׳–׳§׳•׳§ ׳׳”׳¨׳‘׳” ׳›׳“׳™ ׳׳₪׳¨׳•׳§ ׳׳•׳×׳”'
    };
    
    alert(`׳˜׳™׳₪:\n\n${hints[statement.category] || ''}\n\n׳¨׳׳× ׳§׳©׳™׳•׳×: ${difficultyHint[statement.difficulty]}`);
}

// Hide Answer
function hideAnswer() {
    const answerBox = document.getElementById('practice-answer');
    answerBox.classList.add('hidden');
}

// ==================== TRAINER MODE (INTERACTIVE MCQ) ====================

function setupTrainerMode() {
    const startBtn = document.getElementById('start-trainer-btn');
    const categorySelect = document.getElementById('category-select');
    const hintTrigger = document.getElementById('hint-trigger');
    const whyTrigger = document.getElementById('why-trigger');
    const depthTrigger = document.getElementById('depth-trigger');
    const deletionGuideTrigger = document.getElementById('deletion-guide-trigger');
    const deletionGuideTriggerLive = document.getElementById('deletion-guide-trigger-live');
    const skipBtn = document.getElementById('skip-question-btn');

    if (!startBtn || !categorySelect) return;
    categorySelect.addEventListener('change', () => {
        playUISound('hint');
        syncDeletionGuideEntry(categorySelect.value);
    });
    
    startBtn.addEventListener('click', () => {
        const selectedCategory = categorySelect.value;
        if (!selectedCategory) {
            showHintMessage('׳‘׳—׳¨ ׳§׳˜׳’׳•׳¨׳™׳” ׳×׳—׳™׳׳”!');
            return;
        }
        startTrainer(selectedCategory);
    });
    
    if (hintTrigger) hintTrigger.addEventListener('click', showTrainerHint);
    if (whyTrigger) whyTrigger.addEventListener('click', showTrainerImportance);
    if (depthTrigger) depthTrigger.addEventListener('click', showTrainerDepth);
    if (deletionGuideTrigger) deletionGuideTrigger.addEventListener('click', showDeletionGuideFromEntry);
    if (deletionGuideTriggerLive) deletionGuideTriggerLive.addEventListener('click', showDeletionGuideFromLiveMode);
    if (skipBtn) skipBtn.addEventListener('click', skipCurrentQuestion);
    setupAudioMuteButtons();
    syncDeletionGuideEntry(categorySelect.value);
}

function isDeletionCategorySelected(categoryId = '') {
    return String(categoryId || '').toLowerCase() === 'deletion';
}

function buildDeletionGuideHtml() {
    return `
        <p><strong>׳׳™׳ ׳¢׳•׳‘׳“ ׳×׳¨׳’׳•׳ ׳׳—׳™׳§׳” (6 ׳׳₪׳©׳¨׳•׳™׳•׳×)?</strong></p>
        <p>׳‘׳›׳ ׳©׳׳׳” ׳×׳§׳‘׳/׳™ 6 ׳׳₪׳©׳¨׳•׳™׳•׳×: 3 ׳©׳׳׳•׳× ׳©׳׳™׳ ׳ ׳׳—׳™׳§׳”, ׳•-3 ׳©׳׳׳•׳× ׳׳—׳™׳§׳” ׳‘׳ ׳™׳¡׳•׳—׳™׳ ׳©׳•׳ ׳™׳.</p>
        <p><strong>׳”׳׳˜׳¨׳” ׳©׳׳:</strong> ׳׳‘׳—׳•׳¨ ׳׳× ׳©׳׳׳× ׳”׳׳—׳™׳§׳” ׳©׳—׳•׳©׳₪׳× ׳׳× ׳”׳׳™׳“׳¢ ׳”׳—׳¡׳¨ ׳”׳›׳™ ׳׳©׳׳¢׳•׳×׳™ ׳׳”׳§׳©׳¨.</p>
        <p><strong>׳“׳™׳¨׳•׳’ ׳׳™׳›׳•׳× ׳‘׳×׳•׳ ׳©׳׳׳•׳× ׳”׳׳—׳™׳§׳”:</strong></p>
        <ul>
            <li>׳¨׳׳” ׳’׳‘׳•׳”׳”: ׳—׳•׳©׳₪׳× ׳׳™׳“׳¢ ׳—׳¡׳¨ ׳§׳¨׳™׳˜׳™ ׳©׳׳׳₪׳©׳¨ ׳₪׳¢׳•׳׳” ׳׳™׳™׳“׳™׳×.</li>
            <li>׳¨׳׳” ׳‘׳™׳ ׳•׳ ׳™׳×: ׳׳—׳™׳§׳” ׳ ׳›׳•׳ ׳” ׳׳‘׳ ׳₪׳—׳•׳× ׳׳¨׳›׳–׳™׳× ׳׳”׳×׳§׳“׳׳•׳×.</li>
            <li>׳¨׳׳” ׳ ׳׳•׳›׳”: ׳׳—׳™׳§׳” ׳›׳׳׳™׳× ׳©׳׳ ׳×׳•׳¨׳׳× ׳׳¡׳₪׳™׳§ ׳׳₪׳×׳¨׳•׳.</li>
        </ul>
        <p><strong>׳˜׳™׳₪ ׳¢׳‘׳•׳“׳”:</strong> ׳׳₪׳ ׳™ ׳‘׳—׳™׳¨׳” ׳©׳׳/׳™ ׳׳” ׳—׳¡׳¨ ׳›׳׳ ׳›׳“׳™ ׳׳”׳‘׳™׳ ׳׳” ׳‘׳׳׳× ׳ ׳“׳¨׳©, ׳׳™ ׳׳¢׳•׳¨׳‘, ׳•׳׳₪׳™ ׳׳™׳–׳” ׳§׳¨׳™׳˜׳¨׳™׳•׳.</p>
    `;
}

function syncDeletionGuideEntry(categoryId = '') {
    const entryBox = document.getElementById('deletion-guide-entry');
    const entryDisplay = document.getElementById('deletion-guide-display');
    const liveBtn = document.getElementById('deletion-guide-trigger-live');
    const enabled = isDeletionCategorySelected(categoryId);

    if (entryBox) entryBox.classList.toggle('hidden', !enabled);
    if (!enabled && entryDisplay) {
        entryDisplay.classList.add('hidden');
        entryDisplay.classList.remove('visible');
    }

    if (liveBtn) {
        liveBtn.classList.toggle('hidden', !enabled);
    }
}

function showDeletionGuideFromEntry() {
    setPanelContent('deletion-guide-display', buildDeletionGuideHtml());
    playUISound('hint');
}

function showDeletionGuideFromLiveMode() {
    setPanelContent('depth-display', buildDeletionGuideHtml());
    playUISound('hint');
}

function showHintMessage(message) {
    const hintBox = document.getElementById('hint-box');
    const hintText = document.getElementById('hint-text');
    if (!hintBox || !hintText) return;
    hintText.textContent = message;
    hintBox.style.display = 'block';
    setTimeout(() => closeHint(), 4000);
}

function startTrainer(categoryId) {
    // Get statements for category
    let statements = metaModelData.practice_statements;
    
    if (categoryId) {
        const categoryName = getCategoryName(categoryId);
        statements = statements.filter(s => s.category === categoryName);
    }
    
    if (statements.length === 0) {
        showHintMessage('׳׳™׳ ׳׳©׳₪׳˜׳™׳ ׳׳§׳˜׳’׳•׳¨׳™׳” ׳–׳•');
        return;
    }
    
    const selectedQuestions = shuffleArray(statements).slice(0, Math.min(10, statements.length));

    // Initialize trainer state
    trainerState = {
        isActive: true,
        currentQuestion: 0,
        questions: selectedQuestions,
        selectedCategory: categoryId,
        phaseCorrectCount: 0,
        phaseSkippedCount: 0,
        sessionXP: 0,
        sessionStars: 0,
        answered: false,
        hintLevel: 0,
        reviewMode: false,
        reviewPool: [],
        reviewPoolKeys: {},
        mainTotalCount: selectedQuestions.length,
        mainCorrectCount: null,
        mainSkippedCount: null,
        reviewTotalCount: 0,
        reviewCorrectCount: 0,
        reviewSkippedCount: 0,
        didRecordSession: false,
        deletionCoachMode: isDeletionCategorySelected(categoryId),
        currentOptionSet: []
    };
    
    // Show trainer UI, hide start section
    document.getElementById('trainer-start').classList.add('hidden');
    document.getElementById('trainer-mode').classList.remove('hidden');
    syncDeletionGuideEntry(categoryId);
    if (trainerState.deletionCoachMode) {
        showDeletionGuideFromLiveMode();
    }

    playUISound('start');
    
    // Load first question
    loadNextQuestion();
}

function setPanelContent(panelId, html) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    panel.innerHTML = html;
    panel.classList.remove('hidden');
    panel.classList.add('visible');
}

function hidePanel(panelId) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    panel.classList.remove('visible');
    panel.classList.add('hidden');
}

function hideTrainerInfoPanels() {
    hidePanel('hint-display');
    hidePanel('why-display');
    hidePanel('depth-display');
}

function getTrainerQuestionKey(question) {
    return [
        question?.statement || '',
        question?.violation || '',
        question?.subcategory || '',
        question?.difficulty || ''
    ].join('::');
}

function addQuestionToReviewPool(question) {
    if (!question || trainerState.reviewMode) return;
    const key = getTrainerQuestionKey(question);
    if (trainerState.reviewPoolKeys[key]) return;
    trainerState.reviewPoolKeys[key] = true;
    trainerState.reviewPool.push(question);
}

function updateTrainerProgressNote() {
    const noteEl = document.getElementById('progress-note');
    if (!noteEl) return;
    const remaining = trainerState.questions.length - trainerState.currentQuestion - 1;
    const answeredCount = trainerState.currentQuestion - trainerState.phaseSkippedCount + (trainerState.answered ? 1 : 0);
    const modeLabel = trainerState.reviewMode ? 'Review Loop' : '׳¨׳™׳¦׳” ׳¨׳׳©׳™׳×';
    noteEl.textContent = `${modeLabel} | ׳ ׳©׳׳¨׳• ${Math.max(remaining, 0)} ׳©׳׳׳•׳× | ׳ ׳¢׳ ׳•: ${Math.max(answeredCount, 0)} | ׳“׳•׳׳’׳•: ${trainerState.phaseSkippedCount}`;
}

function loadNextQuestion() {
    if (trainerState.currentQuestion >= trainerState.questions.length) {
        endTrainerSession();
        return;
    }
    
    const question = trainerState.questions[trainerState.currentQuestion];
    trainerState.answered = false;
    trainerState.hintLevel = 0;
    
    // Update progress
    const progress = ((trainerState.currentQuestion) / trainerState.questions.length) * 100;
    document.getElementById('progress-fill').style.width = progress + '%';
    document.getElementById('current-q').textContent = trainerState.currentQuestion + 1;
    document.getElementById('total-q').textContent = trainerState.questions.length;
    const xpBadgeEl = document.getElementById('question-xp-badge');
    if (xpBadgeEl) xpBadgeEl.textContent = trainerState.reviewMode ? '+6 XP (Review)' : '+10 XP';
    
    // Display question
    const questionTextEl = document.getElementById('question-text');
    if (questionTextEl) {
        if (trainerState.deletionCoachMode) {
            questionTextEl.textContent = `׳׳˜׳¨׳× ׳”׳©׳׳׳”: ׳׳–׳”׳•׳× ׳׳× ׳”׳׳™׳“׳¢ ׳”׳—׳¡׳¨ ׳”׳›׳™ ׳׳©׳׳¢׳•׳×׳™ ׳‘׳׳©׳₪׳˜.\n\n${question.statement}`;
        } else {
            questionTextEl.textContent = question.statement;
        }
    }
    
    // Hide feedback
    document.getElementById('feedback-section').classList.remove('visible');
    document.getElementById('feedback-section').classList.add('hidden');
    hideTrainerInfoPanels();
    updateTrainerProgressNote();
    
    // Generate MCQ options
    generateMCQOptions(question);
}

// --- Trainer flow: improved progression, hints, depth and explanations ---
function generateMCQOptions(question) {
    const mcqContainer = document.getElementById('mcq-options');
    if (!mcqContainer) return;
    mcqContainer.innerHTML = '';

    if (trainerState.deletionCoachMode) {
        const optionSet = buildDeletionCoachOptionSet(question);
        trainerState.currentOptionSet = shuffleArray(optionSet.options);

        trainerState.currentOptionSet.forEach((option, index) => {
            const optionId = `option-${index}`;
            const optionHTML = `
                <div class="mcq-option">
                    <input type="radio" id="${optionId}" class="option-input" name="mcq" value="${escapeHtml(option.id)}">
                    <label for="${optionId}" class="option-label option-label-rich">
                        <span class="option-radio"></span>
                        <span class="option-text">
                            <span class="option-main">${escapeHtml(option.questionText)}</span>
                            <small class="option-purpose"><strong>׳׳˜׳¨׳”:</strong> ${escapeHtml(option.purpose)}</small>
                        </span>
                    </label>
                </div>
            `;

            mcqContainer.innerHTML += optionHTML;
            document.getElementById(optionId).addEventListener('change', (e) => {
                handleMCQSelection(e, question, option.id);
            });
        });
        return;
    }

    const violations = ['DELETION', 'DISTORTION', 'GENERALIZATION'];
    const shuffled = shuffleArray(violations);
    trainerState.currentOptionSet = [];
    shuffled.forEach((option, index) => {
        const optionId = `option-${index}`;
        const label = TRAINER_CATEGORY_LABELS[option] || option;

        const optionHTML = `
            <div class="mcq-option">
                <input type="radio" id="${optionId}" class="option-input" name="mcq" value="${option}">
                <label for="${optionId}" class="option-label">
                    <span class="option-radio"></span>
                    <span class="option-text">${label}</span>
                </label>
            </div>
        `;

        mcqContainer.innerHTML += optionHTML;
        document.getElementById(optionId).addEventListener('change', (e) => {
            handleMCQSelection(e, question, option);
        });
    });
}

function buildDeletionCoachOptionSet(question) {
    const subtype = String(question?.subcategory || '').toLowerCase();
    const statement = String(question?.statement || '');

    let highQuestion = question?.suggested_question || '׳׳” ׳‘׳“׳™׳•׳§ ׳—׳¡׳¨ ׳›׳׳ ׳›׳“׳™ ׳׳”׳‘׳™׳ ׳׳× ׳”׳׳©׳₪׳˜?';
    let mediumQuestion = '׳׳™׳–׳” ׳₪׳¨׳˜ ׳—׳¡׳¨ ׳›׳׳ ׳©׳™׳›׳•׳ ׳׳¢׳–׳•׳¨ ׳׳”׳‘׳™׳ ׳˜׳•׳‘ ׳™׳•׳×׳¨?';
    let lowQuestion = '׳™׳© ׳¢׳•׳“ ׳׳©׳”׳• ׳׳”׳•׳¡׳™׳£?';

    if (subtype.includes('comparative')) {
        highQuestion = '׳׳¢׳•׳׳× ׳׳™/׳׳”, ׳•׳‘׳׳™׳–׳” ׳׳“׳“ ׳׳“׳•׳™׳§ ׳”׳”׳©׳•׳•׳׳” ׳ ׳¢׳©׳™׳×?';
        mediumQuestion = '׳‘׳׳™׳–׳” ׳”׳§׳©׳¨ ׳”׳”׳©׳•׳•׳׳” ׳”׳–׳• ׳ ׳›׳•׳ ׳”?';
        lowQuestion = '׳׳₪׳©׳¨ ׳׳×׳× ׳¢׳•׳“ ׳“׳•׳’׳׳” ׳׳”׳©׳•׳•׳׳”?';
    } else if (subtype.includes('referential')) {
        highQuestion = '׳׳™ ׳‘׳“׳™׳•׳§ ׳׳׳¨/׳§׳‘׳¢/׳—׳•׳©׳‘ ׳׳× ׳–׳”, ׳•׳׳™׳–׳” ׳׳§׳•׳¨ ׳™׳© ׳׳›׳?';
        mediumQuestion = '׳¢׳ ׳׳™׳׳• ׳׳ ׳©׳™׳ ׳׳• ׳’׳•׳¨׳׳™׳ ׳׳“׳•׳‘׳¨ ׳›׳׳?';
        lowQuestion = '׳™׳© ׳¢׳•׳“ ׳׳™׳©׳”׳• ׳©׳§׳©׳•׳¨ ׳׳–׳”?';
    } else if (subtype.includes('simple')) {
        highQuestion = '׳׳” ׳‘׳“׳™׳•׳§ ׳׳ ׳˜׳•׳‘, ׳׳₪׳™ ׳׳™, ׳•׳‘׳׳™׳–׳” ׳§׳¨׳™׳˜׳¨׳™׳•׳ ׳–׳” ׳ ׳׳“׳“?';
        mediumQuestion = '׳׳×׳™ ׳–׳” ׳§׳•׳¨׳” ׳•׳‘׳׳™׳–׳” ׳׳¦׳‘ ׳–׳” ׳‘׳•׳׳˜ ׳™׳•׳×׳¨?';
        lowQuestion = '׳׳₪׳©׳¨ ׳׳₪׳¨׳˜ ׳§׳¦׳× ׳™׳•׳×׳¨?';
    }

    if (statement.includes('׳™׳•׳×׳¨') || statement.includes('׳₪׳—׳•׳×')) {
        highQuestion = '׳™׳•׳×׳¨/׳₪׳—׳•׳× ׳‘׳™׳—׳¡ ׳׳׳” ׳‘׳“׳™׳•׳§, ׳•׳‘׳׳™׳–׳• ׳™׳—׳™׳“׳× ׳׳“׳™׳“׳”?';
    }
    if (statement.includes('׳›׳•׳׳') || statement.includes('׳™׳“׳•׳¢')) {
        mediumQuestion = '׳׳™ ׳‘׳“׳™׳•׳§ \"׳›׳•׳׳\", ׳•׳׳™ ׳׳—׳•׳¥ ׳׳§׳‘׳•׳¦׳” ׳”׳–׳•?';
    }

    const options = [
        {
            id: 'D1',
            focus: 'DELETION',
            quality: 'high',
            purpose: '׳׳—׳©׳•׳£ ׳׳× ׳”׳׳™׳“׳¢ ׳”׳—׳¡׳¨ ׳”׳§׳¨׳™׳˜׳™ ׳©׳׳׳₪׳©׳¨ ׳׳”׳×׳§׳“׳ ׳‘׳₪׳•׳¢׳',
            questionText: highQuestion,
            why: '׳׳›׳•׳•׳ ׳× ׳׳׳™׳“׳¢ ׳©׳—׳¡׳¨ ׳‘׳׳׳× ׳׳”׳§׳©׳¨ ׳•׳׳‘׳™׳¦׳•׳¢.'
        },
        {
            id: 'D2',
            focus: 'DELETION',
            quality: 'medium',
            purpose: '׳׳—׳©׳•׳£ ׳׳—׳™׳§׳” ׳׳׳™׳×׳™׳× ׳׳‘׳ ׳₪׳—׳•׳× ׳׳¨׳›׳–׳™׳×',
            questionText: mediumQuestion,
            why: '׳©׳׳׳” ׳˜׳•׳‘׳”, ׳׳ ׳׳ ׳×׳׳™׳“ ׳”׳₪׳¢׳¨ ׳”׳›׳™ ׳׳©׳׳¢׳•׳×׳™ ׳‘׳׳©׳₪׳˜.'
        },
        {
            id: 'D3',
            focus: 'DELETION',
            quality: 'low',
            purpose: '׳׳—׳©׳•׳£ ׳׳—׳™׳§׳” ׳›׳׳׳™׳× ׳׳ ׳×׳¨׳•׳׳” ׳ ׳׳•׳›׳” ׳׳₪׳×׳¨׳•׳',
            questionText: lowQuestion,
            why: '׳©׳׳׳” ׳›׳׳׳™׳× ׳׳“׳™, ׳׳ ׳׳׳§׳“׳× ׳׳× ׳”׳׳™׳“׳¢ ׳”׳—׳¡׳¨ ׳”׳§׳¨׳™׳˜׳™.'
        },
        {
            id: 'N1',
            focus: 'DISTORTION',
            quality: 'offtrack',
            purpose: '׳‘׳“׳™׳§׳× ׳₪׳¨׳©׳ ׳•׳×/׳¡׳™׳‘׳×׳™׳•׳× (׳׳ ׳׳—׳™׳§׳”)',
            questionText: '׳׳™׳ ׳׳×׳” ׳™׳•׳“׳¢ ׳©׳–׳” ׳ ׳›׳•׳ ׳•׳׳” ׳”׳”׳•׳›׳—׳” ׳׳›׳?',
            why: '׳–׳• ׳©׳׳׳” ׳¢׳ ׳¢׳™׳•׳•׳× ׳•׳׳ ׳¢׳ ׳׳™׳“׳¢ ׳—׳¡׳¨.'
        },
        {
            id: 'N2',
            focus: 'GENERALIZATION',
            quality: 'offtrack',
            purpose: '׳‘׳“׳™׳§׳× ׳”׳›׳׳׳” ׳’׳•׳¨׳₪׳× (׳׳ ׳׳—׳™׳§׳”)',
            questionText: '׳–׳” ׳×׳׳™׳“ ׳§׳•׳¨׳”, ׳׳• ׳©׳™׳© ׳׳§׳¨׳™׳ ׳©׳–׳” ׳׳—׳¨׳×?',
            why: '׳–׳• ׳©׳׳׳” ׳¢׳ ׳”׳›׳׳׳”, ׳׳ ׳¢׳ ׳”׳©׳׳˜׳× ׳₪׳¨׳˜׳™׳.'
        },
        {
            id: 'N3',
            focus: 'NON_DELETION',
            quality: 'offtrack',
            purpose: '׳§׳₪׳™׳¦׳” ׳׳₪׳×׳¨׳•׳ ׳‘׳׳™ ׳׳׳₪׳•׳× ׳׳™׳“׳¢ ׳—׳¡׳¨',
            questionText: '׳׳” ׳›׳“׳׳™ ׳׳¢׳©׳•׳× ׳¢׳›׳©׳™׳• ׳›׳“׳™ ׳׳₪׳×׳•׳¨ ׳׳× ׳–׳” ׳׳”׳¨?',
            why: '׳©׳׳׳× ׳₪׳×׳¨׳•׳ ׳׳•׳§׳“׳ ׳‘׳׳™ ׳׳—׳©׳•׳£ ׳§׳•׳“׳ ׳׳× ׳”׳׳™׳“׳¢ ׳”׳—׳¡׳¨.'
        }
    ];

    return { options, bestId: 'D1' };
}

function evaluateDeletionCoachChoice(choice, question) {
    const baseXp = trainerState.reviewMode ? 6 : 10;
    const ranked = (trainerState.currentOptionSet || [])
        .filter(item => item.focus === 'DELETION')
        .sort((a, b) => {
            const rank = { high: 0, medium: 1, low: 2 };
            return (rank[a.quality] ?? 9) - (rank[b.quality] ?? 9);
        });

    if (!choice || choice.focus !== 'DELETION') {
        return {
            state: 'offtrack',
            xpGain: 0,
            countsAsCorrect: false,
            title: '׳׳ ׳׳“׳•׳™׳§',
            message: '׳ ׳‘׳—׳¨׳” ׳©׳׳׳” ׳©׳׳ ׳׳—׳₪׳©׳× ׳”׳©׳׳˜׳”. ׳›׳׳ ׳”׳׳˜׳¨׳” ׳”׳™׳ ׳׳—׳™׳§׳” ׳‘׳׳‘׳“.',
            ranked
        };
    }

    if (choice.quality === 'high') {
        return {
            state: 'best',
            xpGain: baseXp,
            countsAsCorrect: true,
            title: '׳׳¦׳•׳™׳ - ׳–׳• ׳”׳׳—׳™׳§׳” ׳”׳›׳™ ׳׳©׳׳¢׳•׳×׳™׳×',
            message: '׳‘׳—׳¨׳× ׳׳× ׳”׳©׳׳׳” ׳©׳׳—׳–׳™׳¨׳” ׳׳× ׳”׳׳™׳“׳¢ ׳”׳—׳¡׳¨ ׳”׳§׳¨׳™׳˜׳™ ׳‘׳™׳•׳×׳¨ ׳׳”׳§׳©׳¨.',
            ranked
        };
    }

    if (choice.quality === 'medium') {
        return {
            state: 'partial',
            xpGain: Math.max(2, Math.floor(baseXp * 0.5)),
            countsAsCorrect: false,
            title: '׳›׳™׳•׳•׳ ׳ ׳›׳•׳ ׳—׳׳§׳™׳×',
            message: '׳–׳• ׳©׳׳׳” ׳©׳׳׳×׳¨׳× ׳׳—׳™׳§׳”, ׳׳‘׳ ׳׳ ׳׳× ׳”׳”׳©׳׳˜׳” ׳”׳›׳™ ׳׳©׳׳¢׳•׳×׳™׳× ׳‘׳׳©׳₪׳˜.',
            ranked
        };
    }

    return {
        state: 'weak',
        xpGain: 1,
        countsAsCorrect: false,
        title: '׳–׳• ׳׳—׳™׳§׳”, ׳׳‘׳ ׳׳ ׳׳•׳¢׳™׳׳” ׳׳¡׳₪׳™׳§',
        message: '׳”׳©׳׳׳” ׳›׳׳׳™׳× ׳׳“׳™ ׳•׳׳›׳ ׳׳ ׳׳§׳“׳׳× ׳”׳‘׳ ׳” ׳׳• ׳₪׳¢׳•׳׳” ׳‘׳¦׳•׳¨׳” ׳˜׳•׳‘׳”.',
        ranked
    };
}

function showTrainerRewardEffect(starGain, result = 'fail') {
    const fx = document.getElementById('trainer-reward-fx');
    const display = document.getElementById('question-display');
    if (!fx || !display || starGain <= 0) return;

    const mainText = `+${starGain} ג­`;
    const subtitle = result === 'success'
        ? '׳‘׳•׳ ׳•׳¡ ׳”׳¦׳׳—׳”!'
        : result === 'partial'
            ? '׳›׳™׳•׳•׳ ׳˜׳•׳‘, ׳׳׳©׳™׳›׳™׳'
            : '׳׳•׳׳“׳™׳ ׳’׳ ׳׳–׳”';

    fx.classList.remove('hidden', 'show', 'success', 'partial', 'fail');
    display.classList.remove('reward-success', 'reward-partial', 'reward-fail');
    void fx.offsetWidth;

    fx.innerHTML = `
        <span class="reward-main">${escapeHtml(mainText)}</span>
        <small class="reward-sub">${escapeHtml(subtitle)}</small>
    `;
    fx.classList.add('show', result);
    display.classList.add(`reward-${result}`);

    if (trainerRewardEffectTimer) clearTimeout(trainerRewardEffectTimer);
    trainerRewardEffectTimer = setTimeout(() => {
        fx.classList.add('hidden');
        fx.classList.remove('show', 'success', 'partial', 'fail');
        display.classList.remove('reward-success', 'reward-partial', 'reward-fail');
    }, 900);
}

function awardTrainerStars(amount, result = 'fail') {
    const starGain = Math.max(0, Math.floor(Number(amount) || 0));
    if (!starGain) return 0;

    trainerState.sessionStars += starGain;
    addStars(starGain);
    showTrainerRewardEffect(starGain, result);

    if (result === 'success') playUISound('stars_big');
    else playUISound('stars_soft');

    return starGain;
}

function getTrainerStarReward(question, result = 'fail') {
    const safeResult = ['success', 'partial', 'fail'].includes(result) ? result : 'fail';
    const difficultyKey = String(question?.difficulty || 'easy').toLowerCase();
    const rewardSet = TRAINER_STAR_REWARDS[difficultyKey] || TRAINER_STAR_REWARDS.easy;
    const baseReward = rewardSet[safeResult] || TRAINER_STAR_REWARDS.easy.fail;

    // Review loop is for reinforcement, so rewards stay meaningful but lower.
    if (trainerState.reviewMode) {
        return Math.max(1, baseReward - 1);
    }
    return baseReward;
}

function handleMCQSelection(event, question, selectedOption) {
    if (trainerState.answered) return;
    trainerState.answered = true;

    if (trainerState.deletionCoachMode) {
        const selectedChoice = (trainerState.currentOptionSet || []).find(option => option.id === selectedOption);
        const evaluation = evaluateDeletionCoachChoice(selectedChoice, question);
        const starResult = evaluation.state === 'best' ? 'success' : evaluation.state === 'partial' ? 'partial' : 'fail';
        const starGain = getTrainerStarReward(question, starResult);

        if (evaluation.countsAsCorrect) {
            trainerState.phaseCorrectCount++;
        } else {
            addQuestionToReviewPool(question);
        }

        if (evaluation.xpGain > 0) {
            trainerState.sessionXP += evaluation.xpGain;
            addXP(evaluation.xpGain);
        }

        if (evaluation.state === 'best' || evaluation.state === 'partial') {
            playUISound('correct');
        } else {
            playUISound('wrong');
        }
        awardTrainerStars(starGain, starResult);

        showDeletionCoachFeedback(question, selectedChoice, evaluation, starGain);
        updateTrainerStats();
        return;
    }

    const correctCategory = getQuestionCategoryKey(question);
    const isCorrect = selectedOption === correctCategory;
    const xpGain = trainerState.reviewMode ? 6 : 10;
    const starGain = getTrainerStarReward(question, isCorrect ? 'success' : 'fail');

    if (isCorrect) {
        trainerState.phaseCorrectCount++;
        trainerState.sessionXP += xpGain;
        addXP(xpGain);
        playUISound('correct');
    } else {
        addQuestionToReviewPool(question);
        playUISound('wrong');
    }
    awardTrainerStars(starGain, isCorrect ? 'success' : 'fail');

    showFeedback(isCorrect, question, selectedOption, xpGain, starGain);
    updateTrainerStats();
}

function showDeletionCoachFeedback(question, selectedChoice, evaluation, starGain = 0) {
    const feedbackSection = document.getElementById('feedback-section');
    const feedbackContent = document.getElementById('feedback-content');
    if (!feedbackSection || !feedbackContent) return;

    const rankedHtml = (evaluation.ranked || []).map((item, index) => `
        <li>
            <strong>${index + 1}.</strong> ${escapeHtml(item.questionText)}<br>
            <small><strong>׳׳׳”:</strong> ${escapeHtml(item.why || '')}</small>
        </li>
    `).join('');

    const selectedText = selectedChoice?.questionText || '׳׳ ׳–׳•׳”׳×׳” ׳‘׳—׳™׳¨׳”';
    const boxClass = evaluation.state === 'best' ? 'correct' : 'incorrect';

    feedbackContent.innerHTML = `
        <div class="${boxClass}">
            <strong>${escapeHtml(evaluation.title || '')}</strong>
            <p class="explanation">
                <strong>׳׳˜׳¨׳× ׳”׳©׳׳׳” ׳›׳׳:</strong> ׳׳׳×׳¨ ׳׳× ׳”׳׳™׳“׳¢ ׳”׳—׳¡׳¨ ׳”׳׳©׳׳¢׳•׳×׳™ ׳‘׳™׳•׳×׳¨ ׳‘׳”׳©׳׳˜׳”.<br>
                <strong>׳”׳‘׳—׳™׳¨׳” ׳©׳׳:</strong> ${escapeHtml(selectedText)}<br>
                <strong>׳׳©׳•׳‘:</strong> ${escapeHtml(evaluation.message || '')}
            </p>
            <p class="explanation"><strong>׳“׳™׳¨׳•׳’ 3 ׳©׳׳׳•׳× ׳”׳׳—׳™׳§׳” ׳‘׳©׳׳׳” ׳”׳–׳•:</strong></p>
            <ol class="deletion-rank-list">${rankedHtml}</ol>
            <p style="margin-top: 12px; color: #2f855a; font-weight: bold;">+${evaluation.xpGain} XP</p>
            <p style="margin-top: 6px; color: #805ad5; font-weight: bold;">+${starGain} ג­</p>
        </div>
    `;

    feedbackSection.classList.remove('hidden');
    feedbackSection.classList.add('visible');

    const nextBtn = document.getElementById('next-question-btn');
    if (nextBtn) {
        nextBtn.onclick = () => {
            playUISound('next');
            trainerState.currentQuestion++;
            loadNextQuestion();
        };
    }

    updateTrainerProgressNote();
}

function showFeedback(isCorrect, question, selectedViolation, xpGain = 10, starGain = 0) {
    const feedbackSection = document.getElementById('feedback-section');
    const feedbackContent = document.getElementById('feedback-content');
    if (!feedbackSection || !feedbackContent) return;

    const correctCategory = getQuestionCategoryKey(question);
    const selectedLabel = TRAINER_CATEGORY_LABELS[selectedViolation] || selectedViolation;
    const correctLabel = TRAINER_CATEGORY_LABELS[correctCategory] || correctCategory;
    const violationName = question.violation || question.subcategory || '׳׳ ׳¦׳•׳™׳';

    let feedbackHTML = '';
    if (isCorrect) {
        feedbackHTML = `
            <div class="correct">
                <strong>ג… ׳ ׳›׳•׳!</strong>
                <p class="explanation">
                    <strong>׳§׳˜׳’׳•׳¨׳™׳”:</strong> ${correctLabel}<br>
                    <strong>׳¡׳•׳’ ׳”׳₪׳¨׳”:</strong> ${violationName}<br>
                    <strong>׳©׳׳׳× ׳¢׳•׳׳§ ׳׳•׳¦׳¢׳×:</strong> "${question.suggested_question}"<br>
                    <strong>׳”׳¡׳‘׳¨:</strong> ${question.explanation}
                </p>
                <p style="margin-top: 15px; color: #28a745; font-weight: bold;">+${xpGain} XP</p>
                <p style="margin-top: 6px; color: #805ad5; font-weight: bold;">+${starGain} ג­</p>
            </div>
        `;
    } else {
        feedbackHTML = `
            <div class="incorrect">
                <strong>ג ׳׳ ׳ ׳›׳•׳</strong>
                <p class="explanation">
                    <strong>׳‘׳—׳¨׳×:</strong> ${selectedLabel}<br>
                    <strong>׳”׳×׳©׳•׳‘׳” ׳”׳ ׳›׳•׳ ׳”:</strong> ${correctLabel}<br>
                    <strong>׳¡׳•׳’ ׳”׳₪׳¨׳”:</strong> ${violationName}<br>
                    <strong>׳©׳׳׳× ׳¢׳•׳׳§ ׳׳•׳¦׳¢׳×:</strong> "${question.suggested_question}"<br>
                    <strong>׳”׳¡׳‘׳¨:</strong> ${question.explanation}
                </p>
                <p style="margin-top: 12px; color: #744210; font-weight: bold;">+${starGain} ג­ ׳¢׳ ׳”׳׳׳™׳“׳”</p>
            </div>
        `;
    }

    feedbackContent.innerHTML = feedbackHTML;
    feedbackSection.classList.remove('hidden');
    feedbackSection.classList.add('visible');

    const nextBtn = document.getElementById('next-question-btn');
    if (nextBtn) {
        nextBtn.onclick = () => {
            playUISound('next');
            trainerState.currentQuestion++;
            loadNextQuestion();
        };
    }

    updateTrainerProgressNote();
}

function updateTrainerStats() {
    const attempted = trainerState.currentQuestion + (trainerState.answered ? 1 : 0) - trainerState.phaseSkippedCount;
    const safeAttempted = Math.max(attempted, 1);
    const successRate = Math.round((trainerState.phaseCorrectCount / safeAttempted) * 100);

    document.getElementById('correct-count').textContent = trainerState.phaseCorrectCount;
    document.getElementById('success-rate').textContent = `${successRate}%`;
    document.getElementById('session-xp').textContent = trainerState.sessionXP;
    const starsEl = document.getElementById('session-stars');
    if (starsEl) starsEl.textContent = trainerState.sessionStars;
}

function showTrainerHint() {
    if (trainerState.currentQuestion >= trainerState.questions.length) return;
    const question = trainerState.questions[trainerState.currentQuestion];
    const categoryKey = getQuestionCategoryKey(question);
    const statementText = question.statement || '';

    if (trainerState.deletionCoachMode) {
        trainerState.hintLevel = Math.min(trainerState.hintLevel + 1, 3);
        let hintHtml = '';
        if (trainerState.hintLevel === 1) {
            hintHtml = '<p><strong>׳¨׳׳– 1/3:</strong> ׳—׳₪׳©/׳™ ׳׳” ׳—׳¡׳¨ ׳›׳“׳™ ׳׳”׳‘׳™׳ ׳׳× ׳”׳׳©׳₪׳˜ ׳‘׳¨׳׳× ׳‘׳™׳¦׳•׳¢, ׳׳ ׳¨׳§ ׳‘׳¨׳׳× ׳ ׳™׳¡׳•׳—.</p>';
        } else if (trainerState.hintLevel === 2) {
            hintHtml = '<p><strong>׳¨׳׳– 2/3:</strong> ׳‘׳™׳ 3 ׳©׳׳׳•׳× ׳”׳׳—׳™׳§׳”, ׳‘׳—׳¨/׳™ ׳׳× ׳–׳• ׳©׳׳—׳–׳™׳¨׳” ׳§׳¨׳™׳˜׳¨׳™׳•׳/׳’׳•׳¨׳/׳׳“׳“ ׳©׳׳׳₪׳©׳¨׳™׳ ׳₪׳¢׳•׳׳”.</p>';
        } else {
            hintHtml = `<p><strong>׳¨׳׳– 3/3:</strong> ׳©׳׳׳× ׳׳—׳™׳§׳” ׳—׳–׳§׳” ׳‘׳“׳¨׳ ׳›׳׳ ׳›׳•׳׳׳×: <em>׳׳™ ׳‘׳“׳™׳•׳§ / ׳׳” ׳‘׳“׳™׳•׳§ / ׳׳₪׳™ ׳׳™׳–׳” ׳§׳¨׳™׳˜׳¨׳™׳•׳</em>.</p><p>׳“׳•׳’׳׳”: "${escapeHtml(question.suggested_question || '')}"</p>`;
        }
        setPanelContent('hint-display', hintHtml);
        playUISound('hint');
        return;
    }

    trainerState.hintLevel = Math.min(trainerState.hintLevel + 1, 3);

    const categoryHint = {
        DELETION: '׳‘׳“׳•׳§ ׳׳” ׳—׳¡׳¨ ׳‘׳׳©׳₪׳˜: ׳׳™? ׳׳”? ׳׳×׳™? ׳׳₪׳™ ׳׳”?',
        DISTORTION: '׳‘׳“׳•׳§ ׳׳™׳₪׳” ׳™׳© ׳”׳ ׳—׳” ׳׳• ׳§׳©׳¨ ׳¡׳™׳‘׳”-׳×׳•׳¦׳׳” ׳©׳׳ ׳”׳•׳›׳—.',
        GENERALIZATION: '׳‘׳“׳•׳§ ׳׳™׳׳™׳ ׳׳•׳—׳׳˜׳•׳× ׳›׳׳• ׳×׳׳™׳“/׳׳£ ׳₪׳¢׳/׳›׳•׳׳/׳׳™ ׳׳₪׳©׳¨.'
    }[categoryKey] || '׳‘׳“׳•׳§ ׳׳™׳–׳• ׳׳™׳׳” ׳‘׳׳©׳₪׳˜ ׳¡׳•׳’׳¨׳× ׳׳₪׳©׳¨׳•׳™׳•׳×.';

    const triggerWords = ['׳×׳׳™׳“', '׳׳£ ׳₪׳¢׳', '׳›׳•׳׳', '׳—׳™׳™׳‘', '׳׳ ׳™׳›׳•׳', '׳’׳¨׳ ׳׳™', '׳™׳•׳“׳¢ ׳©', '׳‘׳¨׳•׳¨ ׳©']
        .filter(word => statementText.includes(word));
    const triggerLine = triggerWords.length
        ? `׳׳™׳׳•׳× ׳˜׳¨׳™׳’׳¨ ׳‘׳׳©׳₪׳˜: ${triggerWords.join(', ')}`
        : '׳ ׳¡׳” ׳׳–׳”׳•׳× ׳׳™׳׳” ׳©׳׳§׳‘׳¢׳× ׳׳¡׳§׳ ׳” ׳‘׳׳™ ׳₪׳™׳¨׳•׳˜.';

    let hintHtml = '';
    if (trainerState.hintLevel === 1) {
        hintHtml = `<p><strong>׳¨׳׳– 1/3:</strong> ${categoryHint}</p>`;
    } else if (trainerState.hintLevel === 2) {
        hintHtml = `<p><strong>׳¨׳׳– 2/3:</strong> ${triggerLine}</p><p>׳¢׳›׳©׳™׳• ׳ ׳¡׳— ׳©׳׳׳” ׳§׳¦׳¨׳” ׳©׳×׳₪׳¨׳§ ׳׳× ׳”׳”׳ ׳—׳”.</p>`;
    } else {
        hintHtml = `<p><strong>׳¨׳׳– 3/3:</strong> ׳”׳§׳˜׳’׳•׳¨׳™׳” ׳”׳™׳ <strong>${TRAINER_CATEGORY_LABELS[categoryKey] || categoryKey}</strong>.</p><p>׳©׳׳׳” ׳׳•׳¦׳¢׳×: "${question.suggested_question}"</p>`;
    }

    setPanelContent('hint-display', hintHtml);
    playUISound('hint');
}

function showTrainerImportance() {
    if (trainerState.currentQuestion >= trainerState.questions.length) return;
    const question = trainerState.questions[trainerState.currentQuestion];
    const categoryKey = getQuestionCategoryKey(question);

    if (trainerState.deletionCoachMode) {
        setPanelContent('why-display', `
            <p><strong>׳׳˜׳¨׳× ׳”׳©׳׳׳” ׳›׳׳:</strong></p>
            <p>׳׳ ׳¨׳§ ׳׳–׳”׳•׳× ׳©׳™׳© ׳׳—׳™׳§׳”, ׳׳׳ ׳׳‘׳—׳•׳¨ ׳׳× ׳©׳׳׳× ׳”׳׳—׳™׳§׳” ׳©׳—׳•׳©׳₪׳× ׳׳× ׳”׳׳™׳“׳¢ ׳”׳—׳¡׳¨ ׳”׳›׳™ ׳׳©׳׳¢׳•׳×׳™ ׳׳”׳‘׳ ׳” ׳•׳׳₪׳¢׳•׳׳”.</p>
            <p><strong>׳׳™׳ ׳׳•׳“׳“׳™׳ ׳׳™׳›׳•׳×?</strong></p>
            <ul>
                <li>׳’׳‘׳•׳”: ׳׳—׳–׳™׳¨ ׳₪׳¨׳˜ ׳§׳¨׳™׳˜׳™ ׳©׳—׳¡׳¨ ׳׳”׳—׳׳˜׳”/׳‘׳™׳¦׳•׳¢.</li>
                <li>׳‘׳™׳ ׳•׳ ׳™: ׳©׳׳׳” ׳ ׳›׳•׳ ׳” ׳¢׳ ׳׳—׳™׳§׳”, ׳׳‘׳ ׳₪׳—׳•׳× ׳׳׳•׳§׳“׳× ׳‘׳׳” ׳©׳™׳§׳“׳ ׳×׳•׳¦׳׳”.</li>
                <li>׳ ׳׳•׳: ׳©׳׳׳” ׳›׳׳׳™׳× ׳׳“׳™, ׳›׳׳¢׳˜ ׳‘׳׳™ ׳×׳¨׳•׳׳” ׳₪׳¨׳§׳˜׳™׳×.</li>
            </ul>
            <p><strong>׳‘׳“׳™׳§׳” ׳¢׳¦׳׳™׳× ׳§׳¦׳¨׳”:</strong> ׳”׳׳ ׳”׳©׳׳׳” ׳©׳‘׳—׳¨׳× ׳׳•׳¡׳™׳₪׳” ׳׳™׳“׳¢ ׳©׳׳₪׳©׳¨ ׳׳¢׳‘׳•׳“ ׳׳™׳×׳• ׳׳™׳“?</p>
        `);
        playUISound('hint');
        return;
    }

    const importanceText = {
        DELETION: '׳›׳©׳׳™׳“׳¢ ׳ ׳׳—׳§, ׳”׳׳¡׳§׳ ׳” ׳ ׳‘׳ ׳™׳× ׳¢׳ ׳—׳•׳¡׳¨ ׳ ׳×׳•׳ ׳™׳. ׳”׳©׳׳׳” ׳׳—׳–׳™׳¨׳” ׳₪׳¨׳˜׳™׳ ׳”׳›׳¨׳—׳™׳™׳.',
        DISTORTION: '׳›׳©׳™׳© ׳¢׳™׳•׳•׳×, ׳₪׳™׳¨׳•׳© ׳”׳•׳₪׳ ׳׳¢׳•׳‘׳“׳”. ׳”׳©׳׳׳” ׳׳₪׳¨׳™׳“׳” ׳‘׳™׳ ׳₪׳¨׳©׳ ׳•׳× ׳׳׳¦׳™׳׳•׳×.',
        GENERALIZATION: '׳›׳©׳™׳© ׳”׳›׳׳׳”, ׳׳§׳¨׳” ׳׳—׳“ ׳”׳•׳₪׳ ׳׳—׳•׳§. ׳”׳©׳׳׳” ׳₪׳•׳×׳—׳× ׳™׳•׳×׳¨ ׳׳₪׳©׳¨׳•׳™׳•׳× ׳×׳’׳•׳‘׳”.'
    }[categoryKey] || '׳”׳©׳׳׳” ׳׳—׳–׳™׳¨׳” ׳“׳™׳•׳§ ׳•׳׳׳₪׳©׳¨׳× ׳×׳’׳•׳‘׳” ׳˜׳•׳‘׳” ׳™׳•׳×׳¨.';

    setPanelContent('why-display', `
        <p><strong>׳׳׳” ׳–׳” ׳—׳©׳•׳‘ ׳‘׳©׳׳׳” ׳”׳–׳•?</strong></p>
        <p>${importanceText}</p>
        <p><strong>׳׳” ׳”׳׳˜׳¨׳” ׳›׳׳?</strong> ׳׳”׳₪׳•׳ ׳׳׳™׳¨׳” ׳›׳׳׳™׳× ׳׳׳™׳“׳¢ ׳׳“׳•׳™׳§ ׳©׳׳₪׳©׳¨ ׳׳¢׳‘׳•׳“ ׳׳™׳×׳•.</p>
    `);
    playUISound('hint');
}

function showTrainerDepth() {
    if (trainerState.currentQuestion >= trainerState.questions.length) return;
    const question = trainerState.questions[trainerState.currentQuestion];

    if (trainerState.deletionCoachMode) {
        setPanelContent('depth-display', `
            <p><strong>׳׳¡׳’׳¨׳× ׳₪׳×׳¨׳•׳ ׳׳׳—׳™׳§׳” (6 ׳׳₪׳©׳¨׳•׳™׳•׳×):</strong></p>
            <ul>
                <li>׳©׳׳‘ 1: ׳–׳”׳” ׳׳” ׳—׳¡׳¨ ׳‘׳׳©׳₪׳˜ ׳›׳“׳™ ׳׳”׳‘׳™׳ ׳׳× ׳”׳”׳§׳©׳¨ ׳‘׳₪׳•׳¢׳.</li>
                <li>׳©׳׳‘ 2: ׳¡׳ ׳ 3 ׳׳₪׳©׳¨׳•׳™׳•׳× ׳©׳׳™׳ ׳ ׳׳—׳™׳§׳”.</li>
                <li>׳©׳׳‘ 3: ׳‘׳™׳ 3 ׳©׳׳׳•׳× ׳”׳׳—׳™׳§׳”, ׳“׳¨׳’ ׳׳₪׳™ ׳×׳¨׳•׳׳”: ׳’׳‘׳•׳”׳”, ׳‘׳™׳ ׳•׳ ׳™׳×, ׳ ׳׳•׳›׳”.</li>
                <li>׳©׳׳‘ 4: ׳‘׳—׳¨ ׳׳× ׳”׳©׳׳׳” ׳©׳׳—׳–׳™׳¨׳” ׳׳™׳“׳¢ ׳׳“׳™׳“/׳‘׳¨-׳‘׳“׳™׳§׳”/׳׳›׳•׳•׳ ׳₪׳¢׳•׳׳”.</li>
            </ul>
            <p><strong>׳׳˜׳¨׳× ׳”׳©׳׳׳”:</strong> ׳—׳©׳™׳₪׳× ׳”׳׳™׳“׳¢ ׳”׳—׳¡׳¨ ׳”׳׳©׳׳¢׳•׳×׳™ ׳‘׳™׳•׳×׳¨, ׳׳ ׳¨׳§ \"׳¢׳•׳“ ׳₪׳™׳¨׳•׳˜\".</p>
            <p><strong>׳“׳•׳’׳׳× ׳׳—׳™׳§׳” ׳—׳–׳§׳”:</strong> "${escapeHtml(question.suggested_question || '')}"</p>
        `);
        playUISound('hint');
        return;
    }

    const depthTrack = {
        easy: ['׳©׳׳‘ 1: ׳–׳”׳” ׳׳™׳׳” ׳‘׳¢׳™׳™׳×׳™׳×.', '׳©׳׳‘ 2: ׳©׳׳ ׳׳” ׳—׳¡׳¨.', '׳©׳׳‘ 3: ׳ ׳¡׳— ׳©׳׳׳” ׳׳—׳× ׳׳“׳•׳™׳§׳×.'],
        medium: ['׳©׳׳‘ 1: ׳–׳”׳” ׳”׳ ׳—׳” ׳¡׳׳•׳™׳”.', '׳©׳׳‘ 2: ׳‘׳“׳•׳§ ׳¨׳׳™׳•׳×.', '׳©׳׳‘ 3: ׳ ׳¡׳— ׳—׳׳•׳₪׳” ׳׳“׳•׳™׳§׳×.'],
        hard: ['׳©׳׳‘ 1: ׳–׳”׳” ׳“׳₪׳•׳¡ ׳©׳₪׳”.', '׳©׳׳‘ 2: ׳׳₪׳” E/B/C/V/I/S ׳‘׳§׳¦׳¨׳”.', '׳©׳׳‘ 3: ׳‘׳—׳¨ Small Win ׳׳”׳×׳§׳“׳׳•׳×.']
    }[question.difficulty] || ['׳©׳׳‘ 1: ׳–׳”׳” ׳“׳₪׳•׳¡.', '׳©׳׳‘ 2: ׳©׳׳ ׳׳” ׳—׳¡׳¨.', '׳©׳׳‘ 3: ׳‘׳ ׳” ׳©׳׳׳” ׳׳“׳•׳™׳§׳×.'];

    setPanelContent('depth-display', `
        <p><strong>׳¢׳•׳׳§ ׳׳•׳׳׳¥ ׳׳©׳׳׳”:</strong></p>
        <ul>${depthTrack.map(step => `<li>${step}</li>`).join('')}</ul>
        <p><strong>׳“׳•׳’׳׳× ׳©׳׳׳”:</strong> "${question.suggested_question}"</p>
    `);
    playUISound('hint');
}

function skipCurrentQuestion() {
    if (trainerState.currentQuestion >= trainerState.questions.length) return;
    const question = trainerState.questions[trainerState.currentQuestion];
    trainerState.phaseSkippedCount++;
    addQuestionToReviewPool(question);
    showHintMessage('׳“׳™׳׳’׳× ׳׳©׳׳׳” ׳”׳‘׳׳”');
    playUISound('skip');
    trainerState.currentQuestion++;
    loadNextQuestion();
}

function legacyEndTrainerSession() {
    return finishTrainerSession();
    const feedbackSection = document.getElementById('feedback-section');
    const feedbackContent = document.getElementById('feedback-content');
    if (!feedbackSection || !feedbackContent) return;

    const totalQuestions = trainerState.questions.length || 1;
    const successRate = Math.round((trainerState.correctCount / totalQuestions) * 100);

    let message = '';
    if (successRate === 100) {
        message = '׳׳•׳©׳׳! ׳›׳ ׳”׳×׳©׳•׳‘׳•׳× ׳ ׳›׳•׳ ׳•׳×';
    } else if (successRate >= 80) {
        message = '׳׳¢׳•׳׳”! ׳¨׳׳× ׳“׳™׳•׳§ ׳’׳‘׳•׳”׳” ׳׳׳•׳“';
    } else if (successRate >= 60) {
        message = '׳˜׳•׳‘ ׳׳׳•׳“, ׳¢׳•׳“ ׳—׳™׳“׳•׳“ ׳§׳˜׳ ׳•׳׳×׳” ׳©׳';
    } else {
        message = '׳”׳×׳—׳׳” ׳˜׳•׳‘׳”, ׳׳׳©׳™׳›׳™׳ ׳׳×׳¨׳’׳•׳ ׳ ׳•׳¡׳£';
    }

    feedbackContent.innerHTML = `
        <div class="correct" style="text-align: center;">
            <h2>${message}</h2>
            <p style="font-size: 1.05em;">
                <strong>׳¦׳™׳•׳ ׳¡׳•׳₪׳™:</strong> ${trainerState.correctCount} / ${trainerState.questions.length}<br>
                <strong>׳§׳¦׳‘ ׳”׳¦׳׳—׳”:</strong> ${successRate}%<br>
                <strong>XP ׳©׳”׳¨׳•׳•׳—׳×:</strong> +${trainerState.sessionXP}<br>
                <strong>׳“׳™׳׳•׳’׳™׳:</strong> ${trainerState.skippedCount}
            </p>
            <button class="btn btn-primary" onclick="resetTrainer()" style="margin-top: 20px; width: 100%;">׳×׳¨׳’׳•׳ ׳ ׳•׳¡׳£ ג†’</button>
        </div>
    `;

    const questionDisplay = document.getElementById('question-display');
    const optionsDisplay = document.getElementById('mcq-options');
    const trainerHints = document.getElementById('trainer-hints');
    if (questionDisplay) questionDisplay.style.display = 'none';
    if (optionsDisplay) optionsDisplay.style.display = 'none';
    if (trainerHints) trainerHints.style.display = 'none';

    feedbackSection.classList.remove('hidden');
    feedbackSection.classList.add('visible');
    document.getElementById('progress-fill').style.width = '100%';
    playUISound('finish');
    recordSession();
}

function resetTrainer() {
    document.getElementById('trainer-mode').classList.add('hidden');
    document.getElementById('trainer-start').classList.remove('hidden');

    const questionDisplay = document.getElementById('question-display');
    const optionsDisplay = document.getElementById('mcq-options');
    const trainerHints = document.getElementById('trainer-hints');
    if (questionDisplay) questionDisplay.style.display = 'block';
    if (optionsDisplay) optionsDisplay.style.display = 'flex';
    if (trainerHints) trainerHints.style.display = 'block';
    if (questionDisplay) questionDisplay.classList.remove('reward-success', 'reward-partial', 'reward-fail');
    const rewardFx = document.getElementById('trainer-reward-fx');
    if (rewardFx) {
        rewardFx.classList.add('hidden');
        rewardFx.classList.remove('show', 'success', 'partial', 'fail');
    }
    if (trainerRewardEffectTimer) {
        clearTimeout(trainerRewardEffectTimer);
        trainerRewardEffectTimer = null;
    }

    hideTrainerInfoPanels();
    const feedbackSection = document.getElementById('feedback-section');
    if (feedbackSection) {
        feedbackSection.classList.add('hidden');
        feedbackSection.classList.remove('visible');
    }

    document.getElementById('correct-count').textContent = '0';
    document.getElementById('success-rate').textContent = '0%';
    document.getElementById('session-xp').textContent = '0';
    const sessionStarsEl = document.getElementById('session-stars');
    if (sessionStarsEl) sessionStarsEl.textContent = '0';
    document.getElementById('progress-fill').style.width = '0%';
    const noteEl = document.getElementById('progress-note');
    if (noteEl) noteEl.textContent = '';

    trainerState = {
        isActive: false,
        currentQuestion: 0,
        questions: [],
        selectedCategory: '',
        phaseCorrectCount: 0,
        phaseSkippedCount: 0,
        sessionXP: 0,
        sessionStars: 0,
        answered: false,
        hintLevel: 0,
        reviewMode: false,
        reviewPool: [],
        reviewPoolKeys: {},
        mainTotalCount: 0,
        mainCorrectCount: null,
        mainSkippedCount: null,
        reviewTotalCount: 0,
        reviewCorrectCount: 0,
        reviewSkippedCount: 0,
        didRecordSession: false,
        deletionCoachMode: false,
        currentOptionSet: []
    };
    const categorySelect = document.getElementById('category-select');
    syncDeletionGuideEntry(categorySelect?.value || '');
}

// Override session ending flow with Review Loop support.
function endTrainerSession() {
    if (!trainerState.reviewMode) {
        trainerState.mainCorrectCount = trainerState.phaseCorrectCount;
        trainerState.mainSkippedCount = trainerState.phaseSkippedCount;
    } else {
        trainerState.reviewCorrectCount = trainerState.phaseCorrectCount;
        trainerState.reviewSkippedCount = trainerState.phaseSkippedCount;
    }

    if (!trainerState.reviewMode && trainerState.reviewPool.length > 0) {
        const feedbackSection = document.getElementById('feedback-section');
        const feedbackContent = document.getElementById('feedback-content');
        if (!feedbackSection || !feedbackContent) return;

        const mainTotal = trainerState.mainTotalCount || 1;
        const mainCorrect = trainerState.mainCorrectCount || 0;
        const mainRate = Math.round((mainCorrect / mainTotal) * 100);
        const weakCount = trainerState.reviewPool.length;

        feedbackContent.innerHTML = `
            <div class="correct" style="text-align: center;">
                <h2>׳¡׳™׳™׳׳× ׳׳× ׳”׳¡׳©׳ ׳”׳¨׳׳©׳™</h2>
                <p style="font-size: 1.02em;">
                    <strong>׳¦׳™׳•׳ ׳¨׳׳©׳™:</strong> ${mainCorrect} / ${mainTotal} (${mainRate}%)<br>
                    <strong>XP ׳©׳ ׳¦׳‘׳¨:</strong> +${trainerState.sessionXP}<br>
                    <strong>׳©׳׳׳•׳× ׳׳—׳™׳–׳•׳§:</strong> ${weakCount}
                </p>
                <p style="margin-top: 12px; color: #2c5282; font-weight: 700;">Review Loop ׳׳•׳›׳ ׳¢׳‘׳•׳¨׳ ׳¢׳ ׳”׳©׳׳׳•׳× ׳©׳“׳•׳¨׳©׳•׳× ׳—׳™׳–׳•׳§.</p>
                <button class="btn btn-primary" onclick="startReviewLoop()" style="margin-top: 12px; width: 100%;">׳”׳×׳—׳ Review Loop</button>
                <button class="btn btn-secondary" onclick="finishTrainerSession()" style="margin-top: 10px; width: 100%;">׳¡׳™׳™׳ ׳‘׳׳™ Review</button>
            </div>
        `;

        const questionDisplay = document.getElementById('question-display');
        const optionsDisplay = document.getElementById('mcq-options');
        const trainerHints = document.getElementById('trainer-hints');
        if (questionDisplay) questionDisplay.style.display = 'none';
        if (optionsDisplay) optionsDisplay.style.display = 'none';
        if (trainerHints) trainerHints.style.display = 'none';

        feedbackSection.classList.remove('hidden');
        feedbackSection.classList.add('visible');
        document.getElementById('progress-fill').style.width = '100%';
        playUISound('finish');
        return;
    }

    finishTrainerSession();
}

function startReviewLoop() {
    if (!trainerState.reviewPool.length) {
        finishTrainerSession();
        return;
    }

    const reviewQuestions = shuffleArray(trainerState.reviewPool).slice(0, Math.min(6, trainerState.reviewPool.length));
    trainerState.reviewMode = true;
    trainerState.reviewTotalCount = reviewQuestions.length;
    trainerState.questions = reviewQuestions;
    trainerState.currentQuestion = 0;
    trainerState.answered = false;
    trainerState.hintLevel = 0;
    trainerState.phaseCorrectCount = 0;
    trainerState.phaseSkippedCount = 0;
    document.getElementById('correct-count').textContent = '0';
    document.getElementById('success-rate').textContent = '0%';
    hideTrainerInfoPanels();

    const feedbackSection = document.getElementById('feedback-section');
    const questionDisplay = document.getElementById('question-display');
    const optionsDisplay = document.getElementById('mcq-options');
    const trainerHints = document.getElementById('trainer-hints');
    if (questionDisplay) questionDisplay.style.display = 'block';
    if (optionsDisplay) optionsDisplay.style.display = 'flex';
    if (trainerHints) trainerHints.style.display = 'block';
    if (feedbackSection) {
        feedbackSection.classList.add('hidden');
        feedbackSection.classList.remove('visible');
    }

    showHintMessage(`Review Loop ׳”׳×׳—׳™׳: ${reviewQuestions.length} ׳©׳׳׳•׳× ׳׳—׳™׳–׳•׳§`);
    playUISound('start');
    loadNextQuestion();
}

function finishTrainerSession() {
    const feedbackSection = document.getElementById('feedback-section');
    const feedbackContent = document.getElementById('feedback-content');
    if (!feedbackSection || !feedbackContent) return;

    if (trainerState.mainCorrectCount === null) {
        trainerState.mainCorrectCount = trainerState.phaseCorrectCount;
    }
    if (trainerState.mainSkippedCount === null) {
        trainerState.mainSkippedCount = trainerState.phaseSkippedCount;
    }

    const mainTotal = trainerState.mainTotalCount || 1;
    const mainCorrect = trainerState.mainCorrectCount || 0;
    const mainRate = Math.round((mainCorrect / mainTotal) * 100);
    const reviewTotal = trainerState.reviewTotalCount || 0;
    const reviewCorrect = trainerState.reviewCorrectCount || 0;
    const reviewRate = reviewTotal ? Math.round((reviewCorrect / reviewTotal) * 100) : 0;

    let message = '';
    if (reviewTotal > 0 && reviewRate >= 80) {
        message = '׳—׳–׳§ ׳׳׳•׳“. ׳¡׳’׳¨׳× ׳₪׳™׳ ׳•׳× ׳§׳¨׳™׳˜׳™׳•׳× ׳‘-Review Loop';
    } else if (mainRate === 100) {
        message = '׳׳•׳©׳׳! ׳›׳ ׳”׳×׳©׳•׳‘׳•׳× ׳ ׳›׳•׳ ׳•׳×';
    } else if (mainRate >= 80) {
        message = '׳׳¢׳•׳׳”! ׳¨׳׳× ׳“׳™׳•׳§ ׳’׳‘׳•׳”׳” ׳׳׳•׳“';
    } else if (mainRate >= 60) {
        message = '׳˜׳•׳‘ ׳׳׳•׳“, ׳¢׳•׳“ ׳—׳™׳“׳•׳“ ׳§׳˜׳ ׳•׳׳×׳” ׳©׳';
    } else {
        message = '׳”׳×׳—׳׳” ׳˜׳•׳‘׳”, ׳׳׳©׳™׳›׳™׳ ׳׳×׳¨׳’׳•׳ ׳ ׳•׳¡׳£';
    }

    const reviewLine = reviewTotal
        ? `<strong>Review Loop:</strong> ${reviewCorrect} / ${reviewTotal} (${reviewRate}%)<br>`
        : '';

    feedbackContent.innerHTML = `
        <div class="correct" style="text-align: center;">
            <h2>${message}</h2>
            <p style="font-size: 1.05em;">
                <strong>׳¦׳™׳•׳ ׳¨׳™׳¦׳” ׳¨׳׳©׳™׳×:</strong> ${mainCorrect} / ${mainTotal} (${mainRate}%)<br>
                ${reviewLine}
                <strong>XP ׳©׳”׳¨׳•׳•׳—׳×:</strong> +${trainerState.sessionXP}<br>
                <strong>׳“׳™׳׳•׳’׳™׳:</strong> ${trainerState.mainSkippedCount}
            </p>
            <button class="btn btn-primary" onclick="resetTrainer()" style="margin-top: 20px; width: 100%;">׳×׳¨׳’׳•׳ ׳ ׳•׳¡׳£ ג†’</button>
        </div>
    `;

    const questionDisplay = document.getElementById('question-display');
    const optionsDisplay = document.getElementById('mcq-options');
    const trainerHints = document.getElementById('trainer-hints');
    if (questionDisplay) questionDisplay.style.display = 'none';
    if (optionsDisplay) optionsDisplay.style.display = 'none';
    if (trainerHints) trainerHints.style.display = 'none';

    feedbackSection.classList.remove('hidden');
    feedbackSection.classList.add('visible');
    document.getElementById('progress-fill').style.width = '100%';
    playUISound('finish');

    if (!trainerState.didRecordSession) {
        recordSession();
        trainerState.didRecordSession = true;
    }
}

// ==================== SCENARIO TRAINER ====================

function getDefaultScenarioSettings() {
    return {
        soundEnabled: true,
        defaultDifficulty: 'all',
        defaultDomain: 'all',
        prismWheelEnabled: true
    };
}

function getDefaultScenarioProgress() {
    return {
        completed: 0,
        greenCount: 0,
        stars: 0,
        currentGreenStreak: 0,
        bestGreenStreak: 0,
        history: [],
        updatedAt: null
    };
}

function loadScenarioTrainerSettings() {
    const defaults = getDefaultScenarioSettings();
    try {
        const raw = localStorage.getItem(SCENARIO_STORAGE_KEYS.settings);
        if (!raw) return defaults;
        const parsed = JSON.parse(raw);
        return { ...defaults, ...(parsed || {}) };
    } catch (error) {
        console.error('Scenario settings parse error', error);
        return defaults;
    }
}

function saveScenarioTrainerSettings() {
    localStorage.setItem(SCENARIO_STORAGE_KEYS.settings, JSON.stringify(scenarioTrainer.settings));
}

function loadScenarioTrainerProgress() {
    const defaults = getDefaultScenarioProgress();
    try {
        const raw = localStorage.getItem(SCENARIO_STORAGE_KEYS.progress);
        if (!raw) return defaults;
        const parsed = JSON.parse(raw);
        const history = Array.isArray(parsed?.history) ? parsed.history : [];
        return {
            ...defaults,
            ...(parsed || {}),
            history: history.slice(0, 300)
        };
    } catch (error) {
        console.error('Scenario progress parse error', error);
        return defaults;
    }
}

function saveScenarioTrainerProgress() {
    scenarioTrainer.progress.updatedAt = new Date().toISOString();
    localStorage.setItem(SCENARIO_STORAGE_KEYS.progress, JSON.stringify(scenarioTrainer.progress));
}

async function loadScenarioTrainerData() {
    try {
        const response = await fetch('data/scenario-trainer-scenarios.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        scenarioTrainerData = {
            domains: Array.isArray(data.domains) ? data.domains : [],
            difficulties: Array.isArray(data.difficulties) ? data.difficulties : [],
            optionTemplates: data.optionTemplates || { red: [], green: null },
            consequenceTemplates: data.consequenceTemplates || {},
            scenarios: Array.isArray(data.scenarios) ? data.scenarios : [],
            prismWheel: Array.isArray(data.prismWheel) ? data.prismWheel : [],
            safetyKeywords: Array.isArray(data.safetyKeywords) ? data.safetyKeywords : []
        };
        return true;
    } catch (error) {
        console.error('Scenario data load failed', error);
        showHint('׳׳ ׳”׳¦׳׳—׳ ׳• ׳׳˜׳¢׳•׳ ׳׳× ׳¡׳¦׳ ׳•׳× ׳”-Scenario Trainer');
        return false;
    }
}

function scenarioTransitionTo(nextState, force = false) {
    if (force) {
        scenarioTrainer.state = nextState;
        return true;
    }

    const allowed = SCENARIO_ALLOWED_TRANSITIONS[scenarioTrainer.state] || [];
    if (!allowed.includes(nextState)) return false;
    scenarioTrainer.state = nextState;
    return true;
}

function showScenarioScreen(screenName) {
    const screens = document.querySelectorAll('#scenario-trainer .scenario-screen');
    screens.forEach(screen => screen.classList.add('hidden'));
    const target = document.getElementById(`scenario-screen-${screenName}`);
    if (target) target.classList.remove('hidden');
    if (document.getElementById('scenario-trainer')?.classList.contains('active')) {
        const needsScenarioContext = new Set(['play', 'feedback', 'blueprint', 'score']);
        const scenarioContext = needsScenarioContext.has(screenName) ? scenarioTrainer.activeScenario : null;
        renderGlobalComicStrip('scenario-trainer', scenarioContext);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function playScenarioSound(kind) {
    if (!scenarioTrainer.settings?.soundEnabled) return;
    if (kind === 'green') playUISound('correct');
    else if (kind === 'red') playUISound('wrong');
    else if (kind === 'next') playUISound('next');
    else if (kind === 'finish') playUISound('finish');
    else playUISound('hint');
}

function setScenarioSafetyNoticeVisible(visible) {
    const notice = document.getElementById('scenario-safety-notice');
    if (!notice) return;
    notice.classList.toggle('hidden', !visible);

    const scenesBtn = document.getElementById('scenario-home-scenes');
    if (scenesBtn) scenesBtn.disabled = !!visible;
}

function containsScenarioSafetyRisk(text) {
    if (!text) return false;
    const value = String(text).toLowerCase();
    const keywords = scenarioTrainerData.safetyKeywords.length
        ? scenarioTrainerData.safetyKeywords
        : ['׳׳”׳×׳׳‘׳“', '׳׳₪׳’׳•׳¢ ׳‘׳¢׳¦׳׳™', '׳׳׳•׳×', 'suicide', 'kill myself', 'self harm'];
    return keywords.some(keyword => value.includes(String(keyword).toLowerCase()));
}

function lockScenarioFlowForSafety() {
    scenarioTrainer.safetyLocked = true;
    scenarioTrainer.session = null;
    scenarioTrainer.activeScenario = null;
    scenarioTrainer.selectedOption = null;
    scenarioTrainer.currentPredicateAnalysis = null;
    setScenarioSafetyNoticeVisible(true);
    scenarioTransitionTo(SCENARIO_STATES.HOME, true);
    showScenarioScreen('home');
}

function bindScenarioClick(id, handler) {
    const el = document.getElementById(id);
    if (!el || el.dataset.scenarioBound === 'true') return;
    el.dataset.scenarioBound = 'true';
    el.addEventListener('click', handler);
}

function populateScenarioSelects() {
    const domainSelect = document.getElementById('scenario-domain-select');
    const settingsDomainSelect = document.getElementById('scenario-setting-domain');
    const difficultySelect = document.getElementById('scenario-difficulty-select');
    const settingsDifficultySelect = document.getElementById('scenario-setting-difficulty');

    const domainOptions = [{ id: 'all', label: '׳›׳ ׳”׳×׳—׳•׳׳™׳' }, ...scenarioTrainerData.domains];
    const difficultyOptions = [{ id: 'all', label: '׳›׳ ׳”׳¨׳׳•׳×' }, ...scenarioTrainerData.difficulties];

    const renderOptions = (selectEl, items) => {
        if (!selectEl) return;
        selectEl.innerHTML = '';
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.label;
            selectEl.appendChild(option);
        });
    };

    renderOptions(domainSelect, domainOptions);
    renderOptions(settingsDomainSelect, domainOptions);
    renderOptions(difficultySelect, difficultyOptions);
    renderOptions(settingsDifficultySelect, difficultyOptions);

    applyScenarioSettingsToControls();
}

function applyScenarioSettingsToControls() {
    const domainSelect = document.getElementById('scenario-domain-select');
    const settingsDomainSelect = document.getElementById('scenario-setting-domain');
    const difficultySelect = document.getElementById('scenario-difficulty-select');
    const settingsDifficultySelect = document.getElementById('scenario-setting-difficulty');
    const soundToggle = document.getElementById('scenario-setting-sound');
    const prismToggle = document.getElementById('scenario-setting-prism');

    if (domainSelect) domainSelect.value = scenarioTrainer.settings.defaultDomain || 'all';
    if (settingsDomainSelect) settingsDomainSelect.value = scenarioTrainer.settings.defaultDomain || 'all';
    if (difficultySelect) difficultySelect.value = scenarioTrainer.settings.defaultDifficulty || 'all';
    if (settingsDifficultySelect) settingsDifficultySelect.value = scenarioTrainer.settings.defaultDifficulty || 'all';
    if (soundToggle) soundToggle.checked = scenarioTrainer.settings.soundEnabled !== false;
    if (prismToggle) prismToggle.checked = scenarioTrainer.settings.prismWheelEnabled !== false;
}

function renderScenarioHomeStats() {
    const el = document.getElementById('scenario-home-stats');
    if (!el) return;

    const completed = scenarioTrainer.progress.completed || 0;
    const greens = scenarioTrainer.progress.greenCount || 0;
    const successRate = completed ? Math.round((greens / completed) * 100) : 0;
    const bestStreak = scenarioTrainer.progress.bestGreenStreak || 0;
    const stars = scenarioTrainer.progress.stars || 0;

    const stats = [
        `׳¡׳”"׳› ׳¡׳¦׳ ׳•׳×: ${completed}`,
        `׳׳—׳•׳– ׳™׳¨׳•׳§: ${successRate}%`,
        `׳¨׳¦׳£ ׳©׳™׳: ${bestStreak}`,
        `׳›׳•׳›׳‘׳™׳: ${stars}`
    ];

    el.innerHTML = '';
    stats.forEach(text => {
        const div = document.createElement('div');
        div.className = 'scenario-stat-item';
        div.textContent = text;
        el.appendChild(div);
    });
}

function openScenarioHome() {
    scenarioTransitionTo(SCENARIO_STATES.HOME, true);
    showScenarioScreen('home');
    renderScenarioHomeStats();
    setScenarioSafetyNoticeVisible(scenarioTrainer.safetyLocked);
}

function openScenarioDomainPicker() {
    if (scenarioTrainer.safetyLocked) {
        setScenarioSafetyNoticeVisible(true);
        return;
    }
    if (!scenarioTrainerData.scenarios.length) {
        showHint('׳׳™׳ ׳¡׳¦׳ ׳•׳× ׳–׳׳™׳ ׳•׳× ׳›׳¨׳’׳¢');
        return;
    }
    scenarioTransitionTo(SCENARIO_STATES.DOMAIN_PICK, true);
    applyScenarioSettingsToControls();
    showScenarioScreen('domain');
}

function openScenarioHistoryScreen() {
    renderScenarioHistoryList();
    showScenarioScreen('history');
}

function openScenarioSettingsScreen() {
    applyScenarioSettingsToControls();
    showScenarioScreen('settings');
}

function buildScenarioQueue(domainId, difficultyId, runSize) {
    const all = scenarioTrainerData.scenarios || [];
    if (!all.length) return [];

    let filtered = all.filter(item => {
        const domainMatch = domainId === 'all' ? true : item.domain === domainId;
        const difficultyMatch = difficultyId === 'all' ? true : item.difficulty === difficultyId;
        return domainMatch && difficultyMatch;
    });

    if (!filtered.length) filtered = all;

    const queue = [];
    let pool = shuffleArray(filtered);
    let cursor = 0;
    const targetSize = Math.max(1, Math.min(runSize || 10, 10));

    while (queue.length < targetSize && pool.length) {
        queue.push(pool[cursor % pool.length]);
        cursor += 1;
        if (cursor % pool.length === 0 && queue.length < targetSize) {
            pool = shuffleArray(filtered);
        }
    }
    return queue;
}

function getScenarioOptions(scenario) {
    if (Array.isArray(scenario?.options) && scenario.options.length >= 5) {
        return scenario.options;
    }

    const defaultRed = (scenarioTrainerData.optionTemplates?.red || [
        { id: 'A', emoji: 'נ˜¡', text: '׳׳” ׳”׳‘׳¢׳™׳” ׳׳™׳×׳? ׳׳×׳” ׳¢׳¦׳׳.', type: 'red_identity_blame', score: 0, feedback: '׳׳׳©׳™׳ ׳–׳”׳•׳× ׳‘׳׳§׳•׳ ׳׳׳₪׳•׳× ׳—׳¡׳¨.' },
        { id: 'B', emoji: 'נ™„', text: '׳‘׳’׳™׳׳ ׳›׳‘׳¨ ׳”׳™׳™׳×׳™ ׳™׳•׳“׳¢ ׳׳¢׳©׳•׳× ׳׳× ׳–׳”.', type: 'red_comparison_shame', score: 0, feedback: '׳”׳©׳•׳•׳׳” ׳׳¢׳׳” ׳‘׳•׳©׳” ׳•׳׳•׳¨׳™׳“׳” ׳₪׳×׳¨׳•׳.' },
        { id: 'C', emoji: 'נ¥´', text: '׳¢׳–׳•׳‘, ׳׳ ׳™ ׳׳¢׳©׳” ׳׳× ׳–׳” ׳‘׳׳§׳•׳.', type: 'red_overtake', score: 0, feedback: '׳׳§׳™׳—׳× ׳׳©׳™׳׳” ׳‘׳׳§׳•׳׳ ׳׳•׳ ׳¢׳× ׳׳׳™׳“׳”.' },
        { id: 'D', emoji: 'נ˜¬', text: '׳›׳ ׳›׳, ׳׳—׳¨ ׳›׳ ׳ ׳˜׳₪׳ ׳‘׳–׳”.', type: 'red_avoid_pretend', score: 0, feedback: '׳“׳—׳™׳™׳” ׳‘׳׳™ ׳₪׳™׳¨׳•׳§ ׳׳’׳“׳™׳׳” ׳×׳§׳™׳¢׳•׳×.' }
    ]).slice(0, 4);

    const greenTemplate = scenarioTrainerData.optionTemplates?.green || {
        id: 'E',
        emoji: 'ג…נ™‚',
        text: '׳‘׳•׳ ׳ ׳₪׳¨׳§: ׳׳” ׳ ׳™׳¡׳™׳×? ׳׳™׳₪׳” ׳ ׳×׳§׳¢׳×? ׳׳” ׳”׳¦׳¢׳“ ׳”׳¨׳׳©׳•׳?',
        type: 'green_meta_model',
        score: 1,
        feedback: '׳׳₪׳¨׳§ ׳”׳•׳¨׳׳” ׳¢׳׳•׳׳” ׳׳¦׳¢׳“׳™׳ ׳ ׳™׳×׳ ׳™׳ ׳׳‘׳™׳¦׳•׳¢.'
    };

    const greenText = scenario?.greenSentence || greenTemplate.text;
    const redOptions = defaultRed.map((option, index) => ({
        ...option,
        id: option.id || ['A', 'B', 'C', 'D'][index]
    }));

    return [
        ...redOptions,
        {
            ...greenTemplate,
            id: greenTemplate.id || 'E',
            text: greenText
        }
    ];
}

function startScenarioRun() {
    if (scenarioTrainer.safetyLocked) {
        setScenarioSafetyNoticeVisible(true);
        return;
    }
    if (!scenarioTrainerData.scenarios.length) {
        showHint('׳ ׳×׳•׳ ׳™ ׳”׳¡׳¦׳ ׳•׳× ׳¢׳“׳™׳™׳ ׳׳ ׳ ׳˜׳¢׳ ׳•');
        return;
    }

    const domainSelect = document.getElementById('scenario-domain-select');
    const difficultySelect = document.getElementById('scenario-difficulty-select');
    const runSizeInput = document.getElementById('scenario-run-size');
    const domain = domainSelect?.value || scenarioTrainer.settings.defaultDomain || 'all';
    const difficulty = difficultySelect?.value || scenarioTrainer.settings.defaultDifficulty || 'all';
    const runSize = parseInt(runSizeInput?.value || '10', 10);

    scenarioTrainer.settings.defaultDomain = domain;
    scenarioTrainer.settings.defaultDifficulty = difficulty;
    saveScenarioTrainerSettings();

    const queue = buildScenarioQueue(domain, difficulty, runSize);
    if (!queue.length) {
        showHint('׳׳ ׳ ׳׳¦׳׳• ׳¡׳¦׳ ׳•׳× ׳׳׳¡׳ ׳ ׳©׳‘׳—׳¨׳×');
        return;
    }

    scenarioTrainer.session = {
        domain,
        difficulty,
        queue,
        index: 0,
        score: 0,
        stars: 0,
        streak: 0,
        completed: []
    };
    scenarioTrainer.didRecordSession = false;
    scenarioTrainer.activeScenario = null;
    scenarioTrainer.selectedOption = null;
    scenarioTrainer.currentPredicateAnalysis = null;

    scenarioTransitionTo(SCENARIO_STATES.SCENARIO, true);
    renderScenarioPlayScreen();
    playScenarioSound('next');
}

function renderScenarioPlayScreen() {
    if (!scenarioTrainer.session) return;
    const scenario = scenarioTrainer.session.queue[scenarioTrainer.session.index];
    if (!scenario) return;

    scenarioTrainer.activeScenario = scenario;
    scenarioTrainer.selectedOption = null;

    const currentIndex = scenarioTrainer.session.index + 1;
    const total = scenarioTrainer.session.queue.length;
    const progress = Math.round(((currentIndex - 1) / total) * 100);
    const storyContainer = document.getElementById('scenario-story-lines');
    const optionsContainer = document.getElementById('scenario-options-container');
    const roleLabel = scenario?.expectation?.speaker || scenario?.role || '׳“׳•׳‘׳¨';

    const currentIndexEl = document.getElementById('scenario-current-index');
    const totalCountEl = document.getElementById('scenario-total-count');
    const sessionScoreEl = document.getElementById('scenario-session-score');
    const sessionStreakEl = document.getElementById('scenario-session-streak');
    const progressFill = document.getElementById('scenario-progress-fill');
    const roleEl = document.getElementById('scenario-role');
    const titleEl = document.getElementById('scenario-title');
    const unspecifiedEl = document.getElementById('scenario-unspecified-verb');
    const contextPressureEl = document.getElementById('scenario-context-pressure');
    const contextBeliefEl = document.getElementById('scenario-context-belief');
    const contextStuckEl = document.getElementById('scenario-context-stuck');
    const liveFocusEl = document.getElementById('scenario-live-focus');

    if (currentIndexEl) currentIndexEl.textContent = String(currentIndex);
    if (totalCountEl) totalCountEl.textContent = String(total);
    if (sessionScoreEl) sessionScoreEl.textContent = String(scenarioTrainer.session.score);
    if (sessionStreakEl) sessionStreakEl.textContent = String(scenarioTrainer.session.streak);
    if (progressFill) progressFill.style.width = `${progress}%`;
    if (roleEl) roleEl.textContent = `׳׳™ ׳׳“׳‘׳¨ ׳›׳׳: ${roleLabel}`;
    if (titleEl) titleEl.textContent = scenario.title || '׳¡׳¦׳ ׳”';
    if (unspecifiedEl) unspecifiedEl.textContent = scenario.unspecifiedVerb || '׳׳¢׳©׳•׳× ׳׳× ׳–׳”';

    renderScenarioPredicateAnalysis(scenario);
    const analysis = scenarioTrainer.currentPredicateAnalysis || buildScenarioPredicateAnalysis(scenario);
    if (contextPressureEl) contextPressureEl.textContent = scenario?.expectation?.pressure || '׳׳ ׳¦׳•׳™׳';
    if (contextBeliefEl) contextBeliefEl.textContent = scenario?.expectation?.belief || '׳׳ ׳¦׳•׳™׳';
    if (contextStuckEl) contextStuckEl.textContent = scenario?.stuckPointHint || '׳׳ ׳¦׳•׳™׳';
    if (liveFocusEl) liveFocusEl.textContent = analysis?.missingAction || '׳‘׳—׳¨/׳™ ׳¦׳¢׳“ ׳¨׳׳©׳•׳ ׳§׳¦׳¨ ׳•׳׳“׳™׳“.';

    if (storyContainer) {
        storyContainer.innerHTML = '';
        (scenario.story || []).forEach(line => {
            const p = document.createElement('p');
            p.textContent = line;
            storyContainer.appendChild(p);
        });
    }

    if (optionsContainer) {
        optionsContainer.innerHTML = '';
        getScenarioOptions(scenario).forEach(option => {
            const isGreen = Number(option.score) === 1 || String(option.type).includes('green');
            const optionTitle = `${option.emoji || ''} ${option.text || ''}`.trim();
            const optionHint = isGreen
                ? '׳×׳’׳•׳‘׳” ׳׳§׳“׳׳×: ׳₪׳™׳¨׳•׳§, ׳‘׳™׳¨׳•׳¨, ׳•׳¦׳¢׳“ ׳¨׳׳©׳•׳.'
                : '׳×׳’׳•׳‘׳” ׳׳¢׳›׳‘׳×: ׳”׳׳©׳׳”/׳”׳©׳•׳•׳׳”/׳“׳—׳™׳™׳” ׳‘׳׳™ ׳₪׳™׳¨׳•׳§.';
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `scenario-option-btn ${isGreen ? 'green' : 'red'}`;
            btn.innerHTML = `
                <span class="scenario-option-kind">${isGreen ? '׳›׳™׳•׳•׳ ׳™׳¨׳•׳§' : '׳›׳™׳•׳•׳ ׳׳“׳•׳'}</span>
                <span class="scenario-option-main">${escapeHtml(optionTitle)}</span>
                <span class="scenario-option-hint">${escapeHtml(optionHint)}</span>
            `;
            btn.setAttribute('aria-label', optionTitle);
            btn.setAttribute('data-option-id', option.id);
            btn.addEventListener('click', () => pickScenarioOption(option.id));
            optionsContainer.appendChild(btn);
        });
    }

    renderScenarioComicStage(scenario);
    showScenarioScreen('play');
}

function pickScenarioOption(optionId) {
    if (!scenarioTrainer.activeScenario || scenarioTrainer.state !== SCENARIO_STATES.SCENARIO) return;
    if (!scenarioTransitionTo(SCENARIO_STATES.OPTION_PICK)) return;

    const option = getScenarioOptions(scenarioTrainer.activeScenario).find(item => item.id === optionId);
    if (!option) return;
    scenarioTrainer.selectedOption = option;

    const isGreen = Number(option.score) === 1 || String(option.type).includes('green');
    if (isGreen) {
        scenarioTrainer.session.score += 1;
        scenarioTrainer.session.stars += 1;
        scenarioTrainer.session.streak += 1;
        playScenarioSound('green');
    } else {
        scenarioTrainer.session.streak = 0;
        playScenarioSound('red');
    }

    scenarioTransitionTo(SCENARIO_STATES.FEEDBACK, true);
    renderScenarioFeedback(option, isGreen);
}

function renderScenarioFeedback(option, isGreen) {
    const mark = document.getElementById('scenario-feedback-mark');
    const title = document.getElementById('scenario-feedback-title');
    const text = document.getElementById('scenario-feedback-text');
    const consequenceBox = document.getElementById('scenario-consequence-box');
    const consequenceTitle = document.getElementById('scenario-consequence-title');
    const consequenceAction = document.getElementById('scenario-consequence-action');
    const consequenceResult = document.getElementById('scenario-consequence-result');

    if (mark) {
        mark.textContent = isGreen ? 'ג“' : 'X';
        mark.className = `scenario-feedback-mark ${isGreen ? 'success' : 'fail'}`;
        // Restart animation each feedback screen.
        void mark.offsetWidth;
        mark.classList.add('animate');
    }
    if (title) title.textContent = isGreen ? '׳×׳’׳•׳‘׳” ׳™׳¨׳•׳§׳”: ׳₪׳™׳¨׳•׳§ ׳׳×׳”׳׳™׳' : '׳×׳’׳•׳‘׳” ׳׳“׳•׳׳”: ׳”׳׳©׳׳”/׳”׳×׳—׳׳§׳•׳×';
    if (text) text.textContent = option.feedback || '';
    renderScenarioConsequence(option, isGreen, consequenceBox, consequenceTitle, consequenceAction, consequenceResult);

    showScenarioScreen('feedback');
}

function resolveScenarioConsequence(option, isGreen) {
    const scenario = scenarioTrainer.activeScenario || {};
    const type = option?.type || '';
    const direct = scenario?.consequences?.[type];
    if (direct && typeof direct === 'object') return direct;

    const pool = scenarioTrainerData.consequenceTemplates?.[type];
    if (Array.isArray(pool) && pool.length) {
        return pool[0];
    }

    if (isGreen) {
        return {
            icon: 'נ› ן¸',
            title: '׳׳” ׳§׳•׳¨׳” ׳׳—׳¨׳™ ׳‘׳—׳™׳¨׳” ׳™׳¨׳•׳§׳”?',
            action: '׳©׳•׳׳׳™׳ ׳©׳׳׳× ׳₪׳™׳¨׳•׳§ ׳‘׳׳§׳•׳ ׳׳”׳׳©׳™׳.',
            result: '׳”׳׳©׳™׳׳” ׳”׳•׳₪׳›׳× ׳׳¦׳¢׳“ ׳¨׳׳©׳•׳ ׳©׳׳₪׳©׳¨ ׳׳‘׳¦׳¢.'
        };
    }

    return {
        icon: 'נ’¥',
        title: '׳׳” ׳§׳•׳¨׳” ׳׳ ׳׳׳©׳™׳›׳™׳ ׳‘׳“׳¨׳ ׳”׳™׳©׳ ׳”?',
        action: '׳׳׳©׳™׳›׳™׳ ׳׳ ׳—׳©/׳׳”׳׳©׳™׳ ׳‘׳׳™ ׳׳‘׳“׳•׳§ ׳׳” ׳ ׳×׳§׳¢.',
        result: '׳”׳׳©׳™׳׳” ׳ ׳×׳§׳¢׳×, ׳”׳׳—׳¥ ׳¢׳•׳׳”, ׳•׳׳¢׳™׳×׳™׳ ׳ ׳•׳¦׳¨׳× ׳×׳§׳׳” ׳׳׳™׳×׳™׳×.'
    };
}

function renderScenarioConsequence(option, isGreen, box, titleEl, actionEl, resultEl) {
    if (!box || !titleEl || !actionEl || !resultEl) return;

    const consequence = resolveScenarioConsequence(option, isGreen);
    box.classList.remove('hidden', 'red', 'green');
    box.classList.add(isGreen ? 'green' : 'red');
    titleEl.textContent = `${consequence.icon || ''} ${consequence.title || ''}`.trim();
    actionEl.innerHTML = `<strong>׳׳” ׳§׳•׳¨׳” ׳׳™׳“ ׳׳—׳¨׳™ ׳–׳”:</strong> ${consequence.action || ''}`;
    resultEl.innerHTML = `<strong>׳”׳×׳•׳¦׳׳” ׳‘׳₪׳•׳¢׳:</strong> ${consequence.result || ''}`;
}

function getScenarioGreenOptionText(scenario) {
    if (!scenario) return '';
    const green = getScenarioOptions(scenario).find(opt => String(opt.type).includes('green'));
    return green?.text || '';
}

const SCENARIO_PREDICATE_TYPE_LABELS = Object.freeze({
    action: '׳₪׳¢׳•׳׳”',
    process: '׳×׳”׳׳™׳',
    state: '׳׳¦׳‘/׳–׳”׳•׳×'
});

const SCENARIO_STATE_NORMALIZATION_RULES = Object.freeze([
    { pattern: /׳×׳§׳•׳¢|׳×׳§׳•׳¢׳”/, normalizedVerb: '׳׳”׳™׳×׳§׳¢ ׳‘׳׳•׳₪ ׳•׳׳ ׳׳”׳×׳§׳“׳', missingAction: '׳׳”׳’׳“׳™׳¨ ׳¦׳¢׳“ ׳¨׳׳©׳•׳ ׳׳“׳™׳“ ׳•׳׳‘׳¦׳¢ ׳׳•׳×׳• ׳׳™׳“' },
    { pattern: /׳›׳™׳©׳׳•׳|׳›׳©׳׳•׳|׳׳₪׳¡/, normalizedVerb: '׳׳”׳“׳‘׳™׳§ ׳–׳”׳•׳× ׳©׳׳™׳׳™׳× ׳‘׳׳§׳•׳ ׳׳×׳׳¨ ׳₪׳¢׳•׳׳”', missingAction: '׳׳×׳׳¨ ׳₪׳¢׳•׳׳” ׳§׳˜׳ ׳” ׳©׳ ׳™׳×׳ ׳׳‘׳¦׳¢ ׳‘-10 ׳“׳§׳•׳×' },
    { pattern: /׳׳ ׳׳¡׳•׳’׳|׳׳ ׳׳¡׳•׳’׳׳×|׳׳ ׳™׳›׳•׳|׳׳ ׳™׳›׳•׳׳”/, normalizedVerb: '׳׳—׳¡׳•׳ ׳™׳›׳•׳׳× ׳׳₪׳ ׳™ ׳‘׳“׳™׳§׳× ׳×׳ ׳׳™׳', missingAction: '׳׳‘׳“׳•׳§ ׳׳” ׳׳₪׳©׳¨ ׳׳‘׳¦׳¢ ׳’׳ ׳׳ ׳¨׳§ ׳‘-5% ׳”׳¦׳׳—׳”' },
    { pattern: /׳׳™׳ ׳¡׳™׳›׳•׳™|׳—׳¡׳¨ ׳¡׳™׳›׳•׳™|׳׳‘׳•׳“|׳׳‘׳•׳“׳”/, normalizedVerb: '׳׳”׳₪׳•׳ ׳׳¦׳‘ ׳׳§׳‘׳™׳¢׳” ׳’׳•׳¨׳׳™׳×', missingAction: '׳׳׳×׳¨ ׳×׳ ׳׳™׳ ׳©׳‘׳”׳ ׳–׳” ׳§׳¦׳× ׳₪׳—׳•׳× ׳ ׳›׳•׳' }
]);

const SCENARIO_PROCESS_HINTS = Object.freeze([
    { pattern: /׳׳¦׳™׳£|׳׳¦׳™׳₪׳”/, normalizedVerb: '׳׳”׳™׳•׳× ׳׳•׳¦׳£ ׳•׳׳”׳₪׳¡׳™׳§ ׳׳—׳©׳•׳‘ ׳‘׳¦׳¢׳“׳™׳', missingAction: '׳׳¢׳¦׳•׳¨, ׳׳ ׳©׳•׳, ׳•׳׳₪׳¨׳§ ׳׳׳©׳™׳׳× ׳׳™׳§׳¨׳• ׳׳—׳×' },
    { pattern: /׳ ׳×׳§׳¢|׳ ׳×׳§׳¢׳×|׳ ׳×׳§׳¢׳™׳/, normalizedVerb: '׳׳”׳™׳›׳ ׳¡ ׳׳׳•׳׳׳× ׳¢׳¦׳™׳¨׳”', missingAction: '׳׳‘׳—׳•׳¨ ׳¦׳¢׳“ ׳¨׳׳©׳•׳ ׳§׳¦׳¨ ׳¢׳ ׳׳“׳“ ׳¡׳™׳•׳ ׳‘׳¨׳•׳¨' },
    { pattern: /׳׳©׳×׳׳˜|׳׳©׳×׳׳˜׳×/, normalizedVerb: '׳׳×׳× ׳׳×׳’׳•׳‘׳” ׳׳•׳˜׳•׳׳˜׳™׳× ׳׳ ׳”׳ ׳׳× ׳”׳׳”׳׳', missingAction: '׳׳”׳—׳–׳™׳¨ ׳©׳׳™׳˜׳” ׳“׳¨׳ ׳©׳׳׳” ׳§׳•׳ ׳§׳¨׳˜׳™׳× ׳׳—׳×' }
]);

const SCENARIO_DYNAMIC_QUESTIONS = Object.freeze({
    action: Object.freeze([
        '׳׳” ׳”׳¦׳¢׳“ ׳”׳¨׳׳©׳•׳ ׳©׳ ׳”׳₪׳•׳¢׳ ׳”׳–׳” ׳׳¦׳׳?',
        '׳׳” ׳§׳•׳¨׳” ׳‘׳™׳ ׳”׳”׳—׳׳˜׳” ׳׳‘׳™׳ ׳¨׳’׳¢ ׳”׳•׳•׳™׳×׳•׳¨?',
        '׳׳™׳ ׳ ׳¨׳׳” ׳¡׳™׳׳ "׳‘׳•׳¦׳¢" ׳‘׳¨׳•׳¨?'
    ]),
    process: Object.freeze([
        '׳׳” ׳”׳׳•׳× ׳”׳¨׳׳©׳•׳ ׳‘׳’׳•׳£ ׳©׳–׳” ׳׳×׳—׳™׳?',
        '׳׳” ׳§׳•׳¨׳” ׳׳•׳˜׳•׳׳˜׳™׳× ׳‘׳׳™ ׳”׳—׳׳˜׳” ׳׳•׳“׳¢׳×?',
        '׳׳” ׳׳×׳” ׳¢׳•׳©׳” ׳©׳׳’׳“׳™׳ ׳׳• ׳׳§׳˜׳™׳ ׳׳× ׳”׳×׳”׳׳™׳ ׳”׳–׳”?'
    ]),
    state: Object.freeze([
        '׳׳ ׳”׳™׳™׳ ׳• ׳׳¦׳׳׳”, ׳׳” ׳‘׳“׳™׳•׳§ ׳¨׳•׳׳™׳ ׳©׳׳×׳” ׳¢׳•׳©׳” ׳›׳©׳–׳” ׳§׳•׳¨׳”?',
        '׳׳” ׳׳ ׳§׳•׳¨׳” ׳©׳”׳™׳™׳× ׳׳¦׳₪׳” ׳©׳™׳§׳¨׳”?',
        '׳‘׳™׳—׳¡ ׳׳׳” ׳–׳” "׳×׳§׳•׳¢" - ׳™׳¢׳“, ׳”׳—׳׳˜׳” ׳׳• ׳₪׳¢׳•׳׳” ׳׳¡׳•׳™׳׳×?'
    ])
});

function getScenarioPredicateBaseText(scenario) {
    const raw = String(scenario?.predicate || scenario?.unspecifiedVerb || '').trim();
    return raw || '׳׳¢׳©׳•׳× ׳׳× ׳–׳”';
}

function inferScenarioPredicateType(scenario) {
    const predicate = normalizeText(getScenarioPredicateBaseText(scenario));
    const story = normalizeText((scenario?.story || []).join(' '));
    const stuck = normalizeText(scenario?.stuckPointHint || '');
    const belief = normalizeText(scenario?.expectation?.belief || '');
    const haystack = `${predicate} ${story} ${stuck} ${belief}`;

    if (
        /׳×׳§׳•׳¢|׳×׳§׳•׳¢׳”|׳›׳™׳©׳׳•׳|׳›׳©׳׳•׳|׳׳₪׳¡|׳׳ ׳׳¡׳•׳’׳|׳׳ ׳׳¡׳•׳’׳׳×|׳׳™׳ ׳¡׳™׳›׳•׳™|׳׳‘׳•׳“|׳׳‘׳•׳“׳”/.test(haystack) ||
        /^׳׳”׳™׳•׳×\b/.test(predicate)
    ) {
        return 'state';
    }

    if (/׳ ׳×׳§׳¢|׳ ׳×׳§׳¢׳×|׳׳¦׳™׳£|׳׳¦׳™׳₪׳”|׳׳©׳×׳׳˜|׳§׳•׳₪׳|׳ ׳ ׳¢׳|׳׳—׳•׳¥/.test(haystack)) {
        return 'process';
    }

    return 'action';
}

function resolveScenarioPredicateNormalization(predicate, type, scenario) {
    const normalizedPredicate = normalizeText(predicate);
    const bp = scenario?.greenBlueprint || {};
    const fallbackMissing = bp.firstStep || (scenario?.hiddenSteps || [])[0] || '׳׳”׳’׳“׳™׳¨ ׳•׳׳‘׳¦׳¢ ׳¦׳¢׳“ ׳¨׳׳©׳•׳ ׳‘׳¨׳•׳¨';

    if (type === 'state') {
        const matched = SCENARIO_STATE_NORMALIZATION_RULES.find((rule) => rule.pattern.test(normalizedPredicate));
        if (matched) {
            return {
                normalizedVerb: matched.normalizedVerb,
                missingAction: matched.missingAction
            };
        }
        return {
            normalizedVerb: '׳׳”׳™׳×׳§׳¢ ׳‘׳׳•׳₪ ׳‘׳׳§׳•׳ ׳₪׳¢׳•׳׳” ׳׳“׳™׳“׳”',
            missingAction: fallbackMissing
        };
    }

    if (type === 'process') {
        const matched = SCENARIO_PROCESS_HINTS.find((rule) => rule.pattern.test(normalizedPredicate));
        if (matched) {
            return {
                normalizedVerb: matched.normalizedVerb,
                missingAction: matched.missingAction
            };
        }
        return {
            normalizedVerb: `׳׳ ׳•׳¢ ׳׳•׳˜׳•׳׳˜׳™׳× ׳¡׳‘׳™׳‘ "${predicate}" ׳‘׳׳™ ׳₪׳™׳¨׳•׳§ ׳׳©׳׳‘׳™׳`,
            missingAction: fallbackMissing
        };
    }

    return {
        normalizedVerb: predicate,
        missingAction: fallbackMissing
    };
}

function buildScenarioPredicateAnalysis(scenario) {
    const predicate = getScenarioPredicateBaseText(scenario);
    const type = inferScenarioPredicateType(scenario);
    const { normalizedVerb, missingAction } = resolveScenarioPredicateNormalization(predicate, type, scenario);
    return {
        predicate,
        type,
        typeLabel: SCENARIO_PREDICATE_TYPE_LABELS[type] || SCENARIO_PREDICATE_TYPE_LABELS.action,
        normalizedVerb,
        missingAction
    };
}

function renderScenarioPredicateAnalysis(scenario) {
    const typeEl = document.getElementById('scenario-predicate-type');
    const normalizedEl = document.getElementById('scenario-predicate-normalized');
    const missingActionEl = document.getElementById('scenario-predicate-missing-action');
    if (!typeEl || !normalizedEl || !missingActionEl) return;

    const analysis = buildScenarioPredicateAnalysis(scenario);
    scenarioTrainer.currentPredicateAnalysis = analysis;
    typeEl.textContent = analysis.typeLabel;
    normalizedEl.textContent = analysis.normalizedVerb;
    missingActionEl.textContent = analysis.missingAction;
}

function resolveScenarioAutoLoopText(type = 'action') {
    if (type === 'state') {
        return '׳”׳’׳“׳¨׳” ׳¢׳¦׳׳™׳× ׳©׳׳™׳׳™׳× -> ׳׳—׳¥/׳§׳™׳₪׳׳•׳ -> ׳”׳™׳׳ ׳¢׳•׳× -> ׳™׳•׳×׳¨ ׳×׳§׳™׳¢׳•׳×.';
    }
    if (type === 'process') {
        return '׳˜׳¨׳™׳’׳¨ ׳₪׳ ׳™׳׳™ -> ׳×׳’׳•׳‘׳” ׳׳•׳˜׳•׳׳˜׳™׳× -> ׳¢׳¦׳™׳¨׳” ׳©׳ ׳”׳‘׳™׳¦׳•׳¢.';
    }
    return '׳”׳—׳׳˜׳” ׳›׳׳׳™׳× -> ׳§׳₪׳™׳¦׳” ׳‘׳™׳ ׳©׳׳‘׳™׳ -> ׳‘׳׳™ ׳¡׳’׳™׳¨׳× ׳¦׳¢׳“ ׳¨׳׳©׳•׳.';
}

function buildScenarioToteSlots(scenario, analysis) {
    const bp = scenario?.greenBlueprint || {};
    const hiddenSteps = Array.isArray(scenario?.hiddenSteps) ? scenario.hiddenSteps : [];
    const bpSteps = Array.isArray(bp.steps) ? bp.steps : [];
    const steps = [...hiddenSteps, ...bpSteps].filter(Boolean);
    const fallbackStep = analysis?.missingAction || bp.firstStep || '׳׳‘׳—׳•׳¨ ׳₪׳¢׳•׳׳” ׳§׳˜׳ ׳” ׳•׳׳“׳™׳“׳”';

    return {
        trigger: (scenario?.story || [])[0] || scenario?.title || '׳׳ ׳–׳•׳”׳” ׳˜׳¨׳™׳’׳¨ ׳׳₪׳•׳¨׳©',
        preEvent: (scenario?.story || [])[1] || scenario?.expectation?.pressure || '׳׳ ׳–׳•׳”׳” ׳׳™׳¨׳•׳¢ ׳׳§׳“׳™׳',
        evidence: scenario?.stuckPointHint || '׳׳™׳ ׳¨׳•׳׳™׳ ׳©׳–׳” ׳§׳•׳¨׳” ׳‘׳₪׳•׳¢׳? ׳׳” ׳¢׳“׳•׳× ׳׳“׳™׳“׳”?',
        op1: steps[0] || fallbackStep,
        op2: steps[1] || bp.firstStep || '׳׳”׳׳©׳™׳ ׳‘׳¦׳¢׳“ ׳©׳ ׳™ ׳§׳¦׳¨ ׳•׳‘׳¨׳•׳¨',
        op3: steps[2] || '׳׳¡׳’׳•׳¨ ׳‘׳“׳™׳§׳” ׳§׳¦׳¨׳”: ׳׳” ׳”׳•׳©׳׳ ׳•׳׳” ׳¢׳•׳“ ׳—׳¡׳¨',
        blocker: scenario?.expectation?.belief || bp.stuckPoint || scenario?.stuckPointHint || '׳׳׳•׳ ׳”/׳›׳׳ ׳©׳¢׳•׳¦׳¨ ׳׳× ׳”-Exit',
        autoLoop: resolveScenarioAutoLoopText(analysis?.type),
        exit: bp.doneDefinition || '׳™׳© ׳¡׳™׳׳ ׳‘׳™׳¦׳•׳¢ ׳‘׳¨׳•׳¨ ׳©׳׳₪׳©׳¨ ׳׳¨׳׳•׳× ׳•׳׳׳“׳•׳“'
    };
}

function renderScenarioDynamicQuestions(analysis) {
    const listEl = document.getElementById('scenario-dynamic-questions');
    if (!listEl) return;

    const type = analysis?.type || 'action';
    const questions = SCENARIO_DYNAMIC_QUESTIONS[type] || SCENARIO_DYNAMIC_QUESTIONS.action;
    listEl.innerHTML = '';
    questions.slice(0, 3).forEach((text) => {
        const li = document.createElement('li');
        li.textContent = text;
        listEl.appendChild(li);
    });
}

function renderScenarioToteMap(scenario) {
    const analysis = scenarioTrainer.currentPredicateAnalysis || buildScenarioPredicateAnalysis(scenario);
    const slots = buildScenarioToteSlots(scenario, analysis);
    const bindings = {
        trigger: 'scenario-tote-trigger',
        preEvent: 'scenario-tote-pre-event',
        evidence: 'scenario-tote-evidence',
        op1: 'scenario-tote-op1',
        op2: 'scenario-tote-op2',
        op3: 'scenario-tote-op3',
        blocker: 'scenario-tote-blocker',
        autoLoop: 'scenario-tote-auto',
        exit: 'scenario-tote-exit'
    };

    Object.entries(bindings).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = slots[key] || 'ג€”';
    });

    renderScenarioDynamicQuestions(analysis);
    const probeOutput = document.getElementById('scenario-probe-output');
    if (probeOutput) probeOutput.textContent = '';
}

function getScenarioProbePrompt(kind = 'open') {
    const analysis = scenarioTrainer.currentPredicateAnalysis || {};
    const type = analysis.type || 'action';
    if (kind === 'knife') {
        if (type === 'state') {
            return '׳׳™׳–׳” ׳—׳™׳‘׳•׳¨ ׳׳ ׳”׳›׳¨׳—׳™ ׳׳•׳₪׳¢׳ ׳›׳׳? ׳׳׳©׳: "׳׳ ׳׳ ׳׳•׳©׳׳ ׳׳– ׳׳ ׳™ ׳›׳™׳©׳׳•׳". ׳׳” ׳₪׳™׳¨׳•׳© ׳—׳׳•׳₪׳™ ׳׳₪׳©׳¨׳™?';
        }
        if (type === 'process') {
            return '׳׳” ׳’׳•׳¨׳ ׳׳”׳¡׳™׳§ ׳©"׳›׳©׳”׳˜׳¨׳™׳’׳¨ ׳׳•׳₪׳™׳¢ ׳׳™׳ ׳©׳׳™׳˜׳”"? ׳׳™׳₪׳” ׳–׳” ׳›׳ ׳¢׳‘׳“ ׳׳—׳¨׳× (׳׳₪׳™׳׳• 5%)?';
        }
        return '׳׳™׳–׳” ׳§׳©׳¨ ׳׳•׳˜׳•׳׳˜׳™ ׳ ׳•׳¦׳¨ ׳‘׳™׳ ׳”׳¦׳¢׳“ ׳”׳–׳” ׳׳‘׳™׳ ׳›׳™׳©׳׳•׳? ׳׳” ׳×׳ ׳׳™ ׳”׳§׳©׳¨ ׳©׳‘׳• ׳›׳ ׳׳₪׳©׳¨ ׳׳”׳×׳§׳“׳?';
    }

    if (type === 'state') {
        return '׳₪׳×׳— ׳¢׳•׳“: ׳׳™׳–׳” ׳©׳׳‘ ׳₪׳¢׳•׳׳” ׳—׳¡׳¨ ׳‘׳™׳ ׳”׳”׳’׳“׳¨׳” ("׳×׳§׳•׳¢") ׳׳‘׳™׳ ׳׳” ׳©׳§׳•׳¨׳” ׳‘׳₪׳•׳¢׳?';
    }
    if (type === 'process') {
        return '׳₪׳×׳— ׳¢׳•׳“: ׳׳” ׳”׳׳•׳× ׳”׳¨׳׳©׳•׳ ׳‘׳’׳•׳£, ׳•׳׳” ׳”׳₪׳¢׳•׳׳” ׳”׳׳™׳“׳™׳× ׳©׳׳×׳—׳™׳׳” ׳׳× ׳”׳׳•׳₪?';
    }
    return '׳₪׳×׳— ׳¢׳•׳“: ׳׳™׳–׳” ׳׳™׳§׳¨׳•-׳©׳׳‘ ׳ ׳©׳׳˜ ׳‘׳™׳ ׳”׳›׳•׳•׳ ׳” ׳׳‘׳™׳ ׳”׳‘׳™׳¦׳•׳¢?';
}

function runScenarioProbe(kind = 'open') {
    const outputEl = document.getElementById('scenario-probe-output');
    if (!outputEl) return;
    outputEl.textContent = getScenarioProbePrompt(kind);
    playScenarioSound('next');
}

function showScenarioBlueprint() {
    if (!scenarioTrainer.activeScenario || !scenarioTrainer.selectedOption) return;
    if (!scenarioTransitionTo(SCENARIO_STATES.BLUEPRINT, true)) return;

    const scenario = scenarioTrainer.activeScenario;
    const bp = scenario.greenBlueprint || {};
    const stepsEl = document.getElementById('scenario-blueprint-steps');
    const noteEl = document.getElementById('scenario-user-note');

    const goalEl = document.getElementById('scenario-blueprint-goal');
    const firstStepEl = document.getElementById('scenario-blueprint-first-step');
    const stuckEl = document.getElementById('scenario-blueprint-stuck');
    const planBEl = document.getElementById('scenario-blueprint-planb');
    const doneEl = document.getElementById('scenario-blueprint-done');
    const greenSentenceEl = document.getElementById('scenario-green-sentence');

    if (goalEl) goalEl.textContent = bp.goal || '';
    if (firstStepEl) firstStepEl.textContent = bp.firstStep || '';
    if (stuckEl) stuckEl.textContent = bp.stuckPoint || scenario.stuckPointHint || '';
    if (planBEl) planBEl.textContent = bp.planB || '';
    if (doneEl) doneEl.textContent = bp.doneDefinition || '';
    if (greenSentenceEl) greenSentenceEl.textContent = getScenarioGreenOptionText(scenario);
    if (noteEl) noteEl.value = '';

    if (stepsEl) {
        stepsEl.innerHTML = '';
        (bp.steps || []).forEach(step => {
            const li = document.createElement('li');
            li.textContent = step;
            stepsEl.appendChild(li);
        });
    }

    renderScenarioToteMap(scenario);
    renderScenarioPrismWheel();
    showScenarioScreen('blueprint');
}

function renderScenarioPrismWheel() {
    const wheel = document.getElementById('scenario-prism-wheel');
    const itemsEl = document.getElementById('scenario-prism-items');
    const detailEl = document.getElementById('scenario-prism-detail');
    if (!wheel || !itemsEl || !detailEl) return;

    const isGreen = Number(scenarioTrainer.selectedOption?.score) === 1 || String(scenarioTrainer.selectedOption?.type || '').includes('green');
    if (!scenarioTrainer.settings.prismWheelEnabled || !isGreen) {
        wheel.classList.add('hidden');
        detailEl.classList.add('hidden');
        return;
    }

    wheel.classList.remove('hidden');
    itemsEl.innerHTML = '';
    detailEl.classList.add('hidden');
    detailEl.innerHTML = '';

    (scenarioTrainerData.prismWheel || []).forEach(item => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'scenario-prism-item';
        btn.textContent = item.label || item.id;
        btn.addEventListener('click', () => {
            detailEl.classList.remove('hidden');
            detailEl.innerHTML = '';

            const q = document.createElement('p');
            q.innerHTML = `<strong>׳©׳׳׳× Meta:</strong> ${item.question || ''}`;
            const ex = document.createElement('p');
            ex.innerHTML = `<strong>׳“׳•׳’׳׳”:</strong> ${item.example || ''}`;
            detailEl.appendChild(q);
            detailEl.appendChild(ex);
            playScenarioSound('next');
        });
        itemsEl.appendChild(btn);
    });
}

async function copyScenarioGreenSentence() {
    const sentence = getScenarioGreenOptionText(scenarioTrainer.activeScenario);
    if (!sentence) return;
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(sentence);
        } else {
            const helper = document.createElement('textarea');
            helper.value = sentence;
            document.body.appendChild(helper);
            helper.select();
            document.execCommand('copy');
            helper.remove();
        }
        showHint('׳”׳׳©׳₪׳˜ ׳”׳™׳¨׳•׳§ ׳”׳•׳¢׳×׳§');
    } catch (error) {
        console.error('Copy failed', error);
        showHint('׳׳ ׳”׳¦׳׳—׳ ׳• ׳׳”׳¢׳×׳™׳§. ׳׳₪׳©׳¨ ׳׳”׳¢׳×׳™׳§ ׳™׳“׳ ׳™׳×.');
    }
}

function buildScenarioHistoryEntry(note = '') {
    const scenario = scenarioTrainer.activeScenario;
    const option = scenarioTrainer.selectedOption;
    if (!scenario || !option) return null;
    const analysis = scenarioTrainer.currentPredicateAnalysis || buildScenarioPredicateAnalysis(scenario);

    const score = Number(option.score) === 1 ? 1 : 0;
    const bp = scenario.greenBlueprint || {};
    return {
        timestamp: new Date().toISOString(),
        scenarioId: scenario.scenarioId,
        domain: scenario.domainLabel || scenario.domain,
        difficulty: scenario.difficulty,
        title: scenario.title,
        selectedOptionId: option.id,
        selectedOptionType: option.type,
        selectedOptionText: option.text,
        feedback: option.feedback || '',
        score,
        stars: score ? 1 : 0,
        predicate: analysis.predicate,
        predicateType: analysis.type,
        predicateTypeLabel: analysis.typeLabel,
        normalizedPredicate: analysis.normalizedVerb,
        goalGeneral: bp.goal || '',
        successMetric: bp.doneDefinition || '',
        greenSentence: getScenarioGreenOptionText(scenario),
        note: note || ''
    };
}

function applyScenarioResult(entry) {
    if (!entry) return;

    scenarioTrainer.session.completed.push(entry);

    scenarioTrainer.progress.completed += 1;
    scenarioTrainer.progress.greenCount += entry.score;
    scenarioTrainer.progress.stars += entry.stars;
    scenarioTrainer.progress.currentGreenStreak = entry.score ? scenarioTrainer.progress.currentGreenStreak + 1 : 0;
    scenarioTrainer.progress.bestGreenStreak = Math.max(
        scenarioTrainer.progress.bestGreenStreak || 0,
        scenarioTrainer.progress.currentGreenStreak
    );
    scenarioTrainer.progress.history.unshift(entry);
    scenarioTrainer.progress.history = scenarioTrainer.progress.history.slice(0, 300);
    saveScenarioTrainerProgress();
    renderScenarioHomeStats();

    addXP(entry.score ? 8 : 4);
}

function finishScenarioBlueprint() {
    const note = (document.getElementById('scenario-user-note')?.value || '').trim();
    if (containsScenarioSafetyRisk(note)) {
        lockScenarioFlowForSafety();
        return;
    }

    const entry = buildScenarioHistoryEntry(note);
    if (!entry) return;

    applyScenarioResult(entry);
    scenarioTransitionTo(SCENARIO_STATES.SCORE, true);
    renderScenarioScore(entry);
}

function renderScenarioScore(entry) {
    const starsRow = document.getElementById('scenario-stars-row');
    const scoreLine = document.getElementById('scenario-score-line');
    const greenLine = document.getElementById('scenario-next-green-line');
    const summaryBox = document.getElementById('scenario-result-summary');
    const goalEl = document.getElementById('scenario-result-goal');
    const metricEl = document.getElementById('scenario-result-metric');
    const nextBtn = document.getElementById('scenario-next-scene-btn');

    const playedCount = scenarioTrainer.session.index + 1;
    const starVisual = 'ג­'.repeat(scenarioTrainer.session.stars) + 'ג˜†'.repeat(Math.max(playedCount - scenarioTrainer.session.stars, 0));

    if (starsRow) starsRow.textContent = starVisual || 'ג˜†ג˜†ג˜†ג˜†ג˜†';
    if (scoreLine) {
        scoreLine.textContent = `׳¡׳™׳™׳׳× ׳¡׳¦׳ ׳” ${playedCount}/${scenarioTrainer.session.queue.length}. ׳ ׳§׳•׳“׳•׳× ׳¡׳©׳: ${scenarioTrainer.session.score}`;
    }
    if (greenLine) greenLine.textContent = `׳‘׳₪׳¢׳ ׳”׳‘׳׳”: "${entry.greenSentence}"`;
    if (summaryBox) {
        const hasGoal = Boolean(entry.goalGeneral);
        const hasMetric = Boolean(entry.successMetric);
        summaryBox.classList.toggle('hidden', !hasGoal && !hasMetric);
        if (goalEl) goalEl.textContent = entry.goalGeneral || '׳׳ ׳”׳•׳’׳“׳¨';
        if (metricEl) metricEl.textContent = entry.successMetric || '׳׳ ׳”׳•׳’׳“׳¨';
    }

    const isLast = scenarioTrainer.session.index >= scenarioTrainer.session.queue.length - 1;
    if (nextBtn) nextBtn.textContent = isLast ? '׳¡׳™׳•׳ ׳¡׳©׳ ׳•׳—׳–׳¨׳” ׳׳‘׳™׳×' : '׳”׳׳©׳ ׳׳¡׳¦׳ ׳” ׳”׳‘׳׳”';

    showScenarioScreen('score');
}

function moveToNextScenario() {
    if (!scenarioTrainer.session) {
        openScenarioHome();
        return;
    }

    const isLast = scenarioTrainer.session.index >= scenarioTrainer.session.queue.length - 1;
    if (isLast) {
        if (!scenarioTrainer.didRecordSession) {
            recordSession();
            scenarioTrainer.didRecordSession = true;
        }
        playScenarioSound('finish');
        openScenarioHome();
        showHint('׳¡׳©׳ ׳”׳•׳©׳׳. ׳”׳׳©׳ ׳׳¢׳•׳׳”!');
        return;
    }

    scenarioTransitionTo(SCENARIO_STATES.NEXT_SCENARIO, true);
    scenarioTrainer.session.index += 1;
    scenarioTransitionTo(SCENARIO_STATES.SCENARIO, true);
    renderScenarioPlayScreen();
    playScenarioSound('next');
}

function renderScenarioHistoryList() {
    const list = document.getElementById('scenario-history-list');
    if (!list) return;
    list.innerHTML = '';

    const history = scenarioTrainer.progress.history || [];
    if (!history.length) {
        const empty = document.createElement('div');
        empty.className = 'scenario-history-empty';
        empty.textContent = '׳¢׳“׳™׳™׳ ׳׳™׳ ׳”׳™׳¡׳˜׳•׳¨׳™׳”. ׳©׳—׳§/׳™ ׳¡׳¦׳ ׳” ׳¨׳׳©׳•׳ ׳” ׳›׳“׳™ ׳׳”׳×׳—׳™׳.';
        list.appendChild(empty);
        return;
    }

    history.forEach(entry => {
        const card = document.createElement('div');
        card.className = 'scenario-history-item';

        const title = document.createElement('strong');
        title.textContent = `${entry.title} (${entry.domain})`;

        const meta = document.createElement('p');
        meta.className = 'meta';
        const scoreBadge = entry.score ? 'ג“ ׳™׳¨׳•׳§' : 'X ׳׳“׳•׳';
        const date = new Date(entry.timestamp).toLocaleString('he-IL');
        meta.textContent = `${scoreBadge} | ${entry.selectedOptionText} | ${date}`;

        card.appendChild(title);
        card.appendChild(meta);

        if (entry.note) {
            const note = document.createElement('p');
            note.className = 'meta';
            note.textContent = `׳”׳¢׳¨׳”: ${entry.note}`;
            card.appendChild(note);
        }

        list.appendChild(card);
    });
}

function exportScenarioHistory() {
    const payload = {
        exportedAt: new Date().toISOString(),
        progress: scenarioTrainer.progress,
        history: scenarioTrainer.progress.history || []
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `scenario_trainer_history_${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
}

function clearScenarioHistory() {
    const ok = window.confirm('׳׳ ׳§׳•׳× ׳׳× ׳›׳ ׳”׳™׳¡׳˜׳•׳¨׳™׳™׳× ׳”׳¡׳¦׳ ׳•׳×?');
    if (!ok) return;
    scenarioTrainer.progress = getDefaultScenarioProgress();
    saveScenarioTrainerProgress();
    renderScenarioHomeStats();
    renderScenarioHistoryList();
}

function saveScenarioSettingsFromForm() {
    const domain = document.getElementById('scenario-setting-domain')?.value || 'all';
    const difficulty = document.getElementById('scenario-setting-difficulty')?.value || 'all';
    const soundEnabled = !!document.getElementById('scenario-setting-sound')?.checked;
    const prismWheelEnabled = !!document.getElementById('scenario-setting-prism')?.checked;

    scenarioTrainer.settings = {
        ...scenarioTrainer.settings,
        defaultDomain: domain,
        defaultDifficulty: difficulty,
        soundEnabled,
        prismWheelEnabled
    };
    saveScenarioTrainerSettings();
    applyScenarioSettingsToControls();
    showHint('׳”׳’׳“׳¨׳•׳× Scenario ׳ ׳©׳׳¨׳•');
    openScenarioHome();
}

async function setupScenarioTrainerModule() {
    if (!document.getElementById('scenario-trainer')) return;

    scenarioTrainer.settings = loadScenarioTrainerSettings();
    scenarioTrainer.progress = loadScenarioTrainerProgress();

    bindScenarioClick('scenario-home-scenes', openScenarioDomainPicker);
    bindScenarioClick('scenario-home-prisms', () => navigateTo('prismlab'));
    bindScenarioClick('scenario-home-history', openScenarioHistoryScreen);
    bindScenarioClick('scenario-home-settings', openScenarioSettingsScreen);
    bindScenarioClick('scenario-back-home-from-domain', openScenarioHome);
    bindScenarioClick('scenario-back-home-from-history', openScenarioHome);
    bindScenarioClick('scenario-back-home-from-settings', openScenarioHome);
    bindScenarioClick('scenario-start-run-btn', startScenarioRun);
    bindScenarioClick('scenario-show-blueprint-btn', showScenarioBlueprint);
    bindScenarioClick('scenario-copy-green-btn', copyScenarioGreenSentence);
    bindScenarioClick('scenario-open-box-btn', () => runScenarioProbe('open'));
    bindScenarioClick('scenario-knife-btn', () => runScenarioProbe('knife'));
    bindScenarioClick('scenario-finish-scene-btn', finishScenarioBlueprint);
    bindScenarioClick('scenario-next-scene-btn', moveToNextScenario);
    bindScenarioClick('scenario-back-home-btn', openScenarioHome);
    bindScenarioClick('scenario-export-history-btn', exportScenarioHistory);
    bindScenarioClick('scenario-clear-history-btn', clearScenarioHistory);
    bindScenarioClick('scenario-save-settings-btn', saveScenarioSettingsFromForm);

    const runSlider = document.getElementById('scenario-run-size');
    const runValue = document.getElementById('scenario-run-size-value');
    if (runSlider && runValue && runSlider.dataset.scenarioBound !== 'true') {
        runSlider.dataset.scenarioBound = 'true';
        runValue.textContent = runSlider.value;
        runSlider.addEventListener('input', () => {
            runValue.textContent = runSlider.value;
        });
    }

    const loaded = await loadScenarioTrainerData();
    if (loaded) populateScenarioSelects();
    renderScenarioHomeStats();
    setScenarioSafetyNoticeVisible(false);
    openScenarioHome();
}

const COMIC_SCENE_LIBRARY = [
    {
        key: 'work_presentation',
        title: '׳¢׳‘׳•׳“׳”: ׳׳¦׳’׳×',
        subtitle: '׳“׳™׳•׳§ ׳׳¡׳¨, ׳׳‘׳ ׳” ׳•׳“׳׳™׳‘׳¨׳™.',
        path: 'assets/svg/comics/scenes/׳¢׳‘׳•׳“׳”_׳׳¦׳’׳×.svg'
    },
    {
        key: 'bureaucracy_form',
        title: '׳‘׳™׳•׳¨׳•׳§׳¨׳˜׳™׳”: ׳˜׳•׳₪׳¡',
        subtitle: '׳׳”׳₪׳•׳ ׳”׳•׳¨׳׳•׳× ׳¢׳׳•׳׳•׳× ׳׳¦׳¢׳“׳™׳ ׳‘׳¨׳•׳¨׳™׳.',
        path: 'assets/svg/comics/scenes/׳‘׳™׳•׳¨׳•׳§׳¨׳˜׳™׳”_׳˜׳•׳₪׳¡.svg'
    },
    {
        key: 'bureaucracy_money',
        title: '׳‘׳™׳•׳¨׳•׳§׳¨׳˜׳™׳”: ׳׳¨׳ ׳•׳ ׳”',
        subtitle: '׳¡׳™׳“׳•׳¨ ׳–׳¨׳™׳׳× ׳×׳©׳׳•׳ ׳•׳₪׳¨׳˜׳™׳ ׳—׳¡׳¨׳™׳.',
        path: 'assets/svg/comics/scenes/׳›׳¡׳£_׳׳¨׳ ׳•׳ ׳”.svg'
    },
    {
        key: 'parenting_homework',
        title: '׳”׳•׳¨׳•׳×: ׳©׳™׳¢׳•׳¨׳™ ׳‘׳™׳×',
        subtitle: '׳׳” ׳¢׳•׳©׳™׳ ׳§׳•׳“׳ ׳•׳׳” ׳—׳¡׳¨ ׳›׳“׳™ ׳׳”׳×׳—׳™׳.',
        path: 'assets/svg/comics/scenes/׳”׳•׳¨׳•׳×_׳©׳™׳¢׳•׳¨׳™׳.svg'
    },
    {
        key: 'relationships_apology',
        title: '׳–׳•׳’׳™׳•׳×: ׳”׳×׳ ׳¦׳׳•׳×',
        subtitle: '׳׳¢׳‘׳™׳¨׳™׳ ׳׳׳©׳׳” ׳׳¦׳¢׳“׳™ ׳×׳™׳§׳•׳ ׳¡׳₪׳¦׳™׳₪׳™׳™׳.',
        path: 'assets/svg/comics/scenes/׳–׳•׳’׳™׳•׳×_׳¡׳׳™׳—׳”.svg'
    },
    {
        key: 'home_tech_cleanup',
        title: '׳‘׳™׳×/׳˜׳›׳ ׳™: ׳ ׳™׳§׳•׳™',
        subtitle: '׳׳©׳™׳׳” ׳˜׳›׳ ׳™׳× ׳¢׳ ׳©׳׳‘׳™ ׳‘׳™׳¦׳•׳¢ ׳׳₪׳•׳¨׳©׳™׳.',
        path: 'assets/svg/comics/scenes/׳˜׳›׳ ׳™_׳ ׳™׳§׳•׳™_׳§׳‘׳¦׳™׳.svg'
    },
    {
        key: 'cooking_lasagna',
        title: '׳‘׳™׳©׳•׳: ׳׳–׳ ׳™׳”',
        subtitle: '׳—׳©׳™׳‘׳× ׳×׳”׳׳™׳ ׳׳₪׳¢׳•׳׳•׳× ׳™׳•׳׳™׳•׳׳™׳•׳×.',
        path: 'assets/svg/comics/scenes/׳‘׳™׳©׳•׳_׳׳–׳ ׳™׳”.svg'
    }
];

const DOMAIN_TO_COMIC_SCENE_KEY = {
    parenting: 'parenting_homework',
    relationships: 'relationships_apology',
    work: 'work_presentation',
    bureaucracy: 'bureaucracy_form',
    home_tech: 'home_tech_cleanup'
};

const TAB_TO_COMIC_SCENE_KEYS = {
    home: ['work_presentation', 'parenting_homework', 'relationships_apology'],
    'scenario-trainer': ['work_presentation', 'bureaucracy_form', 'parenting_homework'],
    'comic-engine': ['parenting_homework', 'bureaucracy_form', 'work_presentation'],
    categories: ['relationships_apology', 'home_tech_cleanup', 'work_presentation'],
    'practice-question': ['parenting_homework', 'home_tech_cleanup', 'bureaucracy_form'],
    'practice-radar': ['parenting_homework', 'home_tech_cleanup', 'bureaucracy_form'],
    'practice-triples-radar': ['parenting_homework', 'home_tech_cleanup', 'bureaucracy_form'],
    'practice-wizard': ['parenting_homework', 'home_tech_cleanup', 'bureaucracy_form'],
    'practice-sentence-morpher': ['relationships_apology', 'work_presentation', 'parenting_homework'],
    blueprint: ['work_presentation', 'cooking_lasagna', 'bureaucracy_form'],
    prismlab: ['home_tech_cleanup', 'relationships_apology', 'bureaucracy_form'],
    about: ['work_presentation', 'relationships_apology', 'cooking_lasagna']
};
const ENABLE_GLOBAL_COMIC_STRIP = false;
const GLOBAL_COMIC_STRIP_ENABLED_TABS = new Set(['scenario-trainer', 'comic-engine']);
let selectedGlobalComicScene = null;

function getActiveTabName() {
    return document.querySelector('.tab-btn.active')?.getAttribute('data-tab') || 'home';
}

function getComicSceneByKey(key) {
    return COMIC_SCENE_LIBRARY.find(scene => scene.key === key) || null;
}

function resolveComicSceneForScenario(scenario) {
    if (!scenario || typeof scenario !== 'object') return null;

    const explicitScenePath = (scenario.sceneArt || scenario.scene || scenario.sceneImage || '').trim();
    if (explicitScenePath) {
        return {
            key: `custom:${explicitScenePath}`,
            title: scenario.title || 'Scenario',
            subtitle: 'Custom scene',
            path: explicitScenePath
        };
    }

    const scenarioId = String(scenario.scenarioId || scenario.id || '').toLowerCase();
    const scenarioTitle = String(scenario.title || '').toLowerCase();
    const domainKey = String(scenario.domain || '').toLowerCase();
    const haystack = `${scenarioId} ${scenarioTitle} ${domainKey}`;

    if (haystack.includes('presentation') || haystack.includes('client') || haystack.includes('bugfix')) {
        return getComicSceneByKey('work_presentation');
    }
    if (haystack.includes('arnona')) {
        return getComicSceneByKey('bureaucracy_money');
    }
    if (haystack.includes('bureaucracy') || haystack.includes('form') || haystack.includes('222')) {
        return getComicSceneByKey('bureaucracy_form');
    }
    if (haystack.includes('parent') || haystack.includes('homework') || haystack.includes('morning') || haystack.includes('room')) {
        return getComicSceneByKey('parenting_homework');
    }
    if (haystack.includes('relationship') || haystack.includes('apology') || haystack.includes('on_time') || haystack.includes('talk')) {
        return getComicSceneByKey('relationships_apology');
    }
    if (haystack.includes('home_tech') || haystack.includes('tech') || haystack.includes('cleanup')) {
        return getComicSceneByKey('home_tech_cleanup');
    }

    return getComicSceneByKey(DOMAIN_TO_COMIC_SCENE_KEY[domainKey] || '');
}

function getComicScenesForTab(tabName, scenario = null) {
    const activeTab = tabName || getActiveTabName();
    const keys = [];

    const scenarioScene = resolveComicSceneForScenario(scenario);
    if (scenarioScene) keys.push(scenarioScene.key);

    const tabDefaults = TAB_TO_COMIC_SCENE_KEYS[activeTab] || TAB_TO_COMIC_SCENE_KEYS.home || [];
    tabDefaults.forEach(key => keys.push(key));

    const resolved = keys
        .map(key => (key.startsWith('custom:') ? scenarioScene : getComicSceneByKey(key)))
        .filter(Boolean);

    const seen = new Set();
    return resolved.filter(scene => {
        const uniqueKey = scene.key || scene.path;
        if (seen.has(uniqueKey)) return false;
        seen.add(uniqueKey);
        return true;
    }).slice(0, 4);
}

function closeComicPreviewModal() {
    const modal = document.getElementById('comicPreviewModal');
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.style.removeProperty('overflow');
}

function openComicPreviewModal(scene) {
    if (!scene) return;

    const modal = document.getElementById('comicPreviewModal');
    const image = document.getElementById('comicPreviewImage');
    const title = document.getElementById('comicPreviewTitle');
    const subtitle = document.getElementById('comicPreviewSubtitle');
    if (!modal || !image || !title || !subtitle) return;

    image.src = scene.path;
    image.alt = scene.title || 'Comic Scene';
    title.textContent = scene.title || '׳×׳¦׳•׳’׳× ׳§׳•׳׳™׳§׳¡';
    subtitle.textContent = scene.subtitle || '';

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function setupGlobalComicStripActions() {
    if (!ENABLE_GLOBAL_COMIC_STRIP) return;

    const previewBtn = document.getElementById('global-comic-main-preview');
    const practiceBtn = document.getElementById('global-comic-main-practice');
    const modal = document.getElementById('comicPreviewModal');
    const closeBtn = document.getElementById('comicPreviewClose');
    const goPracticeBtn = document.getElementById('comicPreviewGoPractice');
    if (!previewBtn || !practiceBtn || !modal || !closeBtn || !goPracticeBtn) return;

    previewBtn.addEventListener('click', () => {
        if (!selectedGlobalComicScene) return;
        openComicPreviewModal(selectedGlobalComicScene);
    });

    practiceBtn.addEventListener('click', () => {
        navigateTo('comic-engine');
    });

    closeBtn.addEventListener('click', closeComicPreviewModal);
    goPracticeBtn.addEventListener('click', () => {
        closeComicPreviewModal();
        navigateTo('comic-engine');
    });

    modal.addEventListener('click', (event) => {
        if (event.target === modal) closeComicPreviewModal();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
            closeComicPreviewModal();
        }
    });
}

function renderGlobalComicStrip(tabName = getActiveTabName(), scenario = null) {
    const strip = document.getElementById('global-comic-strip');
    const mainImg = document.getElementById('global-comic-main-img');
    const mainTitle = document.getElementById('global-comic-main-title');
    const mainSubtitle = document.getElementById('global-comic-main-subtitle');
    const previewBtn = document.getElementById('global-comic-main-preview');
    const practiceBtn = document.getElementById('global-comic-main-practice');
    const thumbs = document.getElementById('global-comic-thumbs');
    if (!strip || !mainImg || !mainTitle || !mainSubtitle || !previewBtn || !practiceBtn || !thumbs) return;

    if (!ENABLE_GLOBAL_COMIC_STRIP) {
        strip.classList.add('hidden');
        selectedGlobalComicScene = null;
        closeComicPreviewModal();
        return;
    }

    const activeTab = tabName || getActiveTabName();
    if (!GLOBAL_COMIC_STRIP_ENABLED_TABS.has(activeTab)) {
        strip.classList.add('hidden');
        selectedGlobalComicScene = null;
        closeComicPreviewModal();
        return;
    }

    const scenes = getComicScenesForTab(activeTab, scenario);
    if (!scenes.length) {
        strip.classList.add('hidden');
        selectedGlobalComicScene = null;
        return;
    }

    strip.classList.remove('hidden');
    const selectedKey = strip.dataset.selectedScene || scenes[0].key;
    const selected = scenes.find(scene => scene.key === selectedKey) || scenes[0];
    strip.dataset.selectedScene = selected.key;

    mainImg.src = selected.path;
    mainImg.alt = selected.title;
    mainTitle.textContent = selected.title;
    mainSubtitle.textContent = selected.subtitle || 'Meta Model comic scene';
    selectedGlobalComicScene = selected;
    previewBtn.setAttribute('aria-label', `׳×׳¦׳•׳’׳”: ${selected.title}`);
    practiceBtn.setAttribute('aria-label', `׳׳¢׳‘׳¨ ׳׳×׳¨׳’׳•׳: ${selected.title}`);

    thumbs.innerHTML = '';
    scenes.forEach(scene => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `global-comic-thumb${scene.key === selected.key ? ' active' : ''}`;
        btn.setAttribute('role', 'listitem');
        btn.setAttribute('aria-label', scene.title);
        btn.addEventListener('click', () => {
            strip.dataset.selectedScene = scene.key;
            renderGlobalComicStrip(activeTab, scenario);
        });

        const img = document.createElement('img');
        img.src = scene.path;
        img.alt = scene.title;
        img.loading = 'lazy';

        const textWrap = document.createElement('div');
        const title = document.createElement('p');
        title.className = 'global-comic-thumb-title';
        title.textContent = scene.title;
        const subtitle = document.createElement('p');
        subtitle.className = 'global-comic-thumb-subtitle';
        subtitle.textContent = scene.subtitle || '';

        textWrap.appendChild(title);
        textWrap.appendChild(subtitle);
        btn.appendChild(img);
        btn.appendChild(textWrap);
        thumbs.appendChild(btn);
    });
}

function renderScenarioComicStage(scenario) {
    const stage = document.getElementById('scenario-comic-stage');
    const layout = document.querySelector('#scenario-screen-play .scenario-play-layout');
    const image = document.getElementById('scenario-comic-image');
    const title = document.getElementById('scenario-comic-title');
    const subtitle = document.getElementById('scenario-comic-subtitle');
    if (!stage || !image || !title || !subtitle) return;

    const scene = resolveComicSceneForScenario(scenario);
    if (!scene) {
        stage.hidden = true;
        layout?.classList.add('no-comic');
        return;
    }

    image.src = scene.path;
    image.alt = scene.title;
    title.textContent = scene.title;

    const difficultyLabelMap = {
        easy: '׳§׳',
        medium: '׳‘׳™׳ ׳•׳ ׳™',
        hard: '׳§׳©׳”'
    };
    const details = [];
    if (scenario?.domainLabel || scenario?.domain) details.push(`׳×׳—׳•׳: ${scenario.domainLabel || scenario.domain}`);
    if (scenario?.difficulty) details.push(`׳¨׳׳”: ${difficultyLabelMap[scenario.difficulty] || scenario.difficulty}`);
    subtitle.textContent = details.join(' | ') || scene.subtitle || '׳™׳™׳¦׳•׳’ ׳—׳–׳•׳×׳™ ׳§׳¦׳¨ ׳©׳ ׳”׳¡׳™׳˜׳•׳׳¦׳™׳”';

    stage.hidden = false;
    layout?.classList.remove('no-comic');
}

// ==================== COMIC ENGINE 2.0 ====================

const COMIC_ENGINE_STORAGE_KEY = 'comic_engine_progress_v1';
const COMIC_ENGINE_PREFS_KEY = 'comic_engine_prefs_v1';
const COMMUNITY_WALL_STORAGE_KEY = 'community_feedback_wall_v1';

function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getComicToneClass(tone) {
    const allowed = new Set(['danger', 'warn', 'purple', 'muted', 'good']);
    const normalized = String(tone || 'muted').toLowerCase();
    return `tone-${allowed.has(normalized) ? normalized : 'muted'}`;
}

function getComicOutcome(choiceId) {
    const map = {
        angry: '׳”׳˜׳•׳ ׳¢׳•׳׳”, ׳”׳©׳™׳—׳” ׳ ׳¡׳’׳¨׳×, ׳•׳ ׳•׳¦׳¨׳× ׳™׳•׳×׳¨ ׳”׳×׳ ׳’׳“׳•׳×.',
        mock: '׳ ׳•׳¦׳¨׳× ׳‘׳•׳©׳” ׳•׳”׳¦׳“ ׳”׳©׳ ׳™ ׳׳₪׳¡׳™׳§ ׳׳©׳×׳£ ׳׳™׳“׳¢ ׳׳׳™׳×׳™.',
        rescue: '׳”׳‘׳¢׳™׳” ׳ ׳₪׳×׳¨׳× ׳¨׳’׳¢׳™׳×, ׳׳‘׳ ׳”׳™׳›׳•׳׳× ׳©׳ ׳”׳¦׳“ ׳”׳©׳ ׳™ ׳׳ ׳ ׳‘׳ ׳™׳×.',
        avoid: '׳”׳×׳§׳™׳¢׳•׳× ׳ ׳“׳—׳™׳× ׳•׳—׳•׳–׳¨׳× ׳׳—׳¨ ׳›׳ ׳¢׳ ׳™׳•׳×׳¨ ׳׳—׳¥.',
        meta: '׳”׳¢׳׳™׳׳•׳× ׳™׳•׳¨׳“׳× ׳•׳”׳•׳₪׳›׳× ׳׳×׳”׳׳™׳ ׳©׳׳₪׳©׳¨ ׳׳‘׳¦׳¢.'
    };
    return map[choiceId] || '׳‘׳—׳™׳¨׳” ׳–׳• ׳׳©׳ ׳” ׳׳× ׳”׳›׳™׳•׳•׳ ׳©׳ ׳”׳¡׳¦׳ ׳”.';
}

function buildComicBlueprintHtml(blueprint) {
    if (!blueprint) return '';

    const toList = (items) => (items || [])
        .map(item => `<li>${escapeHtml(item)}</li>`)
        .join('');

    return `
        <div class="blueprint">
            <h3>Blueprint (׳₪׳™׳¨׳•׳§ ׳₪׳¢׳•׳׳”)</h3>
            <div><b>׳׳˜׳¨׳”:</b> ${escapeHtml(blueprint.goal || '')}</div>
            <div><b>׳¦׳¢׳“ ׳¨׳׳©׳•׳:</b> ${escapeHtml(blueprint.first_step || '')}</div>
            <div><b>׳¦׳¢׳“ ׳׳—׳¨׳•׳:</b> ${escapeHtml(blueprint.last_step || '')}</div>

            <div style="margin-top:8px"><b>׳©׳׳‘׳™ ׳‘׳™׳ ׳™׳™׳:</b></div>
            <ul>${toList(blueprint.middle_steps)}</ul>

            <div style="margin-top:8px"><b>׳×׳ ׳׳™׳ ׳׳§׳“׳™׳׳™׳:</b></div>
            <ul>${toList(blueprint.preconditions)}</ul>

            <div style="margin-top:8px"><b>׳׳׳˜׳¨׳ ׳˜׳™׳‘׳•׳× ׳›׳©׳ ׳×׳§׳¢׳™׳:</b></div>
            <ul>${toList(blueprint.alternatives)}</ul>
        </div>
    `;
}

async function setupComicEngine2Legacy() {
    const els = {
        root: document.getElementById('comicEngine'),
        title: document.getElementById('comicTitle'),
        meta: document.getElementById('comicMeta'),
        quickParams: document.getElementById('comicQuickParams'),
        paramsPanel: document.getElementById('comicParamsPanel'),
        compactToggle: document.getElementById('comicCompactToggle'),
        paramAutoCompact: document.getElementById('comicParamAutoCompact'),
        paramShowSceneArt: document.getElementById('comicParamShowSceneArt'),
        paramShowCharacters: document.getElementById('comicParamShowCharacters'),
        paramTextScale: document.getElementById('comicParamTextScale'),
        paramTextScaleValue: document.getElementById('comicParamTextScaleValue'),
        charLeft: document.getElementById('charLeft'),
        charRight: document.getElementById('charRight'),
        dialog: document.getElementById('comicDialog'),
        choices: document.getElementById('comicChoices'),
        feedback: document.getElementById('comicFeedback'),
        feedbackLeft: document.getElementById('comicFeedbackLeft'),
        feedbackRight: document.getElementById('comicFeedbackRight'),
        btnNext: document.getElementById('btnNextScene')
    };

    if (!els.root || !els.title || !els.choices) return;

    let payload = null;
    try {
        const response = await fetch('data/comic-scenarios.json', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        payload = await response.json();
    } catch (error) {
        console.error('Cannot load data/comic-scenarios.json', error);
        els.title.textContent = '׳©׳’׳™׳׳” ׳‘׳˜׳¢׳™׳ ׳× ׳¡׳¦׳ ׳•׳× ׳§׳•׳׳™׳§׳¡';
        if (els.meta) els.meta.textContent = '';
        return;
    }

    const scenarios = Array.isArray(payload?.scenarios) ? payload.scenarios : [];
    if (!scenarios.length) {
        els.title.textContent = '׳׳™׳ ׳¡׳¦׳ ׳•׳× ׳§׳•׳׳™׳§׳¡ ׳›׳¨׳’׳¢';
        if (els.meta) els.meta.textContent = '';
        return;
    }

    let idx = 0;
    try {
        const saved = JSON.parse(localStorage.getItem(COMIC_ENGINE_STORAGE_KEY) || '{}');
        if (Number.isInteger(saved?.index) && saved.index >= 0 && saved.index < scenarios.length) {
            idx = saved.index;
        }
    } catch (error) {
        console.error('Comic engine progress parse failed', error);
    }

    const rememberComicProgress = () => {
        localStorage.setItem(COMIC_ENGINE_STORAGE_KEY, JSON.stringify({
            index: idx,
            updatedAt: new Date().toISOString()
        }));
    };

    const defaultPrefs = {
        compact: window.innerWidth <= 768,
        autoCompact: true,
        showSceneArt: true,
        showCharacters: true,
        textScale: 100,
        paramsOpen: false
    };

    const prefs = { ...defaultPrefs };

    try {
        const savedPrefs = JSON.parse(localStorage.getItem(COMIC_ENGINE_PREFS_KEY) || '{}');
        if (typeof savedPrefs?.compact === 'boolean') prefs.compact = savedPrefs.compact;
        if (typeof savedPrefs?.autoCompact === 'boolean') prefs.autoCompact = savedPrefs.autoCompact;
        if (typeof savedPrefs?.showSceneArt === 'boolean') prefs.showSceneArt = savedPrefs.showSceneArt;
        if (typeof savedPrefs?.showCharacters === 'boolean') prefs.showCharacters = savedPrefs.showCharacters;
        if (Number.isFinite(savedPrefs?.textScale)) prefs.textScale = Math.min(115, Math.max(90, savedPrefs.textScale));
        if (typeof savedPrefs?.paramsOpen === 'boolean') prefs.paramsOpen = savedPrefs.paramsOpen;
    } catch (error) {
        console.error('Comic engine prefs parse failed', error);
    }

    const rememberPrefs = () => {
        localStorage.setItem(COMIC_ENGINE_PREFS_KEY, JSON.stringify({
            compact: prefs.compact,
            autoCompact: prefs.autoCompact,
            showSceneArt: prefs.showSceneArt,
            showCharacters: prefs.showCharacters,
            textScale: prefs.textScale,
            paramsOpen: prefs.paramsOpen,
            updatedAt: new Date().toISOString()
        }));
    };

    const imgTag = (src, alt = '') => {
        const safeSrc = escapeHtml(src || '');
        const safeAlt = escapeHtml(alt || '');
        return `<img src="${safeSrc}" alt="${safeAlt}" loading="lazy">`;
    };

    const buildCharacterCard = (character = {}) => `
        <div class="comic-character-card">
            ${imgTag(character.sprite, character.name)}
            <div class="comic-character-name">${escapeHtml(character.name || '')}</div>
        </div>
    `;

    const buildSpeechCard = (character = {}, text = '') => `
        <div class="comic-speech-card" role="status" aria-live="polite">
            <div class="comic-speech-speaker">${escapeHtml(character.name || '')}</div>
            <div class="comic-speech-text">${escapeHtml(text || '')}</div>
        </div>
    `;

    let activeScenario = null;

    const updateCompactToggleState = () => {
        if (!els.compactToggle) return;
        els.compactToggle.setAttribute('aria-pressed', prefs.compact ? 'true' : 'false');
        els.compactToggle.textContent = prefs.compact ? '׳×׳¦׳•׳’׳” ׳׳׳׳”' : '׳׳¦׳‘ ׳§׳•׳׳₪׳§׳˜׳™';
    };

    const renderQuickParams = (scenario) => {
        if (!els.quickParams || !scenario) return;

        const dialogCount = Array.isArray(scenario.dialog) ? scenario.dialog.length : 0;
        const choicesCount = Array.isArray(scenario.choices) ? scenario.choices.length : 0;
        const metaChoice = (scenario.choices || []).find(choice => choice?.id === 'meta');
        const goal = metaChoice?.blueprint?.goal || '';

        const chips = [
            `<span class="comic-param-chip"><b>׳×׳—׳•׳</b> ${escapeHtml(scenario.domain || '׳׳ ׳¦׳•׳™׳')}</span>`,
            `<span class="comic-param-chip"><b>׳“׳™׳׳׳•׳’</b> ${dialogCount} ׳©׳•׳¨׳•׳×</span>`,
            `<span class="comic-param-chip"><b>׳׳₪׳©׳¨׳•׳™׳•׳×</b> ${choicesCount}</span>`,
            `<span class="comic-param-chip"><b>׳×׳¦׳•׳’׳”</b> ${prefs.compact ? '׳§׳•׳׳₪׳§׳˜׳™׳×' : '׳¨׳’׳™׳׳”'}</span>`
        ];

        if (goal) {
            chips.push(`<span class="comic-param-chip"><b>׳׳˜׳¨׳”</b> ${escapeHtml(goal)}</span>`);
        }

        els.quickParams.innerHTML = chips.join('');
    };

    const syncPreferenceControls = () => {
        if (els.paramAutoCompact) els.paramAutoCompact.checked = prefs.autoCompact;
        if (els.paramShowSceneArt) els.paramShowSceneArt.checked = prefs.showSceneArt;
        if (els.paramShowCharacters) els.paramShowCharacters.checked = prefs.showCharacters;
        if (els.paramTextScale) els.paramTextScale.value = String(prefs.textScale);
        if (els.paramTextScaleValue) els.paramTextScaleValue.textContent = `${prefs.textScale}%`;
        if (els.paramsPanel) els.paramsPanel.open = !!prefs.paramsOpen;
        updateCompactToggleState();
    };

    const applyVisualPrefs = () => {
        if (!els.root) return;

        els.root.classList.toggle('is-compact', prefs.compact);
        els.root.classList.toggle('hide-scene-art', !prefs.showSceneArt);
        els.root.classList.toggle('hide-characters', !prefs.showCharacters);
        els.root.style.setProperty('--comic-text-scale', String(prefs.textScale / 100));

        syncPreferenceControls();
        renderQuickParams(activeScenario);
    };

    const setCompact = (isCompact, { persist = true } = {}) => {
        prefs.compact = Boolean(isCompact);
        applyVisualPrefs();
        if (persist) rememberPrefs();
    };

    const renderScenario = (scenario) => {
        if (!scenario) return;
        activeScenario = scenario;

        if (els.feedback) els.feedback.hidden = true;
        if (els.root) els.root.classList.remove('has-selection');
        if (els.btnNext) {
            els.btnNext.disabled = true;
            els.btnNext.onclick = null;
        }

        els.title.textContent = scenario.title || '׳¡׳¦׳ ׳”';
        if (els.meta) els.meta.textContent = `׳×׳—׳•׳: ${scenario.domain || '׳׳ ׳¦׳•׳™׳'}`;
        renderQuickParams(scenario);

        const left = scenario?.characters?.left || {};
        const right = scenario?.characters?.right || {};

        if (els.charLeft) {
            els.charLeft.innerHTML = buildCharacterCard(left);
        }

        if (els.charRight) {
            els.charRight.innerHTML = buildCharacterCard(right);
        }

        const dialogLines = (scenario.dialog || []).map(line => {
            const speaker = line?.speaker === 'left' ? left.name : right.name;
            return `
                <div class="comic-line">
                    <div class="who">${escapeHtml(speaker || '')}</div>
                    <div class="comic-line-text">${escapeHtml(line?.text || '')}</div>
                </div>
            `;
        }).join('');

        const sceneArt = resolveComicSceneForScenario(scenario);
        const scenePreview = sceneArt
            ? `
                <div class="comic-scene-inline">
                    ${imgTag(sceneArt.path, sceneArt.title)}
                    <div class="comic-scene-inline-caption">${escapeHtml(sceneArt.title || '')}</div>
                </div>
            `
            : '';

        if (els.dialog) els.dialog.innerHTML = `${scenePreview}${dialogLines}`;
        renderGlobalComicStrip('comic-engine', scenario);

        const choices = Array.isArray(scenario.choices) ? scenario.choices : [];
        els.choices.innerHTML = choices.map(choice => {
            const icon = choice.sfx || choice.badge || '';
            return `
                <button class="choice-btn ${getComicToneClass(choice.tone)}" data-choice="${escapeHtml(choice.id)}">
                    <span style="text-align:right">${escapeHtml(choice.label || '')}</span>
                    ${icon ? imgTag(icon, choice.label || '') : ''}
                </button>
            `;
        }).join('');

        els.choices.onclick = (event) => {
            const btn = event.target.closest('button[data-choice]');
            if (!btn) return;

            const choiceId = btn.getAttribute('data-choice');
            const selected = choices.find(item => item.id === choiceId);
            if (!selected) return;

            applyChoiceV2(scenario, selected, right);
        };
    };

    const applyChoice = (scenario, choice, rightCharacter) => {
        if (els.feedback) els.feedback.hidden = false;

        const badge = choice.badge ? imgTag(choice.badge, 'badge') : '';
        const sfx = choice.sfx ? imgTag(choice.sfx, 'sfx') : '';
        if (els.feedbackLeft) {
            els.feedbackLeft.innerHTML = `
                <div style="display:grid;gap:10px">
                    ${badge}
                    ${sfx}
                </div>
            `;
        }

        const outcome = choice.outcome || getComicOutcome(choice.id);
        let rightHtml = `
            <div class="comic-feedback-summary">
                <div style="color:#6B7280;font-weight:900;margin-bottom:6px">׳”׳×׳’׳•׳‘׳” ׳©׳׳</div>
                <div style="font-weight:900">${escapeHtml(choice.say || '')}</div>
                <div style="margin-top:10px; color:#1f2937;">${escapeHtml(outcome)}</div>
            </div>
        `;

        if (choice.blueprint) {
            rightHtml += buildComicBlueprintHtml(choice.blueprint);
        }

        if (els.feedbackRight) els.feedbackRight.innerHTML = rightHtml;

        if (els.btnNext) {
            els.btnNext.disabled = false;
            els.btnNext.onclick = () => {
                idx = (idx + 1) % scenarios.length;
                rememberComicProgress();
                renderScenario(scenarios[idx]);
                els.root.scrollIntoView({ behavior: 'smooth', block: 'start' });
            };
        }

        const altChars = [
            'assets/svg/characters/׳“׳ ׳™׳׳.svg',
            'assets/svg/characters/׳׳™׳¨׳•׳.svg',
            'assets/svg/characters/׳¢׳“׳.svg'
        ];
        const calmChar = 'assets/svg/characters/׳©׳™׳¨׳™.svg';

        const rightImg = els.charRight?.querySelector('img');
        if (!rightImg) return;

        const override = choice.rightSpriteOverride;
        if (override) {
            rightImg.setAttribute('src', override);
            rightImg.setAttribute('alt', rightCharacter?.name || '');
            return;
        }

        if (choice.id === 'meta') {
            rightImg.setAttribute('src', calmChar);
            rightImg.setAttribute('alt', rightCharacter?.name || '');
        } else {
            const pick = altChars[Math.floor(Math.random() * altChars.length)];
            rightImg.setAttribute('src', pick);
            rightImg.setAttribute('alt', rightCharacter?.name || '');
        }
    };

    const applyChoiceV2 = (scenario, choice, rightCharacter) => {
        if (els.feedback) els.feedback.hidden = false;
        if (els.root) els.root.classList.add('has-selection');

        els.choices.querySelectorAll('button.choice-btn').forEach(button => {
            button.disabled = true;
            button.classList.add('is-locked');
        });

        const badge = choice.badge ? imgTag(choice.badge, 'badge') : '';
        const sfx = choice.sfx ? imgTag(choice.sfx, 'sfx') : '';
        if (els.feedbackLeft) {
            els.feedbackLeft.innerHTML = `
                <div style="display:grid;gap:10px">
                    ${badge}
                    ${sfx}
                </div>
            `;
        }

        const outcome = choice.outcome || getComicOutcome(choice.id);
        const followupTitle = choice.id === 'meta'
            ? '׳“׳™׳׳׳•׳’ ׳”׳׳©׳: ׳–׳” ׳׳×׳—׳™׳ ׳׳¢׳‘׳•׳“'
            : '׳“׳™׳׳׳•׳’ ׳”׳׳©׳: ׳׳×׳‘׳¨׳¨ ׳©׳–׳” ׳׳ ׳¢׳•׳‘׳“';
        const noteFieldId = `comic-note-${String(scenario?.id || 'scene').replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'scene'}`;

        if (els.charRight) {
            els.charRight.innerHTML = buildSpeechCard(rightCharacter, choice.say || '');
        }

        if (els.dialog) {
            els.dialog.innerHTML = `
                <div class="comic-line comic-line-user-turn">
                    <div class="who">׳׳” ׳©׳ ׳׳׳¨ ׳‘׳₪׳•׳¢׳</div>
                    <div class="comic-line-text">${escapeHtml(choice.say || '')}</div>
                </div>
                <div class="comic-line comic-line-followup ${choice.id === 'meta' ? 'success' : 'fail'}">
                    <div class="who">${followupTitle}</div>
                    <div class="comic-line-text">${escapeHtml(outcome)}</div>
                </div>
            `;
        }

        let rightHtml = `
            <div class="comic-feedback-summary">
                <div style="color:#6B7280;font-weight:900;margin-bottom:6px">׳”׳×׳’׳•׳‘׳” ׳©׳׳</div>
                <div style="font-weight:900">${escapeHtml(choice.say || '')}</div>
                <div style="margin-top:10px; color:#1f2937;">${escapeHtml(outcome)}</div>
            </div>
            <div class="comic-explain-box">
                <label for="${noteFieldId}">׳׳׳” ׳–׳” ׳¢׳‘׳“ ׳׳• ׳׳ ׳¢׳‘׳“? ׳›׳×׳‘׳• ׳”׳¡׳‘׳¨ ׳§׳¦׳¨:</label>
                <textarea id="${noteFieldId}" rows="3" placeholder="׳׳“׳•׳’׳׳”: ׳׳” ׳”׳™׳” ׳—׳¡׳¨, ׳׳” ׳×׳§׳¢ ׳׳× ׳”׳¦׳“ ׳”׳©׳ ׳™, ׳•׳׳” ׳׳₪׳©׳¨ ׳׳©׳׳•׳ ׳‘׳׳§׳•׳..."></textarea>
            </div>
        `;

        if (choice.blueprint) {
            rightHtml += buildComicBlueprintHtml(choice.blueprint);
        }

        if (els.feedbackRight) els.feedbackRight.innerHTML = rightHtml;

        if (els.btnNext) {
            els.btnNext.disabled = false;
            els.btnNext.onclick = () => {
                idx = (idx + 1) % scenarios.length;
                rememberComicProgress();
                renderScenario(scenarios[idx]);
                els.root.scrollIntoView({ behavior: 'smooth', block: 'start' });
            };
        }

        if (prefs.autoCompact) {
            setCompact(true, { persist: true });
        } else {
            renderQuickParams(scenario);
        }
    };

    if (els.compactToggle) {
        els.compactToggle.addEventListener('click', () => {
            setCompact(!prefs.compact, { persist: true });
        });
    }

    if (els.paramsPanel) {
        els.paramsPanel.addEventListener('toggle', () => {
            prefs.paramsOpen = els.paramsPanel.open;
            rememberPrefs();
        });
    }

    if (els.paramAutoCompact) {
        els.paramAutoCompact.addEventListener('change', () => {
            prefs.autoCompact = !!els.paramAutoCompact.checked;
            renderQuickParams(activeScenario);
            rememberPrefs();
        });
    }

    if (els.paramShowSceneArt) {
        els.paramShowSceneArt.addEventListener('change', () => {
            prefs.showSceneArt = !!els.paramShowSceneArt.checked;
            applyVisualPrefs();
            rememberPrefs();
        });
    }

    if (els.paramShowCharacters) {
        els.paramShowCharacters.addEventListener('change', () => {
            prefs.showCharacters = !!els.paramShowCharacters.checked;
            applyVisualPrefs();
            rememberPrefs();
        });
    }

    if (els.paramTextScale) {
        els.paramTextScale.addEventListener('input', () => {
            prefs.textScale = Number(els.paramTextScale.value) || 100;
            applyVisualPrefs();
            rememberPrefs();
        });
    }

    applyVisualPrefs();
    renderScenario(scenarios[idx]);
}

function evaluateCommunityMessage(text) {
    const message = String(text || '').trim();
    const words = message.split(/\s+/).filter(Boolean);

    let score = 35;
    const tips = [];
    const strengths = [];

    const hasQuestionMark = /[?״]/.test(message);
    if (hasQuestionMark) {
        score += 15;
        strengths.push('׳ ׳•׳¡׳— ׳›׳©׳׳׳” ׳‘׳¨׳•׳¨׳”');
    } else {
        tips.push('׳׳”׳•׳¡׳™׳£ ׳¡׳™׳׳ ׳©׳׳׳” ׳›׳“׳™ ׳׳׳¡׳’׳¨ ׳‘׳§׳©׳” ׳‘׳¨׳•׳¨׳”.');
    }

    const questionWords = ['׳׳”', '׳׳™׳', '׳׳׳”', '׳׳×׳™', '׳׳™', '׳׳™׳₪׳”', '׳׳™׳–׳”', '׳›׳׳”', '׳‘׳׳™׳–׳”', '׳׳׳™'];
    const hasQuestionWord = questionWords.some(word => message.includes(word));
    if (hasQuestionWord) {
        score += 15;
        strengths.push('׳™׳© ׳׳™׳׳× ׳©׳׳׳” ׳׳׳§׳“׳×');
    } else {
        tips.push('׳׳”׳•׳¡׳™׳£ ׳׳™׳׳× ׳©׳׳׳” ׳׳׳•׳§׳“׳× (׳׳”/׳׳™׳/׳׳×׳™/׳׳™/׳׳™׳–׳”).');
    }

    if (words.length >= 10) {
        score += 20;
        strengths.push('׳™׳© ׳”׳§׳©׳¨ ׳׳¡׳₪׳§');
    } else if (words.length >= 6) {
        score += 10;
        tips.push('׳׳₪׳©׳¨ ׳׳”׳•׳¡׳™׳£ ׳¢׳•׳“ ׳₪׳¨׳˜׳™ ׳”׳§׳©׳¨ ׳›׳“׳™ ׳׳—׳“׳“.');
    } else {
        tips.push('׳”׳ ׳™׳¡׳•׳— ׳§׳¦׳¨ ׳׳“׳™, ׳—׳¡׳¨׳™׳ ׳₪׳¨׳˜׳™׳ ׳׳©׳׳¢׳•׳×׳™׳™׳.');
    }

    const contextSignals = ['׳‘׳¡׳™׳˜׳•׳׳¦׳™׳”', '׳‘׳׳¦׳‘', '׳›׳©', '׳׳—׳¨׳™', '׳׳₪׳ ׳™', '׳׳•׳', '׳¢׳', '׳‘׳‘׳™׳×', '׳‘׳¢׳‘׳•׳“׳”', '׳‘׳›׳™׳×׳”'];
    const hasContext = contextSignals.some(word => message.includes(word));
    if (hasContext) {
        score += 15;
        strengths.push('׳”׳”׳§׳©׳¨ ׳”׳¡׳™׳˜׳•׳׳¦׳™׳•׳ ׳™ ׳‘׳¨׳•׳¨');
    } else {
        tips.push('׳׳”׳•׳¡׳™׳£ ׳׳™׳₪׳”/׳׳•׳ ׳׳™/׳׳×׳™ ׳–׳” ׳§׳•׳¨׳” ׳‘׳₪׳•׳¢׳.');
    }

    const outcomeSignals = ['׳›׳“׳™', '׳׳˜׳¨׳”', '׳¨׳•׳¦׳”', '׳¨׳•׳¦׳™׳', '׳׳”׳©׳™׳’', '׳׳”׳¦׳׳™׳—', '׳×׳•׳¦׳׳”'];
    const hasOutcome = outcomeSignals.some(word => message.includes(word));
    if (hasOutcome) {
        score += 10;
        strengths.push('׳™׳© ׳×׳•׳¦׳׳” ׳¨׳¦׳•׳™׳”');
    } else {
        tips.push('׳׳”׳’׳“׳™׳¨ ׳׳” ׳”׳×׳•׳¦׳׳” ׳©׳׳×׳ ׳¨׳•׳¦׳™׳ ׳׳”׳©׳™׳’.');
    }

    score = Math.max(15, Math.min(100, score));

    let level = 'level-low';
    let levelLabel = '׳“׳•׳¨׳© ׳—׳™׳“׳•׳“';
    let summary = '׳›׳“׳׳™ ׳׳—׳“׳“ ׳׳× ׳”׳©׳׳׳”: ׳׳” ׳—׳¡׳¨, ׳‘׳׳™׳–׳” ׳”׳§׳©׳¨, ׳•׳׳” ׳¨׳•׳¦׳™׳ ׳׳”׳©׳™׳’.';

    if (score >= 75) {
        level = 'level-high';
        levelLabel = '׳׳“׳•׳™׳§ ׳׳׳•׳“';
        summary = '׳©׳׳׳” ׳—׳–׳§׳” ׳©׳׳¡׳™׳™׳¢׳× ׳׳—׳©׳•׳£ ׳׳™׳“׳¢ ׳—׳¡׳¨ ׳׳©׳׳¢׳•׳×׳™.';
    } else if (score >= 55) {
        level = 'level-mid';
        levelLabel = '׳›׳™׳•׳•׳ ׳˜׳•׳‘';
        summary = '׳ ׳™׳¡׳•׳— ׳˜׳•׳‘. ׳¢׳•׳“ ׳×׳•׳¡׳₪׳× ׳”׳§׳©׳¨ ׳§׳˜׳ ׳” ׳×׳”׳₪׳•׳ ׳׳•׳×׳• ׳׳׳“׳•׳™׳§ ׳™׳•׳×׳¨.';
    }

    return {
        score,
        level,
        levelLabel,
        summary,
        strengths: strengths.slice(0, 2),
        tips: tips.slice(0, 3)
    };
}

function setupCommunityFeedbackWall() {
    const els = {
        root: document.getElementById('communityWall'),
        form: document.getElementById('communityWallForm'),
        name: document.getElementById('communityName'),
        message: document.getElementById('communityMessage'),
        status: document.getElementById('communityWallStatus'),
        feed: document.getElementById('communityFeed'),
        clearBtn: document.getElementById('communityClearBtn')
    };

    if (!els.root || !els.form || !els.message || !els.feed) return;

    let entries = [];
    try {
        const parsed = JSON.parse(localStorage.getItem(COMMUNITY_WALL_STORAGE_KEY) || '[]');
        if (Array.isArray(parsed)) {
            entries = parsed.slice(0, 40);
        }
    } catch (error) {
        console.error('Community wall parse failed', error);
    }

    const formatDate = (isoString) => {
        try {
            return new Date(isoString).toLocaleString('he-IL', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return '';
        }
    };

    const saveEntries = () => {
        localStorage.setItem(COMMUNITY_WALL_STORAGE_KEY, JSON.stringify(entries.slice(0, 40)));
    };

    const renderFeed = () => {
        if (!entries.length) {
            els.feed.innerHTML = '<div class="community-empty">׳¢׳“׳™׳™׳ ׳׳™׳ ׳”׳•׳“׳¢׳•׳×. ׳›׳×׳‘׳• ׳¨׳׳©׳•׳ ׳™׳ ׳•׳§׳‘׳׳• ׳₪׳™׳“׳‘׳§ ׳¢׳ ׳”׳ ׳™׳¡׳•׳—.</div>';
            return;
        }

        els.feed.innerHTML = entries.map(entry => {
            const itemClass = entry?.analysis?.level || 'level-low';
            const score = Number.isFinite(entry?.analysis?.score) ? entry.analysis.score : 0;
            const levelLabel = escapeHtml(entry?.analysis?.levelLabel || '');
            const summary = escapeHtml(entry?.analysis?.summary || '');
            const tips = Array.isArray(entry?.analysis?.tips) ? entry.analysis.tips : [];
            const strengths = Array.isArray(entry?.analysis?.strengths) ? entry.analysis.strengths : [];
            const author = escapeHtml(entry.author || '׳׳©׳×׳׳©/׳×');
            const message = escapeHtml(entry.message || '');
            const date = escapeHtml(formatDate(entry.createdAt));

            const tipsHtml = tips.map(tip => `<li>${escapeHtml(tip)}</li>`).join('');
            const strengthsText = strengths.length ? `׳—׳•׳–׳§׳•׳×: ${escapeHtml(strengths.join(' | '))}` : '';

            return `
                <article class="community-item ${itemClass}">
                    <header class="community-item-header">
                        <div class="community-item-meta">${author} ֲ· ${date}</div>
                        <div class="community-score">${score}/100 ֲ· ${levelLabel}</div>
                    </header>
                    <p class="community-message">${message}</p>
                    <p class="community-feedback">${summary}</p>
                    ${strengthsText ? `<p class="community-feedback">${strengthsText}</p>` : ''}
                    ${tipsHtml ? `<ul class="community-tips">${tipsHtml}</ul>` : ''}
                </article>
            `;
        }).join('');
    };

    const setStatus = (text, isError = false) => {
        if (!els.status) return;
        els.status.textContent = text;
        els.status.style.color = isError ? '#b91c1c' : '#334155';
    };

    els.form.addEventListener('submit', (event) => {
        event.preventDefault();

        const message = String(els.message.value || '').trim();
        const author = String(els.name?.value || '').trim();

        if (message.length < 6) {
            setStatus('׳›׳×׳‘׳• ׳׳₪׳—׳•׳× 6 ׳×׳•׳•׳™׳ ׳›׳“׳™ ׳׳§׳‘׳ ׳₪׳™׳“׳‘׳§ ׳©׳™׳׳•׳©׳™.', true);
            return;
        }

        const analysis = evaluateCommunityMessage(message);
        const entry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            author: author || '׳׳©׳×׳׳©/׳×',
            message,
            createdAt: new Date().toISOString(),
            analysis
        };

        entries.unshift(entry);
        entries = entries.slice(0, 40);
        saveEntries();
        renderFeed();

        const scoreLabel = analysis.score >= 75 ? '׳׳¦׳•׳™׳' : analysis.score >= 55 ? '׳™׳₪׳” ׳׳׳•׳“' : '׳™׳© ׳›׳™׳•׳•׳';
        setStatus(`׳ ׳©׳׳¨. ׳¦׳™׳•׳ ׳ ׳™׳¡׳•׳—: ${analysis.score}/100 (${scoreLabel}).`);

        els.message.value = '';
    });

    if (els.clearBtn) {
        els.clearBtn.addEventListener('click', () => {
            entries = [];
            saveEntries();
            renderFeed();
            setStatus('׳”׳§׳™׳¨ ׳ ׳•׳§׳”.');
        });
    }

    renderFeed();
}

// ==================== BLUEPRINT BUILDER ====================

let blueprintData = {};

function setupBlueprintBuilder() {
    // Step 1: Extract Button
    const extractBtn = document.getElementById('extract-btn');
    if (extractBtn) {
        extractBtn.addEventListener('click', extractAndMoveToStep2);
    }

    // Step 2: Back & Continue Buttons
    const backToCapture = document.getElementById('back-to-capture-btn');
    const gapAnalysisBtn = document.getElementById('gap-analysis-btn');
    
    if (backToCapture) backToCapture.addEventListener('click', () => goToStep(1));
    if (gapAnalysisBtn) gapAnalysisBtn.addEventListener('click', extractAndMoveToStep3);

    // Step 3: Back & Continue Buttons
    const backToSpecify = document.getElementById('back-to-specify-btn');
    const nextStepBtn = document.getElementById('next-step-btn');
    
    if (backToSpecify) backToSpecify.addEventListener('click', () => goToStep(2));
    if (nextStepBtn) nextStepBtn.addEventListener('click', extractAndMoveToStep4);

    // Step 4: Action Buttons
    const exportBtn = document.getElementById('export-json-btn');
    const startOverBtn = document.getElementById('start-over-btn');
    const doItNowBtn = document.getElementById('do-it-now-btn');
    
    if (exportBtn) exportBtn.addEventListener('click', exportBlueprint);
    if (startOverBtn) startOverBtn.addEventListener('click', () => goToStep(1));
    if (doItNowBtn) doItNowBtn.addEventListener('click', startTenMinuteTimer);

    // Ability range listener
    const abilityRange = document.getElementById('q-ability');
    if (abilityRange) {
        abilityRange.addEventListener('input', (e) => {
            document.getElementById('ability-display').textContent = e.target.value;
            updateReframeBox();
        });
    }
}

function goToStep(stepNum) {
    const targetId = `blueprint-step-${stepNum}`;
    document.querySelectorAll('.blueprint-step').forEach(step => {
        const isTarget = step.id === targetId;
        step.classList.toggle('active', isTarget);
        step.classList.toggle('hidden', !isTarget);
    });

    // Defensive fallback in case target step exists but was not toggled.
    const targetStep = document.getElementById(targetId);
    if (targetStep) {
        targetStep.classList.remove('hidden');
        targetStep.classList.add('active');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function extractAndMoveToStep2() {
    const actionInput = document.getElementById('action-input').value.trim();

    if (!actionInput) {
        alert('׳‘׳•׳׳ ׳×׳§׳׳“ ׳׳©׳”׳• - ׳׳” ׳׳×׳” ׳׳•׳׳¨ ׳׳¢׳¦׳׳ ׳׳¢׳©׳•׳×?');
        return;
    }

    blueprintData.action = actionInput;
    goToStep(2);
}

function extractAndMoveToStep3() {
    // Collect data from Step 2
    blueprintData.success = document.getElementById('q-success').value.trim();
    blueprintData.firstStep = document.getElementById('q-first-step').value.trim();
    blueprintData.lastStep = document.getElementById('q-last-step').value.trim();
    blueprintData.middleSteps = document.getElementById('q-middle-steps').value.trim();
    blueprintData.prerequisites = document.getElementById('q-prerequisites').value.trim();
    blueprintData.friction = document.getElementById('q-friction').value.trim();
    blueprintData.alternatives = document.getElementById('q-alternatives').value.trim();
    blueprintData.time = document.getElementById('q-time').value.trim();

    if (!blueprintData.success || !blueprintData.firstStep) {
        alert('׳‘׳•׳׳ ׳×׳׳׳ ׳׳₪׳—׳•׳× ׳׳× ׳”׳×׳•׳¦׳׳” ׳•׳”׳¦׳¢׳“ ׳”׳¨׳׳©׳•׳');
        return;
    }

    goToStep(3);
}

function extractAndMoveToStep4() {
    // Collect data from Step 3
    blueprintData.whoExpects = document.getElementById('q-who-expects').value;
    blueprintData.expectation = document.getElementById('q-expectation').value.trim();
    blueprintData.assumption = document.getElementById('q-assumption').value.trim();
    blueprintData.ability = document.getElementById('q-ability').value;
    blueprintData.gap = document.getElementById('q-gap').value.trim();

    if (!blueprintData.whoExpects || !blueprintData.ability) {
        alert('׳‘׳•׳׳ ׳×׳׳׳ ׳׳× ׳׳™ ׳׳¦׳₪׳” ׳•׳”׳¢׳¨׳›׳× ׳™׳›׳•׳׳×');
        return;
    }

    generateFinalBlueprint();
    goToStep(4);
}

function updateReframeBox() {
    const ability = parseInt(document.getElementById('q-ability').value);
    const gap = document.getElementById('q-gap').value.trim();

    let gapHint = '';
    if (ability <= 3) gapHint = '׳™׳›׳•׳׳× ׳ ׳׳•׳›׳”';
    else if (ability <= 6) gapHint = '׳—׳¡׳¨ ׳›׳׳™׳';
    else gapHint = '׳—׳¡׳¨ ׳׳™׳©׳•׳¨ / ׳§׳•׳ ׳” ׳“׳¢׳×';

    if (gap.includes('׳“׳§׳•׳×')) gapHint = '׳—׳¡׳¨ ׳™׳“׳¢';

    const templates = metaModelData.blueprint_builder?.reframe_templates || [];
    const template = templates.find(t => t.gap_hint === gapHint);
    const reframeText = template ? template.reframe : '׳–׳” ׳׳ ׳‘׳¢׳™׳” ׳©׳ ׳׳•׳₪׳™ - ׳–׳• ׳”׳’׳“׳¨׳” ׳׳ ׳©׳׳׳” ׳©׳ ׳”׳׳©׳™׳׳”.';

    document.getElementById('q-reframe').textContent = reframeText;
}

function generateFinalBlueprint() {
    const whoExpectsMap = {
        'self': '׳׳ ׳™ ׳‘׳¢׳¦׳׳™',
        'other': '׳׳™׳©׳”׳• ׳׳—׳¨',
        'system': '׳׳¢׳¨׳›׳×/׳—׳•׳§/׳“׳“׳׳™׳™׳'
    };

    const blueprint = document.getElementById('final-blueprint');
    blueprint.innerHTML = `
        <div class="blueprint-section">
            <h4>נ“ ׳”׳₪׳¢׳•׳׳”:</h4>
            <p>"${blueprintData.action}"</p>
        </div>

        <div class="blueprint-section">
            <h4>נ¯ ׳”׳×׳•׳¦׳׳” ׳”׳¨׳¦׳•׳™׳”:</h4>
            <p>${blueprintData.success}</p>
        </div>

        <div class="blueprint-section">
            <h4>נ“‹ ׳”׳×׳•׳›׳ ׳™׳×:</h4>
            <ul>
                <li><strong>׳¦׳¢׳“ ׳¨׳׳©׳•׳:</strong> ${blueprintData.firstStep}</li>
                <li><strong>׳©׳׳‘׳™ ׳‘׳™׳ ׳™׳™׳:</strong> ${blueprintData.middleSteps || '(׳׳ ׳”׳•׳’׳“׳¨׳•)'}</li>
                <li><strong>׳¦׳¢׳“ ׳׳—׳¨׳•׳:</strong> ${blueprintData.lastStep}</li>
            </ul>
        </div>

        <div class="blueprint-section">
            <h4>ג™ן¸ ׳×׳ ׳׳™׳ ׳׳§׳“׳™׳׳™׳:</h4>
            <p>${blueprintData.prerequisites || '(׳׳™׳)'}</p>
        </div>

        <div class="blueprint-section">
            <h4>ג ן¸ ׳ ׳§׳•׳“׳•׳× ׳×׳§׳™׳¢׳” ׳¦׳₪׳•׳™׳•׳×:</h4>
            <p>${blueprintData.friction}</p>
            <strong>Plan B:</strong>
            <p>${blueprintData.alternatives}</p>
        </div>

        <div class="blueprint-section">
            <h4>ג±ן¸ ׳˜׳™׳™׳׳•׳׳˜:</h4>
            <p>${blueprintData.time || '30 ׳“׳§׳•׳×'}</p>
        </div>

        <div class="blueprint-section">
            <h4>נ“ ׳ ׳™׳×׳•׳— ׳¦׳™׳₪׳™׳•׳×:</h4>
            <ul>
                <li><strong>׳׳™ ׳׳¦׳₪׳”:</strong> ${whoExpectsMap[blueprintData.whoExpects] || blueprintData.whoExpects}</li>
                <li><strong>׳”׳¦׳™׳₪׳™׳™׳”:</strong> ${blueprintData.expectation}</li>
                <li><strong>׳™׳›׳•׳׳× ׳›׳¨׳’׳¢:</strong> ${blueprintData.ability}/10</li>
                <li><strong>׳׳” ׳—׳¡׳¨:</strong> ${blueprintData.gap}</li>
            </ul>
        </div>

        <div class="blueprint-section" style="background: #f0fff4; padding: 15px; border-radius: 8px;">
            <h4>ג¨ ׳ ׳™׳¡׳•׳— ׳׳—׳“׳© (׳׳-׳׳׳©׳™׳):</h4>
            <p><em>${document.getElementById('q-reframe').textContent}</em></p>
        </div>
    `;

    // Generate Next Physical Action
    generateNextAction();
}

function generateNextAction() {
    const nextActionBox = document.getElementById('next-physical-action');
    const ifStuckBox = document.getElementById('if-stuck-content');

    const timebox = blueprintData.time ? blueprintData.time.split(' ')[0] : '45';
    const nextAction = `
        <strong>${blueprintData.firstStep}</strong>
        <br/><small>(׳¦׳₪׳•׳™ ׳׳§׳—׳× ${timebox} ׳“׳§׳•׳× ׳׳©׳)</small>
    `;

    const ifStuck = `
        <strong>׳׳ ׳ ׳×׳§׳¢׳× ׳‘׳—׳׳§ ׳”׳–׳”:</strong><br/>
        ${blueprintData.friction ? blueprintData.friction + '<br/>' : ''}
        <strong>Plan B:</strong><br/>
        ${blueprintData.alternatives || '׳‘׳§׳© ׳¢׳–׳¨׳” ׳׳• ׳ ׳¡׳” ׳—׳׳•׳₪׳”'}
    `;

    nextActionBox.innerHTML = nextAction;
    ifStuckBox.innerHTML = ifStuck;
}

function startTenMinuteTimer() {
    alert(`נ¯ ׳”׳×׳—׳׳×! ${blueprintData.firstStep}\n\n׳™׳© ׳׳ 10 ׳“׳§׳•׳×. ׳׳!`);
    // Could implement actual timer here
}

function exportBlueprint() {
    const blueprintJSON = JSON.stringify(blueprintData, null, 2);
    const blob = new Blob([blueprintJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blueprint_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Utility to check data
function logMetaModelData() {
    console.log('Meta Model Data:', metaModelData);
    console.log('Total categories:', metaModelData.categories?.length || 0);
    console.log('Total practice statements:', metaModelData.practice_statements?.length || 0);
}

// ==================== PRISM LAB MODULE ====================

const LOGICAL_LEVEL_INFO = {
    E: {
        name: 'Environment (E)',
        hebrew: '׳¡׳‘׳™׳‘׳”',
        prompt: '׳׳™׳₪׳”, ׳׳×׳™, ׳¢׳ ׳׳™ ׳•׳‘׳׳™׳–׳” ׳”׳§׳©׳¨ ׳–׳” ׳§׳•׳¨׳”?'
    },
    B: {
        name: 'Behavior (B)',
        hebrew: '׳”׳×׳ ׳”׳’׳•׳×',
        prompt: '׳׳” ׳”׳׳“׳ ׳¢׳•׳©׳” ׳‘׳₪׳•׳¢׳? ׳׳” ׳”׳₪׳¢׳•׳׳” ׳”׳ ׳¦׳₪׳™׳×?'
    },
    C: {
        name: 'Capabilities (C)',
        hebrew: '׳™׳›׳•׳׳•׳×',
        prompt: '׳׳™׳–׳• ׳׳™׳•׳׳ ׳•׳× ׳׳• ׳׳¡׳˜׳¨׳˜׳’׳™׳” ׳ ׳“׳¨׳©׳× ׳›׳׳?'
    },
    V: {
        name: 'Values/Beliefs (V)',
        hebrew: '׳¢׳¨׳›׳™׳/׳׳׳•׳ ׳•׳×',
        prompt: '׳׳” ׳—׳©׳•׳‘ ׳›׳׳? ׳׳™׳–׳• ׳׳׳•׳ ׳” ׳׳ ׳”׳׳× ׳׳× ׳”׳”׳×׳ ׳”׳’׳•׳×?'
    },
    I: {
        name: 'Identity (I)',
        hebrew: '׳–׳”׳•׳×',
        prompt: '׳׳” ׳–׳” ׳׳•׳׳¨ ׳¢׳ ׳”׳–׳”׳•׳×: ׳׳™ ׳׳ ׳™? ׳׳™׳–׳” ׳׳“׳ ׳׳ ׳™?'
    },
    S: {
        name: 'Belonging (S)',
        hebrew: '׳©׳™׳™׳›׳•׳×',
        prompt: '׳׳׳™׳–׳• ׳§׳‘׳•׳¦׳”/׳§׳”׳™׳׳”/׳©׳™׳™׳›׳•׳× ׳–׳” ׳׳×׳—׳‘׳¨?'
    }
};

const LOGICAL_LEVEL_KEYWORDS = {
    E: ['׳¡׳‘׳™׳‘׳”', '׳׳§׳•׳', '׳–׳׳', '׳”׳§׳©׳¨', '׳‘׳—׳“׳¨', '׳‘׳¢׳‘׳•׳“׳”', '׳‘׳‘׳™׳×', '׳׳×׳™', '׳׳™׳₪׳”'],
    B: ['׳¢׳•׳©׳”', '׳¢׳©׳™׳×׳™', '׳‘׳™׳¦׳•׳¢', '׳₪׳¢׳•׳׳”', '׳”׳×׳ ׳”׳’׳•׳×', '׳׳’׳™׳‘', '׳׳•׳׳¨', '׳©׳•׳׳'],
    C: ['׳™׳›׳•׳׳×', '׳׳™׳•׳׳ ׳•׳×', '׳׳¡׳˜׳¨׳˜׳’׳™׳”', '׳›׳׳™', '׳׳׳׳•׳“', '׳׳”׳×׳׳׳', '׳׳×׳¨׳’׳', '׳׳¡׳•׳’׳'],
    V: ['׳—׳©׳•׳‘', '׳¢׳¨׳', '׳׳׳•׳ ׳”', '׳׳׳׳™׳', '׳¦׳¨׳™׳', '׳ ׳›׳•׳', '׳׳ ׳ ׳›׳•׳', '׳¢׳™׳§׳¨׳•׳'],
    I: ['׳׳ ׳™', '׳¢׳¦׳׳™', '׳–׳”׳•׳×', '׳׳™ ׳׳ ׳™', '׳˜׳™׳₪׳©', '׳׳¦׳׳™׳—׳', '׳›׳™׳©׳׳•׳', '׳‘׳ ׳׳“׳'],
    S: ['׳׳ ׳—׳ ׳•', '׳§׳‘׳•׳¦׳”', '׳§׳”׳™׳׳”', '׳¦׳•׳•׳×', '׳׳©׳₪׳—׳”', '׳©׳™׳™׳›׳•׳×', '׳—׳‘׳¨׳”', '׳׳¨׳’׳•׳']
};

function getPrismById(prismId) {
    return (metaModelData.prisms || []).find(x => x.id === prismId);
}

function getLevelDisplay(level) {
    const info = LOGICAL_LEVEL_INFO[level];
    return info ? `${info.hebrew} (${level})` : level;
}

function getExpectedLevelFromInput(inputEl) {
    if (!inputEl || !inputEl.id) return '';
    const parts = inputEl.id.split('-');
    const level = (parts[1] || '').toUpperCase();
    return LOGICAL_LEVEL_INFO[level] ? level : '';
}

function parseLevelPrefixedText(rawText) {
    const text = (rawText || '').trim();
    const prefixed = text.match(/^([EBCVIS])\s*:\s*(.+)$/i);
    if (!prefixed) return { level: '', cleanText: text };
    return { level: prefixed[1].toUpperCase(), cleanText: prefixed[2].trim() };
}

function inferLogicalLevel(text) {
    const source = (text || '').toLowerCase();
    if (!source) return { level: '', confidence: 0, reason: '׳׳™׳ ׳˜׳§׳¡׳˜ ׳׳ ׳™׳×׳•׳—.' };

    let bestLevel = '';
    let bestScore = 0;
    Object.entries(LOGICAL_LEVEL_KEYWORDS).forEach(([level, keywords]) => {
        const score = keywords.reduce((sum, keyword) => sum + (source.includes(keyword.toLowerCase()) ? 1 : 0), 0);
        if (score > bestScore) {
            bestScore = score;
            bestLevel = level;
        }
    });

    if (!bestLevel || bestScore === 0) {
        return { level: '', confidence: 0, reason: '׳׳ ׳–׳•׳”׳• ׳׳™׳׳•׳× ׳׳₪׳×׳— ׳—׳“-׳׳©׳׳¢׳™׳•׳×.' };
    }
    if (bestScore === 1) {
        return { level: bestLevel, confidence: 1, reason: `׳–׳•׳”׳×׳” ׳׳™׳׳” ׳׳—׳× ׳©׳׳×׳׳™׳׳” ׳׳¨׳׳× ${getLevelDisplay(bestLevel)}.` };
    }
    return { level: bestLevel, confidence: 2, reason: `׳–׳•׳”׳• ׳›׳׳” ׳¨׳׳–׳™׳ ׳©׳׳×׳׳™׳׳™׳ ׳׳¨׳׳× ${getLevelDisplay(bestLevel)}.` };
}

function getLevelImprovementTip(level, prism) {
    if (prism && prism.level_hints && prism.level_hints[level]) {
        return `׳׳™׳§׳•׳“ ׳׳•׳׳׳¥ ׳׳¨׳׳” ׳–׳•: ${prism.level_hints[level]}`;
    }
    const info = LOGICAL_LEVEL_INFO[level];
    return info ? info.prompt : '׳׳•׳׳׳¥ ׳׳“׳™׳™׳§ ׳׳× ׳”׳ ׳™׳¡׳•׳— ׳׳¨׳׳” ׳”׳׳•׳’׳™׳× ׳”׳׳×׳׳™׳׳”.';
}

function clearMappingInputStatus(inputEl) {
    if (!inputEl) return;
    inputEl.classList.remove('invalid-level', 'valid-level', 'uncertain-level');
    inputEl.removeAttribute('title');
}

function setMappingInputStatus(inputEl, status, message) {
    if (!inputEl) return;
    clearMappingInputStatus(inputEl);
    if (status === 'mismatch') inputEl.classList.add('invalid-level');
    if (status === 'ok') inputEl.classList.add('valid-level');
    if (status === 'uncertain') inputEl.classList.add('uncertain-level');
    if (message) inputEl.title = message;
}

function validateMappingEntry(expectedLevel, rawText, suggestedLevel, prism) {
    const parsed = parseLevelPrefixedText(rawText);
    const cleanText = parsed.cleanText;
    const explicitLevel = parsed.level || (suggestedLevel || '').toUpperCase();
    const improvement = getLevelImprovementTip(expectedLevel, prism);

    if (!cleanText) {
        return {
            expectedLevel,
            cleanText: '',
            detectedLevel: '',
            effectiveLevel: expectedLevel,
            status: 'empty',
            reason: '׳”׳©׳“׳” ׳¨׳™׳§.',
            improvement
        };
    }

    if (explicitLevel && explicitLevel !== expectedLevel) {
        return {
            expectedLevel,
            cleanText,
            detectedLevel: explicitLevel,
            effectiveLevel: explicitLevel,
            status: 'mismatch',
            reason: `׳”׳˜׳§׳¡׳˜ ׳׳¡׳•׳׳ ׳›׳¨׳׳× ${getLevelDisplay(explicitLevel)} ׳׳‘׳ ׳”׳•׳–׳ ׳‘׳©׳“׳” ${getLevelDisplay(expectedLevel)}.`,
            improvement
        };
    }

    if (explicitLevel && explicitLevel === expectedLevel) {
        return {
            expectedLevel,
            cleanText,
            detectedLevel: explicitLevel,
            effectiveLevel: expectedLevel,
            status: 'ok',
            reason: `׳”׳˜׳§׳¡׳˜ ׳׳×׳׳™׳ ׳׳©׳“׳” ${getLevelDisplay(expectedLevel)}.`,
            improvement
        };
    }

    const inferred = inferLogicalLevel(cleanText);
    if (inferred.level && inferred.level !== expectedLevel && inferred.confidence >= 2) {
        return {
            expectedLevel,
            cleanText,
            detectedLevel: inferred.level,
            effectiveLevel: inferred.level,
            status: 'mismatch',
            reason: `${inferred.reason} ׳׳›׳ ׳™׳© ׳¡׳‘׳™׳¨׳•׳× ׳’׳‘׳•׳”׳” ׳׳©׳™׳‘׳•׳¥ ׳©׳’׳•׳™ ׳‘׳©׳“׳” ${getLevelDisplay(expectedLevel)}.`,
            improvement
        };
    }

    if (inferred.level === expectedLevel && inferred.confidence > 0) {
        return {
            expectedLevel,
            cleanText,
            detectedLevel: inferred.level,
            effectiveLevel: expectedLevel,
            status: 'ok',
            reason: inferred.reason,
            improvement
        };
    }

    return {
        expectedLevel,
        cleanText,
        detectedLevel: inferred.level || '',
        effectiveLevel: expectedLevel,
        status: 'uncertain',
        reason: inferred.reason || '׳׳ ׳ ׳™׳×׳ ׳׳”׳›׳¨׳™׳¢ ׳׳•׳˜׳•׳׳˜׳™׳× ׳׳ ׳”׳©׳™׳‘׳•׳¥ ׳׳“׳•׳™׳§.',
        improvement
    };
}

function computePrismScore(answerChecks) {
    const answered = answerChecks.filter(a => a.status !== 'empty');
    const answeredCount = answered.length;
    if (answeredCount === 0) {
        return {
            total: 0,
            coverage: 0,
            alignment: 0,
            clarity: 0,
            grade: '׳׳™׳ ׳׳¡׳₪׳™׳§ ׳׳™׳“׳¢ ׳׳¦׳™׳•׳'
        };
    }

    const matched = answered.filter(a => a.status === 'ok').length;
    const uncertain = answered.filter(a => a.status === 'uncertain').length;
    const sufficientlyDetailed = answered.filter(a => (a.cleanText || '').split(/\s+/).length >= 3).length;

    const coverage = Math.round((answeredCount / 6) * 40);
    const alignment = Math.round(((matched + (uncertain * 0.5)) / answeredCount) * 40);
    const clarity = Math.round((sufficientlyDetailed / answeredCount) * 20);
    const total = Math.min(100, coverage + alignment + clarity);

    let grade = '׳˜׳¢׳•׳ ׳©׳™׳₪׳•׳¨ ׳׳©׳׳¢׳•׳×׳™';
    if (total >= 85) grade = '׳׳¦׳•׳™׳';
    else if (total >= 70) grade = '׳˜׳•׳‘ ׳׳׳•׳“';
    else if (total >= 55) grade = '׳‘׳™׳ ׳•׳ ׳™';

    return { total, coverage, alignment, clarity, grade };
}

function renderPrismDeepGuide(prism) {
    const guideEl = document.getElementById('prism-deep-guide');
    if (!guideEl || !prism) return;

    const antiPatterns = (prism.anti_patterns || []).map(item => `<li>${item}</li>`).join('');
    const examples = (prism.examples || []).map(item => `<li>${item}</li>`).join('');
    const levelGuide = ['E', 'B', 'C', 'V', 'I', 'S']
        .map(level => `<li><strong>${getLevelDisplay(level)}:</strong> ${LOGICAL_LEVEL_INFO[level].prompt}</li>`)
        .join('');
    const depthLadder = ['E', 'B', 'C', 'V', 'I', 'S']
        .map(level => `<li><strong>${getLevelDisplay(level)}:</strong> ׳¢׳•׳׳§ ׳”׳—׳©׳™׳‘׳” ׳”׳•׳ "${LOGICAL_LEVEL_INFO[level].prompt}"</li>`)
        .join('');
    const anchorTemplates = (prism.anchor_question_templates || [])
        .slice(0, 2)
        .map(item => `<li>${item}</li>`)
        .join('');

    guideEl.innerHTML = `
        <h4>׳”׳¡׳‘׳¨ ׳¢׳•׳׳§ ׳¢׳ ׳”׳₪׳¨׳™׳–׳׳”: ${prism.name_he}</h4>
        <p><strong>׳׳” ׳”׳₪׳¨׳™׳–׳׳” ׳”׳–׳• ׳‘׳•׳“׳§׳×?</strong> ${prism.philosophy_core}</p>
        <p><strong>׳׳׳” ׳–׳” ׳—׳©׳•׳‘?</strong> ${prism.therapist_intent || '׳׳˜׳¨׳× ׳”׳₪׳¨׳™׳–׳׳” ׳”׳™׳ ׳׳”׳₪׳•׳ ׳ ׳™׳¡׳•׳— ׳›׳׳׳™ ׳׳׳₪׳” ׳‘׳¨׳•׳¨׳” ׳©׳׳₪׳©׳¨ ׳׳₪׳¢׳•׳ ׳׳₪׳™׳”.'}</p>

        <div class="prism-guide-grid">
            <div class="prism-guide-card">
                <h5>׳׳™׳ ׳¢׳•׳‘׳“׳™׳ ׳ ׳›׳•׳ ׳‘-4 ׳©׳׳‘׳™׳</h5>
                <ol>
                    <li>׳׳ ׳¡׳—׳™׳ ׳׳× ׳©׳׳׳× ׳”׳¢׳•׳’׳ ׳•׳׳•׳•׳“׳׳™׳ ׳©׳”׳™׳ ׳‘׳¨׳•׳¨׳” ׳•׳׳“׳™׳“׳”.</li>
                    <li>׳׳׳₪׳™׳ ׳›׳ ׳×׳©׳•׳‘׳” ׳׳¨׳׳” ׳”׳׳•׳’׳™׳× ׳”׳׳×׳׳™׳׳”: E/B/C/V/I/S.</li>
                    <li>׳׳–׳”׳™׳ ׳₪׳¢׳¨׳™׳ ׳•׳©׳™׳‘׳•׳¦׳™׳ ׳©׳’׳•׳™׳™׳ ׳›׳“׳™ ׳׳׳ ׳•׳¢ ׳׳¡׳§׳ ׳•׳× ׳׳ ׳׳“׳•׳™׳§׳•׳×.</li>
                    <li>׳‘׳•׳—׳¨׳™׳ Pivot ׳׳—׳“ ׳§׳˜׳ ׳׳‘׳™׳¦׳•׳¢ ׳׳™׳™׳“׳™, ׳¢׳ ׳”׳׳©׳ ׳¢׳•׳׳§ ׳׳“׳•׳¨׳’.</li>
                </ol>
            </div>
            <div class="prism-guide-card">
                <h5>׳׳™׳ ׳׳”׳‘׳—׳™׳ ׳‘׳™׳ ׳”׳¨׳׳•׳×</h5>
                <ul>${levelGuide}</ul>
            </div>
            <div class="prism-guide-card">
                <h5>׳׳” ׳׳•׳׳¨ "׳¢׳•׳׳§" ׳‘׳₪׳¨׳™׳–׳׳”</h5>
                <p>׳׳×׳—׳™׳׳™׳ ׳‘-E/B ׳›׳“׳™ ׳׳¢׳’׳ ׳¢׳•׳‘׳“׳•׳× ׳‘׳©׳˜׳—, ׳•׳׳– ׳¢׳•׳׳™׳ ׳-C/V/I/S ׳›׳“׳™ ׳׳”׳‘׳™׳ ׳׳ ׳’׳ ׳•׳ ׳₪׳ ׳™׳׳™ ׳•׳–׳”׳•׳×׳™.</p>
                <ul>${depthLadder}</ul>
            </div>
        </div>

        <div class="prism-guide-grid">
            <div class="prism-guide-card">
                <h5>׳“׳•׳’׳׳׳•׳× ׳¢׳•׳’׳ ׳׳•׳׳׳¦׳•׳×</h5>
                <ul>${anchorTemplates || '<li>׳׳™׳ ׳“׳•׳’׳׳׳•׳× ׳ ׳•׳¡׳₪׳•׳× ׳‘׳ ׳×׳•׳ ׳™׳.</li>'}</ul>
                <h5>׳“׳•׳’׳׳׳•׳× ׳׳”׳—׳™׳™׳</h5>
                <ul>${examples || '<li>׳׳™׳ ׳“׳•׳’׳׳׳•׳× ׳ ׳•׳¡׳₪׳•׳× ׳‘׳ ׳×׳•׳ ׳™׳.</li>'}</ul>
            </div>
            <div class="prism-guide-card">
                <h5>׳˜׳¢׳•׳™׳•׳× ׳ ׳₪׳•׳¦׳•׳× ׳©׳›׳“׳׳™ ׳׳”׳™׳׳ ׳¢ ׳׳”׳</h5>
                <ul>${antiPatterns || '<li>׳׳”׳™׳©׳׳¨ ׳›׳׳׳™ ׳•׳׳ ׳׳‘׳“׳•׳§ ׳¨׳׳™׳•׳×.</li>'}</ul>
                <p><strong>׳˜׳™׳₪:</strong> ׳׳ ׳™׳© ׳¡׳₪׳§ ׳‘׳¨׳׳”, ׳§׳¦׳¨ ׳׳× ׳”׳׳©׳₪׳˜ ׳׳©׳•׳¨׳” ׳׳—׳× ׳§׳•׳ ׳§׳¨׳˜׳™׳× ׳•׳‘׳“׳•׳§ ׳©׳•׳‘ ׳׳׳™׳–׳• ׳©׳׳׳” ׳”׳•׳ ׳¢׳•׳ ׳”.</p>
            </div>
        </div>
    `;
}

function renderPrismScoreInterpretation(score, mismatchCount) {
    const notes = [];
    if (score.total >= 85) {
        notes.push('׳”׳׳™׳₪׳•׳™ ׳׳“׳•׳™׳§ ׳׳׳•׳“. ׳׳₪׳©׳¨ ׳׳¢׳‘׳•׳¨ ׳׳¢׳‘׳•׳“׳” ׳׳¡׳˜׳¨׳˜׳’׳™׳× ׳¢׳ ׳”׳×׳¢׳¨׳‘׳•׳× ׳׳—׳× ׳¢׳׳•׳§׳”.');
    } else if (score.total >= 70) {
        notes.push('׳‘׳¡׳™׳¡ ׳˜׳•׳‘ ׳׳׳•׳“. ׳ ׳“׳¨׳© ׳—׳™׳“׳•׳“ ׳§׳ ׳‘׳¨׳׳•׳× ׳›׳“׳™ ׳׳”׳₪׳•׳ ׳׳× ׳”׳׳™׳₪׳•׳™ ׳׳—׳“ ׳•׳׳©׳›׳ ׳¢.');
    } else if (score.total >= 55) {
        notes.push('׳”׳׳™׳₪׳•׳™ ׳—׳׳§׳™. ׳׳₪׳ ׳™ Pivot ׳¢׳׳•׳§, ׳׳•׳׳׳¥ ׳׳¡׳“׳¨ ׳׳× ׳”׳©׳™׳‘׳•׳¦׳™׳ ׳•׳׳“׳™׳™׳§ ׳ ׳™׳¡׳•׳—׳™׳.');
    } else {
        notes.push('׳”׳׳™׳₪׳•׳™ ׳¢׳“׳™׳™׳ ׳¨׳׳©׳•׳ ׳™. ׳›׳“׳׳™ ׳׳—׳–׳•׳¨ ׳׳©׳׳׳× ׳”׳¢׳•׳’׳ ׳•׳׳׳₪׳•׳× ׳׳—׳“׳© ׳‘׳¦׳•׳¨׳” ׳§׳•׳ ׳§׳¨׳˜׳™׳×.');
    }

    if (mismatchCount > 0) {
        notes.push(`׳–׳•׳”׳• ${mismatchCount} ׳©׳™׳‘׳•׳¦׳™׳ ׳©׳’׳•׳™׳™׳. ׳–׳” ׳׳ ׳›׳™׳©׳׳•׳ ׳׳׳ ׳׳™׳×׳•׳× ׳©׳׳₪׳©׳¨ ׳׳©׳₪׳¨ ׳“׳™׳•׳§ ׳•׳׳—׳¡׳•׳ ׳׳׳׳¥ ׳‘׳”׳׳©׳.`);
    } else {
        notes.push('׳׳ ׳–׳•׳”׳• ׳©׳™׳‘׳•׳¦׳™׳ ׳©׳’׳•׳™׳™׳ ׳׳₪׳•׳¨׳©׳™׳, ׳•׳–׳” ׳‘׳¡׳™׳¡ ׳׳¦׳•׳™׳ ׳׳”׳×׳§׳“׳׳•׳×.');
    }

    if (score.clarity < 12) {
        notes.push('׳¨׳׳× ׳‘׳”׳™׳¨׳•׳× ׳ ׳׳•׳›׳” ׳™׳—׳¡׳™׳×: ׳ ׳¡׳— ׳׳©׳₪׳˜׳™׳ ׳§׳¦׳¨׳™׳ ׳¢׳ ׳₪׳¢׳•׳׳”, ׳׳§׳•׳ ׳׳• ׳§׳¨׳™׳˜׳¨׳™׳•׳ ׳‘׳׳§׳•׳ ׳ ׳™׳¡׳•׳—׳™׳ ׳›׳׳׳™׳™׳.');
    }

    return `<ul>${notes.map(note => `<li>${note}</li>`).join('')}</ul>`;
}

function renderPrismLevelsDeepAnalysis(prism, recommendation) {
    const order = ['E', 'B', 'C', 'V', 'I', 'S'];
    const items = order.map(level => {
        const count = recommendation.counts[level] || 0;
        const levelHint = prism?.level_hints?.[level] || LOGICAL_LEVEL_INFO[level].prompt;
        const intervention = prism?.recommended_interventions_by_level?.[level] || '׳”׳׳©׳ ׳“׳™׳•׳§ ׳‘׳©׳₪׳” ׳•׳‘׳“׳™׳§׳” ׳׳•׳ ׳©׳׳׳× ׳”׳¢׳•׳’׳.';

        let meaning = '׳׳ ׳”׳×׳§׳‘׳׳• ׳×׳©׳•׳‘׳•׳× ׳‘׳¨׳׳” ׳”׳–׳•, ׳׳›׳ ׳—׳©׳•׳‘ ׳׳‘׳“׳•׳§ ׳׳ ׳ ׳•׳¦׳¨׳” ׳”׳©׳׳˜׳”.';
        if (count >= 3) {
            meaning = '׳”׳¨׳׳” ׳”׳–׳• ׳“׳•׳׳™׳ ׳ ׳˜׳™׳× ׳׳׳•׳“ ׳•׳׳¡׳₪׳§׳× ׳׳ ׳•׳£ ׳”׳×׳¢׳¨׳‘׳•׳× ׳׳¨׳›׳–׳™.';
        } else if (count === 2) {
            meaning = '׳”׳¨׳׳” ׳”׳–׳• ׳—׳•׳–׳¨׳× ׳›׳׳” ׳₪׳¢׳׳™׳ ׳•׳׳›׳ ׳›׳“׳׳™ ׳׳”׳×׳™׳™׳—׳¡ ׳׳׳™׳” ׳›׳¦׳™׳¨ ׳¢׳‘׳•׳“׳” ׳׳©׳׳¢׳•׳×׳™.';
        } else if (count === 1) {
            meaning = '׳™׳© ׳¡׳™׳׳ ׳¨׳׳©׳•׳ ׳™ ׳׳¨׳׳” ׳”׳–׳•, ׳׳ ׳ ׳“׳¨׳© ׳¢׳•׳“ ׳‘׳™׳¡׳•׳¡ ׳›׳“׳™ ׳׳”׳¡׳™׳§ ׳׳¡׳§׳ ׳•׳×.';
        }

        const pivotTag = recommendation.pivot === level
            ? '<p><strong>׳¡׳˜׳˜׳•׳¡:</strong> ׳–׳• ׳¨׳׳× ׳”-Pivot ׳”׳׳•׳׳׳¦׳× ׳›׳¨׳’׳¢.</p>'
            : '';

        return `
            <li class="prism-level-deep-item">
                <p><strong>${getLevelDisplay(level)}</strong> | ׳׳•׳₪׳¢׳™׳: ${count}</p>
                <p><strong>׳׳©׳׳¢׳•׳×:</strong> ${meaning}</p>
                <p><strong>׳׳” ׳׳‘׳“׳•׳§ ׳‘׳¨׳׳” ׳”׳–׳•:</strong> ${levelHint}</p>
                <p><strong>׳׳”׳׳ ׳”׳×׳¢׳¨׳‘׳•׳× ׳׳₪׳©׳¨׳™:</strong> ${intervention}</p>
                ${pivotTag}
            </li>
        `;
    }).join('');

    return `<ul class="prism-level-deep-list">${items}</ul>`;
}

function renderPrismActionPlan(session, recommendation, mismatchCount) {
    const highResistance = session.resistance >= 4;
    const highEmotion = session.emotion >= 4;
    const alignmentStep = mismatchCount > 0
        ? '׳™׳™׳©׳•׳¨ ׳©׳™׳‘׳•׳¦׳™׳: ׳¢׳‘׳•׳¨ ׳›׳ ׳₪׳¨׳™׳˜ ׳׳“׳•׳, ׳ ׳¡׳— ׳׳—׳“׳© ׳׳©׳₪׳˜ ׳׳׳•׳§׳“ ׳©׳׳×׳׳™׳ ׳¨׳§ ׳׳¨׳׳” ׳׳—׳×.'
        : '׳©׳™׳׳•׳¨ ׳“׳™׳•׳§: ׳”׳©׳׳¨ ׳׳× ׳”׳ ׳™׳¡׳•׳— ׳—׳“ ׳•׳§׳¦׳¨, ׳•׳‘׳“׳•׳§ ׳©׳›׳ ׳׳©׳₪׳˜ ׳¢׳•׳ ׳” ׳׳©׳׳׳× ׳”׳¢׳•׳’׳.';
    const resistanceStep = highResistance
        ? '׳¢׳‘׳•׳“׳” ׳¢׳ ׳”׳×׳ ׳’׳“׳•׳× ׳’׳‘׳•׳”׳”: ׳”׳×׳—׳ ׳‘-Small Win ׳—׳™׳¦׳•׳ ׳™ (E/B) ׳׳₪׳ ׳™ ׳©׳™׳ ׳•׳™ ׳׳׳•׳ ׳•׳× ׳¢׳׳•׳§.'
        : '׳׳₪׳©׳¨ ׳׳”׳×׳§׳“׳ ׳׳¢׳•׳׳§: ׳׳—׳¨׳™ ׳‘׳™׳¦׳•׳¢ ׳¦׳¢׳“ ׳§׳˜׳, ׳¢׳‘׳•׳¨ ׳׳¢׳‘׳•׳“׳” ׳‘׳¨׳׳•׳× C/V/I.';
    const emotionStep = highEmotion
        ? '׳‘׳׳¦׳‘ ׳¨׳’׳©׳™ ׳’׳‘׳•׳”: ׳”׳׳˜ ׳§׳¦׳‘, ׳׳׳× ׳¢׳•׳‘׳“׳•׳×, ׳•׳¨׳§ ׳׳– ׳‘׳¦׳¢ ׳₪׳¨׳©׳ ׳•׳× ׳׳• ׳”׳›׳׳׳”.'
        : '׳”׳¨׳’׳© ׳™׳¦׳™׳‘ ׳™׳—׳¡׳™׳×: ׳׳×׳׳™׳ ׳׳‘׳ ׳™׳™׳× ׳×׳•׳›׳ ׳™׳× ׳₪׳¢׳•׳׳” ׳׳“׳•׳¨׳’׳× ׳׳©׳‘׳•׳¢ ׳”׳§׳¨׳•׳‘.';

    return `
        <ol class="prism-action-plan">
            <li><strong>׳¦׳¢׳“ 1 (׳“׳™׳•׳§ ׳©׳₪׳”):</strong> ${alignmentStep}</li>
            <li><strong>׳¦׳¢׳“ 2 (Pivot ׳׳¢׳©׳™):</strong> ׳‘׳¦׳¢ ׳₪׳¢׳•׳׳” ׳׳—׳× ׳׳₪׳™ ׳¨׳׳× ${recommendation.levelName}: ${recommendation.intervention}</li>
            <li><strong>׳¦׳¢׳“ 3 (׳•׳•׳™׳¡׳•׳× ׳•׳”׳×׳׳“׳”):</strong> ${resistanceStep}</li>
            <li><strong>׳¦׳¢׳“ 4 (׳¢׳•׳׳§ ׳¨׳’׳©׳™):</strong> ${emotionStep}</li>
            <li><strong>׳©׳׳׳× ׳”׳׳©׳ ׳׳—׳™׳™׳‘׳×:</strong> ${recommendation.followUpQuestion}</li>
        </ol>
    `;
}

function setupPrismModule() {
    renderPrismLibrary();
    setupAudioMuteButtons();

    // Ensure prism-detail starts hidden
    const prismDetail = document.getElementById('prism-detail');
    if (prismDetail) prismDetail.classList.add('hidden');
    const prismLibrary = document.getElementById('prism-library');
    if (prismLibrary) prismLibrary.classList.remove('hidden');

    // Listeners for dynamic elements
    document.addEventListener('click', (e) => {
        const targetEl = e.target && e.target.nodeType === 1 ? e.target : e.target.parentElement;
        const openBtn = targetEl && targetEl.closest('.prism-open-btn');
        if (!openBtn) return;
        const id = openBtn.getAttribute('data-id');
        openPrism(id);
    });

    const cancelBtn = document.getElementById('prism-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', () => {
        document.getElementById('prism-detail').classList.add('hidden');
        document.getElementById('prism-library').classList.remove('hidden');
        playUISound('prism_back');
    });

    const prismSubmit = document.getElementById('prism-submit');
    if (prismSubmit) prismSubmit.addEventListener('click', handlePrismSubmit);

    const emo = document.getElementById('prism-emotion');
    const emoD = document.getElementById('emotion-display');
    if (emo) emo.addEventListener('input', (e) => emoD.textContent = e.target.value);
    const res = document.getElementById('prism-resistance');
    const resD = document.getElementById('resistance-display');
    if (res) res.addEventListener('input', (e) => resD.textContent = e.target.value);
}

function renderPrismLibrary() {
    const lib = document.getElementById('prism-library');
    if (!lib || !metaModelData.prisms) return;
    lib.innerHTML = '';
    metaModelData.prisms.forEach(p => {
        const div = document.createElement('div');
        div.className = 'prism-card';
        div.innerHTML = `
            <h4>${p.name_he}</h4>
            <p>${p.philosophy_core}</p>
            <p><strong>׳©׳׳׳× ׳¢׳•׳’׳:</strong> ${p.anchor_question_templates[0]}</p>
            <div style="margin-top:10px"><button class="btn prism-open-btn" data-id="${p.id}">׳‘׳—׳¨ ׳₪׳¨׳™׳–׳׳”</button></div>
        `;
        // Direct binding fallback (helps in some embedded hosts).
        const openBtn = div.querySelector('.prism-open-btn');
        if (openBtn) {
            openBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openPrism(p.id);
            });
        }

        lib.appendChild(div);
    });
}

function openPrism(id) {
    const prism = getPrismById(id);
    if (!prism) return alert('׳₪׳¨׳™׳–׳׳” ׳׳ ׳ ׳׳¦׳׳”');
    document.getElementById('prism-library').classList.add('hidden');
    const detail = document.getElementById('prism-detail');
    detail.classList.remove('hidden');
    document.getElementById('prism-name').textContent = `${prism.name_he} - ${prism.name_en}`;
    document.getElementById('prism-desc').textContent = prism.philosophy_core;
    document.getElementById('prism-anchor').textContent = prism.anchor_question_templates[0];
    renderPrismDeepGuide(prism);
    playUISound('prism_open');
    // clear previous answers
    ['E','B','C','V','I','S'].forEach(l => {
        const el = document.getElementById(`ans-${l}`);
        if (!el) return;
        el.value = '';
        delete el.dataset.suggestedLevel;
        clearMappingInputStatus(el);
    });
    document.getElementById('prism-emotion').value = 3; document.getElementById('emotion-display').textContent='3';
    document.getElementById('prism-resistance').value = 2; document.getElementById('resistance-display').textContent='2';
    const resultBox = document.getElementById('prism-result');
    if (resultBox) {
        resultBox.classList.add('hidden');
        resultBox.innerHTML = '';
    }
    // store current prism in a temp
    detail.setAttribute('data-prism-id', id);
    // Populate prepared items and enable drag/drop into level inputs
    populatePreparedItems(prism);
    attachMappingDropHandlers();
}

function handlePrismSubmit() {
    const id = document.getElementById('prism-detail').getAttribute('data-prism-id');
    const prism = getPrismById(id);
    if (!prism) return alert('׳׳™׳ ׳₪׳¨׳™׳–׳׳” ׳₪׳¢׳™׳׳”');

    const answerChecks = [];
    ['E','B','C','V','I','S'].forEach(level => {
        const inputEl = document.getElementById(`ans-${level}`);
        if (!inputEl) return;

        const rawValue = inputEl.value.trim();
        const suggestedLevel = inputEl.dataset.suggestedLevel || '';
        const check = validateMappingEntry(level, rawValue, suggestedLevel, prism);

        if (check.cleanText) inputEl.value = check.cleanText;
        setMappingInputStatus(inputEl, check.status, check.reason);

        if (!check.cleanText) {
            delete inputEl.dataset.suggestedLevel;
        } else if (check.detectedLevel) {
            inputEl.dataset.suggestedLevel = check.detectedLevel;
        }

        if (check.status !== 'empty') {
            answerChecks.push({
                level: level,
                text: check.cleanText,
                detectedLevel: check.detectedLevel,
                effectiveLevel: check.effectiveLevel,
                status: check.status,
                reason: check.reason,
                improvement: check.improvement
            });
        }
    });

    if (answerChecks.length === 0) {
        playUISound('prism_error');
        showHintMessage('׳™׳© ׳׳”׳–׳™׳ ׳׳₪׳—׳•׳× ׳×׳©׳•׳‘׳” ׳׳—׳× ׳›׳“׳™ ׳׳§׳‘׳ ׳׳‘׳—׳•׳ ׳•׳¦׳™׳•׳.');
        return;
    }

    const emotion = parseInt(document.getElementById('prism-emotion').value || '3');
    const resistance = parseInt(document.getElementById('prism-resistance').value || '2');
    const score = computePrismScore(answerChecks);

    const session = {
        datetime: new Date().toISOString(),
        prism_id: prism.id,
        prism_name: prism.name_he,
        anchor: prism.anchor_question_templates[0],
        answers: answerChecks,
        emotion: emotion,
        resistance: resistance,
        score: score
    };

    const mismatchesCount = answerChecks.filter(a => a.status === 'mismatch').length;
    if (mismatchesCount > 0) playUISound('prism_warn');
    else playUISound('prism_submit');

    const recommendation = computePivotRecommendation(session);
    renderPrismResultCompact(session, recommendation);
    savePrismSession(session, recommendation);
}

function computePivotRecommendation(session) {
    const counts = {E:0,B:0,C:0,V:0,I:0,S:0};
    session.answers.forEach(a => {
        const effective = a.effectiveLevel || a.level;
        if (counts[effective] !== undefined) counts[effective]++;
    });

    const order = ['E','B','C','V','I','S'];
    let best = 'E';
    let bestCount = -1;
    for (const level of order) {
        if (counts[level] > bestCount) {
            best = level;
            bestCount = counts[level];
        }
    }

    if (counts.I > 0 && session.resistance >= 4) {
        for (const level of ['E', 'B', 'C']) {
            if (counts[level] > 0) {
                best = level;
                break;
            }
        }
    }

    const prism = getPrismById(session.prism_id);
    const mismatches = session.answers.filter(a => a.status === 'mismatch').length;
    const intervention = prism?.recommended_interventions_by_level?.[best] || '׳׳•׳׳׳¥ ׳׳”׳×׳—׳™׳ ׳‘׳¦׳¢׳“ ׳§׳˜׳ ׳•׳‘׳¨׳•׳¨ ׳©׳ ׳™׳×׳ ׳׳‘׳¦׳¢ ׳”׳©׳‘׳•׳¢.';
    const levelSummary = getLevelDisplay(best);
    const reasonParts = [];

    if (bestCount > 0) {
        reasonParts.push(`׳”׳¨׳™׳›׳•׳– ׳”׳’׳‘׳•׳” ׳‘׳™׳•׳×׳¨ ׳©׳ ׳×׳©׳•׳‘׳•׳× ׳ ׳׳¦׳ ׳‘׳¨׳׳× ${levelSummary} (${bestCount} ׳×׳©׳•׳‘׳•׳×).`);
    } else {
        reasonParts.push('׳׳™׳ ׳׳¡׳₪׳™׳§ ׳×׳©׳•׳‘׳•׳× ׳׳׳•׳§׳“׳•׳×, ׳׳›׳ ׳ ׳‘׳—׳¨׳” ׳¨׳׳× ׳”׳×׳—׳׳” ׳׳¢׳©׳™׳×.');
    }
    if (mismatches > 0) {
        reasonParts.push(`׳–׳•׳”׳• ${mismatches} ׳©׳™׳‘׳•׳¦׳™׳ ׳׳ ׳׳“׳•׳™׳§׳™׳, ׳•׳׳›׳ ׳—׳©׳•׳‘ ׳׳”׳×׳—׳™׳ ׳‘׳¡׳™׳“׳•׳¨ ׳”׳¨׳׳•׳× ׳׳₪׳ ׳™ ׳”׳×׳¢׳¨׳‘׳•׳× ׳¢׳׳•׳§׳”.`);
    }
    if (session.resistance >= 4) {
        reasonParts.push('׳¨׳׳× ׳”׳×׳ ׳’׳“׳•׳× ׳’׳‘׳•׳”׳” ׳׳¦׳‘׳™׳¢׳” ׳¢׳ ׳¢׳“׳™׳₪׳•׳× ׳׳”׳×׳—׳׳” ׳‘׳¨׳׳” ׳₪׳¨׳§׳˜׳™׳× ׳•׳ ׳׳•׳›׳” ׳™׳•׳×׳¨.');
    }

    const followUpQuestions = {
        E: '׳׳™׳–׳” ׳©׳™׳ ׳•׳™ ׳§׳˜׳ ׳‘׳¡׳‘׳™׳‘׳” ׳™׳›׳•׳ ׳׳”׳₪׳•׳ ׳׳× ׳”׳”׳×׳ ׳”׳’׳•׳× ׳׳§׳׳” ׳™׳•׳×׳¨ ׳›׳‘׳¨ ׳׳—׳¨?',
        B: '׳׳™׳–׳• ׳₪׳¢׳•׳׳” ׳׳—׳× ׳¡׳₪׳¦׳™׳₪׳™׳× ׳×׳‘׳¦׳¢ ׳‘׳₪׳•׳¢׳ ׳‘׳׳”׳׳ 24 ׳”׳©׳¢׳•׳× ׳”׳§׳¨׳•׳‘׳•׳×?',
        C: '׳׳™׳–׳• ׳׳™׳•׳׳ ׳•׳× ׳׳—׳× ׳—׳¡׳¨׳”, ׳•׳׳™׳ ׳×׳×׳¨׳’׳ ׳׳•׳×׳” 10 ׳“׳§׳•׳× ׳‘׳™׳•׳?',
        V: '׳׳™׳–׳• ׳׳׳•׳ ׳” ׳׳¨׳›׳–׳™׳× ׳׳ ׳”׳׳× ׳׳× ׳”׳׳¦׳‘, ׳•׳׳” ׳™׳§׳¨׳” ׳׳ ׳ ׳ ׳¡׳— ׳׳•׳×׳” ׳׳—׳“׳©?',
        I: '׳׳™׳–׳” ׳¡׳™׳₪׳•׳¨ ׳–׳”׳•׳× ׳׳•׳₪׳¢׳ ׳›׳׳, ׳•׳׳™׳–׳” ׳ ׳™׳¡׳•׳— ׳–׳”׳•׳× ׳—׳׳•׳₪׳™ ׳™׳¢׳–׳•׳¨ ׳׳”׳×׳§׳“׳?',
        S: '׳׳™ ׳‘׳׳¢׳’׳ ׳©׳׳ ׳™׳›׳•׳ ׳׳×׳׳•׳ ׳‘׳׳”׳׳, ׳•׳׳™׳ ׳×׳—׳‘׳¨ ׳׳•׳×׳• ׳׳×׳”׳׳™׳?'
    };

    return {
        pivot: best,
        levelName: levelSummary,
        reason: reasonParts.join(' '),
        counts,
        intervention,
        followUpQuestion: followUpQuestions[best]
    };
}

function renderPrismResult(session, recommendation) {
    const out = document.getElementById('prism-result');
    if (!out) return;
    out.classList.remove('hidden');

    const score = session.score || computePrismScore(session.answers || []);
    const statusMap = {
        ok: { label: '׳×׳•׳׳', className: 'status-ok' },
        mismatch: { label: '׳©׳™׳‘׳•׳¥ ׳©׳’׳•׳™', className: 'status-bad' },
        uncertain: { label: '׳“׳•׳¨׳© ׳—׳™׳“׳•׳“', className: 'status-warn' }
    };

    const mismatchCount = (session.answers || []).filter(a => a.status === 'mismatch').length;
    const scoreInsights = renderPrismScoreInterpretation(score, mismatchCount);
    const prism = getPrismById(session.prism_id);
    const levelsDeepAnalysis = renderPrismLevelsDeepAnalysis(prism, recommendation);
    const actionPlan = renderPrismActionPlan(session, recommendation, mismatchCount);
    const countsHtml = ['E','B','C','V','I','S']
        .map(level => `<li><strong>${getLevelDisplay(level)}:</strong> ${recommendation.counts[level] || 0}</li>`)
        .join('');

    const answersHtml = (session.answers || []).map(answer => {
        const status = statusMap[answer.status] || statusMap.uncertain;
        const movedLevelNote = answer.effectiveLevel && answer.effectiveLevel !== answer.level
            ? `<p><strong>׳׳™׳§׳•׳ ׳׳•׳׳׳¥:</strong> ${getLevelDisplay(answer.effectiveLevel)}</p>`
            : '';

        return `
            <li class="prism-check-item ${status.className}">
                <p><strong>׳©׳“׳” ׳©׳”׳•׳–׳:</strong> ${getLevelDisplay(answer.level)}</p>
                <p><strong>׳¡׳˜׳˜׳•׳¡:</strong> ${status.label}</p>
                <p><strong>׳×׳•׳›׳:</strong> ${answer.text}</p>
                ${movedLevelNote}
                <p><strong>׳׳׳”:</strong> ${answer.reason}</p>
                <p><strong>׳׳™׳ ׳׳©׳₪׳¨:</strong> ${answer.improvement}</p>
            </li>
        `;
    }).join('');

    out.innerHTML = `
        <h4>׳׳₪׳× ׳×׳©׳•׳‘׳•׳× ׳׳₪׳•׳¨׳˜׳× - ${session.prism_name}</h4>
        <p><strong>׳©׳׳׳× ׳¢׳•׳’׳:</strong> ${session.anchor}</p>

        <div class="blueprint-section prism-score-box">
            <h4>׳¦׳™׳•׳ ׳•׳׳‘׳—׳•׳</h4>
            <p><strong>׳¦׳™׳•׳ ׳›׳׳׳™:</strong> ${score.total}/100 (${score.grade})</p>
            <p>׳₪׳™׳¨׳•׳§ ׳”׳¦׳™׳•׳: ׳›׳™׳¡׳•׳™ ${score.coverage}/40 | ׳“׳™׳•׳§ ׳©׳™׳‘׳•׳¥ ${score.alignment}/40 | ׳‘׳”׳™׳¨׳•׳× ׳ ׳™׳¡׳•׳— ${score.clarity}/20</p>
            <p><strong>׳©׳™׳‘׳•׳¦׳™׳ ׳©׳’׳•׳™׳™׳ ׳©׳¡׳•׳׳ ׳• ׳‘׳׳“׳•׳:</strong> ${mismatchCount}</p>
            <p><strong>׳₪׳¢׳ ׳•׳— ׳”׳¦׳™׳•׳:</strong></p>
            ${scoreInsights}
        </div>

        <div class="blueprint-section">
            <h4>׳‘׳“׳™׳§׳× ׳ ׳›׳•׳ ׳•׳× ׳׳›׳ ׳×׳©׳•׳‘׳”</h4>
            <ul class="prism-check-list">
                ${answersHtml}
            </ul>
        </div>

        <div class="blueprint-section prism-pivot-box">
            <h4>׳”׳׳׳¦׳× Pivot - ׳”׳¡׳‘׳¨ ׳׳¢׳׳™׳§</h4>
            <p><strong>Pivot ׳׳•׳׳׳¥:</strong> ${recommendation.levelName}</p>
            <p><strong>׳׳׳” ׳–׳” ׳ ׳‘׳—׳¨:</strong> ${recommendation.reason}</p>
            <p><strong>׳”׳×׳¢׳¨׳‘׳•׳× ׳׳•׳¦׳¢׳×:</strong> ${recommendation.intervention}</p>
            <p><strong>׳©׳׳׳× ׳”׳׳©׳ ׳׳¢׳•׳׳§:</strong> ${recommendation.followUpQuestion}</p>
            <p><strong>׳¢׳•׳¦׳׳× ׳¨׳’׳©:</strong> ${session.emotion} | <strong>׳”׳×׳ ׳’׳“׳•׳×:</strong> ${session.resistance}</p>
            <p><strong>׳₪׳™׳–׳•׳¨ ׳×׳©׳•׳‘׳•׳× ׳׳₪׳™ ׳¨׳׳•׳× (׳׳׳—׳¨ ׳ ׳¨׳׳•׳):</strong></p>
            <ul>${countsHtml}</ul>
            <p><strong>׳׳©׳׳¢׳•׳× ׳׳¢׳©׳™׳×:</strong> ׳”-Pivot ׳”׳•׳ ׳ ׳§׳•׳“׳× ׳”׳׳™׳ ׳•׳£ ׳”׳›׳™ ׳™׳¢׳™׳׳” ׳›׳¨׳’׳¢. ׳׳™׳§׳•׳“ ׳ ׳›׳•׳ ׳‘׳¨׳׳” ׳”׳–׳• ׳™׳•׳¦׳¨ ׳×׳–׳•׳–׳” ׳׳”׳™׳¨׳” ׳•׳׳– ׳׳׳₪׳©׳¨ ׳¢׳‘׳•׳“׳” ׳¢׳׳•׳§׳” ׳™׳•׳×׳¨.</p>
        </div>

        <div class="blueprint-section">
            <h4>׳₪׳¢׳ ׳•׳— ׳¢׳•׳׳§ ׳׳₪׳™ ׳›׳ ׳¨׳׳”</h4>
            ${levelsDeepAnalysis}
        </div>

        <div class="blueprint-section">
            <h4>׳×׳•׳›׳ ׳™׳× ׳₪׳¢׳•׳׳” ׳׳“׳•׳¨׳’׳× (׳׳ ׳¨׳§ ׳¦׳™׳•׳)</h4>
            ${actionPlan}
        </div>

        <div class="blueprint-section">
            <h4>׳׳™׳ ׳׳©׳₪׳¨ ׳׳¦׳™׳•׳ ׳’׳‘׳•׳” ׳™׳•׳×׳¨ ׳‘׳×׳¨׳’׳•׳ ׳”׳‘׳</h4>
            <ol>
                <li>׳‘׳›׳ ׳©׳“׳” ׳›׳×׳•׳‘ ׳׳©׳₪׳˜ ׳׳—׳“ ׳‘׳¨׳•׳¨ ׳©׳׳×׳׳™׳ ׳¨׳§ ׳׳¨׳׳” ׳©׳ ׳׳•׳×׳• ׳©׳“׳”.</li>
                <li>׳׳ ׳׳×׳” ׳׳¢׳×׳™׳§ ׳₪׳¨׳™׳˜ ׳׳•׳›׳, ׳•׳“׳ ׳©׳”׳׳•׳× ׳©׳ ׳”׳₪׳¨׳™׳˜ ׳×׳•׳׳׳× ׳׳©׳“׳”.</li>
                <li>׳”׳™׳׳ ׳¢ ׳׳׳©׳₪׳˜׳™׳ ׳›׳׳׳™׳™׳ ׳׳׳•׳“; ׳›׳×׳™׳‘׳” ׳§׳•׳ ׳§׳¨׳˜׳™׳× ׳׳©׳₪׳¨׳× ׳׳× ׳¦׳™׳•׳ ׳”׳‘׳”׳™׳¨׳•׳×.</li>
            </ol>
        </div>

        <div class="action-buttons">
            <button class="btn btn-secondary" onclick="exportPrismSession()">׳™׳™׳¦׳ ׳¡׳©׳ JSON</button>
        </div>
    `;
}

function renderPrismResultCompact(session, recommendation) {
    const out = document.getElementById('prism-result');
    if (!out) return;
    out.classList.remove('hidden');

    const score = session.score || computePrismScore(session.answers || []);
    const statusMap = {
        ok: { label: '׳×׳•׳׳', className: 'status-ok' },
        mismatch: { label: '׳©׳™׳‘׳•׳¥ ׳©׳’׳•׳™', className: 'status-bad' },
        uncertain: { label: '׳“׳•׳¨׳© ׳—׳™׳“׳•׳“', className: 'status-warn' }
    };

    const statusCounts = { ok: 0, mismatch: 0, uncertain: 0 };
    (session.answers || []).forEach(answer => {
        const key = statusCounts[answer.status] !== undefined ? answer.status : 'uncertain';
        statusCounts[key] += 1;
    });

    const mismatchCount = statusCounts.mismatch;
    const scoreInsights = renderPrismScoreInterpretation(score, mismatchCount);
    const prism = getPrismById(session.prism_id);
    const levelsDeepAnalysis = renderPrismLevelsDeepAnalysis(prism, recommendation);
    const actionPlan = renderPrismActionPlan(session, recommendation, mismatchCount);
    const countsHtml = ['E', 'B', 'C', 'V', 'I', 'S']
        .map(level => `<li><strong>${getLevelDisplay(level)}:</strong> ${recommendation.counts[level] || 0}</li>`)
        .join('');

    const checksCompactHtml = (session.answers || []).map(answer => {
        const status = statusMap[answer.status] || statusMap.uncertain;
        const targetLevel = answer.effectiveLevel && answer.effectiveLevel !== answer.level
            ? `<p><strong>׳”׳¢׳‘׳¨ ׳׳¨׳׳”:</strong> ${getLevelDisplay(answer.effectiveLevel)}</p>`
            : '';

        return `
            <li class="prism-check-item ${status.className}">
                <p><strong>${getLevelDisplay(answer.level)}</strong> - ${status.label}</p>
                <p>${escapeHtml(answer.text || '')}</p>
                ${targetLevel}
            </li>
        `;
    }).join('');

    const focusItems = (session.answers || [])
        .filter(answer => answer.status === 'mismatch' || answer.status === 'uncertain')
        .slice(0, 3)
        .map(answer => {
            const target = answer.effectiveLevel && answer.effectiveLevel !== answer.level
                ? ` -> ${getLevelDisplay(answer.effectiveLevel)}`
                : '';
            return `<li><strong>${getLevelDisplay(answer.level)}${target}:</strong> ${escapeHtml(answer.improvement || '')}</li>`;
        })
        .join('');

    out.innerHTML = `
        <h4>׳‘׳“׳™׳§׳” ׳׳”׳™׳¨׳” - ${escapeHtml(session.prism_name || '')}</h4>
        <p><strong>׳©׳׳׳× ׳¢׳•׳’׳:</strong> ${escapeHtml(session.anchor || '')}</p>

        <div class="prism-quick-grid">
            <article class="prism-quick-card">
                <h5>׳¦׳™׳•׳ ׳›׳•׳׳</h5>
                <p class="prism-quick-number">${score.total}/100</p>
                <p>${escapeHtml(score.grade || '')}</p>
            </article>
            <article class="prism-quick-card">
                <h5>Pivot ׳׳•׳׳׳¥</h5>
                <p class="prism-quick-number">${escapeHtml(recommendation.levelName || '')}</p>
                <p>${escapeHtml(recommendation.intervention || '')}</p>
            </article>
            <article class="prism-quick-card">
                <h5>׳¡׳˜׳˜׳•׳¡ ׳©׳™׳‘׳•׳¦׳™׳</h5>
                <p>׳×׳•׳׳: ${statusCounts.ok} | ׳“׳•׳¨׳© ׳—׳™׳“׳•׳“: ${statusCounts.uncertain} | ׳©׳’׳•׳™: ${statusCounts.mismatch}</p>
                <p>׳¨׳’׳©: ${session.emotion} | ׳”׳×׳ ׳’׳“׳•׳×: ${session.resistance}</p>
            </article>
        </div>

        <div class="blueprint-section prism-focus-box">
            <h4>׳׳” ׳¢׳•׳©׳™׳ ׳¢׳›׳©׳™׳• (׳¢׳“ 3 ׳¦׳¢׳“׳™׳)</h4>
            <ul class="prism-action-plan">
                ${focusItems || '<li>׳ ׳¨׳׳” ׳˜׳•׳‘. ׳׳₪׳©׳¨ ׳׳¢׳‘׳•׳¨ ׳׳‘׳™׳¦׳•׳¢ ׳”-Pivot ׳©׳ ׳‘׳—׳¨.</li>'}
                <li><strong>׳©׳׳׳× ׳”׳׳©׳:</strong> ${escapeHtml(recommendation.followUpQuestion || '')}</li>
            </ul>
        </div>

        <details class="prism-more-details">
            <summary>׳”׳¦׳’ ׳₪׳™׳¨׳•׳˜ ׳׳׳</summary>
            <div class="blueprint-section prism-score-box">
                <h4>׳¦׳™׳•׳ ׳•׳׳‘׳—׳•׳ ׳׳׳</h4>
                <p><strong>׳¦׳™׳•׳ ׳›׳•׳׳:</strong> ${score.total}/100 (${escapeHtml(score.grade || '')})</p>
                <p>׳₪׳™׳¨׳•׳§ ׳”׳¦׳™׳•׳: ׳›׳™׳¡׳•׳™ ${score.coverage}/40 | ׳“׳™׳•׳§ ׳©׳™׳‘׳•׳¥ ${score.alignment}/40 | ׳‘׳”׳™׳¨׳•׳× ׳ ׳™׳¡׳•׳— ${score.clarity}/20</p>
                <p><strong>׳©׳™׳‘׳•׳¦׳™׳ ׳©׳’׳•׳™׳™׳:</strong> ${mismatchCount}</p>
                ${scoreInsights}
            </div>

            <div class="blueprint-section">
                <h4>׳‘׳“׳™׳§׳” ׳׳›׳ ׳×׳©׳•׳‘׳”</h4>
                <ul class="prism-check-list">
                    ${checksCompactHtml}
                </ul>
            </div>

            <div class="blueprint-section prism-pivot-box">
                <h4>׳׳׳” ׳–׳” ׳”-Pivot ׳”׳׳•׳׳׳¥</h4>
                <p>${escapeHtml(recommendation.reason || '')}</p>
                <p><strong>׳₪׳™׳–׳•׳¨ ׳×׳©׳•׳‘׳•׳× ׳׳₪׳™ ׳¨׳׳•׳×:</strong></p>
                <ul>${countsHtml}</ul>
            </div>

            <div class="blueprint-section">
                <h4>׳×׳•׳›׳ ׳™׳× ׳₪׳¢׳•׳׳” ׳׳“׳•׳¨׳’׳×</h4>
                ${actionPlan}
            </div>

            <div class="blueprint-section">
                <h4>׳₪׳¢׳ ׳•׳— ׳¢׳•׳׳§ ׳׳₪׳™ ׳¨׳׳•׳×</h4>
                ${levelsDeepAnalysis}
            </div>
        </details>

        <div class="action-buttons">
            <button class="btn btn-secondary" onclick="exportPrismSession()">׳™׳™׳¦׳ ׳¡׳©׳ JSON</button>
        </div>
    `;
}

function savePrismSession(session, recommendation) {
    // keep last 10 sessions in localStorage
    const key = 'prism_sessions';
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    arr.unshift(Object.assign({}, session, { recommendation }));
    while (arr.length > 10) arr.pop();
    localStorage.setItem(key, JSON.stringify(arr));
}

function exportPrismSession() {
    const key = 'prism_sessions';
    const raw = localStorage.getItem(key) || '[]';
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `prism_sessions_${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
}

// Populate prepared items for drag-and-drop into the mapping inputs
function populatePreparedItems(prism) {
    const list = document.getElementById('prepared-list');
    if (!list) return;
    list.innerHTML = '';

    let items = [];
    if (prism.examples && prism.examples.length) items = items.concat(prism.examples);
    if (prism.recommended_interventions_by_level) {
        Object.keys(prism.recommended_interventions_by_level).forEach(k => {
            items.push(`${k}: ${prism.recommended_interventions_by_level[k]}`);
        });
    }
    if (prism.level_hints) {
        Object.keys(prism.level_hints).forEach(k => {
            items.push(`${k}: ${prism.level_hints[k]}`);
        });
    }

    // Deduplicate and limit
    items = Array.from(new Set(items)).filter(Boolean).slice(0, 12);

    items.forEach(text => {
        const div = document.createElement('div');
        const parsed = parseLevelPrefixedText(text);
        const cleanText = parsed.cleanText || text;
        div.className = 'prepared-item';
        div.textContent = text;
        div.title = text;
        div.dataset.level = parsed.level || '';
        div.dataset.cleanText = cleanText;
        div.setAttribute('draggable', 'true');

        div.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', cleanText);
            e.dataTransfer.setData('text/meta-model-level', parsed.level || '');
        });

        // click to copy into focused or first empty input
        div.addEventListener('click', () => copyPreparedToFocusedOrEmpty(cleanText, parsed.level));

        list.appendChild(div);
    });
}

function attachMappingDropHandlers() {
    const inputs = document.querySelectorAll('.mapping-input');
    inputs.forEach(inp => {
        if (inp.dataset.boundDragDrop === 'true') return;
        inp.dataset.boundDragDrop = 'true';

        inp.addEventListener('dragover', (e) => e.preventDefault());
        inp.addEventListener('drop', (e) => {
            e.preventDefault();
            const txt = e.dataTransfer.getData('text/plain');
            const suggestedLevel = e.dataTransfer.getData('text/meta-model-level');
            if (txt) applyPreparedTextToInput(inp, txt, suggestedLevel);
        });
        inp.addEventListener('focus', () => {
            document.querySelectorAll('.mapping-input').forEach(i => i.classList.remove('focused'));
            inp.classList.add('focused');
        });
        inp.addEventListener('input', () => {
            const parsed = parseLevelPrefixedText(inp.value);
            if (parsed.level) {
                inp.value = parsed.cleanText;
                inp.dataset.suggestedLevel = parsed.level;
            }
            if (!inp.value.trim()) {
                delete inp.dataset.suggestedLevel;
                clearMappingInputStatus(inp);
                return;
            }

            const expectedLevel = getExpectedLevelFromInput(inp);
            if (inp.dataset.suggestedLevel && inp.dataset.suggestedLevel !== expectedLevel) {
                setMappingInputStatus(inp, 'mismatch', `׳”׳×׳•׳›׳ ׳ ׳¨׳׳” ׳›׳׳• ${getLevelDisplay(inp.dataset.suggestedLevel)} ׳•׳׳ ${getLevelDisplay(expectedLevel)}.`);
            } else {
                clearMappingInputStatus(inp);
            }
        });
    });
}

function applyPreparedTextToInput(inputEl, text, suggestedLevel = '') {
    if (!inputEl) return;
    const parsed = parseLevelPrefixedText(text);
    const cleanText = parsed.cleanText || text;
    const level = (suggestedLevel || parsed.level || '').toUpperCase();

    inputEl.value = cleanText;
    if (level && LOGICAL_LEVEL_INFO[level]) {
        inputEl.dataset.suggestedLevel = level;
    } else {
        delete inputEl.dataset.suggestedLevel;
    }

    const expectedLevel = getExpectedLevelFromInput(inputEl);
    if (level && expectedLevel && level !== expectedLevel) {
        setMappingInputStatus(inputEl, 'mismatch', `׳”׳×׳•׳›׳ ׳©׳•׳™׳ ׳-${getLevelDisplay(level)} ׳׳ ׳”׳•׳–׳ ׳‘׳©׳“׳” ${getLevelDisplay(expectedLevel)}.`);
        playUISound('prism_warn');
    } else {
        clearMappingInputStatus(inputEl);
        playUISound('prism_pick');
    }
}

function copyPreparedToFocusedOrEmpty(text, suggestedLevel = '') {
    const focused = document.querySelector('.mapping-input.focused');
    if (focused) { applyPreparedTextToInput(focused, text, suggestedLevel); focused.focus(); return; }
    const empty = Array.from(document.querySelectorAll('.mapping-input')).find(i => !i.value);
    if (empty) { applyPreparedTextToInput(empty, text, suggestedLevel); empty.focus(); return; }
    const first = document.querySelector('.mapping-input');
    if (first) { applyPreparedTextToInput(first, text, suggestedLevel); first.focus(); }
}

// ==================== UI HELPERS ====================

function showLoadingIndicator() {
    let loader = document.getElementById('app-loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'app-loader';
        loader.innerHTML = '<div class="loader-box"><p>נ“ ׳˜׳¢׳™׳ ׳× ׳›׳׳™׳...</p></div>';
        document.body.insertBefore(loader, document.body.firstChild);
    }
    loader.style.display = 'flex';
}

function hideLoadingIndicator() {
    const loader = document.getElementById('app-loader');
    if (loader) loader.style.display = 'none';
}

function showErrorMessage(msg) {
    alert('ג ' + msg);
}

function showHint(text) {
    const box = document.getElementById('hint-box');
    const hintText = document.getElementById('hint-text');
    const message = String(text || '').trim() || '׳”׳׳©׳/׳™ ׳¦׳¢׳“ ׳§׳˜׳ ׳׳—׳“ ׳§׳“׳™׳׳”.';
    if (box && hintText) {
        hintText.textContent = message;
        box.style.display = 'flex';
        setTimeout(() => { if (box) box.style.display = 'none'; }, 6000);
    }
}

function closeHint() {
    const box = document.getElementById('hint-box');
    if (box) box.style.display = 'none';
}

function navigateTo(tabName) {
    const tabBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (tabBtn) {
        tabBtn.click();
        return;
    }

    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));
    
    const btn = document.querySelector(`[data-tab="${tabName}"]`);
    if (btn) btn.classList.add('active');
    
    const content = document.getElementById(tabName);
    if (content) content.classList.add('active');
    if (tabName !== 'practice-radar') {
        setRapidPatternFocusMode(false);
        hideRapidPatternExplanation({ resumeIfNeeded: false });
    }
    persistPracticeTabPreference(tabName);

    const scenarioContext = tabName === 'scenario-trainer' ? scenarioTrainer.activeScenario : null;
    closeComicPreviewModal();
    renderGlobalComicStrip(tabName, scenarioContext);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== PROGRESS TRACKING & GAMIFICATION ====================

function legacyLoadUserProgress() {
    const saved = localStorage.getItem('userProgress');
    if (saved) {
        userProgress = JSON.parse(saved);
    }
}

function saveUserProgress() {
    localStorage.setItem('userProgress', JSON.stringify(userProgress));
}

function legacyAddXP(amount) {
    userProgress.xp += amount;
    updateStreak();
    checkAndAwardBadges();
    saveUserProgress();
    updateProgressHub();
}

function legacyUpdateStreak() {
    const today = new Date().toISOString().split('T')[0];
    if (userProgress.lastSessionDate === today) return; // Already counted today
    
    if (userProgress.lastSessionDate === null) {
        userProgress.streak = 1;
    } else {
        const lastDate = new Date(userProgress.lastSessionDate);
        const now = new Date();
        const diff = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
        
        if (diff === 1) {
            userProgress.streak += 1;
        } else if (diff > 1) {
            userProgress.streak = 1; // Reset streak if missed a day
        }
    }
    userProgress.lastSessionDate = today;
}

function legacyCheckAndAwardBadges() {
    const badgesList = [
        { id: 'first_step', name: '׳¦׳¢׳“ ׳¨׳׳©׳•׳', icon: 'נ‘£', condition: () => userProgress.xp >= 10 },
        { id: 'fire_10', name: '׳׳”׳˜ נ”¥', icon: 'נ”¥', condition: () => userProgress.streak >= 10 },
        { id: 'xp_100', name: '100 XP', icon: 'ג­', condition: () => userProgress.xp >= 100 },
        { id: 'xp_500', name: '500 XP', icon: 'ג¨', condition: () => userProgress.xp >= 500 },
        { id: 'sessions_10', name: '10 ׳¡׳©׳ ׳™׳', icon: 'נ“', condition: () => userProgress.sessions >= 10 },
    ];
    
    badgesList.forEach(badge => {
        if (badge.condition() && !userProgress.badges.find(b => b.id === badge.id)) {
            userProgress.badges.push({ id: badge.id, name: badge.name, icon: badge.icon, earned: new Date().toISOString() });
            showHint(`נ† ׳›׳‘׳¨ ׳¨׳›׳©׳× ׳׳× ׳”׳×׳’: ${badge.name}`);
        }
    });
}

function recordSession() {
    userProgress.sessions += 1;
    updateStreak();
    checkAndAwardBadges();
    saveUserProgress();
    updateProgressHub();
}

function initializeProgressHub() {
    updateProgressHub();
}

function legacyUpdateProgressHub() {
    const streakEl = document.getElementById('streak-count');
    const xpEl = document.getElementById('xp-count');
    const starsEl = document.getElementById('stars-count');
    const badgeCountEl = document.getElementById('badge-count');
    const sessionEl = document.getElementById('session-count');
    const badgesDisplay = document.getElementById('badges-display');
    
    if (streakEl) streakEl.textContent = `${userProgress.streak} ׳™׳׳™׳`;
    if (xpEl) xpEl.textContent = userProgress.xp;
    if (starsEl) starsEl.textContent = userProgress.stars;
    if (badgeCountEl) badgeCountEl.textContent = userProgress.badges.length;
    if (sessionEl) sessionEl.textContent = userProgress.sessions;
    
    if (badgesDisplay) {
        badgesDisplay.innerHTML = userProgress.badges.map(b => `
            <div class="badge" title="${b.name}">
                <span class="badge-icon">${b.icon}</span>
                <span>${b.name}</span>
            </div>
        `).join('');
    }
}

// ״§‡ˆƒ XP acquisition ״¹„‰ actions
function onPracticeComplete() {
    addXP(5);
    recordSession();
}

function onBlueprintComplete() {
    addXP(20);
    recordSession();
}

function onPrismComplete() {
    addXP(15);
    recordSession();
}

// --- Progress v2: daily goal + streak charge ---
function toLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
    if (!dateKey || typeof dateKey !== 'string') return null;
    const [year, month, day] = dateKey.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
}

function getDaysDiff(fromKey, toKey) {
    const from = parseDateKey(fromKey);
    const to = parseDateKey(toKey);
    if (!from || !to) return 0;
    from.setHours(0, 0, 0, 0);
    to.setHours(0, 0, 0, 0);
    return Math.floor((to - from) / (1000 * 60 * 60 * 24));
}

function clampNumber(value, min, max, fallback = min) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
}

function normalizeUserProgress(raw) {
    const merged = { ...DEFAULT_USER_PROGRESS, ...(raw || {}) };
    merged.badges = Array.isArray(merged.badges) ? merged.badges : [];
    merged.xp = Math.max(0, Math.floor(Number(merged.xp) || 0));
    merged.stars = Math.max(0, Math.floor(Number(merged.stars) || 0));
    merged.streak = Math.max(0, Math.floor(Number(merged.streak) || 0));
    merged.sessions = Math.max(0, Math.floor(Number(merged.sessions) || 0));
    merged.dailyGoal = clampNumber(merged.dailyGoal, 1, 10, DEFAULT_DAILY_GOAL);
    merged.todayActions = Math.max(0, Math.floor(Number(merged.todayActions) || 0));
    merged.streakCharges = clampNumber(merged.streakCharges, 0, MAX_STREAK_CHARGES, 0);
    merged.lastSessionDate = typeof merged.lastSessionDate === 'string' ? merged.lastSessionDate : null;
    merged.todayDate = typeof merged.todayDate === 'string' ? merged.todayDate : null;
    merged.lastChargeAwardedDate = typeof merged.lastChargeAwardedDate === 'string' ? merged.lastChargeAwardedDate : null;
    merged.lastChargeUsedDate = typeof merged.lastChargeUsedDate === 'string' ? merged.lastChargeUsedDate : null;
    return merged;
}

function syncDailyProgressWindow() {
    const today = toLocalDateKey();
    if (userProgress.todayDate !== today) {
        userProgress.todayDate = today;
        userProgress.todayActions = 0;
    }
}

function tryAwardStreakCharge() {
    const reachedGoal = userProgress.todayActions >= userProgress.dailyGoal;
    const alreadyAwardedToday = userProgress.lastChargeAwardedDate === userProgress.todayDate;
    if (!reachedGoal || alreadyAwardedToday) return;

    if (userProgress.streakCharges >= MAX_STREAK_CHARGES) {
        userProgress.lastChargeAwardedDate = userProgress.todayDate;
        return;
    }

    userProgress.streakCharges += 1;
    userProgress.lastChargeAwardedDate = userProgress.todayDate;
    showHint(`נ›¡ן¸ ׳§׳™׳‘׳׳× Streak Charge (${userProgress.streakCharges}/${MAX_STREAK_CHARGES})`);
}

function registerDailyAction(amount = 1) {
    syncDailyProgressWindow();
    const delta = Math.max(0, Math.floor(Number(amount) || 0));
    if (!delta) return;
    userProgress.todayActions += delta;
    tryAwardStreakCharge();
}

function loadUserProgress() {
    const saved = localStorage.getItem('userProgress');
    if (!saved) {
        userProgress = normalizeUserProgress(DEFAULT_USER_PROGRESS);
        syncDailyProgressWindow();
        saveUserProgress();
        return;
    }
    try {
        userProgress = normalizeUserProgress(JSON.parse(saved));
    } catch (error) {
        console.warn('Failed to parse user progress. Resetting defaults.', error);
        userProgress = normalizeUserProgress(DEFAULT_USER_PROGRESS);
    }
    syncDailyProgressWindow();
    saveUserProgress();
}

function addXP(amount) {
    const delta = Math.floor(Number(amount) || 0);
    if (delta <= 0) return;
    userProgress.xp += delta;
    registerDailyAction(1);
    updateStreak();
    checkAndAwardBadges();
    saveUserProgress();
    updateProgressHub();
}

function addStars(amount) {
    const delta = Math.floor(Number(amount) || 0);
    if (delta <= 0) return;
    userProgress.stars += delta;
    checkAndAwardBadges();
    saveUserProgress();
    updateProgressHub();
}

function updateStreak() {
    const today = toLocalDateKey();
    if (userProgress.lastSessionDate === today) return;

    if (!userProgress.lastSessionDate) {
        userProgress.streak = 1;
    } else {
        const diff = getDaysDiff(userProgress.lastSessionDate, today);
        if (diff <= 1) {
            userProgress.streak += 1;
        } else if (diff === 2 && userProgress.streakCharges > 0) {
            userProgress.streakCharges -= 1;
            userProgress.streak += 1;
            userProgress.lastChargeUsedDate = today;
            showHint(`נ›¡ן¸ ׳”׳©׳×׳׳©׳× ׳‘-Streak Charge. ׳ ׳©׳׳¨׳• ${userProgress.streakCharges}/${MAX_STREAK_CHARGES}`);
        } else {
            userProgress.streak = 1;
        }
    }

    userProgress.lastSessionDate = today;
}

function checkAndAwardBadges() {
    const badgesList = [
        { id: 'first_step', name: '׳¦׳¢׳“ ׳¨׳׳©׳•׳', icon: 'נ‘£', condition: () => userProgress.xp >= 10 },
        { id: 'fire_10', name: '׳׳”׳˜ נ”¥', icon: 'נ”¥', condition: () => userProgress.streak >= 10 },
        { id: 'xp_100', name: '100 XP', icon: 'ג­', condition: () => userProgress.xp >= 100 },
        { id: 'xp_500', name: '500 XP', icon: 'ג¨', condition: () => userProgress.xp >= 500 },
        { id: 'sessions_10', name: '10 ׳¡׳©׳ ׳™׳', icon: 'נ“', condition: () => userProgress.sessions >= 10 },
        { id: 'daily_goal', name: '׳™׳¢׳“ ׳™׳•׳׳™', icon: 'נ¯', condition: () => userProgress.lastChargeAwardedDate === userProgress.todayDate },
        { id: 'charge_full', name: 'Charge Full', icon: 'נ›¡ן¸', condition: () => userProgress.streakCharges >= MAX_STREAK_CHARGES },
    ];

    badgesList.forEach(badge => {
        if (badge.condition() && !userProgress.badges.find(b => b.id === badge.id)) {
            userProgress.badges.push({ id: badge.id, name: badge.name, icon: badge.icon, earned: new Date().toISOString() });
            showHint(`נ† ׳›׳‘׳¨ ׳¨׳›׳©׳× ׳׳× ׳”׳×׳’: ${badge.name}`);
        }
    });
}

function updateProgressHub() {
    const streakEl = document.getElementById('streak-count');
    const streakDateEl = document.getElementById('streak-date');
    const xpEl = document.getElementById('xp-count');
    const starsEl = document.getElementById('stars-count');
    const badgeCountEl = document.getElementById('badge-count');
    const sessionEl = document.getElementById('session-count');
    const dailyGoalCard = document.getElementById('daily-goal-card');
    const dailyGoalValueEl = document.getElementById('daily-goal-value');
    const dailyGoalFillEl = document.getElementById('daily-goal-fill');
    const dailyGoalNoteEl = document.getElementById('daily-goal-note');
    const streakChargeValueEl = document.getElementById('streak-charge-value');
    const streakChargeNoteEl = document.getElementById('streak-charge-note');
    const badgesDisplay = document.getElementById('badges-display');

    syncDailyProgressWindow();

    if (streakEl) streakEl.textContent = `${userProgress.streak} ׳™׳׳™׳`;
    if (xpEl) xpEl.textContent = userProgress.xp;
    if (starsEl) starsEl.textContent = userProgress.stars;
    if (badgeCountEl) badgeCountEl.textContent = userProgress.badges.length;
    if (sessionEl) sessionEl.textContent = userProgress.sessions;
    if (streakDateEl) {
        if (!userProgress.lastSessionDate) {
            streakDateEl.textContent = '׳”׳™׳•׳ ׳”׳¨׳׳©׳•׳!';
        } else if (userProgress.lastChargeUsedDate === userProgress.lastSessionDate) {
            streakDateEl.textContent = '׳”׳¨׳¦׳£ ׳ ׳©׳׳¨ ׳¢׳ Charge';
        } else {
            streakDateEl.textContent = `׳₪׳¢׳™׳׳•׳× ׳׳—׳¨׳•׳ ׳”: ${userProgress.lastSessionDate}`;
        }
    }

    const goalRatio = userProgress.todayActions / userProgress.dailyGoal;
    const goalPercent = Math.min(100, Math.round(goalRatio * 100));
    const remaining = Math.max(userProgress.dailyGoal - userProgress.todayActions, 0);
    const completed = remaining === 0;
    if (dailyGoalValueEl) dailyGoalValueEl.textContent = `${Math.min(userProgress.todayActions, userProgress.dailyGoal)}/${userProgress.dailyGoal}`;
    if (dailyGoalFillEl) dailyGoalFillEl.style.width = `${goalPercent}%`;
    if (dailyGoalNoteEl) dailyGoalNoteEl.textContent = completed ? '׳”׳™׳¢׳“ ׳”׳™׳•׳׳™ ׳”׳•׳©׳׳' : `׳¢׳•׳“ ${remaining} ׳₪׳¢׳•׳׳•׳× ׳׳”׳©׳׳׳”`;
    if (dailyGoalCard) dailyGoalCard.classList.toggle('is-goal-complete', completed);

    if (streakChargeValueEl) streakChargeValueEl.textContent = `${userProgress.streakCharges}/${MAX_STREAK_CHARGES}`;
    if (streakChargeNoteEl) {
        streakChargeNoteEl.textContent = userProgress.streakCharges > 0
            ? '׳©׳•׳׳¨ ׳¢׳ ׳”׳¨׳¦׳£ ׳‘׳™׳•׳ ׳₪׳¡׳₪׳•׳¡ ׳׳—׳“'
            : '׳¡׳™׳™׳ ׳™׳¢׳“ ׳™׳•׳׳™ ׳›׳“׳™ ׳׳׳׳ Charge';
    }

    if (badgesDisplay) {
        badgesDisplay.innerHTML = userProgress.badges.map(b => `
            <div class="badge" title="${b.name}">
                <span class="badge-icon">${b.icon}</span>
                <span>${b.name}</span>
            </div>
        `).join('');
    }
}

// ==================== END OF APP ===================

// ==================== END OF APP ===================

// ==================== COMIC ENGINE FLOW (OVERRIDE) ===================

const CEFLOW_STATES = Object.freeze({
    SCENE_READY: 'SCENE_READY',
    CHOICE_REVEALED: 'CHOICE_REVEALED',
    POWER_CARD: 'POWER_CARD',
    BLUEPRINT_OPEN: 'BLUEPRINT_OPEN',
    NEXT_SCENE: 'NEXT_SCENE'
});

const CEFLOW_CHOICE_ORDER = Object.freeze(['angry', 'mock', 'rescue', 'avoid', 'meta']);

const CEFLOW_FALLBACKS = Object.freeze({
    angry: Object.freeze({
        tone: 'danger', label: '׳›׳¢׳¡', emoji: 'נ˜¡',
        counterReply: '׳׳ ׳™ ׳ ׳¡׳’׳¨/׳× ׳›׳©׳׳“׳‘׳¨׳™׳ ׳׳׳™׳™ ׳›׳›׳”.',
        interpretation: '׳×׳’׳•׳‘׳” ׳׳™׳׳₪׳•׳׳¡׳™׳‘׳™׳× ׳”׳’׳‘׳™׳¨׳” ׳‘׳•׳©׳” ׳•׳¡׳’׳¨׳” ׳–׳¨׳™׳׳× ׳׳™׳“׳¢.',
        impact: Object.freeze({ stats: Object.freeze({ flow: 24, agency: 20, shame: 88 }), xrayTags: Object.freeze(['נ˜³ ׳‘׳•׳©׳”', 'נ× ׳¡׳’׳™׳¨׳”']), microOutcome: Object.freeze(['נ“‰ ׳–׳¨׳™׳׳”', 'נ§± ׳×׳§׳™׳¢׳”', 'נ”’ ׳”׳™׳׳ ׳¢׳•׳×']) })
    }),
    mock: Object.freeze({
        tone: 'warn', label: '׳׳¢׳’', emoji: 'נ˜',
        counterReply: '׳˜׳•׳‘... ׳׳– ׳׳ ׳™ ׳›׳ ׳¨׳׳” ׳¡׳×׳ ׳׳ ׳׳¡׳₪׳™׳§ ׳˜׳•׳‘/׳”.',
        interpretation: '׳׳¢׳’ ׳׳™׳™׳¦׳¨ ׳”׳©׳•׳•׳׳” ׳•׳©׳™׳×׳•׳§, ׳׳ ׳”׳‘׳”׳¨׳”.',
        impact: Object.freeze({ stats: Object.freeze({ flow: 32, agency: 24, shame: 82 }), xrayTags: Object.freeze(['נ™ˆ ׳”׳©׳•׳•׳׳”', 'נ§ ׳ ׳™׳×׳•׳§']), microOutcome: Object.freeze(['נ“‰ ׳׳׳•׳', 'נ“‰ ׳–׳¨׳™׳׳”', 'נ§± ׳×׳§׳™׳¢׳”']) })
    }),
    rescue: Object.freeze({
        tone: 'purple', label: '׳”׳¦׳׳”', emoji: 'נ›',
        counterReply: '׳¡׳‘׳‘׳”... ׳׳– ׳×׳¢׳©׳”/׳™ ׳‘׳׳§׳•׳׳™.',
        interpretation: '׳”׳¦׳׳” ׳₪׳•׳×׳¨׳× ׳¨׳’׳¢׳™׳× ׳׳ ׳׳©׳׳™׳¨׳” ׳×׳׳•׳×.',
        impact: Object.freeze({ stats: Object.freeze({ flow: 46, agency: 20, shame: 50 }), xrayTags: Object.freeze(['נ› ׳×׳׳•׳×', 'נ§  ׳‘׳׳™ ׳׳׳™׳“׳”']), microOutcome: Object.freeze(['ג¸ן¸ ׳”׳§׳׳”', 'נ” ׳×׳׳•׳×', 'נ“‰ ׳׳—׳¨׳™׳•׳×']) })
    }),
    avoid: Object.freeze({
        tone: 'muted', label: '׳”׳×׳—׳׳§׳•׳×', emoji: 'נ™ˆ',
        counterReply: '׳׳•׳§׳™׳™... ׳׳– ׳ ׳“׳—׳” ׳’׳ ׳׳× ׳–׳”.',
        interpretation: '׳“׳—׳™׳™׳” ׳©׳•׳׳¨׳× ׳¢׳ ׳ ׳•׳—׳•׳× ׳¨׳’׳¢׳™׳× ׳•׳׳¢׳׳™׳§׳” ׳׳× ׳”׳×׳§׳™׳¢׳•׳×.',
        impact: Object.freeze({ stats: Object.freeze({ flow: 30, agency: 22, shame: 62 }), xrayTags: Object.freeze(['נ•³ן¸ ׳“׳—׳™׳™׳”', 'ג³ ׳¢׳•׳׳¡']), microOutcome: Object.freeze(['נ“‰ ׳”׳×׳§׳“׳׳•׳×', 'נ” ׳—׳–׳¨׳× ׳‘׳¢׳™׳”', 'נ§± ׳×׳§׳™׳¢׳”']) })
    }),
    meta: Object.freeze({
        tone: 'good', label: '׳׳˜׳”-׳׳•׳“׳', emoji: 'ג…',
        counterReply: '׳׳ ׳™ ׳ ׳×׳§׳¢/׳× ׳‘׳¦׳¢׳“ ׳”׳¨׳׳©׳•׳, ׳׳ ׳‘׳¨׳•׳¨ ׳׳™ ׳׳׳™׳₪׳” ׳׳”׳×׳—׳™׳.',
        interpretation: '׳©׳׳׳” ׳׳“׳•׳™׳§׳× ׳—׳©׳₪׳” ׳׳× ׳”׳›׳׳× ׳•׳”׳—׳–׳™׳¨׳” ׳¡׳•׳›׳ ׳•׳×.',
        impact: Object.freeze({ stats: Object.freeze({ flow: 86, agency: 84, shame: 24 }), xrayTags: Object.freeze(['נ§© ׳—׳©׳™׳₪׳”', 'נ¬ן¸ ׳₪׳×׳™׳—׳”']), microOutcome: Object.freeze(['נ“ˆ ׳–׳¨׳™׳׳”', 'נ¢ ׳¡׳•׳›׳ ׳•׳×', 'נ”“ ׳׳™׳“׳¢ ׳—׳“׳©']) })
    })
});

const CEFLOW_HL_RULES = Object.freeze([
    Object.freeze({ type: 'generalization', label: '׳”׳›׳׳׳”', css: 'hl-generalization', tokens: Object.freeze(['׳›׳•׳׳', '׳×׳׳™׳“', '׳׳£ ׳׳—׳“', '׳›׳׳•׳', '׳‘׳©׳•׳ ׳׳¦׳‘']) }),
    Object.freeze({ type: 'modal', label: '׳׳•׳“׳׳™׳•׳×', css: 'hl-modal', tokens: Object.freeze(['׳׳™ ׳׳₪׳©׳¨', '׳—׳™׳™׳‘', '׳¦׳¨׳™׳', '׳׳¡׳•׳¨', '׳׳ ׳™׳›׳•׳']) }),
    Object.freeze({ type: 'vague', label: '׳¢׳׳™׳׳•׳× ׳₪׳¢׳•׳׳”', css: 'hl-vague', tokens: Object.freeze(['׳׳¢׳©׳•׳×', '׳׳¡׳“׳¨', '׳׳˜׳₪׳', '׳׳”׳×׳׳¨׳’׳', '׳׳”׳’׳™׳¢']) })
]);

function ceflowClamp(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.min(100, Math.round(n)));
}

function ceflowNormBlueprint(raw) {
    if (!raw || typeof raw !== 'object') return null;
    return {
        goal: String(raw.goal || '').trim(),
        first: String(raw.first || raw.first_step || '').trim(),
        middle: (Array.isArray(raw.middle) ? raw.middle : raw.middle_steps || []).map(v => String(v || '').trim()).filter(Boolean).slice(0, 3),
        last: String(raw.last || raw.last_step || '').trim(),
        alternatives: (raw.alternatives || []).map(v => String(v || '').trim()).filter(Boolean).slice(0, 2),
        preconditions: (raw.preconditions || []).map(v => String(v || '').trim()).filter(Boolean).slice(0, 3)
    };
}

function ceflowNormImpact(raw, id) {
    const fallback = CEFLOW_FALLBACKS[id] || CEFLOW_FALLBACKS.meta;
    const stats = raw?.stats || {};
    return {
        stats: {
            flow: ceflowClamp(stats.flow, fallback.impact.stats.flow),
            agency: ceflowClamp(stats.agency, fallback.impact.stats.agency),
            shame: ceflowClamp(stats.shame, fallback.impact.stats.shame)
        },
        xrayTags: Array.isArray(raw?.xrayTags) && raw.xrayTags.length ? raw.xrayTags.slice(0, 3) : [...fallback.impact.xrayTags],
        microOutcome: Array.isArray(raw?.microOutcome) && raw.microOutcome.length ? raw.microOutcome.slice(0, 3) : [...fallback.impact.microOutcome]
    };
}

function ceflowNormChoice(raw, fallbackId) {
    const id = String(raw?.id || fallbackId || '').toLowerCase();
    const f = CEFLOW_FALLBACKS[id] || CEFLOW_FALLBACKS[fallbackId] || CEFLOW_FALLBACKS.meta;
    const replyOptions = Array.isArray(raw?.replyOptions) ? raw.replyOptions.slice(0, 3) : [];
    return {
        id,
        label: String(raw?.label || f.label || '׳×׳’׳•׳‘׳”'),
        tone: String(raw?.tone || f.tone || 'muted'),
        emoji: String(raw?.emoji || f.emoji || 'נ’¬'),
        say: String(raw?.say || ''),
        counterReply: String(raw?.counterReply || f.counterReply || ''),
        replyPrompt: String(raw?.replyPrompt || '׳׳™׳ ׳׳×/׳” ׳¢׳•׳ ׳” ׳¢׳›׳©׳™׳•?'),
        replyOptions: replyOptions.length ? replyOptions : [
            '׳‘׳•׳/׳™ ׳ ׳ ׳©׳•׳ ׳¨׳’׳¢ ׳•׳ ׳’׳“׳™׳¨ ׳¦׳¢׳“ ׳¨׳׳©׳•׳.',
            '׳׳™׳₪׳” ׳‘׳“׳™׳•׳§ ׳ ׳×׳§׳¢׳×?',
            '׳׳” ׳›׳‘׳¨ ׳›׳ ׳¢׳•׳‘׳“, ׳׳₪׳™׳׳• ׳—׳׳§׳™׳×?'
        ],
        interpretation: String(raw?.interpretation || f.interpretation || ''),
        badge: String(raw?.badge || ''),
        sfx: String(raw?.sfx || ''),
        impact: ceflowNormImpact(raw?.impact, id),
        powerQuestions: Array.isArray(raw?.powerQuestions) ? raw.powerQuestions.slice(0, 3).map(v => String(v || '').trim()).filter(Boolean) : [],
        newInfoBubble: String(raw?.newInfoBubble || ''),
        blueprint: ceflowNormBlueprint(raw?.blueprint)
    };
}

function ceflowNormScenario(raw, i) {
    if (!raw || typeof raw !== 'object') return null;
    const map = new Map();
    (raw.choices || []).forEach((choice, idx) => {
        const idHint = CEFLOW_CHOICE_ORDER[idx] || 'meta';
        const norm = ceflowNormChoice(choice, idHint);
        map.set(norm.id, norm);
    });
    CEFLOW_CHOICE_ORDER.forEach(id => {
        if (!map.has(id)) map.set(id, ceflowNormChoice({ id }, id));
    });
    const choices = CEFLOW_CHOICE_ORDER.map(id => map.get(id)).filter(Boolean);
    const meta = choices.find(choice => choice.id === 'meta');
    if (meta && !meta.powerQuestions.length) {
        meta.powerQuestions = ['׳׳” ׳‘׳“׳™׳•׳§ ׳׳ ׳‘׳¨׳•׳¨ ׳›׳¨׳’׳¢?', '׳׳™׳–׳” ׳¦׳¢׳“ ׳¨׳׳©׳•׳ ׳”׳›׳™ ׳§׳˜׳ ׳›׳ ׳׳₪׳©׳¨׳™?', '׳׳™׳–׳” ׳׳™׳“׳¢ ׳—׳¡׳¨ ׳›׳“׳™ ׳׳”׳×׳§׳“׳?'];
    }
    if (meta && !meta.newInfoBubble) {
        meta.newInfoBubble = '׳¢׳›׳©׳™׳• ׳–׳” ׳‘׳¨׳•׳¨ ׳™׳•׳×׳¨: ׳׳₪׳©׳¨ ׳׳”׳×׳—׳™׳ ׳׳¦׳¢׳“ ׳§׳˜׳ ׳‘׳׳§׳•׳ ׳׳”׳™׳×׳§׳¢ ׳¢׳ ׳”׳›׳•׳.';
    }
    return {
        id: String(raw.id || `scene_${i + 1}`),
        domain: String(raw.domain || '׳›׳׳׳™'),
        title: String(raw.title || `׳¡׳¦׳ ׳” ${i + 1}`),
        level: String(raw.level || raw.levelTag || '׳׳•׳“׳׳™׳•׳× + ׳”׳›׳׳׳”'),
        regulationNote: String(raw.regulationNote || '׳׳›׳•׳׳ ׳• ׳™׳© ׳×׳’׳•׳‘׳” ׳¨׳’׳©׳™׳× ׳׳™׳׳₪׳•׳׳¡׳™׳‘׳™׳×. ׳”׳×׳¨׳’׳•׳ ׳›׳׳ ׳”׳•׳ ׳׳–׳”׳•׳× ׳׳•׳×׳”, ׳׳•׳•׳¡׳× ׳¡׳˜׳™׳™׳˜, ׳•׳׳¢׳‘׳•׳¨ ׳׳×׳’׳•׳‘׳” ׳©׳›׳׳™׳× ׳׳‘׳•׳¡׳¡׳× ׳©׳׳׳”.'),
        characters: {
            left: { name: String(raw?.characters?.left?.name || '׳“׳׳•׳× ׳©׳׳׳'), sprite: String(raw?.characters?.left?.sprite || '') },
            right: { name: String(raw?.characters?.right?.name || '׳“׳׳•׳× ׳™׳׳™׳'), sprite: String(raw?.characters?.right?.sprite || '') }
        },
        dialog: (raw.dialog || []).map(item => ({
            speaker: item?.speaker === 'right' ? 'right' : 'left',
            text: String(item?.text || ''),
            highlights: Array.isArray(item?.highlights) ? item.highlights : []
        })).filter(line => line.text),
        choices
    };
}

function ceflowEscRe(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function ceflowMarkToken(text, token, cssClass, label, mode) {
    if (!token) return text;
    const safe = escapeHtml(token);
    const tip = mode === 'learn' ? ` title="${escapeHtml(label)}" data-tip="${escapeHtml(label)}"` : '';
    const re = new RegExp(`(${ceflowEscRe(safe)})`, 'g');
    return text.replace(re, `<span class="ceflow-hl ${cssClass}"${tip}>$1</span>`);
}

function ceflowHighlight(text, explicit, mode) {
    let html = escapeHtml(text || '');
    (explicit || []).forEach(item => {
        const type = String(item?.type || '').toLowerCase();
        const rule = CEFLOW_HL_RULES.find(r => r.type === type);
        if (rule) html = ceflowMarkToken(html, item?.token, rule.css, rule.label, mode);
    });
    CEFLOW_HL_RULES.forEach(rule => {
        rule.tokens.forEach(token => {
            html = ceflowMarkToken(html, token, rule.css, rule.label, mode);
        });
    });
    return html;
}

function ceflowToneClass(tone) {
    const t = String(tone || 'muted').toLowerCase();
    return t === 'danger' ? 'ceflow-tone-danger'
        : t === 'warn' ? 'ceflow-tone-warn'
        : t === 'purple' ? 'ceflow-tone-purple'
        : t === 'good' ? 'ceflow-tone-good'
        : 'ceflow-tone-muted';
}

async function setupComicEngine2() {
    const els = {
        root: document.getElementById('comicEngine'),
        infoBtn: document.getElementById('ceflow-info-btn'),
        floatingNote: document.getElementById('ceflow-floating-note'),
        domain: document.getElementById('ceflow-domain'),
        progress: document.getElementById('ceflow-progress'),
        level: document.getElementById('ceflow-level'),
        title: document.getElementById('ceflow-title'),
        left: document.getElementById('ceflow-left-character'),
        right: document.getElementById('ceflow-right-character'),
        dialog: document.getElementById('ceflow-dialog'),
        overlay: document.getElementById('ceflow-overlay'),
        tags: document.getElementById('ceflow-xray-tags'),
        flow: document.getElementById('ceflow-stat-flow'),
        agency: document.getElementById('ceflow-stat-agency'),
        shame: document.getElementById('ceflow-stat-shame'),
        deck: document.getElementById('ceflow-choice-deck'),
        replyBox: document.getElementById('ceflow-reply-box'),
        replyQuick: document.getElementById('ceflow-reply-quick'),
        replyInput: document.getElementById('ceflow-reply-input'),
        replyConfirm: document.getElementById('ceflow-reply-confirm'),
        replyStatus: document.getElementById('ceflow-reply-status'),
        feedback: document.getElementById('ceflow-feedback'),
        feedbackLeft: document.getElementById('ceflow-feedback-left'),
        feedbackRight: document.getElementById('ceflow-feedback-right'),
        power: document.getElementById('ceflow-power-card'),
        powerQuestions: document.getElementById('ceflow-power-questions'),
        newInfo: document.getElementById('ceflow-new-info'),
        blueprint: document.getElementById('ceflow-blueprint'),
        retry: document.getElementById('ceflow-retry'),
        toggleMode: document.getElementById('ceflow-toggle-mode'),
        openBlueprint: document.getElementById('ceflow-open-blueprint'),
        openBlueprintInner: document.getElementById('ceflow-open-blueprint-inner'),
        next: document.getElementById('ceflow-next-scene')
    };
    if (!els.root || !els.deck || !els.dialog) return;

    let payload = null;
    try {
        const response = await fetch('data/comic-scenarios.json', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        payload = await response.json();
    } catch (error) {
        console.error('Cannot load data/comic-scenarios.json', error);
        els.root.innerHTML = '<p>׳©׳’׳™׳׳” ׳‘׳˜׳¢׳™׳ ׳× ׳¡׳¦׳ ׳•׳× ׳§׳•׳׳™׳§׳¡.</p>';
        return;
    }

    const scenarios = Array.isArray(payload?.scenarios) ? payload.scenarios.map(ceflowNormScenario).filter(Boolean) : [];
    if (!scenarios.length) {
        els.root.innerHTML = '<p>׳׳ ׳ ׳׳¦׳׳• ׳¡׳¦׳ ׳•׳× ׳§׳•׳׳™׳§׳¡ ׳׳”׳¦׳’׳”.</p>';
        return;
    }

    let savedIndex = 0;
    try {
        const saved = JSON.parse(localStorage.getItem(COMIC_ENGINE_STORAGE_KEY) || '{}');
        const idx = Number(saved?.index);
        if (Number.isInteger(idx) && idx >= 0 && idx < scenarios.length) savedIndex = idx;
    } catch (error) {
        savedIndex = 0;
    }

    let savedMode = 'learn';
    try {
        const savedPrefs = JSON.parse(localStorage.getItem(COMIC_ENGINE_PREFS_KEY) || '{}');
        if (savedPrefs?.mode === 'play') savedMode = 'play';
    } catch (error) {
        savedMode = 'learn';
    }

    const state = {
        flowState: CEFLOW_STATES.SCENE_READY,
        mode: savedMode,
        index: savedIndex,
        selectedChoice: null,
        replyDraft: '',
        userReply: '',
        selectedQuestion: '',
        generatedInfo: '',
        floatingTimer: null,
        feedbackTimer: null
    };

    const currentScenario = () => scenarios[state.index];
    const metaChoice = () => (currentScenario()?.choices || []).find(choice => choice.id === 'meta') || null;
    const activeBlueprint = () => state.selectedChoice?.blueprint || metaChoice()?.blueprint || null;
    const compactText = (text, max = 155) => {
        const raw = String(text || '').trim().replace(/\s+/g, ' ');
        if (!raw) return '';
        return raw.length > max ? `${raw.slice(0, max - 1)}...` : raw;
    };
    const hideFloatingNote = () => {
        if (state.floatingTimer) {
            clearTimeout(state.floatingTimer);
            state.floatingTimer = null;
        }
        if (els.floatingNote) {
            els.floatingNote.classList.add('hidden');
            els.floatingNote.classList.remove('is-visible');
            els.floatingNote.textContent = '';
        }
    };
    const showFloatingNote = (text) => {
        if (!els.floatingNote) return;
        hideFloatingNote();
        const msg = compactText(text, 170);
        if (!msg) return;
        els.floatingNote.textContent = msg;
        els.floatingNote.classList.remove('hidden');
        els.floatingNote.classList.add('is-visible');
        state.floatingTimer = window.setTimeout(() => hideFloatingNote(), 6200);
    };
    const hideFeedbackNote = () => {
        if (state.feedbackTimer) {
            clearTimeout(state.feedbackTimer);
            state.feedbackTimer = null;
        }
        const noteEl = els.feedbackRight?.querySelector('.ceflow-feedback-note');
        if (noteEl) {
            noteEl.classList.add('hidden');
            noteEl.textContent = '';
        }
    };
    const showFeedbackNote = (text) => {
        const noteEl = els.feedbackRight?.querySelector('.ceflow-feedback-note');
        if (!noteEl) return;
        hideFeedbackNote();
        const msg = compactText(text, 210);
        if (!msg) return;
        noteEl.textContent = msg;
        noteEl.classList.remove('hidden');
        state.feedbackTimer = window.setTimeout(() => hideFeedbackNote(), 6400);
    };

    const persistMode = () => {
        localStorage.setItem(COMIC_ENGINE_PREFS_KEY, JSON.stringify({ mode: state.mode, updatedAt: new Date().toISOString() }));
    };
    const persistIndex = () => {
        localStorage.setItem(COMIC_ENGINE_STORAGE_KEY, JSON.stringify({ index: state.index, updatedAt: new Date().toISOString() }));
    };

    const speakerName = (line) => line.speaker === 'right' ? currentScenario()?.characters?.right?.name : currentScenario()?.characters?.left?.name;

    const setMode = (mode, persist) => {
        state.mode = mode === 'play' ? 'play' : 'learn';
        els.root.classList.toggle('is-play-mode', state.mode === 'play');
        if (els.toggleMode) {
            els.toggleMode.textContent = state.mode === 'learn' ? 'נ® ׳׳¦׳‘ ׳׳©׳—׳§' : 'נ“ ׳׳¦׳‘ ׳׳™׳׳•׳“';
        }
        if (persist) persistMode();
    };

    const resetRound = () => {
        state.flowState = CEFLOW_STATES.SCENE_READY;
        state.selectedChoice = null;
        state.replyDraft = '';
        state.userReply = '';
        state.selectedQuestion = '';
        state.generatedInfo = '';
        hideFeedbackNote();
        hideFloatingNote();
    };

    const renderCharacters = () => {
        const scenario = currentScenario();
        const draw = (slot, ch) => {
            if (!slot) return;
            const safeName = escapeHtml(ch?.name || '׳“׳׳•׳×');
            const art = ch?.sprite ? `<img src="${escapeHtml(ch.sprite)}" alt="${safeName}" loading="lazy">` : '<div class="ceflow-avatar-fallback">נ™‚</div>';
            slot.innerHTML = `<div class="ceflow-character-inner"><div class="ceflow-character-art">${art}</div><p class="ceflow-character-name">${safeName}</p></div>`;
        };
        draw(els.left, scenario?.characters?.left);
        draw(els.right, scenario?.characters?.right);
    };

    const renderDialog = () => {
        const scenario = currentScenario();
        const lines = [...(scenario?.dialog || [])];
        if (state.selectedChoice) {
            lines.push({ speaker: 'right', text: state.selectedChoice.say, role: 'selected' });
            lines.push({ speaker: 'left', text: state.selectedChoice.counterReply || CEFLOW_FALLBACKS[state.selectedChoice.id]?.counterReply || '', role: 'counter' });
        }
        if (state.userReply) lines.push({ speaker: 'right', text: state.userReply, role: 'reply' });
        if (state.generatedInfo) lines.push({ speaker: 'left', text: state.generatedInfo, role: 'new-info' });

        els.dialog.innerHTML = lines.map((line) => `
            <article class="ceflow-bubble is-${line.speaker === 'right' ? 'right' : 'left'} ${line.role ? `is-${escapeHtml(line.role)}` : ''}">
                <p class="ceflow-bubble-speaker">${escapeHtml(speakerName(line) || '׳“׳׳•׳×')}</p>
                <p class="ceflow-bubble-text">${ceflowHighlight(line.text, line.highlights, state.mode)}</p>
            </article>
        `).join('');
    };

    const renderOverlay = () => {
        if (!state.selectedChoice || !els.overlay) {
            els.overlay?.classList.add('hidden');
            return;
        }
        const impact = state.selectedChoice.impact || {};
        const stats = impact.stats || {};
        if (els.tags) {
            els.tags.innerHTML = (impact.xrayTags || []).map(tag => `<span>${escapeHtml(tag)}</span>`).join('');
        }
        if (els.flow) els.flow.style.width = `${ceflowClamp(stats.flow, 50)}%`;
        if (els.agency) els.agency.style.width = `${ceflowClamp(stats.agency, 50)}%`;
        if (els.shame) els.shame.style.width = `${ceflowClamp(stats.shame, 50)}%`;
        els.overlay.classList.remove('hidden');
    };

    const renderDeck = () => {
        const scenario = currentScenario();
        const locked = state.flowState !== CEFLOW_STATES.SCENE_READY;
        els.deck.innerHTML = (scenario?.choices || []).map(choice => {
            const selected = state.selectedChoice?.id === choice.id;
            const icon = choice.badge ? `<img src="${escapeHtml(choice.badge)}" alt="${escapeHtml(choice.label)}" loading="lazy">` : '';
            return `
                <button type="button" class="ceflow-choice ${ceflowToneClass(choice.tone)}${selected ? ' is-selected' : ''}" data-choice-id="${escapeHtml(choice.id)}" ${locked ? 'disabled' : ''} aria-label="${escapeHtml(choice.label)}">
                    <span class="ceflow-choice-top"><strong>${escapeHtml(choice.emoji)} ${escapeHtml(choice.label)}</strong>${icon}</span>
                    <span class="ceflow-choice-line">${escapeHtml(choice.say)}</span>
                </button>
            `;
        }).join('');
    };

    const renderReply = () => {
        const open = !!state.selectedChoice && !state.userReply;
        els.replyBox?.classList.toggle('hidden', !open);
        if (!open) return;
        if (els.replyQuick) {
            els.replyQuick.innerHTML = (state.selectedChoice.replyOptions || []).map(opt => `<button type="button" class="ceflow-reply-option" data-reply-option="${escapeHtml(opt)}">${escapeHtml(opt)}</button>`).join('');
        }
        if (els.replyInput) els.replyInput.value = state.replyDraft || '';
        if (els.replyStatus) els.replyStatus.textContent = '';
    };

    const renderFeedback = () => {
        const open = !!state.selectedChoice && !!state.userReply;
        els.feedback?.classList.toggle('hidden', !open);
        if (!open) {
            hideFeedbackNote();
            return;
        }
        const choice = state.selectedChoice;
        const leftBadge = choice.badge ? `<img src="${escapeHtml(choice.badge)}" alt="badge" loading="lazy">` : '';
        const leftSfx = choice.sfx ? `<img src="${escapeHtml(choice.sfx)}" alt="sfx" loading="lazy">` : '';
        if (els.feedbackLeft) els.feedbackLeft.innerHTML = `${leftBadge}${leftSfx}`;
        if (els.feedbackRight) {
            const interpretation = compactText(choice.interpretation, 210);
            const regulation = compactText(currentScenario().regulationNote, 220);
            els.feedbackRight.innerHTML = `
                <p><strong>׳׳” ׳׳׳¨׳×:</strong> ${escapeHtml(choice.say)}</p>
                <p><strong>׳׳” ׳§׳¨׳”:</strong></p>
                <div class="ceflow-outcomes">${(choice.impact?.microOutcome || []).map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>
                <div class="ceflow-feedback-actions">
                    <button type="button" class="ceflow-mini-btn" data-feedback-note="${escapeHtml(interpretation)}">נ” ׳₪׳¨׳©׳ ׳•׳×</button>
                    <button type="button" class="ceflow-mini-btn" data-feedback-note="${escapeHtml(regulation)}">נ§  ׳•׳™׳¡׳•׳× ׳¡׳˜׳™׳™׳˜</button>
                </div>
                <div class="ceflow-feedback-note hidden" aria-live="polite"></div>
            `;
        }
    };

    const renderPower = () => {
        const open = state.selectedChoice?.id === 'meta' && !!state.userReply && (state.flowState === CEFLOW_STATES.POWER_CARD || state.flowState === CEFLOW_STATES.BLUEPRINT_OPEN);
        els.power?.classList.toggle('hidden', !open);
        if (!open) return;
        if (els.powerQuestions) {
            els.powerQuestions.innerHTML = (state.selectedChoice.powerQuestions || []).map(q => `<button type="button" class="ceflow-power-question${state.selectedQuestion === q ? ' is-active' : ''}" data-power-question="${escapeHtml(q)}">${escapeHtml(q)}</button>`).join('');
        }
        if (els.newInfo) {
            const hasInfo = !!state.generatedInfo;
            els.newInfo.classList.toggle('hidden', !hasInfo);
            els.newInfo.innerHTML = hasInfo
                ? `<p><strong>׳©׳׳׳”:</strong> ${escapeHtml(state.selectedQuestion)}</p><p><strong>׳׳™׳“׳¢ ׳—׳“׳©:</strong> ${escapeHtml(state.generatedInfo)}</p>`
                : '';
        }
    };

    const renderBlueprint = () => {
        const bp = activeBlueprint();
        const open = state.flowState === CEFLOW_STATES.BLUEPRINT_OPEN && !!bp;
        els.blueprint?.classList.toggle('hidden', !open);
        if (!open || !els.blueprint) return;
        const middle = bp.middle || [];
        const alternatives = bp.alternatives || [];
        const preconditions = bp.preconditions || [];
        els.blueprint.innerHTML = `
            <h4>Blueprint ׳§׳¦׳¨</h4>
            <div class="ceflow-blueprint-grid">
                <article class="ceflow-blueprint-step"><h5>נ¯ ׳׳˜׳¨׳”</h5><p>${escapeHtml(bp.goal || '׳׳ ׳”׳•׳’׳“׳¨')}</p></article>
                <article class="ceflow-blueprint-step"><h5>נ¢ ׳¦׳¢׳“ ׳¨׳׳©׳•׳</h5><p>${escapeHtml(bp.first || '׳׳ ׳”׳•׳’׳“׳¨')}</p></article>
                <article class="ceflow-blueprint-step"><h5>נ” ׳©׳׳‘׳™ ׳‘׳™׳ ׳™׳™׳</h5><p>${escapeHtml(middle.join(' | ') || '׳¢׳“ 3 ׳©׳׳‘׳™׳ ׳‘׳¨׳•׳¨׳™׳')}</p></article>
                <article class="ceflow-blueprint-step"><h5>ג… ׳¦׳¢׳“ ׳׳—׳¨׳•׳</h5><p>${escapeHtml(bp.last || '׳׳ ׳”׳•׳’׳“׳¨')}</p></article>
                <article class="ceflow-blueprint-step"><h5>נ§° ׳—׳׳•׳₪׳•׳×</h5><p>${escapeHtml(alternatives.join(' | ') || '׳׳™׳ ׳—׳׳•׳₪׳•׳×')}</p></article>
            </div>
            <p class="ceflow-blueprint-footnote"><strong>Preconditions:</strong> ${escapeHtml(preconditions.join(' | ') || '׳׳™׳ ׳×׳ ׳׳™׳ ׳׳™׳•׳—׳“׳™׳')}</p>
        `;
    };

    const renderControls = () => {
        if (els.retry) els.retry.disabled = !state.selectedChoice;
        if (els.next) els.next.disabled = !state.userReply;
        const showBlueprint = !!activeBlueprint() && !!state.userReply;
        els.openBlueprint?.classList.toggle('hidden', !showBlueprint);
    };

    const renderHeader = () => {
        const scenario = currentScenario();
        if (els.domain) els.domain.textContent = `׳×׳—׳•׳: ${scenario.domain}`;
        if (els.progress) els.progress.textContent = `׳¡׳¦׳ ׳” ${state.index + 1}/${scenarios.length}`;
        if (els.level) els.level.textContent = `׳¨׳׳”: ${scenario.level}`;
        if (els.title) els.title.textContent = scenario.title;
        renderGlobalComicStrip('comic-engine', scenario);
    };

    const render = () => {
        renderHeader();
        renderCharacters();
        renderDialog();
        renderOverlay();
        renderDeck();
        renderReply();
        renderFeedback();
        renderPower();
        renderBlueprint();
        renderControls();
        setMode(state.mode, false);
    };

    const choose = (choiceId) => {
        if (state.flowState !== CEFLOW_STATES.SCENE_READY) return;
        const choice = (currentScenario()?.choices || []).find(item => item.id === choiceId);
        if (!choice) return;
        state.selectedChoice = choice;
        state.replyDraft = choice.replyOptions?.[0] || '';
        state.flowState = CEFLOW_STATES.CHOICE_REVEALED;
        state.userReply = '';
        state.selectedQuestion = '';
        state.generatedInfo = '';
        playUISound(choice.id === 'meta' ? 'correct' : 'next');
        render();
        els.replyInput?.focus();
    };

    const confirmReply = () => {
        const text = String(els.replyInput?.value || '').trim();
        if (!text) {
            if (els.replyStatus) els.replyStatus.textContent = '׳›׳×׳‘׳• ׳×׳’׳•׳‘׳” ׳§׳¦׳¨׳” ׳׳₪׳ ׳™ ׳₪׳¨׳©׳ ׳•׳×.';
            return;
        }
        state.userReply = text;
        state.replyDraft = text;
        if (state.selectedChoice?.id === 'meta') {
            state.selectedQuestion = state.selectedChoice.powerQuestions?.[0] || '';
            state.generatedInfo = state.selectedChoice.newInfoBubble || '׳”׳©׳׳׳” ׳₪׳×׳—׳” ׳׳™׳“׳¢ ׳—׳“׳©, ׳•׳׳₪׳©׳¨ ׳׳”׳×׳§׳“׳ ׳׳¦׳¢׳“ ׳¨׳׳©׳•׳.';
            state.flowState = CEFLOW_STATES.POWER_CARD;
        }
        playUISound('finish');
        render();
    };

    const openBlueprint = () => {
        if (!activeBlueprint()) return;
        state.flowState = CEFLOW_STATES.BLUEPRINT_OPEN;
        render();
    };

    const retry = () => {
        resetRound();
        render();
    };

    const nextScene = () => {
        if (!state.userReply) return;
        hideFloatingNote();
        hideFeedbackNote();
        state.flowState = CEFLOW_STATES.NEXT_SCENE;
        els.root.classList.add('ceflow-scene-leave');
        setTimeout(() => {
            state.index = (state.index + 1) % scenarios.length;
            persistIndex();
            resetRound();
            render();
            els.root.classList.remove('ceflow-scene-leave');
            els.root.classList.add('ceflow-scene-enter');
            setTimeout(() => els.root.classList.remove('ceflow-scene-enter'), 190);
        }, 130);
    };

    els.deck?.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-choice-id]');
        if (!button) return;
        choose(button.getAttribute('data-choice-id'));
    });
    els.infoBtn?.addEventListener('click', () => {
        if (!els.floatingNote) return;
        if (!els.floatingNote.classList.contains('hidden')) {
            hideFloatingNote();
            return;
        }
        showFloatingNote(currentScenario()?.regulationNote || '׳׳›׳•׳׳ ׳• ׳™׳© ׳×׳’׳•׳‘׳” ׳׳™׳׳₪׳•׳׳¡׳™׳‘׳™׳× ׳¨׳׳©׳•׳ ׳”. ׳›׳׳ ׳¢׳•׳¦׳¨׳™׳ ׳¨׳’׳¢, ׳׳•׳•׳¡׳×׳™׳ ׳¡׳˜׳™׳™׳˜, ׳•׳¢׳•׳‘׳¨׳™׳ ׳׳©׳׳׳” ׳׳“׳•׳™׳§׳×.');
    });
    els.replyQuick?.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-reply-option]');
        if (!button || !els.replyInput) return;
        const value = button.getAttribute('data-reply-option') || '';
        state.replyDraft = value;
        els.replyInput.value = value;
        els.replyInput.focus();
    });
    els.replyInput?.addEventListener('input', () => {
        state.replyDraft = String(els.replyInput.value || '');
    });
    els.replyConfirm?.addEventListener('click', confirmReply);
    els.powerQuestions?.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-power-question]');
        if (!button || !state.selectedChoice) return;
        state.selectedQuestion = button.getAttribute('data-power-question') || '';
        state.generatedInfo = state.selectedChoice.newInfoBubble || '׳ ׳₪׳×׳— ׳׳™׳“׳¢ ׳—׳“׳© ׳©׳׳₪׳©׳¨ ׳׳¢׳‘׳•׳“ ׳׳™׳×׳•.';
        state.flowState = CEFLOW_STATES.POWER_CARD;
        render();
    });
    els.feedbackRight?.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-feedback-note]');
        if (!button) return;
        showFeedbackNote(button.getAttribute('data-feedback-note') || '');
    });
    els.retry?.addEventListener('click', retry);
    els.next?.addEventListener('click', nextScene);
    els.openBlueprint?.addEventListener('click', openBlueprint);
    els.openBlueprintInner?.addEventListener('click', openBlueprint);
    els.toggleMode?.addEventListener('click', () => {
        state.mode = state.mode === 'learn' ? 'play' : 'learn';
        setMode(state.mode, true);
        render();
    });

    setMode(state.mode, false);
    render();
}

// ==================== WRINKLE REVEAL FLOW (OVERRIDE) ===================

const WR2_STORAGE_KEY = 'wrinkle_reveal_v2';

const WR2_SEED_SCENES = Object.freeze([
    Object.freeze({
        id: 'wr2_seed_1',
        anchor: '׳׳ ׳™ ׳׳ ׳™׳›׳•׳',
        visibleSentence: '׳׳ ׳™ ׳׳ ׳™׳›׳•׳ ׳׳”׳¡׳‘׳™׳¨ ׳׳” ׳׳” ׳׳ ׳™ ׳¨׳•׳¦׳”',
        template: '׳׳ ׳™ ׳׳ ׳™׳›׳•׳ {Q} ׳׳”׳¡׳‘׳™׳¨ ׳׳” ׳׳” ׳׳ ׳™ ׳¨׳•׳¦׳”',
        quantifiers: Object.freeze(['׳׳£ ׳₪׳¢׳', '׳‘׳©׳•׳ ׳׳¦׳‘ ׳¨׳’׳©׳™', '׳‘׳©׳•׳ ׳¡׳™׳˜׳•׳׳¦׳™׳”', '׳‘׳©׳•׳ ׳¦׳•׳¨׳”']),
        transformedSentence: '׳׳₪׳¢׳׳™׳ ׳§׳©׳” ׳׳™ ׳׳”׳¡׳‘׳™׳¨ ׳׳” ׳׳” ׳׳ ׳™ ׳¨׳•׳¦׳”.'
    }),
    Object.freeze({
        id: 'wr2_seed_2',
        anchor: '׳׳ ׳™ ׳—׳™׳™׳‘',
        visibleSentence: '׳׳ ׳™ ׳—׳™׳™׳‘ ׳׳”׳¡׳₪׳™׳§ ׳”׳›׳ ׳”׳™׳•׳',
        template: '׳׳ ׳™ ׳—׳™׳™׳‘ {Q} ׳׳”׳¡׳₪׳™׳§ ׳”׳›׳ ׳”׳™׳•׳',
        quantifiers: Object.freeze(['׳‘׳›׳ ׳×׳ ׳׳™', '׳‘׳׳™ ׳׳ ׳©׳•׳', '׳’׳ ׳›׳©׳׳ ׳™ ׳׳•׳×׳©', '׳׳ ׳׳©׳ ׳” ׳׳” ׳”׳׳—׳™׳¨']),
        transformedSentence: '׳׳ ׳™ ׳‘׳•׳—׳¨ ׳׳”׳×׳׳§׳“ ׳‘׳׳” ׳©׳—׳©׳•׳‘ ׳”׳™׳•׳, ׳¦׳¢׳“ ׳׳—׳“ ׳‘׳›׳ ׳₪׳¢׳.'
    }),
    Object.freeze({
        id: 'wr2_seed_3',
        anchor: '׳׳™ ׳׳₪׳©׳¨',
        visibleSentence: '׳׳™ ׳׳₪׳©׳¨ ׳׳“׳‘׳¨ ׳׳™׳×׳•',
        template: '׳׳™ ׳׳₪׳©׳¨ {Q} ׳׳“׳‘׳¨ ׳׳™׳×׳•',
        quantifiers: Object.freeze(['׳‘׳©׳•׳ ׳׳¦׳‘', '׳¢׳ ׳׳£ ׳׳—׳“', '׳‘׳©׳•׳ ׳¦׳•׳¨׳”', '׳‘׳›׳ ׳¡׳™׳˜׳•׳׳¦׳™׳”']),
        transformedSentence: '׳›׳¨׳’׳¢ ׳§׳©׳” ׳׳“׳‘׳¨ ׳׳™׳×׳•, ׳•׳׳₪׳©׳¨ ׳׳—׳₪׳© ׳“׳¨׳ ׳׳“׳•׳™׳§׳× ׳׳©׳™׳—׳”.'
    }),
    Object.freeze({
        id: 'wr2_seed_4',
        anchor: '׳×׳׳™׳“',
        visibleSentence: '׳×׳׳™׳“ ׳׳ ׳™ ׳ ׳×׳§׳¢ ׳›׳©׳¦׳¨׳™׳ ׳׳“׳‘׳¨ ׳׳•׳ ׳׳ ׳©׳™׳',
        template: '׳×׳׳™׳“ {Q} ׳׳ ׳™ ׳ ׳×׳§׳¢ ׳›׳©׳¦׳¨׳™׳ ׳׳“׳‘׳¨ ׳׳•׳ ׳׳ ׳©׳™׳',
        quantifiers: Object.freeze(['׳׳׳ ׳™׳•׳¦׳ ׳“׳•׳₪׳', '׳‘׳›׳ ׳׳§׳•׳', '׳¢׳ ׳›׳•׳׳', '׳‘׳›׳ ׳¨׳׳× ׳׳—׳¥']),
        transformedSentence: '׳׳₪׳¢׳׳™׳ ׳׳ ׳™ ׳ ׳×׳§׳¢ ׳׳•׳ ׳׳ ׳©׳™׳, ׳•׳׳₪׳©׳¨ ׳׳”׳×׳׳׳ ׳›׳“׳™ ׳׳”׳©׳×׳₪׳¨.'
    })
]);

function wr2TrimText(value, maxLen = 180) {
    const clean = String(value || '').replace(/\s+/g, ' ').trim();
    if (!clean) return '';
    return clean.length > maxLen ? `${clean.slice(0, maxLen - 1)}...` : clean;
}

function wr2DetectAnchor(sentence) {
    const s = String(sentence || '');
    const anchors = ['׳׳ ׳™׳›׳•׳', '׳׳™ ׳׳₪׳©׳¨', '׳—׳™׳™׳‘', '׳¦׳¨׳™׳', '׳׳•׳›׳¨׳—', '׳×׳׳™׳“', '׳›׳•׳׳', '׳׳£ ׳₪׳¢׳', '׳׳™׳ ׳‘׳¨׳™׳¨׳”'];
    for (let i = 0; i < anchors.length; i += 1) {
        const token = anchors[i];
        if (s.includes(token)) return token;
    }
    return '׳”׳׳©׳₪׳˜';
}

function wr2BuildTemplate(sentence) {
    const raw = String(sentence || '').trim();
    if (!raw) return '{Q}';
    const anchor = wr2DetectAnchor(raw);
    if (!anchor || anchor === '׳”׳׳©׳₪׳˜') return `${raw} {Q}`;
    const idx = raw.indexOf(anchor);
    if (idx < 0) return `${raw} {Q}`;
    const left = raw.slice(0, idx + anchor.length).trimEnd();
    const right = raw.slice(idx + anchor.length).trimStart();
    return `${left} {Q}${right ? ` ${right}` : ''}`;
}

function wr2InferQuantifiers(sentence) {
    const normalized = normalizeText(sentence || '');
    if (/(׳׳ ׳™׳›׳•׳|׳׳™ ׳׳₪׳©׳¨|׳‘׳׳×׳™ ׳׳₪׳©׳¨׳™|׳׳™׳ ׳¡׳™׳›׳•׳™)/.test(normalized)) {
        return ['׳׳£ ׳₪׳¢׳', '׳‘׳©׳•׳ ׳׳¦׳‘ ׳¨׳’׳©׳™', '׳‘׳©׳•׳ ׳¡׳™׳˜׳•׳׳¦׳™׳”', '׳‘׳©׳•׳ ׳¦׳•׳¨׳”'];
    }
    if (/(׳×׳׳™׳“|׳›׳ ׳”׳–׳׳|׳׳£ ׳₪׳¢׳|׳›׳•׳׳|׳׳£ ׳׳—׳“)/.test(normalized)) {
        return ['׳‘׳›׳ ׳׳¦׳‘', '׳׳׳ ׳™׳•׳¦׳ ׳“׳•׳₪׳', '׳¢׳ ׳›׳•׳׳', '׳‘׳›׳ ׳–׳׳'];
    }
    if (/(׳—׳™׳™׳‘|׳¦׳¨׳™׳|׳׳™׳ ׳‘׳¨׳™׳¨׳”|׳׳•׳›׳¨׳—)/.test(normalized)) {
        return ['׳‘׳›׳ ׳×׳ ׳׳™', '׳׳׳ ׳‘׳—׳™׳¨׳”', '׳’׳ ׳›׳©׳׳ ׳™ ׳¢׳™׳™׳£', '׳׳ ׳׳©׳ ׳” ׳׳”'];
    }
    return ['׳‘׳©׳•׳ ׳׳¦׳‘', '׳‘׳›׳ ׳×׳ ׳׳™', '׳‘׳©׳•׳ ׳¦׳•׳¨׳”'];
}

function wr2SoftenSentence(sentence) {
    let text = String(sentence || '').trim();
    if (!text) return '';
    text = text.replace(/׳׳ ׳™ ׳׳ ׳™׳›׳•׳/g, '׳׳₪׳¢׳׳™׳ ׳§׳©׳” ׳׳™');
    text = text.replace(/׳׳™ ׳׳₪׳©׳¨/g, '׳›׳¨׳’׳¢ ׳–׳” ׳׳׳×׳’׳¨');
    text = text.replace(/׳×׳׳™׳“/g, '׳׳₪׳¢׳׳™׳');
    text = text.replace(/׳׳£ ׳₪׳¢׳/g, '׳׳₪׳¢׳׳™׳');
    text = text.replace(/׳›׳•׳׳/g, '׳—׳׳§ ׳׳”׳׳ ׳©׳™׳');
    text = text.replace(/׳׳™׳ ׳‘׳¨׳™׳¨׳”/g, '׳™׳© ׳׳™ ׳›׳׳” ׳׳₪׳©׳¨׳•׳™׳•׳×');
    text = text.replace(/׳—׳™׳™׳‘/g, '׳׳¢׳“׳™׳£');
    if (!/[.!?]$/.test(text)) text += '.';
    return text;
}

function wr2NormalizeScene(raw, idxPrefix = 'wr2_custom') {
    if (!raw || typeof raw !== 'object') return null;
    const visibleSentence = wr2TrimText(raw.visibleSentence || raw.statement, 160);
    if (!visibleSentence) return null;
    const quantifiers = (Array.isArray(raw.quantifiers) ? raw.quantifiers : [])
        .map(value => wr2TrimText(value, 34))
        .filter(Boolean)
        .slice(0, 4);
    const inferred = quantifiers.length ? quantifiers : wr2InferQuantifiers(visibleSentence);
    return {
        id: String(raw.id || `${idxPrefix}_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`),
        source: raw.source === 'self' ? 'self' : 'seed',
        anchor: wr2TrimText(raw.anchor || wr2DetectAnchor(visibleSentence), 30),
        visibleSentence,
        template: wr2TrimText(raw.template || wr2BuildTemplate(visibleSentence), 220),
        quantifiers: [...new Set(inferred)].slice(0, 4),
        transformedSentence: wr2TrimText(raw.transformedSentence || wr2SoftenSentence(visibleSentence), 190),
        createdAt: Number(raw.createdAt) || Date.now()
    };
}

function wr2OverlayHtml(template, activeQuantifier) {
    const parts = String(template || '').split('{Q}');
    const q = activeQuantifier ? `[${activeQuantifier}]` : '[???]';
    const qHtml = `<span class="wr2-q-inline">${escapeHtml(q)}</span>`;
    if (parts.length < 2) return `${escapeHtml(template || '')} ${qHtml}`.trim();
    return `${escapeHtml(parts[0])}${qHtml}${escapeHtml(parts.slice(1).join('{Q}'))}`;
}

function wr2TriggerFx(layer, strong = false) {
    if (!layer) return;
    layer.innerHTML = '';
    const glyphs = strong ? ['ג¨', 'נ‰', 'נ’¥', 'ג…'] : ['ג¨', 'נ”', 'נ§©'];
    const count = strong ? 14 : 7;
    for (let i = 0; i < count; i += 1) {
        const star = document.createElement('span');
        star.className = 'wr2-fx-star';
        star.textContent = glyphs[i % glyphs.length];
        star.style.left = `${12 + Math.random() * 76}%`;
        star.style.top = `${30 + Math.random() * 42}%`;
        star.style.setProperty('--x', `${Math.round((Math.random() - 0.5) * 120)}px`);
        layer.appendChild(star);
    }
    setTimeout(() => {
        if (!layer) return;
        layer.innerHTML = '';
    }, strong ? 820 : 620);
}

function setupWrinkleGame() {
    const root = document.getElementById('wrinkle-game');
    if (!root) return;

    if (!document.getElementById('wr2-quantifiers')) {
        root.className = 'card wrinkle-reveal-card';
        root.innerHTML = `
            <div class="wr2-topbar">
                <span class="wr2-top-icon">נ•µן¸ג€ג™‚ן¸</span>
                <h3>׳—׳©׳•׳£ ׳׳× ׳”׳›׳׳×!</h3>
                <div class="wr2-score">
                    <span>נ”¥ <strong id="wr2-streak">0</strong></span>
                    <span>ג­ <strong id="wr2-points">0</strong></span>
                </div>
            </div>
            <div class="wr2-headline">
                <h4>׳”׳׳©׳₪׳˜ ׳ ׳©׳׳¢ ׳×׳׳™׳...</h4>
                <p>׳׳‘׳ ׳”׳‘׳¢׳™׳” ׳”׳׳׳™׳×׳™׳× ׳׳¡׳×׳×׳¨׳× ׳›׳׳ נ‘‡</p>
            </div>
            <section class="wr2-plain-box">
                <p id="wr2-visible-sentence" class="wr2-visible-sentence"></p>
                <small>׳›׳ ׳–׳” ׳ ׳©׳׳¢</small>
            </section>
            <section class="wr2-detect-zone">
                <p class="wr2-zone-title">׳›׳׳×׳™׳ ׳¡׳׳•׳™׳™׳</p>
                <div id="wr2-quantifiers" class="wr2-quantifiers" role="group" aria-label="׳›׳׳×׳™׳ ׳¡׳׳•׳™׳™׳"></div>
                <div class="wr2-overlay-box">
                    <p id="wr2-overlay-sentence" class="wr2-overlay-sentence"></p>
                    <p id="wr2-explain-line" class="wr2-explain-line">׳׳—׳¥/׳™ ׳¢׳ ׳›׳׳× ׳׳“׳•׳ ׳›׳“׳™ ׳׳—׳©׳•׳£ ׳˜׳•׳˜׳׳׳™׳•׳× ׳¡׳׳•׳™׳”.</p>
                </div>
                <p id="wr2-progress" class="wr2-progress">0 ׳׳×׳•׳ 0 ׳›׳׳×׳™׳ ׳—׳©׳•׳₪׳™׳</p>
            </section>
            <section id="wr2-release" class="wr2-release hidden">
                <p>׳”׳‘׳¢׳™׳” ׳׳™׳ ׳” ׳‘׳׳™׳׳™׳ "׳׳ ׳™ ׳׳ ׳™׳›׳•׳". ׳”׳‘׳¢׳™׳” ׳”׳™׳ ׳‘׳”׳›׳׳׳•׳× ׳ ׳¡׳×׳¨׳•׳× ׳©׳™׳•׳¦׳¨׳•׳× ׳×׳—׳•׳©׳× "׳׳™׳ ׳׳•׳¦׳".</p>
                <button id="wr2-unlock-btn" class="btn btn-primary wr2-unlock-btn" type="button">׳—׳©׳₪׳×׳™ ׳׳× ׳›׳ ׳”׳›׳׳×׳™׳! נ‰</button>
            </section>
            <section id="wr2-transform-zone" class="wr2-transform-zone hidden">
                <button id="wr2-transform-btn" class="btn btn-primary wr2-transform-btn" type="button">׳”׳¡׳¨ ׳”׳›׳׳׳” ׳˜׳•׳˜׳׳׳™׳×</button>
                <div id="wr2-transformed" class="wr2-transformed hidden" aria-live="polite">
                    <p class="wr2-transformed-label">׳ ׳™׳¡׳•׳— ׳׳©׳•׳—׳¨׳¨:</p>
                    <p id="wr2-transformed-text" class="wr2-transformed-text"></p>
                </div>
            </section>
            <div class="wr2-actions">
                <button id="wr2-next-btn" class="btn btn-secondary" type="button">׳׳©׳₪׳˜ ׳”׳‘׳</button>
                <button id="wr2-self-toggle" class="btn btn-secondary" type="button">+ ׳׳©׳₪׳˜ ׳׳™׳©׳™</button>
            </div>
            <section id="wr2-self-panel" class="wr2-self-panel hidden">
                <label for="wr2-self-input">Self-Reference (׳׳•׳₪׳¦׳™׳•׳ ׳׳™)</label>
                <textarea id="wr2-self-input" rows="2" placeholder="׳׳“׳•׳’׳׳”: ׳׳ ׳™ ׳׳ ׳™׳›׳•׳ ׳׳”׳¡׳‘׳™׳¨ ׳׳” ׳׳” ׳׳ ׳™ ׳¨׳•׳¦׳”."></textarea>
                <button id="wr2-self-add" class="btn btn-secondary" type="button">׳”׳•׳¡׳£ ׳׳×׳¨׳’׳•׳</button>
                <ul id="wr2-self-list" class="wr2-self-list"></ul>
            </section>
            <div id="wr2-fx-layer" class="wr2-fx-layer" aria-hidden="true"></div>
        `;
    }

    const els = {
        streak: document.getElementById('wr2-streak'),
        points: document.getElementById('wr2-points'),
        visibleSentence: document.getElementById('wr2-visible-sentence'),
        quantifiers: document.getElementById('wr2-quantifiers'),
        overlaySentence: document.getElementById('wr2-overlay-sentence'),
        explainLine: document.getElementById('wr2-explain-line'),
        progress: document.getElementById('wr2-progress'),
        release: document.getElementById('wr2-release'),
        unlockBtn: document.getElementById('wr2-unlock-btn'),
        transformZone: document.getElementById('wr2-transform-zone'),
        transformBtn: document.getElementById('wr2-transform-btn'),
        transformed: document.getElementById('wr2-transformed'),
        transformedText: document.getElementById('wr2-transformed-text'),
        nextBtn: document.getElementById('wr2-next-btn'),
        selfToggle: document.getElementById('wr2-self-toggle'),
        selfPanel: document.getElementById('wr2-self-panel'),
        selfInput: document.getElementById('wr2-self-input'),
        selfAdd: document.getElementById('wr2-self-add'),
        selfList: document.getElementById('wr2-self-list'),
        fxLayer: document.getElementById('wr2-fx-layer')
    };

    if (!els.quantifiers || !els.visibleSentence || !els.overlaySentence) return;

    let saved = {};
    try {
        saved = JSON.parse(localStorage.getItem(WR2_STORAGE_KEY) || '{}') || {};
    } catch (error) {
        saved = {};
    }

    const customScenes = (Array.isArray(saved.customScenes) ? saved.customScenes : [])
        .map((item, i) => wr2NormalizeScene(item, `wr2_saved_${i}`))
        .filter(Boolean)
        .slice(0, 12);

    const state = {
        seedScenes: WR2_SEED_SCENES.map((item, i) => wr2NormalizeScene(item, `wr2_seed_${i}`)).filter(Boolean),
        customScenes,
        index: Math.max(0, Math.floor(Number(saved.index) || 0)),
        streak: Math.max(0, Math.floor(Number(saved.streak) || 0)),
        points: Math.max(0, Math.floor(Number(saved.points) || 0)),
        revealed: [],
        activeQuantifier: '',
        unlocked: false,
        transformed: false
    };

    const allScenes = () => [...state.seedScenes, ...state.customScenes];
    const currentScene = () => {
        const scenes = allScenes();
        if (!scenes.length) return null;
        if (state.index >= scenes.length) state.index = 0;
        return scenes[state.index];
    };
    const allRevealed = () => {
        const scene = currentScene();
        if (!scene) return false;
        return state.revealed.length >= scene.quantifiers.length;
    };
    const persist = () => {
        localStorage.setItem(WR2_STORAGE_KEY, JSON.stringify({
            index: state.index,
            streak: state.streak,
            points: state.points,
            customScenes: state.customScenes
        }));
    };
    const resetRound = () => {
        state.revealed = [];
        state.activeQuantifier = '';
        state.unlocked = false;
        state.transformed = false;
    };
    const renderSelfList = () => {
        if (!els.selfList) return;
        els.selfList.innerHTML = '';
        const rows = [...state.customScenes]
            .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0))
            .slice(0, 5);
        if (!rows.length) return;
        rows.forEach((scene) => {
            const item = document.createElement('li');
            item.textContent = `ג€${scene.visibleSentence}ג€`;
            els.selfList.appendChild(item);
        });
    };
    const render = () => {
        const scene = currentScene();
        if (!scene) {
            root.innerHTML = '<p>׳׳™׳ ׳›׳¨׳’׳¢ ׳׳©׳₪׳˜׳™׳ ׳׳×׳¨׳’׳•׳.</p>';
            return;
        }

        if (els.streak) els.streak.textContent = String(state.streak);
        if (els.points) els.points.textContent = String(state.points);
        if (els.visibleSentence) els.visibleSentence.textContent = scene.visibleSentence;
        if (els.overlaySentence) {
            els.overlaySentence.innerHTML = wr2OverlayHtml(scene.template, state.activeQuantifier);
            els.overlaySentence.classList.toggle('is-active', Boolean(state.activeQuantifier));
        }
        if (els.explainLine) {
            els.explainLine.textContent = state.activeQuantifier
                ? `׳–׳” ׳׳ ׳‘׳”׳›׳¨׳— "${scene.anchor}". ׳–׳” "${state.activeQuantifier}".`
                : '׳׳—׳¥/׳™ ׳¢׳ ׳›׳׳× ׳׳“׳•׳ ׳›׳“׳™ ׳׳—׳©׳•׳£ ׳˜׳•׳˜׳׳׳™׳•׳× ׳¡׳׳•׳™׳”.';
        }

        const qSet = new Set(state.revealed);
        if (els.quantifiers) {
            els.quantifiers.innerHTML = scene.quantifiers.map((q) => {
                const active = state.activeQuantifier === q;
                const seen = qSet.has(q);
                return `<button type="button" class="wr2-quantifier${active ? ' is-active' : ''}${seen ? ' is-revealed' : ''}" data-q="${escapeHtml(q)}" aria-label="׳—׳©׳•׳£ ${escapeHtml(q)}">[${escapeHtml(q)}]</button>`;
            }).join('');
        }

        if (els.progress) {
            els.progress.textContent = `${state.revealed.length} ׳׳×׳•׳ ${scene.quantifiers.length} ׳›׳׳×׳™׳ ׳—׳©׳•׳₪׳™׳`;
        }

        const revealedAll = allRevealed();
        els.release?.classList.toggle('hidden', !revealedAll);
        if (els.unlockBtn) {
            els.unlockBtn.disabled = !revealedAll || state.unlocked;
            els.unlockBtn.textContent = state.unlocked
                ? '׳׳¢׳•׳׳”, ׳ ׳¢׳‘׳•׳¨ ׳׳˜׳¨׳ ׳¡׳₪׳•׳¨׳׳¦׳™׳” ג…'
                : '׳—׳©׳₪׳×׳™ ׳׳× ׳›׳ ׳”׳›׳׳×׳™׳! נ‰';
        }

        const showTransform = state.unlocked || state.transformed;
        els.transformZone?.classList.toggle('hidden', !showTransform);
        els.transformed?.classList.toggle('hidden', !state.transformed);
        if (els.transformedText) {
            els.transformedText.textContent = state.transformed ? scene.transformedSentence : '';
        }
    };
    const revealQuantifier = (value) => {
        const scene = currentScene();
        if (!scene || !scene.quantifiers.includes(value)) return;
        state.activeQuantifier = value;
        if (!state.revealed.includes(value)) {
            state.revealed.push(value);
            state.points += 2;
            playUISound('next');
            wr2TriggerFx(els.fxLayer, false);
            persist();
        }
        if (allRevealed()) playUISound('correct');
        render();
    };
    const unlock = () => {
        if (!allRevealed()) return;
        if (!state.unlocked) {
            state.unlocked = true;
            playUISound('finish');
            wr2TriggerFx(els.fxLayer, true);
            persist();
        }
        render();
    };
    const transform = () => {
        const scene = currentScene();
        if (!scene || !state.unlocked || state.transformed) return;
        state.transformed = true;
        state.streak += 1;
        state.points += scene.source === 'self' ? 14 : 10;
        addXP(scene.source === 'self' ? 12 : 10);
        if (state.streak > 0 && state.streak % 3 === 0) addStars(1);
        playUISound('correct');
        wr2TriggerFx(els.fxLayer, true);
        persist();
        render();
    };
    const nextScene = () => {
        const scenes = allScenes();
        if (!scenes.length) return;
        state.index = (state.index + 1) % scenes.length;
        resetRound();
        persist();
        render();
    };
    const addSelfSentence = () => {
        const input = String(els.selfInput?.value || '').trim();
        if (input.length < 8) {
            if (els.explainLine) els.explainLine.textContent = '׳›׳×׳‘׳• ׳׳©׳₪׳˜ ׳׳™׳©׳™ ׳§׳¦׳¨ (׳׳₪׳—׳•׳× 8 ׳×׳•׳•׳™׳).';
            return;
        }
        const normalized = normalizeText(input).replace(/\s+/g, ' ').trim();
        const exists = state.customScenes.some(scene => normalizeText(scene.visibleSentence).replace(/\s+/g, ' ').trim() === normalized);
        if (exists) {
            if (els.explainLine) els.explainLine.textContent = '׳”׳׳©׳₪׳˜ ׳”׳–׳” ׳›׳‘׳¨ ׳§׳™׳™׳ ׳‘׳×׳¨׳’׳•׳.';
            return;
        }
        const scene = wr2NormalizeScene({
            id: `wr2_self_${Date.now()}`,
            source: 'self',
            visibleSentence: input,
            anchor: wr2DetectAnchor(input),
            template: wr2BuildTemplate(input),
            quantifiers: wr2InferQuantifiers(input),
            transformedSentence: wr2SoftenSentence(input),
            createdAt: Date.now()
        });
        if (!scene) return;
        state.customScenes.unshift(scene);
        if (state.customScenes.length > 12) state.customScenes = state.customScenes.slice(0, 12);
        state.index = allScenes().findIndex(item => item.id === scene.id);
        if (state.index < 0) state.index = 0;
        if (els.selfInput) els.selfInput.value = '';
        resetRound();
        persist();
        renderSelfList();
        render();
        playUISound('start');
    };

    els.quantifiers.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-q]');
        if (!button) return;
        revealQuantifier(button.getAttribute('data-q') || '');
    });
    els.unlockBtn?.addEventListener('click', unlock);
    els.transformBtn?.addEventListener('click', transform);
    els.nextBtn?.addEventListener('click', nextScene);
    els.selfToggle?.addEventListener('click', () => {
        els.selfPanel?.classList.toggle('hidden');
    });
    els.selfAdd?.addEventListener('click', addSelfSentence);

    renderSelfList();
    resetRound();
    render();
}

// ==================== WR2 SQHCEL WIZARD (FINAL OVERRIDE) ===================

const WR2_SQHCEL_STORAGE_KEY = 'wr2_sqhcel_v1';

const WR2W_FLOW_STEPS = Object.freeze([
    Object.freeze({ id: 'S', label: 'S ׳₪׳ ׳™׳', criterion: 'signal' }),
    Object.freeze({ id: 'Q', label: 'Q ׳›׳׳×׳™׳', criterion: 'quantifier' }),
    Object.freeze({ id: 'H', label: 'H ׳’׳™׳©׳•׳¨', criterion: 'hypothesis' }),
    Object.freeze({ id: 'C', label: 'C ׳“׳™׳•׳§', criterion: 'confirm' }),
    Object.freeze({ id: 'P', label: 'PATH ׳‘׳—׳™׳¨׳”', criterion: 'path' }),
    Object.freeze({ id: 'E', label: 'E/L ׳—׳¨׳™׳’-׳׳׳™׳“׳”', criterion: 'exception' })
]);

const WR2W_BREAKOUT_STEPS = Object.freeze([
    Object.freeze({ id: 0, label: '׳‘׳“׳™׳§׳” ׳™׳©׳™׳¨׳”', prompt: '׳”׳׳ ׳™׳© ׳׳§׳¨׳” ׳©׳‘׳• ׳–׳” ׳׳ ׳ ׳›׳•׳ ׳׳’׳׳¨׳™?' }),
    Object.freeze({ id: 1, label: '׳׳“׳¨׳’׳” 1', prompt: '׳”׳™׳” ׳₪׳¢׳ ׳©׳–׳” ׳”׳™׳” 5% ׳₪׳—׳•׳× ׳ ׳›׳•׳?' }),
    Object.freeze({ id: 2, label: '׳׳“׳¨׳’׳” 2', prompt: '׳׳ ׳׳ 5% - ׳׳– 1% ׳₪׳—׳•׳× ׳ ׳›׳•׳?' }),
    Object.freeze({ id: 3, label: '׳׳“׳¨׳’׳” 3', prompt: '׳‘׳׳™׳–׳” ׳×׳ ׳׳™׳ ׳–׳” ׳ ׳”׳™׳” ׳”׳›׳™ ׳—׳–׳§? (׳׳×׳™/׳׳™׳₪׳”/׳¢׳ ׳׳™)' })
]);

const WR2W_FEELINGS = Object.freeze([
    '׳›׳™׳•׳•׳¥',
    '׳׳—׳¥',
    '׳—׳•׳',
    '׳›׳‘׳“׳•׳×',
    '׳“׳—׳™׳₪׳•׳×',
    '׳¨׳™׳§׳ ׳•׳×',
    '׳׳—׳¨'
]);

const WR2W_TOTALITY_MENU = Object.freeze([
    Object.freeze({
        id: 'time',
        axis: '׳¦׳™׳¨ ׳–׳׳',
        text: '׳׳ ׳׳©׳ ׳” ׳׳×׳™ ׳ ׳“׳‘׳¨ ׳׳• ׳›׳׳” ׳–׳׳ ׳™׳¢׳‘׳•׳¨ ג€” ׳–׳” ׳׳ ׳™׳¦׳׳™׳—.'
    }),
    Object.freeze({
        id: 'action',
        axis: '׳¦׳™׳¨ ׳₪׳¢׳•׳׳”',
        text: '׳׳ ׳׳©׳ ׳” ׳׳™׳–׳• ׳₪׳¢׳•׳׳” ׳׳¢׳©׳” ׳׳• ׳›׳׳” ׳׳×׳׳׳¥ ג€” ׳©׳•׳ ׳“׳‘׳¨ ׳׳ ׳™׳¢׳–׳•׳¨.'
    }),
    Object.freeze({
        id: 'words',
        axis: '׳¦׳™׳¨ ׳׳™׳׳™׳',
        text: '׳׳ ׳׳©׳ ׳” ׳׳™׳׳• ׳׳™׳׳™׳ ׳׳‘׳—׳¨ ׳׳• ׳׳™׳ ׳׳ ׳¡׳— ג€” ׳–׳” ׳׳ ׳¢׳•׳‘׳¨.'
    }),
    Object.freeze({
        id: 'people',
        axis: '׳¦׳™׳¨ ׳׳ ׳©׳™׳',
        text: '׳׳ ׳׳©׳ ׳” ׳׳™ ׳™׳¢׳–׳•׳¨ ׳׳• ׳׳™ ׳™׳×׳¢׳¨׳‘ ג€” ׳–׳” ׳׳ ׳™׳©׳ ׳”.'
    }),
    Object.freeze({
        id: 'context',
        axis: '׳¦׳™׳¨ ׳”׳§׳©׳¨',
        text: '׳׳ ׳׳©׳ ׳” ׳‘׳׳™׳–׳” ׳׳§׳•׳ ׳׳• ׳‘׳׳™׳–׳• ׳¡׳™׳˜׳•׳׳¦׳™׳” ג€” ׳–׳” ׳ ׳×׳§׳¢.'
    }),
    Object.freeze({
        id: 'custom',
        axis: '׳ ׳™׳¡׳•׳— ׳׳™׳©׳™',
        text: '׳׳—׳¨'
    })
]);

const WR2W_CRITERIA_LABELS = Object.freeze({
    signal: 'S | ׳–׳™׳”׳•׳™ ׳₪׳ ׳™׳',
    quantifier: 'Q | ׳›׳׳× ׳ ׳¡׳×׳¨',
    hypothesis: 'H | ׳׳©׳₪׳˜ ׳׳’׳©׳¨',
    confirm: 'C | ׳”׳׳™׳׳” + ׳׳™׳ ׳˜׳’׳¨׳¦׳™׳”',
    path: 'PATH | ׳‘׳—׳™׳¨׳”',
    exception: 'E/L | ׳—׳¨׳™׳’ ׳•׳׳׳™׳“׳”'
});

const wr2wPathCore = (() => {
    if (typeof window !== 'undefined' && window.wr2wPathCore) return window.wr2wPathCore;
    return Object.freeze({
        createDefaultAnalytics: (seed) => ({
            pathChoices: {
                outside: Math.max(0, Math.floor(Number(seed?.pathChoices?.outside) || 0)),
                inside: Math.max(0, Math.floor(Number(seed?.pathChoices?.inside) || 0)),
                both: Math.max(0, Math.floor(Number(seed?.pathChoices?.both) || 0))
            },
            stuck: {
                H: Math.max(0, Math.floor(Number(seed?.stuck?.H) || 0)),
                C: Math.max(0, Math.floor(Number(seed?.stuck?.C) || 0))
            },
            recentPaths: Array.isArray(seed?.recentPaths) ? seed.recentPaths.slice(-30) : []
        }),
        markStuck: (analytics, step) => {
            const next = {
                ...wr2wPathCore.createDefaultAnalytics(analytics),
                stuck: {
                    ...wr2wPathCore.createDefaultAnalytics(analytics).stuck
                }
            };
            if (step === 'H' || step === 'C') next.stuck[step] += 1;
            return next;
        },
        recordPathChoice: (analytics, path, sceneId) => {
            const next = wr2wPathCore.createDefaultAnalytics(analytics);
            if (path === 'outside' || path === 'inside' || path === 'both') {
                next.pathChoices[path] += 1;
                next.recentPaths = [...next.recentPaths, { path, sceneId: String(sceneId || ''), at: Date.now() }].slice(-30);
            }
            return next;
        },
        canEnterPath: (roundState) => Boolean(roundState?.confirmResolved),
        canEnterException: (roundState) => Boolean(roundState?.confirmResolved && roundState?.pathChoice),
        evaluateLearningByPath: (pathChoice, payload) => {
            const normalized = normalizeText(payload?.singleText || payload?.outsideText || payload?.insideText || '');
            const hasCondition = /(׳‘׳¢׳™׳§׳¨ ׳›׳©|׳׳₪׳¢׳׳™׳|׳‘׳×׳ ׳׳™׳|׳›׳׳©׳¨|׳›׳©)/.test(normalized);
            const avoidsAbsolutes = !WR2W_ABSOLUTE_REGEX.test(normalized);
            const ok = hasCondition && (pathChoice === 'inside' ? true : avoidsAbsolutes);
            return {
                ok,
                mode: pathChoice,
                outside: { ok, hasCondition, hasPattern: true, avoidsRigidAbsolute: avoidsAbsolutes },
                inside: { ok, hasCondition, hasInnerFrame: true },
                bothComplete: Boolean(payload?.outsideText && payload?.insideText && hasCondition)
            };
        },
        computeRoundScore: ({ criteria, pathChoice, bothLearningComplete }) => {
            const completed = Object.values(criteria || {}).filter(Boolean).length;
            const base = (completed * 6) + (completed === 6 ? 8 : 0);
            const pathPoint = criteria?.path ? 1 : 0;
            const bothBonus = pathChoice === 'both' && bothLearningComplete ? 1 : 0;
            return { completed, base, pathPoint, bothBonus, total: base + pathPoint + bothBonus };
        }
    });
})();

const wr2wHebrewSanitize = (() => {
    if (typeof window !== 'undefined' && window.hebrewSanitize) return window.hebrewSanitize;
    return Object.freeze({
        sanitizeHebrewText: (value) => String(value || ''),
        sanitizeHebrewJsonStrings: (value) => value,
        hasObviousHebrewTypos: () => ({ ok: true, issues: [] })
    });
})();

function wr2wSanitizeText(value) {
    return wr2wHebrewSanitize.sanitizeHebrewText(String(value || ''));
}

function wr2wSanitizeJsonStrings(payload) {
    return wr2wHebrewSanitize.sanitizeHebrewJsonStrings(payload);
}

function wr2wLogHebrewIssues(context, text) {
    const report = wr2wHebrewSanitize.hasObviousHebrewTypos(String(text || ''));
    if (!report.ok) {
        console.warn(`[WR2W][HebrewSanitize:${context}]`, report.issues, text);
    }
}

const WR2W_DIALOGUE_PACK_URL = 'data/sqhcel-dialogues.json';
let wr2wDialoguePackPromise = null;

const WR2W_SEED_DIALOGS = Object.freeze([
    Object.freeze({
        id: 'sqhcel_model_words_axis',
        monologue: '׳׳ ׳™ ׳₪׳©׳•׳˜ ׳׳ ׳™׳›׳•׳ ׳׳”׳¡׳‘׳™׳¨ ׳׳” ׳׳” ׳׳ ׳™ ׳¨׳•׳¦׳”. ׳׳ ׳™ ׳׳×׳׳׳¥ ׳׳”׳¡׳‘׳™׳¨ ׳•׳©׳•׳‘ ׳ ׳¡׳’׳¨.',
        visibleSentence: '׳׳ ׳™ ׳₪׳©׳•׳˜ ׳׳ ׳™׳›׳•׳ ׳׳”׳¡׳‘׳™׳¨ ׳׳” ׳׳” ׳׳ ׳™ ׳¨׳•׳¦׳”.',
        quantifiers: Object.freeze([
            '׳׳ ׳׳©׳ ׳” ׳›׳׳” ׳׳×׳׳׳¥ ׳•׳׳ ׳׳©׳ ׳” ׳׳™׳׳• ׳׳™׳׳™׳ ׳׳‘׳—׳¨ ג€” ׳–׳” ׳׳ ׳¢׳•׳‘׳¨.',
            '׳׳™׳ ׳׳™ ׳©׳•׳ ׳”׳©׳₪׳¢׳”; ׳”׳×׳•׳¦׳׳” ׳¡׳’׳•׳¨׳” ׳׳¨׳׳©.'
        ]),
        exceptionExample: '׳׳×׳•׳ 10 ׳©׳™׳—׳•׳×, ׳‘׳¢׳¨׳ ׳‘-2 ׳›׳ ׳”׳™׳” ׳¨׳’׳¢ ׳©׳ ׳”׳§׳©׳‘׳” ׳׳• ׳©׳׳׳” ׳׳¦׳™׳“׳”.',
        conditionsLine: '׳–׳” ׳”׳›׳™ ׳—׳–׳§ ׳›׳©׳׳ ׳™ ׳›׳‘׳¨ ׳׳’׳™׳¢ ׳׳™׳•׳׳© ׳•׳ ׳ ׳¢׳ ׳׳¨׳׳©.'
    }),
    Object.freeze({
        id: 'sqhcel_1_work_manager',
        monologue: '׳׳—׳¨ ׳™׳© ׳׳™ ׳©׳™׳—׳” ׳¢׳ ׳”׳׳ ׳”׳. ׳”׳•׳ ׳‘׳™׳§׳© "׳׳”׳‘׳”׳™׳¨ ׳“׳‘׳¨׳™׳". ׳׳ ׳™ ׳›׳‘׳¨ ׳׳“׳׳™׳™׳ ׳׳× ׳”׳˜׳•׳ ׳©׳׳• ׳•׳׳ ׳™ ׳ ׳ ׳¢׳.',
        visibleSentence: '׳׳ ׳™ ׳›׳™׳©׳׳•׳ ׳׳•׳׳•.',
        quantifiers: Object.freeze(['׳×׳׳™׳“', '׳‘׳›׳ ׳©׳™׳—׳”', '׳׳•׳ ׳›׳ ׳¡׳׳›׳•׳×', '׳‘׳׳™ ׳™׳•׳¦׳ ׳“׳•׳₪׳']),
        exceptionExample: '׳‘׳©׳™׳—׳” ׳”׳׳—׳¨׳•׳ ׳” ׳›׳ ׳”׳¦׳׳—׳×׳™ ׳׳”׳¡׳‘׳™׳¨ ׳ ׳§׳•׳“׳” ׳׳—׳× ׳‘׳¦׳•׳¨׳” ׳¢׳ ׳™׳™׳ ׳™׳×.',
        conditionsLine: '׳–׳” ׳ ׳”׳™׳” ׳”׳›׳™ ׳—׳–׳§ ׳›׳©׳™׳© ׳‘׳™׳§׳•׳¨׳× ׳₪׳×׳׳•׳׳™׳× ׳•׳׳¢׳˜ ׳–׳׳ ׳׳—׳©׳•׳‘.'
    }),
    Object.freeze({
        id: 'sqhcel_2_work_meeting',
        monologue: '׳‘׳™׳©׳™׳‘׳” ׳›׳•׳׳ ׳©׳×׳§׳• ׳•׳׳– ׳”׳•׳ ׳׳׳¨ "׳¦׳¨׳™׳ ׳™׳•׳×׳¨ ׳¨׳¦׳™׳ ׳•׳×". ׳”׳•׳ ׳׳ ׳”׳¡׳×׳›׳ ׳¢׳׳™׳™, ׳׳‘׳ ׳–׳” ׳”׳×׳™׳™׳©׳‘ ׳׳™ ׳™׳©׳¨ ׳‘׳‘׳˜׳.',
        visibleSentence: '׳׳™׳ ׳׳™ ׳׳™׳ ׳׳¦׳׳× ׳׳–׳” ׳˜׳•׳‘.',
        quantifiers: Object.freeze(['׳׳™׳ ׳׳¦׳‘', '׳‘׳©׳•׳ ׳“׳¨׳', '׳×׳׳™׳“', '׳׳•׳ ׳›׳•׳׳']),
        exceptionExample: '׳›׳©׳”׳›׳ ׳×׳™ ׳׳¨׳׳© ׳©׳׳•׳© ׳ ׳§׳•׳“׳•׳× - ׳›׳ ׳™׳¦׳׳×׳™ ׳׳–׳” ׳¡׳‘׳™׳¨.',
        conditionsLine: '׳–׳” ׳”׳›׳™ ׳—׳–׳§ ׳›׳©׳”׳׳¡׳¨ ׳¢׳§׳™׳£ ׳•׳׳ ׳™ ׳׳©׳׳™׳ ׳׳× ׳”׳—׳¡׳¨ ׳׳‘׳“.'
    }),
    Object.freeze({
        id: 'sqhcel_3_relationship_texts',
        monologue: '׳©׳׳—׳×׳™ ׳׳” ׳”׳•׳“׳¢׳” ׳‘׳‘׳•׳§׳¨. ׳”׳™׳ ׳¨׳׳×׳” ׳•׳׳ ׳¢׳ ׳×׳” ׳›׳ ׳”׳™׳•׳. ׳”׳¨׳׳© ׳©׳׳™ ׳׳ ׳”׳₪׳¡׳™׳§ ׳׳¨׳•׳¥.',
        visibleSentence: '׳׳ ׳™ ׳׳ ׳׳¡׳₪׳™׳§ ׳‘׳©׳‘׳™׳׳”.',
        quantifiers: Object.freeze(['׳×׳׳™׳“', '׳‘׳©׳•׳ ׳׳¦׳‘', '׳׳•׳ ׳›׳ ׳‘׳/׳‘׳× ׳–׳•׳’', '׳׳’׳׳¨׳™']),
        exceptionExample: '׳‘׳©׳‘׳•׳¢ ׳©׳¢׳‘׳¨ ׳”׳™׳ ׳›׳ ׳׳׳¨׳” ׳©׳”׳™׳ ׳׳¢׳¨׳™׳›׳” ׳׳•׳×׳™ ׳׳׳•׳“.',
        conditionsLine: '׳–׳” ׳”׳›׳™ ׳—׳–׳§ ׳›׳©׳™׳© ׳©׳×׳™׳§׳” ׳׳¨׳•׳›׳” ׳•׳׳ ׳™ ׳›׳‘׳¨ ׳¢׳™׳™׳£.'
    }),
    Object.freeze({
        id: 'sqhcel_4_relationship_home',
        monologue: '׳”׳•׳ ׳ ׳›׳ ׳¡ ׳”׳‘׳™׳×׳”, ׳׳׳¨ ׳©׳”׳•׳ ׳¢׳™׳™׳£, ׳•׳ ׳¢׳׳ ׳׳˜׳׳₪׳•׳. ׳׳ ׳™ ׳ ׳©׳׳¨׳×׳™ ׳׳‘׳“ ׳¢׳ ׳”׳¡׳™׳₪׳•׳¨ ׳‘׳¨׳׳©.',
        visibleSentence: '׳–׳” ׳׳ ׳”׳•׳׳ ׳׳©׳•׳ ׳׳§׳•׳.',
        quantifiers: Object.freeze(['׳‘׳©׳•׳ ׳׳§׳•׳', '׳×׳׳™׳“', '׳׳ ׳¦׳—', '׳‘׳׳™ ׳¡׳™׳›׳•׳™']),
        exceptionExample: '׳׳×׳׳•׳ ׳›׳ ׳“׳™׳‘׳¨׳ ׳• ׳¨׳‘׳¢ ׳©׳¢׳” ׳•׳”׳¨׳’׳©׳×׳™ ׳—׳™׳‘׳•׳¨.',
        conditionsLine: '׳–׳” ׳”׳›׳™ ׳—׳–׳§ ׳›׳©׳׳ ׳—׳ ׳• ׳—׳•׳–׳¨׳™׳ ׳”׳‘׳™׳×׳” ׳׳•׳×׳©׳™׳ ׳•׳׳׳ ׳–׳׳ ׳׳¢׳‘׳¨.'
    }),
    Object.freeze({
        id: 'sqhcel_5_social',
        monologue: '׳׳—׳¨ ׳׳™׳¨׳•׳¢. ׳׳ ׳™ ׳›׳‘׳¨ ׳¨׳•׳׳” ׳׳‘׳˜׳™׳ ׳•׳©׳•׳׳¢ ׳׳× ׳¢׳¦׳׳™ ׳ ׳×׳§׳¢ ׳‘׳׳©׳₪׳˜ ׳”׳¨׳׳©׳•׳.',
        visibleSentence: '׳׳ ׳™ ׳׳¢׳©׳” ׳©׳ ׳₪׳“׳™׳—׳”.',
        quantifiers: Object.freeze(['׳‘׳˜׳•׳—', '׳×׳׳™׳“', '׳׳•׳ ׳›׳•׳׳', '׳‘׳׳™ ׳™׳•׳¦׳ ׳“׳•׳₪׳']),
        exceptionExample: '׳‘׳©׳×׳™ ׳₪׳’׳™׳©׳•׳× ׳§׳˜׳ ׳•׳× ׳“׳•׳•׳§׳ ׳”׳¦׳׳—׳×׳™ ׳׳₪׳×׳•׳— ׳©׳™׳—׳” ׳¡׳‘׳™׳¨׳”.',
        conditionsLine: '׳–׳” ׳”׳›׳™ ׳—׳–׳§ ׳›׳©׳׳ ׳™ ׳׳’׳™׳¢ ׳‘׳׳™ ׳”׳›׳ ׳” ׳•׳¢׳ ׳”׳¨׳‘׳” ׳¨׳¢׳© ׳׳¡׳‘׳™׳‘.'
    }),
    Object.freeze({
        id: 'sqhcel_6_self_image',
        monologue: '׳”׳×׳—׳׳×׳™ ׳׳©׳”׳• ׳‘׳”׳×׳׳”׳‘׳•׳× ׳•׳׳– ׳•׳™׳×׳¨׳×׳™ ׳‘׳׳׳¦׳¢, ׳©׳•׳‘. ׳׳ ׳™ ׳׳¨׳’׳™׳© ׳©׳–׳” ׳—׳•׳–׳¨ ׳¢׳ ׳¢׳¦׳׳•.',
        visibleSentence: '׳׳ ׳™ ׳₪׳©׳•׳˜ ׳׳ ׳׳¡׳•׳’׳ ׳׳”׳×׳׳™׳“.',
        quantifiers: Object.freeze(['׳׳¢׳•׳׳ ׳׳', '׳×׳׳™׳“', '׳‘׳©׳•׳ ׳₪׳¨׳•׳™׳§׳˜', '׳‘׳׳™ ׳¡׳™׳›׳•׳™']),
        exceptionExample: '׳”׳¦׳׳—׳×׳™ ׳׳”׳×׳׳™׳“ ׳©׳׳•׳©׳” ׳©׳‘׳•׳¢׳•׳× ׳‘׳×׳¨׳’׳•׳ ׳§׳¦׳¨ ׳‘׳‘׳•׳§׳¨.',
        conditionsLine: '׳–׳” ׳”׳›׳™ ׳—׳–׳§ ׳›׳©׳”׳™׳¢׳“ ׳’׳“׳•׳ ׳׳“׳™ ׳•׳׳™׳ ׳¦׳¢׳“ ׳¨׳׳©׳•׳ ׳§׳˜׳.'
    }),
    Object.freeze({
        id: 'sqhcel_7_parenting',
        monologue: '׳”׳™׳׳“ ׳©׳•׳‘ ׳—׳–׳¨ ׳¢׳ ׳”׳¢׳¨׳”. ׳׳׳¨׳×׳™ ׳׳¢׳¦׳׳™ ׳©׳׳©׳׳•׳¨ ׳¢׳ ׳¨׳•׳’׳¢, ׳׳‘׳ ׳”׳×׳₪׳¨׳¦׳×׳™.',
        visibleSentence: '׳׳ ׳™ ׳”׳•׳¨׳” ׳’׳¨׳•׳¢.',
        quantifiers: Object.freeze(['׳×׳׳™׳“', '׳‘׳›׳ ׳׳¦׳‘', '׳‘׳׳™ ׳™׳•׳¦׳ ׳“׳•׳₪׳', '׳׳•׳ ׳›׳ ׳§׳•׳©׳™']),
        exceptionExample: '׳׳×׳׳•׳ ׳“׳•׳•׳§׳ ׳¢׳¦׳¨׳×׳™ ׳‘׳–׳׳ ׳•׳©׳™׳ ׳™׳×׳™ ׳˜׳•׳.',
        conditionsLine: '׳–׳” ׳”׳›׳™ ׳—׳–׳§ ׳›׳©׳׳ ׳™ ׳׳•׳¦׳£ ׳•׳¢׳•׳‘׳¨ ׳™׳©׳¨ ׳׳׳¦׳‘ ׳×׳’׳•׳‘׳”.'
    }),
    Object.freeze({
        id: 'sqhcel_8_change',
        monologue: '׳ ׳™׳¡׳™׳×׳™ ׳׳”׳×׳—׳–׳§, ׳”׳™׳• ׳™׳•׳׳™׳™׳ ׳˜׳•׳‘׳™׳, ׳•׳׳– ׳ ׳₪׳׳×׳™. ׳–׳” ׳׳™׳“ ׳”׳₪׳ ׳׳¡׳™׳₪׳•׳¨ ׳›׳•׳׳.',
        visibleSentence: '׳׳™׳ ׳׳™ ׳‘׳׳׳× ׳™׳›׳•׳׳× ׳׳”׳©׳×׳ ׳•׳×.',
        quantifiers: Object.freeze(['׳׳™׳ ׳™׳›׳•׳׳×', '׳‘׳©׳•׳ ׳©׳׳‘', '׳׳¢׳•׳׳ ׳׳', '׳×׳׳™׳“ ׳—׳•׳–׳¨']),
        exceptionExample: '׳›׳©׳¢׳‘׳“׳×׳™ ׳¢׳ ׳׳¡׳’׳¨׳× ׳§׳¦׳¨׳” ׳›׳ ׳ ׳•׳¦׳¨ ׳©׳™׳ ׳•׳™ ׳§׳˜׳.',
        conditionsLine: '׳–׳” ׳”׳›׳™ ׳—׳–׳§ ׳›׳©׳™׳© ׳׳¢׳™׳“׳” ׳•׳׳ ׳™ ׳׳×׳¨׳’׳ ׳׳•׳×׳” ׳׳–׳”׳•׳× ׳§׳‘׳•׳¢׳”.'
    }),
    Object.freeze({
        id: 'sqhcel_9_health',
        monologue: '׳¢׳©׳™׳×׳™ ׳©׳‘׳•׳¢ ׳׳¡׳•׳“׳¨ ׳•׳׳– ׳׳™׳׳” ׳׳—׳“ ׳”׳×׳₪׳¨׳§׳×׳™. ׳”׳¨׳׳© ׳׳׳¨ ׳©׳”׳›׳•׳ ׳ ׳׳—׳§.',
        visibleSentence: '׳–׳” ׳—׳¡׳¨ ׳¡׳™׳›׳•׳™.',
        quantifiers: Object.freeze(['׳—׳¡׳¨ ׳¡׳™׳›׳•׳™', '׳‘׳©׳•׳ ׳׳¦׳‘', '׳×׳׳™׳“', '׳׳’׳׳¨׳™']),
        exceptionExample: '׳׳—׳¨׳™ ׳”׳׳™׳׳” ׳”׳–׳” ׳—׳–׳¨׳×׳™ ׳׳׳¡׳׳•׳ ׳›׳‘׳¨ ׳׳׳—׳¨׳× ׳‘׳¦׳”׳¨׳™׳™׳.',
        conditionsLine: '׳–׳” ׳”׳›׳™ ׳—׳–׳§ ׳›׳©׳׳ ׳™ ׳¢׳™׳™׳£ ׳•׳׳¡׳×׳›׳ ׳¢׳ ׳׳™׳¨׳•׳¢ ׳׳—׳“ ׳›׳׳™׳׳• ׳”׳•׳ ׳׳’׳“׳™׳¨ ׳”׳›׳•׳.'
    }),
    Object.freeze({
        id: 'sqhcel_10_money',
        monologue: '׳׳ ׳™ ׳׳¡׳“׳¨ ׳׳©׳”׳• ׳•׳׳– ׳׳’׳™׳¢ ׳¢׳•׳“ ׳¡׳™׳“׳•׳¨. ׳׳¨׳’׳™׳© ׳©׳׳ ׳™ ׳›׳ ׳”׳–׳׳ ׳¨׳§ ׳׳›׳‘׳” ׳©׳¨׳™׳₪׳•׳×.',
        visibleSentence: '׳׳™׳ ׳₪׳” ׳¡׳•׳£.',
        quantifiers: Object.freeze(['׳׳¢׳•׳׳ ׳׳', '׳×׳׳™׳“', '׳‘׳›׳ ׳—׳•׳“׳©', '׳‘׳׳™ ׳”׳₪׳¡׳§׳”']),
        exceptionExample: '׳‘׳—׳•׳“׳© ׳©׳¢׳‘׳¨ ׳”׳™׳” ׳©׳‘׳•׳¢ ׳¨׳’׳•׳¢ ׳™׳•׳×׳¨ ׳¢׳ ׳₪׳—׳•׳× ׳›׳™׳‘׳•׳™ ׳©׳¨׳™׳₪׳•׳×.',
        conditionsLine: '׳–׳” ׳”׳›׳™ ׳—׳–׳§ ׳¡׳‘׳™׳‘ ׳׳•׳¢׳“׳™ ׳×׳©׳׳•׳ ׳•׳׳—׳¥ ׳–׳׳ ׳׳§׳‘׳™׳.'
    })
]);

function wr2wHash(value) {
    const text = String(value || '');
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
        hash = ((hash * 31) + text.charCodeAt(i)) % 2147483647;
    }
    return Math.abs(hash);
}

function wr2wResolveCaseSeedMeta(raw, visibleSentence, monologue) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const normalizedText = normalizeText(`${visibleSentence || ''} ${monologue || ''}`);
    const quantifierNatureRaw = String(
        source.quantifier_nature
        || source.quantifierNature
        || ''
    ).toLowerCase();
    let quantifierNature = 'mixed';
    if (['internal_climate', 'external_pattern', 'mixed'].includes(quantifierNatureRaw)) {
        quantifierNature = quantifierNatureRaw;
    } else if (/(׳׳¨׳’׳™׳©|׳‘׳₪׳ ׳™׳|׳—׳¨׳“׳”|׳׳—׳¥|׳‘׳•׳©׳”|׳›׳׳‘|׳“׳•׳₪׳§)/.test(normalizedText)) {
        quantifierNature = 'internal_climate';
    } else if (/(׳‘׳¢׳‘׳•׳“׳”|׳‘׳‘׳™׳×|׳‘׳₪׳’׳™׳©׳”|׳‘׳©׳™׳—׳”|׳׳•׳|׳‘׳™׳—׳¡׳™׳|׳›׳¡׳£|׳₪׳¨׳•׳™׳§׳˜)/.test(normalizedText)) {
        quantifierNature = 'external_pattern';
    }

    const frequencyRaw = String(
        source.external_frequency_estimate
        || source.externalFrequencyEstimate
        || ''
    ).toLowerCase();
    const externalFrequencyEstimate = ['rare', 'sometimes', 'often', 'almost_always'].includes(frequencyRaw)
        ? frequencyRaw
        : 'often';

    const intensityRaw = Number(
        source.internal_intensity_estimate
        || source.internalIntensityEstimate
    );
    const internalIntensityEstimate = Number.isFinite(intensityRaw)
        ? Math.max(0, Math.min(10, Math.round(intensityRaw)))
        : ((wr2wHash(normalizedText) % 11));

    return Object.freeze({
        quantifier_nature: quantifierNature,
        external_frequency_estimate: externalFrequencyEstimate,
        internal_intensity_estimate: internalIntensityEstimate
    });
}

function wr2wNormalizeScene(raw, idxPrefix = 'wr2w') {
    if (!raw || typeof raw !== 'object') return null;
    const source = wr2wSanitizeJsonStrings(raw);
    const visibleSentence = wr2TrimText(
        wr2wSanitizeText(source.visibleSentence || source.statement),
        170
    );
    if (!visibleSentence) return null;
    const monologue = wr2TrimText(
        wr2wSanitizeText(source.monologue || visibleSentence),
        420
    );
    const quantifiers = (Array.isArray(source.quantifiers) ? source.quantifiers : [])
        .map(item => wr2TrimText(wr2wSanitizeText(item), 38))
        .filter(Boolean)
        .slice(0, 4);
    const inferredQuantifiers = quantifiers.length ? quantifiers : wr2InferQuantifiers(visibleSentence);
    const caseSeedMeta = wr2wResolveCaseSeedMeta(source, visibleSentence, monologue);
    wr2wLogHebrewIssues('case_seed.visibleSentence', visibleSentence);
    wr2wLogHebrewIssues('case_seed.monologue', monologue);
    return {
        id: String(source.id || `${idxPrefix}_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`),
        source: source.source === 'self' ? 'self' : 'seed',
        monologue,
        visibleSentence,
        anchor: wr2TrimText(wr2wSanitizeText(source.anchor || wr2DetectAnchor(visibleSentence)), 36),
        quantifiers: [...new Set(inferredQuantifiers)].slice(0, 4),
        exceptionExample: wr2TrimText(
            wr2wSanitizeText(source.exceptionExample || '׳”׳™׳” ׳¨׳’׳¢ ׳§׳¦׳¨ ׳©׳–׳” ׳”׳™׳” ׳§׳¦׳× ׳₪׳—׳•׳× ׳ ׳›׳•׳.'),
            180
        ),
        conditionsLine: wr2TrimText(
            wr2wSanitizeText(source.conditionsLine || '׳–׳” ׳ ׳”׳™׳” ׳”׳›׳™ ׳—׳–׳§ ׳‘׳×׳ ׳׳™׳ ׳©׳ ׳׳—׳¥/׳¢׳™׳™׳₪׳•׳×/׳—׳•׳¡׳¨ ׳•׳“׳׳•׳×.'),
            180
        ),
        transformedSentence: wr2TrimText(
            wr2wSanitizeText(source.transformedSentence || wr2SoftenSentence(visibleSentence)),
            190
        ),
        caseSeedMeta,
        createdAt: Number(source.createdAt) || Date.now()
    };
}

function wr2wMapDialoguePackEntry(entry, index = 0) {
    if (!entry || typeof entry !== 'object') return null;
    const source = wr2wSanitizeJsonStrings(entry);
    const visibleSentence = wr2TrimText(
        wr2wSanitizeText(source.final_sentence || source.finalSentence || source.visibleSentence || source.statement),
        170
    );
    if (!visibleSentence) return null;

    const lines = Array.isArray(source.lines)
        ? source.lines.map((line) => wr2TrimText(wr2wSanitizeText(line), 110)).filter(Boolean).slice(0, 6)
        : [];
    const monologueFromLines = lines.join(' ');
    const monologue = wr2TrimText(wr2wSanitizeText(monologueFromLines || source.monologue || visibleSentence), 420);
    const suggestedQuantifier = wr2TrimText(
        wr2wSanitizeText(source.suggested_shadow_quantifier || source.suggestedShadowQuantifier),
        38
    );
    const quantifiers = [suggestedQuantifier, ...wr2InferQuantifiers(visibleSentence)]
        .filter(Boolean)
        .slice(0, 4);
    const fallbackCondition = '׳–׳” ׳ ׳”׳™׳” ׳”׳›׳™ ׳—׳–׳§ ׳‘׳¢׳™׳§׳¨ ׳‘׳¢׳•׳׳¡, ׳¢׳™׳™׳₪׳•׳× ׳׳• ׳—׳•׳¡׳¨ ׳•׳“׳׳•׳×.';
    const caseSeedMeta = wr2wResolveCaseSeedMeta(source, visibleSentence, monologue);
    wr2wLogHebrewIssues('dialogue_pack.visibleSentence', visibleSentence);
    wr2wLogHebrewIssues('dialogue_pack.monologue', monologue);
    return {
        id: String(source.id || `sqhcel_pack_${index + 1}`),
        source: 'seed',
        monologue,
        visibleSentence,
        quantifiers: [...new Set(quantifiers)],
        exceptionExample: wr2TrimText(
            wr2wSanitizeText(source.suggested_exception || source.suggestedException || source.exceptionExample),
            180
        ) || '׳›׳, ׳™׳© ׳¨׳’׳¢ ׳©׳‘׳• ׳–׳” 5% ׳₪׳—׳•׳× ׳ ׳›׳•׳.',
        conditionsLine: wr2TrimText(wr2wSanitizeText(source.conditionsLine || fallbackCondition), 180),
        transformedSentence: wr2TrimText(wr2SoftenSentence(visibleSentence), 190),
        caseSeedMeta,
        createdAt: Date.now()
    };
}

async function wr2wLoadSeedScenesFromPack() {
    if (wr2wDialoguePackPromise) return wr2wDialoguePackPromise;
    wr2wDialoguePackPromise = (async () => {
        try {
            const response = await fetch(WR2W_DIALOGUE_PACK_URL, { cache: 'no-store' });
            if (!response.ok) return [];
            const payload = wr2wSanitizeJsonStrings(await response.json());
            const list = Array.isArray(payload?.dialogues)
                ? payload.dialogues
                : (Array.isArray(payload) ? payload : []);
            return list
                .map((entry, index) => wr2wMapDialoguePackEntry(entry, index))
                .filter(Boolean);
        } catch (error) {
            console.warn('Could not load SQHCEL dialogue pack:', error);
            return [];
        }
    })();
    return wr2wDialoguePackPromise;
}

function wr2wBuildHypothesisSkeleton(scene, totalityText) {
    const q = totalityText || '___';
    return `׳׳ ׳™ ׳©׳•׳׳¢ ׳©׳›׳׳©׳¨ ׳׳×׳” ׳׳•׳׳¨ "${scene.visibleSentence}" ׳–׳” ׳ ׳—׳•׳•׳” ׳׳‘׳₪׳ ׳™׳ ׳›"${q}". ׳–׳” ׳׳¨׳’׳™׳© ׳›׳‘׳“ ׳•׳׳©׳×׳§. ׳–׳” ׳׳“׳•׳™׳§ ׳¢׳‘׳•׳¨׳ ׳¢׳›׳©׳™׳•?`;
}

function wr2wFrequencyToAttempts(meta = {}) {
    const freq = String(meta?.external_frequency_estimate || '').toLowerCase();
    if (freq === 'rare') return 1;
    if (freq === 'sometimes') return 2;
    if (freq === 'almost_always') return 7;
    return 4;
}

function wr2wBuildRealitySnapshot(scene, roundState = {}) {
    const meta = scene?.caseSeedMeta || {};
    const attempts = wr2wFrequencyToAttempts(meta);
    const signal = wr2TrimText(wr2wSanitizeText(scene?.exceptionExample || '׳”׳™׳” ׳¨׳’׳¢ ׳§׳˜׳ ׳©׳ ׳”׳×׳§׳¨׳‘׳•׳×, ׳’׳ ׳׳ ׳׳ ׳׳•׳©׳׳.'), 180);
    const quantifier = wr2wSanitizeText(roundState?.selectedQuantifier || '׳׳ ׳׳©׳ ׳” ׳׳”');
    return Object.freeze({
        attempts,
        outOf: 10,
        signal,
        filterLine: '׳›׳©׳™׳™׳׳•׳© ׳—׳–׳§, ׳׳•׳₪׳¢׳ ׳׳¡׳ ׳ ׳”׳©׳׳˜׳” ׳©׳׳•׳—׳§ ׳׳•׳×׳•׳× ׳§׳˜׳ ׳™׳ ׳‘׳—׳•׳¥ ׳›׳“׳™ ׳׳”׳’׳ ׳׳׳›׳–׳‘׳”.',
        paradoxLine: '׳•׳‘׳•-׳–׳׳: ׳׳×׳” ׳¢׳“׳™׳™׳ ׳›׳׳. ׳–׳” ׳¡׳™׳׳ ׳©׳™׳© ׳’׳ ׳¦׳“ ׳©׳׳§׳•׳•׳” ׳©׳–׳” ׳›׳ ׳™׳›׳•׳ ׳׳¢׳‘׳•׳“.',
        insideLine: `׳׳‘׳₪׳ ׳™׳ ׳”׳—׳•׳•׳™׳” ׳ ׳©׳׳¢׳× ׳›׳׳• "${quantifier}", ׳•׳׳›׳ ׳™׳© ׳ ׳˜׳™׳™׳” ׳׳”׳™׳¡׳’׳¨ ׳׳¨׳׳©.`
    });
}

function wr2wBuildIntegrativeSkeleton(snapshot) {
    const inside = snapshot?.insideLine || '׳‘׳₪׳ ׳™׳ ׳™׳© ׳™׳™׳׳•׳© ׳©׳׳™׳™׳¦׳¨ ׳¡׳’׳™׳¨׳” ׳׳¨׳׳©.';
    const attempts = Number(snapshot?.attempts) || 0;
    const outOf = Number(snapshot?.outOf) || 10;
    return `׳‘׳—׳•׳¥ ׳™׳© ׳׳₪׳¢׳׳™׳ ׳ ׳™׳¡׳™׳•׳ (׳‘׳¢׳¨׳ ${attempts}/${outOf}), ׳•׳‘׳₪׳ ׳™׳ ׳™׳© ׳™׳™׳׳•׳© ׳—׳–׳§. ׳›׳©׳©׳ ׳™ ׳׳׳” ׳ ׳₪׳’׳©׳™׳ ׳ ׳•׳¦׳¨׳× ׳”׳×׳§׳™׳¢׳•׳× ׳”׳ ׳•׳›׳—׳™׳×.`;
}

function wr2wExtractConditionHint(scene, roundState = {}) {
    const samples = [
        roundState?.lastProbe?.text,
        scene?.conditionsLine,
        scene?.exceptionExample,
        scene?.monologue
    ];
    for (let i = 0; i < samples.length; i += 1) {
        const text = wr2wSanitizeText(samples[i] || '').replace(/\s+/g, ' ').trim();
        if (!text) continue;
        const match = text.match(/(?:׳‘׳¢׳™׳§׳¨\s+׳›׳©|׳›׳©|׳›׳׳©׳¨)\s*([^.,;!?]+)/);
        if (match && match[1]) {
            const cleaned = match[1].replace(/["']/g, '').trim();
            if (cleaned) return cleaned;
        }
    }
    return '׳™׳© ׳¢׳•׳׳¡, ׳¢׳™׳™׳₪׳•׳× ׳׳• ׳—׳•׳¡׳¨ ׳•׳“׳׳•׳×';
}

function wr2wComposeAutoLearning(pathChoice, scene, roundState = {}) {
    const choice = String(pathChoice || '').toLowerCase();
    const quantifier = wr2wSanitizeText(roundState?.selectedQuantifier || '׳×׳׳™׳“');
    const conditionCore = wr2wExtractConditionHint(scene, roundState);
    const conditionClause = conditionCore.startsWith('׳›׳©') ? conditionCore : `׳›׳©${conditionCore}`;
    const outsideText = wr2wSanitizeText(`׳–׳” ׳׳ ׳‘׳”׳›׳¨׳— "${quantifier}", ׳–׳” ׳“׳₪׳•׳¡ ׳׳ ׳¢׳§׳‘׳™ ג€” ׳‘׳¢׳™׳§׳¨ ${conditionClause}.`);
    const insideText = wr2wSanitizeText(`׳–׳” ׳׳¨׳’׳™׳© "${quantifier}" ג€” ׳‘׳¢׳™׳§׳¨ ${conditionClause}.`);

    if (choice === 'outside') {
        return Object.freeze({ singleText: outsideText, outsideText, insideText: '' });
    }
    if (choice === 'inside') {
        return Object.freeze({ singleText: insideText, outsideText: '', insideText });
    }
    return Object.freeze({ singleText: '', outsideText, insideText });
}

const WR2W_OWNERSHIP_REGEX = /(׳¢׳•׳׳” ׳׳™|׳›׳©׳׳ ׳™ ׳©׳•׳׳¢|׳׳ ׳™ ׳§׳•׳׳˜ ׳›׳׳™׳׳•|׳ ׳“׳׳” ׳׳™|׳׳¨׳’׳™׳© ׳׳™)/;
const WR2W_CHECK_REGEX = /(׳–׳” ׳§׳¨׳•׳‘|׳׳• ׳©׳׳ ׳™ ׳׳©׳׳™׳|׳–׳” ׳׳“׳•׳™׳§|׳–׳” ׳׳×׳׳™׳|׳׳ ׳™ ׳׳₪׳¡׳₪׳¡|׳–׳” ׳׳” ׳©׳”׳×׳›׳•׳•׳ ׳×)/;
const WR2W_ABSOLUTE_REGEX = /(׳×׳׳™׳“|׳׳£ ׳₪׳¢׳|׳‘׳©׳•׳|׳›׳•׳׳|׳׳™׳ ׳׳¦׳‘|׳׳’׳׳¨׳™|׳׳¢׳•׳׳)/;
const WR2W_OUTSIDE_REGEX = /(׳“׳₪׳•׳¡|׳׳ ׳¢׳§׳‘׳™|׳‘׳₪׳•׳¢׳|׳‘׳׳™׳ ׳˜׳¨׳׳§׳¦׳™׳”|׳‘׳™׳—׳¡׳™׳|׳’׳‘׳•׳|׳‘׳§׳©׳”|׳₪׳×׳¨׳•׳|׳”׳×׳ ׳”׳’׳•׳×)/;
const WR2W_INSIDE_REGEX = /(׳׳¨׳’׳™׳©|׳‘׳₪׳ ׳™׳|׳‘׳’׳•׳£|׳¢׳•׳¦׳׳”|׳׳—׳¥|׳₪׳—׳“|׳‘׳•׳©׳”|׳“׳•׳₪׳§|׳›׳׳‘)/;
const WR2W_VALIDATION_REGEX = /(׳›׳‘׳“|׳׳©׳×׳§|׳׳×׳¡׳›׳|׳§׳©׳”|׳׳™׳ ׳׳™ ׳”׳©׳₪׳¢׳”|׳×׳•׳¦׳׳” ׳¡׳’׳•׳¨׳” ׳׳¨׳׳©|׳—׳•׳•׳™׳” ׳׳•׳—׳׳˜׳×)/;
const WR2W_PREMATURE_FACT_CHECK_REGEX = /(׳‘׳׳׳×|׳‘׳₪׳•׳¢׳|׳׳×׳•׳ 10|׳׳₪׳¡|׳™׳© ׳׳₪׳¢׳׳™׳|׳”׳™׳ ׳›׳|׳”׳•׳ ׳›׳|׳ ׳™׳¡׳™׳•׳ ׳׳¦׳™׳“׳”|׳ ׳™׳¡׳™׳•׳ ׳׳¦׳“׳•)/;

const wr2wPatientAgent = Object.freeze({
    confirmHypothesis(scene, hypothesisText, selectedQuantifier) {
        const normalized = normalizeText(hypothesisText);
        const hasQuantifier = selectedQuantifier
            ? normalized.includes(normalizeText(selectedQuantifier))
            : false;
        const meta = scene?.caseSeedMeta || {};
        if (!hasQuantifier) {
            const rawText = '׳׳ ׳׳׳©. ׳׳ ׳™ ׳׳ ׳©׳•׳׳¢ ׳›׳׳ ׳׳× ׳”׳”׳©׳׳׳” ׳©׳׳ ׳™ ׳׳¨׳’׳™׳© ׳‘׳₪׳ ׳™׳.';
            wr2wLogHebrewIssues('patient.confirm.no_quantifier', rawText);
            return Object.freeze({
                status: 'no',
                text: wr2wSanitizeText(rawText)
            });
        }

        const profile = wr2wHash(scene.id) % 3;
        if (profile === 0) {
            const rawText = '׳›׳, ׳–׳” ׳§׳¨׳•׳‘ ׳׳׳” ׳©׳§׳•׳¨׳” ׳׳™. ׳–׳” ׳‘׳“׳™׳•׳§ ׳”׳§׳•׳ ׳”׳₪׳ ׳™׳׳™.';
            wr2wLogHebrewIssues('patient.confirm.yes', rawText);
            return Object.freeze({
                status: 'yes',
                text: wr2wSanitizeText(rawText)
            });
        }
        if (profile === 1) {
            const rawText = meta.quantifier_nature === 'external_pattern'
                ? '׳‘׳¢׳¨׳. ׳–׳” ׳ ׳¨׳׳” ׳™׳•׳×׳¨ ׳›׳׳• ׳“׳₪׳•׳¡ ׳—׳™׳¦׳•׳ ׳™ ׳‘׳×׳ ׳׳™׳ ׳׳¡׳•׳™׳׳™׳, ׳׳ ׳×׳׳™׳“.'
                : '׳‘׳¢׳¨׳. ׳–׳” ׳ ׳›׳•׳ ׳‘׳¢׳™׳§׳¨ ׳‘׳׳¦׳‘׳™׳ ׳׳¡׳•׳™׳׳™׳, ׳׳ ׳×׳׳™׳“.';
            wr2wLogHebrewIssues('patient.confirm.partial', rawText);
            return Object.freeze({
                status: 'partial',
                text: wr2wSanitizeText(rawText)
            });
        }
        const rawText = meta.quantifier_nature === 'internal_climate'
            ? '׳׳ ׳׳’׳׳¨׳™. ׳›׳¨׳’׳¢ ׳–׳” ׳׳¨׳’׳™׳© ׳™׳•׳×׳¨ ׳׳§׳׳™׳ ׳₪׳ ׳™׳׳™ ׳—׳–׳§ ׳׳׳©׳¨ ׳›׳׳ ׳§׳‘׳•׳¢.'
            : '׳׳ ׳׳’׳׳¨׳™. ׳–׳” ׳ ׳©׳׳¢ ׳™׳•׳×׳¨ ׳¢׳•׳׳¡ ׳¨׳’׳¢׳™ ׳׳׳©׳¨ ׳›׳׳ ׳§׳‘׳•׳¢.';
        wr2wLogHebrewIssues('patient.confirm.no', rawText);
        return Object.freeze({
            status: 'no',
            text: wr2wSanitizeText(rawText)
        });
    },
    probeException(scene, level) {
        const profile = wr2wHash(`${scene.id}:${level}`) % 4;
        if (level === 0 && profile <= 2) {
            const rawText = '׳›׳¨׳’׳¢ ׳׳ ׳¢׳•׳׳” ׳׳™ ׳—׳¨׳™׳’ ׳‘׳¨׳•׳¨.';
            wr2wLogHebrewIssues('patient.probe.level0', rawText);
            return Object.freeze({ found: false, text: wr2wSanitizeText(rawText) });
        }
        if (level === 1 && profile <= 1) {
            const rawText = '׳’׳ 5% ׳₪׳—׳•׳× ׳ ׳›׳•׳ ׳§׳©׳” ׳׳™ ׳׳–׳”׳•׳×.';
            wr2wLogHebrewIssues('patient.probe.level1', rawText);
            return Object.freeze({ found: false, text: wr2wSanitizeText(rawText) });
        }
        if (level === 2 && profile === 0) {
            const rawText = '׳׳₪׳™׳׳• 1% ׳₪׳—׳•׳× ׳ ׳›׳•׳ ׳׳ ׳¢׳•׳׳” ׳׳™ ׳›׳¨׳’׳¢.';
            wr2wLogHebrewIssues('patient.probe.level2', rawText);
            return Object.freeze({ found: false, text: wr2wSanitizeText(rawText) });
        }
        if (level <= 2) {
            const rawText = String(scene.exceptionExample || '');
            wr2wLogHebrewIssues('patient.probe.exception', rawText);
            return Object.freeze({ found: true, text: wr2wSanitizeText(rawText) });
        }
        const rawText = String(scene.conditionsLine || '');
        wr2wLogHebrewIssues('patient.probe.conditions', rawText);
        return Object.freeze({ found: true, text: wr2wSanitizeText(rawText) });
    }
});

const wr2wEvaluatorAgent = Object.freeze({
    evaluateHypothesis(text, selectedQuantifier) {
        const normalized = normalizeText(text);
        const hasOwnership = WR2W_OWNERSHIP_REGEX.test(normalized);
        const hasQuantifier = selectedQuantifier
            ? normalized.includes(normalizeText(selectedQuantifier))
            : false;
        const hasCheck = WR2W_CHECK_REGEX.test(normalized);
        const hasValidation = WR2W_VALIDATION_REGEX.test(normalized);
        const hasPrematureFactCheck = WR2W_PREMATURE_FACT_CHECK_REGEX.test(normalized);
        return Object.freeze({
            ok: hasOwnership && hasQuantifier && hasCheck && hasValidation && !hasPrematureFactCheck,
            hasOwnership,
            hasQuantifier,
            hasCheck,
            hasValidation,
            hasPrematureFactCheck
        });
    },
    evaluateLearning(pathChoice, payload = {}) {
        const result = wr2wPathCore.evaluateLearningByPath(pathChoice, payload);
        if (result?.mode === 'outside') {
            return Object.freeze({
                ok: Boolean(result.ok),
                mode: 'outside',
                outside: result.outside || {
                    hasCondition: /(׳‘׳¢׳™׳§׳¨ ׳›׳©|׳׳₪׳¢׳׳™׳|׳‘׳×׳ ׳׳™׳|׳›׳׳©׳¨|׳›׳©)/.test(normalizeText(payload.singleText || '')),
                    hasPattern: WR2W_OUTSIDE_REGEX.test(normalizeText(payload.singleText || '')),
                    avoidsRigidAbsolute: !WR2W_ABSOLUTE_REGEX.test(normalizeText(payload.singleText || ''))
                        || /׳–׳” ׳׳/.test(normalizeText(payload.singleText || ''))
                }
            });
        }
        if (result?.mode === 'inside') {
            return Object.freeze({
                ok: Boolean(result.ok),
                mode: 'inside',
                inside: result.inside || {
                    hasCondition: /(׳‘׳¢׳™׳§׳¨ ׳›׳©|׳׳₪׳¢׳׳™׳|׳‘׳×׳ ׳׳™׳|׳›׳׳©׳¨|׳›׳©)/.test(normalizeText(payload.singleText || '')),
                    hasInnerFrame: WR2W_INSIDE_REGEX.test(normalizeText(payload.singleText || ''))
                }
            });
        }
        return Object.freeze({
            ok: Boolean(result?.ok),
            mode: 'both',
            bothComplete: Boolean(result?.bothComplete),
            outside: result?.outside || {
                hasCondition: /(׳‘׳¢׳™׳§׳¨ ׳›׳©|׳׳₪׳¢׳׳™׳|׳‘׳×׳ ׳׳™׳|׳›׳׳©׳¨|׳›׳©)/.test(normalizeText(payload.outsideText || '')),
                hasPattern: WR2W_OUTSIDE_REGEX.test(normalizeText(payload.outsideText || '')),
                avoidsRigidAbsolute: !WR2W_ABSOLUTE_REGEX.test(normalizeText(payload.outsideText || ''))
                    || /׳–׳” ׳׳/.test(normalizeText(payload.outsideText || ''))
            },
            inside: result?.inside || {
                hasCondition: /(׳‘׳¢׳™׳§׳¨ ׳›׳©|׳׳₪׳¢׳׳™׳|׳‘׳×׳ ׳׳™׳|׳›׳׳©׳¨|׳›׳©)/.test(normalizeText(payload.insideText || '')),
                hasInnerFrame: WR2W_INSIDE_REGEX.test(normalizeText(payload.insideText || ''))
            }
        });
    }
});

function wr2wProcessCount(criteria) {
    return Object.values(criteria || {}).filter(Boolean).length;
}

function setupWrinkleGame() {
    const root = document.getElementById('wrinkle-game');
    if (!root || root.dataset.wr2WizardBound === 'true') return;
    root.dataset.wr2WizardBound = 'true';
    root.className = 'card wrinkle-reveal-card wr2w-card';

    root.innerHTML = `
        <div class="wr2w-shell">
            <div class="wr2w-topbar">
                <div class="wr2w-title-wrap">
                    <h3>׳›׳׳×׳™׳ ׳ ׳¡׳×׳¨׳™׳ ג€“ ׳”׳”׳›׳׳׳•׳× ׳©׳׳©׳×׳׳¢׳•׳× ׳׳‘׳ ׳׳ ׳ ׳׳׳¨׳•׳×</h3>
                    <p class="wr2w-subtitle">׳›׳©׳”׳¨׳’׳© ׳—׳–׳§ ׳™׳•׳×׳¨ ׳׳”׳׳©׳₪׳˜ ג€“ ׳™׳© ׳›׳׳× ׳ ׳¡׳×׳¨ ׳©׳׳“׳‘׳™׳§ ׳׳× ׳”׳¡׳™׳₪׳•׳¨</p>
                    <p class="wr2w-formula">
                        ׳—׳•׳¥ (׳׳¦׳׳׳”) + ׳›׳׳× ׳ ׳¡׳×׳¨ ג†’ ׳¢׳•׳¦׳׳” ׳‘׳₪׳ ׳™׳
                        <button type="button" class="wr2w-tip-btn" title="׳‘׳—׳•׳¥ ׳¡׳•׳₪׳¨׳™׳ ׳×׳“׳™׳¨׳•׳×. ׳‘׳₪׳ ׳™׳ ׳™׳© ׳׳©׳§׳. ׳׳₪׳¢׳׳™׳ ׳׳™׳¨׳•׳¢ ׳׳—׳“ ׳©׳•׳§׳ ׳›׳׳• ׳¢׳©׳¨." aria-label="׳”׳¡׳‘׳¨ ׳§׳¦׳¨ ׳¢׳ ׳¡׳˜׳˜׳™׳¡׳˜׳™׳§׳” ׳›׳₪׳•׳׳”">ג“˜</button>
                    </p>
                </div>
                <div class="wr2w-score">
                    <span>׳×׳”׳׳™׳: <strong id="wr2w-process-score">0/6</strong></span>
                    <span>נ”¥ ׳¨׳¦׳£: <strong id="wr2w-streak">0</strong></span>
                    <span>ג­ ׳ ׳§׳•׳“׳•׳×: <strong id="wr2w-points">0</strong></span>
                    <span class="wr2w-score-minor">PATH ׳—׳•׳¥/׳₪׳ ׳™׳/׳’׳©׳¨: <strong id="wr2w-path-distribution">0/0/0</strong></span>
                    <span class="wr2w-score-minor">׳×׳§׳™׳¢׳•׳× H/C: <strong id="wr2w-stuck-distribution">0/0</strong></span>
                </div>
            </div>

            <section class="wr2w-sentence-card">
                <p class="wr2w-kicker">׳”׳׳©׳₪׳˜ ׳©׳ ׳׳׳¨</p>
                <p id="wr2w-visible-sentence" class="wr2w-visible-sentence"></p>
                <p class="wr2w-sentence-help">׳׳©׳₪׳˜ ׳§׳¦׳¨ ׳™׳›׳•׳ ׳׳”׳¡׳×׳™׳¨ "׳×׳׳™׳“/׳׳£ ׳₪׳¢׳/׳׳™׳ ׳¡׳™׳›׳•׳™".</p>
                <p id="wr2w-monologue" class="wr2w-monologue"></p>
            </section>

            <section class="wr2w-layers" aria-label="׳©׳›׳‘׳•׳× ׳§׳‘׳•׳¢׳•׳×">
                <article id="wr2w-layer-outside" class="wr2w-layer-card is-blue">
                    <h4>׳׳¦׳׳׳” (׳—׳•׳¥)</h4>
                    <p>׳׳” ׳‘׳׳׳× ׳§׳¨׳” / ׳׳” ׳¨׳•׳׳™׳ ׳׳‘׳—׳•׳¥?</p>
                </article>
                <article id="wr2w-layer-inside" class="wr2w-layer-card is-green">
                    <h4>׳’׳•׳£/׳¨׳’׳© (׳₪׳ ׳™׳)</h4>
                    <p>׳׳” ׳§׳•׳¨׳” ׳‘׳™ ׳¢׳›׳©׳™׳•?</p>
                </article>
                <article id="wr2w-layer-quantifier" class="wr2w-layer-card is-purple">
                    <h4>׳›׳׳×׳™׳ ׳ ׳¡׳×׳¨׳™׳</h4>
                    <p>׳׳™׳–׳” "׳×׳׳™׳“/׳׳£ ׳₪׳¢׳" ׳׳©׳×׳׳¢ ׳₪׳”?</p>
                </article>
            </section>

            <div id="wr2w-step-chips" class="wr2w-step-chips"></div>

            <section class="wr2w-step-panel">
                <h4 id="wr2w-step-title"></h4>
                <p id="wr2w-step-instruction" class="wr2w-step-instruction"></p>
                <div id="wr2w-step-body" class="wr2w-step-body"></div>
                <div id="wr2w-hebrew-warning" class="wr2w-hebrew-warning hidden">ג ן¸ ׳×׳•׳§׳ ׳ ׳™׳¡׳•׳— ׳¢׳‘׳¨׳™ ׳‘׳×׳¦׳•׳’׳”.</div>
                <p id="wr2w-feedback" class="wr2w-feedback" data-tone="info"></p>
            </section>

            <div class="wr2w-actions">
                <button id="wr2w-next-scene" class="btn btn-secondary" type="button">׳׳©׳₪׳˜ ׳”׳‘׳</button>
                <button id="wr2w-reset-round" class="btn btn-secondary" type="button">׳׳™׳₪׳•׳¡ ׳¡׳‘׳‘</button>
                <button id="wr2w-self-toggle" class="btn btn-secondary" type="button">+ ׳׳©׳₪׳˜ ׳׳™׳©׳™</button>
            </div>

            <section id="wr2w-self-panel" class="wr2w-self-panel hidden">
                <label for="wr2w-self-input">Self-Reference (׳׳•׳₪׳¦׳™׳•׳ ׳׳™)</label>
                <textarea id="wr2w-self-input" rows="2" placeholder="׳׳“׳•׳’׳׳”: ׳׳ ׳™ ׳׳ ׳™׳›׳•׳ ׳׳”׳¡׳‘׳™׳¨ ׳׳” ׳׳” ׳׳ ׳™ ׳¨׳•׳¦׳”."></textarea>
                <button id="wr2w-self-add" class="btn btn-secondary" type="button">׳”׳•׳¡׳£ ׳׳×׳¨׳’׳•׳</button>
                <ul id="wr2w-self-list" class="wr2w-self-list"></ul>
            </section>
        </div>
    `;

    const els = {
        processScore: document.getElementById('wr2w-process-score'),
        streak: document.getElementById('wr2w-streak'),
        points: document.getElementById('wr2w-points'),
        pathDistribution: document.getElementById('wr2w-path-distribution'),
        stuckDistribution: document.getElementById('wr2w-stuck-distribution'),
        monologue: document.getElementById('wr2w-monologue'),
        visibleSentence: document.getElementById('wr2w-visible-sentence'),
        layerOutside: document.getElementById('wr2w-layer-outside'),
        layerInside: document.getElementById('wr2w-layer-inside'),
        layerQuantifier: document.getElementById('wr2w-layer-quantifier'),
        stepChips: document.getElementById('wr2w-step-chips'),
        stepTitle: document.getElementById('wr2w-step-title'),
        stepInstruction: document.getElementById('wr2w-step-instruction'),
        stepBody: document.getElementById('wr2w-step-body'),
        hebrewWarning: document.getElementById('wr2w-hebrew-warning'),
        feedback: document.getElementById('wr2w-feedback'),
        nextScene: document.getElementById('wr2w-next-scene'),
        resetRound: document.getElementById('wr2w-reset-round'),
        selfToggle: document.getElementById('wr2w-self-toggle'),
        selfPanel: document.getElementById('wr2w-self-panel'),
        selfInput: document.getElementById('wr2w-self-input'),
        selfAdd: document.getElementById('wr2w-self-add'),
        selfList: document.getElementById('wr2w-self-list')
    };
    if (!els.stepBody || !els.visibleSentence) return;

    const createRoundState = () => ({
        step: 'S',
        feeling: '',
        selectedQuantifier: '',
        selectedQuantifierAxis: '',
        hypothesisDraft: '',
        hypothesisFinal: '',
        confirmation: null,
        confirmCorrections: 0,
        lastConfirmSelection: '',
        confirmResolved: false,
        realitySnapshot: null,
        integrativeDraft: '',
        integrativeFinal: '',
        integrativeApproved: false,
        breakoutLevel: 0,
        lastProbe: null,
        breakoutFound: false,
        pathChoice: '',
        learningDraft: '',
        learningFinal: '',
        learningOutsideDraft: '',
        learningInsideDraft: '',
        learningOutsideFinal: '',
        learningInsideFinal: '',
        bothLearningComplete: false,
        roundScore: 0,
        completedCount: 0,
        penaltyPoints: 0,
        penalties: {
            prematureFactCheck: 0,
            invalidation: 0
        },
        criteria: {
            signal: false,
            quantifier: false,
            hypothesis: false,
            confirm: false,
            path: false,
            exception: false
        },
        feedback: '׳₪׳×׳™׳—׳”: ׳™׳© 3 ׳©׳›׳‘׳•׳× (׳₪׳ ׳™׳/׳—׳•׳¥/׳“׳™׳‘׳•׳¨). ׳©׳׳‘ ׳¨׳׳©׳•׳: ׳‘׳—׳¨/׳™ ׳ ׳™׳¡׳•׳— ׳˜׳•׳˜׳׳׳™׳•׳× ׳©׳¢׳•׳©׳” "׳›׳" ׳׳‘׳₪׳ ׳™׳.',
        feedbackTone: 'info',
        uiHebrewIssues: []
    });

    let saved = {};
    try {
        saved = JSON.parse(localStorage.getItem(WR2_SQHCEL_STORAGE_KEY) || '{}') || {};
    } catch (error) {
        saved = {};
    }

    const state = {
        seedScenes: WR2W_SEED_DIALOGS.map((scene, i) => wr2wNormalizeScene(scene, `wr2w_seed_${i}`)).filter(Boolean),
        customScenes: (Array.isArray(saved.customScenes) ? saved.customScenes : [])
            .map((scene, i) => wr2wNormalizeScene(scene, `wr2w_saved_${i}`))
            .filter(Boolean)
            .slice(0, 16),
        index: Math.max(0, Math.floor(Number(saved.index) || 0)),
        streak: Math.max(0, Math.floor(Number(saved.streak) || 0)),
        points: Math.max(0, Math.floor(Number(saved.points) || 0)),
        analytics: wr2wPathCore.createDefaultAnalytics(saved.analytics),
        lastChosenPath: String(saved.lastChosenPath || saved.chosen_path || ''),
        round: createRoundState()
    };
    const displayWarnings = [];

    const allScenes = () => [...state.seedScenes, ...state.customScenes];

    const currentScene = () => {
        const scenes = allScenes();
        if (!scenes.length) return null;
        if (state.index >= scenes.length) state.index = 0;
        return scenes[state.index];
    };

    const hydrateSeedScenesFromPack = async () => {
        const packedSeedScenes = await wr2wLoadSeedScenesFromPack();
        if (!packedSeedScenes.length) return;
        const normalizedPack = packedSeedScenes
            .map((scene, i) => wr2wNormalizeScene(scene, `wr2w_pack_${i}`))
            .filter(Boolean);
        if (!normalizedPack.length) return;
        state.seedScenes = normalizedPack;
        if (state.index >= allScenes().length) state.index = 0;
        resetRoundState();
        setFeedback(`׳ ׳˜׳¢׳ ׳• ${normalizedPack.length} ׳“׳™׳׳׳•׳’׳™׳ ׳׳—׳‘׳™׳׳” ׳”׳׳•׳¨׳—׳‘׳×.`, 'info');
        render();
    };

    const persist = () => {
        localStorage.setItem(WR2_SQHCEL_STORAGE_KEY, JSON.stringify({
            index: state.index,
            streak: state.streak,
            points: state.points,
            customScenes: state.customScenes,
            analytics: state.analytics,
            lastChosenPath: state.lastChosenPath || state.round.pathChoice || '',
            chosen_path: state.round.pathChoice || state.lastChosenPath || ''
        }));
    };

    const setFeedback = (message, tone = 'info') => {
        const report = wr2wHebrewSanitize.hasObviousHebrewTypos(String(message || ''));
        if (!report.ok) {
            wr2wLogHebrewIssues('ui.feedback', message);
        }
        state.round.uiHebrewIssues = report.ok ? [] : report.issues;
        state.round.feedback = wr2wSanitizeText(message);
        state.round.feedbackTone = tone;
    };

    const resetDisplayWarnings = () => {
        displayWarnings.length = 0;
    };

    const sanitizeForDisplay = (context, value) => {
        const raw = String(value || '');
        const report = wr2wHebrewSanitize.hasObviousHebrewTypos(raw);
        if (!report.ok) {
            displayWarnings.push({ context, issues: report.issues });
        }
        return wr2wSanitizeText(raw);
    };

    const renderHebrewWarningBadge = () => {
        if (!els.hebrewWarning) return;
        if (!displayWarnings.length) {
            els.hebrewWarning.classList.add('hidden');
            els.hebrewWarning.removeAttribute('title');
            return;
        }
        const issueText = displayWarnings
            .flatMap((item) => item.issues || [])
            .join(', ');
        els.hebrewWarning.classList.remove('hidden');
        els.hebrewWarning.setAttribute('title', `׳–׳•׳”׳• ׳•׳×׳•׳§׳ ׳• ׳‘׳×׳¦׳•׳’׳”: ${issueText}`);
    };

    const markCriterion = (criterionKey) => {
        if (state.round.criteria[criterionKey]) return;
        state.round.criteria[criterionKey] = true;
        playUISound('next');
    };

    const resetRoundState = () => {
        state.round = createRoundState();
        const scene = currentScene();
        if (scene) {
            state.round.hypothesisDraft = wr2wBuildHypothesisSkeleton(scene, '___');
        }
    };

    const applyAutoLearningDrafts = (scene, force = false) => {
        const pathChoice = String(state.round.pathChoice || '').toLowerCase();
        if (!scene || !['outside', 'inside', 'both'].includes(pathChoice)) return false;

        const generated = wr2wComposeAutoLearning(pathChoice, scene, state.round);
        if (pathChoice === 'outside') {
            const hasDraft = String(state.round.learningOutsideDraft || state.round.learningDraft || '').trim().length > 0;
            if (hasDraft && !force) return false;
            state.round.learningOutsideDraft = generated.outsideText;
            state.round.learningDraft = generated.outsideText;
            return true;
        }
        if (pathChoice === 'inside') {
            const hasDraft = String(state.round.learningInsideDraft || state.round.learningDraft || '').trim().length > 0;
            if (hasDraft && !force) return false;
            state.round.learningInsideDraft = generated.insideText;
            state.round.learningDraft = generated.insideText;
            return true;
        }

        const hasBothDrafts = Boolean(
            String(state.round.learningOutsideDraft || '').trim()
            && String(state.round.learningInsideDraft || '').trim()
        );
        if (hasBothDrafts && !force) return false;
        state.round.learningOutsideDraft = generated.outsideText;
        state.round.learningInsideDraft = generated.insideText;
        return true;
    };

    const finalizeRound = (scene) => {
        const scoreResult = wr2wPathCore.computeRoundScore({
            criteria: state.round.criteria,
            pathChoice: state.round.pathChoice,
            bothLearningComplete: state.round.bothLearningComplete
        });
        const completed = scoreResult.completed;
        const penalty = Math.max(0, Number(state.round.penaltyPoints || 0));
        const earned = Math.max(0, scoreResult.total - penalty);
        state.round.completedCount = completed;
        state.round.roundScore = earned;
        state.points += earned;
        state.lastChosenPath = state.round.pathChoice || state.lastChosenPath;
        state.analytics = wr2wPathCore.recordPathChoice(state.analytics, state.round.pathChoice, scene?.id);

        if (completed === 6) {
            state.streak += 1;
            playUISound('correct');
            if (state.streak > 0 && state.streak % 3 === 0) {
                addStars(1);
                playUISound('stars_soft');
            }
        } else {
            state.streak = 0;
            playUISound('hint');
        }

        addXP(Math.max(4, completed * 2));
        state.round.step = 'DONE';
        const bonusText = [
            scoreResult.pathPoint ? '+1 PATH' : '',
            scoreResult.bothBonus ? '+1 BOTH' : '',
            penalty ? `-${penalty} ׳§׳ ׳¡` : ''
        ].filter(Boolean).join(' | ');
        setFeedback(`׳¡׳™׳›׳•׳ ׳¡׳‘׳‘: ${completed}/6 ׳§׳¨׳™׳˜׳¨׳™׳•׳ ׳™׳, +${earned} ׳ ׳§׳•׳“׳•׳×${bonusText ? ` (${bonusText})` : ''}.`, 'success');
        persist();

        if (!state.round.learningFinal && scene?.transformedSentence) {
            state.round.learningFinal = scene.transformedSentence;
        }
    };

    const renderSelfList = () => {
        if (!els.selfList) return;
        els.selfList.innerHTML = '';
        const rows = [...state.customScenes]
            .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0))
            .slice(0, 5);
        if (!rows.length) return;
        rows.forEach((scene) => {
            const li = document.createElement('li');
            li.textContent = `ג€${scene.visibleSentence}ג€`;
            els.selfList.appendChild(li);
        });
    };

    const renderStepChips = () => {
        const criteria = state.round.criteria;
        const activeId = state.round.step === 'DONE' ? 'E' : state.round.step;
        els.stepChips.innerHTML = WR2W_FLOW_STEPS.map((step) => {
            const done = Boolean(criteria[step.criterion]);
            const active = step.id === activeId;
            return `<span class="wr2w-chip${done ? ' is-done' : ''}${active ? ' is-active' : ''}">${escapeHtml(step.label)}</span>`;
        }).join('');
    };

    const getTotalityMenuOptions = (scene) => {
        const base = WR2W_TOTALITY_MENU
            .map((item) => ({
                id: item.id,
                axis: item.axis,
                text: wr2wSanitizeText(item.text)
            }))
            .filter((item) => item.text.length > 0);
        const dynamicRaw = Array.isArray(scene?.quantifiers) ? scene.quantifiers : [];
        const dynamic = dynamicRaw
            .map((q, idx) => wr2wSanitizeText(String(q || '').trim()))
            .filter(Boolean)
            .slice(0, 2)
            .map((q, idx) => ({
                id: `scene_${idx + 1}`,
                axis: '׳׳•׳× ׳׳”׳¡׳¦׳ ׳”',
                text: q
            }));

        const custom = base.find((item) => item.id === 'custom');
        const withoutCustom = base.filter((item) => item.id !== 'custom');
        return [...withoutCustom, ...dynamic, ...(custom ? [custom] : [])];
    };

    const updateLayerFocus = () => {
        const step = state.round.step;
        const map = {
            S: ['inside'],
            Q: ['quantifier'],
            H: ['quantifier', 'inside'],
            C: ['outside', 'quantifier', 'inside'],
            P: ['outside', 'inside', 'quantifier'],
            E: ['outside', 'inside', 'quantifier'],
            DONE: []
        };
        const active = new Set(map[step] || []);
        const layerMap = [
            ['outside', els.layerOutside],
            ['inside', els.layerInside],
            ['quantifier', els.layerQuantifier]
        ];
        layerMap.forEach(([key, el]) => {
            if (!el) return;
            el.classList.toggle('is-active', active.has(key));
        });
    };

    const renderStepContent = (scene) => {
        if (!scene) return '';
        const step = state.round.step;
        if (step === 'S') {
            const chosenFeeling = String(state.round.feeling || '').trim();
            const useCustomFeeling = chosenFeeling && !WR2W_FEELINGS.includes(chosenFeeling);
            return `
                <p class="wr2w-template-note">׳©׳׳•׳© ׳©׳›׳‘׳•׳× ׳‘׳×׳¨׳’׳™׳: ׳₪׳ ׳™׳ (׳—׳•׳•׳™׳”), ׳—׳•׳¥ (׳¢׳•׳‘׳“׳•׳×), ׳•׳“׳™׳‘׳•׳¨ (׳”׳׳₪׳” ׳”׳׳™׳׳•׳׳™׳×).</p>
                <div class="wr2w-option-grid">
                    ${WR2W_FEELINGS.map((feeling) => `
                        <button type="button" class="wr2w-option-btn${state.round.feeling === feeling ? ' is-selected' : ''}" data-action="select-feeling" data-feeling="${escapeHtml(feeling)}">${escapeHtml(feeling)}</button>
                    `).join('')}
                </div>
                ${state.round.feeling === '׳׳—׳¨' || useCustomFeeling ? `
                    <input id="wr2w-feeling-custom" class="wr2w-inline-input" type="text" placeholder="׳׳” ׳¢׳•׳׳” ׳‘׳’׳•׳£ ׳¢׳›׳©׳™׳•?" value="${escapeHtml(useCustomFeeling ? chosenFeeling : '')}">
                ` : ''}
                <button type="button" class="btn btn-primary wr2w-main-btn" data-action="goto-q" ${chosenFeeling ? '' : 'disabled'}>׳”׳׳©׳ ׳׳©׳׳‘ Q</button>
            `;
        }
        if (step === 'Q') {
            const quantifierOptions = getTotalityMenuOptions(scene);
            const chosenQuantifier = String(state.round.selectedQuantifier || '').trim();
            const useCustomQuantifier = chosenQuantifier
                && !quantifierOptions.some((item) => item.text === chosenQuantifier);
            return `
                <p class="wr2w-template-note">׳׳™׳–׳” ׳ ׳™׳¡׳•׳— ׳˜׳•׳˜׳׳׳™׳•׳× ׳¢׳•׳©׳” "׳›׳" ׳₪׳ ׳™׳׳™? ׳׳₪׳©׳¨ ׳׳‘׳—׳•׳¨ ׳×׳₪׳¨׳™׳˜ ׳׳• ׳׳ ׳¡׳— ׳׳©׳׳.</p>
                <div class="wr2w-option-grid">
                    ${quantifierOptions.map((item) => `
                        <button
                            type="button"
                            class="wr2w-option-btn${state.round.selectedQuantifier === item.text ? ' is-selected' : ''}"
                            data-action="select-quantifier"
                            data-quantifier="${escapeHtml(item.text)}"
                            data-axis="${escapeHtml(item.axis)}"
                        >
                            <strong>${escapeHtml(item.axis)}</strong>
                            <span>${escapeHtml(item.text)}</span>
                        </button>
                    `).join('')}
                </div>
                ${state.round.selectedQuantifier === '׳׳—׳¨' || useCustomQuantifier ? `
                    <input id="wr2w-quantifier-custom" class="wr2w-inline-input" type="text" placeholder="׳ ׳™׳¡׳•׳— ׳˜׳•׳˜׳׳׳™׳•׳× ׳׳™׳©׳™ (׳¦׳™׳¨ ׳–׳׳/׳₪׳¢׳•׳׳”/׳׳™׳׳™׳/׳׳ ׳©׳™׳/׳”׳§׳©׳¨)" value="${escapeHtml(useCustomQuantifier ? chosenQuantifier : '')}">
                ` : ''}
                <button type="button" class="btn btn-primary wr2w-main-btn" data-action="goto-h" ${chosenQuantifier ? '' : 'disabled'}>׳”׳׳©׳ ׳׳©׳׳‘ H</button>
            `;
        }
        if (step === 'H') {
            const templates = [
                {
                    id: 'climate',
                    label: '׳˜׳׳₪׳׳˜ ׳׳§׳׳™׳',
                    text: "׳¢׳•׳׳” ׳׳™ ׳©׳›׳©׳׳× ׳׳•׳׳¨׳× '___' ׳™׳© ׳›׳׳ ׳›׳׳× ׳ ׳¡׳×׳¨ ׳›׳׳• '___', ׳©׳׳×׳׳¨ ׳׳§׳׳™׳ ׳‘׳₪׳ ׳™׳. ׳–׳” ׳§׳¨׳•׳‘?"
                },
                {
                    id: 'weight',
                    label: '׳˜׳׳₪׳׳˜ ׳׳©׳§׳',
                    text: "׳¢׳•׳׳” ׳׳™ ׳©'___' ׳׳ ׳׳×׳׳¨ ׳¨׳§ ׳×׳“׳™׳¨׳•׳× ׳‘׳—׳•׳¥, ׳׳׳ ׳׳©׳§׳ ׳‘׳₪׳ ׳™׳. ׳–׳” ׳§׳¨׳•׳‘?"
                },
                {
                    id: 'bridge',
                    label: '׳˜׳׳₪׳׳˜ ׳—׳•׳¥ג†”׳₪׳ ׳™׳',
                    text: "׳¢׳•׳׳” ׳׳™ ׳©׳׳” ׳©׳§׳•׳¨׳” ׳‘׳—׳•׳¥ ׳׳×׳•׳¨׳’׳ ׳׳¦׳׳ ׳‘׳₪׳ ׳™׳ ׳›'___'. ׳–׳” ׳׳” ׳©׳”׳×׳›׳•׳•׳ ׳×?"
                }
            ];
            return `
                <div class="wr2w-template-buttons">
                    ${templates.map((tpl) => `
                        <button type="button" class="btn btn-secondary wr2w-template-btn" data-action="insert-h-template" data-template="${tpl.id}">
                            ${escapeHtml(tpl.label)}
                        </button>
                    `).join('')}
                </div>
                <textarea id="wr2w-hypothesis-input" class="wr2w-textarea" rows="4" placeholder="׳×׳ ׳׳™ ׳׳‘׳“׳•׳§ ׳׳ ׳׳ ׳™ ׳׳“׳™׳™׳§.">${escapeHtml(state.round.hypothesisDraft)}</textarea>
                <button type="button" class="btn btn-primary wr2w-main-btn" data-action="submit-hypothesis">׳‘׳“׳•׳§ ׳“׳™׳•׳§</button>
            `;
        }
        if (step === 'C') {
            const confirmation = state.round.confirmation;
            const confirmStatus = String(confirmation?.status || '');
            const snapshot = state.round.realitySnapshot || wr2wBuildRealitySnapshot(scene, state.round);
            const canEnterPath = wr2wPathCore.canEnterPath(state.round) && Boolean(state.round.integrativeApproved);
            const canValidateIntegrative = Boolean(confirmation && state.round.confirmResolved);
            const correctionsLeft = Math.max(0, 2 - Number(state.round.confirmCorrections || 0));
            const integrativeValue = String(state.round.integrativeDraft || state.round.integrativeFinal || wr2wBuildIntegrativeSkeleton(snapshot));
            return `
                <div class="wr2w-quote-box">
                    <strong>׳׳©׳₪׳˜ ׳׳’׳©׳¨:</strong>
                    <p>${escapeHtml(state.round.hypothesisFinal || state.round.hypothesisDraft)}</p>
                </div>
                <div class="wr2w-patient-box" data-status="${escapeHtml(confirmStatus || 'partial')}">
                    <strong>׳”׳×׳’׳•׳‘׳”:</strong>
                    <p>${escapeHtml(sanitizeForDisplay('patient.confirm', confirmation?.text || '׳¢׳“׳™׳™׳ ׳׳ ׳ ׳•׳¦׳¨׳” ׳×׳’׳•׳‘׳× ׳׳˜׳•׳₪׳.'))}</p>
                </div>
                <div class="wr2w-quote-box">
                    <strong>Filter + Paradox (׳‘׳׳™ ׳׳©׳׳”):</strong>
                    <p>${escapeHtml(snapshot.filterLine)}</p>
                    <p>${escapeHtml(snapshot.paradoxLine)}</p>
                </div>
                <div class="wr2w-patient-box" data-status="partial">
                    <strong>Reality Check (׳—׳•׳¥):</strong>
                    <p>׳׳×׳•׳ ${snapshot.outOf}, ׳™׳© ׳‘׳¢׳¨׳ ${snapshot.attempts} ׳ ׳™׳¡׳™׳•׳ ׳•׳× (׳’׳ ׳§׳˜׳ ׳™׳).</p>
                    <p>׳׳•׳× ׳׳—׳¨׳•׳ ׳׳”׳—׳•׳¥: ${escapeHtml(sanitizeForDisplay('patient.external.signal', snapshot.signal))}</p>
                    <p>${escapeHtml(snapshot.insideLine)}</p>
                </div>
                <div class="wr2w-confirm-grid">
                    <button type="button" class="wr2w-confirm-btn${confirmStatus === 'yes' ? ' is-selected' : ''}" data-action="confirm-response" data-status="yes" ${confirmation ? '' : 'disabled'}>ג… ׳›׳</button>
                    <button type="button" class="wr2w-confirm-btn${confirmStatus === 'partial' ? ' is-selected' : ''}" data-action="confirm-response" data-status="partial" ${confirmation ? '' : 'disabled'}>נ¨ ׳‘׳¢׳¨׳</button>
                    <button type="button" class="wr2w-confirm-btn${confirmStatus === 'no' ? ' is-selected' : ''}" data-action="confirm-response" data-status="no" ${confirmation ? '' : 'disabled'}>ג ׳׳</button>
                </div>
                ${!confirmation ? `
                    <button type="button" class="btn btn-secondary wr2w-main-btn" data-action="send-hypothesis">׳¦׳•׳¨ ׳×׳’׳•׳‘׳× ׳׳˜׳•׳₪׳</button>
                ` : ''}
                <label class="wr2w-learning-label" for="wr2w-integrative-input">׳׳©׳₪׳˜ ׳׳™׳ ׳˜׳’׳¨׳˜׳™׳‘׳™: ׳—׳•׳¥ + ׳₪׳ ׳™׳ = ׳×׳§׳™׳¢׳•׳×</label>
                <textarea id="wr2w-integrative-input" class="wr2w-textarea" rows="4" placeholder="׳‘׳—׳•׳¥..., ׳•׳‘׳₪׳ ׳™׳..., ׳•׳›׳©׳–׳” ׳ ׳₪׳’׳© ׳ ׳•׳¦׳¨׳× ׳”׳×׳§׳™׳¢׳•׳×...">${escapeHtml(integrativeValue)}</textarea>
                <button type="button" class="btn btn-secondary wr2w-main-btn" data-action="validate-integrative" ${canValidateIntegrative ? '' : 'disabled'}>׳׳©׳¨ ׳׳©׳₪׳˜ ׳׳™׳ ׳˜׳’׳¨׳˜׳™׳‘׳™</button>
                ${canEnterPath ? `
                    <button type="button" class="btn btn-primary wr2w-main-btn" data-action="goto-path">׳”׳׳©׳ ׳׳©׳׳‘ PATH</button>
                ` : `
                    <p class="wr2w-template-note">׳׳₪׳ ׳™ PATH ׳ ׳“׳¨׳©: 1) ׳×׳’׳•׳‘׳× ׳׳˜׳•׳₪׳, 2) ׳׳©׳₪׳˜ ׳׳™׳ ׳˜׳’׳¨׳˜׳™׳‘׳™ ׳׳׳•׳©׳¨. ׳ ׳•׳×׳¨׳• ${correctionsLeft} ׳×׳™׳§׳•׳ ׳™ C.</p>
                    <button type="button" class="btn btn-secondary wr2w-main-btn" data-action="revise-hypothesis">׳—׳–׳¨׳” ׳-H</button>
                `}
            `;
        }
        if (step === 'P') {
            const selected = state.round.pathChoice || '';
            return `
                <p class="wr2w-path-question">
                    ׳¢׳›׳©׳™׳• ׳™׳© ׳׳ ׳• ׳”׳׳™׳׳”. ׳׳׳ ׳×׳¨׳¦׳” ׳©׳ ׳׳ ׳§׳•׳“׳?
                </p>
                <div class="wr2w-path-grid">
                    <button type="button" class="wr2w-path-btn${selected === 'outside' ? ' is-selected' : ''}" data-action="select-path" data-path="outside">
                        <strong>׳׳׳¦׳™׳׳•׳× ׳”׳—׳™׳¦׳•׳ ׳™׳×</strong>
                        <small>׳¢׳•׳‘׳“׳•׳×, ׳×׳₪׳§׳•׳“, ׳’׳‘׳•׳׳•׳×</small>
                    </button>
                    <button type="button" class="wr2w-path-btn${selected === 'inside' ? ' is-selected' : ''}" data-action="select-path" data-path="inside">
                        <strong>׳׳׳¦׳™׳׳•׳× ׳”׳₪׳ ׳™׳׳™׳×</strong>
                        <small>׳’׳•׳£, ׳¨׳’׳©, ׳•׳™׳¡׳•׳×</small>
                    </button>
                    <button type="button" class="wr2w-path-btn${selected === 'both' ? ' is-selected' : ''}" data-action="select-path" data-path="both">
                        <strong>׳׳’׳©׳¨ ׳‘׳™׳ ׳©׳ ׳™׳”׳</strong>
                        <small>׳¦׳¢׳“ ׳§׳˜׳ ׳‘׳›׳ ׳¦׳“</small>
                    </button>
                </div>
                <button type="button" class="btn btn-primary wr2w-main-btn" data-action="goto-e" ${selected ? '' : 'disabled'}>׳”׳׳©׳ ׳׳©׳׳‘ E/L</button>
            `;
        }
        if (step === 'E') {
            const pathChoice = state.round.pathChoice || '';
            const pathLabel = pathChoice === 'outside'
                ? '׳׳׳¦׳™׳׳•׳× ׳”׳—׳™׳¦׳•׳ ׳™׳×'
                : pathChoice === 'inside'
                    ? '׳׳׳¦׳™׳׳•׳× ׳”׳₪׳ ׳™׳׳™׳×'
                    : pathChoice === 'both'
                        ? '׳׳’׳©׳¨ ׳‘׳™׳ ׳©׳ ׳™׳”׳'
                        : '׳׳ ׳ ׳‘׳—׳¨';
            return `
                <p class="wr2w-template-note">PATH ׳ ׳‘׳—׳¨: <strong>${escapeHtml(pathLabel)}</strong></p>
                <p class="wr2w-template-note">E ג€” ׳׳™׳₪׳” ׳–׳” 1% ׳₪׳—׳•׳× ׳ ׳›׳•׳?</p>
                <div class="wr2w-ladder">
                    ${WR2W_BREAKOUT_STEPS.map((item) => `
                        <button type="button" class="wr2w-ladder-btn${state.round.breakoutLevel === item.id ? ' is-selected' : ''}" data-action="set-breakout-level" data-level="${item.id}">
                            ${escapeHtml(item.label)}
                        </button>
                    `).join('')}
                </div>
                <p class="wr2w-ladder-prompt">${escapeHtml(WR2W_BREAKOUT_STEPS[state.round.breakoutLevel].prompt)}</p>
                <button type="button" class="btn btn-primary wr2w-main-btn" data-action="send-breakout">׳©׳׳/׳™ ׳׳× ׳”׳׳˜׳•׳₪׳</button>

                ${state.round.lastProbe ? `
                    <div class="wr2w-patient-box" data-status="${state.round.lastProbe.found ? 'yes' : 'no'}">
                        <strong>׳׳˜׳•׳₪׳:</strong>
                        <p>${escapeHtml(sanitizeForDisplay('patient.probe', state.round.lastProbe.text))}</p>
                    </div>
                ` : ''}

                ${state.round.breakoutFound ? `
                    <button type="button" class="btn btn-secondary wr2w-main-btn" data-action="autofill-learning">׳¦׳•׳¨ ׳ ׳™׳¡׳•׳— ׳׳•׳˜׳•׳׳˜׳™ ׳׳”׳×׳©׳׳•׳</button>
                    <p class="wr2w-template-note">L ג€” ׳׳– ׳–׳” ׳׳ '___', ׳–׳” ׳‘׳¢׳™׳§׳¨ ׳›׳©___.</p>
                    ${pathChoice === 'outside' ? `
                        <textarea id="wr2w-learning-outside-input" class="wr2w-textarea" rows="3" placeholder="׳׳– ׳–׳” ׳׳ '___', ׳–׳” ׳‘׳¢׳™׳§׳¨ ׳›׳©___">${escapeHtml(state.round.learningOutsideDraft || state.round.learningDraft)}</textarea>
                    ` : pathChoice === 'inside' ? `
                        <textarea id="wr2w-learning-inside-input" class="wr2w-textarea" rows="3" placeholder="׳׳– ׳–׳” ׳׳ '___', ׳–׳” ׳‘׳¢׳™׳§׳¨ ׳›׳©___">${escapeHtml(state.round.learningInsideDraft || state.round.learningDraft)}</textarea>
                    ` : `
                        <label class="wr2w-learning-label" for="wr2w-learning-outside-input">׳׳׳¦׳™׳׳•׳× ׳”׳—׳™׳¦׳•׳ ׳™׳×</label>
                        <textarea id="wr2w-learning-outside-input" class="wr2w-textarea" rows="3" placeholder="׳׳– ׳–׳” ׳׳ '___', ׳–׳” ׳‘׳¢׳™׳§׳¨ ׳›׳©___">${escapeHtml(state.round.learningOutsideDraft)}</textarea>
                        <label class="wr2w-learning-label" for="wr2w-learning-inside-input">׳׳׳¦׳™׳׳•׳× ׳”׳₪׳ ׳™׳׳™׳×</label>
                        <textarea id="wr2w-learning-inside-input" class="wr2w-textarea" rows="3" placeholder="׳׳– ׳–׳” ׳׳ '___', ׳–׳” ׳‘׳¢׳™׳§׳¨ ׳›׳©___">${escapeHtml(state.round.learningInsideDraft)}</textarea>
                    `}
                    <button type="button" class="btn btn-primary wr2w-main-btn" data-action="finish-round">׳¡׳™׳™׳ ׳¡׳‘׳‘</button>
                ` : ''}
            `;
        }

        const items = Object.entries(state.round.criteria).map(([key, done]) => `
            <li class="${done ? 'is-done' : ''}">
                ${done ? 'ג…' : 'ג–«ן¸'} ${escapeHtml(WR2W_CRITERIA_LABELS[key] || key)}
            </li>
        `).join('');
        return `
            <div class="wr2w-done-box">
                <p><strong>׳ ׳™׳§׳•׳“ ׳¡׳‘׳‘:</strong> +${state.round.roundScore} | <strong>׳×׳”׳׳™׳:</strong> ${state.round.completedCount}/6</p>
                <p><strong>׳׳©׳₪׳˜ ׳׳™׳ ׳˜׳’׳¨׳˜׳™׳‘׳™:</strong> ${escapeHtml(sanitizeForDisplay('round.integrative', state.round.integrativeFinal || '׳׳ ׳”׳•׳©׳׳'))}</p>
                <p><strong>׳׳©׳₪׳˜ ׳׳׳™׳“׳”:</strong> ${escapeHtml(sanitizeForDisplay('round.learning', state.round.learningFinal || scene.transformedSentence))}</p>
                ${state.round.pathChoice === 'both' ? `
                    <p><strong>׳׳׳¦׳™׳׳•׳× ׳”׳—׳™׳¦׳•׳ ׳™׳×:</strong> ${escapeHtml(sanitizeForDisplay('round.outside', state.round.learningOutsideFinal || state.round.learningOutsideDraft || '---'))}</p>
                    <p><strong>׳׳׳¦׳™׳׳•׳× ׳”׳₪׳ ׳™׳׳™׳×:</strong> ${escapeHtml(sanitizeForDisplay('round.inside', state.round.learningInsideFinal || state.round.learningInsideDraft || '---'))}</p>
                ` : ''}
                <ul class="wr2w-criteria-list">${items}</ul>
                <button type="button" class="btn btn-primary wr2w-main-btn" data-action="next-scene-inline">׳׳¢׳‘׳¨ ׳׳׳©׳₪׳˜ ׳”׳‘׳</button>
            </div>
        `;
    };

    const render = () => {
        const scene = currentScene();
        if (!scene) {
            root.innerHTML = '<p>׳׳™׳ ׳›׳¨׳’׳¢ ׳׳©׳₪׳˜׳™׳ ׳–׳׳™׳ ׳™׳ ׳׳×׳¨׳’׳•׳.</p>';
            return;
        }
        resetDisplayWarnings();
        if (Array.isArray(state.round.uiHebrewIssues) && state.round.uiHebrewIssues.length) {
            displayWarnings.push({ context: 'ui.feedback', issues: state.round.uiHebrewIssues });
        }

        const processCount = wr2wProcessCount(state.round.criteria);
        if (els.processScore) els.processScore.textContent = `${processCount}/6`;
        if (els.streak) els.streak.textContent = String(state.streak);
        if (els.points) els.points.textContent = String(state.points);
        if (els.pathDistribution) {
            const pathChoices = state.analytics?.pathChoices || {};
            els.pathDistribution.textContent = `${pathChoices.outside || 0}/${pathChoices.inside || 0}/${pathChoices.both || 0}`;
        }
        if (els.stuckDistribution) {
            const stuck = state.analytics?.stuck || {};
            els.stuckDistribution.textContent = `${stuck.H || 0}/${stuck.C || 0}`;
        }
        if (els.monologue) els.monologue.textContent = sanitizeForDisplay('scene.monologue', scene.monologue);
        if (els.visibleSentence) els.visibleSentence.textContent = sanitizeForDisplay('scene.visible', scene.visibleSentence);

        const stepMeta = {
            S: {
                title: 'S ג€” ׳׳” ׳§׳•׳¨׳” ׳‘׳₪׳ ׳™׳?',
                instruction: '׳©׳׳‘ 1: ׳׳™׳×׳•׳× ׳’׳•׳£/׳¨׳’׳©. ׳›׳׳ ׳׳ ׳׳×׳§׳ ׳™׳ ׳•׳׳ ׳׳×׳•׳•׳›׳—׳™׳.'
            },
            Q: {
                title: 'Q ג€” ׳׳” ׳׳©׳×׳׳¢?',
                instruction: '׳©׳׳‘ 2: ׳×׳₪׳¨׳™׳˜ ׳˜׳•׳˜׳׳׳™׳•׳× (׳–׳׳/׳₪׳¢׳•׳׳”/׳׳™׳׳™׳/׳׳ ׳©׳™׳/׳”׳§׳©׳¨). ׳׳” ׳¢׳•׳©׳” "׳›׳" ׳₪׳ ׳™׳׳™?'
            },
            H: {
                title: 'H ג€” ׳׳©׳₪׳˜ ׳׳’׳©׳¨',
                instruction: '׳©׳׳‘ 3: ׳•׳׳™׳“׳¦׳™׳” ׳׳׳׳” ׳׳—׳•׳•׳™׳” ׳”׳׳•׳—׳׳˜׳× + ׳‘׳“׳™׳§׳× ׳”׳׳™׳׳”. ׳¢׳“׳™׳™׳ ׳‘׳׳™ Fact-check ׳—׳™׳¦׳•׳ ׳™.'
            },
            C: {
                title: 'C ג€” ׳‘׳“׳™׳§׳× ׳“׳™׳•׳§',
                instruction: '׳©׳׳‘׳™׳ 4-6: Filter + Paradox + Reality Check, ׳•׳׳– ׳׳©׳₪׳˜ ׳׳™׳ ׳˜׳’׳¨׳˜׳™׳‘׳™ (׳—׳•׳¥ + ׳₪׳ ׳™׳ = ׳×׳§׳™׳¢׳•׳×).'
            },
            P: {
                title: 'PATH ג€” ׳׳׳ ׳”׳•׳׳›׳™׳ ׳§׳•׳“׳?',
                instruction: '׳¦׳•׳׳× ׳‘׳—׳™׳¨׳”: ׳—׳•׳¥ / ׳₪׳ ׳™׳ / ׳’׳©׳¨, ׳׳—׳¨׳™ ׳©׳™׳© ׳׳₪׳” ׳׳™׳ ׳˜׳’׳¨׳˜׳™׳‘׳™׳×.'
            },
            E: {
                title: 'E/L ג€” ׳—׳¨׳™׳’ ׳•׳׳׳™׳“׳”',
                instruction: 'E: ׳׳™׳₪׳” ׳–׳” 1% ׳₪׳—׳•׳× ׳ ׳›׳•׳? L: ׳׳– ׳–׳” ׳׳ "___", ׳–׳” ׳‘׳¢׳™׳§׳¨ ׳›׳©___.'
            },
            DONE: {
                title: '׳¡׳™׳›׳•׳ ׳¡׳‘׳‘',
                instruction: '׳׳” ׳¢׳‘׳“ ׳‘׳¡׳‘׳‘ ׳”׳–׳” ׳•׳׳” ׳׳₪׳©׳¨ ׳׳©׳₪׳¨ ׳‘׳¡׳‘׳‘ ׳”׳‘׳.'
            }
        };

        const currentStepKey = stepMeta[state.round.step] ? state.round.step : 'DONE';
        if (els.stepTitle) els.stepTitle.textContent = sanitizeForDisplay('ui.step.title', stepMeta[currentStepKey].title);
        if (els.stepInstruction) els.stepInstruction.textContent = sanitizeForDisplay('ui.step.instruction', stepMeta[currentStepKey].instruction);
        if (els.stepBody) els.stepBody.innerHTML = renderStepContent(scene);
        if (els.feedback) {
            els.feedback.textContent = sanitizeForDisplay('ui.feedback.render', state.round.feedback || '');
            els.feedback.setAttribute('data-tone', state.round.feedbackTone || 'info');
        }

        updateLayerFocus();
        renderHebrewWarningBadge();
        renderStepChips();
        renderSelfList();
        persist();
    };

    const nextScene = () => {
        const scenes = allScenes();
        if (!scenes.length) return;
        state.index = (state.index + 1) % scenes.length;
        resetRoundState();
        setFeedback('׳¡׳‘׳‘ ׳—׳“׳©. ׳׳×׳—׳™׳׳™׳ ׳©׳•׳‘ ׳‘׳–׳™׳”׳•׳™ ׳×׳—׳•׳©׳” (S).', 'info');
        render();
    };

    const addSelfSentence = () => {
        const raw = String(els.selfInput?.value || '').trim();
        if (raw.length < 8) {
            setFeedback('׳›׳×׳•׳‘/׳™ ׳׳©׳₪׳˜ ׳׳™׳©׳™ ׳§׳¦׳¨ (׳׳₪׳—׳•׳× 8 ׳×׳•׳•׳™׳).', 'warn');
            render();
            return;
        }
        const normalized = normalizeText(raw).replace(/\s+/g, ' ').trim();
        const exists = state.customScenes.some((scene) => normalizeText(scene.visibleSentence).replace(/\s+/g, ' ').trim() === normalized);
        if (exists) {
            setFeedback('׳”׳׳©׳₪׳˜ ׳”׳–׳” ׳›׳‘׳¨ ׳§׳™׳™׳ ׳‘׳×׳¨׳’׳•׳.', 'warn');
            render();
            return;
        }

        const scene = wr2wNormalizeScene({
            id: `wr2w_self_${Date.now()}`,
            source: 'self',
            monologue: raw,
            visibleSentence: raw,
            quantifiers: wr2InferQuantifiers(raw),
            exceptionExample: '׳›׳, ׳”׳™׳” ׳¨׳’׳¢ ׳§׳˜׳ ׳©׳–׳” ׳”׳™׳” ׳₪׳—׳•׳× ׳ ׳›׳•׳.',
            conditionsLine: '׳–׳” ׳”׳›׳™ ׳—׳–׳§ ׳›׳©׳™׳© ׳׳—׳¥/׳¢׳™׳™׳₪׳•׳×/׳׳™-׳•׳“׳׳•׳×.',
            transformedSentence: wr2SoftenSentence(raw),
            createdAt: Date.now()
        }, 'wr2w_self');
        if (!scene) return;

        state.customScenes.unshift(scene);
        if (state.customScenes.length > 16) state.customScenes = state.customScenes.slice(0, 16);
        state.index = allScenes().findIndex((item) => item.id === scene.id);
        if (state.index < 0) state.index = 0;
        if (els.selfInput) els.selfInput.value = '';
        resetRoundState();
        setFeedback('׳”׳׳©׳₪׳˜ ׳”׳׳™׳©׳™ ׳ ׳•׳¡׳£. ׳׳×׳—׳™׳׳™׳ ׳‘-S ׳¢׳ ׳׳™׳×׳•׳× ׳׳™-׳”׳׳™׳׳”.', 'success');
        playUISound('start');
        render();
    };

    const handleAction = (event) => {
        const button = event.target.closest('[data-action]');
        if (!button) return;
        const action = button.getAttribute('data-action');
        const scene = currentScene();
        if (!scene) return;

        if (action === 'select-feeling') {
            state.round.feeling = button.getAttribute('data-feeling') || '';
            markCriterion('signal');
            setFeedback(`׳ ׳¨׳©׳: ${state.round.feeling}.`, 'success');
            render();
            return;
        }
        if (action === 'goto-q') {
            const feelingText = String(state.round.feeling || '').trim();
            if (!feelingText || feelingText === '׳׳—׳¨') {
                setFeedback('׳‘׳—׳¨/׳™ ׳×׳—׳•׳©׳” ׳׳• ׳›׳×׳•׳‘/׳™ ׳×׳—׳•׳©׳” ׳׳©׳׳ ׳‘"׳׳—׳¨" ׳׳₪׳ ׳™ ׳”׳׳¢׳‘׳¨ ׳-Q.', 'warn');
                render();
                return;
            }
            state.round.step = 'Q';
            setFeedback('׳׳¢׳•׳׳”. ׳¢׳›׳©׳™׳• ׳‘׳—׳¨/׳™ ׳ ׳™׳¡׳•׳— ׳˜׳•׳˜׳׳׳™׳•׳× ׳׳×׳•׳ ׳”׳×׳₪׳¨׳™׳˜ ׳׳₪׳™ ׳”׳¦׳™׳¨ ׳©׳”׳›׳™ "׳›׳" ׳‘׳’׳•׳£.', 'info');
            render();
            return;
        }
        if (action === 'select-quantifier') {
            state.round.selectedQuantifier = button.getAttribute('data-quantifier') || '';
            state.round.selectedQuantifierAxis = button.getAttribute('data-axis') || '';
            markCriterion('quantifier');
            const axisLabel = state.round.selectedQuantifierAxis ? ` (${state.round.selectedQuantifierAxis})` : '';
            setFeedback(`Focusing-click: ׳ ׳‘׳—׳¨ ׳ ׳™׳¡׳•׳— ׳˜׳•׳˜׳׳׳™׳•׳×${axisLabel}: ${state.round.selectedQuantifier}`, 'success');
            render();
            return;
        }
        if (action === 'goto-h') {
            const quantifierText = String(state.round.selectedQuantifier || '').trim();
            if (!quantifierText || quantifierText === '׳׳—׳¨') {
                setFeedback('׳‘׳—׳¨/׳™ ׳›׳׳× ׳ ׳¡׳×׳¨ ׳׳• ׳›׳×׳•׳‘/׳™ ׳›׳׳× ׳׳©׳׳ ׳‘"׳׳—׳¨" ׳׳₪׳ ׳™ ׳”׳׳¢׳‘׳¨ ׳-H.', 'warn');
                render();
                return;
            }
            state.round.step = 'H';
            if (!state.round.hypothesisDraft || state.round.hypothesisDraft.includes('___')) {
                state.round.hypothesisDraft = wr2wBuildHypothesisSkeleton(scene, state.round.selectedQuantifier);
            }
            setFeedback('׳©׳׳‘ 3: ׳׳©׳¨/׳™ ׳׳× ׳”׳—׳•׳•׳™׳” ׳”׳׳•׳—׳׳˜׳× ׳‘׳׳™ ׳׳”׳×׳•׳•׳›׳— ׳¢׳ ׳”׳¢׳•׳‘׳“׳•׳× ׳¢׳“׳™׳™׳.', 'info');
            render();
            return;
        }
        if (action === 'insert-h-template') {
            const templateId = String(button.getAttribute('data-template') || '');
            const visibleSentence = String(scene.visibleSentence || '').trim();
            const selectedQuantifier = String(state.round.selectedQuantifier || '').trim() || '___';
            let template = '';

            if (templateId === 'climate') {
                template = `׳¢׳•׳׳” ׳׳™ ׳©׳›׳©׳׳× ׳׳•׳׳¨/׳× '${visibleSentence || '___'}' ׳™׳© ׳›׳׳ ׳›׳׳× ׳ ׳¡׳×׳¨ ׳›׳׳• '${selectedQuantifier}', ׳©׳׳×׳׳¨ ׳׳§׳׳™׳ ׳‘׳₪׳ ׳™׳. ׳–׳” ׳§׳¨׳•׳‘?`;
            } else if (templateId === 'weight') {
                template = `׳¢׳•׳׳” ׳׳™ ׳©'${selectedQuantifier}' ׳׳ ׳׳×׳׳¨ ׳¨׳§ ׳×׳“׳™׳¨׳•׳× ׳‘׳—׳•׳¥, ׳׳׳ ׳׳©׳§׳ ׳‘׳₪׳ ׳™׳. ׳–׳” ׳§׳¨׳•׳‘?`;
            } else if (templateId === 'bridge') {
                template = "׳¢׳•׳׳” ׳׳™ ׳©׳׳” ׳©׳§׳•׳¨׳” ׳‘׳—׳•׳¥ ׳׳×׳•׳¨׳’׳ ׳׳¦׳׳ ׳‘׳₪׳ ׳™׳ ׳›'___'. ׳–׳” ׳׳” ׳©׳”׳×׳›׳•׳•׳ ׳×?";
            }

            if (template) {
                state.round.hypothesisDraft = template;
                setFeedback('׳”׳˜׳׳₪׳׳˜ ׳”׳•׳–׳¨׳§ ׳׳©׳“׳”. ׳׳₪׳©׳¨ ׳׳“׳™׳™׳§ ׳•׳׳©׳׳•׳—.', 'info');
            }
            render();
            return;
        }
        if (action === 'submit-hypothesis') {
            const draft = String(state.round.hypothesisDraft || '').trim();
            if (draft.length < 20) {
                setFeedback('׳ ׳“׳¨׳© ׳ ׳™׳¡׳•׳— ׳׳׳ ׳™׳•׳×׳¨ ׳©׳ ׳”׳™׳₪׳•׳×׳–׳”.', 'warn');
                render();
                return;
            }
            const evalResult = wr2wEvaluatorAgent.evaluateHypothesis(draft, state.round.selectedQuantifier);
            if (!evalResult.ok) {
                state.analytics = wr2wPathCore.markStuck(state.analytics, 'H');
                const missing = [];
                if (!evalResult.hasOwnership) missing.push('׳‘׳¢׳׳•׳× (׳׳׳©׳: "׳¢׳•׳׳” ׳׳™...")');
                if (!evalResult.hasQuantifier) missing.push('׳”׳›׳׳× ׳©׳ ׳‘׳—׳¨');
                if (!evalResult.hasValidation) missing.push('׳׳™׳©׳•׳¨ ׳׳׳ ׳׳—׳•׳•׳™׳” ׳”׳›׳‘׳“׳” (׳›׳‘׳“/׳׳©׳×׳§/׳×׳•׳¦׳׳” ׳¡׳’׳•׳¨׳”)');
                if (!evalResult.hasCheck) missing.push('׳‘׳“׳™׳§׳” (׳׳׳©׳: "׳–׳” ׳§׳¨׳•׳‘... ׳׳• ׳©׳׳ ׳™ ׳׳©׳׳™׳?")');
                if (evalResult.hasPrematureFactCheck) {
                    state.round.penalties.prematureFactCheck += 1;
                    state.round.penaltyPoints += 2;
                    missing.push('׳׳ ׳‘׳•׳“׳§׳™׳ ׳¢׳•׳‘׳“׳•׳× ׳—׳•׳¥ ׳‘׳©׳׳‘ ׳–׳” (Fact-check ׳׳•׳§׳“׳)');
                }
                setFeedback(`׳¦׳¨׳™׳ ׳׳”׳©׳׳™׳: ${missing.join(' | ')}.`, 'warn');
                render();
                return;
            }
            state.round.hypothesisFinal = draft;
            state.round.confirmation = wr2wPatientAgent.confirmHypothesis(
                scene,
                state.round.hypothesisFinal,
                state.round.selectedQuantifier
            );
            state.round.lastConfirmSelection = '';
            state.round.confirmResolved = false;
            state.round.integrativeApproved = false;
            state.round.integrativeDraft = '';
            state.round.integrativeFinal = '';
            state.round.realitySnapshot = wr2wBuildRealitySnapshot(scene, state.round);
            markCriterion('hypothesis');
            state.round.step = 'C';
            setFeedback('׳ ׳•׳¦׳¨׳” ׳×׳’׳•׳‘׳× ׳׳˜׳•׳₪׳. ׳׳©׳¨/׳™ ׳”׳׳™׳׳”, ׳•׳׳– ׳‘׳ ׳”/׳™ ׳׳©׳₪׳˜ ׳׳™׳ ׳˜׳’׳¨׳˜׳™׳‘׳™ (׳—׳•׳¥ + ׳₪׳ ׳™׳ = ׳×׳§׳™׳¢׳•׳×).', 'success');
            render();
            return;
        }
        if (action === 'send-hypothesis') {
            if (!state.round.hypothesisFinal) {
                setFeedback('׳§׳•׳“׳ ׳‘׳¦׳¢/׳™ ׳‘׳“׳™׳§׳× ׳“׳™׳•׳§ ׳‘׳©׳׳‘ H.', 'warn');
                render();
                return;
            }
            state.round.confirmation = wr2wPatientAgent.confirmHypothesis(
                scene,
                state.round.hypothesisFinal,
                state.round.selectedQuantifier
            );
            state.round.realitySnapshot = wr2wBuildRealitySnapshot(scene, state.round);
            state.round.lastConfirmSelection = '';
            setFeedback('׳¢׳•׳“׳›׳ ׳” ׳×׳’׳•׳‘׳× ׳׳˜׳•׳₪׳. ׳‘׳—׳¨/׳™ ׳›׳ / ׳‘׳¢׳¨׳ / ׳׳.', 'info');
            render();
            return;
        }
        if (action === 'confirm-response') {
            const status = String(button.getAttribute('data-status') || '').toLowerCase();
            if (!['yes', 'partial', 'no'].includes(status) || !state.round.confirmation) {
                render();
                return;
            }
            if (state.round.lastConfirmSelection === status && !state.round.confirmResolved) {
                setFeedback('׳”׳×׳’׳•׳‘׳” ׳›׳‘׳¨ ׳ ׳¨׳©׳׳”. ׳׳₪׳©׳¨ ׳׳—׳–׳•׳¨ ׳-H ׳׳• ׳׳”׳×׳§׳“׳.', 'info');
                render();
                return;
            }
            state.round.confirmation = {
                ...state.round.confirmation,
                status
            };
            state.round.lastConfirmSelection = status;
            const tone = status === 'yes'
                ? 'success'
                : status === 'partial'
                    ? 'info'
                    : 'warn';
            if (status === 'yes') {
                state.round.confirmResolved = true;
                setFeedback('׳”׳×׳§׳‘׳ ׳׳™׳©׳•׳¨. ׳¢׳›׳©׳™׳• ׳׳©׳׳‘׳™׳ ׳—׳•׳¥+׳₪׳ ׳™׳ ׳׳׳©׳₪׳˜ ׳׳™׳ ׳˜׳’׳¨׳˜׳™׳‘׳™.', tone);
            } else {
                state.analytics = wr2wPathCore.markStuck(state.analytics, 'C');
                if (state.round.confirmCorrections < 2) {
                    state.round.confirmCorrections += 1;
                    if (state.round.confirmCorrections >= 2) {
                        state.round.confirmResolved = true;
                        setFeedback('׳”׳•׳©׳׳׳• 2 ׳×׳™׳§׳•׳ ׳™ C. ׳›׳¢׳× ׳‘׳ ׳”/׳™ ׳׳©׳₪׳˜ ׳׳™׳ ׳˜׳’׳¨׳˜׳™׳‘׳™ ׳׳₪׳ ׳™ PATH.', 'info');
                        render();
                        return;
                    }
                    state.round.confirmResolved = false;
                    const left = Math.max(0, 2 - state.round.confirmCorrections);
                    setFeedback(`׳‘׳—׳¨׳× "${status === 'partial' ? '׳‘׳¢׳¨׳' : '׳׳'}". ׳—׳–׳¨׳” ׳-H ׳׳“׳™׳™׳§ (׳ ׳•׳×׳¨׳• ${left} ׳×׳™׳§׳•׳ ׳™׳).`, tone);
                } else {
                    state.round.confirmResolved = true;
                    setFeedback('׳׳׳—׳¨ 2 ׳×׳™׳§׳•׳ ׳™׳ ׳׳׳©׳™׳›׳™׳ ׳¢׳ ׳›׳™׳•׳ ׳—׳׳§׳™. ׳¢׳“׳™׳™׳ ׳ ׳“׳¨׳© ׳׳©׳₪׳˜ ׳׳™׳ ׳˜׳’׳¨׳˜׳™׳‘׳™.', 'info');
                }
            }
            render();
            return;
        }
        if (action === 'validate-integrative') {
            if (!state.round.confirmation || !state.round.confirmResolved) {
                setFeedback('׳§׳•׳“׳ ׳׳©׳¨/׳™ ׳×׳’׳•׳‘׳× ׳׳˜׳•׳₪׳ (׳›׳/׳‘׳¢׳¨׳/׳׳), ׳•׳׳– ׳׳©׳¨/׳™ ׳׳©׳₪׳˜ ׳׳™׳ ׳˜׳’׳¨׳˜׳™׳‘׳™.', 'warn');
                render();
                return;
            }
            const text = String(state.round.integrativeDraft || '').trim();
            if (text.length < 30) {
                setFeedback('׳ ׳“׳¨׳© ׳׳©׳₪׳˜ ׳׳™׳ ׳˜׳’׳¨׳˜׳™׳‘׳™ ׳׳׳ (׳׳₪׳—׳•׳× 30 ׳×׳•׳•׳™׳).', 'warn');
                render();
                return;
            }
            const normalized = normalizeText(text);
            if (/\b׳׳‘׳\b/.test(normalized)) {
                state.round.penalties.invalidation += 1;
                state.round.penaltyPoints += 1;
                setFeedback('׳‘׳׳©׳₪׳˜ ׳׳™׳ ׳˜׳’׳¨׳˜׳™׳‘׳™ ׳׳ ׳׳©׳×׳׳©׳™׳ ׳‘"׳׳‘׳" ׳©׳׳‘׳˜׳ ׳¦׳“ ׳׳—׳“. ׳ ׳¡׳—/׳™ ׳¢׳ "׳•".', 'warn');
                render();
                return;
            }
            const hasOutside = /(׳‘׳—׳•׳¥|׳‘׳₪׳•׳¢׳|׳׳×׳•׳ 10|׳™׳© ׳׳₪׳¢׳׳™׳|׳ ׳™׳¡׳™׳•׳)/.test(normalized);
            const hasInside = /(׳‘׳₪׳ ׳™׳|׳׳¨׳’׳™׳©|׳™׳™׳׳•׳©|׳₪׳—׳“|׳ ׳¡׳’׳¨|׳›׳‘׳“)/.test(normalized);
            const hasStuckness = /(׳×׳§׳™׳¢׳•׳×|׳ ׳¡׳’׳¨|׳—׳¡׳•׳|׳ ׳ ׳¢׳|׳׳ ׳¢׳•׳‘׳¨)/.test(normalized);
            if (!hasOutside || !hasInside || !hasStuckness) {
                const missing = [];
                if (!hasOutside) missing.push('׳¨׳›׳™׳‘ ׳—׳™׳¦׳•׳ ׳™ (׳¢׳•׳‘׳“׳•׳×/׳™׳—׳¡/׳ ׳™׳¡׳™׳•׳)');
                if (!hasInside) missing.push('׳¨׳›׳™׳‘ ׳₪׳ ׳™׳׳™ (׳—׳•׳•׳™׳”/׳’׳•׳£/׳¨׳’׳©)');
                if (!hasStuckness) missing.push('׳׳™׳ ׳ ׳•׳¦׳¨׳” ׳”׳×׳§׳™׳¢׳•׳× ׳‘׳₪׳•׳¢׳');
                setFeedback(`׳׳©׳₪׳˜ ׳׳™׳ ׳˜׳’׳¨׳˜׳™׳‘׳™ ׳—׳¡׳¨: ${missing.join(' | ')}.`, 'warn');
                render();
                return;
            }
            state.round.integrativeFinal = text;
            state.round.integrativeApproved = true;
            markCriterion('confirm');
            setFeedback('׳׳¢׳•׳׳”. ׳™׳© ׳׳™׳ ׳˜׳’׳¨׳¦׳™׳” ׳‘׳™׳ ׳—׳•׳¥ ׳•׳₪׳ ׳™׳ ׳‘׳׳™ ׳׳‘׳˜׳ ׳׳£ ׳¦׳“. ׳׳₪׳©׳¨ ׳׳”׳׳©׳™׳ ׳-PATH.', 'success');
            render();
            return;
        }
        if (action === 'revise-hypothesis') {
            state.round.step = 'H';
            setFeedback('׳—׳–׳¨׳” ׳-H ׳׳×׳™׳§׳•׳ ׳”׳”׳™׳₪׳•׳×׳–׳” ׳׳₪׳ ׳™ PATH.', 'info');
            render();
            return;
        }
        if (action === 'goto-path') {
            if (!wr2wPathCore.canEnterPath(state.round) || !state.round.integrativeApproved) {
                setFeedback('׳׳™ ׳׳₪׳©׳¨ ׳׳”׳™׳›׳ ׳¡ ׳-PATH ׳׳₪׳ ׳™ ׳׳™׳©׳•׳¨ C ׳•׳׳©׳₪׳˜ ׳׳™׳ ׳˜׳’׳¨׳˜׳™׳‘׳™ ׳׳׳•׳©׳¨.', 'warn');
                render();
                return;
            }
            state.round.step = 'P';
            setFeedback('׳‘׳—׳¨/׳™ ׳›׳™׳•׳•׳: ׳—׳™׳¦׳•׳ ׳™ / ׳₪׳ ׳™׳׳™ / ׳’׳©׳¨.', 'info');
            render();
            return;
        }
        if (action === 'select-path') {
            const pathChoice = String(button.getAttribute('data-path') || '').toLowerCase();
            if (!['outside', 'inside', 'both'].includes(pathChoice)) return;
            state.round.pathChoice = pathChoice;
            markCriterion('path');
            const pathLabel = pathChoice === 'outside'
                ? '׳׳׳¦׳™׳׳•׳× ׳”׳—׳™׳¦׳•׳ ׳™׳×'
                : pathChoice === 'inside'
                    ? '׳׳׳¦׳™׳׳•׳× ׳”׳₪׳ ׳™׳׳™׳×'
                    : '׳׳’׳©׳¨ ׳‘׳™׳ ׳©׳ ׳™׳”׳';
            setFeedback(`׳ ׳‘׳—׳¨ PATH: ${pathLabel}.`, 'success');
            render();
            return;
        }
        if (action === 'goto-e') {
            if (!wr2wPathCore.canEnterPath(state.round)) {
                setFeedback('׳׳™ ׳׳₪׳©׳¨ ׳׳”׳™׳›׳ ׳¡ ׳-E/L ׳׳₪׳ ׳™ ׳׳™׳©׳•׳¨ C.', 'warn');
                render();
                return;
            }
            if (!wr2wPathCore.canEnterException(state.round)) {
                setFeedback('׳‘׳—׳¨/׳™ ׳§׳•׳“׳ PATH ׳׳₪׳ ׳™ ׳”׳׳¢׳‘׳¨ ׳-E/L.', 'warn');
                render();
                return;
            }
            if (!state.round.confirmation) {
                setFeedback('׳©׳׳—/׳™ ׳§׳•׳“׳ ׳”׳™׳₪׳•׳×׳–׳” ׳׳׳˜׳•׳₪׳.', 'warn');
                render();
                return;
            }
            state.round.step = 'E';
            setFeedback('׳׳¢׳•׳׳”. ׳¢׳›׳©׳™׳• ׳׳¢׳׳™׳§׳™׳: ׳—׳¨׳™׳’ ׳§׳˜׳ + ׳ ׳™׳¡׳•׳— ׳׳׳™׳“׳” ׳׳“׳•׳™׳§.', 'info');
            render();
            return;
        }
        if (action === 'set-breakout-level') {
            state.round.breakoutLevel = Math.max(0, Math.min(3, Number(button.getAttribute('data-level') || 0)));
            setFeedback(`׳ ׳‘׳—׳¨׳” ${WR2W_BREAKOUT_STEPS[state.round.breakoutLevel].label}.`, 'info');
            render();
            return;
        }
        if (action === 'autofill-learning') {
            if (!state.round.breakoutFound) {
                setFeedback('׳§׳•׳“׳ ׳׳¦׳׳• ׳—׳¨׳™׳’/׳×׳ ׳׳™ ׳•׳׳– ׳׳₪׳©׳¨ ׳׳™׳¦׳•׳¨ ׳ ׳™׳¡׳•׳— ׳׳•׳˜׳•׳׳˜׳™.', 'warn');
                render();
                return;
            }
            const didGenerate = applyAutoLearningDrafts(scene, true);
            setFeedback(
                didGenerate
                    ? '׳ ׳•׳¦׳¨ ׳ ׳™׳¡׳•׳— ׳׳׳™׳“׳” ׳׳•׳˜׳•׳׳˜׳™. ׳׳₪׳©׳¨ ׳׳¢׳¨׳•׳ ׳׳• ׳׳¡׳™׳™׳ ׳¡׳‘׳‘.'
                    : '׳׳ ׳ ׳•׳¦׳¨ ׳ ׳™׳¡׳•׳— ׳—׳“׳© - ׳‘׳“׳§׳• ׳©׳‘׳—׳¨׳×׳ PATH.',
                'info'
            );
            render();
            return;
        }
        if (action === 'send-breakout') {
            state.round.lastProbe = wr2wPatientAgent.probeException(scene, state.round.breakoutLevel);
            if (state.round.lastProbe.found) {
                state.round.breakoutFound = true;
                const autoBuilt = applyAutoLearningDrafts(scene, false);
                setFeedback(
                    autoBuilt
                        ? '׳ ׳׳¦׳ ׳—׳¨׳™׳’/׳×׳ ׳׳™ ׳•׳ ׳‘׳ ׳” ׳ ׳™׳¡׳•׳— ׳׳׳™׳“׳” ׳׳•׳˜׳•׳׳˜׳™. ׳׳₪׳©׳¨ ׳׳¢׳¨׳•׳ ׳׳• ׳׳¡׳™׳™׳.'
                        : '׳ ׳׳¦׳ ׳—׳¨׳™׳’/׳×׳ ׳׳™. ׳׳₪׳©׳¨ ׳׳™׳¦׳•׳¨ ׳ ׳™׳¡׳•׳— ׳׳•׳˜׳•׳׳˜׳™ ׳׳• ׳׳¢׳¨׳•׳ ׳™׳“׳ ׳™׳×.',
                    'success'
                );
            } else if (state.round.breakoutLevel < 3) {
                setFeedback('׳¢׳•׳“ ׳׳ ׳ ׳׳¦׳ ׳—׳¨׳™׳’. ׳¢׳‘׳•׳¨/׳™ ׳׳׳“׳¨׳’׳” ׳”׳‘׳׳” ׳‘׳¡׳•׳׳.', 'warn');
            } else {
                state.round.breakoutFound = true;
                const autoBuilt = applyAutoLearningDrafts(scene, false);
                setFeedback(
                    autoBuilt
                        ? '׳׳ ׳ ׳׳¦׳ ׳—׳¨׳™׳’ ׳—׳“, ׳׳‘׳ ׳ ׳‘׳ ׳” ׳ ׳™׳¡׳•׳— ׳׳•׳˜׳•׳׳˜׳™ ׳׳×׳ ׳׳™ ׳”׳—׳•׳–׳§.'
                        : '׳׳ ׳ ׳׳¦׳ ׳—׳¨׳™׳’ ׳—׳“. ׳׳₪׳©׳¨ ׳׳™׳¦׳•׳¨ ׳ ׳™׳¡׳•׳— ׳׳•׳˜׳•׳׳˜׳™ ׳׳×׳ ׳׳™ ׳”׳—׳•׳–׳§.',
                    'warn'
                );
            }
            render();
            return;
        }
        if (action === 'finish-round') {
            const pathChoice = String(state.round.pathChoice || '').toLowerCase();
            const singleText = pathChoice === 'outside'
                ? String(state.round.learningOutsideDraft || state.round.learningDraft || '').trim()
                : String(state.round.learningInsideDraft || state.round.learningDraft || '').trim();
            const outsideText = String(state.round.learningOutsideDraft || '').trim();
            const insideText = String(state.round.learningInsideDraft || '').trim();

            if (pathChoice === 'both' && (!outsideText || !insideText)) {
                setFeedback('׳‘׳ ׳×׳™׳‘ ׳”׳’׳©׳¨ ׳ ׳“׳¨׳©׳™׳ ׳©׳ ׳™ ׳׳©׳₪׳˜׳™ ׳׳׳™׳“׳”: ׳—׳•׳¥ + ׳₪׳ ׳™׳.', 'warn');
                render();
                return;
            }
            if ((pathChoice === 'outside' || pathChoice === 'inside') && singleText.length < 12) {
                setFeedback('׳ ׳“׳¨׳© ׳׳©׳₪׳˜ ׳׳׳™׳“׳” ׳׳׳ ׳™׳•׳×׳¨.', 'warn');
                render();
                return;
            }

            const learningEval = wr2wEvaluatorAgent.evaluateLearning(pathChoice, {
                singleText,
                outsideText,
                insideText
            });
            if (!learningEval.ok) {
                const reasons = [];
                if (learningEval.mode === 'outside') {
                    if (!learningEval.outside?.hasCondition) reasons.push('׳—׳•׳¥: ׳”׳•׳¡׳£/׳™ ׳×׳ ׳׳™ (׳‘׳¢׳™׳§׳¨ ׳›׳©/׳׳₪׳¢׳׳™׳ ׳›׳©/׳‘׳×׳ ׳׳™׳).');
                    if (!learningEval.outside?.hasPattern) reasons.push('׳—׳•׳¥: ׳ ׳¡׳—/׳™ ׳“׳₪׳•׳¡ ׳₪׳•׳ ׳§׳¦׳™׳•׳ ׳׳™ (׳׳׳©׳ "׳׳ ׳¢׳§׳‘׳™").');
                    if (!learningEval.outside?.avoidsRigidAbsolute) reasons.push('׳—׳•׳¥: ׳”׳—׳׳£/׳™ ׳ ׳™׳¡׳•׳— ׳׳‘׳¡׳•׳׳•׳˜׳™ ׳‘׳ ׳™׳¡׳•׳— ׳׳•׳×׳ ׳”.');
                } else if (learningEval.mode === 'inside') {
                    if (!learningEval.inside?.hasCondition) reasons.push('׳₪׳ ׳™׳: ׳”׳•׳¡׳£/׳™ ׳×׳ ׳׳™ (׳‘׳¢׳™׳§׳¨ ׳›׳©/׳׳₪׳¢׳׳™׳ ׳›׳©/׳‘׳×׳ ׳׳™׳).');
                    if (!learningEval.inside?.hasInnerFrame) reasons.push('׳₪׳ ׳™׳: ׳©׳׳•׳¨/׳™ ׳¢׳ ׳׳¡׳’׳•׳¨ ׳—׳•׳•׳™׳™׳×׳™ ("׳׳¨׳’׳™׳©/׳‘׳₪׳ ׳™׳/׳‘׳’׳•׳£").');
                } else {
                    if (!learningEval.outside?.ok) reasons.push('׳—׳•׳¥ ׳¢׳“׳™׳™׳ ׳׳ ׳©׳׳ (׳“׳₪׳•׳¡ + ׳×׳ ׳׳™׳).');
                    if (!learningEval.inside?.ok) reasons.push('׳₪׳ ׳™׳ ׳¢׳“׳™׳™׳ ׳׳ ׳©׳׳ (׳—׳•׳•׳™׳” + ׳×׳ ׳׳™׳).');
                }
                setFeedback(reasons.join(' '), 'warn');
                render();
                return;
            }
            if (pathChoice === 'outside') {
                state.round.learningOutsideFinal = singleText;
                state.round.learningFinal = singleText;
            } else if (pathChoice === 'inside') {
                state.round.learningInsideFinal = singleText;
                state.round.learningFinal = singleText;
            } else {
                state.round.learningOutsideFinal = outsideText;
                state.round.learningInsideFinal = insideText;
                state.round.bothLearningComplete = true;
                state.round.learningFinal = `׳—׳•׳¥: ${outsideText} | ׳₪׳ ׳™׳: ${insideText}`;
            }
            markCriterion('exception');
            finalizeRound(scene);
            render();
            return;
        }
        if (action === 'next-scene-inline') {
            nextScene();
        }
    };

    els.stepBody.addEventListener('click', handleAction);
    els.stepBody.addEventListener('input', (event) => {
        const target = event.target;
        if (target.id === 'wr2w-feeling-custom') {
            state.round.feeling = String(target.value || '').trim();
        } else if (target.id === 'wr2w-quantifier-custom') {
            state.round.selectedQuantifier = String(target.value || '').trim();
            state.round.selectedQuantifierAxis = '׳ ׳™׳¡׳•׳— ׳׳™׳©׳™';
        } else if (target.id === 'wr2w-hypothesis-input') {
            state.round.hypothesisDraft = String(target.value || '');
        } else if (target.id === 'wr2w-integrative-input') {
            state.round.integrativeDraft = String(target.value || '');
        } else if (target.id === 'wr2w-learning-input') {
            state.round.learningDraft = String(target.value || '');
        } else if (target.id === 'wr2w-learning-outside-input') {
            state.round.learningOutsideDraft = String(target.value || '');
        } else if (target.id === 'wr2w-learning-inside-input') {
            state.round.learningInsideDraft = String(target.value || '');
        }
    });

    els.nextScene?.addEventListener('click', () => {
        nextScene();
    });

    els.resetRound?.addEventListener('click', () => {
        resetRoundState();
        setFeedback('׳”׳¡׳‘׳‘ ׳׳•׳₪׳¡. ׳׳×׳—׳™׳׳™׳ ׳©׳•׳‘ ׳‘-S.', 'info');
        render();
    });

    els.selfToggle?.addEventListener('click', () => {
        els.selfPanel?.classList.toggle('hidden');
    });

    els.selfAdd?.addEventListener('click', () => {
        addSelfSentence();
    });

    resetRoundState();
    render();
    hydrateSeedScenesFromPack();
}




