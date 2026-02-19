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
    safetyLocked: false,
    didRecordSession: false
};

let audioState = {
    context: null,
    muted: false,
    openingPlayed: false,
    openingTrack: null
};

const OPENING_TRACK_SRC = 'assets/audio/The_Inner_Task.mp3';

const TRAINER_CATEGORY_LABELS = {
    DELETION: 'מחיקה (Deletion)',
    DISTORTION: 'עיוות (Distortion)',
    GENERALIZATION: 'הכללה (Generalization)'
};

const TRAINER_STAR_REWARDS = Object.freeze({
    easy: Object.freeze({ success: 2, partial: 1, fail: 1 }),
    medium: Object.freeze({ success: 3, partial: 2, fail: 1 }),
    hard: Object.freeze({ success: 4, partial: 2, fail: 1 })
});

let trainerRewardEffectTimer = null;

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
        audioState.openingTrack = track;
        return track;
    } catch (e) {
        return null;
    }
}

function updateMuteButtonUI() {
    const btns = document.querySelectorAll('.audio-mute-btn');
    if (!btns.length) return;
    btns.forEach(btn => {
        btn.textContent = audioState.muted ? 'סאונד כבוי' : 'סאונד פעיל';
        btn.classList.toggle('is-muted', audioState.muted);
    });
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

// Play opening track exactly once per app entry.
async function playOpeningMusic() {
    if (audioState.muted || audioState.openingPlayed) return;
    try {
        const track = ensureOpeningTrack();
        if (!track) return;
        track.currentTime = 0;
        await track.play();
        audioState.openingPlayed = true;
    } catch (e) {
        // Autoplay may fail until the first user interaction.
    }
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

    if (embedded) {
        document.body.classList.add('embed-mode');
    }

    if (forceSimple || (embedded && !disableSimple)) {
        document.body.classList.add('minimal-ui');
    }
}

function applyInitialTabPreference() {
    const params = new URLSearchParams(window.location.search);
    const requestedTab = (params.get('tab') || '').trim();
    const defaultEmbedTab = document.body.classList.contains('embed-mode') ? 'practice' : '';
    const targetTab = requestedTab || defaultEmbedTab;
    if (!targetTab || !document.getElementById(targetTab)) return;

    navigateTo(targetTab);
    const mobileTabSelect = document.getElementById('mobile-tab-select');
    if (mobileTabSelect) mobileTabSelect.value = targetTab;
}

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    applyEmbeddedCompactMode();
    loadAudioSettings();
    setupAudioMuteButtons();

    // Browsers usually require user interaction before audio starts.
    document.addEventListener('pointerdown', () => {
        ensureAudioContext();
        playOpeningMusic();
    }, { once: true });

    // Play opening music
    playOpeningMusic();
    
    // Hide splash after animation
    hideSplashScreen();
    
    loadUserProgress();
    showLoadingIndicator();
    loadMetaModelData();
    setupTabNavigation();
    applyInitialTabPreference();
    setupGlobalComicStripActions();
    setupPracticeMode();
    setupQuestionDrill();
    setupWrinkleGame();
    setupTrainerMode();
    setupBlueprintBuilder();
    setupPrismModule();
    setupScenarioTrainerModule();
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
        showErrorMessage('שגיאה בטעינת הנתונים');
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

// Helper function to switch tabs from buttons
function switchTab(tabName) {
    const btn = document.querySelector(`[data-tab="${tabName}"]`);
    if (btn) btn.click();
}

// Alias for switchTab
function navigateTo(tabName) {
    switchTab(tabName);
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

// Setup Practice Mode
function setupPracticeMode() {
    const nextBtn = document.getElementById('next-btn');
    const showAnswerBtn = document.getElementById('show-answer-btn');
    const hintBtn = document.getElementById('hint-btn');

    // Legacy practice controls may not exist in the current UI.
    if (!nextBtn || !showAnswerBtn || !hintBtn) return;

    nextBtn.addEventListener('click', getNextStatement);
    showAnswerBtn.addEventListener('click', showAnswer);
    hintBtn.addEventListener('click', showHint);
}

const QUESTION_DRILL_PACK = [
    {
        id: 'question1',
        statement: 'הבוס אמר שהלקוח לא מבין למה זה לא אפשרי כעת.',
        focus: ['DISTORTION']
    },
    {
        id: 'question2',
        statement: 'אני תמיד מאחר כי הרבה עומס.',
        focus: ['GENERALIZATION']
    },
    {
        id: 'question3',
        statement: 'הם שואלים אותי מה בדיוק חסר.',
        focus: ['DELETION']
    },
    {
        id: 'question4',
        statement: 'כולם אומרים שזה לא עומד להשתנות.',
        focus: ['GENERALIZATION']
    },
    {
        id: 'question5',
        statement: 'הם טוענים שכבר ניסו הכל על סמך הרגשה.',
        focus: ['DISTORTION']
    }
];

const QUESTION_DRILL_KEYWORDS = {
    DELETION: ['מה', 'איך', 'איזה', 'מי', 'האם', 'למה', 'כמה'],
    DISTORTION: ['האם זה אומר', 'לפי מה', 'איך אתה יודע', 'זה בטוח', 'ממה אתה מסיק', 'לפי ההרגשה'],
    GENERALIZATION: ['תמיד', 'כל אחד', 'כולם', 'לעולם', 'אין', 'תמיד', 'כל', 'כל הזמן']
};

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
        feedbackEl.textContent = 'כתבו שאלה לפני שבודקים.';
        return;
    }

    const selected = questionDrillState.elements.category.value || 'DELETION';
    const matched = getMatchedCategories(text);
    const expected = questionDrillState.current.focus || [];
    const focusMatchesExpected = expected.length === 0 || expected.includes(selected);
    const keywordMatches = matched.includes(selected);
    const success = focusMatchesExpected && keywordMatches;

    questionDrillState.attempts += 1;
    if (success) questionDrillState.hits += 1;
    updateQuestionDrillStats();

    if (success) {
        feedbackEl.textContent = `מצוין! השאלה פגעה ב-${selected} וכוללת ביטוי שמבהיר את ההנחה.`;
    } else {
        const missing = !keywordMatches ? 'הוסיפו מילות מפתח כמו ' + QUESTION_DRILL_KEYWORDS[selected].slice(0, 3).join(', ') : '';
        const expectedMessage = expected.length ? ` הכי ראוי לכיוון ${expected.join(' / ')}` : '';
        feedbackEl.textContent = `נסה/ניסי שוב. ${missing} ${expectedMessage}`.trim();
    }
}

function updateQuestionDrillStats() {
    if (!questionDrillState.elements.attempts || !questionDrillState.elements.hits) return;
    questionDrillState.elements.attempts.textContent = String(questionDrillState.attempts);
    questionDrillState.elements.hits.textContent = String(questionDrillState.hits);
}

const WRINKLE_GAME_STORAGE_KEY = 'wrinkle_game_v1';
const WRINKLE_GAME_RETRY_MINUTES = 25;
const WRINKLE_GAME_INTERVAL_HOURS = [0, 24, 72, 168, 336, 720];

const WRINKLE_FOLD_LIBRARY = Object.freeze([
    {
        key: 'ABSOLUTE_IMPOSSIBLE',
        label: 'אי-יכולת מוחלטת',
        emoji: '🚫',
        hiddenAssumption: 'יש פה הנחה ש״אין יכולת בשום מצב״.',
        challengeQuestion: 'באמת בשום מצב? מה כן אפשר לעשות כבר עכשיו ב-10 דקות?'
    },
    {
        key: 'NO_CHOICE',
        label: 'אין ברירה / חייב',
        emoji: '🔒',
        hiddenAssumption: 'יש פה הנחה שאין בחירה פנימית.',
        challengeQuestion: 'מה יקרה אם לא? איזו בחירה קטנה כן קיימת פה?'
    },
    {
        key: 'IDENTITY_LOCK',
        label: 'זהות מקובעת',
        emoji: '🧱',
        hiddenAssumption: 'התנהגות רגעית הוגדרה כ״מי שאני/מי שהוא״.',
        challengeQuestion: 'מה הוא/אתה עושה בפועל שמוביל לזה, במקום מי הוא?'
    },
    {
        key: 'GLOBAL_RULE',
        label: 'הכללה גורפת',
        emoji: '🌐',
        hiddenAssumption: 'המשפט הופך אירוע מסוים לחוק גורף.',
        challengeQuestion: 'תמיד? אף פעם? תן מקרה אחד שסותר את זה.'
    }
]);

const WRINKLE_BASE_CARDS = Object.freeze([
    { id: 'wr_001', statement: 'אני לא יכול להוביל פגישה צוות.', foldKey: 'ABSOLUTE_IMPOSSIBLE' },
    { id: 'wr_002', statement: 'הוא בעייתי, אי אפשר לעבוד איתו.', foldKey: 'IDENTITY_LOCK' },
    { id: 'wr_003', statement: 'אני חייב להסכים, אחרת הכול יתפרק.', foldKey: 'NO_CHOICE' },
    { id: 'wr_004', statement: 'אני תמיד הורס שיחות חשובות.', foldKey: 'GLOBAL_RULE' },
    { id: 'wr_005', statement: 'אין לי ברירה, אני חייב לענות לכל הודעה מייד.', foldKey: 'NO_CHOICE' },
    { id: 'wr_006', statement: 'אני לא יכול להשתנות בכלל.', foldKey: 'ABSOLUTE_IMPOSSIBLE' },
    { id: 'wr_007', statement: 'היא פשוט אגואיסטית, זה מה שהיא.', foldKey: 'IDENTITY_LOCK' },
    { id: 'wr_008', statement: 'כולם מזלזלים בי כל הזמן.', foldKey: 'GLOBAL_RULE' },
    { id: 'wr_009', statement: 'אי אפשר להירגע לפני שמסיימים הכול.', foldKey: 'ABSOLUTE_IMPOSSIBLE' },
    { id: 'wr_010', statement: 'אני מוכרח להיות מושלם בכל משימה.', foldKey: 'NO_CHOICE' },
    { id: 'wr_011', statement: 'אני כישלון כשאני מתבלבל מול אנשים.', foldKey: 'IDENTITY_LOCK' },
    { id: 'wr_012', statement: 'אף פעם לא מצליח לי בזמן.', foldKey: 'GLOBAL_RULE' }
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
        setWrinkleFeedback('אין כרגע כרטיסים זמינים לתרגול.', 'warn');
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
        setWrinkleFeedback('שלב 1: חשפו את ההנחה הסמויה, ורק אחר כך עברו לשאלת אתגור.', 'info');
    } else {
        setWrinkleFeedback('הכרטיסים הבאים מתוזמנים לעתיד. מבצעים חיזוק יזום.', 'warn');
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
            ? 'שלב 1/2: חשיפת הקמט'
            : 'שלב 2/2: בחירת שאלת האתגור';
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
        setWrinkleFeedback(`מעולה. נחשף הקמט: ${fold?.hiddenAssumption || ''} עכשיו בחר/י שאלת אתגור.`, 'success');
        playUISound('correct');
        wrinkleGameState.phase = 'challenge';
        renderWrinkleRound();
        return;
    }

    wrinkleGameState.exposeFirstTry = false;
    button.disabled = true;
    button.classList.add('is-wrong');
    const fold = getWrinkleFoldByKey(card.foldKey);
    setWrinkleFeedback(`עדיין לא. רמז: ${fold?.hiddenAssumption || 'חפש/י את ההנחה שלא נאמרה במפורש.'}`, 'warn');
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
    setWrinkleFeedback(`כמעט. שאלת העוגן המדויקת כאן: "${fold?.challengeQuestion || ''}"`, 'warn');
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
            `נחשף הקמט אחרי תיקון. השאלה הנכונה: "${fold?.challengeQuestion || ''}". נחזור לזה בעוד ${WRINKLE_GAME_RETRY_MINUTES} דקות.`,
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
            ? `${Math.round(nextHours / 24)} ימים`
            : `${nextHours} שעות`;

        setWrinkleFeedback(
            `קרעת את הקמט! "${fold?.challengeQuestion || ''}" נשמר להרגל אוטומטי. חזרה הבאה בעוד ${waitLabel}.`,
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
    const brickChars = ['🧱', '🧩'];
    const confettiChars = ['✨', '🎉', '💥', '🟨', '🟦'];

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
        setWrinkleFeedback('כתבו משפט אישי קצר כדי להוסיף אותו למשחק.', 'warn');
        return;
    }

    const normalizedInput = normalizeText(raw).replace(/\s+/g, ' ').trim();
    const alreadyExists = wrinkleGameState.cards.some(card => normalizeText(card.statement).replace(/\s+/g, ' ').trim() === normalizedInput);

    if (alreadyExists) {
        setWrinkleFeedback('המשפט הזה כבר קיים בתרגול. נסו ניסוח אחר.', 'warn');
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
    setWrinkleFeedback(`נוסף משפט אישי עם קמט משוער: ${fold?.label || 'כללי'}.`, 'success');
    playUISound('next');

    saveWrinkleGameState();
    renderWrinkleSelfList();
    updateWrinkleScoreboard();
}

function detectWrinkleFoldFromText(text) {
    const normalized = normalizeText(text);

    if (/(לא יכול|אי אפשר|אין מצב|בלתי אפשרי|בחיים לא)/.test(normalized)) {
        return 'ABSOLUTE_IMPOSSIBLE';
    }

    if (/(חייב|צריך|מוכרח|אין ברירה|אסור לי לא)/.test(normalized)) {
        return 'NO_CHOICE';
    }

    if (/(תמיד|אף פעם|כולם|כל הזמן|אף אחד)/.test(normalized)) {
        return 'GLOBAL_RULE';
    }

    if (/(אני .*כישלון|אני .*דפוק|הוא .*בעייתי|היא .*בעייתית|הוא .*עצלן|היא .*עצלנית|אני .*לא יוצלח)/.test(normalized)) {
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
        empty.textContent = 'עדיין לא הוזן משפט אישי.';
        list.appendChild(empty);
        return;
    }

    selfCards.forEach(card => {
        const fold = getWrinkleFoldByKey(card.foldKey);
        const row = document.createElement('li');
        row.textContent = `“${card.statement}” → ${fold?.label || 'קמט כללי'}`;
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
        alert('אין משפטים זמינים בקטגוריה זו');
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
    
    answerText.textContent = `🎯 ${statement.suggested_question}`;
    answerExplanation.textContent = `💡 ${statement.explanation} | קטגוריה: ${statement.violation}`;
    
    answerBox.classList.remove('hidden');
}

// Show Hint
function showHint() {
    const categorySelect = document.getElementById('category-select');
    const selectedCategory = categorySelect.value;
    
    let filteredStatements = metaModelData.practice_statements;
    
    if (selectedCategory) {
        filteredStatements = filteredStatements.filter(s => s.category === getCategoryName(selectedCategory));
    }
    
    if (filteredStatements.length === 0) return;
    
    const statement = filteredStatements[currentStatementIndex];
    
    const hints = {
        'DELETION': '🔍 מחפשים את המידע החסר - מי? מה? לפי מי?',
        'DISTORTION': '🔄 מחפשים את השינוי או ההנחה - מה כאן לא בדיוק? מה מוכן?',
        'GENERALIZATION': '📈 מחפשים את ההכללה - באמת תמיד? באמת אף פעם?'
    };
    
    const difficultyHint = {
        'easy': 'הפרה זו לא כל כך מורכבת - חשוב על פרטים כופים',
        'medium': 'זו הפרה מעט יותר מסובכת - חשוב לעומק יותר',
        'hard': 'זו הפרה מסובכת - זקוק להרבה כדי לפרוק אותה'
    };
    
    alert(`טיפ:\n\n${hints[statement.category] || ''}\n\nרמת קשיות: ${difficultyHint[statement.difficulty]}`);
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
            showHintMessage('בחר קטגוריה תחילה!');
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
        <p><strong>איך עובד תרגול מחיקה (6 אפשרויות)?</strong></p>
        <p>בכל שאלה תקבל/י 6 אפשרויות: 3 שאלות שאינן מחיקה, ו-3 שאלות מחיקה בניסוחים שונים.</p>
        <p><strong>המטרה שלך:</strong> לבחור את שאלת המחיקה שחושפת את המידע החסר הכי משמעותי להקשר.</p>
        <p><strong>דירוג איכות בתוך שאלות המחיקה:</strong></p>
        <ul>
            <li>רמה גבוהה: חושפת מידע חסר קריטי שמאפשר פעולה מיידית.</li>
            <li>רמה בינונית: מחיקה נכונה אבל פחות מרכזית להתקדמות.</li>
            <li>רמה נמוכה: מחיקה כללית שלא תורמת מספיק לפתרון.</li>
        </ul>
        <p><strong>טיפ עבודה:</strong> לפני בחירה שאל/י מה חסר כאן כדי להבין מה באמת נדרש, מי מעורב, ולפי איזה קריטריון.</p>
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
        showHintMessage('אין משפטים לקטגוריה זו');
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
    const modeLabel = trainerState.reviewMode ? 'Review Loop' : 'ריצה ראשית';
    noteEl.textContent = `${modeLabel} | נשארו ${Math.max(remaining, 0)} שאלות | נענו: ${Math.max(answeredCount, 0)} | דולגו: ${trainerState.phaseSkippedCount}`;
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
            questionTextEl.textContent = `מטרת השאלה: לזהות את המידע החסר הכי משמעותי במשפט.\n\n${question.statement}`;
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
                            <small class="option-purpose"><strong>מטרה:</strong> ${escapeHtml(option.purpose)}</small>
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

    let highQuestion = question?.suggested_question || 'מה בדיוק חסר כאן כדי להבין את המשפט?';
    let mediumQuestion = 'איזה פרט חסר כאן שיכול לעזור להבין טוב יותר?';
    let lowQuestion = 'יש עוד משהו להוסיף?';

    if (subtype.includes('comparative')) {
        highQuestion = 'לעומת מי/מה, ובאיזה מדד מדויק ההשוואה נעשית?';
        mediumQuestion = 'באיזה הקשר ההשוואה הזו נכונה?';
        lowQuestion = 'אפשר לתת עוד דוגמה להשוואה?';
    } else if (subtype.includes('referential')) {
        highQuestion = 'מי בדיוק אמר/קבע/חושב את זה, ואיזה מקור יש לכך?';
        mediumQuestion = 'על אילו אנשים או גורמים מדובר כאן?';
        lowQuestion = 'יש עוד מישהו שקשור לזה?';
    } else if (subtype.includes('simple')) {
        highQuestion = 'מה בדיוק לא טוב, לפי מי, ובאיזה קריטריון זה נמדד?';
        mediumQuestion = 'מתי זה קורה ובאיזה מצב זה בולט יותר?';
        lowQuestion = 'אפשר לפרט קצת יותר?';
    }

    if (statement.includes('יותר') || statement.includes('פחות')) {
        highQuestion = 'יותר/פחות ביחס למה בדיוק, ובאיזו יחידת מדידה?';
    }
    if (statement.includes('כולם') || statement.includes('ידוע')) {
        mediumQuestion = 'מי בדיוק \"כולם\", ומי מחוץ לקבוצה הזו?';
    }

    const options = [
        {
            id: 'D1',
            focus: 'DELETION',
            quality: 'high',
            purpose: 'לחשוף את המידע החסר הקריטי שמאפשר להתקדם בפועל',
            questionText: highQuestion,
            why: 'מכוונת למידע שחסר באמת להקשר ולביצוע.'
        },
        {
            id: 'D2',
            focus: 'DELETION',
            quality: 'medium',
            purpose: 'לחשוף מחיקה אמיתית אבל פחות מרכזית',
            questionText: mediumQuestion,
            why: 'שאלה טובה, אך לא תמיד הפער הכי משמעותי במשפט.'
        },
        {
            id: 'D3',
            focus: 'DELETION',
            quality: 'low',
            purpose: 'לחשוף מחיקה כללית אך תרומה נמוכה לפתרון',
            questionText: lowQuestion,
            why: 'שאלה כללית מדי, לא ממקדת את המידע החסר הקריטי.'
        },
        {
            id: 'N1',
            focus: 'DISTORTION',
            quality: 'offtrack',
            purpose: 'בדיקת פרשנות/סיבתיות (לא מחיקה)',
            questionText: 'איך אתה יודע שזה נכון ומה ההוכחה לכך?',
            why: 'זו שאלה על עיוות ולא על מידע חסר.'
        },
        {
            id: 'N2',
            focus: 'GENERALIZATION',
            quality: 'offtrack',
            purpose: 'בדיקת הכללה גורפת (לא מחיקה)',
            questionText: 'זה תמיד קורה, או שיש מקרים שזה אחרת?',
            why: 'זו שאלה על הכללה, לא על השמטת פרטים.'
        },
        {
            id: 'N3',
            focus: 'NON_DELETION',
            quality: 'offtrack',
            purpose: 'קפיצה לפתרון בלי למפות מידע חסר',
            questionText: 'מה כדאי לעשות עכשיו כדי לפתור את זה מהר?',
            why: 'שאלת פתרון מוקדם בלי לחשוף קודם את המידע החסר.'
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
            title: 'לא מדויק',
            message: 'נבחרה שאלה שלא מחפשת השמטה. כאן המטרה היא מחיקה בלבד.',
            ranked
        };
    }

    if (choice.quality === 'high') {
        return {
            state: 'best',
            xpGain: baseXp,
            countsAsCorrect: true,
            title: 'מצוין - זו המחיקה הכי משמעותית',
            message: 'בחרת את השאלה שמחזירה את המידע החסר הקריטי ביותר להקשר.',
            ranked
        };
    }

    if (choice.quality === 'medium') {
        return {
            state: 'partial',
            xpGain: Math.max(2, Math.floor(baseXp * 0.5)),
            countsAsCorrect: false,
            title: 'כיוון נכון חלקית',
            message: 'זו שאלה שמאתרת מחיקה, אבל לא את ההשמטה הכי משמעותית במשפט.',
            ranked
        };
    }

    return {
        state: 'weak',
        xpGain: 1,
        countsAsCorrect: false,
        title: 'זו מחיקה, אבל לא מועילה מספיק',
        message: 'השאלה כללית מדי ולכן לא מקדמת הבנה או פעולה בצורה טובה.',
        ranked
    };
}

function showTrainerRewardEffect(starGain, result = 'fail') {
    const fx = document.getElementById('trainer-reward-fx');
    const display = document.getElementById('question-display');
    if (!fx || !display || starGain <= 0) return;

    const mainText = `+${starGain} ⭐`;
    const subtitle = result === 'success'
        ? 'בונוס הצלחה!'
        : result === 'partial'
            ? 'כיוון טוב, ממשיכים'
            : 'לומדים גם מזה';

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
            <small><strong>למה:</strong> ${escapeHtml(item.why || '')}</small>
        </li>
    `).join('');

    const selectedText = selectedChoice?.questionText || 'לא זוהתה בחירה';
    const boxClass = evaluation.state === 'best' ? 'correct' : 'incorrect';

    feedbackContent.innerHTML = `
        <div class="${boxClass}">
            <strong>${escapeHtml(evaluation.title || '')}</strong>
            <p class="explanation">
                <strong>מטרת השאלה כאן:</strong> לאתר את המידע החסר המשמעותי ביותר בהשמטה.<br>
                <strong>הבחירה שלך:</strong> ${escapeHtml(selectedText)}<br>
                <strong>משוב:</strong> ${escapeHtml(evaluation.message || '')}
            </p>
            <p class="explanation"><strong>דירוג 3 שאלות המחיקה בשאלה הזו:</strong></p>
            <ol class="deletion-rank-list">${rankedHtml}</ol>
            <p style="margin-top: 12px; color: #2f855a; font-weight: bold;">+${evaluation.xpGain} XP</p>
            <p style="margin-top: 6px; color: #805ad5; font-weight: bold;">+${starGain} ⭐</p>
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
    const violationName = question.violation || question.subcategory || 'לא צוין';

    let feedbackHTML = '';
    if (isCorrect) {
        feedbackHTML = `
            <div class="correct">
                <strong>✅ נכון!</strong>
                <p class="explanation">
                    <strong>קטגוריה:</strong> ${correctLabel}<br>
                    <strong>סוג הפרה:</strong> ${violationName}<br>
                    <strong>שאלת עומק מוצעת:</strong> "${question.suggested_question}"<br>
                    <strong>הסבר:</strong> ${question.explanation}
                </p>
                <p style="margin-top: 15px; color: #28a745; font-weight: bold;">+${xpGain} XP</p>
                <p style="margin-top: 6px; color: #805ad5; font-weight: bold;">+${starGain} ⭐</p>
            </div>
        `;
    } else {
        feedbackHTML = `
            <div class="incorrect">
                <strong>❌ לא נכון</strong>
                <p class="explanation">
                    <strong>בחרת:</strong> ${selectedLabel}<br>
                    <strong>התשובה הנכונה:</strong> ${correctLabel}<br>
                    <strong>סוג הפרה:</strong> ${violationName}<br>
                    <strong>שאלת עומק מוצעת:</strong> "${question.suggested_question}"<br>
                    <strong>הסבר:</strong> ${question.explanation}
                </p>
                <p style="margin-top: 12px; color: #744210; font-weight: bold;">+${starGain} ⭐ על הלמידה</p>
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
            hintHtml = '<p><strong>רמז 1/3:</strong> חפש/י מה חסר כדי להבין את המשפט ברמת ביצוע, לא רק ברמת ניסוח.</p>';
        } else if (trainerState.hintLevel === 2) {
            hintHtml = '<p><strong>רמז 2/3:</strong> בין 3 שאלות המחיקה, בחר/י את זו שמחזירה קריטריון/גורם/מדד שמאפשרים פעולה.</p>';
        } else {
            hintHtml = `<p><strong>רמז 3/3:</strong> שאלת מחיקה חזקה בדרך כלל כוללת: <em>מי בדיוק / מה בדיוק / לפי איזה קריטריון</em>.</p><p>דוגמה: "${escapeHtml(question.suggested_question || '')}"</p>`;
        }
        setPanelContent('hint-display', hintHtml);
        playUISound('hint');
        return;
    }

    trainerState.hintLevel = Math.min(trainerState.hintLevel + 1, 3);

    const categoryHint = {
        DELETION: 'בדוק מה חסר במשפט: מי? מה? מתי? לפי מה?',
        DISTORTION: 'בדוק איפה יש הנחה או קשר סיבה-תוצאה שלא הוכח.',
        GENERALIZATION: 'בדוק מילים מוחלטות כמו תמיד/אף פעם/כולם/אי אפשר.'
    }[categoryKey] || 'בדוק איזו מילה במשפט סוגרת אפשרויות.';

    const triggerWords = ['תמיד', 'אף פעם', 'כולם', 'חייב', 'לא יכול', 'גרם לי', 'יודע ש', 'ברור ש']
        .filter(word => statementText.includes(word));
    const triggerLine = triggerWords.length
        ? `מילות טריגר במשפט: ${triggerWords.join(', ')}`
        : 'נסה לזהות מילה שמקבעת מסקנה בלי פירוט.';

    let hintHtml = '';
    if (trainerState.hintLevel === 1) {
        hintHtml = `<p><strong>רמז 1/3:</strong> ${categoryHint}</p>`;
    } else if (trainerState.hintLevel === 2) {
        hintHtml = `<p><strong>רמז 2/3:</strong> ${triggerLine}</p><p>עכשיו נסח שאלה קצרה שתפרק את ההנחה.</p>`;
    } else {
        hintHtml = `<p><strong>רמז 3/3:</strong> הקטגוריה היא <strong>${TRAINER_CATEGORY_LABELS[categoryKey] || categoryKey}</strong>.</p><p>שאלה מוצעת: "${question.suggested_question}"</p>`;
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
            <p><strong>מטרת השאלה כאן:</strong></p>
            <p>לא רק לזהות שיש מחיקה, אלא לבחור את שאלת המחיקה שחושפת את המידע החסר הכי משמעותי להבנה ולפעולה.</p>
            <p><strong>איך מודדים איכות?</strong></p>
            <ul>
                <li>גבוה: מחזיר פרט קריטי שחסר להחלטה/ביצוע.</li>
                <li>בינוני: שאלה נכונה על מחיקה, אבל פחות ממוקדת במה שיקדם תוצאה.</li>
                <li>נמוך: שאלה כללית מדי, כמעט בלי תרומה פרקטית.</li>
            </ul>
            <p><strong>בדיקה עצמית קצרה:</strong> האם השאלה שבחרת מוסיפה מידע שאפשר לעבוד איתו מיד?</p>
        `);
        playUISound('hint');
        return;
    }

    const importanceText = {
        DELETION: 'כשמידע נמחק, המסקנה נבנית על חוסר נתונים. השאלה מחזירה פרטים הכרחיים.',
        DISTORTION: 'כשיש עיוות, פירוש הופך לעובדה. השאלה מפרידה בין פרשנות למציאות.',
        GENERALIZATION: 'כשיש הכללה, מקרה אחד הופך לחוק. השאלה פותחת יותר אפשרויות תגובה.'
    }[categoryKey] || 'השאלה מחזירה דיוק ומאפשרת תגובה טובה יותר.';

    setPanelContent('why-display', `
        <p><strong>למה זה חשוב בשאלה הזו?</strong></p>
        <p>${importanceText}</p>
        <p><strong>מה המטרה כאן?</strong> להפוך אמירה כללית למידע מדויק שאפשר לעבוד איתו.</p>
    `);
    playUISound('hint');
}

function showTrainerDepth() {
    if (trainerState.currentQuestion >= trainerState.questions.length) return;
    const question = trainerState.questions[trainerState.currentQuestion];

    if (trainerState.deletionCoachMode) {
        setPanelContent('depth-display', `
            <p><strong>מסגרת פתרון למחיקה (6 אפשרויות):</strong></p>
            <ul>
                <li>שלב 1: זהה מה חסר במשפט כדי להבין את ההקשר בפועל.</li>
                <li>שלב 2: סנן 3 אפשרויות שאינן מחיקה.</li>
                <li>שלב 3: בין 3 שאלות המחיקה, דרג לפי תרומה: גבוהה, בינונית, נמוכה.</li>
                <li>שלב 4: בחר את השאלה שמחזירה מידע מדיד/בר-בדיקה/מכוון פעולה.</li>
            </ul>
            <p><strong>מטרת השאלה:</strong> חשיפת המידע החסר המשמעותי ביותר, לא רק \"עוד פירוט\".</p>
            <p><strong>דוגמת מחיקה חזקה:</strong> "${escapeHtml(question.suggested_question || '')}"</p>
        `);
        playUISound('hint');
        return;
    }

    const depthTrack = {
        easy: ['שלב 1: זהה מילה בעייתית.', 'שלב 2: שאל מה חסר.', 'שלב 3: נסח שאלה אחת מדויקת.'],
        medium: ['שלב 1: זהה הנחה סמויה.', 'שלב 2: בדוק ראיות.', 'שלב 3: נסח חלופה מדויקת.'],
        hard: ['שלב 1: זהה דפוס שפה.', 'שלב 2: מפה E/B/C/V/I/S בקצרה.', 'שלב 3: בחר Small Win להתקדמות.']
    }[question.difficulty] || ['שלב 1: זהה דפוס.', 'שלב 2: שאל מה חסר.', 'שלב 3: בנה שאלה מדויקת.'];

    setPanelContent('depth-display', `
        <p><strong>עומק מומלץ לשאלה:</strong></p>
        <ul>${depthTrack.map(step => `<li>${step}</li>`).join('')}</ul>
        <p><strong>דוגמת שאלה:</strong> "${question.suggested_question}"</p>
    `);
    playUISound('hint');
}

function skipCurrentQuestion() {
    if (trainerState.currentQuestion >= trainerState.questions.length) return;
    const question = trainerState.questions[trainerState.currentQuestion];
    trainerState.phaseSkippedCount++;
    addQuestionToReviewPool(question);
    showHintMessage('דילגת לשאלה הבאה');
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
        message = 'מושלם! כל התשובות נכונות';
    } else if (successRate >= 80) {
        message = 'מעולה! רמת דיוק גבוהה מאוד';
    } else if (successRate >= 60) {
        message = 'טוב מאוד, עוד חידוד קטן ואתה שם';
    } else {
        message = 'התחלה טובה, ממשיכים לתרגול נוסף';
    }

    feedbackContent.innerHTML = `
        <div class="correct" style="text-align: center;">
            <h2>${message}</h2>
            <p style="font-size: 1.05em;">
                <strong>ציון סופי:</strong> ${trainerState.correctCount} / ${trainerState.questions.length}<br>
                <strong>קצב הצלחה:</strong> ${successRate}%<br>
                <strong>XP שהרווחת:</strong> +${trainerState.sessionXP}<br>
                <strong>דילוגים:</strong> ${trainerState.skippedCount}
            </p>
            <button class="btn btn-primary" onclick="resetTrainer()" style="margin-top: 20px; width: 100%;">תרגול נוסף →</button>
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
                <h2>סיימת את הסשן הראשי</h2>
                <p style="font-size: 1.02em;">
                    <strong>ציון ראשי:</strong> ${mainCorrect} / ${mainTotal} (${mainRate}%)<br>
                    <strong>XP שנצבר:</strong> +${trainerState.sessionXP}<br>
                    <strong>שאלות לחיזוק:</strong> ${weakCount}
                </p>
                <p style="margin-top: 12px; color: #2c5282; font-weight: 700;">Review Loop מוכן עבורך עם השאלות שדורשות חיזוק.</p>
                <button class="btn btn-primary" onclick="startReviewLoop()" style="margin-top: 12px; width: 100%;">התחל Review Loop</button>
                <button class="btn btn-secondary" onclick="finishTrainerSession()" style="margin-top: 10px; width: 100%;">סיים בלי Review</button>
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

    showHintMessage(`Review Loop התחיל: ${reviewQuestions.length} שאלות לחיזוק`);
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
        message = 'חזק מאוד. סגרת פינות קריטיות ב-Review Loop';
    } else if (mainRate === 100) {
        message = 'מושלם! כל התשובות נכונות';
    } else if (mainRate >= 80) {
        message = 'מעולה! רמת דיוק גבוהה מאוד';
    } else if (mainRate >= 60) {
        message = 'טוב מאוד, עוד חידוד קטן ואתה שם';
    } else {
        message = 'התחלה טובה, ממשיכים לתרגול נוסף';
    }

    const reviewLine = reviewTotal
        ? `<strong>Review Loop:</strong> ${reviewCorrect} / ${reviewTotal} (${reviewRate}%)<br>`
        : '';

    feedbackContent.innerHTML = `
        <div class="correct" style="text-align: center;">
            <h2>${message}</h2>
            <p style="font-size: 1.05em;">
                <strong>ציון ריצה ראשית:</strong> ${mainCorrect} / ${mainTotal} (${mainRate}%)<br>
                ${reviewLine}
                <strong>XP שהרווחת:</strong> +${trainerState.sessionXP}<br>
                <strong>דילוגים:</strong> ${trainerState.mainSkippedCount}
            </p>
            <button class="btn btn-primary" onclick="resetTrainer()" style="margin-top: 20px; width: 100%;">תרגול נוסף →</button>
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
        showHint('לא הצלחנו לטעון את סצנות ה-Scenario Trainer');
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
        : ['להתאבד', 'לפגוע בעצמי', 'למות', 'suicide', 'kill myself', 'self harm'];
    return keywords.some(keyword => value.includes(String(keyword).toLowerCase()));
}

function lockScenarioFlowForSafety() {
    scenarioTrainer.safetyLocked = true;
    scenarioTrainer.session = null;
    scenarioTrainer.activeScenario = null;
    scenarioTrainer.selectedOption = null;
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

    const domainOptions = [{ id: 'all', label: 'כל התחומים' }, ...scenarioTrainerData.domains];
    const difficultyOptions = [{ id: 'all', label: 'כל הרמות' }, ...scenarioTrainerData.difficulties];

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
        `סה"כ סצנות: ${completed}`,
        `אחוז ירוק: ${successRate}%`,
        `רצף שיא: ${bestStreak}`,
        `כוכבים: ${stars}`
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
        showHint('אין סצנות זמינות כרגע');
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
        { id: 'A', emoji: '😡', text: 'מה הבעיה איתך? אתה עצלן.', type: 'red_identity_blame', score: 0, feedback: 'מאשים זהות במקום למפות חסר.' },
        { id: 'B', emoji: '🙄', text: 'בגילך כבר הייתי יודע לעשות את זה.', type: 'red_comparison_shame', score: 0, feedback: 'השוואה מעלה בושה ומורידה פתרון.' },
        { id: 'C', emoji: '🥴', text: 'עזוב, אני אעשה את זה במקום.', type: 'red_overtake', score: 0, feedback: 'לקיחת משימה במקומך מונעת למידה.' },
        { id: 'D', emoji: '😬', text: 'כן כן, אחר כך נטפל בזה.', type: 'red_avoid_pretend', score: 0, feedback: 'דחייה בלי פירוק מגדילה תקיעות.' }
    ]).slice(0, 4);

    const greenTemplate = scenarioTrainerData.optionTemplates?.green || {
        id: 'E',
        emoji: '✅🙂',
        text: 'בוא נפרק: מה ניסית? איפה נתקעת? מה הצעד הראשון?',
        type: 'green_meta_model',
        score: 1,
        feedback: 'מפרק הוראה עמומה לצעדים ניתנים לביצוע.'
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
        showHint('נתוני הסצנות עדיין לא נטענו');
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
        showHint('לא נמצאו סצנות למסנן שבחרת');
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
    const roleLabel = scenario?.expectation?.speaker || scenario?.role || 'דובר';

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
    if (roleEl) roleEl.textContent = `תפקיד: ${roleLabel}`;
    if (titleEl) titleEl.textContent = scenario.title || 'סצנה';
    if (unspecifiedEl) unspecifiedEl.textContent = `נו, פשוט ${scenario.unspecifiedVerb || 'תעשה את זה'}`;

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
        mark.textContent = isGreen ? '✓' : 'X';
        mark.className = `scenario-feedback-mark ${isGreen ? 'success' : 'fail'}`;
        // Restart animation each feedback screen.
        void mark.offsetWidth;
        mark.classList.add('animate');
    }
    if (title) title.textContent = isGreen ? 'תגובה ירוקה: פירוק לתהליך' : 'תגובה אדומה: האשמה/התחמקות';
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
            icon: '🛠️',
            title: 'מה קורה אחרי בחירה ירוקה?',
            action: 'שואלים שאלת פירוק במקום להאשים.',
            result: 'המשימה הופכת לצעד ראשון שאפשר לבצע.'
        };
    }

    return {
        icon: '💥',
        title: 'מה קורה אם ממשיכים בדרך הישנה?',
        action: 'ממשיכים לנחש/להאשים בלי לבדוק מה נתקע.',
        result: 'המשימה נתקעת, הלחץ עולה, ולעיתים נוצרת תקלה אמיתית.'
    };
}

function renderScenarioConsequence(option, isGreen, box, titleEl, actionEl, resultEl) {
    if (!box || !titleEl || !actionEl || !resultEl) return;

    const consequence = resolveScenarioConsequence(option, isGreen);
    box.classList.remove('hidden', 'red', 'green');
    box.classList.add(isGreen ? 'green' : 'red');
    titleEl.textContent = `${consequence.icon || ''} ${consequence.title || ''}`.trim();
    actionEl.innerHTML = `<strong>מה קורה מיד אחרי זה:</strong> ${consequence.action || ''}`;
    resultEl.innerHTML = `<strong>התוצאה בפועל:</strong> ${consequence.result || ''}`;
}

function getScenarioGreenOptionText(scenario) {
    if (!scenario) return '';
    const green = getScenarioOptions(scenario).find(opt => String(opt.type).includes('green'));
    return green?.text || '';
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
            q.innerHTML = `<strong>שאלת Meta:</strong> ${item.question || ''}`;
            const ex = document.createElement('p');
            ex.innerHTML = `<strong>דוגמה:</strong> ${item.example || ''}`;
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
        showHint('המשפט הירוק הועתק');
    } catch (error) {
        console.error('Copy failed', error);
        showHint('לא הצלחנו להעתיק. אפשר להעתיק ידנית.');
    }
}

function buildScenarioHistoryEntry(note = '') {
    const scenario = scenarioTrainer.activeScenario;
    const option = scenarioTrainer.selectedOption;
    if (!scenario || !option) return null;

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
    const starVisual = '⭐'.repeat(scenarioTrainer.session.stars) + '☆'.repeat(Math.max(playedCount - scenarioTrainer.session.stars, 0));

    if (starsRow) starsRow.textContent = starVisual || '☆☆☆☆☆';
    if (scoreLine) {
        scoreLine.textContent = `סיימת סצנה ${playedCount}/${scenarioTrainer.session.queue.length}. נקודות סשן: ${scenarioTrainer.session.score}`;
    }
    if (greenLine) greenLine.textContent = `בפעם הבאה: "${entry.greenSentence}"`;
    if (summaryBox) {
        const hasGoal = Boolean(entry.goalGeneral);
        const hasMetric = Boolean(entry.successMetric);
        summaryBox.classList.toggle('hidden', !hasGoal && !hasMetric);
        if (goalEl) goalEl.textContent = entry.goalGeneral || 'לא הוגדר';
        if (metricEl) metricEl.textContent = entry.successMetric || 'לא הוגדר';
    }

    const isLast = scenarioTrainer.session.index >= scenarioTrainer.session.queue.length - 1;
    if (nextBtn) nextBtn.textContent = isLast ? 'סיום סשן וחזרה לבית' : 'המשך לסצנה הבאה';

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
        showHint('סשן הושלם. המשך מעולה!');
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
        empty.textContent = 'עדיין אין היסטוריה. שחק/י סצנה ראשונה כדי להתחיל.';
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
        const scoreBadge = entry.score ? '✓ ירוק' : 'X אדום';
        const date = new Date(entry.timestamp).toLocaleString('he-IL');
        meta.textContent = `${scoreBadge} | ${entry.selectedOptionText} | ${date}`;

        card.appendChild(title);
        card.appendChild(meta);

        if (entry.note) {
            const note = document.createElement('p');
            note.className = 'meta';
            note.textContent = `הערה: ${entry.note}`;
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
    const ok = window.confirm('לנקות את כל היסטוריית הסצנות?');
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
    showHint('הגדרות Scenario נשמרו');
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
        path: 'assets/svg/comics/scenes/עבודה_מצגת.svg'
    },
    {
        key: 'bureaucracy_form',
        title: 'Bureaucracy: Form',
        subtitle: 'Translate vague instructions into clear steps.',
        path: 'assets/svg/comics/scenes/ביורוקרטיה_טופס.svg'
    },
    {
        key: 'bureaucracy_money',
        title: 'Bureaucracy: Arnona',
        subtitle: 'Resolve billing flow and required details.',
        path: 'assets/svg/comics/scenes/כסף_ארנונה.svg'
    },
    {
        key: 'parenting_homework',
        title: 'Parenting: Homework',
        subtitle: 'Break down what to do first and what is missing.',
        path: 'assets/svg/comics/scenes/הורות_שיעורים.svg'
    },
    {
        key: 'relationships_apology',
        title: 'Relationships: Apology',
        subtitle: 'From blame to specific repair steps.',
        path: 'assets/svg/comics/scenes/זוגיות_סליחה.svg'
    },
    {
        key: 'home_tech_cleanup',
        title: 'Home Tech: Cleanup',
        subtitle: 'Technical task with explicit execution steps.',
        path: 'assets/svg/comics/scenes/טכני_ניקוי_קבצים.svg'
    },
    {
        key: 'cooking_lasagna',
        title: 'Cooking: Lasagna',
        subtitle: 'Process thinking for everyday routines.',
        path: 'assets/svg/comics/scenes/בישול_לזניה.svg'
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
    practice: ['parenting_homework', 'home_tech_cleanup', 'bureaucracy_form'],
    blueprint: ['work_presentation', 'cooking_lasagna', 'bureaucracy_form'],
    prismlab: ['home_tech_cleanup', 'relationships_apology', 'bureaucracy_form'],
    about: ['work_presentation', 'relationships_apology', 'cooking_lasagna']
};
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
    title.textContent = scene.title || 'תצוגת קומיקס';
    subtitle.textContent = scene.subtitle || '';

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function setupGlobalComicStripActions() {
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
    previewBtn.setAttribute('aria-label', `תצוגה: ${selected.title}`);
    practiceBtn.setAttribute('aria-label', `מעבר לתרגול: ${selected.title}`);

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
        angry: 'הטון עולה, השיחה נסגרת, ונוצרת יותר התנגדות.',
        mock: 'נוצרת בושה והצד השני מפסיק לשתף מידע אמיתי.',
        rescue: 'הבעיה נפתרת רגעית, אבל היכולת של הצד השני לא נבנית.',
        avoid: 'התקיעות נדחית וחוזרת אחר כך עם יותר לחץ.',
        meta: 'העמימות יורדת והופכת לתהליך שאפשר לבצע.'
    };
    return map[choiceId] || 'בחירה זו משנה את הכיוון של הסצנה.';
}

function buildComicBlueprintHtml(blueprint) {
    if (!blueprint) return '';

    const toList = (items) => (items || [])
        .map(item => `<li>${escapeHtml(item)}</li>`)
        .join('');

    return `
        <div class="blueprint">
            <h3>Blueprint (פירוק פעולה)</h3>
            <div><b>מטרה:</b> ${escapeHtml(blueprint.goal || '')}</div>
            <div><b>צעד ראשון:</b> ${escapeHtml(blueprint.first_step || '')}</div>
            <div><b>צעד אחרון:</b> ${escapeHtml(blueprint.last_step || '')}</div>

            <div style="margin-top:8px"><b>שלבי ביניים:</b></div>
            <ul>${toList(blueprint.middle_steps)}</ul>

            <div style="margin-top:8px"><b>תנאים מקדימים:</b></div>
            <ul>${toList(blueprint.preconditions)}</ul>

            <div style="margin-top:8px"><b>אלטרנטיבות כשנתקעים:</b></div>
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
        els.title.textContent = 'שגיאה בטעינת סצנות קומיקס';
        if (els.meta) els.meta.textContent = '';
        return;
    }

    const scenarios = Array.isArray(payload?.scenarios) ? payload.scenarios : [];
    if (!scenarios.length) {
        els.title.textContent = 'אין סצנות קומיקס כרגע';
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
        els.compactToggle.textContent = prefs.compact ? 'תצוגה מלאה' : 'מצב קומפקטי';
    };

    const renderQuickParams = (scenario) => {
        if (!els.quickParams || !scenario) return;

        const dialogCount = Array.isArray(scenario.dialog) ? scenario.dialog.length : 0;
        const choicesCount = Array.isArray(scenario.choices) ? scenario.choices.length : 0;
        const metaChoice = (scenario.choices || []).find(choice => choice?.id === 'meta');
        const goal = metaChoice?.blueprint?.goal || '';

        const chips = [
            `<span class="comic-param-chip"><b>תחום</b> ${escapeHtml(scenario.domain || 'לא צוין')}</span>`,
            `<span class="comic-param-chip"><b>דיאלוג</b> ${dialogCount} שורות</span>`,
            `<span class="comic-param-chip"><b>אפשרויות</b> ${choicesCount}</span>`,
            `<span class="comic-param-chip"><b>תצוגה</b> ${prefs.compact ? 'קומפקטית' : 'רגילה'}</span>`
        ];

        if (goal) {
            chips.push(`<span class="comic-param-chip"><b>מטרה</b> ${escapeHtml(goal)}</span>`);
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

        els.title.textContent = scenario.title || 'סצנה';
        if (els.meta) els.meta.textContent = `תחום: ${scenario.domain || 'לא צוין'}`;
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
                <div style="color:#6B7280;font-weight:900;margin-bottom:6px">התגובה שלך</div>
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
            'assets/svg/characters/דניאל.svg',
            'assets/svg/characters/לירון.svg',
            'assets/svg/characters/עדן.svg'
        ];
        const calmChar = 'assets/svg/characters/שירי.svg';

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
            ? 'דיאלוג המשך: זה מתחיל לעבוד'
            : 'דיאלוג המשך: מתברר שזה לא עובד';
        const noteFieldId = `comic-note-${String(scenario?.id || 'scene').replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'scene'}`;

        if (els.charRight) {
            els.charRight.innerHTML = buildSpeechCard(rightCharacter, choice.say || '');
        }

        if (els.dialog) {
            els.dialog.innerHTML = `
                <div class="comic-line comic-line-user-turn">
                    <div class="who">מה שנאמר בפועל</div>
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
                <div style="color:#6B7280;font-weight:900;margin-bottom:6px">התגובה שלך</div>
                <div style="font-weight:900">${escapeHtml(choice.say || '')}</div>
                <div style="margin-top:10px; color:#1f2937;">${escapeHtml(outcome)}</div>
            </div>
            <div class="comic-explain-box">
                <label for="${noteFieldId}">למה זה עבד או לא עבד? כתבו הסבר קצר:</label>
                <textarea id="${noteFieldId}" rows="3" placeholder="לדוגמה: מה היה חסר, מה תקע את הצד השני, ומה אפשר לשאול במקום..."></textarea>
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

    const hasQuestionMark = /[?؟]/.test(message);
    if (hasQuestionMark) {
        score += 15;
        strengths.push('נוסח כשאלה ברורה');
    } else {
        tips.push('להוסיף סימן שאלה כדי למסגר בקשה ברורה.');
    }

    const questionWords = ['מה', 'איך', 'למה', 'מתי', 'מי', 'איפה', 'איזה', 'כמה', 'באיזה', 'למי'];
    const hasQuestionWord = questionWords.some(word => message.includes(word));
    if (hasQuestionWord) {
        score += 15;
        strengths.push('יש מילת שאלה ממקדת');
    } else {
        tips.push('להוסיף מילת שאלה ממוקדת (מה/איך/מתי/מי/איזה).');
    }

    if (words.length >= 10) {
        score += 20;
        strengths.push('יש הקשר מספק');
    } else if (words.length >= 6) {
        score += 10;
        tips.push('אפשר להוסיף עוד פרטי הקשר כדי לחדד.');
    } else {
        tips.push('הניסוח קצר מדי, חסרים פרטים משמעותיים.');
    }

    const contextSignals = ['בסיטואציה', 'במצב', 'כש', 'אחרי', 'לפני', 'מול', 'עם', 'בבית', 'בעבודה', 'בכיתה'];
    const hasContext = contextSignals.some(word => message.includes(word));
    if (hasContext) {
        score += 15;
        strengths.push('ההקשר הסיטואציוני ברור');
    } else {
        tips.push('להוסיף איפה/מול מי/מתי זה קורה בפועל.');
    }

    const outcomeSignals = ['כדי', 'מטרה', 'רוצה', 'רוצים', 'להשיג', 'להצליח', 'תוצאה'];
    const hasOutcome = outcomeSignals.some(word => message.includes(word));
    if (hasOutcome) {
        score += 10;
        strengths.push('יש תוצאה רצויה');
    } else {
        tips.push('להגדיר מה התוצאה שאתם רוצים להשיג.');
    }

    score = Math.max(15, Math.min(100, score));

    let level = 'level-low';
    let levelLabel = 'דורש חידוד';
    let summary = 'כדאי לחדד את השאלה: מה חסר, באיזה הקשר, ומה רוצים להשיג.';

    if (score >= 75) {
        level = 'level-high';
        levelLabel = 'מדויק מאוד';
        summary = 'שאלה חזקה שמסייעת לחשוף מידע חסר משמעותי.';
    } else if (score >= 55) {
        level = 'level-mid';
        levelLabel = 'כיוון טוב';
        summary = 'ניסוח טוב. עוד תוספת הקשר קטנה תהפוך אותו למדויק יותר.';
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
            els.feed.innerHTML = '<div class="community-empty">עדיין אין הודעות. כתבו ראשונים וקבלו פידבק על הניסוח.</div>';
            return;
        }

        els.feed.innerHTML = entries.map(entry => {
            const itemClass = entry?.analysis?.level || 'level-low';
            const score = Number.isFinite(entry?.analysis?.score) ? entry.analysis.score : 0;
            const levelLabel = escapeHtml(entry?.analysis?.levelLabel || '');
            const summary = escapeHtml(entry?.analysis?.summary || '');
            const tips = Array.isArray(entry?.analysis?.tips) ? entry.analysis.tips : [];
            const strengths = Array.isArray(entry?.analysis?.strengths) ? entry.analysis.strengths : [];
            const author = escapeHtml(entry.author || 'משתמש/ת');
            const message = escapeHtml(entry.message || '');
            const date = escapeHtml(formatDate(entry.createdAt));

            const tipsHtml = tips.map(tip => `<li>${escapeHtml(tip)}</li>`).join('');
            const strengthsText = strengths.length ? `חוזקות: ${escapeHtml(strengths.join(' | '))}` : '';

            return `
                <article class="community-item ${itemClass}">
                    <header class="community-item-header">
                        <div class="community-item-meta">${author} · ${date}</div>
                        <div class="community-score">${score}/100 · ${levelLabel}</div>
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
            setStatus('כתבו לפחות 6 תווים כדי לקבל פידבק שימושי.', true);
            return;
        }

        const analysis = evaluateCommunityMessage(message);
        const entry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            author: author || 'משתמש/ת',
            message,
            createdAt: new Date().toISOString(),
            analysis
        };

        entries.unshift(entry);
        entries = entries.slice(0, 40);
        saveEntries();
        renderFeed();

        const scoreLabel = analysis.score >= 75 ? 'מצוין' : analysis.score >= 55 ? 'יפה מאוד' : 'יש כיוון';
        setStatus(`נשמר. ציון ניסוח: ${analysis.score}/100 (${scoreLabel}).`);

        els.message.value = '';
    });

    if (els.clearBtn) {
        els.clearBtn.addEventListener('click', () => {
            entries = [];
            saveEntries();
            renderFeed();
            setStatus('הקיר נוקה.');
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
    // Hide all steps
    document.querySelectorAll('.blueprint-step').forEach(step => {
        step.classList.remove('active');
    });

    // Show target step
    document.getElementById(`blueprint-step-${stepNum}`).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function extractAndMoveToStep2() {
    const actionInput = document.getElementById('action-input').value.trim();

    if (!actionInput) {
        alert('בואן תקלד משהו - מה אתה אומר לעצמך לעשות?');
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
        alert('בואן תמלא לפחות את התוצאה והצעד הראשון');
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
        alert('בואן תמלא את מי מצפה והערכת יכולת');
        return;
    }

    generateFinalBlueprint();
    goToStep(4);
}

function updateReframeBox() {
    const ability = parseInt(document.getElementById('q-ability').value);
    const gap = document.getElementById('q-gap').value.trim();

    let gapHint = '';
    if (ability <= 3) gapHint = 'יכולת נמוכה';
    else if (ability <= 6) gapHint = 'חסר כלים';
    else gapHint = 'חסר אישור / קונה דעת';

    if (gap.includes('דקות')) gapHint = 'חסר ידע';

    const templates = metaModelData.blueprint_builder?.reframe_templates || [];
    const template = templates.find(t => t.gap_hint === gapHint);
    const reframeText = template ? template.reframe : 'זה לא בעיה של אופי - זו הגדרה לא שלמה של המשימה.';

    document.getElementById('q-reframe').textContent = reframeText;
}

function generateFinalBlueprint() {
    const whoExpectsMap = {
        'self': 'אני בעצמי',
        'other': 'מישהו אחר',
        'system': 'מערכת/חוק/דדליין'
    };

    const blueprint = document.getElementById('final-blueprint');
    blueprint.innerHTML = `
        <div class="blueprint-section">
            <h4>📌 הפעולה:</h4>
            <p>"${blueprintData.action}"</p>
        </div>

        <div class="blueprint-section">
            <h4>🎯 התוצאה הרצויה:</h4>
            <p>${blueprintData.success}</p>
        </div>

        <div class="blueprint-section">
            <h4>📋 התוכנית:</h4>
            <ul>
                <li><strong>צעד ראשון:</strong> ${blueprintData.firstStep}</li>
                <li><strong>שלבי ביניים:</strong> ${blueprintData.middleSteps || '(לא הוגדרו)'}</li>
                <li><strong>צעד אחרון:</strong> ${blueprintData.lastStep}</li>
            </ul>
        </div>

        <div class="blueprint-section">
            <h4>⚙️ תנאים מקדימים:</h4>
            <p>${blueprintData.prerequisites || '(אין)'}</p>
        </div>

        <div class="blueprint-section">
            <h4>⚠️ נקודות תקיעה צפויות:</h4>
            <p>${blueprintData.friction}</p>
            <strong>Plan B:</strong>
            <p>${blueprintData.alternatives}</p>
        </div>

        <div class="blueprint-section">
            <h4>⏱️ טיימואט:</h4>
            <p>${blueprintData.time || '30 דקות'}</p>
        </div>

        <div class="blueprint-section">
            <h4>📊 ניתוח ציפיות:</h4>
            <ul>
                <li><strong>מי מצפה:</strong> ${whoExpectsMap[blueprintData.whoExpects] || blueprintData.whoExpects}</li>
                <li><strong>הציפייה:</strong> ${blueprintData.expectation}</li>
                <li><strong>יכולת כרגע:</strong> ${blueprintData.ability}/10</li>
                <li><strong>מה חסר:</strong> ${blueprintData.gap}</li>
            </ul>
        </div>

        <div class="blueprint-section" style="background: #f0fff4; padding: 15px; border-radius: 8px;">
            <h4>✨ ניסוח מחדש (לא-מאשים):</h4>
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
        <br/><small>(צפוי לקחת ${timebox} דקות משך)</small>
    `;

    const ifStuck = `
        <strong>אם נתקעת בחלק הזה:</strong><br/>
        ${blueprintData.friction ? blueprintData.friction + '<br/>' : ''}
        <strong>Plan B:</strong><br/>
        ${blueprintData.alternatives || 'בקש עזרה או נסה חלופה'}
    `;

    nextActionBox.innerHTML = nextAction;
    ifStuckBox.innerHTML = ifStuck;
}

function startTenMinuteTimer() {
    alert(`🎯 התחלת! ${blueprintData.firstStep}\n\nיש לך 10 דקות. לך!`);
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

const LOGICAL_LEVEL_KEYWORDS = {
    E: ['סביבה', 'מקום', 'זמן', 'הקשר', 'בחדר', 'בעבודה', 'בבית', 'מתי', 'איפה'],
    B: ['עושה', 'עשיתי', 'ביצוע', 'פעולה', 'התנהגות', 'מגיב', 'אומר', 'שואל'],
    C: ['יכולת', 'מיומנות', 'אסטרטגיה', 'כלי', 'ללמוד', 'להתאמן', 'לתרגל', 'מסוגל'],
    V: ['חשוב', 'ערך', 'אמונה', 'מאמין', 'צריך', 'נכון', 'לא נכון', 'עיקרון'],
    I: ['אני', 'עצמי', 'זהות', 'מי אני', 'טיפש', 'מצליחן', 'כישלון', 'בן אדם'],
    S: ['אנחנו', 'קבוצה', 'קהילה', 'צוות', 'משפחה', 'שייכות', 'חברה', 'ארגון']
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
    if (!source) return { level: '', confidence: 0, reason: 'אין טקסט לניתוח.' };

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
        return { level: '', confidence: 0, reason: 'לא זוהו מילות מפתח חד-משמעיות.' };
    }
    if (bestScore === 1) {
        return { level: bestLevel, confidence: 1, reason: `זוהתה מילה אחת שמתאימה לרמת ${getLevelDisplay(bestLevel)}.` };
    }
    return { level: bestLevel, confidence: 2, reason: `זוהו כמה רמזים שמתאימים לרמת ${getLevelDisplay(bestLevel)}.` };
}

function getLevelImprovementTip(level, prism) {
    if (prism && prism.level_hints && prism.level_hints[level]) {
        return `מיקוד מומלץ לרמה זו: ${prism.level_hints[level]}`;
    }
    const info = LOGICAL_LEVEL_INFO[level];
    return info ? info.prompt : 'מומלץ לדייק את הניסוח לרמה הלוגית המתאימה.';
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
            reason: 'השדה ריק.',
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
            reason: `הטקסט מסומן כרמת ${getLevelDisplay(explicitLevel)} אבל הוזן בשדה ${getLevelDisplay(expectedLevel)}.`,
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
            reason: `הטקסט מתאים לשדה ${getLevelDisplay(expectedLevel)}.`,
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
            reason: `${inferred.reason} לכן יש סבירות גבוהה לשיבוץ שגוי בשדה ${getLevelDisplay(expectedLevel)}.`,
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
        reason: inferred.reason || 'לא ניתן להכריע אוטומטית אם השיבוץ מדויק.',
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
            grade: 'אין מספיק מידע לציון'
        };
    }

    const matched = answered.filter(a => a.status === 'ok').length;
    const uncertain = answered.filter(a => a.status === 'uncertain').length;
    const sufficientlyDetailed = answered.filter(a => (a.cleanText || '').split(/\s+/).length >= 3).length;

    const coverage = Math.round((answeredCount / 6) * 40);
    const alignment = Math.round(((matched + (uncertain * 0.5)) / answeredCount) * 40);
    const clarity = Math.round((sufficientlyDetailed / answeredCount) * 20);
    const total = Math.min(100, coverage + alignment + clarity);

    let grade = 'טעון שיפור משמעותי';
    if (total >= 85) grade = 'מצוין';
    else if (total >= 70) grade = 'טוב מאוד';
    else if (total >= 55) grade = 'בינוני';

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
        .map(level => `<li><strong>${getLevelDisplay(level)}:</strong> עומק החשיבה הוא "${LOGICAL_LEVEL_INFO[level].prompt}"</li>`)
        .join('');
    const anchorTemplates = (prism.anchor_question_templates || [])
        .slice(0, 2)
        .map(item => `<li>${item}</li>`)
        .join('');

    guideEl.innerHTML = `
        <h4>הסבר עומק על הפריזמה: ${prism.name_he}</h4>
        <p><strong>מה הפריזמה הזו בודקת?</strong> ${prism.philosophy_core}</p>
        <p><strong>למה זה חשוב?</strong> ${prism.therapist_intent || 'מטרת הפריזמה היא להפוך ניסוח כללי למפה ברורה שאפשר לפעול לפיה.'}</p>

        <div class="prism-guide-grid">
            <div class="prism-guide-card">
                <h5>איך עובדים נכון ב-4 שלבים</h5>
                <ol>
                    <li>מנסחים את שאלת העוגן ומוודאים שהיא ברורה ומדידה.</li>
                    <li>ממפים כל תשובה לרמה הלוגית המתאימה: E/B/C/V/I/S.</li>
                    <li>מזהים פערים ושיבוצים שגויים כדי למנוע מסקנות לא מדויקות.</li>
                    <li>בוחרים Pivot אחד קטן לביצוע מיידי, עם המשך עומק מדורג.</li>
                </ol>
            </div>
            <div class="prism-guide-card">
                <h5>איך להבחין בין הרמות</h5>
                <ul>${levelGuide}</ul>
            </div>
            <div class="prism-guide-card">
                <h5>מה אומר "עומק" בפריזמה</h5>
                <p>מתחילים ב-E/B כדי לעגן עובדות בשטח, ואז עולים ל-C/V/I/S כדי להבין מנגנון פנימי וזהותי.</p>
                <ul>${depthLadder}</ul>
            </div>
        </div>

        <div class="prism-guide-grid">
            <div class="prism-guide-card">
                <h5>דוגמאות עוגן מומלצות</h5>
                <ul>${anchorTemplates || '<li>אין דוגמאות נוספות בנתונים.</li>'}</ul>
                <h5>דוגמאות מהחיים</h5>
                <ul>${examples || '<li>אין דוגמאות נוספות בנתונים.</li>'}</ul>
            </div>
            <div class="prism-guide-card">
                <h5>טעויות נפוצות שכדאי להימנע מהן</h5>
                <ul>${antiPatterns || '<li>להישאר כללי ולא לבדוק ראיות.</li>'}</ul>
                <p><strong>טיפ:</strong> אם יש ספק ברמה, קצר את המשפט לשורה אחת קונקרטית ובדוק שוב לאיזו שאלה הוא עונה.</p>
            </div>
        </div>
    `;
}

function renderPrismScoreInterpretation(score, mismatchCount) {
    const notes = [];
    if (score.total >= 85) {
        notes.push('המיפוי מדויק מאוד. אפשר לעבור לעבודה אסטרטגית על התערבות אחת עמוקה.');
    } else if (score.total >= 70) {
        notes.push('בסיס טוב מאוד. נדרש חידוד קל ברמות כדי להפוך את המיפוי לחד ומשכנע.');
    } else if (score.total >= 55) {
        notes.push('המיפוי חלקי. לפני Pivot עמוק, מומלץ לסדר את השיבוצים ולדייק ניסוחים.');
    } else {
        notes.push('המיפוי עדיין ראשוני. כדאי לחזור לשאלת העוגן ולמפות מחדש בצורה קונקרטית.');
    }

    if (mismatchCount > 0) {
        notes.push(`זוהו ${mismatchCount} שיבוצים שגויים. זה לא כישלון אלא איתות שאפשר לשפר דיוק ולחסוך מאמץ בהמשך.`);
    } else {
        notes.push('לא זוהו שיבוצים שגויים מפורשים, וזה בסיס מצוין להתקדמות.');
    }

    if (score.clarity < 12) {
        notes.push('רמת בהירות נמוכה יחסית: נסח משפטים קצרים עם פעולה, מקום או קריטריון במקום ניסוחים כלליים.');
    }

    return `<ul>${notes.map(note => `<li>${note}</li>`).join('')}</ul>`;
}

function renderPrismLevelsDeepAnalysis(prism, recommendation) {
    const order = ['E', 'B', 'C', 'V', 'I', 'S'];
    const items = order.map(level => {
        const count = recommendation.counts[level] || 0;
        const levelHint = prism?.level_hints?.[level] || LOGICAL_LEVEL_INFO[level].prompt;
        const intervention = prism?.recommended_interventions_by_level?.[level] || 'המשך דיוק בשפה ובדיקה מול שאלת העוגן.';

        let meaning = 'לא התקבלו תשובות ברמה הזו, לכן חשוב לבדוק אם נוצרה השמטה.';
        if (count >= 3) {
            meaning = 'הרמה הזו דומיננטית מאוד ומספקת מנוף התערבות מרכזי.';
        } else if (count === 2) {
            meaning = 'הרמה הזו חוזרת כמה פעמים ולכן כדאי להתייחס אליה כציר עבודה משמעותי.';
        } else if (count === 1) {
            meaning = 'יש סימן ראשוני לרמה הזו, אך נדרש עוד ביסוס כדי להסיק מסקנות.';
        }

        const pivotTag = recommendation.pivot === level
            ? '<p><strong>סטטוס:</strong> זו רמת ה-Pivot המומלצת כרגע.</p>'
            : '';

        return `
            <li class="prism-level-deep-item">
                <p><strong>${getLevelDisplay(level)}</strong> | מופעים: ${count}</p>
                <p><strong>משמעות:</strong> ${meaning}</p>
                <p><strong>מה לבדוק ברמה הזו:</strong> ${levelHint}</p>
                <p><strong>מהלך התערבות אפשרי:</strong> ${intervention}</p>
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
        ? 'יישור שיבוצים: עבור כל פריט אדום, נסח מחדש משפט ממוקד שמתאים רק לרמה אחת.'
        : 'שימור דיוק: השאר את הניסוח חד וקצר, ובדוק שכל משפט עונה לשאלת העוגן.';
    const resistanceStep = highResistance
        ? 'עבודה עם התנגדות גבוהה: התחל ב-Small Win חיצוני (E/B) לפני שינוי אמונות עמוק.'
        : 'אפשר להתקדם לעומק: אחרי ביצוע צעד קטן, עבור לעבודה ברמות C/V/I.';
    const emotionStep = highEmotion
        ? 'במצב רגשי גבוה: האט קצב, אמת עובדות, ורק אז בצע פרשנות או הכללה.'
        : 'הרגש יציב יחסית: מתאים לבניית תוכנית פעולה מדורגת לשבוע הקרוב.';

    return `
        <ol class="prism-action-plan">
            <li><strong>צעד 1 (דיוק שפה):</strong> ${alignmentStep}</li>
            <li><strong>צעד 2 (Pivot מעשי):</strong> בצע פעולה אחת לפי רמת ${recommendation.levelName}: ${recommendation.intervention}</li>
            <li><strong>צעד 3 (וויסות והתמדה):</strong> ${resistanceStep}</li>
            <li><strong>צעד 4 (עומק רגשי):</strong> ${emotionStep}</li>
            <li><strong>שאלת המשך מחייבת:</strong> ${recommendation.followUpQuestion}</li>
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
            <p><strong>שאלת עוגן:</strong> ${p.anchor_question_templates[0]}</p>
            <div style="margin-top:10px"><button class="btn prism-open-btn" data-id="${p.id}">בחר פריזמה</button></div>
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
    if (!prism) return alert('פריזמה לא נמצאה');
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
    if (!prism) return alert('אין פריזמה פעילה');

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
        showHintMessage('יש להזין לפחות תשובה אחת כדי לקבל אבחון וציון.');
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
    const intervention = prism?.recommended_interventions_by_level?.[best] || 'מומלץ להתחיל בצעד קטן וברור שניתן לבצע השבוע.';
    const levelSummary = getLevelDisplay(best);
    const reasonParts = [];

    if (bestCount > 0) {
        reasonParts.push(`הריכוז הגבוה ביותר של תשובות נמצא ברמת ${levelSummary} (${bestCount} תשובות).`);
    } else {
        reasonParts.push('אין מספיק תשובות ממוקדות, לכן נבחרה רמת התחלה מעשית.');
    }
    if (mismatches > 0) {
        reasonParts.push(`זוהו ${mismatches} שיבוצים לא מדויקים, ולכן חשוב להתחיל בסידור הרמות לפני התערבות עמוקה.`);
    }
    if (session.resistance >= 4) {
        reasonParts.push('רמת התנגדות גבוהה מצביעה על עדיפות להתחלה ברמה פרקטית ונמוכה יותר.');
    }

    const followUpQuestions = {
        E: 'איזה שינוי קטן בסביבה יכול להפוך את ההתנהגות לקלה יותר כבר מחר?',
        B: 'איזו פעולה אחת ספציפית תבצע בפועל במהלך 24 השעות הקרובות?',
        C: 'איזו מיומנות אחת חסרה, ואיך תתרגל אותה 10 דקות ביום?',
        V: 'איזו אמונה מרכזית מנהלת את המצב, ומה יקרה אם ננסח אותה מחדש?',
        I: 'איזה סיפור זהות מופעל כאן, ואיזה ניסוח זהות חלופי יעזור להתקדם?',
        S: 'מי במעגל שלך יכול לתמוך במהלך, ואיך תחבר אותו לתהליך?'
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
        ok: { label: 'תואם', className: 'status-ok' },
        mismatch: { label: 'שיבוץ שגוי', className: 'status-bad' },
        uncertain: { label: 'דורש חידוד', className: 'status-warn' }
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
            ? `<p><strong>מיקום מומלץ:</strong> ${getLevelDisplay(answer.effectiveLevel)}</p>`
            : '';

        return `
            <li class="prism-check-item ${status.className}">
                <p><strong>שדה שהוזן:</strong> ${getLevelDisplay(answer.level)}</p>
                <p><strong>סטטוס:</strong> ${status.label}</p>
                <p><strong>תוכן:</strong> ${answer.text}</p>
                ${movedLevelNote}
                <p><strong>למה:</strong> ${answer.reason}</p>
                <p><strong>איך לשפר:</strong> ${answer.improvement}</p>
            </li>
        `;
    }).join('');

    out.innerHTML = `
        <h4>מפת תשובות מפורטת - ${session.prism_name}</h4>
        <p><strong>שאלת עוגן:</strong> ${session.anchor}</p>

        <div class="blueprint-section prism-score-box">
            <h4>ציון ואבחון</h4>
            <p><strong>ציון כללי:</strong> ${score.total}/100 (${score.grade})</p>
            <p>פירוק הציון: כיסוי ${score.coverage}/40 | דיוק שיבוץ ${score.alignment}/40 | בהירות ניסוח ${score.clarity}/20</p>
            <p><strong>שיבוצים שגויים שסומנו באדום:</strong> ${mismatchCount}</p>
            <p><strong>פענוח הציון:</strong></p>
            ${scoreInsights}
        </div>

        <div class="blueprint-section">
            <h4>בדיקת נכונות לכל תשובה</h4>
            <ul class="prism-check-list">
                ${answersHtml}
            </ul>
        </div>

        <div class="blueprint-section prism-pivot-box">
            <h4>המלצת Pivot - הסבר מעמיק</h4>
            <p><strong>Pivot מומלץ:</strong> ${recommendation.levelName}</p>
            <p><strong>למה זה נבחר:</strong> ${recommendation.reason}</p>
            <p><strong>התערבות מוצעת:</strong> ${recommendation.intervention}</p>
            <p><strong>שאלת המשך לעומק:</strong> ${recommendation.followUpQuestion}</p>
            <p><strong>עוצמת רגש:</strong> ${session.emotion} | <strong>התנגדות:</strong> ${session.resistance}</p>
            <p><strong>פיזור תשובות לפי רמות (לאחר נרמול):</strong></p>
            <ul>${countsHtml}</ul>
            <p><strong>משמעות מעשית:</strong> ה-Pivot הוא נקודת המינוף הכי יעילה כרגע. מיקוד נכון ברמה הזו יוצר תזוזה מהירה ואז מאפשר עבודה עמוקה יותר.</p>
        </div>

        <div class="blueprint-section">
            <h4>פענוח עומק לפי כל רמה</h4>
            ${levelsDeepAnalysis}
        </div>

        <div class="blueprint-section">
            <h4>תוכנית פעולה מדורגת (לא רק ציון)</h4>
            ${actionPlan}
        </div>

        <div class="blueprint-section">
            <h4>איך לשפר לציון גבוה יותר בתרגול הבא</h4>
            <ol>
                <li>בכל שדה כתוב משפט אחד ברור שמתאים רק לרמה של אותו שדה.</li>
                <li>אם אתה מעתיק פריט מוכן, ודא שהאות של הפריט תואמת לשדה.</li>
                <li>הימנע ממשפטים כלליים מאוד; כתיבה קונקרטית משפרת את ציון הבהירות.</li>
            </ol>
        </div>

        <div class="action-buttons">
            <button class="btn btn-secondary" onclick="exportPrismSession()">ייצא סשן JSON</button>
        </div>
    `;
}

function renderPrismResultCompact(session, recommendation) {
    const out = document.getElementById('prism-result');
    if (!out) return;
    out.classList.remove('hidden');

    const score = session.score || computePrismScore(session.answers || []);
    const statusMap = {
        ok: { label: 'תואם', className: 'status-ok' },
        mismatch: { label: 'שיבוץ שגוי', className: 'status-bad' },
        uncertain: { label: 'דורש חידוד', className: 'status-warn' }
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
            ? `<p><strong>העבר לרמה:</strong> ${getLevelDisplay(answer.effectiveLevel)}</p>`
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
        <h4>בדיקה מהירה - ${escapeHtml(session.prism_name || '')}</h4>
        <p><strong>שאלת עוגן:</strong> ${escapeHtml(session.anchor || '')}</p>

        <div class="prism-quick-grid">
            <article class="prism-quick-card">
                <h5>ציון כולל</h5>
                <p class="prism-quick-number">${score.total}/100</p>
                <p>${escapeHtml(score.grade || '')}</p>
            </article>
            <article class="prism-quick-card">
                <h5>Pivot מומלץ</h5>
                <p class="prism-quick-number">${escapeHtml(recommendation.levelName || '')}</p>
                <p>${escapeHtml(recommendation.intervention || '')}</p>
            </article>
            <article class="prism-quick-card">
                <h5>סטטוס שיבוצים</h5>
                <p>תואם: ${statusCounts.ok} | דורש חידוד: ${statusCounts.uncertain} | שגוי: ${statusCounts.mismatch}</p>
                <p>רגש: ${session.emotion} | התנגדות: ${session.resistance}</p>
            </article>
        </div>

        <div class="blueprint-section prism-focus-box">
            <h4>מה עושים עכשיו (עד 3 צעדים)</h4>
            <ul class="prism-action-plan">
                ${focusItems || '<li>נראה טוב. אפשר לעבור לביצוע ה-Pivot שנבחר.</li>'}
                <li><strong>שאלת המשך:</strong> ${escapeHtml(recommendation.followUpQuestion || '')}</li>
            </ul>
        </div>

        <details class="prism-more-details">
            <summary>הצג פירוט מלא</summary>
            <div class="blueprint-section prism-score-box">
                <h4>ציון ואבחון מלא</h4>
                <p><strong>ציון כולל:</strong> ${score.total}/100 (${escapeHtml(score.grade || '')})</p>
                <p>פירוק הציון: כיסוי ${score.coverage}/40 | דיוק שיבוץ ${score.alignment}/40 | בהירות ניסוח ${score.clarity}/20</p>
                <p><strong>שיבוצים שגויים:</strong> ${mismatchCount}</p>
                ${scoreInsights}
            </div>

            <div class="blueprint-section">
                <h4>בדיקה לכל תשובה</h4>
                <ul class="prism-check-list">
                    ${checksCompactHtml}
                </ul>
            </div>

            <div class="blueprint-section prism-pivot-box">
                <h4>למה זה ה-Pivot המומלץ</h4>
                <p>${escapeHtml(recommendation.reason || '')}</p>
                <p><strong>פיזור תשובות לפי רמות:</strong></p>
                <ul>${countsHtml}</ul>
            </div>

            <div class="blueprint-section">
                <h4>תוכנית פעולה מדורגת</h4>
                ${actionPlan}
            </div>

            <div class="blueprint-section">
                <h4>פענוח עומק לפי רמות</h4>
                ${levelsDeepAnalysis}
            </div>
        </details>

        <div class="action-buttons">
            <button class="btn btn-secondary" onclick="exportPrismSession()">ייצא סשן JSON</button>
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
                setMappingInputStatus(inp, 'mismatch', `התוכן נראה כמו ${getLevelDisplay(inp.dataset.suggestedLevel)} ולא ${getLevelDisplay(expectedLevel)}.`);
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
        setMappingInputStatus(inputEl, 'mismatch', `התוכן שויך ל-${getLevelDisplay(level)} אך הוזן בשדה ${getLevelDisplay(expectedLevel)}.`);
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
        loader.innerHTML = '<div class="loader-box"><p>📚 טעינת כלים...</p></div>';
        document.body.insertBefore(loader, document.body.firstChild);
    }
    loader.style.display = 'flex';
}

function hideLoadingIndicator() {
    const loader = document.getElementById('app-loader');
    if (loader) loader.style.display = 'none';
}

function showErrorMessage(msg) {
    alert('❌ ' + msg);
}

function showHint(text) {
    const box = document.getElementById('hint-box');
    const hintText = document.getElementById('hint-text');
    if (box && hintText) {
        hintText.textContent = text;
        box.style.display = 'flex';
        setTimeout(() => { if (box) box.style.display = 'none'; }, 6000);
    }
}

function closeHint() {
    const box = document.getElementById('hint-box');
    if (box) box.style.display = 'none';
}

function navigateTo(tabName) {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));
    
    const btn = document.querySelector(`[data-tab="${tabName}"]`);
    if (btn) btn.classList.add('active');
    
    const content = document.getElementById(tabName);
    if (content) content.classList.add('active');

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
        { id: 'first_step', name: 'צעד ראשון', icon: '👣', condition: () => userProgress.xp >= 10 },
        { id: 'fire_10', name: 'להט 🔥', icon: '🔥', condition: () => userProgress.streak >= 10 },
        { id: 'xp_100', name: '100 XP', icon: '⭐', condition: () => userProgress.xp >= 100 },
        { id: 'xp_500', name: '500 XP', icon: '✨', condition: () => userProgress.xp >= 500 },
        { id: 'sessions_10', name: '10 סשנים', icon: '📊', condition: () => userProgress.sessions >= 10 },
    ];
    
    badgesList.forEach(badge => {
        if (badge.condition() && !userProgress.badges.find(b => b.id === badge.id)) {
            userProgress.badges.push({ id: badge.id, name: badge.name, icon: badge.icon, earned: new Date().toISOString() });
            showHint(`🏆 כבר רכשת את התג: ${badge.name}`);
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
    
    if (streakEl) streakEl.textContent = `${userProgress.streak} ימים`;
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

// اهوك XP acquisition على actions
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
    showHint(`🛡️ קיבלת Streak Charge (${userProgress.streakCharges}/${MAX_STREAK_CHARGES})`);
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
            showHint(`🛡️ השתמשת ב-Streak Charge. נשארו ${userProgress.streakCharges}/${MAX_STREAK_CHARGES}`);
        } else {
            userProgress.streak = 1;
        }
    }

    userProgress.lastSessionDate = today;
}

function checkAndAwardBadges() {
    const badgesList = [
        { id: 'first_step', name: 'צעד ראשון', icon: '👣', condition: () => userProgress.xp >= 10 },
        { id: 'fire_10', name: 'להט 🔥', icon: '🔥', condition: () => userProgress.streak >= 10 },
        { id: 'xp_100', name: '100 XP', icon: '⭐', condition: () => userProgress.xp >= 100 },
        { id: 'xp_500', name: '500 XP', icon: '✨', condition: () => userProgress.xp >= 500 },
        { id: 'sessions_10', name: '10 סשנים', icon: '📊', condition: () => userProgress.sessions >= 10 },
        { id: 'daily_goal', name: 'יעד יומי', icon: '🎯', condition: () => userProgress.lastChargeAwardedDate === userProgress.todayDate },
        { id: 'charge_full', name: 'Charge Full', icon: '🛡️', condition: () => userProgress.streakCharges >= MAX_STREAK_CHARGES },
    ];

    badgesList.forEach(badge => {
        if (badge.condition() && !userProgress.badges.find(b => b.id === badge.id)) {
            userProgress.badges.push({ id: badge.id, name: badge.name, icon: badge.icon, earned: new Date().toISOString() });
            showHint(`🏆 כבר רכשת את התג: ${badge.name}`);
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

    if (streakEl) streakEl.textContent = `${userProgress.streak} ימים`;
    if (xpEl) xpEl.textContent = userProgress.xp;
    if (starsEl) starsEl.textContent = userProgress.stars;
    if (badgeCountEl) badgeCountEl.textContent = userProgress.badges.length;
    if (sessionEl) sessionEl.textContent = userProgress.sessions;
    if (streakDateEl) {
        if (!userProgress.lastSessionDate) {
            streakDateEl.textContent = 'היום הראשון!';
        } else if (userProgress.lastChargeUsedDate === userProgress.lastSessionDate) {
            streakDateEl.textContent = 'הרצף נשמר עם Charge';
        } else {
            streakDateEl.textContent = `פעילות אחרונה: ${userProgress.lastSessionDate}`;
        }
    }

    const goalRatio = userProgress.todayActions / userProgress.dailyGoal;
    const goalPercent = Math.min(100, Math.round(goalRatio * 100));
    const remaining = Math.max(userProgress.dailyGoal - userProgress.todayActions, 0);
    const completed = remaining === 0;
    if (dailyGoalValueEl) dailyGoalValueEl.textContent = `${Math.min(userProgress.todayActions, userProgress.dailyGoal)}/${userProgress.dailyGoal}`;
    if (dailyGoalFillEl) dailyGoalFillEl.style.width = `${goalPercent}%`;
    if (dailyGoalNoteEl) dailyGoalNoteEl.textContent = completed ? 'היעד היומי הושלם' : `עוד ${remaining} פעולות להשלמה`;
    if (dailyGoalCard) dailyGoalCard.classList.toggle('is-goal-complete', completed);

    if (streakChargeValueEl) streakChargeValueEl.textContent = `${userProgress.streakCharges}/${MAX_STREAK_CHARGES}`;
    if (streakChargeNoteEl) {
        streakChargeNoteEl.textContent = userProgress.streakCharges > 0
            ? 'שומר על הרצף ביום פספוס אחד'
            : 'סיים יעד יומי כדי למלא Charge';
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
        tone: 'danger', label: 'כעס', emoji: '😡',
        counterReply: 'אני נסגר/ת כשמדברים אליי ככה.',
        interpretation: 'תגובה אימפולסיבית הגבירה בושה וסגרה זרימת מידע.',
        impact: Object.freeze({ stats: Object.freeze({ flow: 24, agency: 20, shame: 88 }), xrayTags: Object.freeze(['😳 בושה', '🚪 סגירה']), microOutcome: Object.freeze(['📉 זרימה', '🧱 תקיעה', '🔒 הימנעות']) })
    }),
    mock: Object.freeze({
        tone: 'warn', label: 'לעג', emoji: '😏',
        counterReply: 'טוב... אז אני כנראה סתם לא מספיק טוב/ה.',
        interpretation: 'לעג מייצר השוואה ושיתוק, לא הבהרה.',
        impact: Object.freeze({ stats: Object.freeze({ flow: 32, agency: 24, shame: 82 }), xrayTags: Object.freeze(['🙈 השוואה', '🧊 ניתוק']), microOutcome: Object.freeze(['📉 אמון', '📉 זרימה', '🧱 תקיעה']) })
    }),
    rescue: Object.freeze({
        tone: 'purple', label: 'הצלה', emoji: '🛟',
        counterReply: 'סבבה... אז תעשה/י במקומי.',
        interpretation: 'הצלה פותרת רגעית אך משאירה תלות.',
        impact: Object.freeze({ stats: Object.freeze({ flow: 46, agency: 20, shame: 50 }), xrayTags: Object.freeze(['🛟 תלות', '🧠 בלי למידה']), microOutcome: Object.freeze(['⏸️ הקלה', '🔁 תלות', '📉 אחריות']) })
    }),
    avoid: Object.freeze({
        tone: 'muted', label: 'התחמקות', emoji: '🙈',
        counterReply: 'אוקיי... אז נדחה גם את זה.',
        interpretation: 'דחייה שומרת על נוחות רגעית ומעמיקה את התקיעות.',
        impact: Object.freeze({ stats: Object.freeze({ flow: 30, agency: 22, shame: 62 }), xrayTags: Object.freeze(['🕳️ דחייה', '⏳ עומס']), microOutcome: Object.freeze(['📉 התקדמות', '🔁 חזרת בעיה', '🧱 תקיעה']) })
    }),
    meta: Object.freeze({
        tone: 'good', label: 'מטה-מודל', emoji: '✅',
        counterReply: 'אני נתקע/ת בצעד הראשון, לא ברור לי מאיפה להתחיל.',
        interpretation: 'שאלה מדויקת חשפה את הקמט והחזירה סוכנות.',
        impact: Object.freeze({ stats: Object.freeze({ flow: 86, agency: 84, shame: 24 }), xrayTags: Object.freeze(['🧩 חשיפה', '🌬️ פתיחה']), microOutcome: Object.freeze(['📈 זרימה', '🟢 סוכנות', '🔓 מידע חדש']) })
    })
});

const CEFLOW_HL_RULES = Object.freeze([
    Object.freeze({ type: 'generalization', label: 'הכללה', css: 'hl-generalization', tokens: Object.freeze(['כולם', 'תמיד', 'אף אחד', 'כלום', 'בשום מצב']) }),
    Object.freeze({ type: 'modal', label: 'מודליות', css: 'hl-modal', tokens: Object.freeze(['אי אפשר', 'חייב', 'צריך', 'אסור', 'לא יכול']) }),
    Object.freeze({ type: 'vague', label: 'עמימות פעולה', css: 'hl-vague', tokens: Object.freeze(['לעשות', 'לסדר', 'לטפל', 'להתארגן', 'להגיע']) })
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
        label: String(raw?.label || f.label || 'תגובה'),
        tone: String(raw?.tone || f.tone || 'muted'),
        emoji: String(raw?.emoji || f.emoji || '💬'),
        say: String(raw?.say || ''),
        counterReply: String(raw?.counterReply || f.counterReply || ''),
        replyPrompt: String(raw?.replyPrompt || 'איך את/ה עונה עכשיו?'),
        replyOptions: replyOptions.length ? replyOptions : [
            'בוא/י ננשום רגע ונגדיר צעד ראשון.',
            'איפה בדיוק נתקעת?',
            'מה כבר כן עובד, אפילו חלקית?'
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
        meta.powerQuestions = ['מה בדיוק לא ברור כרגע?', 'איזה צעד ראשון הכי קטן כן אפשרי?', 'איזה מידע חסר כדי להתקדם?'];
    }
    if (meta && !meta.newInfoBubble) {
        meta.newInfoBubble = 'עכשיו זה ברור יותר: אפשר להתחיל מצעד קטן במקום להיתקע על הכול.';
    }
    return {
        id: String(raw.id || `scene_${i + 1}`),
        domain: String(raw.domain || 'כללי'),
        title: String(raw.title || `סצנה ${i + 1}`),
        level: String(raw.level || raw.levelTag || 'מודליות + הכללה'),
        regulationNote: String(raw.regulationNote || 'לכולנו יש תגובה רגשית אימפולסיבית. התרגול כאן הוא לזהות אותה, לווסת סטייט, ולעבור לתגובה שכלית מבוססת שאלה.'),
        characters: {
            left: { name: String(raw?.characters?.left?.name || 'דמות שמאל'), sprite: String(raw?.characters?.left?.sprite || '') },
            right: { name: String(raw?.characters?.right?.name || 'דמות ימין'), sprite: String(raw?.characters?.right?.sprite || '') }
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
        els.root.innerHTML = '<p>שגיאה בטעינת סצנות קומיקס.</p>';
        return;
    }

    const scenarios = Array.isArray(payload?.scenarios) ? payload.scenarios.map(ceflowNormScenario).filter(Boolean) : [];
    if (!scenarios.length) {
        els.root.innerHTML = '<p>לא נמצאו סצנות קומיקס להצגה.</p>';
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
            els.toggleMode.textContent = state.mode === 'learn' ? '🎮 מצב משחק' : '📚 מצב לימוד';
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
            const safeName = escapeHtml(ch?.name || 'דמות');
            const art = ch?.sprite ? `<img src="${escapeHtml(ch.sprite)}" alt="${safeName}" loading="lazy">` : '<div class="ceflow-avatar-fallback">🙂</div>';
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
                <p class="ceflow-bubble-speaker">${escapeHtml(speakerName(line) || 'דמות')}</p>
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
                <p><strong>מה אמרת:</strong> ${escapeHtml(choice.say)}</p>
                <p><strong>מה קרה:</strong></p>
                <div class="ceflow-outcomes">${(choice.impact?.microOutcome || []).map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>
                <div class="ceflow-feedback-actions">
                    <button type="button" class="ceflow-mini-btn" data-feedback-note="${escapeHtml(interpretation)}">🔍 פרשנות</button>
                    <button type="button" class="ceflow-mini-btn" data-feedback-note="${escapeHtml(regulation)}">🧠 ויסות סטייט</button>
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
                ? `<p><strong>שאלה:</strong> ${escapeHtml(state.selectedQuestion)}</p><p><strong>מידע חדש:</strong> ${escapeHtml(state.generatedInfo)}</p>`
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
            <h4>Blueprint קצר</h4>
            <div class="ceflow-blueprint-grid">
                <article class="ceflow-blueprint-step"><h5>🎯 מטרה</h5><p>${escapeHtml(bp.goal || 'לא הוגדר')}</p></article>
                <article class="ceflow-blueprint-step"><h5>🟢 צעד ראשון</h5><p>${escapeHtml(bp.first || 'לא הוגדר')}</p></article>
                <article class="ceflow-blueprint-step"><h5>🔁 שלבי ביניים</h5><p>${escapeHtml(middle.join(' | ') || 'עד 3 שלבים ברורים')}</p></article>
                <article class="ceflow-blueprint-step"><h5>✅ צעד אחרון</h5><p>${escapeHtml(bp.last || 'לא הוגדר')}</p></article>
                <article class="ceflow-blueprint-step"><h5>🧰 חלופות</h5><p>${escapeHtml(alternatives.join(' | ') || 'אין חלופות')}</p></article>
            </div>
            <p class="ceflow-blueprint-footnote"><strong>Preconditions:</strong> ${escapeHtml(preconditions.join(' | ') || 'אין תנאים מיוחדים')}</p>
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
        if (els.domain) els.domain.textContent = `תחום: ${scenario.domain}`;
        if (els.progress) els.progress.textContent = `סצנה ${state.index + 1}/${scenarios.length}`;
        if (els.level) els.level.textContent = `רמה: ${scenario.level}`;
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
            if (els.replyStatus) els.replyStatus.textContent = 'כתבו תגובה קצרה לפני פרשנות.';
            return;
        }
        state.userReply = text;
        state.replyDraft = text;
        if (state.selectedChoice?.id === 'meta') {
            state.selectedQuestion = state.selectedChoice.powerQuestions?.[0] || '';
            state.generatedInfo = state.selectedChoice.newInfoBubble || 'השאלה פתחה מידע חדש, ואפשר להתקדם לצעד ראשון.';
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
        showFloatingNote(currentScenario()?.regulationNote || 'לכולנו יש תגובה אימפולסיבית ראשונה. כאן עוצרים רגע, מווסתים סטייט, ועוברים לשאלה מדויקת.');
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
        state.generatedInfo = state.selectedChoice.newInfoBubble || 'נפתח מידע חדש שאפשר לעבוד איתו.';
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
