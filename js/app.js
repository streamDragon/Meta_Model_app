// Global Variables
let metaModelData = {};
let practiceCount = 0;
let currentStatementIndex = 0;

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    loadMetaModelData();
    setupTabNavigation();
    setupPracticeMode();
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

// Utility to check data
function logMetaModelData() {
    console.log('Meta Model Data:', metaModelData);
    console.log('Total categories:', metaModelData.categories?.length || 0);
    console.log('Total practice statements:', metaModelData.practice_statements?.length || 0);
}
