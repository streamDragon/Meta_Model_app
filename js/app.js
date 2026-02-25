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
    lastChargeUsedDate: null,
    activityHistory: {}
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
    firstEntryDone: false,
    lastUiSoundAtMs: 0,
    lastGlobalTapAtMs: 0,
    globalInteractionBound: false
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
const PRACTICE_PAGE_KEYS = Object.freeze(['question', 'radar', 'triples-radar', 'wizard', 'verb-unzip']);
const PRACTICE_ACTIVE_TAB_STORAGE_KEY = 'practice_active_tab_v1';
const PRACTICE_TAB_BY_PAGE_KEY = Object.freeze({
    question: 'practice-question',
    radar: 'practice-radar',
    'triples-radar': 'practice-triples-radar',
    wizard: 'practice-wizard',
    'verb-unzip': 'practice-verb-unzip'
});
const PRACTICE_TAB_IDS = Object.freeze(Object.values(PRACTICE_TAB_BY_PAGE_KEY));

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
    audioState.lastUiSoundAtMs = (typeof performance !== 'undefined' && typeof performance.now === 'function')
        ? performance.now()
        : Date.now();
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
    } else if (kind === 'tap_soft') {
        playTone(510, 0.045, 'sine', 0.022, 0);
    } else if (kind === 'select_soft') {
        playTone(480, 0.05, 'triangle', 0.026, 0);
        playTone(620, 0.055, 'triangle', 0.026, 0.05);
    } else if (kind === 'wr2w_quantifier') {
        playTone(740, 0.05, 'triangle', 0.04, 0);
        playTone(920, 0.07, 'triangle', 0.04, 0.05);
    } else if (kind === 'wr2w_path') {
        playTone(420, 0.06, 'sine', 0.03, 0);
        playTone(560, 0.07, 'triangle', 0.03, 0.05);
    } else if (kind === 'wr2w_submit') {
        playTone(430, 0.06, 'sine', 0.03, 0);
        playTone(520, 0.06, 'sine', 0.03, 0.05);
        playTone(650, 0.08, 'triangle', 0.03, 0.11);
    } else if (kind === 'wr2w_confirm_yes') {
        playTone(620, 0.05, 'triangle', 0.032, 0);
        playTone(780, 0.07, 'triangle', 0.032, 0.05);
    } else if (kind === 'wr2w_confirm_partial') {
        playTone(520, 0.055, 'triangle', 0.03, 0);
        playTone(560, 0.06, 'triangle', 0.03, 0.05);
    } else if (kind === 'wr2w_confirm_no') {
        playTone(230, 0.07, 'sawtooth', 0.03, 0);
        playTone(190, 0.08, 'sawtooth', 0.03, 0.06);
    } else if (kind === 'wr2w_probe') {
        playTone(470, 0.045, 'sine', 0.026, 0);
        playTone(540, 0.045, 'sine', 0.026, 0.04);
    } else if (kind === 'wr2w_probe_found') {
        playTone(560, 0.05, 'triangle', 0.03, 0);
        playTone(700, 0.06, 'triangle', 0.03, 0.05);
        playTone(860, 0.08, 'triangle', 0.03, 0.11);
    }
}

function setupGlobalInteractionSounds() {
    if (audioState.globalInteractionBound) return;
    audioState.globalInteractionBound = true;

    const nowMs = () => (
        (typeof performance !== 'undefined' && typeof performance.now === 'function')
            ? performance.now()
            : Date.now()
    );

    const canPlayGlobalTap = () => {
        const now = nowMs();
        if ((now - Number(audioState.lastUiSoundAtMs || 0)) < 90) return false;
        if ((now - Number(audioState.lastGlobalTapAtMs || 0)) < 120) return false;
        audioState.lastGlobalTapAtMs = now;
        return true;
    };

    document.addEventListener('click', (event) => {
        const target = event.target && typeof event.target.closest === 'function'
            ? event.target.closest('button, summary, .tab-btn, [role="button"]')
            : null;
        if (!target) return;
        if (target.closest('.wr2w-card')) return; // WR2W gets custom sounds per action
        if (target.matches('.audio-mute-btn, #music-toggle-btn')) return;
        if (target.dataset && target.dataset.uiSound === 'off') return;
        if (!canPlayGlobalTap()) return;
        const isSummary = target.tagName === 'SUMMARY';
        playUISound(isSummary ? 'select_soft' : 'tap_soft');
    });

    document.addEventListener('change', (event) => {
        const target = event.target;
        if (!target || typeof target.matches !== 'function') return;
        if (!target.matches('select')) return;
        if (target.closest('.wr2w-card')) return;
        const now = nowMs();
        if ((now - Number(audioState.lastUiSoundAtMs || 0)) < 90) return;
        playUISound('select_soft');
    });
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

function normalizeViewMode(rawMode = '') {
    const value = String(rawMode || '').trim().toLowerCase();
    if (!value) return '';
    if (value === 'mobile' || value === 'phone' || value === 'm') return 'mobile';
    if (value === 'desktop' || value === 'computer' || value === 'pc' || value === 'd') return 'desktop';
    return '';
}

function applyEmbeddedCompactMode() {
    let embedded = false;
    try {
        embedded = window.self !== window.top;
    } catch (error) {
        embedded = true;
    }

    const params = new URLSearchParams(window.location.search);
    const viewMode = normalizeViewMode(params.get('view') || params.get('device'));
    if (viewMode) {
        document.body.classList.add(`view-${viewMode}`);
        document.body.classList.remove('force-mobile-view', 'force-desktop-view');
        document.body.classList.add(viewMode === 'mobile' ? 'force-mobile-view' : 'force-desktop-view');
    }

    if (params.get('compact') === '1' || params.get('embed') === '1' || viewMode === 'mobile') {
        embedded = true;
    }

    let forceSimple = params.get('simple') === '1';
    let disableSimple = params.get('simple') === '0';
    if (viewMode === 'mobile') {
        forceSimple = true;
        disableSimple = false;
    } else if (viewMode === 'desktop') {
        disableSimple = true;
    }

    if (embedded) {
        document.body.classList.add('embed-mode');
    }

    if (forceSimple || (embedded && !disableSimple)) {
        document.body.classList.add('minimal-ui');
    }
}

function enforceTopMenuOnlyMode() {
    const body = document.body;
    if (!body) return;
    body.classList.add('hide-top-tabbar');

    ['.tabs', '.mobile-tab-nav'].forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => {
            el.setAttribute('aria-hidden', 'true');
            try {
                el.style.setProperty('display', 'none', 'important');
                el.style.setProperty('visibility', 'hidden', 'important');
                el.style.setProperty('height', '0', 'important');
                el.style.setProperty('overflow', 'hidden', 'important');
                el.style.setProperty('pointer-events', 'none', 'important');
            } catch (_error) {
                // ignore style application failures
            }
        });
    });
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
    const targetTab = requestedTab || 'home';
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
        logic: `Prism Lab הוא כלי עומק: בוחרים קטגוריה + מילה/ביטוי מרכזי אחד ("עוגן"), ובודקים אותו דרך רמות לוגיות (${LOGICAL_LEVELS_SEQUENCE_FRIENDLY_SHORT}) כדי להבין איפה באמת נמצא הקושי.`,
        goal: 'להבדיל בין חקירה בשרשרת (שאלה על כל תשובה חדשה) לבין חקירת עומק על אותו נושא, ולבחור צעד המשך מדויק על בסיס מפה.',
        approach: 'בחר/י פריזמה, כתוב/כתבי מילה/ביטוי מרכזי אחד מהמשפט, מלא/י כמה רמות, ואז בדוק/י את המפה ובחר/י צעד המשך. אם חסרה רמה - משלימים שכבה לפני שעוברים הלאה.'
    }),
    categories: Object.freeze({
        logic: '׳–׳”׳• ׳׳¡׳ ׳™׳“׳¢: ׳׳—׳™׳§׳”, ׳¢׳™׳•׳•׳× ׳•׳”׳›׳׳׳” ׳›׳׳₪׳× ׳ ׳™׳•׳•׳˜ ׳׳×׳¨׳’׳•׳.',
        goal: '׳׳–׳”׳•׳× ׳׳”׳¨ ׳׳™׳–׳” ׳¡׳•׳’ ׳”׳₪׳¨׳” ׳׳•׳₪׳™׳¢ ׳‘׳׳©׳₪׳˜.',
        approach: '׳¢׳‘׳•׳¨/׳™ ׳¢׳ ׳”׳“׳•׳’׳׳׳•׳× ׳•׳׳– ׳—׳–׳•׳¨/׳™ ׳׳׳¡׳ ׳×׳¨׳’׳•׳ ׳׳¢׳©׳™.'
    }),
    practice: Object.freeze({
        logic: '׳׳¡׳ ׳”׳×׳¨׳’׳•׳ ׳₪׳•׳¦׳ ׳-4 ׳“׳₪׳™׳: ׳©׳׳׳•׳×, Meta Radar, SQHCEL, ׳•׳₪׳•׳¢׳ ׳׳ ׳׳₪׳•׳¨׳˜.',
        goal: '׳׳¢׳‘׳•׳“ ׳‘׳¦׳•׳¨׳” ׳׳׳•׳§׳“׳× - ׳›׳ ׳₪׳¢׳ ׳׳™׳•׳׳ ׳•׳× ׳׳—׳×.',
        approach: '׳‘׳—׳¨/׳™ ׳“׳£ ׳׳—׳“, ׳¡׳™׳™׳/׳™ ׳¡׳‘׳‘ ׳§׳¦׳¨, ׳•׳¨׳§ ׳׳– ׳¢׳‘׳¨/׳™ ׳׳“׳£ ׳”׳‘׳.'
    }),
    'practice-question': Object.freeze({
        logic: '׳”׳“׳£ ׳”׳–׳” ׳׳׳׳ ׳ ׳™׳¡׳•׳— ׳©׳׳׳•׳× ׳׳“׳•׳™׳§׳•׳× ׳‘׳׳§׳•׳ ׳ ׳™׳—׳•׳©.',
        goal: '׳׳”׳©׳×׳₪׳¨ ׳‘׳–׳™׳”׳•׳™ ׳׳”׳™׳¨ ׳©׳ ׳׳—׳™׳§׳”/׳¢׳™׳•׳•׳×/׳”׳›׳׳׳”.',
        approach: '׳§׳¨׳/׳™ ׳׳× ׳”׳׳©׳₪׳˜, ׳ ׳¡׳—/׳™ ׳©׳׳׳” ׳׳“׳•׳™׳§׳×, ׳•׳‘׳“׳•׳§/׳™ ׳¢׳ ׳”׳׳©׳•׳‘.'
    }),
    'practice-radar': Object.freeze({
        logic: '׳”׳“׳£ ׳”׳–׳” ׳׳׳׳ ׳–׳™׳”׳•׳™ ׳×׳‘׳ ׳™׳•׳× ׳‘׳–׳׳ ׳׳׳× ׳¢׳ ׳׳—׳¥ ׳–׳׳.',
        goal: '׳׳—׳–׳§ ׳¨׳₪׳׳§׳¡ ׳“׳™׳•׳§ ׳׳”׳™׳¨ ׳‘׳׳•׳ ׳•׳׳•׳’ ׳—׳™.',
        approach: '׳¨׳׳”/׳™ ׳׳× ׳”׳”׳™׳™׳׳™׳™׳˜, ׳‘׳—׳¨/׳™ ׳×׳‘׳ ׳™׳× ׳‘׳׳”׳™׳¨׳•׳×, ׳•׳‘׳“׳•׳§/׳™ ׳׳” ׳׳×׳§׳ ׳‘׳¡׳™׳›׳•׳.'
    }),
    'practice-wizard': Object.freeze({
        logic: '׳”׳“׳£ ׳”׳–׳” ׳׳׳׳ ׳’׳™׳©׳•׳¨ ׳‘׳™׳ ׳×׳—׳•׳©׳” ׳׳׳©׳₪׳˜ ׳׳₪׳ ׳™ ׳׳×׳’׳•׳¨.',
        goal: '׳׳‘׳ ׳•׳× ׳׳™׳•׳׳ ׳•׳× SQHCEL ׳¢׳§׳‘׳™׳× ׳¢׳ ׳׳™׳©׳•׳¨ ׳׳₪׳ ׳™ ׳₪׳¨׳™׳¦׳”.',
        approach: '׳¢׳‘׳•׳“/׳™ ׳‘׳¡׳“׳¨ ׳§׳‘׳•׳¢: S -> Q -> H -> C -> כיוון עבודה -> E/L. ׳”׳’׳•׳£ ׳׳¨׳’׳™׳© "׳׳‘׳¡׳•׳׳•׳˜׳™" ׳׳₪׳ ׳™ ׳©׳”׳׳™׳׳™׳ ׳׳׳¨׳• "׳×׳׳™׳“".'
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

const DEFAULT_THERAPEUTIC_DEMO = Object.freeze({
    banner: '׳׳™׳׳•׳¡׳˜׳¨׳¦׳™׳” ׳×׳”׳׳™׳›׳™׳×: ׳–׳” ׳׳•׳“׳ ׳”׳“׳’׳׳” ׳׳׳” ׳”׳›׳׳™ ׳”׳–׳” ׳‘׳ ׳׳׳“׳. ׳–׳• ׳“׳•׳’׳׳” ׳׳™׳׳•׳“׳™׳× ׳©׳ ׳×׳”׳׳™׳, ׳•׳׳” ׳©׳׳×׳” ׳׳×׳¨׳’׳ ׳›׳׳ ׳”׳•׳ ׳‘׳“׳™׳•׳§ ׳׳” ׳©׳×׳¨׳¦׳” ׳׳§׳‘׳/׳׳×׳× ׳‘׳©׳™׳—׳” ׳׳׳™׳×׳™׳×.',
    frame: '׳–׳• ׳“׳•׳’׳׳” ׳×׳”׳׳™׳›׳™׳× (׳׳™׳׳•׳¡׳˜׳¨׳¦׳™׳”) ׳‘׳׳‘׳“. ׳”׳׳˜׳¨׳” ׳›׳׳ ׳”׳™׳ ׳׳”׳¨׳׳•׳× ׳׳× ׳¡׳•׳’ ׳”׳×׳ ׳•׳¢׳” ׳©׳”׳₪׳™׳¦׳³׳¨ ׳׳׳׳: ׳“׳™׳•׳§, ׳—׳§׳™׳¨׳”, ׳©׳™׳§׳•׳£, ׳׳• ׳‘׳ ׳™׳™׳× ׳¦׳¢׳“ ׳”׳‘׳.',
    turns: Object.freeze([
        Object.freeze({ role: '׳׳˜׳•׳₪׳', text: '׳׳ ׳™ ׳׳¨׳’׳™׳© ׳©׳”׳›׳•׳ ׳×׳§׳•׳¢, ׳•׳׳ ׳™ ׳׳ ׳‘׳˜׳•׳— ׳׳׳™׳₪׳” ׳׳”׳×׳—׳™׳.' }),
        Object.freeze({ role: '׳׳˜׳₪׳', text: '׳‘׳•׳ ׳ ׳¢׳‘׳•׳“ ׳“׳¨׳ ׳”׳›׳׳™ ׳”׳–׳” ׳•׳ ׳™׳§׳— ׳ ׳§׳•׳“׳” ׳׳—׳× ׳‘׳׳‘׳“, ׳›׳“׳™ ׳׳”׳‘׳™׳ ׳׳” ׳‘׳׳׳× ׳§׳•׳¨׳” ׳•׳׳ ׳¨׳§ ׳׳™׳ ׳–׳” ׳׳¨׳’׳™׳© ׳›׳¨׳’׳¢.' }),
        Object.freeze({ role: '׳׳˜׳•׳₪׳', text: '׳›׳©׳׳₪׳¨׳§׳™׳ ׳׳× ׳–׳” ׳›׳›׳”, ׳׳ ׳™ ׳₪׳×׳׳•׳ ׳¨׳•׳׳” ׳₪׳¨׳˜׳™׳ ׳©׳׳ ׳©׳׳×׳™ ׳׳‘ ׳׳׳™׳”׳.' }),
        Object.freeze({ role: '׳׳˜׳₪׳', text: '׳׳¢׳•׳׳”. ׳¢׳›׳©׳™׳• ׳ ׳‘׳—׳¨ ׳׳× ׳”׳©׳׳׳”/׳”׳×׳’׳•׳‘׳” ׳”׳›׳™ ׳׳“׳•׳™׳§׳× ׳׳©׳׳‘ ׳”׳‘׳, ׳‘׳׳™ ׳׳§׳₪׳•׳¥ ׳׳׳¡׳§׳ ׳” ׳’׳“׳•׳׳” ׳׳“׳™.' }),
        Object.freeze({ role: '׳׳˜׳•׳₪׳', text: '׳–׳” ׳›׳‘׳¨ ׳׳¨׳’׳™׳© ׳™׳•׳×׳¨ ׳‘׳¨׳•׳¨, ׳•׳₪׳—׳•׳× ׳›׳׳• ׳‘׳׳’׳ ׳׳—׳“ ׳’׳“׳•׳.' })
    ]),
    outcomeTitle: '׳׳” ׳”׳₪׳™׳¦׳³׳¨ ׳”׳–׳” ׳‘׳ ׳׳׳“׳',
    outcomes: Object.freeze([
        '׳׳™׳ ׳¢׳•׳‘׳¨׳™׳ ׳׳¢׳•׳׳¡/׳¢׳׳™׳׳•׳× ׳׳¦׳¢׳“ ׳‘׳¨׳•׳¨ ׳׳—׳“.',
        '׳׳™׳ ׳ ׳©׳׳¨׳™׳ ׳ ׳•׳›׳—׳™׳ ׳•׳׳“׳•׳™׳§׳™׳ ׳‘׳׳™ ׳׳”׳׳¦׳™׳ ׳©׳׳׳•׳× ג€׳—׳›׳׳•׳×ג€ ׳›׳ ׳”׳–׳׳.',
        '׳׳™׳ ׳׳™׳™׳¦׳¨׳™׳ ׳×׳”׳׳™׳ ׳©׳׳₪׳©׳¨ ׳׳×׳¨׳’׳ ׳©׳•׳‘ ׳•׳©׳•׳‘ ׳¢׳“ ׳©׳”׳•׳ ׳ ׳”׳™׳” ׳˜׳‘׳¢׳™.'
    ])
});

const THERAPEUTIC_DEMO_BY_SCREEN = Object.freeze({
    'practice-question': Object.freeze({
        turns: Object.freeze([
            Object.freeze({ role: '׳׳˜׳•׳₪׳', text: '׳›׳•׳׳ ׳ ׳’׳“׳™ ׳‘׳¢׳‘׳•׳“׳”, ׳׳™׳ ׳׳™ ׳›׳‘׳¨ ׳׳” ׳׳”׳’׳™׳“.' }),
            Object.freeze({ role: '׳׳˜׳₪׳', text: '׳‘׳•׳ ׳ ׳ ׳¡׳— ׳©׳׳׳” ׳׳—׳× ׳׳“׳•׳™׳§׳× ׳‘׳׳§׳•׳ ׳׳”׳’׳™׳‘ ׳™׳©׳¨: ׳׳™ ׳‘׳“׳™׳•׳§ ג€׳›׳•׳׳ג€?' }),
            Object.freeze({ role: '׳׳˜׳•׳₪׳', text: '׳‘׳¢׳¦׳ ׳׳׳” ׳©׳ ׳™ ׳׳ ׳©׳™׳ ׳‘׳¦׳•׳•׳×, ׳׳ ׳›׳•׳׳.' }),
            Object.freeze({ role: '׳׳˜׳₪׳', text: '׳׳¢׳•׳׳”. ׳¢׳›׳©׳™׳• ׳›׳‘׳¨ ׳™׳© ׳׳ ׳• ׳©׳™׳—׳” ׳¢׳ ׳©׳ ׳™ ׳׳ ׳©׳™׳, ׳׳ ׳׳׳—׳׳” ׳¢׳ ׳”׳¢׳•׳׳.' })
        ]),
        outcomes: Object.freeze([
            '׳׳”׳—׳׳™׳£ ׳×׳’׳•׳‘׳” ׳׳™׳ ׳˜׳•׳׳™׳˜׳™׳‘׳™׳× ׳‘׳©׳׳׳” ׳׳“׳•׳™׳§׳×.',
            '׳׳–׳”׳•׳× ׳׳” ׳—׳¡׳¨ ׳‘׳׳©׳₪׳˜ ׳׳₪׳ ׳™ ׳©׳ ׳›׳ ׳¡׳™׳ ׳׳₪׳×׳¨׳•׳.',
            '׳׳”׳§׳˜׳™׳ ׳“׳¨׳׳” ׳“׳¨׳ ׳“׳™׳•׳§ ׳׳©׳•׳ ׳™.'
        ])
    }),
    'practice-radar': Object.freeze({
        turns: Object.freeze([
            Object.freeze({ role: '׳׳˜׳•׳₪׳', text: '׳׳ ׳™ ׳×׳׳™׳“ ׳”׳•׳¨׳¡ ׳׳× ׳–׳” ׳‘׳¡׳•׳£.' }),
            Object.freeze({ role: '׳׳˜׳₪׳', text: '׳׳ ׳™ ׳§׳•׳׳˜ ׳›׳׳ ׳˜׳¨׳™׳’׳¨ ׳׳©׳•׳ ׳™ ׳‘׳–׳׳ ׳׳׳×. ׳‘׳•׳ ׳ ׳¢׳¦׳•׳¨ ׳¢׳ ׳”׳׳™׳׳” ג€׳×׳׳™׳“ג€.' }),
            Object.freeze({ role: '׳׳˜׳•׳₪׳', text: '׳˜׳•׳‘ג€¦ ׳׳ ׳×׳׳™׳“. ׳‘׳¢׳™׳§׳¨ ׳›׳©׳׳ ׳™ ׳‘׳׳—׳¥ ׳׳•׳ ׳¡׳׳›׳•׳×.' }),
            Object.freeze({ role: '׳׳˜׳₪׳', text: '׳׳¦׳•׳™׳. ׳‘׳“׳™׳•׳§ ׳׳–׳” Meta Radar ׳׳׳׳: ׳׳–׳”׳•׳× ׳׳”׳¨ ׳׳× ׳”׳˜׳¨׳™׳’׳¨ ׳׳₪׳ ׳™ ׳©׳”׳¡׳™׳₪׳•׳¨ ׳ ׳¡׳’׳¨.' })
        ]),
        outcomes: Object.freeze([
            '׳–׳™׳”׳•׳™ ׳׳”׳™׳¨ ׳©׳ ׳˜׳¨׳™׳’׳¨ ׳׳©׳•׳ ׳™ ׳‘׳–׳׳ ׳׳׳×.',
            '׳׳¢׳‘׳¨ ׳׳¨׳₪׳׳§׳¡ ׳×׳’׳•׳‘׳” ׳׳¨׳₪׳׳§׳¡ ׳“׳™׳•׳§.',
            '׳§׳™׳¦׳•׳¨ ׳–׳׳ ׳‘׳™׳ ׳–׳™׳”׳•׳™ ׳”׳“׳₪׳•׳¡ ׳׳©׳׳׳” ׳”׳ ׳›׳•׳ ׳”.'
        ])
    }),
    'practice-triples-radar': Object.freeze({
        turns: Object.freeze([
            Object.freeze({ role: '׳׳˜׳•׳₪׳', text: '׳׳ ׳™ ׳™׳•׳“׳¢ ׳©׳”׳•׳ ׳—׳•׳©׳‘ ׳©׳׳ ׳™ ׳׳ ׳׳¡׳₪׳™׳§ ׳˜׳•׳‘, ׳׳– ׳׳ ׳™ ׳—׳™׳™׳‘ ׳׳”׳•׳›׳™׳— ׳׳× ׳¢׳¦׳׳™.' }),
            Object.freeze({ role: '׳׳˜׳₪׳', text: '׳‘׳׳§׳•׳ ׳׳‘׳—׳•׳¨ ׳¨׳§ ׳§׳˜׳’׳•׳¨׳™׳” ׳׳—׳×, ׳׳ ׳—׳ ׳• ׳¢׳•׳‘׳“׳™׳ ׳¢׳ ׳›׳ ׳”׳©׳׳©׳”: ׳׳” ׳׳×׳” ׳™׳•׳“׳¢, ׳׳” ׳׳×׳” ׳׳ ׳™׳—, ׳•׳׳₪׳™ ׳׳™׳–׳” ׳›׳׳ ׳׳×׳” ׳©׳•׳₪׳˜.' }),
            Object.freeze({ role: '׳׳˜׳•׳₪׳', text: '׳›׳©׳©׳•׳׳׳™׳ ׳׳× ׳›׳ ׳”׳©׳׳©׳”, ׳׳ ׳™ ׳¨׳•׳׳” ׳©׳–׳” ׳׳•׳×׳• ׳׳ ׳’׳ ׳•׳ ׳©׳—׳•׳–׳¨.' }),
            Object.freeze({ role: '׳׳˜׳₪׳', text: '׳‘׳“׳™׳•׳§. Triples Radar ׳׳“׳׳™׳§ ג€׳׳©׳₪׳—׳”ג€ ׳©׳ ׳“׳₪׳•׳¡׳™׳, ׳׳ ׳¨׳§ ׳›׳₪׳×׳•׳¨ ׳׳—׳“.' })
        ]),
        outcomes: Object.freeze([
            '׳׳–׳”׳•׳× ׳§׳˜׳’׳•׳¨׳™׳” ׳‘׳×׳•׳ ׳”׳§׳©׳¨ ׳©׳ ׳©׳׳©׳” ׳©׳׳׳”.',
            '׳׳¨׳׳•׳× ׳׳™׳ 3 ׳¨׳›׳™׳‘׳™׳ ׳¢׳•׳‘׳“׳™׳ ׳™׳—׳“ ׳‘׳׳•׳×׳” ׳©׳›׳‘׳”.',
            '׳׳™׳™׳¦׳¨ ׳©׳™׳§׳•׳£ ׳•׳׳×׳’׳•׳¨ ׳׳“׳•׳™׳§׳™׳ ׳™׳•׳×׳¨ ׳›׳™ ׳”׳׳₪׳” ׳¨׳—׳‘׳” ׳™׳•׳×׳¨.'
        ])
    }),
    'practice-wizard': Object.freeze({
        turns: Object.freeze([
            Object.freeze({ role: '׳׳˜׳•׳₪׳', text: '׳׳ ׳™ ׳¨׳•׳¦׳” ׳׳”׳’׳™׳‘ ׳׳—׳¨׳×, ׳׳‘׳ ׳”׳’׳•׳£ ׳©׳׳™ ׳›׳‘׳¨ ׳ ׳¡׳’׳¨.' }),
            Object.freeze({ role: '׳׳˜׳₪׳', text: '׳׳₪׳ ׳™ ׳׳×׳’׳•׳¨, ׳ ׳¢׳‘׳•׳¨ ׳“׳¨׳ SQHCEL: ׳׳” ׳׳×׳” ׳׳¨׳’׳™׳©, ׳׳” ׳§׳•׳¨׳” ׳‘׳₪׳ ׳™׳, ׳•׳׳™׳ ׳–׳” ׳ ׳”׳™׳” ׳©׳₪׳”.' }),
            Object.freeze({ role: '׳׳˜׳•׳₪׳', text: '׳›׳©׳׳ ׳™ ׳¢׳•׳¦׳¨ ׳¢׳ ׳”׳×׳—׳•׳©׳” ׳§׳•׳“׳, ׳”׳©׳׳׳” ׳©׳׳ ׳™ ׳©׳•׳׳ ׳ ׳”׳™׳™׳× ׳™׳•׳×׳¨ ׳¨׳’׳•׳¢׳”.' }),
            Object.freeze({ role: '׳׳˜׳₪׳', text: '׳–׳” ׳‘׳“׳™׳•׳§ ׳”׳׳•׳“׳: ׳§׳•׳“׳ ׳•׳™׳¡׳•׳× ׳•׳’׳©׳¨, ׳׳—׳¨ ׳›׳ ׳“׳™׳•׳§ ׳׳©׳•׳ ׳™.' })
        ])
    }),
    'practice-verb-unzip': Object.freeze({
        turns: Object.freeze([
            Object.freeze({ role: '׳׳˜׳•׳₪׳', text: '׳׳ ׳™ ׳₪׳©׳•׳˜ ׳¦׳¨׳™׳ ׳׳”׳×׳§׳“׳.' }),
            Object.freeze({ role: '׳׳˜׳₪׳', text: '׳‘׳•׳ ׳ ׳₪׳¨׳§ ׳׳× ג€׳׳”׳×׳§׳“׳ג€: ׳׳” ׳§׳•׳¨׳” ׳¦׳¢׳“-׳¦׳¢׳“ ׳‘׳₪׳•׳¢׳? ׳׳” ׳§׳•׳“׳ ׳׳׳”?' }),
            Object.freeze({ role: '׳׳˜׳•׳₪׳', text: '׳׳•׳§׳™׳™ג€¦ ׳§׳•׳“׳ ׳׳ ׳™ ׳¦׳¨׳™׳ ׳׳₪׳×׳•׳— ׳׳¡׳׳, ׳׳¡׳›׳ 3 ׳ ׳§׳•׳“׳•׳×, ׳•׳׳– ׳׳©׳׳•׳—.' }),
            Object.freeze({ role: '׳׳˜׳₪׳', text: '׳׳¢׳•׳׳”. Unzip ׳”׳•׳₪׳ ׳₪׳•׳¢׳ ׳¢׳׳•׳ ׳׳₪׳¨׳•׳¦׳“׳•׳¨׳” ׳©׳׳₪׳©׳¨ ׳׳‘׳¦׳¢.' })
        ])
    }),
    prismlab: Object.freeze({
        frame: `דוגמת שימוש ב-Prism Lab: במקום להמשיך לשאלה חדשה על כל תשובה (חקירה רקורסיבית), עוצרים על מילה/ביטוי מרכזי אחד ("עוגן") ובודקים אותו דרך רמות לוגיות (${LOGICAL_LEVELS_SEQUENCE_FRIENDLY_SHORT}) כדי לבנות מפת עומק.`,
        turns: Object.freeze([
            Object.freeze({ role: 'מטופל', text: 'אני רוצה להבין למה כל פעם \"נדבר\" נשמע לי כמו כישלון.' }),
            Object.freeze({ role: 'מטפל', text: 'מעולה. ב-Prism Research היינו ממשיכים ושואלים שוב על כל תשובה חדשה (חקירה רקורסיבית). כאן ב-Prism Lab נעשה משהו אחר: נשאר על המילה \"נדבר\" ונבדוק אותה לעומק דרך רמות שונות.' }),
            Object.freeze({ role: 'מטופל', text: 'כלומר לא מחליפים נושא - פשוט מסתכלים על אותה מילה דרך סביבה/התנהגות/יכולות/ערכים/זהות/שייכות?' }),
            Object.freeze({ role: 'מטפל', text: 'בדיוק. כך מקבלים מפה: איפה זה יושב, מה אתה עושה, איזו יכולת חסרה, איזה כלל מפעיל את זה, ומה צעד ההמשך הכי מדויק.' })
        ]),
        outcomes: Object.freeze([
            'להבחין בין חקירה בשרשרת (שאלה על כל תשובה חדשה) לבין חקירת עומק על אותו נושא.',
            'למפות מילה/ביטוי מרכזי אחד דרך רמות לוגיות במקום לקפוץ ישר לפרשנות או פתרון.',
            'להפיק צעד הבא אחד מדויק מתוך המפה (ולא מתוך אינטואיציה בלבד).'
        ])
    }),
    blueprint: Object.freeze({
        turns: Object.freeze([
            Object.freeze({ role: '׳׳˜׳•׳₪׳', text: '׳׳ ׳™ ׳¦׳¨׳™׳ ׳׳¡׳’׳•׳¨ ׳׳× ׳”׳₪׳¨׳•׳™׳§׳˜ ׳”׳–׳”, ׳׳‘׳ ׳׳™׳ ׳׳™ ׳׳•׳©׳’ ׳׳׳™׳₪׳” ׳׳”׳×׳—׳™׳.' }),
            Object.freeze({ role: '׳׳˜׳₪׳', text: '׳‘׳•׳ ׳ ׳”׳₪׳•׳ ׳׳× ׳–׳” ׳ג€׳¦׳¨׳™׳ג€ ׳׳×׳•׳›׳ ׳™׳×: ׳™׳¢׳“, ׳¦׳¢׳“ ׳¨׳׳©׳•׳, ׳×׳§׳™׳¢׳•׳×, ׳•-Plan B.' }),
            Object.freeze({ role: '׳׳˜׳•׳₪׳', text: '׳¢׳›׳©׳™׳• ׳–׳” ׳›׳‘׳¨ ׳׳ ג€׳₪׳¨׳•׳™׳§׳˜ ׳¢׳ ׳§ג€, ׳׳׳ ׳¦׳¢׳“ ׳¨׳׳©׳•׳ ׳‘׳¨׳•׳¨.' }),
            Object.freeze({ role: '׳׳˜׳₪׳', text: '׳–׳” ׳׳” ׳©׳”׳›׳׳™ ׳׳׳“׳: ׳׳¢׳‘׳¨ ׳׳׳˜׳׳” ׳¢׳׳•׳׳” ׳׳‘׳™׳¦׳•׳¢ ׳׳¢׳©׳™.' })
        ])
    }),
    'comic-engine': Object.freeze({
        turns: Object.freeze([
            Object.freeze({ role: '׳׳˜׳•׳₪׳', text: '׳‘׳¨׳’׳¢ ׳”׳׳׳× ׳׳ ׳™ ׳׳’׳™׳‘ ׳׳”׳¨ ׳׳“׳™ ׳•׳׳– ׳׳¦׳˜׳¢׳¨.' }),
            Object.freeze({ role: '׳׳˜׳₪׳', text: '׳ ׳¨׳™׳¥ ׳¡׳™׳׳•׳׳¦׳™׳” ׳§׳¦׳¨׳”: ׳×׳’׳•׳‘׳”, ׳×׳’׳•׳‘׳× ׳ ׳’׳“, ׳ ׳™׳¡׳•׳— ׳׳—׳“׳©, ׳•׳׳– ׳ ׳‘׳“׳•׳§ ׳׳” ׳”׳™׳” ׳׳§׳“׳.' }),
            Object.freeze({ role: '׳׳˜׳•׳₪׳', text: '׳”׳¡׳™׳׳•׳׳¦׳™׳” ׳ ׳•׳×׳ ׳× ׳׳™ ׳׳¨׳•׳•׳— ׳׳—׳©׳•׳‘ ׳׳₪׳ ׳™ ׳©׳׳•׳׳¨׳™׳ ׳׳× ׳–׳” ׳‘׳׳׳×.' }),
            Object.freeze({ role: '׳׳˜׳₪׳', text: '׳‘׳“׳™׳•׳§. Comic Engine ׳׳׳“׳ ׳—׳–׳¨׳” ׳’׳ ׳¨׳׳™׳× ׳׳©׳™׳—׳” ׳׳׳™׳×׳™׳×.' })
        ])
    }),
    'scenario-trainer': Object.freeze({
        turns: Object.freeze([
            Object.freeze({ role: '׳׳˜׳•׳₪׳', text: '׳׳ ׳™ ׳™׳©׳¨ ׳׳×׳’׳•׳ ׳ ׳‘׳¡׳™׳˜׳•׳׳¦׳™׳•׳× ׳›׳׳׳”.' }),
            Object.freeze({ role: '׳׳˜׳₪׳', text: '׳‘׳•׳ ׳ ׳×׳¨׳’׳ ׳¡׳¦׳ ׳”: ׳ ׳‘׳“׳•׳§ ׳׳™׳–׳• ׳×׳’׳•׳‘׳” ׳׳¡׳׳™׳׳” ׳•׳׳™׳–׳• ׳×׳’׳•׳‘׳” ׳׳§׳“׳׳×.' }),
            Object.freeze({ role: '׳׳˜׳•׳₪׳', text: '׳׳ ׳™ ׳¨׳•׳׳” ׳׳™׳ ׳ ׳™׳¡׳•׳— ׳§׳˜׳ ׳׳©׳ ׳” ׳׳’׳׳¨׳™ ׳׳× ׳”׳›׳™׳•׳•׳.' }),
            Object.freeze({ role: '׳׳˜׳₪׳', text: '׳–׳” ׳‘׳“׳™׳•׳§ ׳”׳¢׳¨׳: ׳׳™׳׳•׳ ׳”׳—׳׳˜׳” ׳‘׳×׳•׳ ׳”׳§׳©׳¨, ׳׳ ׳¨׳§ ׳×׳™׳׳•׳¨׳™׳”.' })
        ])
    }),
    categories: Object.freeze({
        turns: Object.freeze([
            Object.freeze({ role: '׳׳˜׳•׳₪׳', text: '׳׳ ׳™ ׳׳×׳‘׳׳‘׳ ׳‘׳™׳ ׳¡׳•׳’׳™ ׳”׳”׳₪׳¨׳•׳×.' }),
            Object.freeze({ role: '׳׳˜׳₪׳', text: '׳‘׳•׳ ׳ ׳׳₪׳” ׳§׳•׳“׳ ׳׳× ׳”׳׳©׳₪׳—׳•׳×: ׳׳—׳™׳§׳”, ׳¢׳™׳•׳•׳×, ׳”׳›׳׳׳”. ׳׳—׳¨ ׳›׳ ׳™׳”׳™׳” ׳§׳ ׳™׳•׳×׳¨ ׳׳–׳”׳•׳× ׳‘׳–׳׳ ׳׳׳×.' }),
            Object.freeze({ role: '׳׳˜׳•׳₪׳', text: '׳›׳©׳׳ ׳™ ׳¨׳•׳׳” ׳׳× ׳–׳” ׳›׳׳©׳₪׳—׳•׳×, ׳”׳¨׳׳© ׳ ׳”׳™׳” ׳׳¡׳•׳“׳¨.' }),
            Object.freeze({ role: '׳׳˜׳₪׳', text: '׳׳¢׳•׳׳”. ׳–׳” ׳׳¡׳ ׳™׳“׳¢ ׳©׳׳׳₪׳” ׳׳× ׳”׳©׳˜׳— ׳׳₪׳ ׳™ ׳×׳¨׳’׳•׳ ׳׳”׳™׳¨.' })
        ])
    }),
    home: Object.freeze({
        turns: Object.freeze([
            Object.freeze({ role: '׳׳˜׳•׳₪׳', text: '׳™׳© ׳₪׳” ׳׳׳ ׳›׳׳™׳ ׳•׳׳ ׳™ ׳׳ ׳‘׳˜׳•׳— ׳׳׳™׳₪׳” ׳׳”׳×׳—׳™׳.' }),
            Object.freeze({ role: '׳׳˜׳₪׳', text: '׳ ׳×׳—׳™׳ ׳׳₪׳™ ׳׳˜׳¨׳”: ׳–׳™׳”׳•׳™? ׳©׳™׳§׳•׳£? ׳¡׳™׳׳•׳׳¦׳™׳”? ׳‘׳™׳¦׳•׳¢? ׳›׳ ׳׳¡׳׳•׳ ׳׳׳׳ ׳׳™׳•׳׳ ׳•׳× ׳׳—׳¨׳×.' }),
            Object.freeze({ role: '׳׳˜׳•׳₪׳', text: '׳׳•׳§׳™׳™, ׳¢׳›׳©׳™׳• ׳׳ ׳™ ׳׳‘׳™׳ ׳׳” ׳׳×׳׳™׳ ׳׳™ ׳׳×׳¨׳’׳•׳ ׳©׳ ׳”׳™׳•׳.' }),
            Object.freeze({ role: '׳׳˜׳₪׳', text: '׳–׳” ׳׳” ׳©׳׳¡׳ ׳”׳‘׳™׳× ׳׳׳“׳: ׳‘׳—׳™׳¨׳× ׳׳¡׳׳•׳ ׳×׳¨׳’׳•׳ ׳‘׳׳§׳•׳ ׳§׳₪׳™׳¦׳” ׳׳§׳¨׳׳™׳× ׳‘׳™׳ ׳›׳׳™׳.' })
        ])
    })
});

function looksLikeMojibakeText(value) {
    const text = String(value || '');
    if (!text) return false;
    const marks = (text.match(/׳/g) || []).length;
    return marks >= 4 || /ג€|ג†|ג­|נ|�|ֳ—|\bג(?:ש|ל)\b|×[A-Za-zÀ-ÿ]/.test(text);
}

let win1255ReverseByteMap = null;
let mojibakeMutationObserver = null;
let isApplyingMojibakeRepair = false;

function getWin1255ReverseByteMap() {
    if (win1255ReverseByteMap) return win1255ReverseByteMap;
    if (typeof TextDecoder !== 'function') return null;

    let decoder = null;
    try {
        decoder = new TextDecoder('windows-1255');
    } catch (_error) {
        return null;
    }

    const map = new Map();
    for (let byte = 0; byte <= 255; byte += 1) {
        const decoded = decoder.decode(new Uint8Array([byte]));
        if (!decoded || decoded === '\uFFFD') continue;
        if (!map.has(decoded)) map.set(decoded, byte);
    }
    win1255ReverseByteMap = map;
    return win1255ReverseByteMap;
}

function decodeWin1255MojibakeToUtf8(value) {
    const raw = String(value || '');
    if (!raw || !looksLikeMojibakeText(raw)) return raw;
    const reverseMap = getWin1255ReverseByteMap();
    if (!reverseMap || typeof TextDecoder !== 'function') return raw;

    const bytes = [];
    for (const ch of raw) {
        if (reverseMap.has(ch)) {
            bytes.push(reverseMap.get(ch));
            continue;
        }
        const code = ch.codePointAt(0);
        if (Number.isFinite(code) && code <= 0x7f) {
            bytes.push(code);
            continue;
        }
        return raw;
    }

    let decoded = raw;
    try {
        decoded = new TextDecoder('utf-8').decode(new Uint8Array(bytes));
    } catch (_error) {
        return raw;
    }

    if (!decoded || decoded === raw) return raw;

    const decodedLooksBetter = !looksLikeMojibakeText(decoded)
        && (/[\u0590-\u05FF]/.test(decoded) || /[\u{1F300}-\u{1FAFF}]/u.test(decoded) || /[“”’‘–—…]/.test(decoded));
    return decodedLooksBetter ? decoded : raw;
}

function normalizeUiText(value) {
    if (value === null || value === undefined) return '';
    return decodeWin1255MojibakeToUtf8(String(value));
}

function deepNormalizeUiPayload(value, seen = new WeakMap()) {
    if (typeof value === 'string') return normalizeUiText(value);
    if (value === null || value === undefined) return value;
    if (typeof value !== 'object') return value;
    if (seen.has(value)) return seen.get(value);

    if (Array.isArray(value)) {
        const arr = [];
        seen.set(value, arr);
        value.forEach((item, index) => {
            arr[index] = deepNormalizeUiPayload(item, seen);
        });
        return arr;
    }

    const out = {};
    seen.set(value, out);
    Object.keys(value).forEach((key) => {
        out[key] = deepNormalizeUiPayload(value[key], seen);
    });
    return out;
}

function repairMojibakeElementAttributes(element) {
    if (!element || !element.getAttributeNames) return;
    ['title', 'aria-label', 'placeholder'].forEach((attr) => {
        const current = element.getAttribute(attr);
        if (!current || !looksLikeMojibakeText(current)) return;
        const fixed = normalizeUiText(current);
        if (fixed && fixed !== current) {
            element.setAttribute(attr, fixed);
        }
    });
}

function repairMojibakeDomSubtree(root) {
    if (!root || isApplyingMojibakeRepair) return;
    isApplyingMojibakeRepair = true;
    try {
        const processTextNode = (node) => {
            if (!node || node.nodeType !== Node.TEXT_NODE) return;
            const original = node.nodeValue || '';
            if (!looksLikeMojibakeText(original)) return;
            const fixed = normalizeUiText(original);
            if (fixed && fixed !== original) {
                node.nodeValue = fixed;
            }
        };

        if (root.nodeType === Node.TEXT_NODE) {
            processTextNode(root);
            return;
        }

        if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE && root !== document.body) {
            return;
        }

        const elementRoot = root.nodeType === Node.ELEMENT_NODE ? root : null;
        if (elementRoot) {
            if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(elementRoot.tagName)) return;
            repairMojibakeElementAttributes(elementRoot);
        }

        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
            {
                acceptNode(node) {
                    if (node.nodeType === Node.TEXT_NODE) return NodeFilter.FILTER_ACCEPT;
                    if (node.nodeType !== Node.ELEMENT_NODE) return NodeFilter.FILTER_SKIP;
                    const tag = node.tagName;
                    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        let current = walker.currentNode;
        while (current) {
            if (current.nodeType === Node.TEXT_NODE) {
                processTextNode(current);
            } else if (current.nodeType === Node.ELEMENT_NODE) {
                repairMojibakeElementAttributes(current);
            }
            current = walker.nextNode();
        }
    } finally {
        isApplyingMojibakeRepair = false;
    }
}

function setupMojibakeAutoRepair() {
    if (mojibakeMutationObserver || typeof MutationObserver !== 'function') {
        repairMojibakeDomSubtree(document.body);
        return;
    }

    repairMojibakeDomSubtree(document.body);

    mojibakeMutationObserver = new MutationObserver((mutations) => {
        if (isApplyingMojibakeRepair) return;
        for (const mutation of mutations) {
            if (mutation.type === 'characterData') {
                repairMojibakeDomSubtree(mutation.target);
                continue;
            }
            if (mutation.type === 'attributes') {
                repairMojibakeDomSubtree(mutation.target);
                continue;
            }
            mutation.addedNodes.forEach((node) => repairMojibakeDomSubtree(node));
        }
    });

    mojibakeMutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['title', 'aria-label', 'placeholder']
    });
}

function pickReadableText(primary, fallback) {
    const p = String(primary || '').trim();
    if (p) {
        const repaired = normalizeUiText(p);
        if (repaired && !looksLikeMojibakeText(repaired)) return repaired;
    }
    return String(fallback || '').trim();
}

const RUNTIME_CLEAN_SCREEN_GUIDE_DEFAULT = Object.freeze({
    logic: 'התרגול בנוי מלמטה למעלה: מזהים ניסוח עמום, מדייקים שפה, ואז בוחרים צעד קטן וישים.',
    goal: 'להחליף בלבול/אוטומטיות בחשיבה מדויקת שמובילה לפעולה.',
    approach: 'עובדים לאט: קוראים את ההסבר, עושים צעד אחד, בודקים משוב, וממשיכים.',
    expected: 'בסיום התרגול תדע/י לזהות ניסוח עמום, לשאול שאלה מדויקת, ולתרגם את זה לצעד מעשי.',
    success: 'התקדמות נראית כשאת/ה יכול/ה להסביר למה בחרת צעד מסוים ומה הוא פותח בהמשך.'
});

const RUNTIME_CLEAN_SCREEN_GUIDE_OVERRIDES = Object.freeze({
    'practice-triples-radar': Object.freeze({
        logic: 'Triples Radar בודק דפוס כשלשה (שלוש קטגוריות באותה שורה), ולא רק קטגוריה אחת מבודדת.',
        goal: 'לראות איך כמה רכיבי Meta Model עובדים יחד באותה שכבת משמעות.',
        approach: 'בחר/י מצב עבודה (רגיל/Triples), קרא/י את המשפט, ענה/י לפי ההנחיה, ואז בדוק/י את המשוב לפני השלב הבא.',
        expected: 'בסיום תדע/י להבחין בין עבודה על קטגוריה אחת לבין עבודה על שלשה שלמה באותה שורה.',
        success: 'התקדמות נראית כשאת/ה מצליח/ה להסביר מה כל רכיב בשלשה תורם למפה הכוללת.'
    }),
    'practice-verb-unzip': Object.freeze({
        logic: 'המסך הזה מרכז מעבר מהיר בין פיצ\'רים וגם מאפשר תרגול Unzip (פירוק פועל עמום) בתוך אותו עמוד.',
        goal: 'לבחור פיצ\'ר מתאים מהר, בלי עומס כפתורים גדול על המסך.',
        approach: 'בחר/י פיצ\'ר אחד מהתפריט היורד, פתח/י אותו, וסיים/י סבב קצר לפני מעבר לכלי הבא.'
    })
});

const RUNTIME_CLEAN_DEFAULT_THERAPEUTIC_DEMO = Object.freeze({
    banner: 'דוגמת שימוש לימודית: זה לא "מהלך טיפולי נכון" אחד, אלא המחשה איך לעבוד עם הכלי.',
    frame: 'זו דוגמת שימוש קצרה. המטרה היא להבין איזה סוג מיומנות הכלי מחזק (דיוק, חקירה, שיקוף, או בחירת צעד המשך).',
    outcomeTitle: 'מה מקבלים מהכלי הזה',
    turns: Object.freeze([
        Object.freeze({ role: 'מטופל', text: 'אני מרגיש שהכול תקוע, ולא בטוח מאיפה להתחיל.' }),
        Object.freeze({ role: 'מטפל', text: 'בוא ניקח נקודה אחת ונעבוד עליה דרך הכלי, כדי להבין מה בדיוק קורה.' }),
        Object.freeze({ role: 'מטופל', text: 'כשמפרקים את זה, אני רואה פרטים שלא שמתי לב אליהם קודם.' }),
        Object.freeze({ role: 'מטפל', text: 'מעולה. עכשיו נבחר את השאלה/התגובה הכי מדויקת לשלב הבא.' })
    ]),
    outcomes: Object.freeze([
        'לעבור מעומס כללי לצעד ברור אחד.',
        'להישאר מדויק/ת בלי להמציא שאלות אקראיות.',
        'לתרגל תהליך שחוזר על עצמו עד שהוא נהיה טבעי.'
    ])
});

const RUNTIME_CLEAN_THERAPEUTIC_DEMO_OVERRIDES = Object.freeze({
    'practice-triples-radar': Object.freeze({
        banner: 'דוגמת שימוש: כאן רואים איך עובדים על שלשה שלמה (ולא רק על קטגוריה אחת).',
        frame: 'זו דוגמה תהליכית ל-Triples Radar: מזהים משפחה של דפוסים (שלשה), ורק אז שואלים/משקפים בצורה מדויקת.',
        turns: Object.freeze([
            Object.freeze({ role: 'מטופל', text: 'אני יודע שהוא חושב שאני לא מספיק טוב, אז אני חייב להוכיח את עצמי.' }),
            Object.freeze({ role: 'מטפל', text: 'במקום לבחור רק קטגוריה אחת, נבדוק כאן שלשה: מה אתה יודע, מה אתה מניח, ולפי איזה כלל אתה שופט.' }),
            Object.freeze({ role: 'מטופל', text: 'כששואלים את כל השלשה, אני רואה שזה אותו מנגנון שחוזר.' }),
            Object.freeze({ role: 'מטפל', text: 'בדיוק. Triples Radar עוזר לראות משפחה של דפוסים, לא רק טריגר אחד.' })
        ]),
        outcomes: Object.freeze([
            'לזהות קטגוריה בתוך הקשר של שלשה מלאה.',
            'לראות איך 3 רכיבים עובדים יחד באותה שכבה.',
            'לבנות שיקוף/אתגור מדויקים יותר כי המפה רחבה יותר.'
        ])
    })
});

function getCleanScreenGuideCopy(screenId, rawCopy) {
    const override = RUNTIME_CLEAN_SCREEN_GUIDE_OVERRIDES[screenId] || {};
    const defaultCopy = RUNTIME_CLEAN_SCREEN_GUIDE_DEFAULT;
    const source = rawCopy || {};
    return {
        logic: pickReadableText(override.logic || source.logic, defaultCopy.logic),
        goal: pickReadableText(override.goal || source.goal, defaultCopy.goal),
        approach: pickReadableText(override.approach || source.approach, defaultCopy.approach),
        expected: pickReadableText(override.expected || source.expected, defaultCopy.expected),
        success: pickReadableText(override.success || source.success, defaultCopy.success)
    };
}

function getTherapeuticDemoContent(screenId, screenTitle, guideCopy) {
    const featureSpecificRaw = THERAPEUTIC_DEMO_BY_SCREEN[screenId] || {};
    const featureSpecificOverride = RUNTIME_CLEAN_THERAPEUTIC_DEMO_OVERRIDES[screenId] || {};
    const safeGuideCopy = getCleanScreenGuideCopy(screenId, guideCopy);
    const defaultDemo = RUNTIME_CLEAN_DEFAULT_THERAPEUTIC_DEMO;

    const turns = Array.isArray(featureSpecificOverride.turns) && featureSpecificOverride.turns.length
        ? featureSpecificOverride.turns
        : (Array.isArray(featureSpecificRaw.turns) && featureSpecificRaw.turns.length && !featureSpecificRaw.turns.some((t) => looksLikeMojibakeText(t?.text || t?.role))
            ? featureSpecificRaw.turns
            : defaultDemo.turns);

    const outcomes = Array.isArray(featureSpecificOverride.outcomes) && featureSpecificOverride.outcomes.length
        ? featureSpecificOverride.outcomes
        : (Array.isArray(featureSpecificRaw.outcomes) && featureSpecificRaw.outcomes.length && !featureSpecificRaw.outcomes.some((item) => looksLikeMojibakeText(item))
            ? featureSpecificRaw.outcomes
            : [
                safeGuideCopy.logic || defaultDemo.outcomes[0],
                safeGuideCopy.approach || defaultDemo.outcomes[1],
                safeGuideCopy.goal || defaultDemo.outcomes[2]
            ].filter(Boolean).slice(0, 3));

    const fallbackFrame = `${defaultDemo.frame} בפיצ'ר "${screenTitle}" המטרה היא: ${safeGuideCopy.goal || 'לתרגל דיוק ותהליך.'}`;

    return {
        banner: pickReadableText(featureSpecificOverride.banner || featureSpecificRaw.banner, defaultDemo.banner),
        frame: pickReadableText(featureSpecificOverride.frame || featureSpecificRaw.frame, fallbackFrame),
        turns,
        outcomeTitle: pickReadableText(featureSpecificOverride.outcomeTitle || featureSpecificRaw.outcomeTitle, defaultDemo.outcomeTitle),
        outcomes
    };
}

const SCREEN_READ_GUIDE_TARGET_IDS = Object.freeze([
    'scenario-trainer',
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
    'practice-verb-unzip',
    'blueprint',
    'about'
]);

function setFeatureMapToggleOpen(isOpen) {
    const featureMap = document.getElementById('feature-map-toggle');
    if (!featureMap) return;
    if (isOpen) featureMap.setAttribute('open', '');
    else featureMap.removeAttribute('open');
}

function openFeatureMapMenu() {
    const featureMap = document.getElementById('feature-map-toggle');
    if (!featureMap) return;
    setFeatureMapToggleOpen(true);
    try {
        featureMap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (_error) {
        featureMap.scrollIntoView();
    }
}

function setupFeatureMapOverlayControls() {
    const featureMap = document.getElementById('feature-map-toggle');
    if (!featureMap || featureMap.dataset.boundOverlayFeatureMap === 'true') return;
    featureMap.dataset.boundOverlayFeatureMap = 'true';

    const openBtn = document.getElementById('home-open-feature-map');
    if (openBtn && openBtn.dataset.boundFeatureMapOpen !== 'true') {
        openBtn.dataset.boundFeatureMapOpen = 'true';
        openBtn.addEventListener('click', () => openFeatureMapMenu());
    }

    featureMap.addEventListener('toggle', () => {
        document.body.classList.toggle('feature-map-open', featureMap.open);
    });

    document.addEventListener('click', (event) => {
        if (!featureMap.open) return;
        if (featureMap.contains(event.target)) return;
        setFeatureMapToggleOpen(false);
    });
}

function setupGlobalFeatureMenuDropdown() {
    const featureMap = document.getElementById('feature-map-toggle');
    const body = featureMap?.querySelector('.feature-map-body');
    if (!featureMap || !body || featureMap.dataset.globalFeatureMenuBound === 'true') return;
    featureMap.dataset.globalFeatureMenuBound = 'true';

    const summary = featureMap.querySelector('.feature-map-summary');
    const summaryTitle = featureMap.querySelector('.feature-map-summary-title');
    const featureMapIntro = featureMap.querySelector('.feature-map-intro');
    if (summaryTitle) summaryTitle.textContent = 'תפריט האימונים';
    if (featureMapIntro) {
        featureMapIntro.textContent = 'תפריט אחד לכל הכלים: בוחרים מסך או כלי לפי סוג האימון, ולוחצים פתיחה.';
    }
    if (summary && !summary.querySelector('small')) {
        const badge = document.createElement('small');
        badge.textContent = 'MENU';
        summary.appendChild(badge);
    }

    const menuBox = document.createElement('div');
    menuBox.className = 'feature-map-menu-box';
    menuBox.innerHTML = `
        <div class="feature-map-menu-head">
            <strong>תפריט האימונים והתרגילים</strong>
            <small>ממויין לפי סוג היכולת</small>
        </div>
        <div class="feature-map-menu-controls">
            <select class="feature-map-menu-select" data-global-feature-menu-select aria-label="בחירת פיצ'ר"></select>
            <button type="button" class="btn btn-primary feature-map-menu-open" data-global-feature-menu-open>פתח</button>
        </div>
    `;
    body.prepend(menuBox);
    featureMap.classList.add('is-menu-enhanced');
    setFeatureMapToggleOpen(false);

    const select = menuBox.querySelector('[data-global-feature-menu-select]');
    const openBtn = menuBox.querySelector('[data-global-feature-menu-open]');
    if (!select || !openBtn) return;

    const entries = [];
    const seenKeys = new Set();
    const labelOverrides = Object.freeze({
        'tab:home': 'בית · התחלה והכוונה',
        'tab:scenario-trainer': 'סימולטור סצנות (Execution)',
        'tab:comic-engine': 'Comic Engine · תגובות/מהלכים',
        'tab:categories': 'קטגוריות (ברין)',
        'tab:practice-question': 'תרגול שאלות',
        'tab:practice-radar': 'Meta Radar',
        'tab:practice-triples-radar': 'Triples Radar (Breen)',
        'tab:practice-wizard': 'כמתים נסתרים · הגשר שנסגר',
        'tab:practice-verb-unzip': 'פועל לא מפורט (Unzip)',
        'tab:blueprint': 'בונה מהלך (Blueprint)',
        'tab:prismlab': 'Prism Lab · רמות לוגיות',
        'tab:about': 'על הפרויקט',
        'href:classic_classic_trainer.html': 'Classic 1 · Classic Classic',
        'href:classic2_trainer.html': 'Classic 2 · Structure of Magic',
        'href:iceberg_templates_trainer.html': 'קצה קרחון / שלדי עומק',
        'href:prism_research_trainer.html': 'Prism Research · Text Research',
        'href:living_triples_trainer.html': 'Living Triples',
        'href:verb_unzip_trainer.html': 'Unzip Trainer (Standalone)',
        'href:sentence_morpher_trainer.html': 'Sentence Morpher',
        'href:prism_lab_trainer.html': 'Prism Lab (Standalone)'
    });
    const groupLabels = Object.freeze({
        orientation: 'התחלה והכוונה',
        core: 'אימון מטה-מודל בסיסי',
        systemic: 'אימון מרחבי / טבלאות ברין',
        process: 'בניית תהליך / סימולציה',
        depth: 'כלי עומק וקלאסיקות (Standalone)',
        language: 'דיוק ניסוח ושפה (Standalone)',
        research: 'פריזמות / מחקר טקסט (Standalone)',
        misc: 'כלים נוספים'
    });
    const groupOrder = Object.freeze([
        groupLabels.orientation,
        groupLabels.core,
        groupLabels.systemic,
        groupLabels.process,
        groupLabels.depth,
        groupLabels.language,
        groupLabels.research,
        groupLabels.misc
    ]);
    const classifyEntryGroup = (key) => {
        if (!key) return groupLabels.misc;
        if (['tab:home', 'tab:about'].includes(key)) return groupLabels.orientation;
        if ([
            'tab:practice-question',
            'tab:practice-radar',
            'tab:practice-wizard',
            'tab:practice-verb-unzip'
        ].includes(key)) return groupLabels.core;
        if ([
            'tab:practice-triples-radar',
            'tab:categories',
            'href:living_triples_trainer.html'
        ].includes(key)) return groupLabels.systemic;
        if ([
            'tab:scenario-trainer',
            'tab:comic-engine',
            'tab:blueprint',
            'tab:prismlab'
        ].includes(key)) return groupLabels.process;
        if ([
            'href:classic_classic_trainer.html',
            'href:classic2_trainer.html',
            'href:iceberg_templates_trainer.html'
        ].includes(key)) return groupLabels.depth;
        if ([
            'href:verb_unzip_trainer.html',
            'href:sentence_morpher_trainer.html'
        ].includes(key)) return groupLabels.language;
        if ([
            'href:prism_research_trainer.html',
            'href:prism_lab_trainer.html'
        ].includes(key)) return groupLabels.research;
        return groupLabels.misc;
    };
    const pushEntry = (entry) => {
        if (!entry || !entry.key || seenKeys.has(entry.key)) return;
        const resolvedLabel = normalizeUiText(labelOverrides[entry.key] || entry.label || '').trim();
        if (!resolvedLabel) return;
        seenKeys.add(entry.key);
        entries.push({
            ...entry,
            label: resolvedLabel,
            group: classifyEntryGroup(entry.key)
        });
    };

    Array.from(document.querySelectorAll('.tab-btn')).forEach((btn) => {
        const tabId = String(btn.getAttribute('data-tab') || '').trim();
        const label = normalizeUiText((btn.textContent || '').trim());
        if (!tabId || !label) return;
        pushEntry({
            key: `tab:${tabId}`,
            label,
            actionType: 'navigate',
            actionValue: tabId,
            element: btn
        });
    });

    Array.from(featureMap.querySelectorAll('.feature-map-grid a.btn')).forEach((anchor) => {
        const hrefKey = String(anchor.getAttribute('data-versioned-href') || anchor.getAttribute('href') || '').split('?')[0].trim();
        const label = normalizeUiText((anchor.textContent || '').replace(/\s+/g, ' ').trim());
        if (!hrefKey || !label) return;
        pushEntry({
            key: `href:${hrefKey}`,
            label,
            actionType: 'anchor',
            actionValue: hrefKey,
            element: anchor
        });
    });

    const groups = groupOrder.filter((groupName) => entries.some((entry) => entry.group === groupName));
    const html = ['<option value="">בחר/י פיצ\'ר…</option>'];
    groups.forEach((groupName) => {
        const groupEntries = entries.filter((entry) => entry.group === groupName);
        if (!groupEntries.length) return;
        html.push(`<optgroup label="${escapeHtml(groupName)}">`);
        groupEntries.forEach((entry) => {
            html.push(`<option value="${escapeHtml(entry.key)}">${escapeHtml(entry.label)}</option>`);
        });
        html.push('</optgroup>');
    });
    select.innerHTML = html.join('');

    const entryMap = entries.reduce((acc, entry) => {
        acc[entry.key] = entry;
        return acc;
    }, {});

    const syncToActiveTab = () => {
        const activeTab = document.querySelector('.tab-btn.active')?.getAttribute('data-tab') || 'home';
        const key = `tab:${activeTab}`;
        if (entryMap[key]) select.value = key;
    };
    syncToActiveTab();

    const executeSelected = () => {
        const selected = entryMap[select.value];
        if (!selected) return;
        try {
            if (selected.actionType === 'navigate') {
                navigateTo(selected.actionValue);
            } else if (selected.element && typeof selected.element.click === 'function') {
                selected.element.click();
            }
        } finally {
            setFeatureMapToggleOpen(false);
        }
    };

    openBtn.addEventListener('click', executeSelected);
    select.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            executeSelected();
        }
    });

    document.addEventListener('click', (event) => {
        const btn = event.target?.closest?.('.tab-btn');
        if (btn) syncToActiveTab();
    });
}

function buildScreenReadGuide(screenId) {
    const rawCopy = SCREEN_READ_GUIDES[screenId] || DEFAULT_SCREEN_READ_GUIDE;
    const copy = getCleanScreenGuideCopy(screenId, rawCopy);
    const wrapper = document.createElement('div');
    wrapper.className = 'screen-read-guide';
    wrapper.dataset.screenGuide = screenId;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-primary screen-read-guide-btn';
    button.innerHTML = `
        <span class="screen-read-guide-btn-main">קרא/י לפני שמתחילים</span>
        <span class="screen-read-guide-btn-sub">הסבר מלא: היגיון, דרך עבודה ומה צפוי לדעת אחרי התרגול</span>
    `;

    const modal = document.createElement('div');
    const modalId = `screen-read-guide-modal-${screenId}`;
    modal.className = 'screen-read-guide-modal hidden';
    modal.id = modalId;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    button.setAttribute('aria-controls', modalId);
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-expanded', 'false');

    const title = getScreenReadGuideTitle(screenId);
    const expected = copy.expected || `׳׳׳—׳¨ ׳”׳×׳¨׳’׳•׳ ׳‘׳׳¡׳ ׳”׳–׳” ׳×׳“׳¢/׳™: ${copy.goal}`;
    const success = copy.success || DEFAULT_SCREEN_READ_GUIDE.success;
    const demo = getTherapeuticDemoContent(screenId, title, copy);

    const philosopherToggle = document.createElement('details');
    philosopherToggle.className = 'screen-read-guide-philosopher-toggle';
    philosopherToggle.innerHTML = `
        <summary class="screen-read-guide-philosopher-summary" aria-label="פילוסוף מסך - פתיחת ההיגיון מאחורי התרגול">
            <div class="screen-read-guide-illustration-media">
                <img class="screen-read-guide-philosopher" src="assets/svg/props/philosopher-guide.svg" alt="פילוסוף מסביר" loading="lazy">
            </div>
            <div class="screen-read-guide-illustration-copy">
                <strong>פילוסוף מסך · ההיגיון מאחורי התרגול</strong>
                <span>לחיצה פותחת הסבר קצר למה הכלי הזה עובד ומה בדיוק הוא בא לתרגל.</span>
            </div>
        </summary>
        <div class="screen-read-guide-philosopher-panel">
            <p>${escapeHtml(demo.banner)}</p>
            <div class="screen-read-guide-philosopher-meta">
                <p><strong>מה ההיגיון של התהליך כאן?</strong> ${escapeHtml(copy.logic)}</p>
                <p><strong>מה בדיוק מתרגלים במסך הזה?</strong> ${escapeHtml(copy.goal)}</p>
            </div>
        </div>
    `;

    const toolbar = document.createElement('div');
    toolbar.className = 'screen-read-guide-toolbar';

    const demoBtn = document.createElement('button');
    demoBtn.type = 'button';
    demoBtn.className = 'btn btn-secondary screen-read-guide-demo-btn';
    demoBtn.innerHTML = `
        <span class="screen-read-guide-btn-main">דיאלוג טיפולי לדוגמה</span>
        <span class="screen-read-guide-btn-sub">דוגמת שימוש שממחישה איך הכלי עוזר בשיחה אמיתית</span>
    `;

    const demoModal = document.createElement('div');
    const demoModalId = `screen-demo-dialogue-modal-${screenId}`;
    demoModal.className = 'screen-read-guide-modal hidden';
    demoModal.id = demoModalId;
    demoModal.setAttribute('role', 'dialog');
    demoModal.setAttribute('aria-modal', 'true');
    demoBtn.setAttribute('aria-controls', demoModalId);
    demoBtn.setAttribute('aria-haspopup', 'dialog');
    demoBtn.setAttribute('aria-expanded', 'false');

    modal.innerHTML = `
        <div class="screen-read-guide-dialog">
            <button type="button" class="screen-read-guide-close" aria-label="סגירה">×</button>
            <h3>קרא/י לפני שמתחילים: ${escapeHtml(title)}</h3>
            <p class="screen-read-guide-lead">המטרה כאן היא לא רק לענות נכון, אלא להבין את ההיגיון של התרגול כדי ליישם אותו גם בשיחה אמיתית מחוץ לאפליקציה.</p>
            <div class="screen-read-guide-content">
                <h4>מה ההיגיון של התרגול?</h4>
                <p>${escapeHtml(copy.logic)}</p>
                <h4>מה בדיוק המטרה במסך הזה?</h4>
                <p>${escapeHtml(copy.goal)}</p>
                <h4>איך לגשת לתרגול שלב-שלב?</h4>
                <p>${escapeHtml(copy.approach)}</p>
                <h4>סדר עבודה מומלץ כדי להפיק תוצאה אמיתית</h4>
                <ol class="screen-read-guide-steps">
                    <li>לעבור פעם ראשונה על המשפט/המשימה כדי להבין הקשר כללי.</li>
                    <li>לעבור שוב ולזהות מילה/הנחה שיוצרות עמימות, לחץ או הכללה.</li>
                    <li>לבחור שאלה/תגובה שמפרקת את העמימות לצעד ברור.</li>
                    <li>להסתכל על המשוב, לתקן אם צריך, ואז להמשיך לסבב הבא.</li>
                </ol>
                <h4>מה צפוי שתדע/י לעשות אחרי התרגול?</h4>
                <p>${escapeHtml(expected)}</p>
                <h4>איך תזהה/י שהתקדמת?</h4>
                <p>${escapeHtml(success)}</p>
                <p class="screen-read-guide-summary">התוצאה הרצויה בסוף התרגול: לא רק "לענות נכון", אלא לדעת להסביר את ההיגיון מאחורי הבחירה וליישם אותו בשיחה אמיתית.</p>
            </div>
            <div class="screen-read-guide-actions">
                <button type="button" class="btn btn-primary screen-read-guide-confirm">הבנתי, אפשר להתחיל</button>
            </div>
        </div>
    `;

    const demoTurnsHtml = (Array.isArray(demo.turns) ? demo.turns : []).map((turn) => `
        <div class="screen-demo-dialogue-turn">
            <span class="screen-demo-dialogue-role">${escapeHtml(turn.role || 'דובר')}</span>
            <p class="screen-demo-dialogue-text">${escapeHtml(turn.text || '')}</p>
        </div>
    `).join('');
    const demoOutcomesHtml = (Array.isArray(demo.outcomes) ? demo.outcomes : [])
        .slice(0, 4)
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join('');

    demoModal.innerHTML = `
        <div class="screen-read-guide-dialog screen-read-guide-dialog-demo">
            <button type="button" class="screen-read-guide-close" aria-label="סגירה">×</button>
            <h3>דיאלוג טיפולי לדוגמה: ${escapeHtml(title)}</h3>
            <p class="screen-read-guide-lead">${escapeHtml(demo.frame)}</p>
            <div class="screen-demo-dialogue-box">${demoTurnsHtml}</div>
            <div class="screen-demo-dialogue-summary">
                <h4>${escapeHtml(demo.outcomeTitle || 'מה מקבלים מהכלי הזה')}</h4>
                <ul class="screen-demo-dialogue-list">${demoOutcomesHtml}</ul>
                <p class="screen-demo-dialogue-footnote">זו דוגמת שימוש לימודית. המטרה היא להבין איזה סוג כלי זה נותן לך, ואיך לשלב אותו עם שאר הכלים כדי לקבל שיח מדויק ויעיל יותר.</p>
            </div>
            <div class="screen-read-guide-actions">
                <button type="button" class="btn btn-primary screen-read-guide-confirm">סגור דוגמה</button>
            </div>
        </div>
    `;

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

    const demoCloseButtons = demoModal.querySelectorAll('.screen-read-guide-close, .screen-read-guide-confirm');
    const openDemoModal = () => {
        demoModal.classList.remove('hidden');
        demoBtn.setAttribute('aria-expanded', 'true');
        document.body.classList.add('screen-guide-open');
        playUISound('hint');
    };
    const closeDemoModal = () => {
        demoModal.classList.add('hidden');
        demoBtn.setAttribute('aria-expanded', 'false');
        if (!document.querySelector('.screen-read-guide-modal:not(.hidden)')) {
            document.body.classList.remove('screen-guide-open');
        }
    };

    demoBtn.addEventListener('click', openDemoModal);
    demoCloseButtons.forEach((btn) => btn.addEventListener('click', closeDemoModal));
    demoModal.addEventListener('click', (event) => {
        if (event.target === demoModal) closeDemoModal();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !demoModal.classList.contains('hidden')) {
            closeDemoModal();
        }
    });

    toolbar.appendChild(button);
    toolbar.appendChild(demoBtn);
    wrapper.appendChild(philosopherToggle);
    wrapper.appendChild(toolbar);
    wrapper.appendChild(modal);
    wrapper.appendChild(demoModal);
    return wrapper;
}

function getScreenReadGuideTitle(screenId) {
    const screen = document.getElementById(screenId);
    if (!screen) return 'מסך תרגול';
    const heading = screen.querySelector('h2, h3');
    const title = normalizeUiText(heading?.textContent?.trim() || '');
    return looksLikeMojibakeText(title) ? 'מסך תרגול' : (title || 'מסך תרגול');
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

function getVersionFromHtmlAttribute() {
    try {
        const version = (document.documentElement?.getAttribute('data-app-version') || '').trim();
        return version || '';
    } catch (error) {
        return '';
    }
}

function getBuildMetaFromHtmlAttributes() {
    try {
        const rootEl = document.documentElement;
        if (!rootEl) return {};
        const buildTime = (rootEl.getAttribute('data-build-time') || '').trim();
        const buildIso = (rootEl.getAttribute('data-build-iso') || '').trim();
        const gitCommit = (rootEl.getAttribute('data-git-commit') || '').trim();
        return { buildTime, buildIso, gitCommit };
    } catch (error) {
        return {};
    }
}

function getShortBuildCommit() {
    const gitCommit = String(getBuildMetaFromHtmlAttributes().gitCommit || '').trim();
    if (!gitCommit || gitCommit === 'unknown') return '';
    return gitCommit.slice(0, 7);
}

function formatAppVersionDisplay(version) {
    const resolvedVersion = String(version || '').trim() || 'unknown';
    return resolvedVersion;
}

function buildAppVersionTitle(version) {
    const resolvedVersion = String(version || '').trim() || 'unknown';
    const meta = getBuildMetaFromHtmlAttributes();
    const parts = [`v${resolvedVersion}`];
    if (meta.gitCommit) parts.push(`commit ${meta.gitCommit}`);
    if (meta.buildIso) parts.push(`build ${meta.buildIso}`);
    else if (meta.buildTime) parts.push(`buildTime ${meta.buildTime}`);
    return parts.join(' | ');
}

async function resolveAppVersion() {
    // 1. Try to get version from HTML data-app-version attribute (most reliable for static hosting)
    const htmlVersion = getVersionFromHtmlAttribute();
    if (htmlVersion) return htmlVersion;

    // 2. Try to get version from script query parameter
    const scriptVersion = getVersionFromAppScriptQuery();
    if (scriptVersion) return scriptVersion;

    // 3. Try to get version from package.json (fallback, may fail on static hosting without CORS)
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

    return 'unknown';
}

const APP_VERSION_CHIP_LABEL = '\u05d2\u05e8\u05e1\u05d4 \u05e0\u05d5\u05db\u05d7\u05d9\u05ea';
const APP_VERSION_FLOATING_LABEL = '\u05d2\u05e8\u05e1\u05d4 \u05e4\u05e2\u05d9\u05dc\u05d4';

function applyAppVersion(version) {
    const resolvedVersion = String(version || '').trim() || 'unknown';
    const visibleVersion = formatAppVersionDisplay(resolvedVersion);
    const versionTitle = buildAppVersionTitle(resolvedVersion);
    const chip = document.getElementById('app-version-chip');
    if (chip) {
        chip.textContent = `${APP_VERSION_CHIP_LABEL}: ${visibleVersion}`;
        chip.dataset.version = resolvedVersion;
        chip.dataset.buildCommit = getShortBuildCommit();
        chip.setAttribute('title', versionTitle);
    }

    const floating = document.getElementById('app-version-floating');
    if (floating) {
        floating.textContent = `${APP_VERSION_FLOATING_LABEL}: ${visibleVersion}`;
        floating.dataset.version = resolvedVersion;
        floating.dataset.buildCommit = getShortBuildCommit();
        floating.setAttribute('title', versionTitle);
    }

    if (typeof document.title === 'string' && document.title) {
        const baseTitle = document.title.replace(/\s+\[v[^\]]+\]$/i, '');
        document.title = `${baseTitle} [v${visibleVersion}]`;
    }

    if (!window.__APP_VERSION_LOGGED__) {
        window.__APP_VERSION_LOGGED__ = true;
        try {
            const meta = getBuildMetaFromHtmlAttributes();
            console.info('[Meta Model] Active build', {
                version: resolvedVersion,
                visibleVersion,
                gitCommit: meta.gitCommit || '',
                buildIso: meta.buildIso || '',
                buildTime: meta.buildTime || ''
            });
        } catch (error) {
            // ignore
        }
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

function setupFeatureLauncherTabs() {
    const launchers = document.querySelectorAll('[data-feature-launcher]');
    if (!launchers.length) return;

    const featureLabelOverrides = Object.freeze({
        "nav:practice-question": "תרגול שאלות",
        "nav:practice-radar": "Meta Radar",
        "nav:practice-wizard": "כמתים נסתרים · גשר השפה",
        "nav:practice-verb-unzip": "פועל לא מפורט",
        "nav:blueprint": "Blueprint Builder",
        "nav:prismlab": "Prism Lab · רמות לוגיות",
        "nav:practice-triples-radar": "Triples Radar (Breen)",
        "nav:categories": "קטגוריות (עם ברין)",
        "nav:comic-engine": "Comic Engine",
        "nav:scenario-trainer": "Scenario Trainer",
        "href:verb_unzip_trainer.html": "Unzip Trainer (Standalone)",
        "href:sentence_morpher_trainer.html": "Sentence Morpher",
        "href:prism_research_trainer.html": "Prism Research (Chain)",
        "href:iceberg_templates_trainer.html": "קצה קרחון / שלדי עומק",
        "href:living_triples_trainer.html": "Living Triples",
        "href:classic_classic_trainer.html": "Classic 1 · Classic Classic",
        "href:classic2_trainer.html": "Classic 2 · Structure of Magic"
    });

    function parseLauncherEntry(element) {
        if (!element) return null;
        const panel = element.closest('[data-feature-group-panel]');
        const group = panel ? String(panel.getAttribute('data-feature-group-panel') || '') : '';
        let key = '';
        let actionType = '';
        let actionValue = '';
        if (element.tagName === 'A') {
            actionType = 'href';
            actionValue = String(element.getAttribute('data-versioned-href') || element.getAttribute('href') || '').trim();
            key = `href:${actionValue.split('?')[0]}`;
        } else {
            const onclick = String(element.getAttribute('onclick') || '');
            const navMatch = onclick.match(/navigateTo\('([^']+)'\)/);
            if (navMatch) {
                actionType = 'navigate';
                actionValue = navMatch[1];
                key = `nav:${actionValue}`;
            }
        }
        if (!actionType) return null;
        const fallbackLabel = String(element.textContent || '').replace(/\s+/g, ' ').trim();
        return {
            key,
            group,
            label: featureLabelOverrides[key] || (looksLikeMojibakeText(fallbackLabel) ? (featureLabelOverrides[key] || actionValue || 'פיצ\'ר') : fallbackLabel),
            actionType,
            actionValue,
            target: element.getAttribute('target') || '',
            element
        };
    }

    function executeLauncherEntry(entry) {
        if (!entry) return;
        if (entry.actionType === 'navigate') {
            try {
                navigateTo(entry.actionValue);
                return;
            } catch (_error) {
                // fall back to click
            }
        }
        if (entry.element && typeof entry.element.click === 'function') {
            entry.element.click();
        }
    }

    launchers.forEach((launcher) => {
        if (launcher.dataset.featureLauncherBound === '1') return;
        launcher.dataset.featureLauncherBound = '1';
        launcher.classList.add('feature-launcher--compact');

        const headStrong = launcher.querySelector('.feature-launcher-head strong');
        const headP = launcher.querySelector('.feature-launcher-head p');
        if (headStrong) headStrong.textContent = 'בחירת פיצ׳ר מהירה';
        if (headP) headP.textContent = 'בחר/י כלי אחד מהתפריט היורד. הכפתורים הארוכים הוסתרו כדי לשמור על מסך נקי.';

        const buttons = Array.from(launcher.querySelectorAll('[data-feature-group-btn]'));
        const panels = Array.from(launcher.querySelectorAll('[data-feature-group-panel]'));
        if (!buttons.length || !panels.length) return;

        function activate(groupName) {
            const target = String(groupName || '').trim();
            buttons.forEach((button) => {
                const active = button.getAttribute('data-feature-group-btn') === target;
                button.classList.toggle('is-active', active);
                button.setAttribute('aria-selected', active ? 'true' : 'false');
            });
            panels.forEach((panel) => {
                const active = panel.getAttribute('data-feature-group-panel') === target;
                panel.classList.toggle('is-active', active);
                if (active) panel.removeAttribute('hidden');
                else panel.setAttribute('hidden', '');
            });
        }

        buttons.forEach((button) => {
            button.addEventListener('click', () => {
                activate(button.getAttribute('data-feature-group-btn'));
            });
        });

        const initialButton = buttons.find((button) => button.classList.contains('is-active')) || buttons[0];
        activate(initialButton.getAttribute('data-feature-group-btn'));

        const existingPicker = launcher.querySelector('[data-feature-launcher-picker]');
        const pickerWrap = existingPicker || document.createElement('div');
        if (!existingPicker) {
            pickerWrap.setAttribute('data-feature-launcher-picker', '1');
            pickerWrap.className = 'feature-launcher-picker';
            launcher.insertBefore(pickerWrap, launcher.querySelector('.feature-launcher-tabs') || launcher.firstChild);
        }

        const allEntryElements = Array.from(launcher.querySelectorAll('.feature-launcher-grid .btn'));
        const entries = allEntryElements
            .map((el) => parseLauncherEntry(el))
            .filter(Boolean);

        const groupLabelMap = {
            'without-breen': 'ללא טבלאות ברין',
            'with-breen': 'עם טבלאות ברין'
        };

        const groupedHtml = Object.keys(groupLabelMap).map((groupKey) => {
            const groupEntries = entries.filter((entry) => entry.group === groupKey);
            if (!groupEntries.length) return '';
            const options = groupEntries.map((entry) => (
                `<option value="${escapeHtml(entry.key)}">${escapeHtml(entry.label)}</option>`
            )).join('');
            return `<optgroup label="${escapeHtml(groupLabelMap[groupKey])}">${options}</optgroup>`;
        }).join('');

        const selectId = `feature-launcher-select-${Math.random().toString(36).slice(2, 7)}`;
        pickerWrap.innerHTML = `
            <div class="feature-launcher-picker-head">
                <label for="${selectId}">בחר/י פיצ׳ר</label>
                <small>תפריט יורד במקום שורת כפתורים עליונה</small>
            </div>
            <div class="feature-launcher-picker-controls">
                <select id="${selectId}" class="feature-launcher-select" data-feature-picker-select>
                    <option value="">בחר/י כלי...</option>
                    ${groupedHtml}
                </select>
                <button type="button" class="btn btn-primary" data-feature-picker-open>פתח</button>
            </div>
        `;

        const select = pickerWrap.querySelector('[data-feature-picker-select]');
        const openBtn = pickerWrap.querySelector('[data-feature-picker-open]');
        const entryByKey = entries.reduce((acc, entry) => {
            acc[entry.key] = entry;
            return acc;
        }, {});

        if (select && !select.dataset.boundFeaturePicker) {
            select.dataset.boundFeaturePicker = '1';
            select.addEventListener('change', () => {
                const selected = entryByKey[select.value];
                if (selected && selected.group) activate(selected.group);
            });
        }

        if (openBtn && !openBtn.dataset.boundFeaturePicker) {
            openBtn.dataset.boundFeaturePicker = '1';
            openBtn.addEventListener('click', () => {
                const selected = select ? entryByKey[select.value] : null;
                if (!selected) return;
                executeLauncherEntry(selected);
            });
        }
    });
}

let hasInitializedApp = false;

function setupGlobalTheoryLauncher() {
    if (document.getElementById('global-theory-launcher')) return;
    if (!document.body) return;

    if (!document.getElementById('global-theory-launcher-style')) {
        const style = document.createElement('style');
        style.id = 'global-theory-launcher-style';
        style.textContent = `
            .global-theory-launcher {
                position: fixed;
                left: 12px;
                bottom: 12px;
                z-index: 1400;
                border: 1px solid rgba(250, 204, 21, 0.38);
                border-radius: 999px;
                min-height: 44px;
                padding: 10px 14px;
                font: inherit;
                font-weight: 800;
                color: #fff;
                cursor: pointer;
                background:
                    radial-gradient(circle at 18% 18%, rgba(255,255,255,0.20), transparent 38%),
                    linear-gradient(135deg, rgba(76, 29, 149, 0.94), rgba(34, 211, 238, 0.22));
                box-shadow: 0 14px 34px rgba(12, 18, 44, 0.22), 0 0 0 1px rgba(255,255,255,0.08) inset;
                backdrop-filter: blur(8px);
                transition: transform 140ms ease, box-shadow 140ms ease, opacity 140ms ease;
            }
            .global-theory-launcher:hover {
                transform: translateY(-1px);
                box-shadow: 0 18px 38px rgba(12, 18, 44, 0.24), 0 0 0 3px rgba(250, 204, 21, 0.16);
            }
            .global-theory-launcher:focus-visible {
                outline: 2px solid #facc15;
                outline-offset: 2px;
            }
            @media (max-width: 720px) {
                .global-theory-launcher {
                    left: 8px;
                    bottom: 8px;
                    min-height: 40px;
                    padding: 8px 12px;
                    font-size: 0.86rem;
                }
            }
        `;
        document.head.appendChild(style);
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'global-theory-launcher';
    btn.className = 'global-theory-launcher';
    btn.textContent = 'תיאוריה / קטגוריות';
    btn.setAttribute('aria-label', 'מעבר לדף התאוריה והקטגוריות');
    btn.addEventListener('click', () => {
        try {
            navigateTo('categories');
        } catch (error) {
            console.warn('Failed to navigate to categories theory tab', error);
        }
        try {
            const container = document.getElementById('categories-container');
            if (container) container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (error) {
            // ignore smooth scroll issues
        }
    });

    document.body.appendChild(btn);
}

function setupGlobalCollapsedHelpDetails() {
    if (window.__globalCollapsedHelpDetailsBound) return;
    window.__globalCollapsedHelpDetailsBound = true;

    const summaryRegex = /(help|guide|theory|philosophy|instruction|הסבר|עזרה|תיאוריה|פילוסופ|מה עושים)/i;

    const closeHelpDetails = (root = document) => {
        const detailsList = root.querySelectorAll ? root.querySelectorAll('details') : [];
        detailsList.forEach((detailsEl) => {
            if (!detailsEl || !detailsEl.open) return;
            const cls = String(detailsEl.className || '');
            const summaryText = String(detailsEl.querySelector('summary')?.textContent || '');
            if (summaryRegex.test(cls) || summaryRegex.test(summaryText)) {
                detailsEl.open = false;
            }
        });
    };

    closeHelpDetails(document);

    if (window.MutationObserver && document.body) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node?.nodeType !== 1) return;
                    closeHelpDetails(node);
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
}

function safeRunUiEnhancement(fn, label = 'ui-enhancement') {
    if (typeof fn !== 'function') return;
    try {
        fn();
    } catch (error) {
        console.warn(`Skipped ${label} after runtime error`, error);
    }
}

function ensurePracticeTabHydration(tabId = '') {
    const resolved = normalizeRequestedTab(tabId);
    if (!resolved) return;

    if (resolved === 'practice-radar') {
        try {
            const root = document.getElementById('rapid-pattern-arena');
            const buttons = document.getElementById('rapid-pattern-buttons');
            const typeSelect = document.getElementById('rapid-case-type');
            const looksEmpty = !buttons || buttons.children.length === 0;
            const typeLooksUnhydrated = !!typeSelect && typeSelect.options.length <= 1;
            if (root && (looksEmpty || typeLooksUnhydrated || root.dataset.rapidBound !== 'true')) {
                setupRapidPatternArena();
            }
        } catch (error) {
            console.warn('Failed to rehydrate Meta Radar', error);
        }
    }

    if (resolved === 'practice-triples-radar') {
        try {
            if (typeof setupTriplesRadarModule === 'function') {
                setupTriplesRadarModule();
            }
        } catch (error) {
            console.warn('Failed to rehydrate Triples Radar', error);
        }
    }
}

function initializeMetaModelApp() {
    if (hasInitializedApp) return;
    hasInitializedApp = true;

    enforceTopMenuOnlyMode();
    setupMojibakeAutoRepair();

    Promise.resolve(setupAppVersionChip()).catch((error) => {
        console.error('Failed to resolve or render app version:', error);
        applyAppVersion('׳׳ ׳™׳“׳•׳¢');
    });

    setupFeatureLauncherTabs();
    setupGlobalFeatureMenuDropdown();
    setupFeatureMapOverlayControls();
    setupMobileViewportSizing();
    applyEmbeddedCompactMode();
    enforceTopMenuOnlyMode();
    applyHeaderDensityPreference();
    updateRuntimeDebugInfoCard();
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
    if (typeof setupTriplesRadarModule === 'function') {
        setupTriplesRadarModule();
    }
    setupWrinkleGame();
    setupTrainerMode();
    setupBlueprintBuilder();
    setupPrismModule();
    setupScenarioTrainerModule();
    setupComicEngine2();
    setupCommunityFeedbackWall();
    initializeProgressHub();
    safeRunUiEnhancement(setupGlobalTheoryLauncher, 'global-theory-launcher');
    safeRunUiEnhancement(setupGlobalCollapsedHelpDetails, 'global-collapsed-help-details');
    setupGlobalInteractionSounds();
    renderGlobalComicStrip(getActiveTabName());
    window.addEventListener('resize', updateRuntimeDebugInfoCard);
}

function updateRuntimeDebugInfoCard() {
    const statusRoot = document.getElementById('feature-runtime-status');
    if (!statusRoot) return;

    const viewEl = document.getElementById('runtime-view-mode');
    const viewportEl = document.getElementById('runtime-viewport-size');
    const tabEl = document.getElementById('runtime-saved-tab');
    const densityEl = document.getElementById('runtime-header-density');

    let isEmbedded = false;
    try {
        isEmbedded = window.self !== window.top;
    } catch (error) {
        isEmbedded = true;
    }

    const width = Math.max(0, Math.round(window.innerWidth || 0));
    const height = Math.max(0, Math.round(window.innerHeight || 0));
    const savedTab = normalizeRequestedTab(localStorage.getItem(PRACTICE_ACTIVE_TAB_STORAGE_KEY) || '') || 'home';
    const density = (localStorage.getItem('header_density_v1') || 'compact').toLowerCase();

    if (viewEl) viewEl.textContent = isEmbedded ? '׳׳•׳˜׳׳¢ (iframe / Google Sites)' : '׳™׳©׳™׳¨ (׳¢׳׳•׳“ ׳׳׳)';
    if (viewportEl) viewportEl.textContent = `${width}×${height}`;
    if (tabEl) tabEl.textContent = savedTab;
    if (densityEl) densityEl.textContent = density === 'cozy' ? 'cozy' : 'compact';
}

function resetLocalUiState() {
    const keysToClear = [
        PRACTICE_ACTIVE_TAB_STORAGE_KEY,
        'header_density_v1',
        'meta_audio_muted',
        OPENING_TRACK_FIRST_ENTRY_KEY
    ];
    let cleared = 0;
    keysToClear.forEach((key) => {
        try {
            if (localStorage.getItem(key) !== null) {
                localStorage.removeItem(key);
                cleared += 1;
            }
        } catch (error) {
            // ignore storage access issues
        }
    });
    try {
        alert(`׳׳•׳₪׳¡ ׳׳¦׳‘ UI ׳׳§׳•׳׳™ (${cleared} ׳׳₪׳×׳—׳•׳×). ׳”׳“׳£ ׳™׳˜׳¢׳ ׳׳—׳“׳©.`);
    } catch (error) {
        // ignore alert failures
    }
    window.location.reload();
}

// Scripts are injected dynamically from index.html, so DOMContentLoaded may have
// already fired by the time this file executes (especially on cached loads).
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMetaModelApp, { once: true });
} else {
    // Defer init until after the rest of this file finishes evaluating.
    if (typeof queueMicrotask === 'function') {
        queueMicrotask(initializeMetaModelApp);
    } else {
        setTimeout(initializeMetaModelApp, 0);
    }
}

// Load Meta Model data from JSON
async function loadMetaModelData() {
    try {
        const response = await fetch('data/meta-model-violations.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        metaModelData = deepNormalizeUiPayload(await response.json());
        
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

function activateTabByName(tabName = '', { playSound = false, scrollToTop = true } = {}) {
    const resolvedTab = normalizeRequestedTab(tabName);
    if (!resolvedTab) return false;

    const tabBtns = Array.from(document.querySelectorAll('.tab-btn'));
    const tabContents = Array.from(document.querySelectorAll('.tab-content'));
    const content = document.getElementById(resolvedTab);
    if (!content) return false;

    tabBtns.forEach((btn) => btn.classList.remove('active'));
    tabContents.forEach((tab) => tab.classList.remove('active'));

    const btn = tabBtns.find((node) => node.getAttribute('data-tab') === resolvedTab);
    if (btn) btn.classList.add('active');
    content.classList.add('active');
    ensurePracticeTabHydration(resolvedTab);

    if (resolvedTab !== 'practice-radar') {
        setRapidPatternFocusMode(false);
        hideRapidPatternExplanation({ resumeIfNeeded: false });
    }

    persistPracticeTabPreference(resolvedTab);

    const mobileTabSelect = document.getElementById('mobile-tab-select');
    if (mobileTabSelect && mobileTabSelect.value !== resolvedTab) {
        mobileTabSelect.value = resolvedTab;
    }

    const scenarioContext = resolvedTab === 'scenario-trainer' ? scenarioTrainer.activeScenario : null;
    closeComicPreviewModal();
    renderGlobalComicStrip(resolvedTab, scenarioContext);

    if (scrollToTop) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (playSound) playUISound('next');
    return true;
}

// Setup Tab Navigation
function setupTabNavigation() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const mobileTabSelect = document.getElementById('mobile-tab-select');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');
            activateTabByName(tabName, { playSound: true, scrollToTop: true });
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
            activateTabByName(targetTab, { playSound: true, scrollToTop: true });
        });
    }
}

// Populate Categories Section
function getBreenPrismPhilosophyEntry(subcategoryId = '') {
    const lib = window.prismResearchPhilosophyLibrary || {};
    const id = String(subcategoryId || '').trim().toLowerCase();
    const aliasMap = {
        lack_referential_index: 'lack_ref_index',
        presupposition: 'presuppositions',
        universal_quantifier: 'universal_quantifiers'
    };

    if (id === 'modal_operator') {
        return {
            ask3x: 'מה יקרה אם לא...? מה מונע? מה צריך כדי שזה יתאפשר?',
            school: 'אילוצים / אפשרויות (Modal Operators)',
            why: 'אופרטורים מודליים יוצרים תחושת חוק: "חייב", "צריך", "אי אפשר". בפריזמה אנחנו בודקים גם את המחיר/האיום (necessity) וגם את תנאי האפשרות (possibility).',
            creates: 'מיפוי של פחד/אילוץ מול תנאים שמאפשרים תנועה. במקום "אין ברירה" נוצרת סקאלה של אפשרויות.',
            therapistCalm: 'לא מבטלים את הפחד או הדרישה; בודקים מה הם מנסים להגן עליו ואיפה יש חופש פעולה.',
            patientGain: 'פחות קיפאון. יותר בחירה מודעת בין חובה, רצוי, אפשרי, וצעד קטן.',
            trap: 'להתווכח עם "חייב" לפני שמבינים את העלות שהמוח מנסה למנוע.',
            fix: 'קודם למפות מחיר/איום, ואז לשאול על תנאי אפשרות וצעד ניסויי.',
            tooltip: 'מאחורי "חייב/אי אפשר" יושבים לרוב פחד, ערך או הרגל.'
        };
    }

    return lib[aliasMap[id] || id] || null;
}

function getBreenPatternGoalText(category, subcategory) {
    const subId = String(subcategory?.id || '').toLowerCase();
    const goalMap = {
        mind_reading: 'להפריד בין סימנים/תחושות לבין המסקנה, ולבדוק ראיות. כולל Mind Reading עצמי (למשל: "אני רעב" - איך אני יודע?) וקפיצה למסקנות.',
        universal_quantifier: 'לבדוק היקף, חריגים ותנאים: להפוך "תמיד/אף פעם" למפה שניתנת לבדיקה.',
        modal_operator: 'לפרק "חייב/צריך/אי אפשר" למחיר, פחד, אילוץ ותנאי אפשרות.',
        cause_effect: 'לפרק קשר סיבתי אוטומטי לשלבים/מנגנון כדי למצוא נקודת התערבות.',
        complex_equivalence: 'לחשוף את חוק התרגום ("X אומר Y") ולבדוק אם יש תרגומים חלופיים.'
    };
    if (goalMap[subId]) return goalMap[subId];

    const family = String(subcategory?.category || category?.name || '').toUpperCase();
    if (family.includes('DELETION')) return 'להחזיר מידע חסר למפה: מי/מה/מתי/לפי מה - כדי שאפשר יהיה לעבוד עם המציאות ולא עם ערפל.';
    if (family.includes('DISTORTION')) return 'להפריד בין נתון, פירוש ומסקנה - כדי לבדוק מה באמת ידוע ומה רק הונח.';
    if (family.includes('GENERALIZATION')) return 'להחזיר גבולות ותנאים להכללה - כדי לפתוח יותר אפשרויות תגובה.';
    return 'להפוך ניסוח מעורפל למבנה ברור שניתן לבדוק, לשקף ולעבוד איתו.';
}

function renderBreenPatternPhilosophyLayer(category, subcategory) {
    const ph = getBreenPrismPhilosophyEntry(subcategory?.id);
    if (!ph) {
        return `
            <p>תיאוריה פילוסופית מפורטת תתווסף כאן בהמשך. כרגע השתמשו בשאלות ובמטרה של התבנית כדי לעבוד בצורה מדויקת.</p>
        `;
    }

    const mindReadingExtra = String(subcategory?.id || '') === 'mind_reading'
        ? `<p><strong>הרחבה חשובה:</strong> קריאת מחשבות כוללת גם <em>מיינד-רידינג עצמי</em> ("אני רעב / אני פגוע - איך אני יודע?") וגם <em>קפיצה למסקנות</em> מתוך סימן קטן.</p>`
        : '';

    return `
        <p><strong>המסגרת הפילוסופית:</strong> ${escapeHtml(ph.school || 'פריזמה לשונית-לוגית')}</p>
        <p><strong>למה זה חשוב:</strong> ${escapeHtml(ph.why || '')}</p>
        <p><strong>מה זה מייצר בתרגול:</strong> ${escapeHtml(ph.creates || '')}</p>
        <p><strong>שקט של המטפל:</strong> ${escapeHtml(ph.therapistCalm || '')}</p>
        <p><strong>רווח למטופל:</strong> ${escapeHtml(ph.patientGain || '')}</p>
        ${mindReadingExtra}
    `;
}

function buildCategorySubPatternCard(category, subcategory) {
    const questionText = String(subcategory?.question || '').trim();
    const exampleText = String(subcategory?.example || '').trim();
    const goalText = getBreenPatternGoalText(category, subcategory);
    const isMindReading = String(subcategory?.id || '') === 'mind_reading';
    const questionsExtra = isMindReading
        ? '<li><strong>הרחבה:</strong> זה כולל גם מיינד-רידינג עצמי ("אני רעב" / "אני לא מסוגל") וגם קפיצה למסקנות.</li>'
        : '';

    return `
        <details class="subcategory-item subcategory-layered" data-pattern-id="${escapeHtml(subcategory.id || '')}">
            <summary class="subcategory-summary">
                <span class="subcategory-title">${escapeHtml(subcategory.hebrew || subcategory.name || subcategory.id || 'תבנית')}</span>
                <span class="subcategory-desc">${escapeHtml(subcategory.description || '')}</span>
            </summary>

            <div class="subcategory-layers">
                <details class="subcategory-layer">
                    <summary>שאלות עבודה</summary>
                    <div class="subcategory-layer-body">
                        <ul>
                            ${questionText ? `<li><strong>שאלת בסיס:</strong> ${escapeHtml(questionText)}</li>` : ''}
                            ${exampleText ? `<li><strong>דוגמה למשפט:</strong> ${escapeHtml(exampleText)}</li>` : ''}
                            ${questionsExtra}
                        </ul>
                    </div>
                </details>

                <details class="subcategory-layer">
                    <summary>המטרה של התבנית</summary>
                    <div class="subcategory-layer-body">
                        <p>${escapeHtml(goalText)}</p>
                    </div>
                </details>

                <details class="subcategory-layer">
                    <summary>פילוסופיה של הפריזמה (קשור לתבנית)</summary>
                    <div class="subcategory-layer-body subcategory-layer-philosophy">
                        ${renderBreenPatternPhilosophyLayer(category, subcategory)}
                    </div>
                </details>
            </div>
        </details>
    `;
}

function populateCategories() {
    const container = document.getElementById('categories-container');
    if (!container) return;
    container.innerHTML = '';

    const theoryIntro = document.createElement('section');
    theoryIntro.className = 'card categories-theory-intro';
    theoryIntro.innerHTML = `
        <h2>קטגוריות ברין + שכבות תאוריה (פריזמה)</h2>
        <p>
            דף זה הוא דף התאוריה והכוונה: לכל תבנית יש שכבות לחיצה של <strong>שאלות</strong>, <strong>מטרה</strong>, ו-<strong>פילוסופיה</strong>.
            תאוריית הפריזמות הועברה לכאן כדי לשמור את דפי התרגול נקיים וממוקדי עבודה.
        </p>
        <p class="categories-theory-note">
            העיקרון: לא רק "מה לשאול", אלא גם למה השאלה הזו פותחת מרחב ומחזירה דיוק למפה של האדם.
        </p>
    `;
    container.appendChild(theoryIntro);

    metaModelData.categories.forEach(category => {
        const categoryCard = document.createElement('div');
        categoryCard.className = `category-card ${category.id}`;

        const subcategoriesHtml = (category.subcategories || [])
            .map(sub => buildCategorySubPatternCard(category, sub))
            .join('');

        categoryCard.innerHTML = `
            <div class="category-icon">${category.icon}</div>
            <h3>${category.name}</h3>
            <p>${category.description}</p>
            <div class="subcategories layered">
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
    if (key === 'triples_radar' || key === 'breen-radar' || key === 'michael-breen') return 'triples-radar';
    if (key === 'sqhcel' || key === 'wizard') return 'wizard';
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

const QUESTION_DRILL_PREFS_KEY = 'question_drill_prefs_v1';
const QUESTION_DRILL_CATEGORIES = Object.freeze(['DELETION', 'DISTORTION', 'GENERALIZATION']);
const QUESTION_DRILL_SUCCESS_PLANS = Object.freeze([
    Object.freeze({
        id: 'warmup5',
        label: 'Warmup 5',
        rounds: 5,
        targetStars: 6,
        xpPerSuccess: 4,
        note: 'Short warm-up: build rhythm and accuracy.'
    }),
    Object.freeze({
        id: 'focus8',
        label: 'Focus 8',
        rounds: 8,
        targetStars: 10,
        xpPerSuccess: 5,
        note: 'Balanced session for skill building.'
    }),
    Object.freeze({
        id: 'sprint12',
        label: 'Sprint 12',
        rounds: 12,
        targetStars: 15,
        xpPerSuccess: 6,
        note: 'Longer run with streak bonus potential.'
    })
]);

const questionDrillState = {
    current: null,
    deck: [],
    attempts: 0,
    hits: 0,
    mode: 'learning',
    planId: QUESTION_DRILL_SUCCESS_PLANS[1].id,
    sessionActive: false,
    sessionCompleted: false,
    sessionRecorded: false,
    roundsDone: 0,
    roundsCorrect: 0,
    sessionXP: 0,
    sessionStars: 0,
    streak: 0,
    bestStreak: 0,
    roundChecks: 0,
    roundCorrect: false,
    roundFinalized: false,
    currentRoundAward: null,
    elements: {}
};

function getQuestionDrillPlan(planId = '') {
    return QUESTION_DRILL_SUCCESS_PLANS.find(plan => plan.id === planId) || QUESTION_DRILL_SUCCESS_PLANS[0];
}

function loadQuestionDrillPrefs() {
    try {
        const raw = localStorage.getItem(QUESTION_DRILL_PREFS_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            questionDrillState.mode = String(parsed.mode || '').toLowerCase() === 'exam' ? 'exam' : 'learning';
            questionDrillState.planId = getQuestionDrillPlan(parsed.planId).id;
        }
    } catch (error) {
        console.warn('Question Drill prefs parse error', error);
    }
}

function saveQuestionDrillPrefs() {
    try {
        localStorage.setItem(QUESTION_DRILL_PREFS_KEY, JSON.stringify({
            mode: questionDrillState.mode,
            planId: questionDrillState.planId
        }));
    } catch (error) {
        console.warn('Question Drill prefs save error', error);
    }
}

function getQuestionDrillModeLabel(mode = questionDrillState.mode) {
    return mode === 'exam' ? 'מבחן' : 'למידה';
}

function setQuestionDrillFeedback(text, tone = 'info') {
    const feedbackEl = questionDrillState.elements.feedback;
    if (!feedbackEl) return;
    feedbackEl.textContent = text || '';
    feedbackEl.dataset.tone = tone;
}

function populateQuestionDrillPlanSelect() {
    const select = questionDrillState.elements.planSelect;
    if (!select) return;
    select.innerHTML = QUESTION_DRILL_SUCCESS_PLANS.map(plan => (
        `<option value="${plan.id}">${plan.label} · ${plan.rounds}Q · ⭐${plan.targetStars}</option>`
    )).join('');
    select.value = getQuestionDrillPlan(questionDrillState.planId).id;
}

function setQuestionDrillMode(mode = 'learning', { persist = true, refreshCurrent = false } = {}) {
    const resolved = String(mode || '').toLowerCase() === 'exam' ? 'exam' : 'learning';
    questionDrillState.mode = resolved;

    const learningBtn = questionDrillState.elements.modeLearningBtn;
    const examBtn = questionDrillState.elements.modeExamBtn;
    const modeNote = questionDrillState.elements.modeNote;
    const modeChip = questionDrillState.elements.modeChip;
    const hintBtn = questionDrillState.elements.hintBtn;

    if (learningBtn) {
        const active = resolved === 'learning';
        learningBtn.classList.toggle('is-active', active);
        learningBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
    if (examBtn) {
        const active = resolved === 'exam';
        examBtn.classList.toggle('is-active', active);
        examBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
    if (modeNote) {
        modeNote.textContent = resolved === 'exam'
            ? 'מבחן: ניסיון אחד לכל סבב, משוב קצר, בלי רמזים.'
            : 'למידה: אפשר לקבל רמזים ולשפר ניסוח לפני המעבר.';
    }
    if (modeChip) modeChip.textContent = `Mode: ${getQuestionDrillModeLabel(resolved)}`;
    if (hintBtn) {
        hintBtn.disabled = resolved === 'exam' || questionDrillState.sessionCompleted || questionDrillState.roundFinalized;
        hintBtn.classList.toggle('is-hidden', resolved === 'exam');
    }

    if (persist) saveQuestionDrillPrefs();
    if (refreshCurrent && questionDrillState.current && !questionDrillState.roundFinalized) {
        const currentFocus = questionDrillState.current.focus || [];
        if (questionDrillState.elements.category) {
            questionDrillState.elements.category.value = resolved === 'learning'
                ? (currentFocus[0] || 'DELETION')
                : shuffleArray(QUESTION_DRILL_CATEGORIES)[0];
        }
    }
    updateQuestionDrillSessionUI();
    updateQuestionDrillControlsState();
}

function setQuestionDrillPlan(planId = '', { persist = true } = {}) {
    const plan = getQuestionDrillPlan(planId);
    questionDrillState.planId = plan.id;
    if (questionDrillState.elements.planSelect) {
        questionDrillState.elements.planSelect.value = plan.id;
    }
    if (questionDrillState.elements.planChip) {
        questionDrillState.elements.planChip.textContent = `Plan: ${plan.label}`;
    }
    if (persist) saveQuestionDrillPrefs();
    updateQuestionDrillSessionUI();
}

function resetQuestionDrillSessionState({ preservePrefs = true } = {}) {
    questionDrillState.deck = [];
    questionDrillState.current = null;
    questionDrillState.attempts = 0;
    questionDrillState.hits = 0;
    questionDrillState.sessionActive = false;
    questionDrillState.sessionCompleted = false;
    questionDrillState.sessionRecorded = false;
    questionDrillState.roundsDone = 0;
    questionDrillState.roundsCorrect = 0;
    questionDrillState.sessionXP = 0;
    questionDrillState.sessionStars = 0;
    questionDrillState.streak = 0;
    questionDrillState.bestStreak = 0;
    questionDrillState.roundChecks = 0;
    questionDrillState.roundCorrect = false;
    questionDrillState.roundFinalized = false;
    questionDrillState.currentRoundAward = null;

    if (!preservePrefs) {
        questionDrillState.mode = 'learning';
        questionDrillState.planId = QUESTION_DRILL_SUCCESS_PLANS[1].id;
    }
}

function beginQuestionDrillRound(question) {
    const elements = questionDrillState.elements;
    const focus = Array.isArray(question?.focus) ? question.focus : [];

    questionDrillState.current = question || null;
    questionDrillState.roundChecks = 0;
    questionDrillState.roundCorrect = false;
    questionDrillState.roundFinalized = false;
    questionDrillState.currentRoundAward = null;

    if (elements.statement) elements.statement.textContent = question?.statement || '';
    if (elements.input) {
        elements.input.value = '';
        elements.input.disabled = false;
    }
    if (elements.category) {
        elements.category.disabled = false;
        elements.category.value = questionDrillState.mode === 'exam'
            ? shuffleArray(QUESTION_DRILL_CATEGORIES)[0]
            : (focus[0] || 'DELETION');
    }

    if (questionDrillState.mode === 'exam') {
        setQuestionDrillFeedback('מצב מבחן: נסו לזהות כיוון ולנסח שאלה מדויקת בניסיון אחד.', 'info');
    } else {
        setQuestionDrillFeedback('מצב למידה: כתבו שאלה, בדקו, ושפרו לפי המשוב או רמז.', 'info');
    }

    if (elements.summary) {
        elements.summary.classList.add('hidden');
        elements.summary.innerHTML = '';
    }
    updateQuestionDrillControlsState();
    updateQuestionDrillSessionUI();
}

function buildQuestionDrillDeck() {
    questionDrillState.deck = shuffleArray(QUESTION_DRILL_PACK.slice());
}

function getNextQuestionDrillItem() {
    if (!QUESTION_DRILL_PACK.length) return null;
    if (!questionDrillState.deck.length) buildQuestionDrillDeck();
    let next = questionDrillState.deck.pop() || null;
    if (
        next &&
        questionDrillState.current &&
        QUESTION_DRILL_PACK.length > 1 &&
        next.id === questionDrillState.current.id
    ) {
        questionDrillState.deck.unshift(next);
        next = questionDrillState.deck.pop() || next;
    }
    return next;
}

function updateQuestionDrillStats() {
    if (questionDrillState.elements.attempts) {
        questionDrillState.elements.attempts.textContent = String(questionDrillState.attempts);
    }
    if (questionDrillState.elements.hits) {
        questionDrillState.elements.hits.textContent = String(questionDrillState.hits);
    }
}

function updateQuestionDrillSessionUI() {
    const plan = getQuestionDrillPlan(questionDrillState.planId);
    const roundsTotal = Math.max(1, plan.rounds);
    const roundsDone = Math.min(questionDrillState.roundsDone, roundsTotal);
    const progressPct = Math.round((roundsDone / roundsTotal) * 100);
    const nextRound = Math.min(roundsTotal, roundsDone + (questionDrillState.sessionCompleted ? 0 : 1));
    const accuracy = questionDrillState.roundsDone
        ? Math.round((questionDrillState.roundsCorrect / questionDrillState.roundsDone) * 100)
        : 0;
    const targetReached = questionDrillState.sessionStars >= plan.targetStars;

    if (questionDrillState.elements.progressFill) {
        questionDrillState.elements.progressFill.style.width = `${progressPct}%`;
    }
    if (questionDrillState.elements.roundChip) {
        questionDrillState.elements.roundChip.textContent = `Round: ${roundsDone}/${roundsTotal}`;
    }
    if (questionDrillState.elements.starsChip) {
        questionDrillState.elements.starsChip.textContent = `Stars: ${questionDrillState.sessionStars}`;
        questionDrillState.elements.starsChip.classList.toggle('is-goal', targetReached && questionDrillState.sessionCompleted);
    }
    if (questionDrillState.elements.targetChip) {
        questionDrillState.elements.targetChip.textContent = `Target: ⭐${plan.targetStars}`;
    }
    if (questionDrillState.elements.streakChip) {
        questionDrillState.elements.streakChip.textContent = `Streak: ${questionDrillState.streak}`;
    }
    if (questionDrillState.elements.modeChip) {
        questionDrillState.elements.modeChip.textContent = `Mode: ${getQuestionDrillModeLabel()}`;
    }
    if (questionDrillState.elements.planChip) {
        questionDrillState.elements.planChip.textContent = `Plan: ${plan.label}`;
    }
    if (questionDrillState.elements.sessionNote) {
        if (questionDrillState.sessionCompleted) {
            questionDrillState.elements.sessionNote.textContent = targetReached
                ? `Session complete. Success target reached (${questionDrillState.sessionStars}/${plan.targetStars} stars).`
                : `Session complete. ${questionDrillState.sessionStars}/${plan.targetStars} stars, accuracy ${accuracy}%.`;
        } else if (!questionDrillState.sessionActive) {
            questionDrillState.elements.sessionNote.textContent = `${plan.note} Choose mode and press Start Session.`;
        } else if (questionDrillState.roundFinalized) {
            questionDrillState.elements.sessionNote.textContent = `Round ${nextRound > roundsTotal ? roundsTotal : nextRound} is ready. Accuracy ${accuracy}%.`;
        } else {
            questionDrillState.elements.sessionNote.textContent = questionDrillState.mode === 'exam'
                ? 'Exam mode: one answer per round, then move to the next statement.'
                : 'Learning mode: use feedback/hint to improve before moving on.';
        }
    }
}

function updateQuestionDrillControlsState() {
    const elements = questionDrillState.elements;
    const sessionLocked = questionDrillState.sessionCompleted;
    const hasQuestion = !!questionDrillState.current;
    const canCheck = hasQuestion && !sessionLocked && !questionDrillState.roundFinalized;

    if (elements.checkBtn) {
        elements.checkBtn.disabled = !canCheck;
        elements.checkBtn.textContent = questionDrillState.mode === 'exam' ? 'בדיקה (ניסיון אחד)' : 'בדוק שאלה';
    }
    if (elements.nextBtn) {
        elements.nextBtn.disabled = !hasQuestion || sessionLocked;
        elements.nextBtn.textContent = questionDrillState.roundFinalized ? 'משפט הבא' : 'דלג / משפט הבא';
    }
    if (elements.startBtn) {
        elements.startBtn.textContent = questionDrillState.sessionActive && !questionDrillState.sessionCompleted
            ? 'התחל סשן חדש'
            : 'התחל סשן';
    }
    if (elements.resetBtn) {
        elements.resetBtn.disabled = !questionDrillState.sessionActive && !questionDrillState.sessionCompleted && questionDrillState.attempts === 0;
    }
    if (elements.input) {
        elements.input.disabled = sessionLocked || questionDrillState.roundFinalized;
    }
    if (elements.category) {
        elements.category.disabled = sessionLocked || questionDrillState.roundFinalized;
    }
    if (elements.hintBtn) {
        const examMode = questionDrillState.mode === 'exam';
        elements.hintBtn.disabled = examMode || sessionLocked || questionDrillState.roundFinalized || !hasQuestion;
        elements.hintBtn.classList.toggle('is-hidden', examMode);
    }
}

function startQuestionDrillSession({ announce = true } = {}) {
    resetQuestionDrillSessionState({ preservePrefs: true });
    questionDrillState.sessionActive = true;
    questionDrillState.sessionCompleted = false;
    questionDrillState.sessionRecorded = false;
    updateQuestionDrillStats();
    updateQuestionDrillSessionUI();
    if (announce) {
        playUISound('start');
    }
    loadNextQuestionDrill({ initial: true, playSound: false });
}

function completeQuestionDrillSession() {
    const plan = getQuestionDrillPlan(questionDrillState.planId);
    const accuracy = questionDrillState.roundsDone
        ? Math.round((questionDrillState.roundsCorrect / questionDrillState.roundsDone) * 100)
        : 0;
    const hitTarget = questionDrillState.sessionStars >= plan.targetStars;
    let bonusStars = 0;
    let bonusXP = 0;

    if (hitTarget) {
        bonusStars += 1;
    }
    if (questionDrillState.mode === 'exam' && accuracy >= 90) {
        bonusStars += 1;
        bonusXP += 6;
    }

    if (bonusStars > 0) {
        addStars(bonusStars);
        questionDrillState.sessionStars += bonusStars;
    }
    if (bonusXP > 0) {
        addXP(bonusXP);
        questionDrillState.sessionXP += bonusXP;
    }

    questionDrillState.sessionCompleted = true;
    questionDrillState.sessionActive = false;

    if (!questionDrillState.sessionRecorded) {
        recordSession();
        questionDrillState.sessionRecorded = true;
    }

    const summaryEl = questionDrillState.elements.summary;
    if (summaryEl) {
        summaryEl.classList.remove('hidden');
        summaryEl.dataset.tone = hitTarget ? 'success' : 'info';
        summaryEl.innerHTML = `
            <div class="question-drill-summary-head">
                <strong>${hitTarget ? 'יעד הושג' : 'סשן הושלם'}</strong>
                <span>${getQuestionDrillModeLabel()} · ${plan.label}</span>
            </div>
            <div class="question-drill-summary-grid">
                <div><small>דיוק</small><strong>${accuracy}%</strong></div>
                <div><small>סבבים נכונים</small><strong>${questionDrillState.roundsCorrect}/${plan.rounds}</strong></div>
                <div><small>כוכבים</small><strong>${questionDrillState.sessionStars}</strong></div>
                <div><small>XP</small><strong>${questionDrillState.sessionXP}</strong></div>
                <div><small>Best Streak</small><strong>${questionDrillState.bestStreak}</strong></div>
                <div><small>Goal</small><strong>${plan.targetStars}⭐</strong></div>
            </div>
            ${bonusStars || bonusXP ? `<p class="question-drill-summary-bonus">Bonus: +${bonusStars}⭐ / +${bonusXP} XP</p>` : ''}
        `;
    }

    setQuestionDrillFeedback(
        hitTarget
            ? 'כל הכבוד. עמדת ביעד הכוכבים של התוכנית. אפשר להתחיל סשן חדש או להעלות רמה.'
            : 'הסשן הושלם. מומלץ לנסות שוב במצב למידה או לבחור תוכנית קצרה יותר כדי להגיע ליעד.',
        hitTarget ? 'success' : 'info'
    );
    playUISound(hitTarget ? 'stars_big' : 'finish');
    updateQuestionDrillSessionUI();
    updateQuestionDrillControlsState();
}

function finalizeQuestionDrillRound(reason = 'next') {
    if (!questionDrillState.current || questionDrillState.roundFinalized) return;

    const plan = getQuestionDrillPlan(questionDrillState.planId);
    const firstTry = questionDrillState.roundChecks <= 1;
    const wasCorrect = !!questionDrillState.roundCorrect;

    questionDrillState.roundFinalized = true;
    questionDrillState.roundsDone += 1;

    if (wasCorrect) {
        questionDrillState.roundsCorrect += 1;
        questionDrillState.streak += 1;
        questionDrillState.bestStreak = Math.max(questionDrillState.bestStreak, questionDrillState.streak);

        const baseXP = firstTry ? plan.xpPerSuccess : Math.max(2, plan.xpPerSuccess - 2);
        let starGain = firstTry ? 2 : 1;
        if (questionDrillState.mode === 'exam' && firstTry) starGain += 1;
        if (questionDrillState.streak > 0 && questionDrillState.streak % 3 === 0) {
            starGain += 1;
        }

        addXP(baseXP);
        addStars(starGain);
        questionDrillState.sessionXP += baseXP;
        questionDrillState.sessionStars += starGain;
        questionDrillState.currentRoundAward = { xp: baseXP, stars: starGain };
        playUISound(starGain >= 3 ? 'stars_big' : 'stars_soft');

        const awardLine = ` (+${baseXP} XP, +${starGain}⭐)`;
        const currentText = String(questionDrillState.elements.feedback?.textContent || '');
        if (currentText && !currentText.includes('+')) {
            setQuestionDrillFeedback(`${currentText}${awardLine}`, 'success');
        }
    } else {
        questionDrillState.streak = 0;
        questionDrillState.currentRoundAward = { xp: 0, stars: 0 };
        if (reason === 'skip') {
            setQuestionDrillFeedback('הסבב דולג. אין ניקוד על הסבב הזה, עוברים למשפט הבא.', 'warn');
            playUISound('skip');
        }
    }

    updateQuestionDrillSessionUI();
    updateQuestionDrillControlsState();

    const planRounds = getQuestionDrillPlan(questionDrillState.planId).rounds;
    if (questionDrillState.roundsDone >= planRounds) {
        completeQuestionDrillSession();
    }
}

function loadNextQuestionDrill(options = {}) {
    const { initial = false, playSound = true } = options || {};
    if (!QUESTION_DRILL_PACK.length) return;

    if (!questionDrillState.sessionActive && !questionDrillState.sessionCompleted) {
        questionDrillState.sessionActive = true;
    }

    if (!initial && questionDrillState.current && !questionDrillState.roundFinalized) {
        finalizeQuestionDrillRound('skip');
        if (questionDrillState.sessionCompleted) return;
    }

    if (questionDrillState.sessionCompleted) {
        updateQuestionDrillControlsState();
        return;
    }

    const next = getNextQuestionDrillItem();
    if (!next) return;
    beginQuestionDrillRound(next);
    if (!initial && playSound) playUISound('next');
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

function showQuestionDrillHint() {
    if (questionDrillState.mode === 'exam') {
        setQuestionDrillFeedback('במצב מבחן אין רמזים. עברו למצב למידה אם רוצים תמיכה.', 'warn');
        return;
    }
    if (!questionDrillState.current || questionDrillState.roundFinalized) return;
    const selected = questionDrillState.elements.category?.value || 'DELETION';
    const starters = (QUESTION_DRILL_KEYWORDS[selected] || []).slice(0, 3).join(', ');
    const expected = (questionDrillState.current.focus || []).join(' / ');
    const line = expected
        ? `רמז: התחילו עם מילים כמו ${starters}. כיוון מומלץ לסבב הזה: ${expected}.`
        : `רמז: התחילו עם מילים כמו ${starters}.`;
    setQuestionDrillFeedback(line, 'info');
    playUISound('hint');
}

function evaluateQuestionDrill() {
    const input = questionDrillState.elements.input;
    const feedbackEl = questionDrillState.elements.feedback;
    if (!input || !feedbackEl || !questionDrillState.current) return;
    if (questionDrillState.sessionCompleted) return;
    if (questionDrillState.roundFinalized) {
        setQuestionDrillFeedback('הסבב הזה כבר נסגר. עברו למשפט הבא.', 'info');
        return;
    }

    const text = input.value.trim();
    if (!text) {
        setQuestionDrillFeedback('כתבו שאלה לפני שבודקים.', 'warn');
        return;
    }

    const selected = questionDrillState.elements.category.value || 'DELETION';
    const matched = getMatchedCategories(text);
    const expected = questionDrillState.current.focus || [];
    const focusMatchesExpected = expected.length === 0 || expected.includes(selected);
    const keywordMatches = matched.includes(selected);
    const success = focusMatchesExpected && keywordMatches;

    questionDrillState.roundChecks += 1;
    questionDrillState.attempts += 1;
    if (success) questionDrillState.hits += 1;
    updateQuestionDrillStats();

    if (success) {
        questionDrillState.roundCorrect = true;
        if (questionDrillState.mode === 'exam') {
            setQuestionDrillFeedback(`נכון. זוהה כיוון ${selected}. לחצו "משפט הבא" להמשך.`, 'success');
        } else {
            const matchedLabel = matched.length ? matched.join(' / ') : selected;
            setQuestionDrillFeedback(`מצוין. השאלה פוגעת בכיוון ${selected} (${matchedLabel}). לחצו "משפט הבא" להמשך.`, 'success');
        }
        playUISound('correct');
        finalizeQuestionDrillRound('correct');
        return;
    }

    playUISound('wrong');
    if (questionDrillState.mode === 'exam') {
        questionDrillState.roundCorrect = false;
        setQuestionDrillFeedback('לא מדויק. בסבב מבחן יש ניסיון אחד בלבד. לחצו "משפט הבא".', 'danger');
        finalizeQuestionDrillRound('exam_fail');
        return;
    }

    const missing = !keywordMatches
        ? 'הוסיפו מילות מפתח כמו ' + (QUESTION_DRILL_KEYWORDS[selected] || []).slice(0, 3).join(', ')
        : '';
    const expectedMessage = expected.length ? ` הכי מתאים כאן: ${expected.join(' / ')}` : '';
    const matchedMessage = matched.length ? ` זיהוי לפי הטקסט: ${matched.join(' / ')}.` : '';
    setQuestionDrillFeedback(`נסו שוב. ${missing}${expectedMessage}.${matchedMessage}`.trim(), keywordMatches ? 'warn' : 'danger');
    updateQuestionDrillControlsState();
}

function setupQuestionDrill() {
    const drillRoot = document.getElementById('question-drill');
    if (!drillRoot) return;

    questionDrillState.elements = {
        root: drillRoot,
        statement: document.getElementById('question-drill-statement'),
        input: document.getElementById('question-drill-input'),
        category: document.getElementById('question-drill-category'),
        feedback: document.getElementById('question-drill-feedback'),
        attempts: document.getElementById('question-drill-attempts'),
        hits: document.getElementById('question-drill-hits'),
        checkBtn: document.getElementById('question-drill-check'),
        nextBtn: document.getElementById('question-drill-next'),
        hintBtn: document.getElementById('question-drill-hint'),
        modeLearningBtn: document.getElementById('question-drill-mode-learning'),
        modeExamBtn: document.getElementById('question-drill-mode-exam'),
        modeNote: document.getElementById('question-drill-mode-note'),
        planSelect: document.getElementById('question-drill-plan'),
        startBtn: document.getElementById('question-drill-start-session'),
        resetBtn: document.getElementById('question-drill-reset-session'),
        summary: document.getElementById('question-drill-summary'),
        progressFill: document.getElementById('question-drill-progress-fill'),
        modeChip: document.getElementById('question-drill-chip-mode'),
        planChip: document.getElementById('question-drill-chip-plan'),
        roundChip: document.getElementById('question-drill-chip-round'),
        starsChip: document.getElementById('question-drill-chip-stars'),
        targetChip: document.getElementById('question-drill-chip-target'),
        streakChip: document.getElementById('question-drill-chip-streak'),
        sessionNote: document.getElementById('question-drill-session-note')
    };

    loadQuestionDrillPrefs();
    populateQuestionDrillPlanSelect();
    setQuestionDrillPlan(questionDrillState.planId, { persist: false });
    setQuestionDrillMode(questionDrillState.mode, { persist: false });

    questionDrillState.elements.checkBtn?.addEventListener('click', evaluateQuestionDrill);
    questionDrillState.elements.nextBtn?.addEventListener('click', () => loadNextQuestionDrill());
    questionDrillState.elements.hintBtn?.addEventListener('click', showQuestionDrillHint);
    questionDrillState.elements.modeLearningBtn?.addEventListener('click', () => {
        setQuestionDrillMode('learning', { refreshCurrent: true });
        playUISound('select_soft');
    });
    questionDrillState.elements.modeExamBtn?.addEventListener('click', () => {
        setQuestionDrillMode('exam', { refreshCurrent: true });
        playUISound('select_soft');
    });
    questionDrillState.elements.planSelect?.addEventListener('change', (event) => {
        setQuestionDrillPlan(event.target.value);
        playUISound('select_soft');
    });
    questionDrillState.elements.startBtn?.addEventListener('click', () => startQuestionDrillSession({ announce: true }));
    questionDrillState.elements.resetBtn?.addEventListener('click', () => {
        resetQuestionDrillSessionState({ preservePrefs: true });
        updateQuestionDrillStats();
        updateQuestionDrillSessionUI();
        updateQuestionDrillControlsState();
        setQuestionDrillFeedback('הסטטיסטיקה אופסה. לחצו "התחל סשן".', 'info');
        if (questionDrillState.elements.statement) questionDrillState.elements.statement.textContent = '';
        if (questionDrillState.elements.input) questionDrillState.elements.input.value = '';
        if (questionDrillState.elements.summary) {
            questionDrillState.elements.summary.classList.add('hidden');
            questionDrillState.elements.summary.innerHTML = '';
        }
        playUISound('skip');
    });

    setupAudioMuteButtons();
    updateQuestionDrillStats();
    updateQuestionDrillSessionUI();
    setQuestionDrillFeedback('בחרו מצב ותוכנית, ואז התחילו סשן.', 'info');
    startQuestionDrillSession({ announce: false });
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
        hard: ['׳©׳׳‘ 1: ׳–׳”׳” ׳“׳₪׳•׳¡ ׳©׳₪׳”.', '׳©׳׳‘ 2: ׳׳₪׳” רמות לוגיות (סביבה/התנהגות/יכולות/ערכים/זהות/שייכות) ׳‘׳§׳¦׳¨׳”.', '׳©׳׳‘ 3: ׳‘׳—׳¨ Small Win ׳׳”׳×׳§׳“׳׳•׳×.']
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
        const data = deepNormalizeUiPayload(await response.json());
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

    if (currentIndexEl) currentIndexEl.textContent = String(currentIndex);
    if (totalCountEl) totalCountEl.textContent = String(total);
    if (sessionScoreEl) sessionScoreEl.textContent = String(scenarioTrainer.session.score);
    if (sessionStreakEl) sessionStreakEl.textContent = String(scenarioTrainer.session.streak);
    if (progressFill) progressFill.style.width = `${progress}%`;
    if (roleEl) roleEl.textContent = `׳×׳₪׳§׳™׳“: ${roleLabel}`;
    if (titleEl) titleEl.textContent = scenario.title || '׳¡׳¦׳ ׳”';
    if (unspecifiedEl) unspecifiedEl.textContent = `׳ ׳•, ׳₪׳©׳•׳˜ ${scenario.unspecifiedVerb || '׳×׳¢׳©׳” ׳׳× ׳–׳”'}`;

    renderScenarioPredicateAnalysis(scenario);

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
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `scenario-option-btn ${String(option.type).includes('green') ? 'green' : 'red'}`;
            btn.textContent = `${option.emoji || ''} ${option.text || ''}`.trim();
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
    action: '׳₪׳•׳¢׳ ׳₪׳¢׳•׳׳”',
    process: '׳×׳”׳׳™׳ / ׳§׳•׳¨׳” ׳׳™',
    state: '׳׳¦׳‘ / ׳–׳”׳•׳× ׳׳§׳•׳¦׳¨׳×'
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
        title: 'Work: Presentation',
        subtitle: 'Clarify message, structure, and delivery.',
        path: 'assets/svg/comics/scenes/׳¢׳‘׳•׳“׳”_׳׳¦׳’׳×.svg'
    },
    {
        key: 'bureaucracy_form',
        title: 'Bureaucracy: Form',
        subtitle: 'Translate vague instructions into clear steps.',
        path: 'assets/svg/comics/scenes/׳‘׳™׳•׳¨׳•׳§׳¨׳˜׳™׳”_׳˜׳•׳₪׳¡.svg'
    },
    {
        key: 'bureaucracy_money',
        title: 'Bureaucracy: Arnona',
        subtitle: 'Resolve billing flow and required details.',
        path: 'assets/svg/comics/scenes/׳›׳¡׳£_׳׳¨׳ ׳•׳ ׳”.svg'
    },
    {
        key: 'parenting_homework',
        title: 'Parenting: Homework',
        subtitle: 'Break down what to do first and what is missing.',
        path: 'assets/svg/comics/scenes/׳”׳•׳¨׳•׳×_׳©׳™׳¢׳•׳¨׳™׳.svg'
    },
    {
        key: 'relationships_apology',
        title: 'Relationships: Apology',
        subtitle: 'From blame to specific repair steps.',
        path: 'assets/svg/comics/scenes/׳–׳•׳’׳™׳•׳×_׳¡׳׳™׳—׳”.svg'
    },
    {
        key: 'home_tech_cleanup',
        title: 'Home Tech: Cleanup',
        subtitle: 'Technical task with explicit execution steps.',
        path: 'assets/svg/comics/scenes/׳˜׳›׳ ׳™_׳ ׳™׳§׳•׳™_׳§׳‘׳¦׳™׳.svg'
    },
    {
        key: 'cooking_lasagna',
        title: 'Cooking: Lasagna',
        subtitle: 'Process thinking for everyday routines.',
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
    'practice-wizard': ['parenting_homework', 'home_tech_cleanup', 'bureaucracy_form'],
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
    const image = document.getElementById('scenario-comic-image');
    const title = document.getElementById('scenario-comic-title');
    const subtitle = document.getElementById('scenario-comic-subtitle');
    if (!stage || !image || !title || !subtitle) return;

    const scene = resolveComicSceneForScenario(scenario);
    if (!scene) {
        stage.hidden = true;
        return;
    }

    image.src = scene.path;
    image.alt = scene.title;
    title.textContent = scene.title;

    const details = [];
    if (scenario?.domainLabel || scenario?.domain) details.push(`Domain: ${scenario.domainLabel || scenario.domain}`);
    if (scenario?.difficulty) details.push(`Difficulty: ${scenario.difficulty}`);
    subtitle.textContent = details.join(' | ') || scene.subtitle || '';

    stage.hidden = false;
}

// ==================== COMIC ENGINE 2.0 ====================

const COMIC_ENGINE_STORAGE_KEY = 'comic_engine_progress_v1';
const COMIC_ENGINE_PREFS_KEY = 'comic_engine_prefs_v1';
const COMMUNITY_WALL_STORAGE_KEY = 'community_feedback_wall_v1';

function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return normalizeUiText(value)
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
        payload = deepNormalizeUiPayload(await response.json());
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

function blueprintSplitList(value) {
    return String(value || '')
        .split(/[|\n,]+/)
        .map(item => item.trim())
        .filter(Boolean);
}

function blueprintJoinListNatural(items) {
    const clean = (items || []).map(item => String(item || '').trim()).filter(Boolean);
    if (!clean.length) return '';
    if (clean.length === 1) return clean[0];
    if (clean.length === 2) return `${clean[0]} ו-${clean[1]}`;
    return `${clean.slice(0, -1).join(', ')} ו-${clean[clean.length - 1]}`;
}

function buildBlueprintTherapistSummaryText() {
    const blockers = blueprintSplitList(blueprintData.resourceBlockers || blueprintData.friction);
    const enablers = blueprintSplitList(blueprintData.resourceEnablers || blueprintData.prerequisites);
    const valuesIfYes = blueprintSplitList(blueprintData.valuesIfYes);
    const valuesIfNo = blueprintSplitList(blueprintData.valuesIfNo);
    const ability = Number(blueprintData.ability || 0);
    const importance = String(blueprintData.resourceImportance || '').trim();

    const parts = [];
    parts.push(`אם אני מסכם/ת אותך: יש כאן רצון ברור להגיע ל"${blueprintData.success || 'תוצאה רצויה'}" דרך הפעולה "${blueprintData.action || ''}".`);
    parts.push(`כרגע את/ה מעריך/ה את היכולת ב-${Number.isFinite(ability) ? ability : 0}/10, וזה לא אומר שאין יכולת — אלא שיש פער שצריך לגשר עליו בצורה מדויקת.`);

    if (blockers.length) {
        parts.push(`הקשיים המרכזיים כרגע הם ${blueprintJoinListNatural(blockers)}.`);
    }
    if (enablers.length) {
        parts.push(`המשאבים שכבר זמינים לך הם ${blueprintJoinListNatural(enablers)} — וזה בסיס חשוב שאפשר לעבוד ממנו.`);
    }
    if (importance) {
        parts.push(`זה חשוב לך עכשיו כי ${importance}.`);
    }
    if (valuesIfYes.length || valuesIfNo.length) {
        const yesText = valuesIfYes.length ? `אם תתקדם/י, יתממשו ערכים כמו ${blueprintJoinListNatural(valuesIfYes)}` : '';
        const noText = valuesIfNo.length ? `אם לא תתקדם/י, עלולים להיפגע ערכים כמו ${blueprintJoinListNatural(valuesIfNo)}` : '';
        parts.push([yesText, noText].filter(Boolean).join('. ') + '.');
    }
    if (blueprintData.firstStep) {
        parts.push(`לכן השלב הבא שנבחר הוא להתחיל ב-"${blueprintData.firstStep}" בתוך מסגרת זמן של ${blueprintData.time || '30 דקות'}, עם Plan B ברור אם יהיה קושי.`);
    }
    return parts.join(' ');
}

function buildBlueprintGuidedImageryText() {
    const firstStep = String(blueprintData.firstStep || '').trim();
    const success = String(blueprintData.success || '').trim();
    const enablers = blueprintSplitList(blueprintData.resourceEnablers || blueprintData.prerequisites);
    const valuesIfYes = blueprintSplitList(blueprintData.valuesIfYes);
    const timeText = String(blueprintData.time || '30 דקות').trim();

    const anchorResource = enablers[0] || 'המשאב שכבר עומד לרשותך';
    const anchorValue = valuesIfYes[0] || 'תחושת מסוגלות';

    return [
        'קח/י נשימה איטית אחת, ושימי/ם לב לגוף בכיסא.',
        `דמיין/י את עצמך מתחיל/ה בצעד הראשון: "${firstStep || 'הצעד הראשון שבחרת'}".`,
        `שימי/ם לב איך ${anchorResource} עוזר לך להישאר בתנועה שקטה ומדויקת.`,
        `דמיין/י ${timeText} של עבודה ממוקדת, צעד אחרי צעד, בלי לרוץ קדימה.`,
        `ואז ראה/י את התוצאה מתחילה להתבהר: "${success || 'התוצאה הרצויה שלך'}".`,
        `שימי/ם לב איזה ערך מתממש בפנים כשזה קורה — למשל ${anchorValue}.`,
        'קח/י נשימה נוספת, וחזור/י עם משפט קצר: "אני מתחיל/ה בצעד אחד ברור, לא בכל הדרך בבת אחת".'
    ].join(' ');
}

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
    blueprintData.resourceBlockers = document.getElementById('q-resource-blockers')?.value.trim() || '';
    blueprintData.resourceEnablers = document.getElementById('q-resource-enablers')?.value.trim() || '';
    blueprintData.resourceImportance = document.getElementById('q-resource-importance')?.value.trim() || '';
    blueprintData.valuesIfYes = document.getElementById('q-values-if-yes')?.value.trim() || '';
    blueprintData.valuesIfNo = document.getElementById('q-values-if-no')?.value.trim() || '';

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
        self: 'אני בעצמי',
        other: 'מישהו אחר',
        system: 'מערכת / חוק / דדליין'
    };
    const middleStepsList = blueprintSplitList(blueprintData.middleSteps);
    const prereqList = blueprintSplitList(blueprintData.prerequisites);
    const blockerList = blueprintSplitList(blueprintData.resourceBlockers || blueprintData.friction);
    const enablerList = blueprintSplitList(blueprintData.resourceEnablers);
    const valuesYesList = blueprintSplitList(blueprintData.valuesIfYes);
    const valuesNoList = blueprintSplitList(blueprintData.valuesIfNo);
    const therapistSummary = buildBlueprintTherapistSummaryText();
    const guidedImagery = buildBlueprintGuidedImageryText();
    blueprintData.therapistSummary = therapistSummary;
    blueprintData.guidedImagery = guidedImagery;

    const blueprint = document.getElementById('final-blueprint');
    blueprint.innerHTML = `
        <div class="blueprint-section">
            <h4>הפעולה שעולה עכשיו</h4>
            <p>"${escapeHtml(blueprintData.action || '')}"</p>
        </div>

        <div class="blueprint-section">
            <h4>התוצאה הרצויה (איך תדע/י שהצלחת)</h4>
            <p>${escapeHtml(blueprintData.success || '')}</p>
        </div>

        <div class="blueprint-section">
            <h4>תוכנית ביצוע ברורה</h4>
            <ul>
                <li><strong>צעד ראשון:</strong> ${escapeHtml(blueprintData.firstStep || '')}</li>
                <li><strong>שלבי ביניים:</strong> ${escapeHtml(middleStepsList.join(' | ') || '(לא הוגדרו)')}</li>
                <li><strong>צעד אחרון / סימן סיום:</strong> ${escapeHtml(blueprintData.lastStep || '')}</li>
            </ul>
        </div>

        <div class="blueprint-section">
            <h4>תנאים מקדימים</h4>
            <p>${escapeHtml(prereqList.join(' | ') || '(אין)')}</p>
        </div>

        <div class="blueprint-section">
            <h4>קשיים צפויים + Plan B</h4>
            <p><strong>איפה זה נוטה להיתקע:</strong> ${escapeHtml(blueprintData.friction || '(לא הוגדר)')}</p>
            <p><strong>חלופה / עזרה אם נתקעים:</strong> ${escapeHtml(blueprintData.alternatives || '(לא הוגדר)')}</p>
        </div>

        <div class="blueprint-section">
            <h4>מסגרת זמן</h4>
            <p>${escapeHtml(blueprintData.time || '30 דקות')}</p>
        </div>

        <div class="blueprint-section">
            <h4>פער ציפיות מול יכולת נוכחית</h4>
            <ul>
                <li><strong>מי מצפה:</strong> ${escapeHtml(whoExpectsMap[blueprintData.whoExpects] || blueprintData.whoExpects || '(לא הוגדר)')}</li>
                <li><strong>מה הציפייה:</strong> ${escapeHtml(blueprintData.expectation || '(לא הוגדר)')}</li>
                <li><strong>הנחה סמויה:</strong> ${escapeHtml(blueprintData.assumption || '(לא הוגדר)')}</li>
                <li><strong>יכולת כרגע:</strong> ${escapeHtml(String(blueprintData.ability || '0'))}/10</li>
                <li><strong>מה חסר כדי לעלות נקודה:</strong> ${escapeHtml(blueprintData.gap || '(לא הוגדר)')}</li>
            </ul>
        </div>

        <div class="blueprint-section">
            <h4>מיפוי מטפל/ת: קשיים, משאבים ומשמעות</h4>
            <ul>
                <li><strong>מה מונע כרגע:</strong> ${escapeHtml(blockerList.join(' | ') || '(לא הוגדר)')}</li>
                <li><strong>מה כבר מאפשר:</strong> ${escapeHtml(enablerList.join(' | ') || '(לא הוגדר)')}</li>
                <li><strong>למה זה חשוב עכשיו:</strong> ${escapeHtml(blueprintData.resourceImportance || '(לא הוגדר)')}</li>
            </ul>
        </div>

        <div class="blueprint-section">
            <h4>Meta Outcome – ערכים בתמונה הרחבה</h4>
            <ul>
                <li><strong>אם כן אעשה:</strong> ${escapeHtml(valuesYesList.join(' | ') || '(לא הוגדר)')}</li>
                <li><strong>אם לא אעשה:</strong> ${escapeHtml(valuesNoList.join(' | ') || '(לא הוגדר)')}</li>
            </ul>
        </div>

        <div class="blueprint-section blueprint-highlight-panel">
            <h4>ניסוח מחדש (לא מאשים)</h4>
            <p><em>${escapeHtml(document.getElementById('q-reframe')?.textContent || '')}</em></p>
        </div>
    `;

    // Generate Next Physical Action
    generateNextAction();

    const therapistSummaryEl = document.getElementById('therapist-summary-content');
    if (therapistSummaryEl) therapistSummaryEl.textContent = therapistSummary;
    const guidedImageryEl = document.getElementById('guided-imagery-content');
    if (guidedImageryEl) guidedImageryEl.textContent = guidedImagery;
}

function generateNextAction() {
    const nextActionBox = document.getElementById('next-physical-action');
    const ifStuckBox = document.getElementById('if-stuck-content');

    const timebox = blueprintData.time ? String(blueprintData.time).split(' ')[0] : '45';
    const nextAction = `
        <strong>${escapeHtml(blueprintData.firstStep || '')}</strong>
        <br/><small>(מומלץ לתת לזה ${escapeHtml(timebox)} דקות של קשב רציף)</small>
    `;

    const ifStuck = `
        <strong>אם נתקעים בשלב הזה:</strong><br/>
        ${escapeHtml(blueprintData.friction || 'עצור/י, שים/י לב מה חסר כרגע, וחדד/י את הצעד.')}<br/>
        <strong>Plan B:</strong><br/>
        ${escapeHtml(blueprintData.alternatives || 'בקש/י עזרה, קצר/י את המשימה, או בחר/י גרסה קטנה יותר')}
    `;

    nextActionBox.innerHTML = nextAction;
    ifStuckBox.innerHTML = ifStuck;
}

function startTenMinuteTimer() {
    alert(`מתחילים עכשיו.\n\nהצעד הראשון שלך: ${blueprintData.firstStep || 'צעד ראשון'}\n\nיש לך 10 דקות. קדימה.`);
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
        hebrew: 'סביבה',
        prompt: 'איפה, מתי, עם מי ובאיזה הקשר זה קורה?'
    },
    B: {
        name: 'Behavior (B)',
        hebrew: 'התנהגות',
        prompt: 'מה האדם עושה בפועל? מה הפעולה הנצפית?'
    },
    C: {
        name: 'Capabilities (C)',
        hebrew: 'יכולות',
        prompt: 'איזו מיומנות או אסטרטגיה נדרשת כאן?'
    },
    V: {
        name: 'Values/Beliefs (V)',
        hebrew: 'ערכים/אמונות',
        prompt: 'מה חשוב כאן? איזו אמונה מנהלת את ההתנהגות?'
    },
    I: {
        name: 'Identity (I)',
        hebrew: 'זהות',
        prompt: 'מה זה אומר על הזהות: מי אני? איזה אדם אני?'
    },
    S: {
        name: 'Belonging (S)',
        hebrew: 'שייכות',
        prompt: 'לאיזו קבוצה/קהילה/שייכות זה מתחבר?'
    }
};

const LOGICAL_LEVELS_SEQUENCE_FRIENDLY = 'סביבה → התנהגות → יכולות → ערכים/אמונות → זהות → שייכות';
const LOGICAL_LEVELS_SEQUENCE_FRIENDLY_SHORT = 'סביבה, התנהגות, יכולות, ערכים/אמונות, זהות, שייכות';

const LOGICAL_LEVEL_KEYWORDS = {
    E: ['סביבה', 'מקום', 'זמן', 'הקשר', 'בחדר', 'בעבודה', 'בבית', 'מתי', 'איפה'],
    B: ['עושה', 'עשיתי', 'ביצוע', 'פעולה', 'התנהגות', 'מגיב', 'אומר', 'שואל'],
    C: ['יכולת', 'מיומנות', 'אסטרטגיה', 'כלי', 'ללמוד', 'להתאמן', 'לתרגל', 'מסוגל'],
    V: ['חשוב', 'ערך', 'אמונה', 'מאמין', 'צריך', 'נכון', 'לא נכון', 'עיקרון'],
    I: ['אני', 'עצמי', 'זהות', 'מי אני', 'טיפש', 'מצליחן', 'כישלון', 'בן אדם'],
    S: ['אנחנו', 'קבוצה', 'קהילה', 'צוות', 'משפחה', 'שייכות', 'חברה', 'ארגון']
};

const PRISM_STACK_LEVEL_ORDER = Object.freeze(['E', 'B', 'C', 'V', 'I', 'S']);
const PRISM_VERTICAL_STACK_DRAFT_KEY = 'prism_vertical_stack_draft_v1';
let prismVerticalStackState = null;

const PRISM_STACK_DEFAULT_ANCHORS = Object.freeze({
    comparative_deletion: 'טוב יותר',
    cause_effect: 'הוא אמר: נדבר',
    complex_equivalence: 'זה אומר שנכשלתי'
});

const PRISM_STACK_PROMPT_TEMPLATES = Object.freeze({
    comparative_deletion: Object.freeze({
        E: 'באיזה הקשר/מתי/איפה זה "{A}"?',
        B: 'מה בפועל קורה כשזה "{A}"?',
        C: 'איזו יכולת/אסטרטגיה מאפשרת "{A}"?',
        V: 'לפי איזה קריטריון זה "{A}"?',
        I: 'מה זה אומר עליך אם זה "{A}" או פחות?',
        S: 'מול מי/איזו קבוצה ההשוואה הזו חשובה?'
    }),
    cause_effect: Object.freeze({
        E: 'באיזה מצב "{A}" גורם להשפעה הזו?',
        B: 'איזו תגובה/פעולה מתרחשת כש-"{A}" מופיע?',
        C: 'איזו מיומנות חסרה/נדרשת כך ש-"{A}" יוביל לתוצאה?',
        V: 'איזה כלל/אמונה גורמים לכך ש-"{A}" מוביל לתוצאה?',
        I: 'מה זה אומר עליך ש-"{A}" מוביל לתוצאה?',
        S: 'מה זה אומר על המקום שלך בקבוצה כש-"{A}" מוביל לתוצאה?'
    }),
    complex_equivalence: Object.freeze({
        E: 'באיזה הקשר "{A}" "אומר" משהו?',
        B: 'מה אתה עושה/מפסיק לעשות כש-"{A}" "אומר" זאת?',
        C: 'איזו יכולת תעזור לא לפרש את "{A}" ככה?',
        V: 'איזה כלל מחבר בין "{A}" למשמעות?',
        I: 'איזו זהות נוצרת מהמשמעות של "{A}"?',
        S: 'מה זה אומר על השייכות/סטטוס שלך כש-"{A}" מקבל משמעות?'
    }),
    default: Object.freeze({
        E: 'באיזה מצב/מתי/איפה "{A}" מופיע?',
        B: 'מה בפועל אתה עושה/מפסיק לעשות סביב "{A}"?',
        C: 'איזו יכולת/אסטרטגיה קשורה ל-"{A}"?',
        V: 'איזה כלל/אמונה/קריטריון קשורים ל-"{A}"?',
        I: 'מה זה אומר עליך/על הזהות שלך סביב "{A}"?',
        S: 'מה זה אומר על המקום שלך בקבוצה/מערכת סביב "{A}"?'
    })
});

function getPrismCoreQuestion(prism) {
    return String(prism?.anchor_question_templates?.[0] || '').trim();
}

function deriveDefaultPrismAnchor(prism) {
    if (!prism) return 'עוגן';
    if (PRISM_STACK_DEFAULT_ANCHORS[prism.id]) return PRISM_STACK_DEFAULT_ANCHORS[prism.id];

    const anchorQuestion = getPrismCoreQuestion(prism);
    const quoted = anchorQuestion.match(/["״](.+?)["״]/);
    if (quoted && quoted[1]) return quoted[1].trim();

    return (prism.name_he || prism.name_en || 'עוגן').trim();
}

function normalizePrismPromptTemplateText(text, anchor) {
    const safeAnchor = String(anchor || '').trim() || 'זה';
    return String(text || '').replace(/\{A\}/g, safeAnchor);
}

function getPrismStackTemplateById(prismId) {
    return PRISM_STACK_PROMPT_TEMPLATES[prismId] || PRISM_STACK_PROMPT_TEMPLATES.default;
}

function buildVerticalStackPrompts(prism, anchorText) {
    const template = getPrismStackTemplateById(prism?.id);
    return PRISM_STACK_LEVEL_ORDER.reduce((acc, level) => {
        acc[level] = normalizePrismPromptTemplateText(template[level] || PRISM_STACK_PROMPT_TEMPLATES.default[level] || '', anchorText);
        return acc;
    }, {});
}

function buildVerticalStackSuggestedAnswers(prism, anchorText) {
    const a = String(anchorText || '').trim() || deriveDefaultPrismAnchor(prism);
    const suggestionsByLevel = {
        E: [
            `כש-${a} מופיע בשיחה רשמית מול סמכות`,
            `בעיקר בתחילת שיחה או בהקשר פורמלי` 
        ],
        B: [
            `כש-${a} מופיע אני משתתק/מוריד מבט/עוצר`,
            `אני מסנן משפטים בראש במקום לענות ישירות`
        ],
        C: [
            `חסרה לי אסטרטגיית הבהרה קצרה מול ${a}`,
            `נדרשת מיומנות ויסות + ניסוח שאלה מדויקת`
        ],
        V: [
            `הכלל שלי: אם ${a} מופיע - זה סימן למשהו שלילי`,
            `הקריטריון שלי כרגע הוא לא לטעות מול סמכות`
        ],
        I: [
            `${a} מפעיל סיפור זהות של "אני לא מספיק טוב"`,
            `אני מפרש את ${a} כהוכחה לערך עצמי`
        ],
        S: [
            `${a} גורם לי להרגיש שאני מחוץ לקבוצה/במבחן`,
            `זה נשמע לי כמו איום על המקום שלי במערכת`
        ]
    };

    if (prism?.id === 'comparative_deletion') {
        suggestionsByLevel.V = [
            `הקריטריון שלי ל-"${a}" הוא תוצאה/מדד מסוים`,
            `אני משווה לפי סטנדרט לא מוגדר במקום קריטריון ברור`
        ];
        suggestionsByLevel.S = [
            `ההשוואה סביב "${a}" חשובה מול קבוצה מסוימת`,
            `אני מודד את עצמי מול קבוצת ייחוס`
        ];
    }
    if (prism?.id === 'cause_effect') {
        suggestionsByLevel.B = [
            `כש-${a} מופיע אני נכנס לדריכות/סינון/שתיקה`,
            `התגובה שלי ל-${a} מייצרת את התקיעות בפועל`
        ];
        suggestionsByLevel.V = [
            `האמונה: אם ${a} קורה - כנראה יש ביקורת/סכנה`,
            `יש כלל שמחבר בין ${a} לבין תוצאה שלילית`
        ];
    }
    if (prism?.id === 'complex_equivalence') {
        suggestionsByLevel.V = [
            `הכלל: "${a}" = משמעות של כישלון/דחייה`,
            `אני נותן ל-${a} משמעות קבועה בלי לבדוק חלופות`
        ];
        suggestionsByLevel.C = [
            `חסרה אסטרטגיית בדיקת ראיות לפני קביעת משמעות`,
            `נדרשת יכולת להחזיק כמה פירושים ל-${a}`
        ];
    }

    const out = [];
    PRISM_STACK_LEVEL_ORDER.forEach((level) => {
        (suggestionsByLevel[level] || []).slice(0, 2).forEach((text, idx) => {
            out.push({ id: `stack-s-${prism?.id || 'generic'}-${level}-${idx}`, level, text });
        });
    });
    return out.slice(0, 12);
}

function buildVerticalStackPivotSuggestions(prism, anchorText) {
    const a = String(anchorText || '').trim() || deriveDefaultPrismAnchor(prism);
    return [
        { id: `pivot-safe-E-${prism?.id || 'g'}`, level: 'E', text: `צעד הבא (סביבה / E): באיזה הקשר/מתי ${a} קורה או לא קורה?` },
        { id: `pivot-down-B-${prism?.id || 'g'}`, level: 'B', text: `צעד הבא (התנהגות / B): מה אתה עושה בפועל כש-${a} מופיע?` },
        { id: `pivot-bridge-V-${prism?.id || 'g'}`, level: 'V', text: `צעד הבא (ערכים/אמונות / V): איזה כלל מחבר אצלך את ${a} למשמעות/תוצאה?` },
        { id: `pivot-cap-C-${prism?.id || 'g'}`, level: 'C', text: `צעד הבא (יכולות / C): איזו מיומנות תקטין את הקפיצה סביב ${a}?` }
    ];
}

function getPrismAnchorInputEl() {
    return document.getElementById('prism-anchor-input');
}

function getCurrentPrismFromDetail() {
    const detail = document.getElementById('prism-detail');
    const prismId = detail?.getAttribute('data-prism-id') || '';
    return getPrismById(prismId);
}

function getCurrentPrismAnchorText(prism) {
    const input = getPrismAnchorInputEl();
    const raw = String(input?.value || '').trim();
    return raw || deriveDefaultPrismAnchor(prism);
}

function renderVerticalStackPrompts(prompts) {
    PRISM_STACK_LEVEL_ORDER.forEach((level) => {
        const el = document.getElementById(`prompt-${level}`);
        if (el) el.textContent = prompts?.[level] || LOGICAL_LEVEL_INFO[level]?.prompt || '';
    });
}

function renderPreparedAnswersList(items) {
    const list = document.getElementById('prepared-list');
    if (!list) return;
    list.innerHTML = '';
    (items || []).forEach((item) => {
        const div = document.createElement('div');
        div.className = 'prepared-item prepared-answer-item';
        div.title = item.text || '';
        div.dataset.level = item.level || '';
        div.dataset.cleanText = item.text || '';
        div.dataset.kind = 'answer';
        div.setAttribute('draggable', 'true');
        div.innerHTML = `<span class="prepared-item-level-tag">${escapeHtml(item.level || '')}</span><span class="prepared-item-text">${escapeHtml(item.text || '')}</span>`;
        div.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', item.text || '');
            e.dataTransfer.setData('text/meta-model-level', item.level || '');
        });
        div.addEventListener('click', () => copyPreparedToFocusedOrEmpty(item.text || '', item.level || ''));
        list.appendChild(div);
    });
}

function renderPivotSuggestionsList(items) {
    const wrap = document.getElementById('prepared-pivot-list-wrap');
    const list = document.getElementById('prepared-pivot-list');
    const toggle = document.getElementById('prepared-pivot-toggle');
    if (!wrap || !list || !toggle) return;
    wrap.classList.toggle('hidden', !toggle.checked);
    list.innerHTML = '';
    if (!toggle.checked) return;
    (items || []).forEach((item) => {
        const div = document.createElement('div');
        div.className = 'prepared-item prepared-pivot-item';
        div.dataset.level = item.level || '';
        div.dataset.kind = 'pivot';
        div.innerHTML = `<span class="prepared-item-level-tag">${escapeHtml(item.level || '')}</span><span class="prepared-item-text">${escapeHtml(item.text || '')}</span>`;
        div.addEventListener('click', () => showHint(item.text || ''));
        list.appendChild(div);
    });
}

function getPrismVerticalStackDraftStore() {
    try { return JSON.parse(localStorage.getItem(PRISM_VERTICAL_STACK_DRAFT_KEY) || '{}') || {}; }
    catch (_error) { return {}; }
}

function loadPrismVerticalStackDraft(prismId) {
    const store = getPrismVerticalStackDraftStore();
    const draft = store?.[prismId];
    return (draft && draft.categoryId === prismId) ? draft : null;
}

function savePrismVerticalStackDraftForCurrentPrism() {
    const prism = getCurrentPrismFromDetail();
    if (!prism) return;
    const detail = document.getElementById('prism-detail');
    if (detail?.classList.contains('hidden')) return;

    const anchorText = getCurrentPrismAnchorText(prism);
    const answers = {};
    PRISM_STACK_LEVEL_ORDER.forEach((level) => {
        answers[level] = String(document.getElementById(`ans-${level}`)?.value || '').trim();
    });

    const draft = {
        categoryId: prism.id,
        categoryLabelHe: prism.name_he || '',
        coreQuestion: getPrismCoreQuestion(prism),
        anchorText,
        prompts: buildVerticalStackPrompts(prism, anchorText),
        answers,
        suggestions: buildVerticalStackSuggestedAnswers(prism, anchorText),
        emotion: parseInt(document.getElementById('prism-emotion')?.value || '3', 10),
        resistance: parseInt(document.getElementById('prism-resistance')?.value || '2', 10)
    };

    const store = getPrismVerticalStackDraftStore();
    store[prism.id] = draft;
    localStorage.setItem(PRISM_VERTICAL_STACK_DRAFT_KEY, JSON.stringify(store));
    prismVerticalStackState = draft;
}

function applyVerticalStackStateToUI(prism, draft) {
    const anchorInput = getPrismAnchorInputEl();
    const anchorText = String(draft?.anchorText || '').trim() || deriveDefaultPrismAnchor(prism);
    if (anchorInput) anchorInput.value = anchorText;

    renderVerticalStackPrompts(buildVerticalStackPrompts(prism, anchorText));

    PRISM_STACK_LEVEL_ORDER.forEach((level) => {
        const input = document.getElementById(`ans-${level}`);
        if (!input) return;
        input.value = String(draft?.answers?.[level] || '').trim();
        delete input.dataset.suggestedLevel;
        clearMappingInputStatus(input);
    });

    const emotion = Number.isFinite(draft?.emotion) ? draft.emotion : 3;
    const resistance = Number.isFinite(draft?.resistance) ? draft.resistance : 2;
    const emo = document.getElementById('prism-emotion');
    const emoD = document.getElementById('emotion-display');
    const res = document.getElementById('prism-resistance');
    const resD = document.getElementById('resistance-display');
    if (emo) emo.value = String(emotion);
    if (emoD) emoD.textContent = String(emotion);
    if (res) res.value = String(resistance);
    if (resD) resD.textContent = String(resistance);

    populatePreparedItems(prism);
    applyPrismLabVisualHierarchyEnhancements();
}

function refreshPrismVerticalStackForCurrentPrism(options = {}) {
    const prism = getCurrentPrismFromDetail();
    if (!prism) return;
    const anchorInput = getPrismAnchorInputEl();
    if (anchorInput && !String(anchorInput.value || '').trim() && options.forceDefaultAnchor !== false) {
        anchorInput.value = deriveDefaultPrismAnchor(prism);
    }
    const anchorText = getCurrentPrismAnchorText(prism);
    renderVerticalStackPrompts(buildVerticalStackPrompts(prism, anchorText));
    populatePreparedItems(prism);
    savePrismVerticalStackDraftForCurrentPrism();
}
function getPrismById(prismId) {
    return (metaModelData.prisms || []).find(x => x.id === prismId);
}

function getLevelDisplay(level) {
    const info = LOGICAL_LEVEL_INFO[level];
    return info ? `${info.hebrew}` : level;
}

function getLevelBilingualLabel(level) {
    const info = LOGICAL_LEVEL_INFO[level];
    if (!info) return level;
    return `${info.hebrew}`;
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

        <div class="prism-guide-grid prism-guide-grid-mode-split">
            <div class="prism-guide-card">
                <h5>שתי פריזמות שונות (חשוב)</h5>
                <p><strong>Prism Research (חקירה בשרשרת):</strong> שואלים שוב על כל תשובה חדשה שנולדה. זו חקירה "רקורסיבית" - כלומר אותה צורת שאלה חוזרת על תוצאה חדשה כדי להתקדם שכבה אחרי שכבה.</p>
                <p><strong>Prism Lab (מגדל רמות):</strong> נשארים על מילה/ביטוי מרכזי אחד ("עוגן") + קטגוריה אחת, ובונים חתך עומק דרך רמות לוגיות (${LOGICAL_LEVELS_SEQUENCE_FRIENDLY}). זו חקירה לעומק.</p>
                <p><strong>במשפט אחד:</strong> Research = מתקדמים קדימה עם שאלות חדשות. Lab = נשארים על אותו מוקד ומעמיקים.</p>
            </div>
            <div class="prism-guide-card">
                <h5>שני מושגים שחייבים להיות ברורים</h5>
                <p><strong>מה זה "עוגן"?</strong> המילה או הביטוי המרכזיים מתוך המשפט שעליהם עובדים עכשיו. לא כל המשפט - רק נקודת מיקוד אחת שמעמיקים עליה.</p>
                <p><strong>מה זה "רקורסיבי" ולמה זה חשוב בטיפול?</strong> רקורסיבי = חוזרים עם אותה שאלה/עדשה על התשובה החדשה. זה עוזר לא לקפוץ מהר לפרשנות, אלא לחשוף שכבות נוספות של משמעות, הכללה והנחות.</p>
            </div>
        </div>

        <div class="prism-guide-grid">
            <div class="prism-guide-card">
                <h5>׳׳™׳ ׳¢׳•׳‘׳“׳™׳ ׳ ׳›׳•׳ ׳‘-4 ׳©׳׳‘׳™׳</h5>
                <ol>
                    <li>׳׳ ׳¡׳—׳™׳ ׳׳× ׳©׳׳׳× ׳”׳¢׳•׳’׳ ׳•׳׳•׳•׳“׳׳™׳ ׳©׳”׳™׳ ׳‘׳¨׳•׳¨׳” ׳•׳׳“׳™׳“׳”.</li>
                    <li>ממפים כל תשובה לרמה הלוגית המתאימה: סביבה, התנהגות, יכולות, ערכים/אמונות, זהות, שייכות.</li>
                    <li>׳׳–׳”׳™׳ ׳₪׳¢׳¨׳™׳ ׳•׳©׳™׳‘׳•׳¦׳™׳ ׳©׳’׳•׳™׳™׳ ׳›׳“׳™ ׳׳׳ ׳•׳¢ ׳׳¡׳§׳ ׳•׳× ׳׳ ׳׳“׳•׳™׳§׳•׳×.</li>
                    <li>׳‘׳•׳—׳¨׳™׳ צעד הבא ׳׳—׳“ ׳§׳˜׳ ׳׳‘׳™׳¦׳•׳¢ ׳׳™׳™׳“׳™, ׳¢׳ ׳”׳׳©׳ ׳¢׳•׳׳§ ׳׳“׳•׳¨׳’.</li>
                </ol>
            </div>
            <div class="prism-guide-card">
                <h5>׳׳™׳ ׳׳”׳‘׳—׳™׳ ׳‘׳™׳ ׳”׳¨׳׳•׳×</h5>
                <ul>${levelGuide}</ul>
            </div>
            <div class="prism-guide-card">
                <h5>׳׳” ׳׳•׳׳¨ "׳¢׳•׳׳§" ׳‘׳₪׳¨׳™׳–׳׳”</h5>
                <p>׳׳×׳—׳™׳׳™׳ ׳‘-סביבה/התנהגות ׳›׳“׳™ ׳׳¢׳’׳ ׳¢׳•׳‘׳“׳•׳× ׳‘׳©׳˜׳—, ׳•׳׳– ׳¢׳•׳׳™׳ ׳-יכולות/ערכים/זהות/שייכות ׳›׳“׳™ ׳׳”׳‘׳™׳ ׳׳ ׳’׳ ׳•׳ ׳₪׳ ׳™׳׳™ ׳•׳–׳”׳•׳×׳™.</p>
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
        notes.push('׳”׳׳™׳₪׳•׳™ ׳—׳׳§׳™. ׳׳₪׳ ׳™ צעד הבא ׳¢׳׳•׳§, ׳׳•׳׳׳¥ ׳׳¡׳“׳¨ ׳׳× ׳”׳©׳™׳‘׳•׳¦׳™׳ ׳•׳׳“׳™׳™׳§ ׳ ׳™׳¡׳•׳—׳™׳.');
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
            ? '<p><strong>׳¡׳˜׳˜׳•׳¡:</strong> ׳–׳• ׳¨׳׳× ׳”-צעד הבא ׳”׳׳•׳׳׳¦׳× ׳›׳¨׳’׳¢.</p>'
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
        ? '׳¢׳‘׳•׳“׳” ׳¢׳ ׳”׳×׳ ׳’׳“׳•׳× ׳’׳‘׳•׳”׳”: ׳”׳×׳—׳ ׳‘-Small Win ׳—׳™׳¦׳•׳ ׳™ (סביבה/התנהגות) ׳׳₪׳ ׳™ ׳©׳™׳ ׳•׳™ ׳׳׳•׳ ׳•׳× ׳¢׳׳•׳§.'
        : '׳׳₪׳©׳¨ ׳׳”׳×׳§׳“׳ ׳׳¢׳•׳׳§: ׳׳—׳¨׳™ ׳‘׳™׳¦׳•׳¢ ׳¦׳¢׳“ ׳§׳˜׳, ׳¢׳‘׳•׳¨ ׳׳¢׳‘׳•׳“׳” ׳‘׳¨׳׳•׳× יכולות/ערכים/זהות.';
    const emotionStep = highEmotion
        ? '׳‘׳׳¦׳‘ ׳¨׳’׳©׳™ ׳’׳‘׳•׳”: ׳”׳׳˜ ׳§׳¦׳‘, ׳׳׳× ׳¢׳•׳‘׳“׳•׳×, ׳•׳¨׳§ ׳׳– ׳‘׳¦׳¢ ׳₪׳¨׳©׳ ׳•׳× ׳׳• ׳”׳›׳׳׳”.'
        : '׳”׳¨׳’׳© ׳™׳¦׳™׳‘ ׳™׳—׳¡׳™׳×: ׳׳×׳׳™׳ ׳׳‘׳ ׳™׳™׳× ׳×׳•׳›׳ ׳™׳× ׳₪׳¢׳•׳׳” ׳׳“׳•׳¨׳’׳× ׳׳©׳‘׳•׳¢ ׳”׳§׳¨׳•׳‘.';

    return `
        <ol class="prism-action-plan">
            <li><strong>׳¦׳¢׳“ 1 (׳“׳™׳•׳§ ׳©׳₪׳”):</strong> ${alignmentStep}</li>
            <li><strong>׳¦׳¢׳“ 2 (צעד הבא ׳׳¢׳©׳™):</strong> ׳‘׳¦׳¢ ׳₪׳¢׳•׳׳” ׳׳—׳× ׳׳₪׳™ ׳¨׳׳× ${recommendation.levelName}: ${recommendation.intervention}</li>
            <li><strong>׳¦׳¢׳“ 3 (׳•׳•׳™׳¡׳•׳× ׳•׳”׳×׳׳“׳”):</strong> ${resistanceStep}</li>
            <li><strong>׳¦׳¢׳“ 4 (׳¢׳•׳׳§ ׳¨׳’׳©׳™):</strong> ${emotionStep}</li>
            <li><strong>׳©׳׳׳× ׳”׳׳©׳ ׳׳—׳™׳™׳‘׳×:</strong> ${recommendation.followUpQuestion}</li>
        </ol>
    `;
}

function classifyStackJumpFromMap(filledSet) {
    const jumps = [];
    const has = (level) => filledSet.has(level);

    if ((has('E') || has('B')) && (has('I') || has('S')) && !has('V')) {
        jumps.push({
            code: 'EB_to_IS_without_V',
            severity: 'high',
            text: 'קפיצה חדה: יש סביבה/התנהגות וגם זהות/שייכות, אבל חסרה שכבת ערכים/אמונות כגשר.'
        });
    }
    if ((has('E') || has('B')) && has('I') && !has('C')) {
        jumps.push({
            code: 'EB_to_I_without_C',
            severity: 'medium',
            text: 'קפיצה לזהות בלי שכבת יכולות/אסטרטגיה. ייתכן שחסרה מיומנות ולא רק משמעות.'
        });
    }
    if (has('V') && !has('E') && !has('B')) {
        jumps.push({
            code: 'V_without_EB',
            severity: 'medium',
            text: 'יש כלל/אמונה בלי עיגון של הקשר או התנהגות. חזר/י קודם לסביבה/התנהגות.'
        });
    }
    if (has('S') && !has('E') && !has('B')) {
        jumps.push({
            code: 'S_without_EB',
            severity: 'low',
            text: 'יש שייכות/סטטוס בלי דוגמה קונקרטית. כדאי להוסיף איפה/מתי ומה קורה בפועל.'
        });
    }

    return jumps;
}

function buildVerticalStackMapResult(answerChecks) {
    const answersByLevel = {};
    PRISM_STACK_LEVEL_ORDER.forEach((level) => { answersByLevel[level] = ''; });
    (answerChecks || []).forEach((check) => {
        if (check?.level) answersByLevel[check.level] = check.text || '';
    });

    const filledLevels = PRISM_STACK_LEVEL_ORDER.filter((level) => !!String(answersByLevel[level] || '').trim());
    const emptyLevels = PRISM_STACK_LEVEL_ORDER.filter((level) => !filledLevels.includes(level));
    const filledSet = new Set(filledLevels);
    const jumps = classifyStackJumpFromMap(filledSet);

    return { answersByLevel, filledLevels, emptyLevels, jumps };
}

function computeVerticalStackPivotRecommendation(stackState) {
    const mapResult = stackState?.mapResult || buildVerticalStackMapResult(stackState?.answerChecks || []);
    const has = (level) => (mapResult.filledLevels || []).includes(level);
    const highResistance = (stackState?.resistance || 0) >= 4;
    const highEmotion = (stackState?.emotion || 0) >= 4;
    const lowResistance = (stackState?.resistance || 0) <= 2;
    const bigJumpWithoutV = (mapResult.jumps || []).some((j) => j.code === 'EB_to_IS_without_V');

    let suggestedLevelFocus = 'B';
    let titleHe = 'Downshift to Behavior';
    let whyHe = 'יש משמעות/סיפור, אבל חסר תיאור התנהגות קונקרטי. ירידה ל-B מחזירה קרקע ומקטינה הצפה.';
    let nextQuestionHe = `מה אתה עושה בפועל כש-"${stackState?.anchorText || 'העוגן'}" מופיע?`;

    if (has('I') && !has('B')) {
        suggestedLevelFocus = 'B';
        titleHe = 'חזרה לקרקע דרך התנהגות';
        whyHe = 'יש שכבת זהות בלי שכבת התנהגות. לפני אתגור זהות, בונים תיאור של מה קורה בפועל.';
        nextQuestionHe = `מה אתה עושה בפועל בשניות הראשונות כש-"${stackState.anchorText}" מופיע?`;
    } else if (has('V') && !has('E') && !has('B')) {
        suggestedLevelFocus = 'E';
        titleHe = 'לדייק הקשר או התנהגות';
        whyHe = 'יש כלל/אמונה בלי עיגון קונקרטי. כדאי קודם למלא הקשר או התנהגות.';
        nextQuestionHe = `באיזה מצב/מתי "${stackState.anchorText}" מופיע, ומה קורה שם בפועל?`;
    } else if (bigJumpWithoutV) {
        suggestedLevelFocus = 'V';
        titleHe = 'לחשוף את הכלל שמחבר';
        whyHe = 'נראית קפיצה מסביבה/התנהגות לזהות/שייכות בלי גשר. שכבת ערכים/אמונות יכולה לחשוף את הכלל שמדביק בין הרמות.';
        nextQuestionHe = `איזה כלל/אמונה מחברים אצלך את "${stackState.anchorText}" למשמעות הזו?`;
    } else if (highResistance) {
        suggestedLevelFocus = has('E') ? (has('B') ? 'C' : 'B') : 'E';
        titleHe = 'צעד הבא בטוח (חיכוך נמוך)';
        whyHe = 'רמת התנגדות גבוהה: עדיף צעד הבא בטוח בסביבה/התנהגות/יכולות לפני אתגור עמוק.';
        const safeQuestions = {
            E: `באיזה הקשר/מתי "${stackState.anchorText}" קורה או לא קורה?`,
            B: `מה אתה עושה בפועל כש-"${stackState.anchorText}" מופיע?`,
            C: `איזו מיומנות אחת היתה עוזרת לך ברגע ש-"${stackState.anchorText}" מופיע?`
        };
        nextQuestionHe = safeQuestions[suggestedLevelFocus] || safeQuestions.B;
    } else if (highEmotion && lowResistance && (has('V') || has('I'))) {
        suggestedLevelFocus = has('V') ? 'V' : 'I';
        titleHe = 'צעד מאתגר (בדיקת משמעות)';
        whyHe = 'רגש גבוה עם התנגדות נמוכה יחסית מאפשר לבדוק את הדבק (אמונה/זהות) ולא רק לתאר הקשר.';
        nextQuestionHe = suggestedLevelFocus === 'V'
            ? `איזו ראיה מחזקת את הכלל סביב "${stackState.anchorText}" ואיזו ראיה מחלישה אותו?`
            : `איך בדיוק "${stackState.anchorText}" הופך להוכחה על מי שאתה - ולא רק על מה שקרה?`;
    } else {
        const firstMissing = (mapResult.emptyLevels || [])[0] || 'B';
        suggestedLevelFocus = firstMissing;
        titleHe = `השלם/י את שכבת ${getLevelDisplay(firstMissing)}`;
        whyHe = 'המפה חלקית. הצעד הבא היעיל ביותר כרגע הוא להשלים שכבה חסרה לפני ניתוח עמוק יותר.';
        nextQuestionHe = stackState?.prompts?.[firstMissing] || `מה חשוב להוסיף ברמת ${getLevelDisplay(firstMissing)}?`;
    }

    return { titleHe, whyHe, nextQuestionHe, suggestedLevelFocus };
}

function renderVerticalStackResult(stackState) {
    const out = document.getElementById('prism-result');
    if (!out || !stackState) return;
    out.classList.remove('hidden');

    const mapResult = stackState.mapResult || { filledLevels: [], emptyLevels: [], jumps: [] };
    const pivot = stackState.pivotResult || {};
    const filledHtml = (mapResult.filledLevels || []).map((level) => `
        <li class="prism-check-item status-ok">
            <p><strong>${getLevelDisplay(level)}:</strong> ${escapeHtml(stackState.answers?.[level] || '')}</p>
        </li>
    `).join('');
    const emptyHtml = (mapResult.emptyLevels || []).map((level) => `<li>${getLevelDisplay(level)}</li>`).join('');
    const jumpsHtml = (mapResult.jumps || []).map((jump) => `<li class="prism-jump-item prism-jump-${escapeHtml(jump.severity || 'low')}">${escapeHtml(jump.text || '')}</li>`).join('');
    const validationHtml = (stackState.answerChecks || []).map((check) => {
        const statusClass = check.status === 'ok' ? 'status-ok' : check.status === 'mismatch' ? 'status-bad' : 'status-warn';
        const statusLabel = check.status === 'ok' ? 'תואם' : check.status === 'mismatch' ? 'שיבוץ חשוד' : 'דורש חידוד';
        return `
            <li class="prism-check-item ${statusClass}">
                <p><strong>${getLevelDisplay(check.level)}:</strong> ${escapeHtml(check.text || '')}</p>
                <p><strong>סטטוס:</strong> ${statusLabel}</p>
                <p>${escapeHtml(check.reason || '')}</p>
            </li>
        `;
    }).join('');

    out.innerHTML = `
        <h4>מגדל רמות (מגדל לוגי) - ${escapeHtml(stackState.categoryLabelHe || '')}</h4>
        <p><strong>שאלת עוגן:</strong> ${escapeHtml(stackState.coreQuestion || '')}</p>
        <p><strong>עוגן:</strong> ${escapeHtml(stackState.anchorText || '')}</p>
        <p><strong>רגש:</strong> ${escapeHtml(String(stackState.emotion || 3))} | <strong>התנגדות:</strong> ${escapeHtml(String(stackState.resistance || 2))}</p>

        <div class="prism-quick-grid">
            <article class="prism-quick-card">
                <h5>רמות מלאות</h5>
                <p class="prism-quick-number">${(mapResult.filledLevels || []).length}/6</p>
                <p>${(mapResult.filledLevels || []).map((l) => escapeHtml(l)).join(' · ') || '—'}</p>
            </article>
            <article class="prism-quick-card">
                <h5>צעד הבא המומלץ</h5>
                <p class="prism-quick-number">${escapeHtml(pivot.suggestedLevelFocus || '')}</p>
                <p>${escapeHtml(pivot.titleHe || '')}</p>
            </article>
            <article class="prism-quick-card">
                <h5>קפיצות חדות</h5>
                <p class="prism-quick-number">${(mapResult.jumps || []).length}</p>
                <p>${(mapResult.jumps || []).length ? 'נדרשים גשרים' : 'מפה יחסית רציפה'}</p>
            </article>
        </div>

        <div class="blueprint-section prism-pivot-box">
            <h4>הצעד הבא המומלץ</h4>
            <p><strong>${escapeHtml(pivot.titleHe || '')}</strong></p>
            <p>${escapeHtml(pivot.whyHe || '')}</p>
            <p><strong>שאלת המשך:</strong> ${escapeHtml(pivot.nextQuestionHe || '')}</p>
            <p><strong>פוקוס רמה:</strong> ${escapeHtml(getLevelDisplay(pivot.suggestedLevelFocus || ''))}</p>
        </div>

        <div class="blueprint-section">
            <h4>מפה</h4>
            ${((mapResult.filledLevels || []).length < 3) ? '<p class="muted">אזהרה רכה: מומלץ למלא לפחות 3 רמות כדי לקבל צעד הבא יציב יותר.</p>' : ''}
            <div class="prism-stack-result-grid">
                <div>
                    <h5>רמות שמולאו</h5>
                    <ul class="prism-check-list">${filledHtml || '<li class="prism-check-item status-warn"><p>עדיין אין רמות מלאות.</p></li>'}</ul>
                </div>
                <div>
                    <h5>רמות חסרות</h5>
                    <ul class="prism-empty-levels">${emptyHtml || '<li>אין</li>'}</ul>
                    <h5>קפיצות / גשרים חסרים</h5>
                    <ul class="prism-jump-list">${jumpsHtml || '<li class="prism-jump-item prism-jump-low">לא זוהו קפיצות חדות.</li>'}</ul>
                </div>
            </div>
        </div>

        <details class="prism-more-details">
            <summary>הצג בדיקת התאמה לפי רמות</summary>
            <div class="blueprint-section">
                <h4>בדיקת שיבוץ</h4>
                <ul class="prism-check-list">${validationHtml || '<li class="prism-check-item status-warn"><p>אין תשובות לבדיקה.</p></li>'}</ul>
            </div>
        </details>

        <div class="action-buttons">
            <button class="btn btn-secondary" onclick="exportPrismSession()">ייצא סשן JSON</button>
        </div>
    `;
}
function setupPrismModule() {
    if (typeof applyPrismLabCompactRuntimeCopy === 'function') applyPrismLabCompactRuntimeCopy();
    if (typeof ensurePrismLabWorkLayout === 'function') ensurePrismLabWorkLayout();
    renderPrismLibrary();
    setupAudioMuteButtons();

    // Ensure prism-detail starts hidden
    const prismDetail = document.getElementById('prism-detail');
    if (prismDetail) prismDetail.classList.add('hidden');
    const prismLibrary = document.getElementById('prism-library');
    if (prismLibrary) prismLibrary.classList.remove('hidden');
    if (typeof applyPrismLabCompactRuntimeCopy === 'function') applyPrismLabCompactRuntimeCopy();

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

    const anchorInput = document.getElementById('prism-anchor-input');
    if (anchorInput && anchorInput.dataset.boundPrismAnchor !== 'true') {
        anchorInput.dataset.boundPrismAnchor = 'true';
        anchorInput.addEventListener('input', () => refreshPrismVerticalStackForCurrentPrism({ forceDefaultAnchor: false }));
        anchorInput.addEventListener('blur', () => refreshPrismVerticalStackForCurrentPrism({ forceDefaultAnchor: true }));
    }

    const pivotToggle = document.getElementById('prepared-pivot-toggle');
    if (pivotToggle && pivotToggle.dataset.boundPrismPivotToggle !== 'true') {
        pivotToggle.dataset.boundPrismPivotToggle = 'true';
        pivotToggle.addEventListener('change', () => {
            const prism = getCurrentPrismFromDetail();
            if (!prism) return;
            renderPivotSuggestionsList(buildVerticalStackPivotSuggestions(prism, getCurrentPrismAnchorText(prism)));
            savePrismVerticalStackDraftForCurrentPrism();
        });
    }

    const emo = document.getElementById('prism-emotion');
    const emoD = document.getElementById('emotion-display');
    if (emo && emo.dataset.boundPrismSlider !== 'true') {
        emo.dataset.boundPrismSlider = 'true';
        emo.addEventListener('input', (e) => {
            emoD.textContent = e.target.value;
            savePrismVerticalStackDraftForCurrentPrism();
        });
    }
    const res = document.getElementById('prism-resistance');
    const resD = document.getElementById('resistance-display');
    if (res && res.dataset.boundPrismSlider !== 'true') {
        res.dataset.boundPrismSlider = 'true';
        res.addEventListener('input', (e) => {
            resD.textContent = e.target.value;
            savePrismVerticalStackDraftForCurrentPrism();
        });
    }

    if (typeof applyPrismLabCompactRuntimeCopy === 'function') applyPrismLabCompactRuntimeCopy();
    if (typeof ensurePrismLabWorkLayout === 'function') ensurePrismLabWorkLayout();
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
    const resultBox = document.getElementById('prism-result');
    if (resultBox) {
        resultBox.classList.add('hidden');
        resultBox.innerHTML = '';
    }
    // store current prism in a temp
    detail.setAttribute('data-prism-id', id);
    const pivotToggle = document.getElementById('prepared-pivot-toggle');
    if (pivotToggle) pivotToggle.checked = false;

    const draft = loadPrismVerticalStackDraft(id);
    applyVerticalStackStateToUI(prism, draft || {
        categoryId: prism.id,
        categoryLabelHe: prism.name_he || '',
        coreQuestion: getPrismCoreQuestion(prism),
        anchorText: deriveDefaultPrismAnchor(prism),
        answers: {},
        emotion: 3,
        resistance: 2
    });

    attachMappingDropHandlers();
    refreshPrismVerticalStackForCurrentPrism({ forceDefaultAnchor: true });
}

function handlePrismSubmit() {
    const id = document.getElementById('prism-detail').getAttribute('data-prism-id');
    const prism = getPrismById(id);
    if (!prism) return alert('׳׳™׳ ׳₪׳¨׳™׳–׳׳” ׳₪׳¢׳™׳׳”');
    const anchorText = getCurrentPrismAnchorText(prism);
    if (!String(anchorText || '').trim()) {
        playUISound('prism_error');
        showHintMessage('יש להזין מילה/ביטוי מרכזי לבדיקה ("עוגן") לפני יצירת המפה.');
        return;
    }

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
        showHintMessage('יש למלא לפחות רמה אחת כדי לבנות מגדל לוגי.');
        return;
    }

    const emotion = parseInt(document.getElementById('prism-emotion').value || '3', 10);
    const resistance = parseInt(document.getElementById('prism-resistance').value || '2', 10);
    const answersRecord = {};
    PRISM_STACK_LEVEL_ORDER.forEach((level) => {
        answersRecord[level] = String(document.getElementById(`ans-${level}`)?.value || '').trim();
    });
    const prompts = buildVerticalStackPrompts(prism, anchorText);
    const suggestions = buildVerticalStackSuggestedAnswers(prism, anchorText);
    const mapResult = buildVerticalStackMapResult(answerChecks);
    const stackState = {
        categoryId: prism.id,
        categoryLabelHe: prism.name_he || prism.name_en || prism.id,
        coreQuestion: getPrismCoreQuestion(prism),
        anchorText,
        prompts,
        answers: answersRecord,
        suggestions,
        emotion,
        resistance,
        answerChecks,
        mapResult
    };
    stackState.pivotResult = computeVerticalStackPivotRecommendation(stackState);
    prismVerticalStackState = stackState;

    const mismatchesCount = answerChecks.filter(a => a.status === 'mismatch').length;
    if (mismatchesCount > 0) playUISound('prism_warn');
    else playUISound('prism_submit');

    if ((mapResult.filledLevels || []).length < 3) {
        showHintMessage('המפה נבנתה, אבל מומלץ למלא לפחות 3 רמות כדי לייצב את צעד ההמשך.');
    }

    renderVerticalStackResult(stackState);
    savePrismVerticalStackDraftForCurrentPrism();
    const prismResultEl = document.getElementById('prism-result');
    if (prismResultEl) {
        window.requestAnimationFrame(() => {
            try {
                prismResultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } catch (_error) {
                prismResultEl.scrollIntoView();
            }
        });
    }

    const session = {
        datetime: new Date().toISOString(),
        mode: 'vertical_stack',
        prism_id: prism.id,
        prism_name: prism.name_he,
        coreQuestion: getPrismCoreQuestion(prism),
        anchor: anchorText,
        answers: answerChecks,
        emotion,
        resistance,
        verticalStack: {
            prompts,
            mapResult,
            pivotResult: stackState.pivotResult
        }
    };
    savePrismSession(session, stackState.pivotResult);
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
            <h4>׳”׳׳׳¦׳× צעד הבא - ׳”׳¡׳‘׳¨ ׳׳¢׳׳™׳§</h4>
            <p><strong>צעד הבא ׳׳•׳׳׳¥:</strong> ${recommendation.levelName}</p>
            <p><strong>׳׳׳” ׳–׳” ׳ ׳‘׳—׳¨:</strong> ${recommendation.reason}</p>
            <p><strong>׳”׳×׳¢׳¨׳‘׳•׳× ׳׳•׳¦׳¢׳×:</strong> ${recommendation.intervention}</p>
            <p><strong>׳©׳׳׳× ׳”׳׳©׳ ׳׳¢׳•׳׳§:</strong> ${recommendation.followUpQuestion}</p>
            <p><strong>׳¢׳•׳¦׳׳× ׳¨׳’׳©:</strong> ${session.emotion} | <strong>׳”׳×׳ ׳’׳“׳•׳×:</strong> ${session.resistance}</p>
            <p><strong>׳₪׳™׳–׳•׳¨ ׳×׳©׳•׳‘׳•׳× ׳׳₪׳™ ׳¨׳׳•׳× (׳׳׳—׳¨ ׳ ׳¨׳׳•׳):</strong></p>
            <ul>${countsHtml}</ul>
            <p><strong>׳׳©׳׳¢׳•׳× ׳׳¢׳©׳™׳×:</strong> ׳”-צעד הבא ׳”׳•׳ ׳ ׳§׳•׳“׳× ׳”׳׳™׳ ׳•׳£ ׳”׳›׳™ ׳™׳¢׳™׳׳” ׳›׳¨׳’׳¢. ׳׳™׳§׳•׳“ ׳ ׳›׳•׳ ׳‘׳¨׳׳” ׳”׳–׳• ׳™׳•׳¦׳¨ ׳×׳–׳•׳–׳” ׳׳”׳™׳¨׳” ׳•׳׳– ׳׳׳₪׳©׳¨ ׳¢׳‘׳•׳“׳” ׳¢׳׳•׳§׳” ׳™׳•׳×׳¨.</p>
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
                <h5>צעד הבא ׳׳•׳׳׳¥</h5>
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
                ${focusItems || '<li>׳ ׳¨׳׳” ׳˜׳•׳‘. ׳׳₪׳©׳¨ ׳׳¢׳‘׳•׳¨ ׳׳‘׳™׳¦׳•׳¢ ׳”-צעד הבא ׳©׳ ׳‘׳—׳¨.</li>'}
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
                <h4>׳׳׳” ׳–׳” ׳”-צעד הבא ׳”׳׳•׳׳׳¥</h4>
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

function buildPrismStackLegendRowsHtml() {
    return ['E', 'B', 'C', 'V', 'I', 'S']
        .map((level, index) => {
            const info = LOGICAL_LEVEL_INFO[level] || { hebrew: level, prompt: '' };
            return `
                <div class="prism-mini-stack-row prism-mini-stack-row-${level}">
                    <span class="prism-mini-stack-tag">${index + 1}</span>
                    <div class="prism-mini-stack-copy">
                        <span class="prism-mini-stack-label">${escapeHtml(info.hebrew)}</span>
                        <small>${escapeHtml(info.prompt)}</small>
                    </div>
                </div>
            `;
        })
        .join('');
}

function enhancePrismLabOptionalAnalysisSection(root = document) {
    const detail = root.querySelector?.('#prism-detail') || document.getElementById('prism-detail');
    const mappingForm = detail?.querySelector('.mapping-form');
    if (!detail || !mappingForm) return;

    const sliderCards = Array.from(mappingForm.querySelectorAll(':scope > .q-card'));
    const actions = mappingForm.querySelector(':scope > .step-buttons');
    if (!sliderCards.length || !actions) return;

    let drawer = mappingForm.querySelector(':scope > .prism-analysis-drawer');
    let drawerBody = drawer?.querySelector('.prism-analysis-drawer-body');
    let slidersWrap = drawer?.querySelector('.prism-analysis-sliders');

    if (!drawer) {
        drawer = document.createElement('details');
        drawer.className = 'prism-analysis-drawer';

        const summary = document.createElement('summary');
        summary.innerHTML = '<span>שלב אופציונלי: בדיקה + צעד הבא המומלץ</span><small>לא חובה כדי לתרגל מילוי רמות</small>';
        drawer.appendChild(summary);

        drawerBody = document.createElement('div');
        drawerBody.className = 'prism-analysis-drawer-body';
        drawer.appendChild(drawerBody);

        const note = document.createElement('p');
        note.className = 'prism-analysis-note';
        note.textContent = 'הכפתור מנתח את המפה שבנית, מסמן שיבוצים בעייתיים, ומחזיר צעד הבא מומלץ + צעדים להמשך. אם את/ה רק מתרגל/ת מילוי רמות, אפשר לדלג.';
        drawerBody.appendChild(note);

        const resultHint = document.createElement('p');
        resultHint.className = 'prism-analysis-result-hint';
        resultHint.textContent = 'אחרי לחיצה, התוצאה תופיע מיד בהמשך המסך (ונגלול אליה אוטומטית).';
        drawerBody.appendChild(resultHint);

        slidersWrap = document.createElement('div');
        slidersWrap.className = 'prism-analysis-sliders';
        drawerBody.appendChild(slidersWrap);

        const firstSlider = sliderCards[0];
        mappingForm.insertBefore(drawer, firstSlider);
    }

    if (!drawerBody) return;
    if (!slidersWrap) {
        slidersWrap = document.createElement('div');
        slidersWrap.className = 'prism-analysis-sliders';
        drawerBody.appendChild(slidersWrap);
    }

    sliderCards.forEach((card) => {
        if (card.parentElement !== slidersWrap) slidersWrap.appendChild(card);
    });

    actions.classList.add('prism-analysis-actions');
    if (actions.parentElement !== drawerBody) drawerBody.appendChild(actions);
}

function applyPrismLabCompactRuntimeCopy() {
    const root = document.getElementById('prismlab');
    if (!root) return;

    const rootCard = root.querySelector('.prism-container .card');
    const rootTitle = rootCard?.querySelector(':scope > h2');
    const rootIntro = rootCard?.querySelector(':scope > p');
    if (rootTitle) rootTitle.textContent = 'מעבדת פריזמות (Prism Lab)';
    if (rootIntro) rootIntro.textContent = `בחר/י פריזמה, בחר/י מילה/ביטוי מרכזי אחד מתוך המשפט ("עוגן"), ואז בדוק/י אותו דרך רמות לוגיות: ${LOGICAL_LEVELS_SEQUENCE_FRIENDLY}.`;

    const anchorStrong = root.querySelector('#prism-detail .anchor-box strong');
    if (anchorStrong) anchorStrong.textContent = 'שאלת מיקוד (על המילה/ביטוי שבחרת):';

    const stackHeadTitle = root.querySelector('#prism-detail .prism-stack-head h4');
    const stackHeadMuted = root.querySelector('#prism-detail .prism-stack-head .muted');
    if (stackHeadTitle) stackHeadTitle.textContent = 'מגדל רמות (רמות לוגיות)';
    if (stackHeadMuted) stackHeadMuted.textContent = `אותה מילה/ביטוי מרכזי, כמה שכבות הסתכלות: ${LOGICAL_LEVELS_SEQUENCE_FRIENDLY_SHORT}. המטרה: לזהות מה חסר ולבחור צעד המשך מדויק.`;

    const anchorLabel = root.querySelector('#prism-detail .prism-anchor-input-card label');
    if (anchorLabel) anchorLabel.textContent = 'מילה/ביטוי מרכזי לבדיקה ("עוגן"):';

    const mappingMuted = root.querySelector('#prism-detail .prism-anchor-input-card + .muted');
    if (mappingMuted) mappingMuted.textContent = 'ממלאים תשובה קצרה בכל רמה לוגית. אפשר להקליד, לגרור הצעות, או להתחיל רק מ-3 רמות.';

    const preparedHead = root.querySelector('#prism-detail .prepared-items h4');
    if (preparedHead) preparedHead.textContent = 'תשובות מוצעות / Suggested';

    const preparedMuted = root.querySelector('#prism-detail .prepared-items > .muted');
    if (preparedMuted) preparedMuted.textContent = 'גרור/י לשדה המתאים, או לחץ/י להעתקה לשדה הפעיל.';

    const pivotToggleLabel = root.querySelector('#prism-detail .prism-toggle-line span');
    if (pivotToggleLabel) pivotToggleLabel.textContent = 'הצג/י רעיונות לצעד הבא';

    const pivotWrapTitle = root.querySelector('#prism-detail #prepared-pivot-list-wrap h5');
    const pivotWrapMuted = root.querySelector('#prism-detail #prepared-pivot-list-wrap .muted');
    if (pivotWrapTitle) pivotWrapTitle.textContent = 'רעיונות לצעד הבא (נפרד מהמגדל)';
    if (pivotWrapMuted) pivotWrapMuted.textContent = 'רעיונות להמשך עבודה. הם לא מחליפים מילוי של רמות המגדל.';

    const qLabels = root.querySelectorAll('#prism-detail .q-card > label');
    if (qLabels[0]) qLabels[0].textContent = 'רגש נוכחי / Emotion (1-5) · אופציונלי';
    if (qLabels[1]) qLabels[1].textContent = 'התנגדות לשינוי / Resistance (1-5) · אופציונלי';

    const cancelBtn = root.querySelector('#prism-cancel');
    const submitBtn = root.querySelector('#prism-submit');
    if (cancelBtn) cancelBtn.textContent = 'חזרה לפריזמות';
    if (submitBtn) {
        submitBtn.textContent = 'בדוק/י מפה + קבל/י צעד הבא';
        submitBtn.setAttribute('title', 'מנתח את המילוי, מציג תוצאות, ומציע צעד הבא להמשך');
    }

    const levelItems = root.querySelectorAll('#prism-detail .level-item');
    levelItems.forEach((item) => {
        const textarea = item.querySelector('textarea[id^="ans-"]');
        const label = item.querySelector('label');
        if (!textarea || !label) return;
        const level = String(textarea.id || '').replace('ans-', '').toUpperCase();
        if (!LOGICAL_LEVEL_INFO[level]) return;
        label.textContent = getLevelBilingualLabel(level);
    });

    enhancePrismLabOptionalAnalysisSection(root);
}

function ensurePrismLabWorkLayout() {
    const detail = document.getElementById('prism-detail');
    const mappingRow = detail?.querySelector('.mapping-row');
    const levelGrid = mappingRow?.querySelector('.level-grid');
    if (!detail || !mappingRow || !levelGrid) return;

    let workCol = mappingRow.querySelector('.prism-work-col');
    if (!workCol) {
        workCol = document.createElement('div');
        workCol.className = 'prism-work-col';
        mappingRow.insertBefore(workCol, levelGrid);
        workCol.appendChild(levelGrid);
    }

    let legend = workCol.querySelector('.prism-mini-stack-panel');
    if (!legend) {
        legend = document.createElement('aside');
        legend.className = 'prism-mini-stack-panel';
        legend.innerHTML = `
            <div class="prism-mini-stack-panel-head">
                <strong>מפת רמות / Stack Map</strong>
                <small>סביבה → התנהגות → יכולות → ערכים/אמונות → זהות → שייכות</small>
            </div>
            <div class="prism-mini-stack">${buildPrismStackLegendRowsHtml()}</div>
        `;
        workCol.appendChild(legend);
    } else {
        const stack = legend.querySelector('.prism-mini-stack');
        if (stack) stack.innerHTML = buildPrismStackLegendRowsHtml();
    }
}

function getPrismLevelFromTextareaId(id) {
    const level = String(id || '').replace('ans-', '').toUpperCase();
    return LOGICAL_LEVEL_INFO[level] ? level : '';
}

function syncPrismLevelItemVisualState(item) {
    if (!item) return;
    const textarea = item.querySelector('textarea[id^="ans-"]');
    if (!textarea) return;
    item.classList.toggle('has-content', !!String(textarea.value || '').trim());
}

function applyPrismLabVisualHierarchyEnhancements() {
    const detail = document.getElementById('prism-detail');
    if (!detail) return;
    detail.classList.add('prism-focus-layout');

    detail.querySelectorAll('.level-item').forEach((item) => {
        const textarea = item.querySelector('textarea[id^="ans-"]');
        if (!textarea) return;
        const level = getPrismLevelFromTextareaId(textarea.id);
        if (level) item.dataset.level = level;
        syncPrismLevelItemVisualState(item);

        if (textarea.dataset.boundPrismVisualState !== 'true') {
            textarea.dataset.boundPrismVisualState = 'true';
            textarea.addEventListener('input', () => syncPrismLevelItemVisualState(item));
            textarea.addEventListener('focus', () => item.classList.add('is-focused'));
            textarea.addEventListener('blur', () => item.classList.remove('is-focused'));
        }
    });
}

function renderPrismDeepGuide(prism) {
    const guideEl = document.getElementById('prism-deep-guide');
    if (!guideEl || !prism) return;

    const antiPatterns = (prism.anti_patterns || [])
        .slice(0, 4)
        .map((item) => `<li>${escapeHtml(normalizeUiText(item || ''))}</li>`)
        .join('');
    const examples = (prism.examples || [])
        .slice(0, 3)
        .map((item) => `<li>${escapeHtml(normalizeUiText(item || ''))}</li>`)
        .join('');
    const anchorTemplates = (prism.anchor_question_templates || [])
        .slice(0, 2)
        .map((item) => `<li>${escapeHtml(normalizeUiText(item || ''))}</li>`)
        .join('');
    const nameHe = escapeHtml(normalizeUiText(prism.name_he || 'פריזמה'));
    const nameEn = escapeHtml(normalizeUiText(prism.name_en || 'Prism'));
    const philosophy = escapeHtml(normalizeUiText(prism.philosophy_core || ''));
    const intent = escapeHtml(normalizeUiText(prism.therapist_intent || 'המטרה: להפוך ניסוח כללי למפת עומק שאפשר לעבוד איתה.'));

    guideEl.innerHTML = `
        <details class="prism-guide-collapsible">
            <summary>
                <span>הסבר מוד + דוגמה</span>
                <small>Mode Guide + Example</small>
            </summary>
            <div class="prism-guide-collapsible-body">
                <div class="prism-guide-grid prism-guide-grid-mode-split">
                    <div class="prism-guide-card">
                        <h5>${nameHe} / ${nameEn}</h5>
                        <p><strong>מה הכלי בודק?</strong> ${philosophy}</p>
                        <p><strong>למה זה חשוב?</strong> ${intent}</p>
                    </div>
                    <div class="prism-guide-card">
                        <h5>Prism Lab vs Prism Research</h5>
                        <p><strong>Prism Lab (מגדל רמות):</strong> מילה/ביטוי מרכזי אחד ("עוגן") + חתך עומק דרך רמות לוגיות (${LOGICAL_LEVELS_SEQUENCE_FRIENDLY_SHORT}).</p>
                        <p><strong>Prism Research (חקירה בשרשרת):</strong> שואלים שוב על כל תשובה חדשה ("רקורסיבי" = אותה שאלה חוזרת על תוצאה חדשה).</p>
                        <p><strong>בקיצור:</strong> Lab = עומק על מוקד אחד, Research = התקדמות בשרשרת.</p>
                    </div>
                </div>

                <div class="prism-guide-grid">
                    <div class="prism-guide-card">
                        <h5>איך עובדים / 4 Steps</h5>
                        <ol>
                            <li>בחר/י מילה/ביטוי מרכזי אחד מהמשפט (זה ה"עוגן").</li>
                            <li>מלא/י 3-6 רמות לוגיות (למשל: סביבה, התנהגות, יכולות, ערכים/אמונות, זהות, שייכות).</li>
                            <li>בדוק/י קפיצות או שכבות חסרות.</li>
                            <li>בחר/י צעד הבא קטן להמשך.</li>
                        </ol>
                    </div>
                    <div class="prism-guide-card prism-guide-card-legend">
                        <h5>רמות לוגיות / Logical Levels</h5>
                        <div class="prism-mini-stack">${buildPrismStackLegendRowsHtml()}</div>
                    </div>
                </div>

                <details class="prism-guide-collapsible prism-guide-collapsible-sub">
                    <summary>
                        <span>עוד תיאוריה / Advanced</span>
                        <small>לפתוח רק כשצריך</small>
                    </summary>
                    <div class="prism-guide-collapsible-body">
                        <div class="prism-guide-grid">
                            <div class="prism-guide-card">
                                <h5>שאלות עוגן מומלצות</h5>
                                <ul>${anchorTemplates || '<li>אין דוגמאות זמינות כרגע.</li>'}</ul>
                                <h5>דוגמאות</h5>
                                <ul>${examples || '<li>אין דוגמאות זמינות כרגע.</li>'}</ul>
                            </div>
                            <div class="prism-guide-card">
                                <h5>טעויות נפוצות</h5>
                                <ul>${antiPatterns || '<li>לא לקפוץ לפרשנות לפני שיש עיגון של סביבה/התנהגות.</li>'}</ul>
                                <p><strong>טיפ:</strong> אם יש ספק ברמה, קצר/י את המשפט לשורה קונקרטית אחת.</p>
                            </div>
                        </div>
                    </div>
                </details>
            </div>
        </details>
    `;
}

function renderPrismLibrary() {
    const lib = document.getElementById('prism-library');
    if (!lib || !metaModelData.prisms) return;
    lib.innerHTML = '';
    metaModelData.prisms.forEach((p) => {
        const div = document.createElement('div');
        div.className = 'prism-card';
        const nameHe = normalizeUiText(p.name_he || '');
        const nameEn = normalizeUiText(p.name_en || '');
        const core = normalizeUiText(p.philosophy_core || '');
        const anchor = normalizeUiText(String(p.anchor_question_templates?.[0] || ''));
        div.innerHTML = `
            <h4>${escapeHtml(nameHe || nameEn || 'Prism')}</h4>
            <p class="prism-card-subtitle">${escapeHtml(nameEn || '')}</p>
            <p>${escapeHtml(core)}</p>
            <p><strong>שאלת מיקוד (על העוגן):</strong> ${escapeHtml(anchor)}</p>
            <div style="margin-top:10px"><button class="btn prism-open-btn" data-id="${escapeHtml(String(p.id || ''))}">פתח/י פריזמה</button></div>
        `;
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
    if (!prism) return alert('הפריזמה לא נמצאה');
    document.getElementById('prism-library')?.classList.add('hidden');
    const detail = document.getElementById('prism-detail');
    if (!detail) return;
    detail.classList.remove('hidden');

    const prismName = document.getElementById('prism-name');
    const prismDesc = document.getElementById('prism-desc');
    const prismAnchor = document.getElementById('prism-anchor');
    if (prismName) prismName.textContent = `${normalizeUiText(prism.name_he || '')} · ${normalizeUiText(prism.name_en || '')}`.trim();
    if (prismDesc) prismDesc.textContent = normalizeUiText(prism.philosophy_core || '');
    if (prismAnchor) prismAnchor.textContent = normalizeUiText(String(prism.anchor_question_templates?.[0] || ''));

    renderPrismDeepGuide(prism);
    applyPrismLabCompactRuntimeCopy();
    ensurePrismLabWorkLayout();
    applyPrismLabVisualHierarchyEnhancements();
    playUISound('prism_open');

    const resultBox = document.getElementById('prism-result');
    if (resultBox) {
        resultBox.classList.add('hidden');
        resultBox.innerHTML = '';
    }

    detail.setAttribute('data-prism-id', id);
    const pivotToggle = document.getElementById('prepared-pivot-toggle');
    if (pivotToggle) pivotToggle.checked = false;

    const draft = loadPrismVerticalStackDraft(id);
    applyVerticalStackStateToUI(prism, draft || {
        categoryId: prism.id,
        categoryLabelHe: normalizeUiText(prism.name_he || ''),
        coreQuestion: getPrismCoreQuestion(prism),
        anchorText: deriveDefaultPrismAnchor(prism),
        answers: {},
        emotion: 3,
        resistance: 2
    });

    attachMappingDropHandlers();
    refreshPrismVerticalStackForCurrentPrism({ forceDefaultAnchor: true });
    applyPrismLabCompactRuntimeCopy();
    ensurePrismLabWorkLayout();
    applyPrismLabVisualHierarchyEnhancements();
}

// Populate prepared items for drag-and-drop into the mapping inputs
function populatePreparedItems(prism) {
    if (!prism) return;
    const anchorText = getCurrentPrismAnchorText(prism);
    const answers = buildVerticalStackSuggestedAnswers(prism, anchorText);
    const pivots = buildVerticalStackPivotSuggestions(prism, anchorText);

    renderPreparedAnswersList(answers);
    renderPivotSuggestionsList(pivots);

    if (prismVerticalStackState && prismVerticalStackState.categoryId === prism.id) {
        prismVerticalStackState.suggestions = answers;
        prismVerticalStackState.prompts = buildVerticalStackPrompts(prism, anchorText);
        prismVerticalStackState.anchorText = anchorText;
    }
}

function attachMappingDropHandlers() {
    const inputs = document.querySelectorAll('.mapping-input:not(.prism-anchor-input)');
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
            document.querySelectorAll('.mapping-input:not(.prism-anchor-input)').forEach(i => i.classList.remove('focused'));
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
                syncPrismLevelItemVisualState(inp.closest('.level-item'));
                return;
            }

            const expectedLevel = getExpectedLevelFromInput(inp);
            if (inp.dataset.suggestedLevel && inp.dataset.suggestedLevel !== expectedLevel) {
                setMappingInputStatus(inp, 'mismatch', `׳”׳×׳•׳›׳ ׳ ׳¨׳׳” ׳›׳׳• ${getLevelDisplay(inp.dataset.suggestedLevel)} ׳•׳׳ ${getLevelDisplay(expectedLevel)}.`);
            } else {
                clearMappingInputStatus(inp);
            }
            syncPrismLevelItemVisualState(inp.closest('.level-item'));
            savePrismVerticalStackDraftForCurrentPrism();
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
    syncPrismLevelItemVisualState(inputEl.closest('.level-item'));
    savePrismVerticalStackDraftForCurrentPrism();
}

function copyPreparedToFocusedOrEmpty(text, suggestedLevel = '') {
    const focused = document.querySelector('.mapping-input:not(.prism-anchor-input).focused');
    if (focused) { applyPreparedTextToInput(focused, text, suggestedLevel); focused.focus(); return; }
    const taggedLevel = (suggestedLevel || '').toUpperCase();
    if (taggedLevel && LOGICAL_LEVEL_INFO[taggedLevel]) {
        const exactTarget = document.getElementById(`ans-${taggedLevel}`);
        if (exactTarget && !String(exactTarget.value || '').trim()) {
            applyPreparedTextToInput(exactTarget, text, taggedLevel);
            exactTarget.focus();
            return;
        }
    }
    const empty = Array.from(document.querySelectorAll('.mapping-input:not(.prism-anchor-input)')).find(i => !i.value);
    if (empty) { applyPreparedTextToInput(empty, text, suggestedLevel); empty.focus(); return; }
    const first = document.querySelector('.mapping-input:not(.prism-anchor-input)');
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
    const resolvedTab = normalizeRequestedTab(tabName);
    persistHomeLastVisitedTab(resolvedTab || tabName);

    if (activateTabByName(resolvedTab || tabName, { playSound: false, scrollToTop: true })) {
        return;
    }

    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));
    
    const btn = document.querySelector(`[data-tab="${resolvedTab || tabName}"]`);
    if (btn) btn.classList.add('active');
    
    const content = document.getElementById(resolvedTab || tabName);
    if (content) content.classList.add('active');
    if ((resolvedTab || tabName) !== 'practice-radar') {
        setRapidPatternFocusMode(false);
        hideRapidPatternExplanation({ resumeIfNeeded: false });
    }
    persistPracticeTabPreference(resolvedTab || tabName);

    const scenarioContext = (resolvedTab || tabName) === 'scenario-trainer' ? scenarioTrainer.activeScenario : null;
    closeComicPreviewModal();
    renderGlobalComicStrip(resolvedTab || tabName, scenarioContext);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== PROGRESS TRACKING & GAMIFICATION ====================

const HOME_LAST_TAB_KEY = 'meta_home_last_tab_v1';
const HOME_TRAINING_PROGRAM_KEY = 'meta_home_training_program_v1';

const HOME_TRAINING_PROGRAMS = Object.freeze([
    Object.freeze({
        id: 'core_flow',
        title: 'Core Flow',
        badge: 'דיוק → תגובה',
        description: 'תרגול בסיסי שמתחיל בזיהוי, עובר למהירות, ומסתיים בתגובה פרקטית.',
        steps: Object.freeze([
            Object.freeze({ tab: 'practice-question', title: 'תרגול שאלות', note: 'ניסוח שאלה מדויקת למשפט אחד' }),
            Object.freeze({ tab: 'practice-radar', title: 'Meta Radar', note: 'סבב זיהוי מהיר בזמן' }),
            Object.freeze({ tab: 'scenario-trainer', title: 'Scenario Trainer', note: 'להפוך דפוס לצעד ביצועי' })
        ])
    }),
    Object.freeze({
        id: 'deep_probe',
        title: 'Deep Probe',
        badge: 'פירוק עומק',
        description: 'מסלול למי שרוצה עומק: פועל לא־מפורט, שלשות, ואז Blueprint.',
        steps: Object.freeze([
            Object.freeze({ tab: 'practice-verb-unzip', title: 'פועל לא מפורט', note: 'לחשוף מה חסר בפועל עמום' }),
            Object.freeze({ tab: 'practice-triples-radar', title: 'Triples Radar', note: 'לזהות קו/משפחה שלמה' }),
            Object.freeze({ tab: 'blueprint', title: 'Blueprint Builder', note: 'לסגור עם תוכנית פעולה + Plan B' })
        ])
    }),
    Object.freeze({
        id: 'cognitive_design',
        title: 'Cognitive Design',
        badge: 'מפה לוגית',
        description: 'מסלול בניית מסגרות: פריזמה, Wizard, ואז סימולציה/קומיקס.',
        steps: Object.freeze([
            Object.freeze({ tab: 'prismlab', title: 'Prism Lab', note: 'מגדל לוגי + צעד הבא' }),
            Object.freeze({ tab: 'practice-wizard', title: 'גשר תחושה-שפה', note: 'איסוף תהליך מובנה' }),
            Object.freeze({ tab: 'comic-engine', title: 'Comic Engine', note: 'הדמיית תגובות ותוצאה' })
        ])
    })
]);

function getDefaultHomeTrainingProgramState() {
    return {
        activeProgramId: null,
        stepIndex: 0,
        completedRuns: {},
        updatedAt: null
    };
}

function normalizeHomeTrainingProgramState(raw) {
    const defaults = getDefaultHomeTrainingProgramState();
    const merged = { ...defaults, ...(raw || {}) };
    merged.activeProgramId = typeof merged.activeProgramId === 'string' ? merged.activeProgramId : null;
    merged.stepIndex = Math.max(0, Math.floor(Number(merged.stepIndex) || 0));
    merged.completedRuns = (merged.completedRuns && typeof merged.completedRuns === 'object' && !Array.isArray(merged.completedRuns))
        ? merged.completedRuns
        : {};
    merged.updatedAt = typeof merged.updatedAt === 'string' ? merged.updatedAt : null;
    return merged;
}

function loadHomeTrainingProgramState() {
    try {
        const raw = localStorage.getItem(HOME_TRAINING_PROGRAM_KEY);
        if (!raw) return getDefaultHomeTrainingProgramState();
        return normalizeHomeTrainingProgramState(JSON.parse(raw));
    } catch (error) {
        console.warn('Failed to parse home training program state', error);
        return getDefaultHomeTrainingProgramState();
    }
}

function saveHomeTrainingProgramState(state) {
    const normalized = normalizeHomeTrainingProgramState(state);
    normalized.updatedAt = new Date().toISOString();
    localStorage.setItem(HOME_TRAINING_PROGRAM_KEY, JSON.stringify(normalized));
    return normalized;
}

function getHomeProgramById(programId = '') {
    return HOME_TRAINING_PROGRAMS.find(program => program.id === programId) || null;
}

function getProgressBadgeDefinitions() {
    return [
        { id: 'first_step', name: 'צעד ראשון', icon: '🎯', condition: () => userProgress.xp >= 10 },
        { id: 'fire_10', name: 'להט 🔥', icon: '🔥', condition: () => userProgress.streak >= 10 },
        { id: 'xp_100', name: '100 XP', icon: '⭐', condition: () => userProgress.xp >= 100 },
        { id: 'xp_500', name: '500 XP', icon: '🌠', condition: () => userProgress.xp >= 500 },
        { id: 'sessions_10', name: '10 סשנים', icon: '📊', condition: () => userProgress.sessions >= 10 },
        { id: 'daily_goal', name: 'יעד יומי', icon: '🎯', condition: () => userProgress.lastChargeAwardedDate === userProgress.todayDate },
        { id: 'charge_full', name: 'Charge Full', icon: '🛡️', condition: () => userProgress.streakCharges >= MAX_STREAK_CHARGES },
    ];
}

function getNextProgressBadgePreview() {
    const currentBadges = new Set((userProgress.badges || []).map(b => b.id));
    const defs = getProgressBadgeDefinitions();
    for (const badge of defs) {
        if (currentBadges.has(badge.id)) continue;
        if (!badge.condition()) return badge;
    }
    return null;
}

function getXpLevelMeta(xpTotal = 0) {
    const xp = Math.max(0, Math.floor(Number(xpTotal) || 0));
    // Quadratic-ish ramp keeps early levels fast and later levels meaningful.
    const level = Math.max(1, Math.floor(Math.sqrt(xp / 25)) + 1);
    const levelStartXp = Math.max(0, 25 * Math.pow(level - 1, 2));
    const nextLevelXp = 25 * Math.pow(level, 2);
    const inLevelXp = xp - levelStartXp;
    const levelSpanXp = Math.max(1, nextLevelXp - levelStartXp);
    const progressPct = Math.max(0, Math.min(100, Math.round((inLevelXp / levelSpanXp) * 100)));
    return {
        level,
        levelStartXp,
        nextLevelXp,
        remainingXp: Math.max(0, nextLevelXp - xp),
        progressPct
    };
}

function persistHomeLastVisitedTab(tabName = '') {
    const safeTab = normalizeRequestedTab(String(tabName || '').trim());
    if (!safeTab || safeTab === 'home') return;
    try {
        localStorage.setItem(HOME_LAST_TAB_KEY, JSON.stringify({
            tab: safeTab,
            at: new Date().toISOString()
        }));
    } catch (error) {
        console.warn('Failed to persist last visited tab', error);
    }
}

function loadHomeLastVisitedTab() {
    try {
        const raw = localStorage.getItem(HOME_LAST_TAB_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const tab = normalizeRequestedTab(parsed?.tab || '');
        if (!tab || tab === 'home') return null;
        return {
            tab,
            at: typeof parsed?.at === 'string' ? parsed.at : null
        };
    } catch (error) {
        console.warn('Failed to parse last visited tab', error);
        return null;
    }
}

function getTabTitleForHome(tabName = '') {
    const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    const text = String(btn?.textContent || '').trim();
    return text || tabName || 'מסך';
}

function formatRelativeTimeShort(iso = '') {
    if (!iso) return '';
    const stamp = new Date(iso);
    if (!Number.isFinite(stamp.getTime())) return '';
    const diffMs = Date.now() - stamp.getTime();
    const diffMin = Math.max(0, Math.round(diffMs / (1000 * 60)));
    if (diffMin < 1) return 'עכשיו';
    if (diffMin < 60) return `לפני ${diffMin} דק׳`;
    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) return `לפני ${diffHours} שעות`;
    const diffDays = Math.round(diffHours / 24);
    return `לפני ${diffDays} ימים`;
}

function getProgressMomentumCoach() {
    const remainingDaily = Math.max(userProgress.dailyGoal - userProgress.todayActions, 0);
    const hasCharge = userProgress.streakCharges > 0;
    if (remainingDaily === 0 && userProgress.streakCharges >= MAX_STREAK_CHARGES) {
        return {
            tone: 'success',
            title: 'מומנטום מצוין',
            pill: 'Ready',
            copy: 'היעד היומי הושלם וה־Charge מלא. זמן טוב לסשן מבחן קצר או מסלול מתקדם.'
        };
    }
    if (remainingDaily === 0) {
        return {
            tone: 'success',
            title: 'יעד יומי הושלם',
            pill: 'Done',
            copy: hasCharge
                ? `מעולה. היעד הושלם וה־Streak Charge שלך ${userProgress.streakCharges}/${MAX_STREAK_CHARGES}.`
                : 'מעולה. היעד הושלם. עוד סשנים יחזקו XP וכוכבים, אבל היעד של היום כבר סגור.'
        };
    }
    if (userProgress.streak >= 7 && !hasCharge) {
        return {
            tone: 'warn',
            title: 'שימור רצף',
            pill: 'Streak',
            copy: `יש רצף יפה (${userProgress.streak} ימים). השלימו עוד ${remainingDaily} פעולות היום כדי למלא Charge ולשמור על הגמישות.`
        };
    }
    if (userProgress.streak === 0 || !userProgress.lastSessionDate) {
        return {
            tone: 'info',
            title: 'פתיחת מומנטום',
            pill: 'Start',
            copy: `התחילו בסשן קצר (Question Drill / Meta Radar). ${remainingDaily} פעולות ישלימו את היעד היומי.`
        };
    }
    return {
        tone: remainingDaily <= 1 ? 'warn' : 'info',
        title: 'צעד הבא להיום',
        pill: 'Coach',
        copy: `נשארו ${remainingDaily} פעולות כדי לסגור יעד יומי. רצף נוכחי: ${userProgress.streak} ימים.`
    };
}

function formatWeekdayShort(date) {
    try {
        return new Intl.DateTimeFormat('he-IL', { weekday: 'short' }).format(date);
    } catch (error) {
        const labels = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
        return labels[date.getDay()] || '';
    }
}

function formatDayNumberShort(date) {
    return String(date.getDate()).padStart(2, '0');
}

function getRecentProgressWeekData(days = 7) {
    const totalDays = Math.max(1, Math.min(14, Math.floor(Number(days) || 7)));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const items = [];
    for (let offset = totalDays - 1; offset >= 0; offset--) {
        const date = new Date(today);
        date.setDate(today.getDate() - offset);
        const dateKey = toLocalDateKey(date);
        const entry = (userProgress.activityHistory && userProgress.activityHistory[dateKey]) || {};
        const actions = Math.max(0, Math.floor(Number(entry.actions) || 0));
        const sessions = Math.max(0, Math.floor(Number(entry.sessions) || 0));
        const goalTarget = clampNumber(entry.goalTarget, 1, 10, userProgress.dailyGoal || DEFAULT_DAILY_GOAL);
        const metGoal = actions >= goalTarget;
        const usedCharge = entry.usedCharge === true;
        const awardedCharge = entry.chargeAwarded === true;
        const isToday = dateKey === userProgress.todayDate;

        let state = 'empty';
        if (usedCharge) state = 'charge';
        if (actions > 0 || sessions > 0) state = 'active';
        if (metGoal) state = 'goal';

        items.push({
            dateKey,
            date,
            actions,
            sessions,
            goalTarget,
            metGoal,
            usedCharge,
            awardedCharge,
            isToday,
            state,
            weekday: formatWeekdayShort(date),
            dayNum: formatDayNumberShort(date)
        });
    }
    return items;
}

function renderProgressWeekStrip() {
    const stripEl = document.getElementById('progress-week-strip');
    const captionEl = document.getElementById('progress-week-caption');
    if (!stripEl) return;

    const week = getRecentProgressWeekData(7);
    stripEl.innerHTML = week.map(item => {
        const classes = ['progress-week-day'];
        if (item.state === 'goal') classes.push('is-goal');
        else if (item.state === 'charge') classes.push('is-charge-used');
        else if (item.state === 'active') classes.push('is-active');
        else classes.push('is-empty');
        if (item.isToday) classes.push('is-today');

        let marker = '•';
        if (item.metGoal) marker = '✓';
        else if (item.usedCharge) marker = '🛡';
        else if (item.actions > 0) marker = String(Math.min(item.actions, 9));

        const titleBits = [
            item.dateKey,
            `פעולות: ${item.actions}`,
            `סשנים: ${item.sessions}`,
            `יעד: ${item.goalTarget}`
        ];
        if (item.metGoal) titleBits.push('יעד יומי הושלם');
        if (item.awardedCharge) titleBits.push('Charge הוענק');
        if (item.usedCharge) titleBits.push('Charge שימש לשמירת רצף');

        return `
            <div class="${classes.join(' ')}" title="${escapeHtml(titleBits.join(' | '))}">
                <small>${escapeHtml(item.weekday)}</small>
                <span class="progress-week-dot" aria-hidden="true"></span>
                <span>${escapeHtml(marker)}</span>
            </div>
        `;
    }).join('');

    if (captionEl) {
        const goalsDone = week.filter(item => item.metGoal).length;
        const activeDays = week.filter(item => item.actions > 0 || item.sessions > 0).length;
        captionEl.textContent = `7 ימים אחרונים · ${activeDays} ימי פעילות · ${goalsDone} ימי יעד מלא`;
    }
}

function setDailyGoalTarget(nextGoal, { announce = true } = {}) {
    const clamped = clampNumber(nextGoal, 1, 10, DEFAULT_DAILY_GOAL);
    if (clamped === userProgress.dailyGoal) return;
    userProgress.dailyGoal = clamped;
    syncDailyProgressWindow();
    const todayEntry = ensureActivityHistoryEntry(userProgress.todayDate || toLocalDateKey());
    if (todayEntry) todayEntry.goalTarget = clamped;
    tryAwardStreakCharge();
    saveUserProgress();
    updateProgressHub();
    if (announce) {
        showHint(`🎯 יעד יומי עודכן ל-${clamped} פעולות.`);
        playUISound('select_soft');
    }
}

function adjustDailyGoalTarget(delta = 0) {
    const step = Math.floor(Number(delta) || 0);
    if (!step) return;
    setDailyGoalTarget((userProgress.dailyGoal || DEFAULT_DAILY_GOAL) + step);
}

function renderHomeTrainingProgramCards() {
    const root = document.getElementById('home-program-cards');
    if (!root) return;

    const state = loadHomeTrainingProgramState();
    if (!HOME_TRAINING_PROGRAMS.length) {
        root.innerHTML = '<div class="home-program-empty">אין מסלולים זמינים כרגע.</div>';
        return;
    }

    root.innerHTML = HOME_TRAINING_PROGRAMS.map(program => {
        const isActive = state.activeProgramId === program.id;
        const stepCount = program.steps.length || 0;
        const safeIndex = isActive ? Math.min(state.stepIndex, Math.max(stepCount - 1, 0)) : 0;
        const completedRuns = Math.max(0, Math.floor(Number(state.completedRuns?.[program.id]) || 0));
        const completedSteps = isActive ? Math.min(state.stepIndex, stepCount) : 0;
        const allDoneInCurrentRun = isActive && state.stepIndex >= stepCount && stepCount > 0;
        const currentStep = program.steps[safeIndex] || program.steps[0];
        const launchLabel = isActive
            ? (allDoneInCurrentRun ? 'התחל סבב חדש' : `פתח שלב ${Math.min(safeIndex + 1, stepCount)}`)
            : 'התחל מסלול';

        const stepsHtml = program.steps.map((step, index) => {
            const isDone = isActive && index < completedSteps;
            const isCurrent = isActive && !allDoneInCurrentRun && index === safeIndex;
            const classes = ['home-program-step'];
            if (isDone) classes.push('is-done');
            if (isCurrent) classes.push('is-current');
            return `
                <li class="${classes.join(' ')}">
                    <span class="home-program-step-index">${isDone ? '✓' : index + 1}</span>
                    <span class="home-program-step-copy">
                        <strong>${escapeHtml(step.title)}</strong>
                        <small>${escapeHtml(step.note)} · ${escapeHtml(getTabTitleForHome(step.tab))}</small>
                    </span>
                </li>
            `;
        }).join('');

        const cardClasses = ['home-program-card'];
        if (isActive) cardClasses.push('is-active');
        if (allDoneInCurrentRun) cardClasses.push('is-complete');

        return `
            <article class="${cardClasses.join(' ')}" data-home-program-card="${program.id}">
                <div class="home-program-head">
                    <div>
                        <h5 class="home-program-title">${escapeHtml(program.title)}</h5>
                        <p>${escapeHtml(program.description)}</p>
                    </div>
                    <span class="home-program-tag">${escapeHtml(program.badge)}</span>
                </div>
                <ol class="home-program-steps">${stepsHtml}</ol>
                <div class="home-program-footer">
                    <div class="home-program-meta">
                        <span>שלב ${isActive ? Math.min(safeIndex + 1, stepCount) : 1}/${stepCount}</span>
                        <span>הושלמו: ${completedRuns}</span>
                    </div>
                    <div class="home-program-actions">
                        <button type="button" class="btn btn-primary" data-home-program-action="launch" data-program-id="${program.id}">${escapeHtml(launchLabel)}</button>
                        <button type="button" class="btn btn-secondary" data-home-program-action="done" data-program-id="${program.id}" ${stepCount ? '' : 'disabled'}>סיימתי שלב</button>
                        <button type="button" class="btn btn-secondary" data-home-program-action="reset" data-program-id="${program.id}">איפוס</button>
                    </div>
                    ${currentStep ? `<p class="progress-overview-subnote">השלב הנוכחי: ${escapeHtml(currentStep.title)}</p>` : ''}
                </div>
            </article>
        `;
    }).join('');
}

function advanceHomeProgramStep(programId) {
    const program = getHomeProgramById(programId);
    if (!program) return;
    const state = loadHomeTrainingProgramState();
    if (state.activeProgramId !== program.id) {
        state.activeProgramId = program.id;
        state.stepIndex = 0;
    }

    state.stepIndex += 1;
    if (state.stepIndex >= program.steps.length) {
        state.completedRuns[program.id] = Math.max(0, Math.floor(Number(state.completedRuns[program.id]) || 0)) + 1;
        state.stepIndex = 0;
        state.activeProgramId = program.id;
        showHint(`✅ המסלול "${program.title}" הושלם. אפשר להתחיל סבב חדש או לעבור למסלול אחר.`);
        playUISound('finish');
    } else {
        const nextStep = program.steps[state.stepIndex];
        showHint(`נשמר. השלב הבא במסלול "${program.title}": ${nextStep?.title || 'שלב הבא'}.`);
        playUISound('next');
    }

    saveHomeTrainingProgramState(state);
    updateProgressHub();
}

function launchHomeProgramStep(programId) {
    const program = getHomeProgramById(programId);
    if (!program) return;
    let state = loadHomeTrainingProgramState();
    if (state.activeProgramId !== program.id) {
        state.activeProgramId = program.id;
        state.stepIndex = 0;
    }
    if (state.stepIndex >= program.steps.length) {
        state.stepIndex = 0;
    }
    state = saveHomeTrainingProgramState(state);
    const step = program.steps[Math.min(state.stepIndex, program.steps.length - 1)] || program.steps[0];
    renderHomeTrainingProgramCards();
    if (step?.tab) {
        showHint(`פותח/ת מסלול "${program.title}" · שלב ${Math.min(state.stepIndex + 1, program.steps.length)}: ${step.title}`);
        playUISound('start');
        navigateTo(step.tab);
    }
}

function resetHomeProgram(programId) {
    const program = getHomeProgramById(programId);
    if (!program) return;
    const state = loadHomeTrainingProgramState();
    if (state.activeProgramId === program.id) {
        state.stepIndex = 0;
    }
    state.completedRuns[program.id] = 0;
    saveHomeTrainingProgramState(state);
    renderHomeTrainingProgramCards();
    showHint(`אופס מסלול: ${program.title}`);
    playUISound('skip');
}

function resetAllHomePrograms() {
    saveHomeTrainingProgramState(getDefaultHomeTrainingProgramState());
    renderHomeTrainingProgramCards();
    showHint('כל המסלולים אופסו.');
    playUISound('skip');
}

function handleHomeProgramActionClick(event) {
    const button = event.target.closest('[data-home-program-action]');
    if (!button) return;
    const action = button.getAttribute('data-home-program-action');
    const programId = button.getAttribute('data-program-id') || '';
    if (!programId) return;

    if (action === 'launch') {
        launchHomeProgramStep(programId);
        return;
    }
    if (action === 'done') {
        advanceHomeProgramStep(programId);
        return;
    }
    if (action === 'reset') {
        resetHomeProgram(programId);
    }
}

function setupProgressHubEnhancements() {
    const programsRoot = document.getElementById('home-program-cards');
    if (programsRoot && programsRoot.dataset.boundHomePrograms !== 'true') {
        programsRoot.dataset.boundHomePrograms = 'true';
        programsRoot.addEventListener('click', handleHomeProgramActionClick);
    }

    const resetAllBtn = document.getElementById('home-programs-reset-all');
    if (resetAllBtn && resetAllBtn.dataset.boundHomeProgramsReset !== 'true') {
        resetAllBtn.dataset.boundHomeProgramsReset = 'true';
        resetAllBtn.addEventListener('click', resetAllHomePrograms);
    }

    const resumeBtn = document.getElementById('progress-resume-btn');
    if (resumeBtn && resumeBtn.dataset.boundResumeLast !== 'true') {
        resumeBtn.dataset.boundResumeLast = 'true';
        resumeBtn.addEventListener('click', () => {
            const last = loadHomeLastVisitedTab();
            if (!last?.tab) return;
            playUISound('start');
            navigateTo(last.tab);
        });
    }

    const openMenuBtn = document.getElementById('progress-open-home-menu-btn');
    if (openMenuBtn && openMenuBtn.dataset.boundOpenFeatureMap !== 'true') {
        openMenuBtn.dataset.boundOpenFeatureMap = 'true';
        openMenuBtn.addEventListener('click', () => {
            playUISound('tap_soft');
            openFeatureMapMenu();
        });
    }

    const goalMinusBtn = document.getElementById('daily-goal-decrease-btn');
    if (goalMinusBtn && goalMinusBtn.dataset.boundDailyGoalAdjust !== 'true') {
        goalMinusBtn.dataset.boundDailyGoalAdjust = 'true';
        goalMinusBtn.addEventListener('click', () => adjustDailyGoalTarget(-1));
    }

    const goalPlusBtn = document.getElementById('daily-goal-increase-btn');
    if (goalPlusBtn && goalPlusBtn.dataset.boundDailyGoalAdjust !== 'true') {
        goalPlusBtn.dataset.boundDailyGoalAdjust = 'true';
        goalPlusBtn.addEventListener('click', () => adjustDailyGoalTarget(1));
    }

    renderHomeTrainingProgramCards();
}

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
    const todayKey = toLocalDateKey();
    const entry = ensureActivityHistoryEntry(todayKey);
    if (entry) {
        entry.sessions += 1;
    }
    checkAndAwardBadges();
    saveUserProgress();
    updateProgressHub();
}

function initializeProgressHub() {
    setupProgressHubEnhancements();
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

function isDateKey(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function pruneActivityHistoryMap(historyMap, maxDays = 45) {
    const entries = Object.entries(historyMap || {})
        .filter(([dateKey]) => isDateKey(dateKey))
        .sort((a, b) => a[0].localeCompare(b[0]));
    const kept = entries.slice(-Math.max(1, maxDays));
    return kept.reduce((acc, [dateKey, value]) => {
        const item = value && typeof value === 'object' ? value : {};
        acc[dateKey] = {
            actions: Math.max(0, Math.floor(Number(item.actions) || 0)),
            sessions: Math.max(0, Math.floor(Number(item.sessions) || 0)),
            xp: Math.max(0, Math.floor(Number(item.xp) || 0)),
            stars: Math.max(0, Math.floor(Number(item.stars) || 0)),
            goalTarget: clampNumber(item.goalTarget, 1, 10, DEFAULT_DAILY_GOAL),
            usedCharge: item.usedCharge === true,
            chargeAwarded: item.chargeAwarded === true
        };
        return acc;
    }, {});
}

function ensureActivityHistoryEntry(dateKey = toLocalDateKey()) {
    if (!userProgress.activityHistory || typeof userProgress.activityHistory !== 'object') {
        userProgress.activityHistory = {};
    }
    if (!isDateKey(dateKey)) return null;
    if (!userProgress.activityHistory[dateKey] || typeof userProgress.activityHistory[dateKey] !== 'object') {
        userProgress.activityHistory[dateKey] = {
            actions: 0,
            sessions: 0,
            xp: 0,
            stars: 0,
            goalTarget: clampNumber(userProgress.dailyGoal, 1, 10, DEFAULT_DAILY_GOAL),
            usedCharge: false,
            chargeAwarded: false
        };
    }
    if (!Number.isFinite(Number(userProgress.activityHistory[dateKey].goalTarget))) {
        userProgress.activityHistory[dateKey].goalTarget = clampNumber(userProgress.dailyGoal, 1, 10, DEFAULT_DAILY_GOAL);
    }
    return userProgress.activityHistory[dateKey];
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
    merged.activityHistory = pruneActivityHistoryMap(merged.activityHistory || {}, 45);
    return merged;
}

function syncDailyProgressWindow() {
    const today = toLocalDateKey();
    if (userProgress.todayDate !== today) {
        userProgress.todayDate = today;
        userProgress.todayActions = 0;
    }
    ensureActivityHistoryEntry(today);
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
    const entry = ensureActivityHistoryEntry(userProgress.todayDate);
    if (entry) entry.chargeAwarded = true;
    showHint(`נ›¡ן¸ ׳§׳™׳‘׳׳× Streak Charge (${userProgress.streakCharges}/${MAX_STREAK_CHARGES})`);
}

function registerDailyAction(amount = 1) {
    syncDailyProgressWindow();
    const delta = Math.max(0, Math.floor(Number(amount) || 0));
    if (!delta) return;
    userProgress.todayActions += delta;
    const entry = ensureActivityHistoryEntry(userProgress.todayDate);
    if (entry) entry.actions += delta;
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
    const entry = ensureActivityHistoryEntry(userProgress.todayDate || toLocalDateKey());
    if (entry) entry.xp += delta;
    updateStreak();
    checkAndAwardBadges();
    saveUserProgress();
    updateProgressHub();
}

function addStars(amount) {
    const delta = Math.floor(Number(amount) || 0);
    if (delta <= 0) return;
    userProgress.stars += delta;
    const entry = ensureActivityHistoryEntry(userProgress.todayDate || toLocalDateKey());
    if (entry) entry.stars += delta;
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
            const entry = ensureActivityHistoryEntry(today);
            if (entry) entry.usedCharge = true;
            showHint(`נ›¡ן¸ ׳”׳©׳×׳׳©׳× ׳‘-Streak Charge. ׳ ׳©׳׳¨׳• ${userProgress.streakCharges}/${MAX_STREAK_CHARGES}`);
        } else {
            userProgress.streak = 1;
        }
    }

    userProgress.lastSessionDate = today;
}

function checkAndAwardBadges() {
    const badgesList = getProgressBadgeDefinitions();

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
    const dailyGoalTargetPillEl = document.getElementById('daily-goal-target-pill');
    const dailyGoalDecreaseBtn = document.getElementById('daily-goal-decrease-btn');
    const dailyGoalIncreaseBtn = document.getElementById('daily-goal-increase-btn');
    const dailyGoalFillEl = document.getElementById('daily-goal-fill');
    const dailyGoalNoteEl = document.getElementById('daily-goal-note');
    const streakChargeValueEl = document.getElementById('streak-charge-value');
    const streakChargeNoteEl = document.getElementById('streak-charge-note');
    const badgesDisplay = document.getElementById('badges-display');
    const levelTitleEl = document.getElementById('progress-level-title');
    const levelBadgeEl = document.getElementById('progress-level-badge');
    const levelFillEl = document.getElementById('progress-level-fill');
    const levelNoteEl = document.getElementById('progress-level-note');
    const momentumCardEl = document.getElementById('progress-momentum-card');
    const momentumTitleEl = document.getElementById('progress-momentum-title');
    const momentumPillEl = document.getElementById('progress-momentum-pill');
    const momentumCopyEl = document.getElementById('progress-momentum-copy');
    const weekStripEl = document.getElementById('progress-week-strip');
    const nextBadgeEl = document.getElementById('progress-next-badge');
    const resumeTitleEl = document.getElementById('progress-resume-title');
    const resumeCopyEl = document.getElementById('progress-resume-copy');
    const resumeBtn = document.getElementById('progress-resume-btn');

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
    if (dailyGoalTargetPillEl) dailyGoalTargetPillEl.textContent = `יעד: ${userProgress.dailyGoal}`;
    if (dailyGoalDecreaseBtn) dailyGoalDecreaseBtn.disabled = userProgress.dailyGoal <= 1;
    if (dailyGoalIncreaseBtn) dailyGoalIncreaseBtn.disabled = userProgress.dailyGoal >= 10;
    if (dailyGoalFillEl) dailyGoalFillEl.style.width = `${goalPercent}%`;
    if (dailyGoalNoteEl) dailyGoalNoteEl.textContent = completed ? '׳”׳™׳¢׳“ ׳”׳™׳•׳׳™ ׳”׳•׳©׳׳' : `׳¢׳•׳“ ${remaining} ׳₪׳¢׳•׳׳•׳× ׳׳”׳©׳׳׳”`;
    if (dailyGoalCard) dailyGoalCard.classList.toggle('is-goal-complete', completed);

    if (streakChargeValueEl) streakChargeValueEl.textContent = `${userProgress.streakCharges}/${MAX_STREAK_CHARGES}`;
    if (streakChargeNoteEl) {
        streakChargeNoteEl.textContent = userProgress.streakCharges > 0
            ? '׳©׳•׳׳¨ ׳¢׳ ׳”׳¨׳¦׳£ ׳‘׳™׳•׳ ׳₪׳¡׳₪׳•׳¡ ׳׳—׳“'
            : '׳¡׳™׳™׳ ׳™׳¢׳“ ׳™׳•׳׳™ ׳›׳“׳™ ׳׳׳׳ Charge';
    }

    const levelMeta = getXpLevelMeta(userProgress.xp);
    if (levelTitleEl) levelTitleEl.textContent = `Level ${levelMeta.level} · התקדמות`;
    if (levelBadgeEl) levelBadgeEl.textContent = `${userProgress.xp} XP`;
    if (levelFillEl) levelFillEl.style.width = `${levelMeta.progressPct}%`;
    if (levelNoteEl) {
        levelNoteEl.textContent = levelMeta.remainingXp > 0
            ? `עוד ${levelMeta.remainingXp} XP לרמה ${levelMeta.level + 1}`
            : 'רמה הבאה פתוחה';
    }

    const momentum = getProgressMomentumCoach();
    if (momentumCardEl) momentumCardEl.dataset.tone = momentum.tone || 'info';
    if (momentumTitleEl) momentumTitleEl.textContent = momentum.title || 'מומנטום יומי';
    if (momentumPillEl) momentumPillEl.textContent = momentum.pill || 'Coach';
    if (momentumCopyEl) momentumCopyEl.textContent = momentum.copy || '';
    if (weekStripEl) renderProgressWeekStrip();

    const nextBadge = getNextProgressBadgePreview();
    if (nextBadgeEl) {
        nextBadgeEl.textContent = nextBadge
            ? `התג הבא: ${nextBadge.icon} ${nextBadge.name}`
            : 'כל התגים הפעילים הושגו. אפשר להעלות יעדי קושי.';
    }

    const lastVisited = loadHomeLastVisitedTab();
    if (resumeTitleEl) {
        resumeTitleEl.textContent = lastVisited?.tab
            ? `המשך: ${getTabTitleForHome(lastVisited.tab)}`
            : 'המשך אחרון';
    }
    if (resumeCopyEl) {
        resumeCopyEl.textContent = lastVisited?.tab
            ? `${getTabTitleForHome(lastVisited.tab)} · ${formatRelativeTimeShort(lastVisited.at)}`
            : 'אין מסך אחרון שמור עדיין. בחר/י כלי מהתפריט או מהמסלולים למטה.';
    }
    if (resumeBtn) {
        resumeBtn.disabled = !lastVisited?.tab;
        resumeBtn.textContent = lastVisited?.tab ? `פתח ${getTabTitleForHome(lastVisited.tab)}` : 'פתח המשך';
    }

    if (badgesDisplay) {
        badgesDisplay.innerHTML = userProgress.badges.map(b => `
            <div class="badge" title="${b.name}">
                <span class="badge-icon">${b.icon}</span>
                <span>${b.name}</span>
            </div>
        `).join('');
    }

    renderHomeTrainingProgramCards();
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
        payload = deepNormalizeUiPayload(await response.json());
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
    const q = activeQuantifier ? `[${activeQuantifier}]` : '[בחר/י כמת]';
    const qHtml = `<span class="wr2-q-inline">${escapeHtml(q)}</span>`;
    if (parts.length < 2) return `${escapeHtml(template || '')} ${qHtml}`.trim();
    return `${escapeHtml(parts[0])}${qHtml}${escapeHtml(parts.slice(1).join('{Q}'))}`;
}

function wr2TriggerFx(layer, strong = false) {
    if (!layer) return;
    layer.innerHTML = '';
    const glyphs = strong ? ['✨', '🎉', '💥', '🌟'] : ['✨', '🔍', '🧩'];
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
    Object.freeze({ id: 'S', label: '❤️ תחושה שעולה (S)', criterion: 'signal' }),
    Object.freeze({ id: 'Q', label: '🫧 כמת נסתר (Q)', criterion: 'quantifier' }),
    Object.freeze({ id: 'H', label: '🌉 משפט מגשר לבדיקה (H)', criterion: 'hypothesis' }),
    Object.freeze({ id: 'C', label: '✅ אישור/בדיקת הלימה (C)', criterion: 'confirm' }),
    Object.freeze({ id: 'P', label: '🧭 בחירת כיוון עבודה', criterion: 'path' }),
    Object.freeze({ id: 'E', label: '✨ חריג + למידה חדשה', criterion: 'exception' })
]);

const WR2W_BREAKOUT_STEPS = Object.freeze([
    Object.freeze({ id: 0, label: 'בדיקה ישירה', prompt: 'האם יש מקרה שבו זה לא נכון לגמרי?' }),
    Object.freeze({ id: 1, label: 'מדרגה 1', prompt: 'היה פעם שזה היה אפילו 5% פחות נכון?' }),
    Object.freeze({ id: 2, label: 'מדרגה 2', prompt: 'ואם לא 5% — אז אולי 1% פחות נכון?' }),
    Object.freeze({ id: 3, label: 'מדרגה 3', prompt: 'באילו תנאים זה הכי חזק? (מתי/איפה/עם מי)' })
]);

const WR2W_FEELINGS = Object.freeze([
    'לחץ',
    'בושה',
    'פחד',
    'כעס',
    'עצב',
    'בלבול'
]);

const WR2W_CRITERIA_LABELS = Object.freeze({
    signal: 'תחושה (S) · זיהוי תחושה',
    quantifier: 'כמת נסתר (Q)',
    hypothesis: 'משפט מגשר (H) · ניסוח + בדיקה',
    confirm: 'אישור/הלימה (C) · לפני מעבר',
    path: 'בחירת כיוון עבודה',
    exception: 'למידה/חריג (E/L) · משפט למידה'
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
            const hasCondition = /(בעיקר כש|לפעמים|בתנאים|כאשר|כש)/.test(normalized);
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
        sanitizeHebrewText: (value) => {
            if (typeof normalizeUiText === 'function') return normalizeUiText(String(value || ''));
            return String(value || '');
        },
        sanitizeHebrewJsonStrings: (value) => {
            if (typeof deepNormalizeUiPayload === 'function') return deepNormalizeUiPayload(value);
            return value;
        },
        hasObviousHebrewTypos: (value) => {
            if (typeof looksLikeMojibakeText === 'function') {
                const text = String(value || '');
                const bad = looksLikeMojibakeText(text);
                return { ok: !bad, issues: bad ? ['possible-mojibake'] : [] };
            }
            return { ok: true, issues: [] };
        }
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
    } else if (/(מרגיש|בפנים|חרדה|לחץ|בושה|כאב|דופק)/.test(normalizedText)) {
        quantifierNature = 'internal_climate';
    } else if (/(בעבודה|בבית|בפגישה|בשיחה|מול|ביחסים|כסף|פרויקט)/.test(normalizedText)) {
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
    const fallbackCondition = 'זה נהיה הכי חזק בעיקר בעומס, עייפות או חוסר ודאות.';
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
        ) || 'כן, יש רגע שבו זה 5% פחות נכון.',
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

function wr2wBuildHypothesisSkeleton(scene, quantifier) {
    const q = quantifier || '___';
    const sentence = wr2wSanitizeText(scene?.visibleSentence || '');
    return `כשאת/ה אומר/ת "${sentence}", עולה לי כאילו יש כאן "${q}" לגבי ___. זה קרוב למה שאת/ה מתכוון/ת, או שאני משלים/ה?`;
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
        const match = text.match(/(?:בעיקר\s+כש|כש|כאשר)\s*([^.,;!?]+)/);
        if (match && match[1]) {
            const cleaned = match[1].replace(/["']/g, '').trim();
            if (cleaned) return cleaned;
        }
    }
    return 'יש עומס, עייפות או חוסר ודאות';
}

function wr2wComposeAutoLearning(pathChoice, scene, roundState = {}) {
    const choice = String(pathChoice || '').toLowerCase();
    const quantifier = wr2wSanitizeText(roundState?.selectedQuantifier || 'תמיד');
    const conditionCore = wr2wExtractConditionHint(scene, roundState);
    const conditionClause = conditionCore.startsWith('כש') ? conditionCore : `כש${conditionCore}`;
    const outsideText = wr2wSanitizeText(`זה לא בהכרח "${quantifier}", זה דפוס לא עקבי — בעיקר ${conditionClause}.`);
    const insideText = wr2wSanitizeText(`זה מרגיש "${quantifier}" — בעיקר ${conditionClause}.`);

    if (choice === 'outside') {
        return Object.freeze({ singleText: outsideText, outsideText, insideText: '' });
    }
    if (choice === 'inside') {
        return Object.freeze({ singleText: insideText, outsideText: '', insideText });
    }
    return Object.freeze({ singleText: '', outsideText, insideText });
}

const WR2W_OWNERSHIP_REGEX = /(עולה לי|כשאני שומע|אני קולט כאילו|נדמה לי|מרגיש לי)/;
const WR2W_CHECK_REGEX = /(זה קרוב|או שאני משלים|זה מדויק|זה מתאים|אני מפספס)/;
const WR2W_ABSOLUTE_REGEX = /(תמיד|אף פעם|בשום|כולם|אין מצב|לגמרי|לעולם)/;
const WR2W_OUTSIDE_REGEX = /(דפוס|לא עקבי|בפועל|באינטראקציה|ביחסים|גבול|בקשה|פתרון|התנהגות)/;
const WR2W_INSIDE_REGEX = /(מרגיש|בפנים|בגוף|עוצמה|לחץ|פחד|בושה|דופק|כאב)/;

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
        return Object.freeze({
            ok: hasOwnership && hasQuantifier && hasCheck,
            hasOwnership,
            hasQuantifier,
            hasCheck
        });
    },
    evaluateLearning(pathChoice, payload = {}) {
        const result = wr2wPathCore.evaluateLearningByPath(pathChoice, payload);
        if (result?.mode === 'outside') {
            return Object.freeze({
                ok: Boolean(result.ok),
                mode: 'outside',
                outside: result.outside || {
                    hasCondition: /(בעיקר כש|לפעמים|בתנאים|כאשר|כש)/.test(normalizeText(payload.singleText || '')),
                    hasPattern: WR2W_OUTSIDE_REGEX.test(normalizeText(payload.singleText || '')),
                    avoidsRigidAbsolute: !WR2W_ABSOLUTE_REGEX.test(normalizeText(payload.singleText || ''))
                        || /זה לא/.test(normalizeText(payload.singleText || ''))
                }
            });
        }
        if (result?.mode === 'inside') {
            return Object.freeze({
                ok: Boolean(result.ok),
                mode: 'inside',
                inside: result.inside || {
                    hasCondition: /(בעיקר כש|לפעמים|בתנאים|כאשר|כש)/.test(normalizeText(payload.singleText || '')),
                    hasInnerFrame: WR2W_INSIDE_REGEX.test(normalizeText(payload.singleText || ''))
                }
            });
        }
        return Object.freeze({
            ok: Boolean(result?.ok),
            mode: 'both',
            bothComplete: Boolean(result?.bothComplete),
            outside: result?.outside || {
                hasCondition: /(בעיקר כש|לפעמים|בתנאים|כאשר|כש)/.test(normalizeText(payload.outsideText || '')),
                hasPattern: WR2W_OUTSIDE_REGEX.test(normalizeText(payload.outsideText || '')),
                avoidsRigidAbsolute: !WR2W_ABSOLUTE_REGEX.test(normalizeText(payload.outsideText || ''))
                    || /זה לא/.test(normalizeText(payload.outsideText || ''))
            },
            inside: result?.inside || {
                hasCondition: /(בעיקר כש|לפעמים|בתנאים|כאשר|כש)/.test(normalizeText(payload.insideText || '')),
                hasInnerFrame: WR2W_INSIDE_REGEX.test(normalizeText(payload.insideText || ''))
            }
        });
    }
});

function wr2wProcessCount(criteria) {
    return Object.values(criteria || {}).filter(Boolean).length;
}

const WR2W_WIZARD_TITLE = 'כמתים נסתרים – הגשר שנסגר';
const WR2W_WIZARD_SLOGAN = 'כשהרגש גדול מהמילים — יש כמת נסתר. אנחנו לא מתקנים ולא מבטלים; אנחנו פותחים גשר בין הגוף, העולם והשפה.';
const WR2W_WIZARD_FORMULA_CANONICAL = 'Signal → Hidden Quantifier → Bridge → Confirm → PATH → Learning';
const WR2W_WIZARD_FORMULA = 'מה עולה בגוף → איזה "תמיד/אף פעם" מסתתר → משפט מגשר + בדיקה → אישור/הלימה → בחירת כיוון עבודה → למידה חדשה';

function setupWrinkleGame() {
    const root = document.getElementById('wrinkle-game');
    if (!root || root.dataset.wr2WizardBound === 'true') return;
    root.dataset.wr2WizardBound = 'true';
    root.className = 'card wrinkle-reveal-card wr2w-card';

    root.innerHTML = `
        <div class="wr2w-shell">
            <section class="wr2w-hero">
                <div class="wr2w-topbar">
                    <div class="wr2w-title-wrap">
                        <p class="wr2w-kicker">גשר תחושה-שפה · עבודה עם "תמיד/אף פעם" סמוי</p>
                        <h3>${WR2W_WIZARD_TITLE}</h3>
                        <p class="wr2w-subtitle">${WR2W_WIZARD_SLOGAN}</p>
                    </div>
                    <button id="wr2w-next-scene" class="btn btn-primary wr2w-main-btn wr2w-main-btn--green wr2w-hero-cta" type="button">דיאלוג חדש</button>
                </div>
                <details class="wr2w-meta-drawer">
                    <summary>מצב תרגול וכלים</summary>
                    <div class="wr2w-meta-drawer-body">
                        <div class="wr2w-score">
                            <span>תהליך <strong id="wr2w-process-score">0/6</strong></span>
                            <span>רצף <strong id="wr2w-streak">0</strong></span>
                            <span>נק׳ <strong id="wr2w-points">0</strong></span>
                            <span class="wr2w-score-minor">כיווני עבודה <strong id="wr2w-path-distribution">0/0/0</strong></span>
                            <span class="wr2w-score-minor">H/C <strong id="wr2w-stuck-distribution">0/0</strong></span>
                        </div>
                        <p class="wr2w-formula">${WR2W_WIZARD_FORMULA}</p>
                        <div class="wr2w-actions wr2w-actions--hero">
                            <button id="wr2w-reset-round" class="btn btn-secondary" type="button">התחל/י את הסבב מחדש</button>
                            <button id="wr2w-self-toggle" class="btn btn-secondary" type="button">משפט אישי לתרגול</button>
                        </div>
                    </div>
                </details>
            </section>

            <details class="wr2w-guide" id="wr2w-philosopher-panel">
                <summary>פילוסוף מסך · ההיגיון מאחורי התרגול</summary>
                <div class="wr2w-guide-body">
                    <p>כאן עובדים כמו באימון: קודם מזהים איפה המתח גדול מהמילים, אחר כך חושפים את הכמת הסמוי, ורק אז בונים גשר מדויק ובודקים אותו.</p>
                    <p>המטרה היא לא "לתקן" את המשפט, אלא להגיע לרגע של הלימה (felt shift): "כן, זה בדיוק זה".</p>
                    <p class="wr2w-guide-note">דוגמת שימוש לימודית: זו המחשה לאופן עבודה אפשרי עם הכלי, לא "נוסחה טיפולית" אחת.</p>
                </div>
            </details>

            <section class="wr2w-sentence-card wr2w-scene-box">
                <div class="wr2w-sentence-top">
                    <p class="wr2w-kicker">משפט מרכזי · Core Sentence</p>
                    <p id="wr2w-sentence-help" class="wr2w-sentence-help">בחר/י תחושה ואז כמת נסתר. הכרטיס יתעדכן לאורך הסבב.</p>
                </div>
                <div id="wr2w-signal-inline" class="wr2w-signal-inline hidden"></div>
                <p id="wr2w-visible-sentence" class="wr2w-visible-sentence"></p>

                <div class="wr2w-layers">
                    <article id="wr2w-layer-outside" class="wr2w-layer-card is-blue">
                        <h4>👁️ חוץ · Outside</h4>
                        <p id="wr2w-layer-outside-text">מה באמת קרה בחוץ?</p>
                    </article>
                    <article id="wr2w-layer-inside" class="wr2w-layer-card is-green">
                        <h4>❤️ פנים/גוף · Inside</h4>
                        <p id="wr2w-layer-inside-text">מה הגוף/הרגש אומר כרגע?</p>
                    </article>
                    <article id="wr2w-layer-spoken" class="wr2w-layer-card is-purple">
                        <h4>💬 משפט גלוי · Spoken</h4>
                        <p id="wr2w-layer-spoken-text">מה באמת נאמר?</p>
                    </article>
                </div>

                <details class="wr2w-context">
                    <summary>הקשר רחב / Monologue</summary>
                    <p id="wr2w-monologue" class="wr2w-monologue"></p>
                </details>
            </section>

            <div id="wr2w-step-chips" class="wr2w-step-chips"></div>

            <section class="wr2w-step-panel">
                <h4 id="wr2w-step-title"></h4>
                <p id="wr2w-step-instruction" class="wr2w-step-instruction"></p>
                <div id="wr2w-step-body" class="wr2w-step-body"></div>
                <p id="wr2w-feedback" class="wr2w-feedback" data-tone="info"></p>
            </section>

            <section id="wr2w-self-panel" class="wr2w-self-panel hidden">
                <label for="wr2w-self-input">משפט אישי לתרגול (אופציונלי)</label>
                <textarea id="wr2w-self-input" rows="2" placeholder="לדוגמה: קשה לי להסביר מה אני רוצה"></textarea>
                <button id="wr2w-self-add" class="btn btn-secondary" type="button">הוסף לתרגול</button>
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
        sentenceHelp: document.getElementById('wr2w-sentence-help'),
        signalInline: document.getElementById('wr2w-signal-inline'),
        layerOutside: document.getElementById('wr2w-layer-outside'),
        layerInside: document.getElementById('wr2w-layer-inside'),
        layerSpoken: document.getElementById('wr2w-layer-spoken'),
        layerOutsideText: document.getElementById('wr2w-layer-outside-text'),
        layerInsideText: document.getElementById('wr2w-layer-inside-text'),
        layerSpokenText: document.getElementById('wr2w-layer-spoken-text'),
        stepChips: document.getElementById('wr2w-step-chips'),
        stepTitle: document.getElementById('wr2w-step-title'),
        stepInstruction: document.getElementById('wr2w-step-instruction'),
        stepBody: document.getElementById('wr2w-step-body'),
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
    if (typeof repairMojibakeDomSubtree === 'function') repairMojibakeDomSubtree(root);

    const createRoundState = () => ({
        step: 'S',
        feeling: '',
        selectedQuantifier: '',
        hypothesisDraft: '',
        hypothesisFinal: '',
        confirmation: null,
        confirmCorrections: 0,
        confirmResolved: false,
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
        criteria: {
            signal: false,
            quantifier: false,
            hypothesis: false,
            confirm: false,
            path: false,
            exception: false
        },
        feedback: 'נתחיל מהגוף: מה עולה כאן כששומעים את המשפט הזה?',
        feedbackTone: 'info'
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
        setFeedback(`נטענו ${normalizedPack.length} דיאלוגים לחבילה המורחבת.`, 'info');
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
        wr2wLogHebrewIssues('ui.feedback', message);
        state.round.feedback = wr2wSanitizeText(message);
        state.round.feedbackTone = tone;
    };

    const markCriterion = (criterionKey, soundKind = 'next') => {
        if (state.round.criteria[criterionKey]) return;
        state.round.criteria[criterionKey] = true;
        playUISound(soundKind);
    };

    const wr2wEscapeRegExp = (text) => String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wr2wShort = (text, max = 96) => {
        const raw = wr2wSanitizeText(text || '').replace(/\s+/g, ' ').trim();
        if (typeof wr2TrimText === 'function') return wr2TrimText(raw, max);
        return raw.length > max ? `${raw.slice(0, max - 1)}…` : raw;
    };
    const wr2wPathLabel = (pathChoice) => {
        if (pathChoice === 'outside') return 'חוץ (מה קורה בפועל)';
        if (pathChoice === 'inside') return 'פנים (רגש/גוף)';
        if (pathChoice === 'both') return 'גשר (פנים + חוץ)';
        return 'עדיין לא נבחר כיוון עבודה';
    };
    const wr2wPathTherapeuticLabel = (pathChoice) => {
        if (pathChoice === 'outside') return 'כיוון חוץ (מה קורה בפועל / בקשה / גבולות)';
        if (pathChoice === 'inside') return 'כיוון פנים (רגש / גוף / ויסות)';
        if (pathChoice === 'both') return 'כיוון גשר (פנים + חוץ ביחד)';
        return '';
    };
    const wr2wPathNextStepText = (pathChoice) => {
        if (pathChoice === 'outside') return 'ננסח צעד חיצוני קטן וברור שאפשר לבדוק במציאות.';
        if (pathChoice === 'inside') return 'ננסח משפט פנימי מדויק יותר שמכבד את החוויה ומרכך את המוחלטות.';
        if (pathChoice === 'both') return 'נבנה גם צעד פנימי וגם צעד חיצוני, כדי לשמור על חיבור ופעולה יחד.';
        return '';
    };
    const wr2wBuildTherapistPathSummary = (scene) => {
        const pathChoice = String(state.round.pathChoice || '').toLowerCase();
        if (!['outside', 'inside', 'both'].includes(pathChoice)) return '';
        const visible = wr2wShort(scene?.visibleSentence || '', 90);
        const feeling = wr2wSanitizeText(state.round.feeling || '');
        const quantifier = wr2wSanitizeText(state.round.selectedQuantifier || '');
        const pathLabel = wr2wPathTherapeuticLabel(pathChoice);
        const nextStep = wr2wPathNextStepText(pathChoice);
        const feelingText = feeling ? `מתחת למשפט עולה בעיקר תחושת ${feeling}` : 'יש כאן רגש משמעותי מאחורי המשפט';
        const quantifierText = quantifier ? `, ונשמע שיש גם כמת סמוי כמו "${quantifier}"` : '';
        return `אם אני מסכם/ת: כשאת/ה אומר/ת "${visible}", ${feelingText}${quantifierText}. כרגע נשמע שהכיוון שמתאים לך הוא ${pathLabel}. בשלב הבא ${nextStep}`;
    };
    const renderWr2wInlineSignalPicker = () => {
        if (state.round.step !== 'S') return '';
        return `
            <div class="wr2w-signal-inline-card" aria-label="בחירת תחושה">
                <p class="wr2w-signal-inline-title">מה עולה לך כשאת/ה שומע/ת את זה?</p>
                <p class="wr2w-signal-inline-subtitle">אם היית שואל/ת את המטופל: איזה רגש או תחושת גוף יש כאן מאחורי המשפט הזה?</p>
                <div class="wr2w-option-grid wr2w-signal-option-grid">
                    ${WR2W_FEELINGS.map((feeling) => `
                        <button type="button" class="wr2w-option-btn${state.round.feeling === feeling ? ' is-selected' : ''}" data-action="select-feeling" data-feeling="${escapeHtml(feeling)}">${escapeHtml(feeling)}</button>
                    `).join('')}
                </div>
            </div>
        `;
    };
    const wr2wStepCopy = Object.freeze({
        S: {
            title: 'שלב 1 · מה עולה בגוף? (תחושה)',
            instruction: 'נתחיל מהחוויה: מה עולה למטופל כשהוא אומר את המשפט הזה? בחר/י רגש/תחושת גוף, ואז נזהה את הכמת הסמוי.'
        },
        Q: {
            title: 'שלב 2 · איזה "תמיד/אף פעם" מסתתר?',
            instruction: 'בחר/י את הכמת שמשתמע מהמשפט. הוא יודגש בתוך המשפט העליון בצהוב גם אם לא נאמר במפורש.'
        },
        H: {
            title: 'שלב 3 · ניסוח משפט מגשר לבדיקה',
            instruction: 'מנסחים "משפט מגשר" קצר: ניסוח ביניים שמחבר בין התחושה, הכמת הסמוי והמשפט של המטופל, ואז בודקים אם זה קרוב למה שהתכוון.'
        },
        C: {
            title: 'שלב 4 · בדיקת הלימה מול המטופל',
            instruction: 'אחרי בדיקת הניסוח בשלב H, שולחים את המשפט המגשר ל"אישור/תיקון" מול המטופל (AI). רק כשיש הלימה עוברים לכיוון עבודה.'
        },
        P: {
            title: 'שלב 5 · בחירת כיוון עבודה',
            instruction: 'אחרי שנוצרה הלימה, בוחרים יחד איפה הכי נכון להמשיך עכשיו: בעולם החיצוני, בחוויה הפנימית, או בגשר שמחבר ביניהם.'
        },
        E: {
            title: 'שלב 6 · חריג ולמידה חדשה',
            instruction: 'מחפשים חריג/תנאי, ואז מנסחים משפט למידה חדש שמרכך את הכמת המוחלט.'
        },
        DONE: {
            title: 'סיום סבב · בדיקת "קליק" של דיוק',
            instruction: 'בודקים מה הושלם בתהליך, מה למדת, והאם נוצר רגע של "זה בדיוק זה".'
        }
    });
    const wr2wActiveLayerForStep = (step) => {
        if (step === 'S' || step === 'Q') return 'inside';
        if (step === 'H' || step === 'C') return 'spoken';
        return 'outside';
    };
    const wr2wInlineQuantifierInsertHtml = (sentenceText, quantifierText) => {
        const sentence = wr2wSanitizeText(sentenceText || '');
        const quantifier = wr2wSanitizeText(quantifierText || '').trim();
        if (!sentence) return '';
        if (!quantifier) return escapeHtml(sentence);

        const tokens = [...sentence.matchAll(/\S+/g)];
        if (!tokens.length) return escapeHtml(sentence);

        const cleanToken = (value) => String(value || '').replace(/^[\s"'״׳([{]+|[\s"'״׳)\].,!?;:]+$/g, '');
        const pronounRegex = /^(אני|אתה|את|אתם|אתן|הוא|היא|הם|הן|אנחנו|זה|זאת|זו)$/;
        let anchorIdx = tokens.findIndex((match) => pronounRegex.test(cleanToken(match[0])));
        if (anchorIdx < 0) anchorIdx = 0;

        const anchorMatch = tokens[anchorIdx];
        const insertPos = Number(anchorMatch.index) + String(anchorMatch[0]).length;
        const before = sentence.slice(0, insertPos);
        const after = sentence.slice(insertPos);
        const needsLeftSpace = before && !/\s$/.test(before);
        const needsRightSpace = after && !/^\s/.test(after) && !/^[,.;:!?]/.test(after);

        return `${escapeHtml(before)}${needsLeftSpace ? ' ' : ''}<span class="wr2w-quantifier-insert" aria-label="כמת נסתר: ${escapeHtml(quantifier)}"><span class="wr2w-quantifier-insert-label">כמת נסתר</span><mark class="wr2w-quantifier-glow wr2w-quantifier-glow--inserted">${escapeHtml(quantifier)}</mark></span>${needsRightSpace ? ' ' : ''}${escapeHtml(after)}`;
    };
    const wr2wHighlightSentenceHtml = (sentenceText, quantifierText) => {
        const sentence = wr2wSanitizeText(sentenceText || '');
        const quantifier = wr2wSanitizeText(quantifierText || '').trim();
        if (!quantifier) return escapeHtml(sentence);
        try {
            const regex = new RegExp(wr2wEscapeRegExp(quantifier), 'g');
            if (!regex.test(sentence)) {
                return wr2wInlineQuantifierInsertHtml(sentence, quantifier);
            }
            regex.lastIndex = 0;
            return escapeHtml(sentence).replace(
                new RegExp(wr2wEscapeRegExp(escapeHtml(quantifier)), 'g'),
                `<mark class="wr2w-quantifier-glow">${escapeHtml(quantifier)}</mark>`
            );
        } catch (_error) {
            return escapeHtml(sentence);
        }
    };
    const refreshWr2wLayerCards = (scene) => {
        const step = state.round.step;
        const active = wr2wActiveLayerForStep(step);
        [
            [els.layerOutside, 'outside'],
            [els.layerInside, 'inside'],
            [els.layerSpoken, 'spoken']
        ].forEach(([el, key]) => {
            if (!el) return;
            el.classList.toggle('is-active', key === active);
        });
        if (els.layerSpokenText) {
            els.layerSpokenText.textContent = wr2wShort(scene?.visibleSentence || '', 120);
        }
        if (els.layerInsideText) {
            const insideParts = [
                state.round.feeling ? `רגש/תחושת גוף: ${state.round.feeling}` : 'מה עולה למטופל כשהוא אומר את זה?',
                state.round.selectedQuantifier ? `כמת משתמע: ${state.round.selectedQuantifier}` : '',
                state.round.confirmation?.status === 'yes' ? 'נוצר אישור (כן)' : '',
                state.round.confirmation?.status === 'partial' ? 'יש אישור חלקי (בערך)' : ''
            ].filter(Boolean);
            els.layerInsideText.textContent = wr2wShort(insideParts.join(' · '), 120);
        }
        if (els.layerOutsideText) {
            const outsideParts = [
                state.round.pathChoice ? `כיוון עבודה: ${wr2wPathLabel(state.round.pathChoice)}` : 'מה באמת קורה במציאות/בהקשר?',
                scene?.conditionsLine ? `תנאי נפוץ: ${scene.conditionsLine}` : ''
            ].filter(Boolean);
            els.layerOutsideText.textContent = wr2wShort(outsideParts.join(' · '), 120);
        }
        if (els.sentenceHelp) {
            const stepHint = step === 'Q'
                ? 'בחר/י כמת נסתר (תמיד/אף פעם/אין סיכוי...)'
                : step === 'S'
                    ? 'שאל/י: "מה עולה לך כשאת/ה שומע/ת את זה?" ואז בחר/י רגש/תחושת גוף.'
                : step === 'H'
                    ? 'נסח/י גשר קצר ובדוק/י הלימה'
                : step === 'P'
                    ? 'בחר/י כיוון עבודה: חוץ / פנים / גשר'
                        : 'התקדמות לפי 6 שלבים. אפשר לפתוח את "פילוסוף מסך" רק כשצריך.';
            els.sentenceHelp.textContent = stepHint;
        }
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
        const earned = scoreResult.total;
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
            scoreResult.pathPoint ? '+1 בחירת כיוון עבודה' : '',
            scoreResult.bothBonus ? '+1 BOTH' : ''
        ].filter(Boolean).join(' | ');
        setFeedback(`סיכום סבב: ${completed}/6 רכיבי תהליך הושלמו, +${earned} נקודות${bonusText ? ` (${bonusText})` : ''}.`, 'success');
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
            li.textContent = `“${wr2wSanitizeText(scene.visibleSentence)}”`;
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

    const renderStepContent = (scene) => {
        if (!scene) return '';
        const step = state.round.step;
        if (step === 'S') {
            return `
                <p class="wr2w-inline-hint">בחר/י רגש אחד שמרגיש הכי קרוב למה שיש מתחת למשפט. אחר כך נעבור לבדוק איזה כמת סמוי מחזיק את זה.</p>
                <button type="button" class="btn btn-primary wr2w-main-btn wr2w-main-btn--green" data-action="goto-q" ${state.round.feeling ? '' : 'disabled'}>המשך · כמת נסתר</button>
            `;
        }
        if (step === 'Q') {
            return `
                <div class="wr2w-option-grid">
                    ${scene.quantifiers.map((q) => `
                        <button type="button" class="wr2w-option-btn${state.round.selectedQuantifier === q ? ' is-selected' : ''}" data-action="select-quantifier" data-quantifier="${escapeHtml(q)}">${escapeHtml(q)}</button>
                    `).join('')}
                </div>
                <button type="button" class="btn btn-primary wr2w-main-btn wr2w-main-btn--green" data-action="goto-h" ${state.round.selectedQuantifier ? '' : 'disabled'}>בנה משפט מגשר (H)</button>
            `;
        }
        if (step === 'H') {
            return `
                <div class="wr2w-step-hero">
                    <strong>מה זה "משפט מגשר"?</strong>
                    <p>זה משפט ביניים זמני: הוא לא "פתרון", אלא בדיקה האם הבנו נכון את הקשר בין התחושה לבין ה"תמיד/אף פעם" הסמוי.</p>
                </div>
                <details class="wr2w-inline-theory">
                    <summary>מה עושה בודק הניסוח (Evaluator)?</summary>
                    <p>זה בודק טכני קצר לשלב H: האם יש בעלות ("עולה לי..."), האם הכמת שבחרת מופיע, והאם יש שאלת בדיקה ("זה קרוב...?"). הוא לא מחליף שיקול טיפולי.</p>
                </details>
                <details class="wr2w-inline-theory">
                    <summary>תבנית משפט מגשר קצרה</summary>
                    <p>בעלות ("עולה לי...") + כמת נסתר + בדיקה ("זה קרוב למה שהתכוונת?").</p>
                </details>
                <textarea id="wr2w-hypothesis-input" class="wr2w-textarea" rows="4">${escapeHtml(state.round.hypothesisDraft)}</textarea>
                <button type="button" class="btn btn-primary wr2w-main-btn" data-action="submit-hypothesis">בדוק/י עם בודק הניסוח</button>
                <p class="wr2w-template-note">אחרי שהניסוח עובר כאן, עדיין שולחים אותו בשלב הבא לאישור/תיקון מול "המטופל" (AI).</p>
            `;
        }
        if (step === 'C') {
            const confirmation = state.round.confirmation;
            const canEnterPath = wr2wPathCore.canEnterPath(state.round);
            const correctionsLeft = Math.max(0, 2 - Number(state.round.confirmCorrections || 0));
            return `
                <p class="wr2w-inline-hint">שלב האישור: כאן בודקים הלימה מול "המטופל" (AI) — לא אם הניסוח "יפה", אלא אם הוא באמת קרוב למה שהתכוון.</p>
                <div class="wr2w-quote-box">
                    <strong>המשפט המגשר שנבדק</strong>
                    <p>${escapeHtml(state.round.hypothesisFinal || state.round.hypothesisDraft)}</p>
                </div>
                ${confirmation ? `
                    <div class="wr2w-patient-box" data-status="${escapeHtml(confirmation.status)}">
                        <strong>תגובת "המטופל" (AI) · אישור/תיקון</strong>
                        <p>${escapeHtml(confirmation.text)}</p>
                    </div>
                    ${canEnterPath ? `
                        <button type="button" class="btn btn-primary wr2w-main-btn wr2w-main-btn--green" data-action="goto-path">המשך לבחירת כיוון עבודה</button>
                    ` : `
                        <p class="wr2w-template-note">נשארו ${correctionsLeft} תיקונים למשפט המגשר לפני מעבר לשלב בחירת כיוון עבודה.</p>
                        <button type="button" class="btn btn-secondary wr2w-main-btn" data-action="revise-hypothesis">חזור/י ל-H לשיפור</button>
                    `}
                ` : `
                    <button type="button" class="btn btn-primary wr2w-main-btn" data-action="send-hypothesis">שלח/י לאישור מול "המטופל"</button>
                `}
            `;
        }
        if (step === 'P') {
            const selected = state.round.pathChoice || '';
            const therapistSummary = selected ? wr2wBuildTherapistPathSummary(scene) : '';
            return `
                <p class="wr2w-path-question">נשמע שנוצר כאן רגע של דיוק משותף. מה הכי יעזור לך עכשיו להמשיך ממנו?</p>
                <div class="wr2w-path-grid">
                    <button type="button" class="wr2w-path-btn${selected === 'outside' ? ' is-selected' : ''}" data-action="select-path" data-path="outside">
                        <strong>🔵 כיוון חוץ</strong>
                        <small>מה קורה בפועל: עובדות, גבולות, בקשה, תפקוד</small>
                    </button>
                    <button type="button" class="wr2w-path-btn${selected === 'inside' ? ' is-selected' : ''}" data-action="select-path" data-path="inside">
                        <strong>🟢 כיוון פנים</strong>
                        <small>גוף, טריגר, ויסות, תחושה פנימית</small>
                    </button>
                    <button type="button" class="wr2w-path-btn${selected === 'both' ? ' is-selected' : ''}" data-action="select-path" data-path="both">
                        <strong>🟣 כיוון גשר</strong>
                        <small>צעד קטן בחוץ + צעד קטן בפנים</small>
                    </button>
                </div>
                ${therapistSummary ? `
                    <div class="wr2w-step-hero wr2w-path-summary">
                        <strong>שיקוף-סיכום של המטפל/ת</strong>
                        <p>${escapeHtml(therapistSummary)}</p>
                    </div>
                ` : ''}
                <button type="button" class="btn btn-primary wr2w-main-btn wr2w-main-btn--green" data-action="goto-e" ${selected ? '' : 'disabled'}>המשך לחריג ולמידה</button>
            `;
        }
        if (step === 'E') {
            const pathChoice = state.round.pathChoice || '';
            const pathLabel = wr2wPathLabel(pathChoice);
            return `
                <details class="wr2w-inline-theory">
                    <summary>סולם פריצה (רק אם אין חריג מיידי)</summary>
                    <p>בודקים חריג בהדרגה: ישיר → 5% → 1% → תנאים. המטרה היא למצוא ריכוך אמיתי, לא "לשכנע".</p>
                </details>
                <p class="wr2w-template-note">כיוון עבודה שנבחר: <strong>${escapeHtml(pathLabel)}</strong></p>
                <div class="wr2w-ladder">
                    ${WR2W_BREAKOUT_STEPS.map((item) => `
                        <button type="button" class="wr2w-ladder-btn${state.round.breakoutLevel === item.id ? ' is-selected' : ''}" data-action="set-breakout-level" data-level="${item.id}">
                            ${escapeHtml(item.label)}
                        </button>
                    `).join('')}
                </div>
                <p class="wr2w-ladder-prompt">${escapeHtml(WR2W_BREAKOUT_STEPS[state.round.breakoutLevel].prompt)}</p>
                <button type="button" class="btn btn-primary wr2w-main-btn" data-action="send-breakout">בדוק/י חריג / תנאי</button>

                ${state.round.lastProbe ? `
                    <div class="wr2w-patient-box" data-status="${state.round.lastProbe.found ? 'yes' : 'no'}">
                        <strong>מה חזר מהבדיקה</strong>
                        <p>${escapeHtml(state.round.lastProbe.text)}</p>
                    </div>
                ` : ''}

                ${state.round.breakoutFound ? `
                    <button type="button" class="btn btn-secondary wr2w-main-btn" data-action="autofill-learning">צור ניסוח למידה אוטומטי</button>
                    <p class="wr2w-template-note">אפשר לקבל ניסוח אוטומטי וללטש אותו עד שהוא מרגיש מדויק.</p>
                    ${pathChoice === 'outside' ? `
                        <label class="wr2w-learning-label" for="wr2w-learning-outside-input">חוץ / מה ננסה או נבדוק בפועל</label>
                        <textarea id="wr2w-learning-outside-input" class="wr2w-textarea" rows="3">${escapeHtml(state.round.learningOutsideDraft || state.round.learningDraft)}</textarea>
                    ` : pathChoice === 'inside' ? `
                        <label class="wr2w-learning-label" for="wr2w-learning-inside-input">פנים / מה קורה בפנים ואיך נרצה לפגוש את זה</label>
                        <textarea id="wr2w-learning-inside-input" class="wr2w-textarea" rows="3">${escapeHtml(state.round.learningInsideDraft || state.round.learningDraft)}</textarea>
                    ` : `
                        <label class="wr2w-learning-label" for="wr2w-learning-outside-input">חוץ / מה ננסה או נבדוק בפועל</label>
                        <textarea id="wr2w-learning-outside-input" class="wr2w-textarea" rows="3">${escapeHtml(state.round.learningOutsideDraft)}</textarea>
                        <label class="wr2w-learning-label" for="wr2w-learning-inside-input">פנים / מה קורה בפנים ואיך נרצה לפגוש את זה</label>
                        <textarea id="wr2w-learning-inside-input" class="wr2w-textarea" rows="3">${escapeHtml(state.round.learningInsideDraft)}</textarea>
                    `}
                    <button type="button" class="btn btn-primary wr2w-main-btn wr2w-main-btn--green" data-action="finish-round">סיים סבב</button>
                ` : ''}
            `;
        }

        const items = Object.entries(state.round.criteria).map(([key, done]) => `
            <li class="${done ? 'is-done' : ''}">
                ${done ? '✓' : '○'} ${escapeHtml(WR2W_CRITERIA_LABELS[key] || key)}
            </li>
        `).join('');
        return `
            <div class="wr2w-done-box">
                <p><strong>סיכום סבב:</strong> +${state.round.roundScore} נק׳ | <strong>תהליך:</strong> ${state.round.completedCount}/6</p>
                <p><strong>משפט למידה:</strong> ${escapeHtml(state.round.learningFinal || scene.transformedSentence)}</p>
                ${state.round.pathChoice === 'both' ? `
                    <p><strong>חוץ:</strong> ${escapeHtml(state.round.learningOutsideFinal || state.round.learningOutsideDraft || '---')}</p>
                    <p><strong>פנים:</strong> ${escapeHtml(state.round.learningInsideFinal || state.round.learningInsideDraft || '---')}</p>
                ` : ''}
                <p class="wr2w-template-note">בדיקת הלימה פנימית: האם זה מרגיש "כן, זה בדיוק זה"?</p>
                <ul class="wr2w-criteria-list">${items}</ul>
                <button type="button" class="btn btn-primary wr2w-main-btn wr2w-main-btn--green" data-action="next-scene-inline">תרגיל הבא</button>
            </div>
        `;
    };

    const render = () => {
        const scene = currentScene();
        if (!scene) {
            root.innerHTML = '<p>אין כרגע דיאלוגים זמינים לתרגול.</p>';
            return;
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
        if (els.monologue) els.monologue.textContent = wr2wSanitizeText(scene.monologue);
        if (els.visibleSentence) {
            els.visibleSentence.innerHTML = wr2wHighlightSentenceHtml(scene.visibleSentence, state.round.selectedQuantifier);
        }
        if (els.signalInline) {
            const showInlineSignal = state.round.step === 'S';
            els.signalInline.classList.toggle('hidden', !showInlineSignal);
            els.signalInline.innerHTML = showInlineSignal ? renderWr2wInlineSignalPicker() : '';
        }

        const currentStepKey = wr2wStepCopy[state.round.step] ? state.round.step : 'DONE';
        if (els.stepTitle) els.stepTitle.textContent = wr2wStepCopy[currentStepKey].title;
        if (els.stepInstruction) els.stepInstruction.textContent = wr2wStepCopy[currentStepKey].instruction;
        if (els.stepBody) els.stepBody.innerHTML = renderStepContent(scene);
        if (els.stepBody) els.stepBody.dataset.step = String(state.round.step || 'S');
        if (els.feedback) {
            els.feedback.textContent = wr2wSanitizeText(state.round.feedback || '');
            els.feedback.setAttribute('data-tone', state.round.feedbackTone || 'info');
        }

        refreshWr2wLayerCards(scene);
        renderStepChips();
        renderSelfList();
        persist();
        if (typeof repairMojibakeDomSubtree === 'function') repairMojibakeDomSubtree(root);
    };

    const nextScene = () => {
        const scenes = allScenes();
        if (!scenes.length) return;
        state.index = (state.index + 1) % scenes.length;
        resetRoundState();
        playUISound('next');
        setFeedback('דיאלוג חדש. מתחילים שוב מזיהוי התחושה שעולה (שלב תחושה / S).', 'info');
        render();
    };

    const addSelfSentence = () => {
        const raw = String(els.selfInput?.value || '').trim();
        if (raw.length < 8) {
            setFeedback('כתוב/י משפט אישי קצר לתרגול (לפחות 8 תווים).', 'warn');
            render();
            return;
        }
        const normalized = normalizeText(raw).replace(/\s+/g, ' ').trim();
        const exists = state.customScenes.some((scene) => normalizeText(scene.visibleSentence).replace(/\s+/g, ' ').trim() === normalized);
        if (exists) {
            setFeedback('המשפט הזה כבר קיים ברשימת התרגול.', 'warn');
            render();
            return;
        }

        const scene = wr2wNormalizeScene({
            id: `wr2w_self_${Date.now()}`,
            source: 'self',
            monologue: raw,
            visibleSentence: raw,
            quantifiers: wr2InferQuantifiers(raw),
            exceptionExample: 'כן, היה רגע קטן שבו זה היה פחות נכון.',
            conditionsLine: 'זה בדרך כלל מתחזק כשיש לחץ, עייפות או חוסר ודאות.',
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
        setFeedback('המשפט האישי נוסף. מתחילים משלב התחושה (S) כדי לזהות מה עולה מתחת למילים.', 'success');
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
            markCriterion('signal', 'select_soft');
            setFeedback(`נרשמה תחושה מרכזית: ${state.round.feeling}.`, 'success');
            render();
            return;
        }
        if (action === 'goto-q') {
            if (!state.round.feeling) {
                setFeedback('בחר/י קודם רגש/תחושת גוף לפני המעבר לכמת הנסתר.', 'warn');
                render();
                return;
            }
            playUISound('next');
            state.round.step = 'Q';
            setFeedback('מעולה. עכשיו נזהה איזה כמת סמוי מחזיק את המשפט הזה.', 'info');
            render();
            return;
        }
        if (action === 'select-quantifier') {
            state.round.selectedQuantifier = button.getAttribute('data-quantifier') || '';
            markCriterion('quantifier', 'wr2w_quantifier');
            setFeedback(`נבחר כמת נסתר: ${state.round.selectedQuantifier}.`, 'success');
            render();
            return;
        }
        if (action === 'goto-h') {
            if (!state.round.selectedQuantifier) {
                setFeedback('בחר/י קודם כמת נסתר לפני המעבר לשלב ניסוח המשפט המגשר.', 'warn');
                render();
                return;
            }
            playUISound('next');
            state.round.step = 'H';
            if (!state.round.hypothesisDraft || state.round.hypothesisDraft.includes('___')) {
                state.round.hypothesisDraft = wr2wBuildHypothesisSkeleton(scene, state.round.selectedQuantifier);
            }
            setFeedback('נסח/י משפט מגשר לפי התבנית ושלח/י לבדיקה.', 'info');
            render();
            return;
        }
        if (action === 'submit-hypothesis') {
            const draft = String(state.round.hypothesisDraft || '').trim();
            if (draft.length < 20) {
                setFeedback('נדרש ניסוח מלא יותר של הגשר כדי לבדוק הלימה.', 'warn');
                render();
                return;
            }
            const evalResult = wr2wEvaluatorAgent.evaluateHypothesis(draft, state.round.selectedQuantifier);
            if (!evalResult.ok) {
                state.analytics = wr2wPathCore.markStuck(state.analytics, 'H');
                const missing = [];
                if (!evalResult.hasOwnership) missing.push('בעלות על ההשערה (למשל: "עולה לי...")');
                if (!evalResult.hasQuantifier) missing.push('הכמת שבחרת');
                if (!evalResult.hasCheck) missing.push('שאלת בדיקה (למשל: "זה קרוב למה שהתכוונת, או שאני משלים/ה?")');
                setFeedback(`כדי שהמשפט המגשר יהיה מדויק יותר, כדאי להשלים: ${missing.join(' | ')}.`, 'warn');
                render();
                return;
            }
            state.round.hypothesisFinal = draft;
            state.round.confirmation = null;
            state.round.confirmResolved = false;
            markCriterion('hypothesis');
            playUISound('wr2w_submit');
            state.round.step = 'C';
            setFeedback('מעולה. עכשיו נבדוק מול "המטופל" אם זה מרגיש לו מדויק או שצריך תיקון.', 'success');
            render();
            return;
        }
        if (action === 'send-hypothesis') {
            if (!state.round.hypothesisFinal) {
                setFeedback('קודם בדוק/י את המשפט המגשר בשלב H ורק אחר כך שלח/י לאישור.', 'warn');
                render();
                return;
            }
            state.round.confirmation = wr2wPatientAgent.confirmHypothesis(
                scene,
                state.round.hypothesisFinal,
                state.round.selectedQuantifier
            );
            const status = state.round.confirmation.status;
            const tone = status === 'yes'
                ? 'success'
                : status === 'partial'
                    ? 'info'
                    : 'warn';
            playUISound(
                status === 'yes'
                    ? 'wr2w_confirm_yes'
                    : status === 'partial'
                        ? 'wr2w_confirm_partial'
                        : 'wr2w_confirm_no'
            );
            if (status === 'yes') {
                state.round.confirmResolved = true;
                markCriterion('confirm');
                    setFeedback('התקבל אישור. אפשר להמשיך לשלב בחירת כיוון העבודה.', tone);
            } else {
                state.analytics = wr2wPathCore.markStuck(state.analytics, 'C');
                if (state.round.confirmCorrections < 2) {
                    state.round.confirmCorrections += 1;
                    if (state.round.confirmCorrections >= 2) {
                        state.round.confirmResolved = true;
                        markCriterion('confirm');
                        setFeedback('נעשו 2 תיקונים בשלב האישור (C). נמשיך לבחירת כיוון עבודה זהירה ומדויקת.', 'info');
                        render();
                        return;
                    }
                    state.round.confirmResolved = false;
                    const left = Math.max(0, 2 - state.round.confirmCorrections);
                    setFeedback(`עלה צורך בתיקון. חזור/י לשלב המשפט המגשר (H) לשיפור הניסוח (נותרו ${left} תיקונים לפני שלב בחירת כיוון עבודה).`, tone);
                } else {
                    state.round.confirmResolved = true;
                    markCriterion('confirm');
                    setFeedback('אחרי שני תיקונים נמשיך עם הלימה חלקית ונבחר כיוון עבודה.', 'info');
                }
            }
            render();
            return;
        }
        if (action === 'revise-hypothesis') {
            playUISound('tap_soft');
            state.round.step = 'H';
            setFeedback('חזרנו לשלב H כדי ללטש את המשפט המגשר לפני בחירת כיוון.', 'info');
            render();
            return;
        }
        if (action === 'goto-path') {
            if (!wr2wPathCore.canEnterPath(state.round)) {
                setFeedback('אי אפשר להיכנס לשלב בחירת כיוון עבודה לפני שלב האישור (C), כולל עד שני תיקונים.', 'warn');
                render();
                return;
            }
            playUISound('next');
            state.round.step = 'P';
            setFeedback('בחר/י עכשיו כיוון עבודה שמתאים למה שנפתח כאן: חוץ, פנים או גשר.', 'info');
            render();
            return;
        }
        if (action === 'select-path') {
            const pathChoice = String(button.getAttribute('data-path') || '').toLowerCase();
            if (!['outside', 'inside', 'both'].includes(pathChoice)) return;
            state.round.pathChoice = pathChoice;
            markCriterion('path', 'wr2w_path');
            setFeedback(`נבחר כיוון עבודה: ${wr2wPathTherapeuticLabel(pathChoice)}.`, 'success');
            render();
            return;
        }
        if (action === 'goto-e') {
            if (!wr2wPathCore.canEnterPath(state.round)) {
                setFeedback('אי אפשר לעבור לשלב חריג/למידה (E/L) לפני אישור בשלב האישור (C).', 'warn');
                render();
                return;
            }
            if (!wr2wPathCore.canEnterException(state.round)) {
                setFeedback('בחר/י קודם כיוון עבודה לפני המעבר לחריג ולמידה.', 'warn');
                render();
                return;
            }
            if (!state.round.confirmation) {
                setFeedback('שלח/י קודם את המשפט המגשר לבדיקת הלימה מול "המטופל".', 'warn');
                render();
                return;
            }
            playUISound('next');
            state.round.step = 'E';
            setFeedback('אם אין חריג מיידי, נתקדם בסולם הפריצה בהדרגה וננסח למידה לפי כיוון העבודה שבחרת.', 'info');
            render();
            return;
        }
        if (action === 'set-breakout-level') {
            state.round.breakoutLevel = Math.max(0, Math.min(3, Number(button.getAttribute('data-level') || 0)));
            playUISound('select_soft');
                setFeedback(`נבחרה דרגת בדיקה: ${WR2W_BREAKOUT_STEPS[state.round.breakoutLevel].label}.`, 'info');
            render();
            return;
        }
        if (action === 'autofill-learning') {
            if (!state.round.breakoutFound) {
                setFeedback('קודם מצאו חריג/תנאי, ואז אפשר ליצור ניסוח למידה אוטומטי.', 'warn');
                render();
                return;
            }
            const didGenerate = applyAutoLearningDrafts(scene, true);
            playUISound(didGenerate ? 'hint' : 'wr2w_confirm_no');
            setFeedback(
                didGenerate
                    ? 'נוצר ניסוח למידה אוטומטי. אפשר לערוך אותו או לסיים את הסבב.'
                    : 'לא נוצר ניסוח חדש. בדקו שנבחר כיוון עבודה מתאים.',
                'info'
            );
            render();
            return;
        }
        if (action === 'send-breakout') {
            playUISound('wr2w_probe');
            state.round.lastProbe = wr2wPatientAgent.probeException(scene, state.round.breakoutLevel);
            if (state.round.lastProbe.found) {
                playUISound('wr2w_probe_found');
                state.round.breakoutFound = true;
                const autoBuilt = applyAutoLearningDrafts(scene, false);
                setFeedback(
                    autoBuilt
                        ? 'נמצא חריג/תנאי, ובנינו גם ניסוח למידה אוטומטי. אפשר לערוך או לסיים.'
                        : 'נמצא חריג/תנאי. אפשר ליצור ניסוח אוטומטי או לנסח ידנית.',
                    'success'
                );
            } else if (state.round.breakoutLevel < 3) {
                setFeedback('עדיין לא נמצא חריג. עברו/י לדרגת הבדיקה הבאה בסולם.', 'warn');
            } else {
                state.round.breakoutFound = true;
                const autoBuilt = applyAutoLearningDrafts(scene, false);
                setFeedback(
                    autoBuilt
                        ? 'לא נמצא חריג חד, אבל נבנה ניסוח למידה מותנה מהחומר שכן עלה.'
                        : 'לא נמצא חריג חד. אפשר ליצור ניסוח למידה מותנה מהחומר שכן עלה.',
                    'warn'
                );
                playUISound('wr2w_confirm_no');
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
                setFeedback('במסלול גשר (Both) צריך להשלים שני ניסוחי למידה: חוץ + פנים.', 'warn');
                render();
                return;
            }
            if ((pathChoice === 'outside' || pathChoice === 'inside') && singleText.length < 12) {
                setFeedback('נדרש משפט למידה מלא יותר לפני סיום הסבב.', 'warn');
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
                    if (!learningEval.outside?.hasCondition) reasons.push('חוץ: הוסף/י תנאי (למשל "כש...", "בתנאים מסוימים", "לפעמים").');
                    if (!learningEval.outside?.hasPattern) reasons.push('חוץ: נסח/י דפוס תפקודי ברור (למשל מה קורה בפועל).');
                    if (!learningEval.outside?.avoidsRigidAbsolute) reasons.push('חוץ: החלף/י ניסוח מוחלט בניסוח מותנה ומדויק יותר.');
                } else if (learningEval.mode === 'inside') {
                    if (!learningEval.inside?.hasCondition) reasons.push('פנים: הוסף/י תנאי (למשל "כש...", "לפעמים", "בתנאים מסוימים").');
                    if (!learningEval.inside?.hasInnerFrame) reasons.push('פנים: שמור/י על ניסוח חווייתי (רגש/גוף/בפנים), לא רק עובדות.');
                } else {
                    if (!learningEval.outside?.ok) reasons.push('חוץ עדיין לא שלם (דפוס + תנאים).');
                    if (!learningEval.inside?.ok) reasons.push('פנים עדיין לא שלם (חוויה + תנאים).');
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
                state.round.learningFinal = `Outside: ${outsideText} | Inside: ${insideText}`;
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
    els.signalInline?.addEventListener('click', handleAction);
    els.stepBody.addEventListener('input', (event) => {
        const target = event.target;
        if (target.id === 'wr2w-hypothesis-input') {
            state.round.hypothesisDraft = String(target.value || '');
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
        playUISound('skip');
        setFeedback('הסבב אופס. מתחילים שוב משלב התחושה (S) - מה עולה מתחת למשפט.', 'info');
        render();
    });

    els.selfToggle?.addEventListener('click', () => {
        els.selfPanel?.classList.toggle('hidden');
        playUISound('tap_soft');
    });

    els.selfAdd?.addEventListener('click', () => {
        addSelfSentence();
    });

    resetRoundState();
    render();
    hydrateSeedScenesFromPack();
}



