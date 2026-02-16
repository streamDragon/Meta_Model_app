// Global Variables
let metaModelData = {};
let practiceCount = 0;
let currentStatementIndex = 0;
let userProgress = { xp: 0, streak: 0, badges: [], sessions: 0, lastSessionDate: null };
let trainerState = {
    isActive: false,
    currentQuestion: 0,
    questions: [],
    selectedCategory: '',
    correctCount: 0,
    sessionXP: 0,
    answered: false,
    hintLevel: 0,
    skippedCount: 0
};

let audioState = {
    context: null,
    muted: false,
    openingPlayed: false
};

const TRAINER_CATEGORY_LABELS = {
    DELETION: 'מחיקה (Deletion)',
    DISTORTION: 'עיוות (Distortion)',
    GENERALIZATION: 'הכללה (Generalization)'
};

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

function updateMuteButtonUI() {
    const btn = document.getElementById('audio-mute-btn');
    if (!btn) return;
    btn.textContent = audioState.muted ? '🔇 סאונד כבוי' : '🔊 סאונד פעיל';
    btn.classList.toggle('is-muted', audioState.muted);
}

function setMutedAudio(isMuted) {
    audioState.muted = isMuted;
    localStorage.setItem('meta_audio_muted', String(isMuted));
    updateMuteButtonUI();
}

function toggleAudioMute() {
    setMutedAudio(!audioState.muted);
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
    }
}

// Play opening music using Web Audio API
function playOpeningMusic() {
    if (audioState.muted || audioState.openingPlayed) return;
    try {
        const audioContext = ensureAudioContext();
        if (!audioContext) return;
        if (audioContext.state === 'suspended') audioContext.resume();
        
        // Create a pleasant opening chord sequence
        const now = audioContext.currentTime;
        const notes = [
            { freq: 523.25, duration: 0.5, delay: 0 },     // C5
            { freq: 659.25, duration: 0.5, delay: 0.2 },   // E5
            { freq: 783.99, duration: 0.5, delay: 0.4 },   // G5
            { freq: 1046.50, duration: 0.8, delay: 0.6 }   // C6
        ];
        
        notes.forEach(note => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(audioContext.destination);
            
            osc.frequency.value = note.freq;
            osc.type = 'sine';
            
            gain.gain.setValueAtTime(0.1, now + note.delay);
            gain.gain.exponentialRampToValueAtTime(0.01, now + note.delay + note.duration);
            
            osc.start(now + note.delay);
            osc.stop(now + note.delay + note.duration);
        });

        audioState.openingPlayed = true;
    } catch (e) {
        // Silently fail if audio context is not supported
        console.log('Audio not supported');
    }
}

// Hide Splash Screen
function hideSplashScreen() {
    const splashScreen = document.getElementById('splash-screen');
    if (!splashScreen) return;
    // The animation handles the fade out after 3 seconds
    // Just ensure it's hidden after animation
    setTimeout(() => {
        if (splashScreen) {
            splashScreen.classList.add('hidden');
            splashScreen.style.pointerEvents = 'none'; // Ensure clicks pass through
        }
    }, 3600);
}

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    loadAudioSettings();
    updateMuteButtonUI();

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
    setupPracticeMode();
    setupTrainerMode();
    setupBlueprintBuilder();
    setupPrismModule();
    initializeProgressHub();
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
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
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
    const skipBtn = document.getElementById('skip-question-btn');
    const muteBtn = document.getElementById('audio-mute-btn');

    if (!startBtn || !categorySelect) return;
    
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
    if (skipBtn) skipBtn.addEventListener('click', skipCurrentQuestion);
    if (muteBtn) muteBtn.addEventListener('click', toggleAudioMute);

    updateMuteButtonUI();
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
        correctCount: 0,
        sessionXP: 0,
        answered: false,
        hintLevel: 0,
        skippedCount: 0
    };
    
    // Show trainer UI, hide start section
    document.getElementById('trainer-start').classList.add('hidden');
    document.getElementById('trainer-mode').classList.remove('hidden');

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

function updateTrainerProgressNote() {
    const noteEl = document.getElementById('progress-note');
    if (!noteEl) return;
    const remaining = trainerState.questions.length - trainerState.currentQuestion - 1;
    const answeredCount = trainerState.currentQuestion - trainerState.skippedCount + (trainerState.answered ? 1 : 0);
    noteEl.textContent = `נשארו ${Math.max(remaining, 0)} שאלות | נענו: ${Math.max(answeredCount, 0)} | דולגו: ${trainerState.skippedCount}`;
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
    
    // Display question
    document.getElementById('question-text').textContent = question.statement;
    
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
    const violations = ['DELETION', 'DISTORTION', 'GENERALIZATION'];
    const shuffled = shuffleArray(violations);
    const mcqContainer = document.getElementById('mcq-options');
    if (!mcqContainer) return;
    mcqContainer.innerHTML = '';

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

function handleMCQSelection(event, question, selectedOption) {
    if (trainerState.answered) return;
    trainerState.answered = true;

    const correctCategory = getQuestionCategoryKey(question);
    const isCorrect = selectedOption === correctCategory;

    if (isCorrect) {
        trainerState.correctCount++;
        trainerState.sessionXP += 10;
        addXP(10);
        playUISound('correct');
    } else {
        playUISound('wrong');
    }

    showFeedback(isCorrect, question, selectedOption);
    updateTrainerStats();
}

function showFeedback(isCorrect, question, selectedViolation) {
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
                <p style="margin-top: 15px; color: #28a745; font-weight: bold;">+10 XP</p>
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
    const attempted = trainerState.currentQuestion + (trainerState.answered ? 1 : 0) - trainerState.skippedCount;
    const safeAttempted = Math.max(attempted, 1);
    const successRate = Math.round((trainerState.correctCount / safeAttempted) * 100);

    document.getElementById('correct-count').textContent = trainerState.correctCount;
    document.getElementById('success-rate').textContent = `${successRate}%`;
    document.getElementById('session-xp').textContent = trainerState.sessionXP;
}

function showTrainerHint() {
    if (trainerState.currentQuestion >= trainerState.questions.length) return;
    const question = trainerState.questions[trainerState.currentQuestion];
    const categoryKey = getQuestionCategoryKey(question);
    const statementText = question.statement || '';

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
    trainerState.skippedCount++;
    showHintMessage('דילגת לשאלה הבאה');
    playUISound('skip');
    trainerState.currentQuestion++;
    loadNextQuestion();
}

function endTrainerSession() {
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

    hideTrainerInfoPanels();
    const feedbackSection = document.getElementById('feedback-section');
    if (feedbackSection) {
        feedbackSection.classList.add('hidden');
        feedbackSection.classList.remove('visible');
    }

    document.getElementById('correct-count').textContent = '0';
    document.getElementById('success-rate').textContent = '0%';
    document.getElementById('session-xp').textContent = '0';
    document.getElementById('progress-fill').style.width = '0%';
    const noteEl = document.getElementById('progress-note');
    if (noteEl) noteEl.textContent = '';

    trainerState = {
        isActive: false,
        currentQuestion: 0,
        questions: [],
        selectedCategory: '',
        correctCount: 0,
        sessionXP: 0,
        answered: false,
        hintLevel: 0,
        skippedCount: 0
    };
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

function setupPrismModule() {
    renderPrismLibrary();

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
    const prism = (metaModelData.prisms || []).find(x => x.id === id);
    if (!prism) return alert('פריזמה לא נמצאה');
    document.getElementById('prism-library').classList.add('hidden');
    const detail = document.getElementById('prism-detail');
    detail.classList.remove('hidden');
    document.getElementById('prism-name').textContent = prism.name_he + ' — ' + prism.name_en;
    document.getElementById('prism-desc').textContent = prism.philosophy_core;
    document.getElementById('prism-anchor').textContent = prism.anchor_question_templates[0];
    // clear previous answers
    ['E','B','C','V','I','S'].forEach(l => { const el = document.getElementById('ans-'+l); if (el) el.value=''; });
    document.getElementById('prism-emotion').value = 3; document.getElementById('emotion-display').textContent='3';
    document.getElementById('prism-resistance').value = 2; document.getElementById('resistance-display').textContent='2';
    // store current prism in a temp
    detail.setAttribute('data-prism-id', id);
    // Populate prepared items and enable drag/drop into level inputs
    populatePreparedItems(prism);
    attachMappingDropHandlers();
}

function handlePrismSubmit() {
    const id = document.getElementById('prism-detail').getAttribute('data-prism-id');
    const prism = (metaModelData.prisms || []).find(x => x.id === id);
    if (!prism) return alert('אין פריזמה פעילה');
    const answers = [];
    ['E','B','C','V','I','S'].forEach(l => {
        const v = document.getElementById('ans-'+l).value.trim();
        if (v) answers.push({ level: l, text: v });
    });
    const emotion = parseInt(document.getElementById('prism-emotion').value || '3');
    const resistance = parseInt(document.getElementById('prism-resistance').value || '2');

    const session = {
        datetime: new Date().toISOString(),
        prism_id: prism.id,
        prism_name: prism.name_he,
        anchor: prism.anchor_question_templates[0],
        answers: answers,
        emotion: emotion,
        resistance: resistance
    };

    const recommendation = computePivotRecommendation(session);
    renderPrismResult(session, recommendation);
    savePrismSession(session, recommendation);
}

function computePivotRecommendation(session) {
    // simple heuristic per spec: choose level with most answers, but prefer lower-level small wins
    const counts = {E:0,B:0,C:0,V:0,I:0,S:0};
    session.answers.forEach(a => { if (counts[a.level] !== undefined) counts[a.level]++; });
    // rank levels low->high for small wins: E,B,C,V,I,S
    const order = ['E','B','C','V','I','S'];
    // if identity-heavy and high resistance -> recommend lower level available
    const totalAnswers = session.answers.length;
    const identityCount = counts['I'];
    if (identityCount > 0 && session.resistance >= 4) {
        // find first lower-level that has at least one answer (E/B/C)
        for (const l of ['B','C','E']) {
            if (counts[l] > 0) return { pivot: l, reason: 'מאמץ מזערי — מומלץ להתחיל ברמה נמוכה כדי ליצור Small Win' };
        }
    }
    // otherwise pick level with max count, tie-break to lower level
    let best = 'E'; let bestCount = -1;
    for (const l of order) {
        if (counts[l] > bestCount) { best = l; bestCount = counts[l]; }
    }
    const levelNames = {E:'סביבה (E)',B:'התנהגות (B)',C:'יכולות (C)',V:'ערכים/אמונות (V)',I:'זהות (I)',S:'שייכות (S)'};
    const reason = bestCount>0 ? `הרבה תשובות נופלות ב${levelNames[best]} — זהו מקום הגיוני למקד Small Win` : 'לא נמצאו תשובות — שקול להתחיל ב-B או ב-E עם צעד קטן';
    return { pivot: best, reason };
}

function renderPrismResult(session, recommendation) {
    const out = document.getElementById('prism-result');
    out.classList.remove('hidden');
    out.innerHTML = `
        <h4>מפת תשובות — ${session.prism_name}</h4>
        <p><strong>שאלת עוגן:</strong> ${session.anchor}</p>
        <div class="blueprint-section">
            <h4>תשובות לפי רמות</h4>
            <ul>
                ${session.answers.map(a => `<li><strong>${a.level}:</strong> ${a.text}</li>`).join('')}
            </ul>
        </div>
        <div class="blueprint-section">
            <h4>המלצת Pivot</h4>
            <p><strong>${recommendation.pivot}</strong> — ${recommendation.reason}</p>
            <p>עוצמת רגש: ${session.emotion}, התנגדות: ${session.resistance}</p>
        </div>
        <div class="action-buttons">
            <button class="btn btn-secondary" onclick="exportPrismSession()">📥 ייצא סשן JSON</button>
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
        div.className = 'prepared-item';
        div.textContent = text;
        div.title = text;
        div.setAttribute('draggable', 'true');

        div.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', text);
        });

        // click to copy into focused or first empty input
        div.addEventListener('click', () => copyPreparedToFocusedOrEmpty(text));

        list.appendChild(div);
    });
}

function attachMappingDropHandlers() {
    const inputs = document.querySelectorAll('.mapping-input');
    inputs.forEach(inp => {
        inp.addEventListener('dragover', (e) => e.preventDefault());
        inp.addEventListener('drop', (e) => {
            e.preventDefault();
            const txt = e.dataTransfer.getData('text/plain');
            if (txt) inp.value = txt;
        });
        inp.addEventListener('focus', () => {
            document.querySelectorAll('.mapping-input').forEach(i => i.classList.remove('focused'));
            inp.classList.add('focused');
        });
    });
}

function copyPreparedToFocusedOrEmpty(text) {
    const focused = document.querySelector('.mapping-input.focused');
    if (focused) { focused.value = text; focused.focus(); return; }
    const empty = Array.from(document.querySelectorAll('.mapping-input')).find(i => !i.value);
    if (empty) { empty.value = text; empty.focus(); return; }
    const first = document.querySelector('.mapping-input');
    if (first) { first.value = text; first.focus(); }
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
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== PROGRESS TRACKING & GAMIFICATION ====================

function loadUserProgress() {
    const saved = localStorage.getItem('userProgress');
    if (saved) {
        userProgress = JSON.parse(saved);
    }
}

function saveUserProgress() {
    localStorage.setItem('userProgress', JSON.stringify(userProgress));
}

function addXP(amount) {
    userProgress.xp += amount;
    updateStreak();
    checkAndAwardBadges();
    saveUserProgress();
    updateProgressHub();
}

function updateStreak() {
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

function checkAndAwardBadges() {
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

function updateProgressHub() {
    const streakEl = document.getElementById('streak-count');
    const xpEl = document.getElementById('xp-count');
    const badgeCountEl = document.getElementById('badge-count');
    const sessionEl = document.getElementById('session-count');
    const badgesDisplay = document.getElementById('badges-display');
    
    if (streakEl) streakEl.textContent = `${userProgress.streak} ימים`;
    if (xpEl) xpEl.textContent = userProgress.xp;
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

// ==================== END OF APP ===================

// ==================== END OF APP ===================
