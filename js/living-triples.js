const LIVING_TRIPLES_STORAGE_KEY = 'living_triples_progress_v1';
const LIVING_TRIPLES_DEVIATION_TOOLTIP = 'זו תשובה מעניינת, אבל היא לא בתוך הפריזמה הנוכחית.';

let livingTriplesDataState = {
    rows: [],
    scenarios: [],
    categories: [],
    anchorTable: []
};

const livingTriplesState = {
    progress: null,
    queue: [],
    index: 0,
    sessionScore: 0,
    activeScenario: null,
    activeRow: null,
    selectedCategory: '',
    categoryAttempts: 0,
    categoryResolved: false,
    revealSlots: [],
    revealMessage: '',
    reflectionDone: false,
    reflectionText: '',
    challengeDone: false,
    challengeTargetIndex: -1,
    challengeChoiceIndex: -1,
    challengeAttempts: 0,
    scoreBreakdown: null,
    futurePace: null,
    demoTimer: null,
    elements: null
};

function ltEscape(value) {
    if (typeof escapeHtml === 'function') return escapeHtml(value);
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function ltPlay(kind) {
    if (typeof playUISound === 'function') playUISound(kind);
}

function ltShuffle(items) {
    if (typeof shuffleArray === 'function') return shuffleArray(items);
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function getDefaultLivingTriplesProgress() {
    return {
        played: 0,
        totalScore: 0,
        bestScore: 0,
        lastPlayedAt: null
    };
}

function loadLivingTriplesProgress() {
    const defaults = getDefaultLivingTriplesProgress();
    try {
        const raw = localStorage.getItem(LIVING_TRIPLES_STORAGE_KEY);
        if (!raw) return defaults;
        const parsed = JSON.parse(raw);
        return {
            ...defaults,
            ...(parsed || {})
        };
    } catch (error) {
        console.warn('Cannot parse living triples progress:', error);
        return defaults;
    }
}

function saveLivingTriplesProgress() {
    if (!livingTriplesState.progress) return;
    localStorage.setItem(LIVING_TRIPLES_STORAGE_KEY, JSON.stringify(livingTriplesState.progress));
}

function bindLivingTriplesClick(id, handler) {
    const el = document.getElementById(id);
    if (!el || el.dataset.ltBound === 'true') return;
    el.dataset.ltBound = 'true';
    el.addEventListener('click', handler);
}

function getLivingTriplesRowById(rowId) {
    return (livingTriplesDataState.rows || []).find(row => row.id === rowId) || null;
}

function getLivingTriplesRowByCategory(categoryId) {
    const normalized = ltNormalizeCategoryId(categoryId);
    if (!normalized) return null;
    return (livingTriplesDataState.rows || []).find(row =>
        Array.isArray(row.categories) && row.categories.some(category => category.id === normalized)
    ) || null;
}

function getLivingTriplesRowNumber(rowId) {
    const idx = (livingTriplesDataState.rows || []).findIndex(row => row.id === rowId);
    return idx >= 0 ? idx + 1 : null;
}

function getLivingTriplesCategories() {
    if (Array.isArray(livingTriplesDataState.categories) && livingTriplesDataState.categories.length) {
        return livingTriplesDataState.categories.map(category => {
            const rowId = category.rowId || getLivingTriplesRowByCategory(category.id)?.id || '';
            return {
                id: category.id,
                label: category.label,
                rowId,
                rowNumber: getLivingTriplesRowNumber(rowId)
            };
        });
    }

    return (livingTriplesDataState.rows || []).flatMap(row => {
        const rowNumber = getLivingTriplesRowNumber(row.id);
        return (row.categories || []).map(category => ({
            id: category.id,
            label: category.label,
            rowId: row.id,
            rowNumber
        }));
    });
}

function ltToStringArray(value) {
    if (Array.isArray(value)) {
        return value.map(item => String(item || '').trim()).filter(Boolean);
    }
    const single = String(value || '').trim();
    return single ? [single] : [];
}

function ltNormalizeFlow(flow, slotKey = 'slot') {
    if (!flow || typeof flow !== 'object') return null;
    const slotRaw = flow[slotKey] ?? flow.slot ?? flow.slot_index;
    const slot = Number(slotRaw);
    if (!Number.isInteger(slot) || slot < 0 || slot > 2) return null;
    return {
        slot,
        finalUnknown: Boolean(flow.finalUnknown ?? flow.final_unknown ?? false),
        followUpAnswer: String(flow.followUpAnswer ?? flow.follow_up_answer ?? '').trim(),
        answer: String(flow.answer ?? '').trim(),
        joinLead: String(flow.joinLead ?? flow.join_lead ?? '').trim(),
        targetRowId: String(flow.targetRowId ?? flow.target_row_id ?? '').trim(),
        targetCategory: String(flow.targetCategory ?? flow.target_category ?? '').trim()
    };
}

function ltNormalizeRowId(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return '';
    if (/^row[1-5]$/.test(raw)) return raw;
    if (/^[1-5]$/.test(raw)) return `row${raw}`;
    return raw;
}

function ltNormalizeCategoryId(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return '';
    const compact = raw
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .replace(/_+/g, '_');

    const aliases = {
        lost_performative: 'lost_performative',
        assumptions: 'assumptions',
        assumption: 'assumptions',
        mind_reading: 'mind_reading',
        universal_quantifier: 'universal_quantifier',
        universal_quantifiers: 'universal_quantifier',
        modal_operator: 'modal_operator',
        cause_effect: 'cause_effect',
        cause_and_effect: 'cause_effect',
        nominalisations: 'nominalisations',
        nominalization: 'nominalisations',
        nominalisationss: 'nominalisations',
        identity_predicates: 'identity_predicates',
        complex_equivalence: 'complex_equivalence',
        comparative_deletion: 'comparative_deletion',
        time_space_predicates: 'time_space_predicates',
        lack_referential_index: 'lack_referential_index',
        lack_of_referential_index: 'lack_referential_index',
        non_referring_nouns: 'non_referring_nouns',
        sensory_predicates: 'sensory_predicates',
        unspecified_verbs: 'unspecified_verbs',
        unspecified_verb: 'unspecified_verbs'
    };

    return aliases[compact] || compact;
}

function normalizeLivingTriplesScenario(rawScenario, index) {
    if (!rawScenario || typeof rawScenario !== 'object') return null;

    const scenarioId = String(rawScenario.scenarioId || rawScenario.scenario_id || `lt_scene_${index + 1}`).trim();
    const rowId = ltNormalizeRowId(rawScenario.rowId || rawScenario.row_id || '');
    const correctCategory = ltNormalizeCategoryId(rawScenario.correctCategory || rawScenario.correct_category || '');
    if (!rowId || !correctCategory) return null;

    const title = String(rawScenario.title || rawScenario.scenario_title || `Scenario ${index + 1}`).trim();
    const text = ltToStringArray(rawScenario.text || rawScenario.client_text);
    const highlights = ltToStringArray(rawScenario.highlights);
    const revealAnswers = Array.isArray(rawScenario.revealAnswers || rawScenario.reveal_answers)
        ? (rawScenario.revealAnswers || rawScenario.reveal_answers).map(item => {
            if (Array.isArray(item)) return item.map(v => String(v || '').trim()).filter(Boolean);
            return String(item || '').trim();
        })
        : [];
    const anchors = Array.isArray(rawScenario.anchors) ? rawScenario.anchors.map(v => String(v || '').trim()) : [];
    const challengeOptions = Array.isArray(rawScenario.challengeOptions || rawScenario.challenge_options)
        ? (rawScenario.challengeOptions || rawScenario.challenge_options).map(v => String(v || '').trim())
        : [];
    const challengeReplies = Array.isArray(rawScenario.challengeReplies || rawScenario.challenge_replies)
        ? (rawScenario.challengeReplies || rawScenario.challenge_replies).map(v => String(v || '').trim())
        : [];

    const unknownFlow = ltNormalizeFlow(rawScenario.unknownFlow || rawScenario.unknown_flow, 'slot');
    const deviationFlow = ltNormalizeFlow(rawScenario.deviationFlow || rawScenario.deviation_flow, 'slot');

    return {
        ...rawScenario,
        scenarioId,
        rowId,
        title,
        text,
        highlights,
        correctCategory,
        anchors,
        revealAnswers,
        challengeOptions,
        challengeReplies,
        reflectionTemplate: String(rawScenario.reflectionTemplate || rawScenario.reflection_template || '').trim(),
        fillRules: rawScenario.fillRules || rawScenario.fill_rules || null,
        directionQuestion: String(rawScenario.directionQuestion || rawScenario.direction_question || '').trim(),
        clientGoal: String(rawScenario.clientGoal || rawScenario.client_goal || '').trim(),
        hypnoticIntervention: String(rawScenario.hypnoticIntervention || rawScenario.hypnotic_intervention || '').trim(),
        rememberNote: String(rawScenario.rememberNote || rawScenario.remember_note || rawScenario.apply_note || '').trim(),
        futurePacePrompt: String(rawScenario.futurePacePrompt || rawScenario.future_pace_prompt || '').trim(),
        futurePaceExample: String(rawScenario.futurePaceExample || rawScenario.future_pace_example || '').trim(),
        unknownFlow,
        deviationFlow
    };
}

function getLivingTriplesAnchorQuestion(slotIndex) {
    const scenarioAnchors = Array.isArray(livingTriplesState.activeScenario?.anchors)
        ? livingTriplesState.activeScenario.anchors
        : [];
    const scenarioQuestion = String(scenarioAnchors[slotIndex] || '').trim();
    if (scenarioQuestion) return scenarioQuestion;
    return String(livingTriplesState.activeRow?.revealQuestions?.[slotIndex] || '').trim();
}

function getLivingTriplesChallengeOptions() {
    const scenarioOptions = Array.isArray(livingTriplesState.activeScenario?.challengeOptions)
        ? livingTriplesState.activeScenario.challengeOptions
        : [];
    const cleaned = scenarioOptions.map(item => String(item || '').trim()).filter(Boolean);
    if (cleaned.length === 3) return cleaned;
    return (livingTriplesState.activeRow?.challenges || []).map(item => String(item || '').trim());
}

function getLivingTriplesReflectionTemplate() {
    const scenarioTemplate = String(livingTriplesState.activeScenario?.reflectionTemplate || '').trim();
    if (scenarioTemplate) return scenarioTemplate;
    return String(livingTriplesState.activeRow?.reflectionTemplate || '').trim();
}

async function loadLivingTriplesData() {
    try {
        const response = await fetch('data/living-triples.json', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        const rows = Array.isArray(payload?.rows)
            ? payload.rows.map(row => ({
                ...row,
                id: ltNormalizeRowId(row?.id || ''),
                categories: Array.isArray(row?.categories)
                    ? row.categories.map(category => ({
                        ...category,
                        id: ltNormalizeCategoryId(category?.id || category?.label || '')
                    }))
                    : []
            })).filter(row => row.id)
            : [];
        const scenarios = Array.isArray(payload?.scenarios)
            ? payload.scenarios.map(normalizeLivingTriplesScenario).filter(Boolean)
            : [];
        if (!rows.length || !scenarios.length) throw new Error('living triples payload missing rows/scenarios');

        livingTriplesDataState = {
            ...payload,
            rows,
            scenarios,
            categories: Array.isArray(payload?.categories) ? payload.categories : [],
            anchorTable: Array.isArray(payload?.anchorTable) ? payload.anchorTable : []
        };
        return true;
    } catch (error) {
        console.error('Cannot load data/living-triples.json', error);
        return false;
    }
}

function clearLivingTriplesDemoTimer() {
    if (livingTriplesState.demoTimer) {
        clearInterval(livingTriplesState.demoTimer);
        livingTriplesState.demoTimer = null;
    }
}

function setLivingTriplesScreen(screenName = 'onboarding') {
    if (!livingTriplesState.elements) return;
    const screens = {
        onboarding: livingTriplesState.elements.screenOnboarding,
        practice: livingTriplesState.elements.screenPractice,
        wrap: livingTriplesState.elements.screenWrap
    };
    Object.entries(screens).forEach(([key, el]) => {
        if (!el) return;
        el.classList.toggle('hidden', key !== screenName);
    });
}

function renderLivingTriplesOnboarding(statusMessage = '') {
    if (!livingTriplesState.elements) return;
    setLivingTriplesScreen('onboarding');
    const played = Number(livingTriplesState.progress?.played || 0);
    const totalScore = Number(livingTriplesState.progress?.totalScore || 0);
    const avg = played ? Math.round(totalScore / played) : 0;
    if (livingTriplesState.elements.demoStatus) {
        livingTriplesState.elements.demoStatus.textContent = statusMessage || (played
            ? `תרגלת ${played} סצנות עד עכשיו | ממוצע ${avg}/100`
            : 'מוכן/ה לסשן ראשון של 25 סצנות.');
    }
    if (livingTriplesState.elements.customReflectWrap) {
        livingTriplesState.elements.customReflectWrap.classList.add('hidden');
    }
}

function runLivingTriplesDemo() {
    if (!livingTriplesState.elements) return;
    clearLivingTriplesDemoTimer();
    const steps = [
        'דמו 20 שניות: מזהים קטגוריה אחת בתוך משפט.',
        'השורה כולה נדלקת: 3 רכיבים, פריזמה אחת.',
        'נשאלות 3 שאלות עוגן קצרות (Reveal).',
        'נבנה שיקוף שקוף שמחבר את כל הרכיבים.',
        'נבחר אתגור אחד תואם לרכיב ונקבל תגובה.',
        'זהו. עכשיו עוברים לאימון מלא.'
    ];

    let index = 0;
    if (livingTriplesState.elements.demoBtn) {
        livingTriplesState.elements.demoBtn.disabled = true;
    }
    if (livingTriplesState.elements.demoStatus) {
        livingTriplesState.elements.demoStatus.textContent = steps[index];
    }

    livingTriplesState.demoTimer = setInterval(() => {
        index += 1;
        if (index >= steps.length) {
            clearLivingTriplesDemoTimer();
            if (livingTriplesState.elements.demoBtn) {
                livingTriplesState.elements.demoBtn.disabled = false;
            }
            if (livingTriplesState.elements.demoStatus) {
                livingTriplesState.elements.demoStatus.textContent = 'הדמו הסתיים. לחץ/י \"התחל אימון\" כדי להיכנס ללופ המלא.';
            }
            return;
        }
        if (livingTriplesState.elements.demoStatus) {
            livingTriplesState.elements.demoStatus.textContent = steps[index];
        }
    }, 4000);
}

function getLivingTriplesScenarioRevealAnswer(slotIndex) {
    const answers = livingTriplesState.activeScenario?.revealAnswers;
    if (!Array.isArray(answers)) return '';
    const value = answers[slotIndex];
    if (Array.isArray(value)) {
        const options = value.map(item => String(item || '').trim()).filter(Boolean);
        if (!options.length) return '';
        return options[Math.floor(Math.random() * options.length)] || '';
    }
    return String(value || '').trim();
}

function getLivingTriplesUnknownFlow(slotIndex) {
    const flow = livingTriplesState.activeScenario?.unknownFlow;
    if (!flow || typeof flow !== 'object') return null;
    return Number(flow.slot) === Number(slotIndex) ? flow : null;
}

function getLivingTriplesDeviationFlow(slotIndex) {
    const flow = livingTriplesState.activeScenario?.deviationFlow;
    if (!flow || typeof flow !== 'object') return null;
    return Number(flow.slot) === Number(slotIndex) ? flow : null;
}

function isLivingTriplesRevealResolved(slot) {
    return slot?.status === 'answered' || slot?.status === 'unknown_final';
}

function isLivingTriplesRevealComplete() {
    return Array.isArray(livingTriplesState.revealSlots) && livingTriplesState.revealSlots.length === 3
        && livingTriplesState.revealSlots.every(isLivingTriplesRevealResolved);
}

function buildLivingTriplesAutoReflection() {
    const row = livingTriplesState.activeRow;
    if (!row) return '';

    const fillValues = livingTriplesState.revealSlots.map(slot => {
        if (slot.status === 'unknown_final') return '[חסר]';
        return slot.answer || '[חסר]';
    });
    let fillIndex = 0;
    const template = getLivingTriplesReflectionTemplate();
    const base = String(template || '').replace(/\[[^\]]+\]/g, () => fillValues[fillIndex++] || '[חסר]');

    const unknownLabels = livingTriplesState.revealSlots
        .map((slot, idx) => (slot.status === 'unknown_final' ? row.categories?.[idx]?.label || `Slot ${idx + 1}` : null))
        .filter(Boolean);

    if (!unknownLabels.length) return base;
    return `${base} (חסר רכיב: ${unknownLabels.join(', ')})`;
}

function resetLivingTriplesRoundState() {
    const row = livingTriplesState.activeRow;
    if (!row) return;

    livingTriplesState.selectedCategory = '';
    livingTriplesState.categoryAttempts = 0;
    livingTriplesState.categoryResolved = false;
    livingTriplesState.revealMessage = '';
    livingTriplesState.reflectionDone = false;
    livingTriplesState.reflectionText = '';
    livingTriplesState.challengeDone = false;
    livingTriplesState.challengeTargetIndex = -1;
    livingTriplesState.challengeChoiceIndex = -1;
    livingTriplesState.challengeAttempts = 0;
    livingTriplesState.scoreBreakdown = null;
    livingTriplesState.futurePace = null;

    livingTriplesState.revealSlots = (row.categories || []).map((category, index) => ({
        slotIndex: index,
        categoryId: category.id,
        asked: false,
        status: 'pending',
        answer: '',
        followUpUsed: false,
        rephraseUsed: false,
        rephraseOpen: false,
        rephraseText: '',
        deviationHandled: false
    }));
}

function renderLivingTriplesCategoryButtons() {
    if (!livingTriplesState.elements?.categoryButtons) return;
    const categories = getLivingTriplesCategories();
    const container = livingTriplesState.elements.categoryButtons;
    container.innerHTML = '';

    categories.forEach(category => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'lt-category-btn';
        button.dataset.ltCategory = category.id;
        if (livingTriplesState.selectedCategory === category.id) button.classList.add('is-selected');
        if (livingTriplesState.categoryResolved) button.disabled = true;

        const label = document.createElement('span');
        label.className = 'lt-category-label';
        label.textContent = category.label || category.id;

        const hint = document.createElement('small');
        hint.className = 'lt-category-hint';
        hint.textContent = category.rowNumber ? `Row ${category.rowNumber}` : '';

        button.appendChild(label);
        button.appendChild(hint);
        container.appendChild(button);
    });
}

function renderLivingTriplesRowLit() {
    if (!livingTriplesState.elements || !livingTriplesState.activeRow) return;
    const row = livingTriplesState.activeRow;
    const rowNumber = getLivingTriplesRowNumber(row.id) || '?';
    if (livingTriplesState.elements.rowTitle) {
        livingTriplesState.elements.rowTitle.textContent = `Row ${rowNumber} — ${row.label}`;
    }

    if (!livingTriplesState.elements.rowChips) return;
    livingTriplesState.elements.rowChips.innerHTML = '';
    (row.categories || []).forEach(category => {
        const chip = document.createElement('span');
        chip.className = 'lt-row-chip';
        if (category.id === livingTriplesState.selectedCategory) chip.classList.add('is-selected');
        chip.textContent = category.label;
        livingTriplesState.elements.rowChips.appendChild(chip);
    });
}

function getLivingTriplesRevealStatusLabel(slot) {
    switch (slot.status) {
        case 'answered': return 'נחשף';
        case 'unknown_wait': return 'Unknown: נדרש Follow-up';
        case 'unknown_final': return 'Unknown slot';
        case 'deviation_wait': return 'סטייה מהפריזמה';
        default: return 'ממתין';
    }
}

function renderLivingTriplesReveal() {
    if (!livingTriplesState.elements?.revealCards || !livingTriplesState.activeRow) return;
    const row = livingTriplesState.activeRow;
    const container = livingTriplesState.elements.revealCards;
    container.innerHTML = '';

    livingTriplesState.revealSlots.forEach((slot, idx) => {
        const category = row.categories?.[idx] || {};
        const question = slot.rephraseText || getLivingTriplesAnchorQuestion(idx) || '';
        const statusClass = `status-${slot.status || 'pending'}`;
        const answerClass = slot.status === 'unknown_wait' || slot.status === 'unknown_final'
            ? 'is-unknown'
            : slot.status === 'deviation_wait'
                ? 'is-deviation'
                : 'is-ok';
        const deviationFlow = getLivingTriplesDeviationFlow(idx);
        const joinLead = deviationFlow?.joinLead || `חשוב מה שעלה, ובוא נחזור לשאלה: ${question}`;

        const card = document.createElement('article');
        card.className = `lt-reveal-card ${statusClass}`;
        card.innerHTML = `
            <div class="lt-reveal-head">
                <strong>${ltEscape(category.label || `Slot ${idx + 1}`)}</strong>
                <span>${ltEscape(getLivingTriplesRevealStatusLabel(slot))}</span>
            </div>
            <p class="lt-anchor-question">${ltEscape(question)}</p>
            ${slot.asked ? `<div class="lt-answer-block ${answerClass}">${ltEscape(slot.answer || '')}</div>` : ''}
            ${slot.status === 'deviation_wait' ? `
                <p class="lt-deviation-tooltip">${ltEscape(LIVING_TRIPLES_DEVIATION_TOOLTIP)}</p>
                <p class="lt-joinlead-text">${ltEscape(joinLead)}</p>
                <button class="btn btn-secondary" data-lt-reveal-action="joinlead" data-slot="${idx}" type="button">חזור לשאלה</button>
            ` : ''}
            ${slot.status === 'unknown_wait' ? `
                <p class="lt-followup-text">${ltEscape(livingTriplesState.activeScenario?.followUp || row.followUp || '')}</p>
                <button class="btn btn-secondary" data-lt-reveal-action="followup" data-slot="${idx}" type="button">Follow-up</button>
            ` : ''}
            ${!slot.asked ? `
                <div class="lt-reveal-actions">
                    <button class="btn btn-primary" data-lt-reveal-action="ask" data-slot="${idx}" type="button">שאל שאלת עוגן</button>
                    ${!slot.rephraseUsed ? `<button class="btn btn-secondary" data-lt-reveal-action="rephrase-open" data-slot="${idx}" type="button">Rephrase once</button>` : ''}
                </div>
            ` : ''}
            ${slot.rephraseOpen && !slot.asked ? `
                <div class="lt-rephrase-wrap">
                    <textarea id="lt-rephrase-input-${idx}" rows="2" placeholder="ניסוח חלופי קצר...">${ltEscape(slot.rephraseText || question)}</textarea>
                    <button class="btn btn-secondary" data-lt-reveal-action="rephrase-save" data-slot="${idx}" type="button">שמור ושאל</button>
                </div>
            ` : ''}
            ${slot.asked ? '<p class="lt-question-lock-note">Question Lock: השאלה נעולה.</p>' : ''}
        `;
        container.appendChild(card);
    });

    const completed = livingTriplesState.revealSlots.filter(isLivingTriplesRevealResolved).length;
    const total = livingTriplesState.revealSlots.length;
    if (livingTriplesState.elements.revealStatus) {
        const suffix = livingTriplesState.revealMessage ? ` · ${livingTriplesState.revealMessage}` : '';
        livingTriplesState.elements.revealStatus.textContent = `${completed}/${total} תשובות Reveal הושלמו${suffix}`;
    }

    if (isLivingTriplesRevealComplete()) {
        openLivingTriplesReflectStepIfReady();
    }
}

function askLivingTriplesRevealSlot(slotIndex) {
    const slot = livingTriplesState.revealSlots?.[slotIndex];
    if (!slot || slot.asked) return;
    slot.asked = true;
    slot.rephraseOpen = false;

    const deviation = getLivingTriplesDeviationFlow(slotIndex);
    if (deviation && !slot.deviationHandled) {
        slot.status = 'deviation_wait';
        slot.answer = String(deviation.answer || '').trim() || LIVING_TRIPLES_DEVIATION_TOOLTIP;
        livingTriplesState.revealMessage = LIVING_TRIPLES_DEVIATION_TOOLTIP;
        ltPlay('next');
        renderLivingTriplesReveal();
        return;
    }

    const unknown = getLivingTriplesUnknownFlow(slotIndex);
    if (unknown && !slot.followUpUsed) {
        slot.status = 'unknown_wait';
        slot.answer = 'אני לא יודע';
        livingTriplesState.revealMessage = 'נדרש Follow-up בתוך אותה שורה.';
        ltPlay('next');
        renderLivingTriplesReveal();
        return;
    }

    slot.status = 'answered';
    slot.answer = getLivingTriplesScenarioRevealAnswer(slotIndex) || '—';
    livingTriplesState.revealMessage = 'תשובת Reveal נשמרה.';
    ltPlay('correct');
    renderLivingTriplesReveal();
}

function followUpLivingTriplesRevealSlot(slotIndex) {
    const slot = livingTriplesState.revealSlots?.[slotIndex];
    if (!slot || slot.status !== 'unknown_wait') return;
    slot.followUpUsed = true;

    const unknown = getLivingTriplesUnknownFlow(slotIndex);
    if (unknown?.finalUnknown) {
        slot.status = 'unknown_final';
        slot.answer = 'אני לא יודע (גם אחרי Follow-up)';
        livingTriplesState.revealMessage = 'Unknown slot נסגר כחסר.';
    } else {
        slot.status = 'answered';
        slot.answer = String(unknown?.followUpAnswer || getLivingTriplesScenarioRevealAnswer(slotIndex) || '—').trim();
        livingTriplesState.revealMessage = 'Follow-up החזיר תשובה בתוך אותה שורה.';
    }
    ltPlay('next');
    renderLivingTriplesReveal();
}

function joinLeadLivingTriplesRevealSlot(slotIndex) {
    const slot = livingTriplesState.revealSlots?.[slotIndex];
    if (!slot || slot.status !== 'deviation_wait') return;
    const deviation = getLivingTriplesDeviationFlow(slotIndex);
    slot.deviationHandled = true;
    slot.status = 'answered';
    slot.answer = getLivingTriplesScenarioRevealAnswer(slotIndex) || '—';
    livingTriplesState.revealMessage = String(deviation?.joinLead || 'חזרנו לפריזמה ולשאלה המקורית.').trim();
    ltPlay('correct');
    renderLivingTriplesReveal();
}

function handleLivingTriplesRevealAction(action, slotIndex) {
    const slot = livingTriplesState.revealSlots?.[slotIndex];
    if (!slot) return;

    if (action === 'ask') {
        askLivingTriplesRevealSlot(slotIndex);
        return;
    }

    if (action === 'rephrase-open') {
        if (slot.asked || slot.rephraseUsed) return;
        slot.rephraseOpen = true;
        renderLivingTriplesReveal();
        return;
    }

    if (action === 'rephrase-save') {
        if (slot.asked || slot.rephraseUsed) return;
        const input = document.getElementById(`lt-rephrase-input-${slotIndex}`);
        const value = String(input?.value || '').trim();
        if (!value) {
            livingTriplesState.revealMessage = 'יש להזין ניסוח חלופי לפני שמירה.';
            renderLivingTriplesReveal();
            return;
        }
        slot.rephraseUsed = true;
        slot.rephraseText = value;
        slot.rephraseOpen = false;
        askLivingTriplesRevealSlot(slotIndex);
        return;
    }

    if (action === 'followup') {
        followUpLivingTriplesRevealSlot(slotIndex);
        return;
    }

    if (action === 'joinlead') {
        joinLeadLivingTriplesRevealSlot(slotIndex);
    }
}

function openLivingTriplesReflectStepIfReady() {
    if (!isLivingTriplesRevealComplete()) return;
    if (!livingTriplesState.elements?.reflectBox) return;
    livingTriplesState.elements.reflectBox.classList.remove('hidden');
    const autoText = buildLivingTriplesAutoReflection();
    if (livingTriplesState.elements.reflectAuto) {
        livingTriplesState.elements.reflectAuto.textContent = autoText;
    }
    if (livingTriplesState.elements.reflectStatus) {
        livingTriplesState.elements.reflectStatus.textContent = 'בחר/י שיקוף אוטומטי או ניסוח אישי.';
    }
}

function useLivingTriplesAutoReflection() {
    if (!isLivingTriplesRevealComplete()) return;
    livingTriplesState.reflectionDone = true;
    livingTriplesState.reflectionText = buildLivingTriplesAutoReflection();
    if (livingTriplesState.elements?.reflectStatus) {
        livingTriplesState.elements.reflectStatus.textContent = 'השיקוף האוטומטי נשמר.';
    }
    openLivingTriplesChallengeStep();
}

function saveLivingTriplesCustomReflection() {
    const value = String(livingTriplesState.elements?.customReflectInput?.value || '').trim();
    if (value.length < 8) {
        if (livingTriplesState.elements?.reflectStatus) {
            livingTriplesState.elements.reflectStatus.textContent = 'צריך לפחות 8 תווים כדי לשמור שיקוף אישי.';
        }
        return;
    }
    livingTriplesState.reflectionDone = true;
    livingTriplesState.reflectionText = value;
    if (livingTriplesState.elements?.reflectStatus) {
        livingTriplesState.elements.reflectStatus.textContent = 'השיקוף האישי נשמר.';
    }
    openLivingTriplesChallengeStep();
}

function openLivingTriplesChallengeStep() {
    if (!livingTriplesState.reflectionDone || !livingTriplesState.elements?.challengeBox) return;
    livingTriplesState.elements.challengeBox.classList.remove('hidden');
    renderLivingTriplesChallenge();
}

function renderLivingTriplesChallenge() {
    if (!livingTriplesState.elements || !livingTriplesState.activeRow) return;
    const row = livingTriplesState.activeRow;
    const challengeOptions = getLivingTriplesChallengeOptions();

    if (livingTriplesState.elements.challengeTargets) {
        livingTriplesState.elements.challengeTargets.innerHTML = '';
        (row.categories || []).forEach((category, idx) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'lt-target-btn';
            if (idx === livingTriplesState.challengeTargetIndex) button.classList.add('is-selected');
            if (livingTriplesState.challengeDone) button.disabled = true;
            button.dataset.ltChallengeTarget = String(idx);
            button.textContent = category.label;
            livingTriplesState.elements.challengeTargets.appendChild(button);
        });
    }

    if (livingTriplesState.elements.challengeOptions) {
        livingTriplesState.elements.challengeOptions.innerHTML = '';
        challengeOptions.forEach((challengeText, idx) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'lt-challenge-btn';
            if (idx === livingTriplesState.challengeChoiceIndex) button.classList.add('is-selected');
            if (livingTriplesState.challengeDone) button.disabled = true;
            button.dataset.ltChallengeOption = String(idx);
            button.innerHTML = `<strong>${ltEscape(row.categories?.[idx]?.label || `רכיב ${idx + 1}`)}</strong><span>${ltEscape(challengeText)}</span>`;
            livingTriplesState.elements.challengeOptions.appendChild(button);
        });
    }
}

function computeLivingTriplesScore() {
    const unknownCount = livingTriplesState.revealSlots.filter(slot => slot.status === 'unknown_final').length;
    const categoryScore = livingTriplesState.categoryResolved
        ? (livingTriplesState.categoryAttempts === 1 ? 40 : 20)
        : 0;
    const revealScore = isLivingTriplesRevealComplete()
        ? (unknownCount ? 24 : 30)
        : 0;
    const reflectionScore = livingTriplesState.reflectionDone ? 15 : 0;
    const challengeScore = livingTriplesState.challengeDone
        ? (livingTriplesState.challengeAttempts === 1 ? 15 : 10)
        : 0;
    return {
        categoryScore,
        revealScore,
        reflectionScore,
        challengeScore,
        total: categoryScore + revealScore + reflectionScore + challengeScore,
        unknownCount
    };
}

function finishLivingTriplesScene() {
    livingTriplesState.scoreBreakdown = computeLivingTriplesScore();
    livingTriplesState.sessionScore += livingTriplesState.scoreBreakdown.total;

    if (!livingTriplesState.progress) livingTriplesState.progress = getDefaultLivingTriplesProgress();
    livingTriplesState.progress.played += 1;
    livingTriplesState.progress.totalScore += livingTriplesState.scoreBreakdown.total;
    livingTriplesState.progress.bestScore = Math.max(
        Number(livingTriplesState.progress.bestScore || 0),
        livingTriplesState.scoreBreakdown.total
    );
    livingTriplesState.progress.lastPlayedAt = new Date().toISOString();
    saveLivingTriplesProgress();

    renderLivingTriplesWrap();
    setLivingTriplesScreen('wrap');
}

function renderLivingTriplesWrap() {
    if (!livingTriplesState.elements?.wrapScore || !livingTriplesState.scoreBreakdown) return;
    const breakdown = livingTriplesState.scoreBreakdown;
    const progress = livingTriplesState.progress || getDefaultLivingTriplesProgress();
    const scenario = livingTriplesState.activeScenario || {};
    const avg = progress.played ? Math.round(progress.totalScore / progress.played) : 0;
    livingTriplesState.elements.wrapScore.textContent = `ציון סצנה: ${breakdown.total}/100 | ממוצע מצטבר: ${avg}/100`;

    if (livingTriplesState.elements.breakdown) {
        livingTriplesState.elements.breakdown.innerHTML = '';
        const lines = [
            `בחירת קטגוריה: ${breakdown.categoryScore}/40`,
            `Reveal: ${breakdown.revealScore}/30`,
            `שיקוף: ${breakdown.reflectionScore}/15`,
            `אתגור: ${breakdown.challengeScore}/15`
        ];
        lines.forEach(line => {
            const item = document.createElement('li');
            item.textContent = line;
            livingTriplesState.elements.breakdown.appendChild(item);
        });
    }

    const row = livingTriplesState.activeRow;
    const unknownLabels = livingTriplesState.revealSlots
        .map((slot, idx) => (slot.status === 'unknown_final' ? row?.categories?.[idx]?.label || `Slot ${idx + 1}` : null))
        .filter(Boolean);
    const learnedParts = [];
    if (livingTriplesState.categoryAttempts > 1) {
        learnedParts.push('בחירת הקטגוריה דרשה תיקון, שים/י לב לטריגר הראשי במשפט.');
    } else {
        learnedParts.push('זיהוי הקטגוריה היה מדויק מהניסיון הראשון.');
    }
    if (unknownLabels.length) {
        learnedParts.push(`הסצנה נסגרה עם Unknown slot ב-${unknownLabels.join(', ')}; זה חייב להופיע גם בשיקוף.`);
    } else {
        learnedParts.push('נסגרה שורה מלאה עם שלוש תשובות Reveal.');
    }
    learnedParts.push('האתגור נשאר בתוך אותה פריזמה.');
    if (livingTriplesState.elements.wrapLearned) {
        livingTriplesState.elements.wrapLearned.textContent = `מה למדנו: ${learnedParts.join(' ')}`;
    }

    const directionQuestion = String(scenario.directionQuestion || '').trim();
    const clientGoal = String(scenario.clientGoal || '').trim();
    const hypnoticIntervention = String(scenario.hypnoticIntervention || '').trim();
    const rememberNote = String(scenario.rememberNote || '').trim();
    const hasDirectionBlock = Boolean(directionQuestion || clientGoal || hypnoticIntervention || rememberNote);
    if (livingTriplesState.elements.directionBox) {
        livingTriplesState.elements.directionBox.classList.toggle('hidden', !hasDirectionBlock);
    }
    if (livingTriplesState.elements.directionQuestion) {
        livingTriplesState.elements.directionQuestion.textContent = directionQuestion;
    }
    if (livingTriplesState.elements.clientGoal) {
        livingTriplesState.elements.clientGoal.textContent = clientGoal ? `מטרת המטופל: ${clientGoal}` : '';
    }
    if (livingTriplesState.elements.hypnoticIntervention) {
        livingTriplesState.elements.hypnoticIntervention.textContent = hypnoticIntervention;
    }
    if (livingTriplesState.elements.rememberNote) {
        livingTriplesState.elements.rememberNote.textContent = rememberNote;
    }

    if (livingTriplesState.elements.futureSign) livingTriplesState.elements.futureSign.value = '';
    if (livingTriplesState.elements.futureStep) livingTriplesState.elements.futureStep.value = '';
    if (livingTriplesState.elements.futureMetric) livingTriplesState.elements.futureMetric.value = '';
    if (livingTriplesState.elements.futureSummary) livingTriplesState.elements.futureSummary.textContent = '';
    if (livingTriplesState.elements.futurePrompt) {
        const prompt = String(livingTriplesState.activeScenario?.futurePacePrompt || '').trim()
            || 'בפעם הבאה שזה יופיע, מה יהיה הסימן המוקדם? מה צעד קטן? מה מדד הצלחה?';
        livingTriplesState.elements.futurePrompt.textContent = prompt;
    }
    if (livingTriplesState.elements.futureExample) {
        const sample = String(livingTriplesState.activeScenario?.futurePaceExample || '').trim();
        livingTriplesState.elements.futureExample.textContent = sample ? `דוגמה: ${sample}` : '';
    }

    const isLast = livingTriplesState.index >= livingTriplesState.queue.length - 1;
    if (livingTriplesState.elements.nextSceneBtn) {
        livingTriplesState.elements.nextSceneBtn.textContent = isLast ? 'סיום אימון' : 'לסצנה הבאה';
    }
}

function saveLivingTriplesFuturePace() {
    const sign = String(livingTriplesState.elements?.futureSign?.value || '').trim();
    const step = String(livingTriplesState.elements?.futureStep?.value || '').trim();
    const metric = String(livingTriplesState.elements?.futureMetric?.value || '').trim();
    if (!sign && !step && !metric) {
        if (livingTriplesState.elements?.futureSummary) {
            livingTriplesState.elements.futureSummary.textContent = 'מלא/י לפחות שדה אחד כדי לשמור Future-Pace.';
        }
        return;
    }
    livingTriplesState.futurePace = { sign, step, metric };
    if (livingTriplesState.elements?.futureSummary) {
        livingTriplesState.elements.futureSummary.textContent = `בפעם הבאה ש-${sign || 'יופיע הטריגר'}, הצעד הקטן יהיה ${step || 'לשאול עוגן אחד'}, ומדד ההצלחה: ${metric || 'Reveal מלא לפני אתגור'}.`;
    }
}

function renderLivingTriplesPracticeScene() {
    if (!livingTriplesState.elements || !livingTriplesState.activeScenario) return;
    setLivingTriplesScreen('practice');
    if (livingTriplesState.elements.sceneIndex) livingTriplesState.elements.sceneIndex.textContent = String(livingTriplesState.index + 1);
    if (livingTriplesState.elements.sceneTotal) livingTriplesState.elements.sceneTotal.textContent = String(livingTriplesState.queue.length);
    if (livingTriplesState.elements.sessionScore) livingTriplesState.elements.sessionScore.textContent = String(livingTriplesState.sessionScore);
    if (livingTriplesState.elements.scenarioTitle) {
        livingTriplesState.elements.scenarioTitle.textContent = livingTriplesState.activeScenario.title || 'משפט מטופל';
    }
    if (livingTriplesState.elements.scenarioText) {
        livingTriplesState.elements.scenarioText.innerHTML = '';
        (livingTriplesState.activeScenario.text || []).forEach(line => {
            const paragraph = document.createElement('p');
            paragraph.textContent = line;
            livingTriplesState.elements.scenarioText.appendChild(paragraph);
        });
    }
    if (livingTriplesState.elements.scenarioHighlights) {
        livingTriplesState.elements.scenarioHighlights.innerHTML = '';
        (livingTriplesState.activeScenario.highlights || []).forEach(highlight => {
            const chip = document.createElement('span');
            chip.textContent = highlight;
            livingTriplesState.elements.scenarioHighlights.appendChild(chip);
        });
    }

    renderLivingTriplesCategoryButtons();
    if (livingTriplesState.elements.categoryFeedback) livingTriplesState.elements.categoryFeedback.textContent = '';
    if (livingTriplesState.elements.rowBox) livingTriplesState.elements.rowBox.classList.add('hidden');
    if (livingTriplesState.elements.revealBox) livingTriplesState.elements.revealBox.classList.add('hidden');
    if (livingTriplesState.elements.reflectBox) livingTriplesState.elements.reflectBox.classList.add('hidden');
    if (livingTriplesState.elements.challengeBox) livingTriplesState.elements.challengeBox.classList.add('hidden');
    if (livingTriplesState.elements.customReflectWrap) livingTriplesState.elements.customReflectWrap.classList.add('hidden');
    if (livingTriplesState.elements.challengeFeedback) livingTriplesState.elements.challengeFeedback.textContent = '';
}

function loadLivingTriplesSceneAtCurrentIndex() {
    livingTriplesState.activeScenario = livingTriplesState.queue[livingTriplesState.index] || null;
    if (!livingTriplesState.activeScenario) return;
    livingTriplesState.activeRow = getLivingTriplesRowById(livingTriplesState.activeScenario.rowId);
    if (!livingTriplesState.activeRow) return;
    resetLivingTriplesRoundState();
    renderLivingTriplesPracticeScene();
}

function startLivingTriplesTraining() {
    clearLivingTriplesDemoTimer();
    if (!Array.isArray(livingTriplesDataState.scenarios) || !livingTriplesDataState.scenarios.length) {
        renderLivingTriplesOnboarding('לא נמצאו סצנות Living Triples.');
        return;
    }
    livingTriplesState.queue = ltShuffle(livingTriplesDataState.scenarios).slice(0, Math.min(25, livingTriplesDataState.scenarios.length));
    livingTriplesState.index = 0;
    livingTriplesState.sessionScore = 0;
    loadLivingTriplesSceneAtCurrentIndex();
}

function handleLivingTriplesCategoryPick(categoryId) {
    if (!livingTriplesState.activeScenario || livingTriplesState.categoryResolved) return;
    const selected = ltNormalizeCategoryId(categoryId);
    if (!selected) return;
    livingTriplesState.categoryAttempts += 1;
    const isCorrect = selected === livingTriplesState.activeScenario.correctCategory;

    if (!isCorrect) {
        const attemptedRow = getLivingTriplesRowByCategory(selected);
        const rowNumber = getLivingTriplesRowNumber(attemptedRow?.id || '');
        if (livingTriplesState.elements?.categoryFeedback) {
            livingTriplesState.elements.categoryFeedback.textContent = `סטייה: הקטגוריה לא תואמת למשפט (${attemptedRow ? `Row ${rowNumber}` : 'שורה אחרת'}). חזור/י לטריגר ובחר/י שוב.`;
        }
        ltPlay('fail');
        return;
    }

    livingTriplesState.selectedCategory = selected;
    livingTriplesState.categoryResolved = true;
    if (livingTriplesState.elements?.categoryFeedback) {
        const rowNumber = getLivingTriplesRowNumber(livingTriplesState.activeRow?.id || '');
        livingTriplesState.elements.categoryFeedback.textContent = `מדויק. Row ${rowNumber} נדלקה, עוברים ל-Reveal.`;
    }
    renderLivingTriplesCategoryButtons();
    if (livingTriplesState.elements?.rowBox) livingTriplesState.elements.rowBox.classList.remove('hidden');
    if (livingTriplesState.elements?.revealBox) livingTriplesState.elements.revealBox.classList.remove('hidden');
    renderLivingTriplesRowLit();
    renderLivingTriplesReveal();
    ltPlay('correct');
}

function handleLivingTriplesChallengeTargetPick(targetIndex) {
    if (livingTriplesState.challengeDone) return;
    livingTriplesState.challengeTargetIndex = targetIndex;
    renderLivingTriplesChallenge();
}

function handleLivingTriplesChallengeOptionPick(optionIndex) {
    if (!livingTriplesState.reflectionDone || livingTriplesState.challengeDone) return;
    livingTriplesState.challengeAttempts += 1;

    if (livingTriplesState.challengeTargetIndex < 0) {
        if (livingTriplesState.elements?.challengeFeedback) {
            livingTriplesState.elements.challengeFeedback.textContent = 'בחר/י קודם רכיב ספציפי לשלב האתגור.';
        }
        ltPlay('next');
        return;
    }

    if (optionIndex !== livingTriplesState.challengeTargetIndex) {
        const row = livingTriplesState.activeRow;
        const expected = row?.categories?.[livingTriplesState.challengeTargetIndex]?.label || 'הרכיב שנבחר';
        const picked = row?.categories?.[optionIndex]?.label || 'רכיב אחר';
        if (livingTriplesState.elements?.challengeFeedback) {
            livingTriplesState.elements.challengeFeedback.textContent = `סטייה: נבחר אתגור של ${picked}. כדי לחזור לפריזמה בחר/י אתגור של ${expected}.`;
        }
        ltPlay('fail');
        return;
    }

    livingTriplesState.challengeDone = true;
    livingTriplesState.challengeChoiceIndex = optionIndex;
    const reply = String(livingTriplesState.activeScenario?.challengeReplies?.[optionIndex] || 'התגובה נפתחת: אפשר להמשיך בעדינות.').trim();
    if (livingTriplesState.elements?.challengeFeedback) {
        livingTriplesState.elements.challengeFeedback.textContent = `אתגור תואם ✔ תגובת מטופל סימולטיבית: ${reply}`;
    }
    renderLivingTriplesChallenge();
    ltPlay('correct');
    setTimeout(() => finishLivingTriplesScene(), 250);
}

function moveToNextLivingTriplesScene() {
    const isLast = livingTriplesState.index >= livingTriplesState.queue.length - 1;
    if (isLast) {
        renderLivingTriplesOnboarding(`סיימת סשן Living Triples. ניקוד סשן: ${livingTriplesState.sessionScore}. אפשר להתחיל סשן חדש.`);
        return;
    }
    livingTriplesState.index += 1;
    loadLivingTriplesSceneAtCurrentIndex();
}

async function setupLivingTriplesModule() {
    if (!document.getElementById('living-triples')) return;
    livingTriplesState.elements = {
        root: document.getElementById('living-triples-root'),
        screenOnboarding: document.getElementById('lt-screen-onboarding'),
        screenPractice: document.getElementById('lt-screen-practice'),
        screenWrap: document.getElementById('lt-screen-wrap'),
        demoBtn: document.getElementById('lt-demo-btn'),
        startBtn: document.getElementById('lt-start-btn'),
        demoStatus: document.getElementById('lt-demo-status'),
        sceneIndex: document.getElementById('lt-scene-index'),
        sceneTotal: document.getElementById('lt-scene-total'),
        sessionScore: document.getElementById('lt-session-score'),
        scenarioTitle: document.getElementById('lt-scenario-title'),
        scenarioText: document.getElementById('lt-scenario-text'),
        scenarioHighlights: document.getElementById('lt-scenario-highlights'),
        categoryButtons: document.getElementById('lt-category-buttons'),
        categoryFeedback: document.getElementById('lt-category-feedback'),
        rowBox: document.getElementById('lt-row-box'),
        rowTitle: document.getElementById('lt-row-title'),
        rowChips: document.getElementById('lt-row-chips'),
        revealBox: document.getElementById('lt-reveal-box'),
        revealCards: document.getElementById('lt-reveal-cards'),
        revealStatus: document.getElementById('lt-reveal-status'),
        reflectBox: document.getElementById('lt-reflect-box'),
        reflectAuto: document.getElementById('lt-reflect-auto'),
        customReflectWrap: document.getElementById('lt-custom-reflect-wrap'),
        customReflectInput: document.getElementById('lt-custom-reflect-input'),
        reflectStatus: document.getElementById('lt-reflect-status'),
        challengeBox: document.getElementById('lt-challenge-box'),
        challengeTargets: document.getElementById('lt-challenge-targets'),
        challengeOptions: document.getElementById('lt-challenge-options'),
        challengeFeedback: document.getElementById('lt-challenge-feedback'),
        wrapScore: document.getElementById('lt-wrap-score'),
        breakdown: document.getElementById('lt-score-breakdown'),
        wrapLearned: document.getElementById('lt-wrap-learned'),
        directionBox: document.getElementById('lt-direction-box'),
        directionQuestion: document.getElementById('lt-direction-question'),
        clientGoal: document.getElementById('lt-client-goal'),
        hypnoticIntervention: document.getElementById('lt-hypnotic-intervention'),
        rememberNote: document.getElementById('lt-remember-note'),
        futureSign: document.getElementById('lt-future-sign'),
        futureStep: document.getElementById('lt-future-step'),
        futureMetric: document.getElementById('lt-future-metric'),
        futurePrompt: document.getElementById('lt-future-prompt'),
        futureExample: document.getElementById('lt-future-example'),
        futureSummary: document.getElementById('lt-future-summary'),
        nextSceneBtn: document.getElementById('lt-next-scene-btn')
    };

    if (!livingTriplesState.elements.root) return;
    if (livingTriplesState.elements.root.dataset.ltBound === 'true') return;
    livingTriplesState.elements.root.dataset.ltBound = 'true';

    bindLivingTriplesClick('lt-demo-btn', runLivingTriplesDemo);
    bindLivingTriplesClick('lt-start-btn', startLivingTriplesTraining);
    bindLivingTriplesClick('lt-use-auto-reflect-btn', useLivingTriplesAutoReflection);
    bindLivingTriplesClick('lt-open-custom-reflect-btn', () => livingTriplesState.elements?.customReflectWrap?.classList.toggle('hidden'));
    bindLivingTriplesClick('lt-save-custom-reflect-btn', saveLivingTriplesCustomReflection);
    bindLivingTriplesClick('lt-save-future-btn', saveLivingTriplesFuturePace);
    bindLivingTriplesClick('lt-next-scene-btn', moveToNextLivingTriplesScene);
    bindLivingTriplesClick('lt-back-onboarding-btn', () => renderLivingTriplesOnboarding());

    if (livingTriplesState.elements.categoryButtons && livingTriplesState.elements.categoryButtons.dataset.ltBound !== 'true') {
        livingTriplesState.elements.categoryButtons.dataset.ltBound = 'true';
        livingTriplesState.elements.categoryButtons.addEventListener('click', (event) => {
            const button = event.target.closest('[data-lt-category]');
            if (!button) return;
            handleLivingTriplesCategoryPick(button.getAttribute('data-lt-category') || '');
        });
    }

    if (livingTriplesState.elements.revealCards && livingTriplesState.elements.revealCards.dataset.ltBound !== 'true') {
        livingTriplesState.elements.revealCards.dataset.ltBound = 'true';
        livingTriplesState.elements.revealCards.addEventListener('click', (event) => {
            const button = event.target.closest('[data-lt-reveal-action]');
            if (!button) return;
            const action = button.getAttribute('data-lt-reveal-action') || '';
            const slotIndex = Number(button.getAttribute('data-slot'));
            if (!Number.isInteger(slotIndex)) return;
            handleLivingTriplesRevealAction(action, slotIndex);
        });
    }

    if (livingTriplesState.elements.challengeTargets && livingTriplesState.elements.challengeTargets.dataset.ltBound !== 'true') {
        livingTriplesState.elements.challengeTargets.dataset.ltBound = 'true';
        livingTriplesState.elements.challengeTargets.addEventListener('click', (event) => {
            const button = event.target.closest('[data-lt-challenge-target]');
            if (!button) return;
            const index = Number(button.getAttribute('data-lt-challenge-target'));
            if (!Number.isInteger(index)) return;
            handleLivingTriplesChallengeTargetPick(index);
        });
    }

    if (livingTriplesState.elements.challengeOptions && livingTriplesState.elements.challengeOptions.dataset.ltBound !== 'true') {
        livingTriplesState.elements.challengeOptions.dataset.ltBound = 'true';
        livingTriplesState.elements.challengeOptions.addEventListener('click', (event) => {
            const button = event.target.closest('[data-lt-challenge-option]');
            if (!button) return;
            const index = Number(button.getAttribute('data-lt-challenge-option'));
            if (!Number.isInteger(index)) return;
            handleLivingTriplesChallengeOptionPick(index);
        });
    }

    livingTriplesState.progress = loadLivingTriplesProgress();
    const loaded = await loadLivingTriplesData();
    if (!loaded) {
        renderLivingTriplesOnboarding('שגיאה בטעינת מודול Living Triples.');
        return;
    }
    renderLivingTriplesOnboarding();
}
