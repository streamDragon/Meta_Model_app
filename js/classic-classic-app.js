(function attachClassicClassicApp() {
    const root = typeof globalThis !== 'undefined' ? globalThis : window;
    const appEl = document.getElementById('classic-classic-app');
    if (!appEl) return;

    const engine = root.classicClassicEngine;
    const configApi = root.classicClassicConfig;
    if (!engine || !configApi) {
        appEl.innerHTML = '<div class="cc-loading">שגיאה בטעינת מנוע Classic Classic.</div>';
        return;
    }

    const state = {
        loaded: false,
        loadError: '',
        data: null,
        copy: null,
        mode: 'learning',
        session: null,
        feedback: null,
        hintMessage: '',
        hintUsedByStage: { question: false, problem: false, goal: false },
        lastSelectedOptionId: '',
        lastSelectedWasCorrect: null,
        paused: false,
        timerHandle: null,
        renderNonce: 0
    };

    function escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function assetUrl(path) {
        const raw = String(path || '');
        const v = root.__CC_ASSET_V__;
        if (!v) return raw;
        const sep = raw.includes('?') ? '&' : '?';
        return `${raw}${sep}v=${encodeURIComponent(v)}`;
    }

    async function fetchJson(path) {
        const response = await fetch(assetUrl(path), { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status} loading ${path}`);
        return response.json();
    }

    function getPatternMap() {
        const map = new Map();
        (state.data?.patterns || []).forEach((pattern) => {
            map.set(pattern.id, pattern);
        });
        return map;
    }

    function familyLabel(family) {
        const f = String(family || '').toLowerCase();
        if (f === 'deletion') return 'DEL / מחיקות';
        if (f === 'distortion') return 'DIS / עיוותים';
        if (f === 'generalization') return 'GEN / הכללות';
        return family || '';
    }

    function stageLabel(stage) {
        if (stage === 'question') return 'שלב B · שאלה';
        if (stage === 'problem') return 'שלב C · הבעיה';
        if (stage === 'goal') return 'שלב D · המטרה';
        if (stage === 'summary') return 'סיכום סבב';
        return '';
    }

    function formatTime(seconds) {
        const value = Math.max(0, Math.floor(Number(seconds) || 0));
        const mm = String(Math.floor(value / 60)).padStart(2, '0');
        const ss = String(value % 60).padStart(2, '0');
        return `${mm}:${ss}`;
    }

    function currentRound() {
        if (!state.session) return null;
        return engine.currentRound(state.session);
    }

    function resetRoundUiState() {
        state.feedback = null;
        state.hintMessage = '';
        state.hintUsedByStage = { question: false, problem: false, goal: false };
        state.lastSelectedOptionId = '';
        state.lastSelectedWasCorrect = null;
    }

    function createSession(seedSuffix) {
        const seed = `classic-classic:${state.mode}:${Date.now()}:${seedSuffix || 0}`;
        state.session = engine.createSessionState({
            patterns: state.data.patterns,
            mode: state.mode,
            seed,
            config: configApi.GAME_CONFIG
        });
        state.paused = false;
        resetRoundUiState();
        state.feedback = {
            tone: 'info',
            text: state.mode === 'exam'
                ? 'מצב מבחן פעיל: בלי רמזים/הסברים במהלך הריצה.'
                : 'מצב למידה פעיל: אפשר לעצור, לקבל רמז ולנסות שוב.'
        };
        ensureTimer();
    }

    function ensureTimer() {
        if (state.timerHandle) return;
        state.timerHandle = setInterval(() => {
            if (!state.session || state.session.ended) return;
            if (state.paused) return;
            engine.tickSession(state.session, 1);
            if (state.session.ended) {
                state.feedback = {
                    tone: state.session.endReason === 'lives' ? 'danger' : 'warn',
                    text: state.session.endReason === 'lives'
                        ? 'החיים נגמרו. מוצג דו"ח סיום.'
                        : 'הזמן הסתיים. מוצג דו"ח סיום.'
                };
            }
            render();
        }, 1000);
    }

    function stopTimer() {
        if (!state.timerHandle) return;
        clearInterval(state.timerHandle);
        state.timerHandle = null;
    }

    function startNewRound() {
        if (!state.session || state.session.ended) return;
        try {
            engine.nextRound(state.session);
            resetRoundUiState();
            state.feedback = null;
        } catch (error) {
            state.feedback = { tone: 'warn', text: error.message || 'לא ניתן להתחיל סבב חדש עדיין.' };
        }
        render();
    }

    function endSession(reason) {
        if (!state.session) return;
        if (!state.session.ended) {
            engine.endSession(state.session, reason || 'manual');
        }
        state.paused = false;
        render();
    }

    function buildHintForStage(stage, round) {
        if (!round) return '';
        if (stage === 'question') {
            return 'חפש/י שאלה שמחזירה מידע חסר / קריטריון / תנאים, ולא שאלה שיפוטית או פתרון מוקדם.';
        }
        if (stage === 'problem') {
            return `“בעיה” = מה המבנה הלשוני יוצר במפה. רמז: ${round.pattern.problem?.oneLiner || ''}`;
        }
        if (stage === 'goal') {
            return `“מטרה” = איזה מידע חסר נחפש. רמז: ${round.pattern.goal?.oneLiner || ''}`;
        }
        return '';
    }

    function useHint() {
        const round = currentRound();
        if (!round || round.stage === 'summary') return;
        if (state.mode !== 'learning') return;
        if (state.hintUsedByStage[round.stage]) return;
        state.hintUsedByStage[round.stage] = true;
        state.hintMessage = buildHintForStage(round.stage, round);
        state.feedback = { tone: 'info', text: 'רמז מוצג (פעם אחת לשלב).' };
        render();
    }

    function submitOption(optionId) {
        if (!state.session || state.session.ended) return;
        const round = currentRound();
        if (!round || round.stage === 'summary') return;

        state.lastSelectedOptionId = String(optionId || '');
        const result = engine.submitStageAnswer(state.session, optionId);
        state.lastSelectedWasCorrect = !!result.ok;

        if (result.ok) {
            state.hintMessage = '';
            if (result.completedRound) {
                state.feedback = {
                    tone: 'success',
                    text: 'סבב הושלם. עברו על הסיכום ואז המשיכו לתבנית הבאה.'
                };
            } else {
                state.feedback = {
                    tone: 'success',
                    text: `נכון. מעבר לשלב הבא: ${stageLabel(result.nextStage)}`
                };
            }
        } else if (state.mode === 'learning') {
            state.feedback = {
                tone: 'warn',
                text: result.explanation || 'לא מדויק. נסו שוב.'
            };
        } else {
            const livesText = Number.isFinite(result.livesLeft) ? ` | חיים: ${result.livesLeft}` : '';
            state.feedback = {
                tone: result.livesLeft <= 0 ? 'danger' : 'warn',
                text: `לא נכון.${livesText}`
            };
        }

        if (state.session.ended && !state.feedback) {
            state.feedback = {
                tone: 'danger',
                text: 'הסשן הסתיים.'
            };
        }
        render();
    }

    function togglePause() {
        if (!state.session || state.session.ended) return;
        if (state.mode !== 'learning') return;
        state.paused = !state.paused;
        state.feedback = {
            tone: 'info',
            text: state.paused ? 'הטיימר מושהה.' : 'הטיימר חודש.'
        };
        render();
    }

    function setMode(mode) {
        const normalized = mode === 'exam' ? 'exam' : 'learning';
        if (normalized === state.mode && state.session) return;
        state.mode = normalized;
        if (state.loaded && state.data) {
            createSession('mode-switch');
        }
        render();
    }

    function handleAction(action) {
        if (!action) return;
        if (action === 'mode-learning') return setMode('learning');
        if (action === 'mode-exam') return setMode('exam');
        if (action === 'restart-session') return createSession('restart');
        if (action === 'toggle-pause') return togglePause();
        if (action === 'use-hint') return useHint();
        if (action === 'next-round') return startNewRound();
        if (action === 'end-session') return endSession('manual');
    }

    function getStageCopy(round) {
        const stage = round?.stage || '';
        if (stage === 'question') {
            return {
                title: 'בחר/י שאלה מתאימה לתבנית',
                desc: 'יש 2 שאלות תקינות מתוך 5. מספיק לבחור אחת טובה כדי לעבור שלב.',
                kicker: stageLabel(stage)
            };
        }
        if (stage === 'problem') {
            return {
                title: 'מה הבעיה בהפרה הזו?',
                desc: 'בחר/י את התיאור שמתאר מה המבנה הלשוני יוצר במפה.',
                kicker: stageLabel(stage)
            };
        }
        if (stage === 'goal') {
            return {
                title: 'מה המטרה / איזה מידע נחפש?',
                desc: 'בחר/י את יעד המידע המדויק שנרצה להחזיר בשאלת המטה-מודל.',
                kicker: stageLabel(stage)
            };
        }
        return {
            title: 'סיכום סבב',
            desc: 'סקירה מהירה של התבנית, השאלות, הבעיה והמטרה לפני המעבר לסבב הבא.',
            kicker: stageLabel(stage)
        };
    }

    function getVisibleOptions(round) {
        if (!round || round.stage === 'summary') return [];
        return round.options[round.stage] || [];
    }

    function getCorrectOptionIds(round, stage) {
        return new Set(((round?.options?.[stage]) || []).filter((opt) => opt.isCorrect).map((opt) => String(opt.id)));
    }

    function getFamilyHelpTexts() {
        return {
            deletion: 'מחיקות: חסר מידע קונקרטי (מי/מה/איך/מתי).',
            distortion: 'עיוותים: פרשנות/קשר/משמעות מוצגים כעובדה.',
            generalization: 'הכללות: כלל רחב/קשיח מוחל על מקרים רבים.'
        };
    }

    function renderHeader(session) {
        const canPause = state.mode === 'learning';
        const timerTone = session && session.timeLeftSeconds <= 30 ? 'warn' : '';
        const livesChip = state.mode === 'exam'
            ? `<span class="cc-stat-chip ${timerTone ? '' : ''}" data-tone="${session && session.livesLeft <= 1 ? 'warn' : ''}">
                חיים <strong>${Number.isFinite(session?.livesLeft) ? session.livesLeft : '-'}</strong>
              </span>`
            : '';

        return `
          <header class="cc-panel cc-header">
            <div class="cc-header-row">
              <div class="cc-brand">
                <h1>Classic Classic · Meta Model Trainer</h1>
                <p>מבוסס טבלת Breen (MVP עם DEL / DIS / GEN) · RTL Drill</p>
              </div>
              <div class="cc-mode-toggle" role="tablist" aria-label="בחירת מצב">
                <button type="button" class="cc-mode-btn ${state.mode === 'learning' ? 'is-active' : ''}" data-cc-action="mode-learning">למידה</button>
                <button type="button" class="cc-mode-btn ${state.mode === 'exam' ? 'is-active' : ''}" data-cc-action="mode-exam">מבחן</button>
              </div>
            </div>
            <div class="cc-header-row">
              <div class="cc-stats">
                <span class="cc-stat-chip" data-tone="${timerTone}">
                  זמן <strong>${formatTime(session?.timeLeftSeconds || 0)}</strong>
                </span>
                <span class="cc-stat-chip">
                  ניקוד <strong>${session?.score ?? 0}</strong>
                </span>
                <span class="cc-stat-chip">
                  רצף <strong>${session?.streak ?? 0}</strong>
                </span>
                ${livesChip}
              </div>
              <div class="cc-actions">
                <button type="button" class="cc-btn cc-btn-secondary" data-cc-action="toggle-pause" ${!canPause || !session || session.ended ? 'disabled' : ''}>
                  ${state.paused ? 'המשך' : 'השהה'}
                </button>
                <button type="button" class="cc-btn cc-btn-ghost" data-cc-action="restart-session">
                  התחל מחדש
                </button>
                <button type="button" class="cc-btn cc-btn-primary" data-cc-action="end-session" ${!session || session.ended ? 'disabled' : ''}>
                  סיים סשן
                </button>
              </div>
            </div>
          </header>
        `;
    }

    function renderBreenPanel(round) {
        const cells = state.data?.breenTable?.cells || [];
        const currentPattern = round?.pattern || null;
        const activeCellId = currentPattern?.breenCellId || '';
        const helpTexts = getFamilyHelpTexts();
        const copy = state.copy || {};

        return `
          <aside class="cc-panel cc-side" aria-label="Breen Table Panel">
            <div>
              <h2>טבלת Breen (MVP)</h2>
              <p class="cc-sub">הטבלה נשארת קבועה על המסך. כל סבב מדליק תא אחד.</p>
            </div>
            <div class="cc-breen-grid">
              ${cells.map((cell) => {
                  const isActive = String(cell.id) === String(activeCellId);
                  return `
                    <div class="cc-breen-cell ${isActive ? 'is-active' : ''}" data-cell-id="${escapeHtml(cell.id)}">
                      <span class="cc-cell-code">${escapeHtml(cell.label)}</span>
                      <span class="cc-cell-label">${escapeHtml(cell.labelHe || cell.family || cell.id)}</span>
                      <span class="cc-cell-help">${escapeHtml(helpTexts[cell.family] || '')}</span>
                    </div>
                  `;
              }).join('')}
            </div>
            <div class="cc-current-pattern-card">
              <small>תבנית נוכחית</small>
              <strong>${escapeHtml(currentPattern?.name || '—')}</strong>
              <span class="cc-sub">${escapeHtml(familyLabel(currentPattern?.family || ''))}</span>
            </div>
            <div class="cc-help-box">
              <strong>מה זה Meta Model?</strong>
              <div>${escapeHtml(copy.metaModelPurpose || '')}</div>
            </div>
            <div class="cc-help-box">
              <strong>${state.mode === 'exam' ? 'מצב מבחן' : 'מצב למידה'}</strong>
              <div>${escapeHtml(state.mode === 'exam' ? (copy.examMode || '') : (copy.learningMode || ''))}</div>
            </div>
          </aside>
        `;
    }

    function renderOptions(round) {
        const stage = round.stage;
        const options = getVisibleOptions(round);
        const correctIds = getCorrectOptionIds(round, stage);
        const showCorrectReveal = stage === 'summary';

        return `
          <div class="cc-options" role="list">
            ${options.map((option, index) => {
                const id = String(option.id);
                const isSelected = state.lastSelectedOptionId === id && round.stage === stage;
                let className = 'cc-option-btn';
                if (isSelected) className += ' is-selected';
                if (state.lastSelectedOptionId && id === state.lastSelectedOptionId && state.lastSelectedWasCorrect === false) className += ' is-wrong';
                if (state.lastSelectedOptionId && id === state.lastSelectedOptionId && state.lastSelectedWasCorrect === true) className += ' is-correct';
                if (showCorrectReveal && correctIds.has(id)) className += ' is-correct';
                return `
                  <button
                    type="button"
                    class="${className}"
                    data-cc-option-id="${escapeHtml(id)}"
                    ${state.session.ended ? 'disabled' : ''}
                    ${state.paused ? 'disabled' : ''}>
                    <span class="cc-option-num">${index + 1}</span>
                    <span>${escapeHtml(option.text)}</span>
                  </button>
                `;
            }).join('')}
          </div>
        `;
    }

    function renderStageCard(round) {
        const stage = round.stage;
        const copy = getStageCopy(round);
        const canUseHint = state.mode === 'learning'
            && stage !== 'summary'
            && !state.session.ended
            && !state.hintUsedByStage[stage];

        const roundCorrectQuestionTexts = (round.options.question || [])
            .filter((option) => option.isCorrect)
            .map((option) => option.text);

        if (stage === 'summary') {
            return `
              <section class="cc-stage-card">
                <div class="cc-stage-head">
                  <span class="cc-stage-kicker">${escapeHtml(copy.kicker)}</span>
                  <h3>${escapeHtml(copy.title)}</h3>
                  <p>${escapeHtml(copy.desc)}</p>
                </div>
                <div class="cc-summary-grid">
                  <div class="cc-summary-block">
                    <h4>Pattern</h4>
                    <p><strong>${escapeHtml(round.pattern.name)}</strong></p>
                    <p>${escapeHtml(round.pattern.definition || '')}</p>
                  </div>
                  <div class="cc-summary-block">
                    <h4>Two correct questions</h4>
                    <ul>
                      ${roundCorrectQuestionTexts.map((text) => `<li>${escapeHtml(text)}</li>`).join('')}
                    </ul>
                  </div>
                  <div class="cc-summary-block">
                    <h4>Problem</h4>
                    <p>${escapeHtml(round.pattern.problem?.oneLiner || '')}</p>
                  </div>
                  <div class="cc-summary-block">
                    <h4>Goal / Data target</h4>
                    <p>${escapeHtml(round.pattern.goal?.oneLiner || '')}</p>
                    <ul>
                      ${(round.pattern.goal?.dataTargets || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
                    </ul>
                  </div>
                </div>
                <div class="cc-inline-actions">
                  <button type="button" class="cc-btn cc-btn-primary" data-cc-action="next-round" ${state.session.ended ? 'disabled' : ''}>תבנית הבאה</button>
                  <button type="button" class="cc-btn cc-btn-secondary" data-cc-action="end-session">סיים סשן</button>
                </div>
              </section>
            `;
        }

        const examples = Array.isArray(round.pattern.examples) ? round.pattern.examples.slice(0, 3) : [];
        return `
          <section class="cc-stage-card">
            <div class="cc-stage-head">
              <span class="cc-stage-kicker">${escapeHtml(copy.kicker)}</span>
              <h3>${escapeHtml(copy.title)}</h3>
              <p>${escapeHtml(copy.desc)}</p>
            </div>

            <div class="cc-pattern-strip">
              <div class="cc-pattern-family">${escapeHtml(familyLabel(round.pattern.family))}</div>
              <div class="cc-pattern-name">${escapeHtml(round.pattern.name)}</div>
              <div class="cc-pattern-definition">${escapeHtml(round.pattern.definition || '')}</div>
            </div>

            <div class="cc-examples" aria-label="examples">
              ${examples.map((example) => `<div class="cc-example-chip">${escapeHtml(example)}</div>`).join('')}
            </div>

            ${renderOptions(round)}

            ${state.hintMessage ? `<div class="cc-hint-box">${state.hintMessage}</div>` : ''}
            ${state.feedback ? `<div class="cc-feedback" data-tone="${escapeHtml(state.feedback.tone || 'info')}">${escapeHtml(state.feedback.text || '')}</div>` : ''}

            <div class="cc-inline-actions">
              <button type="button" class="cc-btn cc-btn-secondary" data-cc-action="use-hint" ${canUseHint ? '' : 'disabled'}>רמז</button>
              <button type="button" class="cc-btn cc-btn-ghost" data-cc-action="restart-session">התחל מחדש</button>
            </div>
          </section>
        `;
    }

    function renderReport() {
        if (!state.session) return '';
        const report = engine.buildEndSessionReport(state.session);
        const patternMap = getPatternMap();
        const copy = state.copy || {};
        return `
          <section class="cc-stage-card cc-report" aria-label="End session report">
            <div class="cc-stage-head">
              <span class="cc-stage-kicker">End Session Report</span>
              <h3>דו"ח סשן</h3>
              <p>${escapeHtml(state.mode === 'learning' ? (copy.learningMode || '') : (copy.examMode || ''))}</p>
            </div>

            <div class="cc-report-grid">
              <div class="cc-report-stat"><strong>${report.overall.accuracy}%</strong><span>דיוק כולל</span></div>
              <div class="cc-report-stat"><strong>${report.score}</strong><span>ניקוד</span></div>
              <div class="cc-report-stat"><strong>${report.completedRounds}</strong><span>סבבים שהושלמו</span></div>
            </div>

            <div class="cc-summary-block">
              <h4>Per-family accuracy</h4>
              <table class="cc-table">
                <thead>
                  <tr><th>Family</th><th>Accuracy</th><th>Correct</th><th>Wrong</th></tr>
                </thead>
                <tbody>
                  ${(report.perFamily || []).map((row) => `
                    <tr>
                      <td>${escapeHtml(familyLabel(row.family))}</td>
                      <td>${row.accuracy}%</td>
                      <td>${row.correctStages}</td>
                      <td>${row.wrongStages}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <div class="cc-summary-block">
              <h4>Weak patterns</h4>
              ${(report.weakPatterns || []).length ? `
                <ul class="cc-bullet-list">
                  ${(report.weakPatterns || []).map((row) => {
                      const p = patternMap.get(row.patternId);
                      return `<li><strong>${escapeHtml(p?.name || row.patternId)}</strong> · ${row.accuracy}% · טעויות: ${row.wrongStages}</li>`;
                  }).join('')}
                </ul>
              ` : `<div class="cc-empty">אין מספיק נתונים כדי לזהות דפוסים חלשים.</div>`}
            </div>

            ${state.mode === 'learning' ? `
              <div class="cc-summary-block">
                <h4>Review tips</h4>
                <ul class="cc-bullet-list">
                  <li>${escapeHtml(copy.problemDefinition || '')}</li>
                  <li>${escapeHtml(copy.goalDefinition || '')}</li>
                  <li>חפש/י קודם מה חסר במפה לפני פתרון או פרשנות.</li>
                </ul>
              </div>
            ` : ''}

            <div class="cc-inline-actions">
              <button type="button" class="cc-btn cc-btn-primary" data-cc-action="restart-session">סשן חדש</button>
              <button type="button" class="cc-btn cc-btn-secondary" data-cc-action="mode-learning">עבור ללמידה</button>
              <button type="button" class="cc-btn cc-btn-secondary" data-cc-action="mode-exam">עבור למבחן</button>
            </div>
          </section>
        `;
    }

    function renderMainPanel() {
        const session = state.session;
        if (!session) {
            return `<main class="cc-panel cc-main"><div class="cc-loading">מכין סשן…</div></main>`;
        }
        const round = currentRound();
        const stageCard = session.ended ? renderReport() : renderStageCard(round);

        return `
          <main class="cc-panel cc-main" aria-label="Game panel">
            ${!session.ended && round ? `
              <div class="cc-help-box">
                <strong>Problem</strong> · ${escapeHtml(state.copy?.problemDefinition || '')}<br>
                <strong>Goal</strong> · ${escapeHtml(state.copy?.goalDefinition || '')}
              </div>
            ` : ''}
            ${stageCard}
          </main>
        `;
    }

    function renderLoaded() {
        const session = state.session;
        const round = currentRound();
        appEl.innerHTML = `
          ${renderHeader(session)}
          <div class="cc-layout">
            ${renderBreenPanel(round)}
            ${renderMainPanel()}
          </div>
        `;
    }

    function render() {
        state.renderNonce += 1;
        if (!state.loaded) {
            appEl.innerHTML = `<div class="cc-loading">${escapeHtml(state.loadError || 'טוען נתונים…')}</div>`;
            return;
        }
        renderLoaded();
    }

    function bindEvents() {
        appEl.addEventListener('click', (event) => {
            const actionEl = event.target.closest('[data-cc-action]');
            if (actionEl) {
                handleAction(actionEl.getAttribute('data-cc-action'));
                return;
            }

            const optionEl = event.target.closest('[data-cc-option-id]');
            if (optionEl) {
                submitOption(optionEl.getAttribute('data-cc-option-id'));
            }
        });

        document.addEventListener('keydown', (event) => {
            if (!state.session || state.session.ended || state.paused) return;
            const round = currentRound();
            if (!round || round.stage === 'summary') return;
            const digit = Number(event.key);
            if (!Number.isInteger(digit) || digit < 1 || digit > 5) return;
            const options = getVisibleOptions(round);
            const picked = options[digit - 1];
            if (!picked) return;
            event.preventDefault();
            submitOption(picked.id);
        });
    }

    async function init() {
        render();
        bindEvents();
        try {
            const [data, copy] = await Promise.all([
                fetchJson('data/metaModelPatterns.he.json'),
                fetchJson('data/copy.he.json')
            ]);
            state.data = data;
            state.copy = copy;
            state.loaded = true;
            createSession('init');
            render();
        } catch (error) {
            state.loadError = `שגיאה בטעינת Classic Classic: ${error.message || error}`;
            state.loaded = false;
            render();
        }
    }

    init();

    root.addEventListener('beforeunload', () => {
        stopTimer();
    });
})();
