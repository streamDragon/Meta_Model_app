// Global Variables
let metaModelData = {};
let practiceCount = 0;
let currentStatementIndex = 0;

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    loadMetaModelData();
    setupTabNavigation();
    setupPracticeMode();
    setupBlueprintBuilder();
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
    } catch (error) {
        console.error('Error loading data:', error);
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
        });
    });
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
