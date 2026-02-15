// Global Variables
let metaModelData = {};
let practiceCount = 0;
let currentStatementIndex = 0;
let userProgress = { xp: 0, streak: 0, badges: [], sessions: 0, lastSessionDate: null };

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    loadUserProgress();
    loadMetaModelData();
    setupTabNavigation();
    setupPracticeMode();
    setupBlueprintBuilder();
    setupPrismModule();
    initializeProgressHub();
    showLoadingIndicator();
});

// Load Meta Model data from JSON
async function loadMetaModelData() {
    try {
        const response = await fetch('data/meta-model-violations.json');
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
    
    startBtn.addEventListener('click', () => {
        const selectedCategory = categorySelect.value;
        if (!selectedCategory) {
            showHintMessage('בחר קטגוריה תחילה!');
            return;
        }
        startTrainer(selectedCategory);
    });
    
    if (hintTrigger) {
        hintTrigger.addEventListener('click', showTrainerHint);
    }
}

function showHintMessage(message) {
    const hintBox = document.getElementById('hint-box');
    const hintText = document.getElementById('hint-text');
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
    
    // Initialize trainer state
    trainerState = {
        isActive: true,
        currentQuestion: 0,
        questions: statements.slice(0, 10), // Up to 10 questions
        selectedCategory: categoryId,
        correctCount: 0,
        sessionXP: 0,
        answered: false
    };
    
    // Show trainer UI, hide start section
    document.getElementById('trainer-start').classList.add('hidden');
    document.getElementById('trainer-mode').classList.remove('hidden');
    
    // Load first question
    loadNextQuestion();
}

function loadNextQuestion() {
    if (trainerState.currentQuestion >= trainerState.questions.length) {
        endTrainerSession();
        return;
    }
    
    const question = trainerState.questions[trainerState.currentQuestion];
    trainerState.answered = false;
    
    // Update progress
    const progress = ((trainerState.currentQuestion) / trainerState.questions.length) * 100;
    document.getElementById('progress-fill').style.width = progress + '%';
    document.getElementById('current-q').textContent = trainerState.currentQuestion + 1;
    document.getElementById('total-q').textContent = trainerState.questions.length;
    
    // Display question
    document.getElementById('question-text').textContent = question.statement;
    
    // Hide feedback
    document.getElementById('feedback-section').classList.remove('visible');
    document.getElementById('hint-display').classList.remove('visible');
    
    // Generate MCQ options
    generateMCQOptions(question);
}

function generateMCQOptions(question) {
    const allStatements = metaModelData.practice_statements;
    const violations = [
        'DELETION',
        'DISTORTION',
        'GENERALIZATION'
    ];
    
    // Correct answer
    const correctViolation = question.violation;
    
    // Get 3 other violations as distractors
    const incorrectOptions = violations.filter(v => v !== correctViolation);
    
    // Shuffle options
    const options = [correctViolation, ...incorrectOptions];
    const shuffled = options.sort(() => Math.random() - 0.5);
    
    // Render options
    const mcqContainer = document.getElementById('mcq-options');
    mcqContainer.innerHTML = '';
    
    shuffled.forEach((option, index) => {
        const optionId = `option-${index}`;
        const label = {
            'DELETION': 'מחיקה (Deletion)',
            'DISTORTION': 'עיוות (Distortion)',
            'GENERALIZATION': 'הכללה (Generalization)'
        }[option];
        
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
        
        // Add change event listener
        document.getElementById(optionId).addEventListener('change', (e) => {
            handleMCQSelection(e, question, option);
        });
    });
}

function handleMCQSelection(event, question, selectedOption) {
    if (trainerState.answered) return;
    
    trainerState.answered = true;
    
    const isCorrect = selectedOption === question.violation;
    
    // Award XP for correct answer
    if (isCorrect) {
        trainerState.correctCount++;
        trainerState.sessionXP += 10;
        addXP(10); // Add to user progress
    }
    
    // Show feedback
    showFeedback(isCorrect, question, selectedOption);
    
    // Update stats
    updateTrainerStats();
}

function showFeedback(isCorrect, question, selectedViolation) {
    const feedbackSection = document.getElementById('feedback-section');
    const feedbackContent = document.getElementById('feedback-content');
    
    const correctLabel = {
        'DELETION': 'מחיקה (Deletion)',
        'DISTORTION': 'עיוות (Distortion)',
        'GENERALIZATION': 'הכללה (Generalization)'
    };
    
    let feedbackHTML = '';
    
    if (isCorrect) {
        feedbackHTML = `
            <div class="correct">
                <strong>✅ נכון!</strong>
                <p class="explanation">
                    <strong>קטגוריה:</strong> ${correctLabel[question.violation]}<br>
                    <strong>שאלה מוצעת:</strong> "${question.suggested_question}"<br>
                    <strong>הסבר:</strong> ${question.explanation}
                </p>
                <p style="margin-top: 15px; color: #28a745; font-weight: bold;">+10 XP 🎉</p>
            </div>
        `;
    } else {
        feedbackHTML = `
            <div class="incorrect">
                <strong>❌ לא נכון</strong>
                <p class="explanation">
                    <strong>בחרת:</strong> ${correctLabel[selectedViolation]}<br>
                    <strong>התשובה הנכונה:</strong> ${correctLabel[question.violation]}<br>
                    <strong>שאלה מוצעת:</strong> "${question.suggested_question}"<br>
                    <strong>הסבר:</strong> ${question.explanation}
                </p>
            </div>
        `;
    }
    
    feedbackContent.innerHTML = feedbackHTML;
    feedbackSection.classList.add('visible');
    
    // Add next button handler
    document.getElementById('next-question-btn').onclick = () => {
        trainerState.currentQuestion++;
        loadNextQuestion();
    };
}

function updateTrainerStats() {
    const total = trainerState.currentQuestion + 1;
    const successRate = Math.round((trainerState.correctCount / total) * 100);
    
    document.getElementById('correct-count').textContent = trainerState.correctCount;
    document.getElementById('success-rate').textContent = successRate + '%';
    document.getElementById('session-xp').textContent = trainerState.sessionXP;
}

function showTrainerHint() {
    if (trainerState.currentQuestion >= trainerState.questions.length) return;
    
    const question = trainerState.questions[trainerState.currentQuestion];
    
    const hints = {
        'DELETION': '🔍 המידע חסר - מי? מה? כמה? לפי מי? איפה?',
        'DISTORTION': '🔄 יש כאן הנחה או שינוי בלי ראיות - מה מוכן? אילו מילים חשודות?',
        'GENERALIZATION': '📈 יש הכללה חזקה - באמת תמיד? באמת אף פעם? תמיד לכולם?'
    };
    
    const difficultyHint = {
        'easy': 'הפרה בסיסית - חשוב על השפה',
        'medium': 'הפרה בינונית - צריך להעמיק',
        'hard': 'הפרה מורכבת - קורא קשיבה'
    };
    
    let hintText = `${hints[question.category] || ''}\n\nרמת קשיות: ${difficultyHint[question.difficulty]}`;
    
    const hintDisplay = document.getElementById('hint-display');
    hintDisplay.innerHTML = `<p>${hintText.replace(/\n/g, '<br>')}</p>`;
    hintDisplay.classList.add('visible');
}

function endTrainerSession() {
    // Show completion message
    const feedbackSection = document.getElementById('feedback-section');
    const feedbackContent = document.getElementById('feedback-content');
    
    const successRate = Math.round((trainerState.correctCount / trainerState.questions.length) * 100);
    
    let message = '';
    if (successRate === 100) {
        message = '🏆 מושלם! קיבלת את הכל נכון!';
    } else if (successRate >= 80) {
        message = '🎉 מעולה! הצלחת 80% ויותר!';
    } else if (successRate >= 60) {
        message = '👍 טוב! המשך להתרגל!';
    } else {
        message = '💪 עדיין יש מה ללמוד - המשך!';
    }
    
    feedbackContent.innerHTML = `
        <div class="correct" style="text-align: center;">
            <h2>${message}</h2>
            <p style="font-size: 1.15em;">
                <strong>ציון סופי:</strong> ${trainerState.correctCount} / ${trainerState.questions.length}<br>
                <strong>קצב הצלחה:</strong> ${successRate}%<br>
                <strong>XP שהרווחת:</strong> +${trainerState.sessionXP}
            </p>
            <button class="btn btn-primary" onclick="resetTrainer()" style="margin-top: 20px; width: 100%;">תרגול נוסף →</button>
        </div>
    `;
    
    // Hide questions, show completion
    document.getElementById('question-display').style.display = 'none';
    document.getElementById('mcq-options').style.display = 'none';
    document.getElementById('trainer-hints').style.display = 'none';
    feedbackSection.classList.add('visible');
}

function resetTrainer() {
    // Reset UI
    document.getElementById('trainer-mode').classList.add('hidden');
    document.getElementById('trainer-start').classList.remove('hidden');
    document.getElementById('question-display').style.display = 'block';
    document.getElementById('mcq-options').style.display = 'flex';
    document.getElementById('trainer-hints').style.display = 'block';
    
    // Reset stats
    document.getElementById('correct-count').textContent = '0';
    document.getElementById('success-rate').textContent = '0%';
    document.getElementById('session-xp').textContent = '0';
    
    // Reset state
    trainerState = {
        isActive: false,
        currentQuestion: 0,
        questions: [],
        selectedCategory: '',
        correctCount: 0,
        sessionXP: 0,
        answered: false
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
        if (e.target && e.target.classList.contains('prism-open-btn')) {
            const id = e.target.getAttribute('data-id');
            openPrism(id);
        }
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
