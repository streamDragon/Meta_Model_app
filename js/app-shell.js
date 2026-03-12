(function initMetaAppShell(global) {
    'use strict';

    if (!global) return;
    if (global.MetaAppShell && typeof global.MetaAppShell.bootstrap === 'function') return;

    const HOME_SCREEN_ID = 'home';
    const HOME_LAST_TAB_KEY = 'meta_home_last_tab_v1';
    const SHELL_CONTINUE_KEY = 'meta_shell_continue_v1';
    const VERB_SCREEN_ID = 'practice-verb-unzip';
    const VERB_SESSION_KEY = 'verb_unzip_shell_session_started_v1';
    const VERB_WIZARD_KEY = 'verb_unzip_shell_wizard_seen_v1';

    const stateByScreen = Object.create(null);
    const pendingEntryOverlayTimers = Object.create(null);

    function getShellCopy() {
        return global.MetaShellCopy || {};
    }

    function getShellActionLabel(key, fallback = '') {
        return String(getShellCopy()?.ACTIONS?.[key] || fallback || key || '').trim();
    }

    function getShellScreenCopy(screenId) {
        return getShellCopy()?.SCREENS?.[screenId] || {};
    }

    function getShellRegistryEntry(screenId) {
        try {
            if (global.MetaShellRegistry && typeof global.MetaShellRegistry.getScreen === 'function') {
                return global.MetaShellRegistry.getScreen(screenId);
            }
        } catch (_error) {
            // fallback below
        }
        return null;
    }

    function normalizeContinueState(raw) {
        const safe = raw && typeof raw === 'object' ? raw : {};
        return {
            screenId: typeof safe.screenId === 'string' ? safe.screenId : '',
            screenTitle: typeof safe.screenTitle === 'string' ? safe.screenTitle : '',
            panelId: typeof safe.panelId === 'string' ? safe.panelId : '',
            panelTitle: typeof safe.panelTitle === 'string' ? safe.panelTitle : '',
            at: typeof safe.at === 'string' ? safe.at : ''
        };
    }

    function readContinueState() {
        try {
            return normalizeContinueState(JSON.parse(localStorage.getItem(SHELL_CONTINUE_KEY) || '{}'));
        } catch (_error) {
            return normalizeContinueState({});
        }
    }

    function saveContinueState(nextState) {
        const normalized = normalizeContinueState(nextState);
        try {
            localStorage.setItem(SHELL_CONTINUE_KEY, JSON.stringify(normalized));
        } catch (_error) {
            // noop
        }
        return normalized;
    }

    function rememberContinueState(screenId, partial) {
        const safeScreenId = String(screenId || '').trim();
        if (!safeScreenId || safeScreenId === HOME_SCREEN_ID) return readContinueState();
        const previous = readContinueState();
        const safePartial = partial && typeof partial === 'object' ? partial : {};
        const preservePanel = previous.screenId === safeScreenId;
        const next = {
            screenId: safeScreenId,
            screenTitle: String(safePartial.screenTitle || getShellScreenCopy(safeScreenId)?.title || getTabTitle(safeScreenId)).trim(),
            panelId: preservePanel ? previous.panelId : '',
            panelTitle: preservePanel ? previous.panelTitle : '',
            at: new Date().toISOString()
        };
        if (Object.prototype.hasOwnProperty.call(safePartial, 'panelId')) {
            next.panelId = typeof safePartial.panelId === 'string' ? safePartial.panelId : '';
            if (!next.panelId && !Object.prototype.hasOwnProperty.call(safePartial, 'panelTitle')) {
                next.panelTitle = '';
            }
        }
        if (Object.prototype.hasOwnProperty.call(safePartial, 'panelTitle')) {
            next.panelTitle = typeof safePartial.panelTitle === 'string' ? safePartial.panelTitle : '';
        }
        return saveContinueState(next);
    }

    function readHomeLastVisitedTab() {
        const continueState = readContinueState();
        if (continueState.screenId && continueState.screenId !== HOME_SCREEN_ID) {
            return {
                tab: continueState.screenId,
                at: continueState.at,
                panelId: continueState.panelId,
                panelTitle: continueState.panelTitle
            };
        }
        try {
            const raw = localStorage.getItem(HOME_LAST_TAB_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            const tab = String(parsed?.tab || '').trim();
            if (!tab || tab === HOME_SCREEN_ID) return null;
            return {
                tab,
                at: typeof parsed?.at === 'string' ? parsed.at : '',
                panelId: '',
                panelTitle: ''
            };
        } catch (_error) {
            return null;
        }
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>'"]/g, (char) => {
            if (char === '&') return '&amp;';
            if (char === '<') return '&lt;';
            if (char === '>') return '&gt;';
            if (char === '"') return '&quot;';
            return '&#39;';
        });
    }

    function stripIdsFromCloneTree(root) {
        if (!root || !(root instanceof Element)) return;
        if (root.hasAttribute('id')) root.removeAttribute('id');
        root.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
    }

    function getTabTitle(tabId) {
        const safeId = String(tabId || '').trim();
        if (!safeId) return 'מסך';
        const btn = document.querySelector(`.tab-btn[data-tab="${safeId}"]`);
        return String(btn?.textContent || safeId).replace(/\s+/g, ' ').trim() || safeId;
    }

    function getActiveTabId() {
        return String(document.querySelector('.tab-content.active')?.id || '').trim();
    }

    function scheduleEntryOverlay(screenId, openFn) {
        const safeScreenId = String(screenId || '').trim();
        if (!safeScreenId || typeof openFn !== 'function') return;
        if (pendingEntryOverlayTimers[safeScreenId]) {
            global.clearTimeout(pendingEntryOverlayTimers[safeScreenId]);
        }
        pendingEntryOverlayTimers[safeScreenId] = global.setTimeout(() => {
            pendingEntryOverlayTimers[safeScreenId] = 0;
            if (getActiveTabId() !== safeScreenId) return;
            openFn();
        }, 0);
    }

    function closeInlineFeatureMapIfNeeded() {
        const featureMap = document.getElementById('feature-map-toggle');
        if (!featureMap) return;
        if (featureMap.open) {
            featureMap.removeAttribute('open');
        }
        document.body.classList.remove('feature-map-open');
    }

    function getUiMode(screenId) {
        try {
            if (global.MetaUiFlags && typeof global.MetaUiFlags.resolveUiMode === 'function') {
                return global.MetaUiFlags.resolveUiMode(screenId, global.location.search);
            }
        } catch (_error) {
            // fallback below
        }
        return 'legacy';
    }

    function buildUiModeUrl(screenId, mode) {
        try {
            if (global.MetaUiFlags && typeof global.MetaUiFlags.buildScreenUrl === 'function') {
                return global.MetaUiFlags.buildScreenUrl(screenId, mode, global.location.href);
            }
            const nextUrl = new URL(global.location.href);
            nextUrl.searchParams.set('tab', screenId);
            nextUrl.searchParams.set('ui', mode);
            return nextUrl.toString();
        } catch (_error) {
            return global.location.href;
        }
    }

    function recordPanelOpen(screenState, panelId, panelTitle = '') {
        if (!screenState) return;
        screenState.panelOpens[panelId] = (screenState.panelOpens[panelId] || 0) + 1;
        screenState.lastOpenedPanel = panelId;
        screenState.lastOpenedPanelTitle = String(panelTitle || panelId || '').trim();
        screenState.lastPanelOpenAt = new Date().toISOString();
    }

    function createAppShellFrame(config) {
        const cfg = config && typeof config === 'object' ? config : {};
        const shellCopy = getShellCopy();
        const root = document.createElement('section');
        root.className = 'app-shell';
        root.setAttribute('data-app-shell-screen', String(cfg.screenId || 'screen'));

        root.innerHTML = `
            <header class="app-shell-header">
                <div class="app-shell-title-wrap">
                    <p class="app-shell-kicker">${escapeHtml(shellCopy?.SHELL?.kicker || 'מעטפת עבודה')}</p>
                    <h2 class="app-shell-title">${escapeHtml(cfg.title || 'מסך')}</h2>
                    <p class="app-shell-subtitle">${escapeHtml(cfg.subtitle || '')}</p>
                </div>
                <div class="app-shell-actions" data-shell-header-actions></div>
            </header>
            <section class="app-shell-metrics" data-shell-metrics aria-label="שורת מדדים"></section>
            <div class="lab-container" data-lab-container>
                <div class="lab-container-workspace" data-lab-workspace></div>
                <div class="lab-container-actions" data-lab-actions></div>
                <details class="lab-container-bottom" data-lab-bottom>
                    <summary>${escapeHtml(shellCopy?.SHELL?.bottomSummary || 'המשך ומצב')}</summary>
                    <div class="lab-container-bottom-body" data-lab-bottom-body></div>
                </details>
            </div>
        `;

        return {
            root,
            headerActions: root.querySelector('[data-shell-header-actions]'),
            metrics: root.querySelector('[data-shell-metrics]'),
            workspace: root.querySelector('[data-lab-workspace]'),
            actions: root.querySelector('[data-lab-actions]'),
            bottom: root.querySelector('[data-lab-bottom]'),
            bottomBody: root.querySelector('[data-lab-bottom-body]')
        };
    }

    function createActionButton({ label, icon, className = '', onClick }) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `btn btn-secondary shell-action-btn ${className}`.trim();
        btn.innerHTML = `${icon ? `<span aria-hidden="true">${escapeHtml(icon)}</span>` : ''}<span>${escapeHtml(label || 'פעולה')}</span>`;
        if (typeof onClick === 'function') {
            btn.addEventListener('click', onClick);
        }
        return btn;
    }

    function renderShellFallback(sectionEl, screenId, error) {
        if (!sectionEl || sectionEl.querySelector('[data-shell-error-fallback]')) return;
        const shellCopy = getShellCopy();

        const fallback = document.createElement('div');
        fallback.className = 'shell-runtime-fallback card';
        fallback.setAttribute('data-shell-error-fallback', '1');
        fallback.innerHTML = `
            <h3>${escapeHtml(shellCopy?.SHELL?.fallbackTitle || 'המעבר למעטפת נכשל')}</h3>
            <p>אפשר לרענן את המסך ולהמשיך לעבוד בלי לעבור למצב אחר.</p>
            <button type="button" class="btn btn-primary" data-shell-retry>נסה שוב</button>
        `;

        const button = fallback.querySelector('[data-shell-retry]');
        if (button) {
            button.addEventListener('click', () => {
                global.location.assign(buildUiModeUrl(screenId, 'shell'));
            });
        }

        sectionEl.prepend(fallback);
        console.error(`[MetaAppShell] ${screenId} shell render failed`, error);
    }

    function ensureOverlayProvider() {
        if (!global.MetaOverlayProvider || typeof global.MetaOverlayProvider.openOverlay !== 'function') {
            throw new Error('Overlay provider is unavailable');
        }
        global.MetaOverlayProvider.ensureRoot();
    }

    function readSessionFlag(key) {
        try {
            return sessionStorage.getItem(key) === '1';
        } catch (_error) {
            return false;
        }
    }

    function writeSessionFlag(key, value) {
        try {
            if (value) sessionStorage.setItem(key, '1');
            else sessionStorage.removeItem(key);
        } catch (_error) {
            // noop
        }
    }

    function createMetricDefinitions(screenState) {
        return [
            {
                id: 'openness',
                icon: '🧭',
                label: 'פתיחות',
                percent: screenState.sessionStarted ? 82 : 46,
                details: screenState.sessionStarted
                    ? 'הסשן התחיל. השדה הראשי נקי ומוכן לעבודה רציפה.'
                    : 'עדיין לא אושר "התחל סשן". אפשר להתחיל דרך הגדרות.'
            },
            {
                id: 'resources',
                icon: '🧰',
                label: 'משאבים',
                percent: Math.min(98, 62 + Math.round((screenState.launcherEntryCount || 0) * 1.8)),
                details: `יש ${screenState.launcherEntryCount || 0} מסלולים זמינים בתפריט ההגדרות.`
            },
            {
                id: 'distress',
                icon: '⚡',
                label: 'עומס',
                percent: screenState.sessionStarted ? 28 : 54,
                details: 'במצב מעטפת הסברים והגדרות נפתחים מעל המסך, בלי להאריך את הדף.'
            }
        ];
    }

    function openMetricOverlay(screenState, metric) {
        if (!screenState || !metric) return;
        recordPanelOpen(screenState, `metric:${metric.id}`, metric.label);
        rememberContinueState(screenState.id, {
            panelId: `metric:${metric.id}`,
            panelTitle: metric.label,
            screenTitle: getShellScreenCopy(screenState.id)?.title || getTabTitle(screenState.id)
        });
        renderHistoryFooter(screenState);

        const panel = document.createElement('article');
        panel.className = 'shell-overlay-content';
        panel.innerHTML = `
            <p class="shell-overlay-kicker">מדד</p>
            <h4>${escapeHtml(metric.icon)} ${escapeHtml(metric.label)} · ${Number(metric.percent || 0)}%</h4>
            <p>${escapeHtml(metric.details || '')}</p>
            <p class="shell-overlay-note">הסבר זה מוצג ב־overlay כדי לשמור את סביבת העבודה יציבה.</p>
        `;

        global.MetaOverlayProvider.openOverlay({
            type: 'metric',
            title: `${metric.label}`,
            size: 'sm',
            content: panel,
            closeOnBackdrop: true
        });
    }

    function renderMetrics(screenState) {
        const metricsRoot = screenState.shell.metrics;
        if (!metricsRoot) return;

        const metrics = createMetricDefinitions(screenState);
        metricsRoot.innerHTML = '';
        const fragment = document.createDocumentFragment();

        metrics.forEach((metric) => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'metric-chip';
            chip.setAttribute('data-metric-id', metric.id);
            chip.innerHTML = `
                <span class="metric-chip-icon" aria-hidden="true">${escapeHtml(metric.icon)}</span>
                <span class="metric-chip-label">${escapeHtml(metric.label)}</span>
                <span class="metric-chip-value">${Number(metric.percent || 0)}%</span>
            `;
            chip.addEventListener('click', () => openMetricOverlay(screenState, metric));
            fragment.appendChild(chip);
        });

        metricsRoot.appendChild(fragment);
    }

    function queryScoped(root, selector) {
        if (!root || !selector) return [];
        const safeSelector = String(selector || '').trim();
        if (!safeSelector) return [];
        try {
            if (safeSelector.startsWith('>')) {
                return Array.from(root.querySelectorAll(`:scope ${safeSelector}`));
            }
            return Array.from(root.querySelectorAll(safeSelector));
        } catch (_error) {
            return [];
        }
    }

    function sanitizeCloneTree(root) {
        if (!root || !(root instanceof Element)) return root;
        stripIdsFromCloneTree(root);
        const allNodes = [root, ...Array.from(root.querySelectorAll('*'))];
        allNodes.forEach((node) => {
            if (!(node instanceof HTMLElement)) return;
            node.hidden = false;
            node.removeAttribute('hidden');
            node.removeAttribute('aria-hidden');
            node.removeAttribute('aria-expanded');
            node.classList.remove('hidden', 'shell-inline-hidden', 'opened-content', 'screen-read-guide-modal', 'rapid-explain-modal');
            if (node.matches('details')) {
                node.setAttribute('open', '');
            }
        });
        root.querySelectorAll('.screen-read-guide-close, .rapid-explain-close, [data-guide-overlay-close], .overlay-close').forEach((node) => node.remove());
        return root;
    }

    function appendPanelContextHeader(wrapper, panel, screenState = null) {
        if (!wrapper) return;
        const contextKicker = String(panel?.contextKicker || '').trim();
        const contextTitle = String(panel?.contextTitle || '').trim();
        const contextSubtitle = String(panel?.contextSubtitle || '').trim();
        const resolvedTitle = contextTitle || String(panel?.title || panel?.action || panel?.id || '').trim();

        const contextHeader = document.createElement('header');
        contextHeader.className = 'shell-panel-context';
        const icon = getPanelIcon(panel?.id, panel);
        const featureTitle = String(
            screenState?.id
                ? getTabTitle(screenState.id)
                : ''
        ).trim();
        if (!contextKicker && !resolvedTitle && !contextSubtitle && !featureTitle) return;
        const inferredKicker = featureTitle
            ? `${icon} שם הלשונית של ${featureTitle}`
            : `${icon} מסך פנימי`;
        const kicker = contextKicker || inferredKicker;
        contextHeader.innerHTML = `
            <p class="shell-panel-context-kicker">${escapeHtml(kicker)}</p>
            ${resolvedTitle ? `<h4 class="shell-panel-context-title">${escapeHtml(resolvedTitle)}</h4>` : ''}
            ${contextSubtitle ? `<p class="shell-panel-context-subtitle">${escapeHtml(contextSubtitle)}</p>` : ''}
        `;
        wrapper.appendChild(contextHeader);
    }

    function normalizePanelText(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function compactPanelText(value, max = 190) {
        const normalized = normalizePanelText(value);
        if (!normalized) return '';
        if (!Number.isFinite(max) || max < 16) return normalized;
        if (normalized.length <= max) return normalized;
        return `${normalized.slice(0, max - 1)}…`;
    }

    function queryPanelText(root, selector) {
        if (!root || !selector) return '';
        try {
            return normalizePanelText(root.querySelector(selector)?.textContent || '');
        } catch (_error) {
            return '';
        }
    }

    function getComicRoundSnapshot(screenState) {
        const section = screenState?.section || document.getElementById('comic-engine');
        const root = section?.querySelector('#comicEngine');
        if (!root) return null;

        const choiceNodes = Array.from(root.querySelectorAll('#ceflow-choice-deck .ceflow-choice'));
        const choices = choiceNodes.map((node) => ({
            id: String(node.getAttribute('data-choice-id') || '').trim(),
            label: queryPanelText(node, '.ceflow-choice-top strong'),
            tone: queryPanelText(node, '.ceflow-choice-tone'),
            say: queryPanelText(node, '.ceflow-choice-line'),
            preview: queryPanelText(node, '.ceflow-choice-preview strong'),
            selected: node.classList.contains('is-selected')
        })).filter((choice) => choice.id);

        const selectedChoice = choices.find((choice) => choice.selected) || null;
        const alternativeChoice = selectedChoice
            ? (choices.find((choice) => choice.id === 'meta' && choice.id !== selectedChoice.id)
                || choices.find((choice) => choice.id !== selectedChoice.id)
                || null)
            : (choices[0] || null);

        const feedbackQuoteRows = Array.from(root.querySelectorAll('#ceflow-feedback .ceflow-feedback-quote')).map((quoteNode) => ({
            title: queryPanelText(quoteNode, 'strong'),
            text: queryPanelText(quoteNode, 'p')
        })).filter((quote) => quote.title || quote.text);
        const findQuote = (titleNeedle) => feedbackQuoteRows.find((item) => item.title.includes(titleNeedle))?.text || '';

        const snapshotRows = Array.from(root.querySelectorAll('#ceflow-turn-snapshot .ceflow-turn-snapshot-card')).map((cardNode) => ({
            title: queryPanelText(cardNode, 'strong'),
            text: queryPanelText(cardNode, 'p')
        })).filter((row) => row.title || row.text);
        const findSnapshot = (titleNeedle) => snapshotRows.find((item) => item.title.includes(titleNeedle))?.text || '';

        const metricRows = Array.from(root.querySelectorAll('#ceflow-overlay .ceflow-stat')).map((metricNode) => ({
            label: queryPanelText(metricNode, '.ceflow-stat-head span') || queryPanelText(metricNode, 'span'),
            meaning: queryPanelText(metricNode, '.ceflow-stat-meaning'),
            reason: queryPanelText(metricNode, '.ceflow-stat-reason')
        })).filter((metric) => metric.label || metric.reason || metric.meaning);

        return {
            sceneTitle: queryPanelText(root, '#ceflow-title'),
            sceneSubtitle: queryPanelText(root, '#ceflow-scene-subtitle'),
            choiceTitle: queryPanelText(root, '#ceflow-choice-title'),
            choiceAffordance: queryPanelText(root, '#ceflow-choice-affordance'),
            stageHeadline: queryPanelText(root, '#ceflow-stage-status strong'),
            stageCopy: queryPanelText(root, '#ceflow-stage-status p:last-child'),
            selectedChoice,
            alternativeChoice,
            choices,
            userReply: findQuote('המשפט שבחרת עכשיו') || normalizePanelText(root.querySelector('#ceflow-reply-input')?.value || ''),
            counterReply: findQuote('כך זה נשמע בצד השני'),
            languageWorked: queryPanelText(root, '#ceflow-feedback .ceflow-language-effect-line.is-worked'),
            languageBurden: queryPanelText(root, '#ceflow-feedback .ceflow-language-effect-line.is-burden'),
            languageTakeaway: queryPanelText(root, '#ceflow-feedback .ceflow-language-effect-takeaway') || queryPanelText(root, '#ceflow-turn-snapshot .ceflow-turn-snapshot-note'),
            panelWhy: queryPanelText(root, '#ceflow-overlay .ceflow-hud-why'),
            metricRows,
            snapshotShift: findSnapshot('מה זז'),
            snapshotLanded: findSnapshot('איך זה נחת')
        };
    }

    function buildComicRoundPanelShell(screenState, panel) {
        const wrapper = document.createElement('article');
        wrapper.className = 'shell-overlay-content comic-round-panel';
        appendPanelContextHeader(wrapper, panel, screenState);
        return wrapper;
    }

    function appendComicRoundFallback(wrapper, message) {
        const empty = document.createElement('p');
        empty.className = 'comic-round-empty';
        empty.textContent = String(message || 'אין כרגע סבב פעיל להצגה.').trim();
        wrapper.appendChild(empty);
    }

    function buildComicRoundGuidePanelContent(screenState, panel, snapshot) {
        const wrapper = buildComicRoundPanelShell(screenState, panel);
        if (!snapshot) {
            appendComicRoundFallback(wrapper, 'לא נמצא סבב קומיקס פעיל כרגע.');
            return wrapper;
        }

        const selected = snapshot.selectedChoice;
        const selectedSummary = selected
            ? `בסבב הזה בחרת: ${compactPanelText(selected.say || selected.label, 112)}`
            : 'בסבב הזה עדיין לא ננעלה בחירה. אפשר לבחור כרטיס אחד ולפתוח את ההיגיון של הרגע.';
        const logicLine = snapshot.languageWorked || snapshot.panelWhy || snapshot.stageCopy || 'ההיגיון בסבב נבנה מהטון שבחרת ומהדרך שבה הצד השני שומע אותו.';
        const strongestMetric = snapshot.metricRows.find((metric) => metric.reason) || null;

        const lead = document.createElement('p');
        lead.className = 'comic-round-lead';
        lead.textContent = compactPanelText(selectedSummary, 200);
        wrapper.appendChild(lead);

        const grid = document.createElement('section');
        grid.className = 'comic-round-grid';
        grid.innerHTML = `
            <article class="comic-round-card">
                <h5>מה קרה בסצנה הזו</h5>
                <p><strong>${escapeHtml(compactPanelText(snapshot.sceneTitle || 'סצנה פעילה', 70))}</strong></p>
                ${snapshot.stageHeadline ? `<p>${escapeHtml(compactPanelText(snapshot.stageHeadline, 120))}</p>` : ''}
                ${snapshot.userReply ? `<p><strong>משפט ההמשך שלך:</strong> ${escapeHtml(compactPanelText(snapshot.userReply, 130))}</p>` : ''}
            </article>
            <article class="comic-round-card">
                <h5>ההיגיון של הבחירה בסבב הזה</h5>
                <p>${escapeHtml(compactPanelText(logicLine, 220))}</p>
                ${strongestMetric ? `<p><strong>${escapeHtml(strongestMetric.label)}:</strong> ${escapeHtml(compactPanelText(strongestMetric.reason, 120))}</p>` : ''}
            </article>
        `;
        wrapper.appendChild(grid);

        if (snapshot.alternativeChoice && selected) {
            const compare = document.createElement('section');
            compare.className = 'comic-round-compare';
            compare.innerHTML = `
                <h5>מה הייתה אפשרות אחרת?</h5>
                <p><strong>${escapeHtml(compactPanelText(snapshot.alternativeChoice.label || snapshot.alternativeChoice.tone || 'אפשרות אחרת', 66))}</strong></p>
                <p>${escapeHtml(compactPanelText(snapshot.alternativeChoice.say || '', 136))}</p>
                ${snapshot.alternativeChoice.preview ? `<p class="comic-round-note">סביר שהיה זז אחרת: ${escapeHtml(compactPanelText(snapshot.alternativeChoice.preview, 120))}</p>` : ''}
            `;
            wrapper.appendChild(compare);
        }

        return wrapper;
    }

    function buildComicRoundSetupPanelContent(screenState, panel, snapshot) {
        const wrapper = buildComicRoundPanelShell(screenState, panel);
        if (!snapshot) {
            appendComicRoundFallback(wrapper, 'לא נמצא סבב קומיקס פעיל כרגע.');
            return wrapper;
        }

        const selected = snapshot.selectedChoice;
        const lead = document.createElement('p');
        lead.className = 'comic-round-lead';
        lead.textContent = selected
            ? 'זה סיכום הבחירה שננעלה בסבב הזה, כדי לראות מה הופעל לפני המשוב.'
            : 'עדיין לא ננעלה בחירה. הכרטיס שתבחר/י כאן יכתיב את כיוון השיחה והמשוב.';
        wrapper.appendChild(lead);

        const grid = document.createElement('section');
        grid.className = 'comic-round-grid';
        if (selected) {
            grid.innerHTML = `
                <article class="comic-round-card">
                    <h5>הבחירה שננעלה</h5>
                    <p><strong>${escapeHtml(compactPanelText(selected.label || selected.tone || 'תגובה נבחרת', 70))}</strong></p>
                    ${selected.say ? `<p>${escapeHtml(compactPanelText(selected.say, 160))}</p>` : ''}
                    ${selected.preview ? `<p class="comic-round-note">${escapeHtml(compactPanelText(selected.preview, 130))}</p>` : ''}
                </article>
                <article class="comic-round-card">
                    <h5>מה לבחור בפעם הבאה</h5>
                    <p>${escapeHtml(compactPanelText(snapshot.choiceAffordance || 'בחר/י ניסוח שמחזיק גבול וגם משאיר פתח לבירור.', 170))}</p>
                    ${snapshot.sceneSubtitle ? `<p class="comic-round-note">${escapeHtml(compactPanelText(snapshot.sceneSubtitle, 130))}</p>` : ''}
                </article>
            `;
        } else {
            const options = snapshot.choices.slice(0, 3);
            const optionsList = options.map((item) => `<li>${escapeHtml(compactPanelText(item.label || item.say || item.id, 78))}</li>`).join('');
            grid.innerHTML = `
                <article class="comic-round-card">
                    <h5>לפני הנעילה</h5>
                    <p>${escapeHtml(compactPanelText(snapshot.choiceTitle || 'בחר/י תגובה אחת לסבב הנוכחי.', 140))}</p>
                    ${optionsList ? `<ul class="comic-round-list">${optionsList}</ul>` : ''}
                </article>
                <article class="comic-round-card">
                    <h5>למה זה חשוב</h5>
                    <p>כל ניסוח יוצר עולם שיחה אחר. אחרי הבחירה, פתח/י את המשוב כדי לראות מה בדיוק זז.</p>
                </article>
            `;
        }
        wrapper.appendChild(grid);

        if (snapshot.alternativeChoice && selected) {
            const compare = document.createElement('section');
            compare.className = 'comic-round-compare';
            compare.innerHTML = `
                <h5>השוואה קצרה לניסוח אחר</h5>
                <p><strong>${escapeHtml(compactPanelText(snapshot.alternativeChoice.label || 'אפשרות אחרת', 66))}</strong></p>
                <p>${escapeHtml(compactPanelText(snapshot.alternativeChoice.say || '', 120))}</p>
                ${snapshot.alternativeChoice.preview ? `<p class="comic-round-note">${escapeHtml(compactPanelText(snapshot.alternativeChoice.preview, 120))}</p>` : ''}
            `;
            wrapper.appendChild(compare);
        }

        return wrapper;
    }

    function buildComicRoundFeedbackPanelContent(screenState, panel, snapshot) {
        const wrapper = buildComicRoundPanelShell(screenState, panel);
        if (!snapshot) {
            appendComicRoundFallback(wrapper, 'לא נמצא סבב קומיקס פעיל כרגע.');
            return wrapper;
        }

        const selected = snapshot.selectedChoice;
        if (!selected) {
            appendComicRoundFallback(wrapper, 'אין עדיין בחירה להשוות. בחר/י כרטיס אחד ואז פתח/י שוב את המשוב.');
            return wrapper;
        }

        const metricItems = snapshot.metricRows
            .filter((metric) => metric.label || metric.reason)
            .slice(0, 4)
            .map((metric) => `<li><strong>${escapeHtml(compactPanelText(metric.label, 34))}:</strong> ${escapeHtml(compactPanelText(metric.reason || metric.meaning, 118))}</li>`)
            .join('');

        const lead = document.createElement('p');
        lead.className = 'comic-round-lead';
        lead.textContent = 'קריאה עמוקה של אותו סבב: תגובה, הדהוד בצד השני, השפעת המדדים, ומה לקחת הלאה.';
        wrapper.appendChild(lead);

        const grid = document.createElement('section');
        grid.className = 'comic-round-grid';
        grid.innerHTML = `
            <article class="comic-round-card">
                <h5>1. מה קרה בתגובה</h5>
                <p><strong>בחירה:</strong> ${escapeHtml(compactPanelText(selected.say || selected.label, 128))}</p>
                ${snapshot.userReply ? `<p><strong>משפט המשך:</strong> ${escapeHtml(compactPanelText(snapshot.userReply, 128))}</p>` : ''}
            </article>
            <article class="comic-round-card">
                <h5>2. איך זה נשמע לצד השני</h5>
                <p>${escapeHtml(compactPanelText(snapshot.counterReply || snapshot.snapshotLanded || 'כאן רואים את ההדהוד הרגשי של הניסוח.', 160))}</p>
            </article>
            <article class="comic-round-card">
                <h5>3. מה זה עשה למדדים</h5>
                ${metricItems ? `<ul class="comic-round-list">${metricItems}</ul>` : `<p>${escapeHtml(compactPanelText(snapshot.panelWhy || 'המדדים הושפעו מהניסוח ומהטון של הסבב.', 150))}</p>`}
            </article>
            <article class="comic-round-card">
                <h5>4. מה ללמוד להמשך</h5>
                ${snapshot.languageWorked ? `<p>${escapeHtml(compactPanelText(snapshot.languageWorked, 160))}</p>` : ''}
                ${snapshot.languageBurden ? `<p>${escapeHtml(compactPanelText(snapshot.languageBurden, 160))}</p>` : ''}
                <p class="comic-round-note">${escapeHtml(compactPanelText(snapshot.languageTakeaway || 'משפט מדויק משנה את איכות הקשר גם בתוך לחץ.', 160))}</p>
            </article>
        `;
        wrapper.appendChild(grid);

        if (snapshot.alternativeChoice) {
            const compare = document.createElement('section');
            compare.className = 'comic-round-compare';
            compare.innerHTML = `
                <h5>השוואה: איך ניסוח אחר היה משנה את התחושה?</h5>
                <p><strong>${escapeHtml(compactPanelText(snapshot.alternativeChoice.label || 'אפשרות אחרת', 66))}</strong> ${escapeHtml(compactPanelText(snapshot.alternativeChoice.say || '', 100))}</p>
                ${snapshot.alternativeChoice.preview ? `<p class="comic-round-note">השפעה אפשרית: ${escapeHtml(compactPanelText(snapshot.alternativeChoice.preview, 120))}</p>` : ''}
            `;
            wrapper.appendChild(compare);
        }

        return wrapper;
    }

    function buildComicRoundPanelContent(screenState, panel) {
        if (screenState?.id !== 'comic-engine') return null;
        const panelId = String(panel?.id || '').trim();
        if (!panelId) return null;
        const snapshot = getComicRoundSnapshot(screenState);
        if (panelId === 'guide') return buildComicRoundGuidePanelContent(screenState, panel, snapshot);
        if (panelId === 'setup') return buildComicRoundSetupPanelContent(screenState, panel, snapshot);
        if (panelId === 'feedback') return buildComicRoundFeedbackPanelContent(screenState, panel, snapshot);
        return null;
    }

    function buildGuidePanelContent(screenState, panel) {
        const sourceId = String(panel?.guideId || screenState.id || '').trim();
        const guideRoot = screenState.section?.querySelector(`.screen-read-guide[data-screen-guide="${sourceId}"]`)
            || screenState.section?.querySelector('.screen-read-guide');
        if (!guideRoot) {
            const empty = document.createElement('article');
            empty.className = 'shell-overlay-content';
            empty.innerHTML = '<p>לא נמצא מדריך מסך זמין.</p>';
            return empty;
        }

        const wrapper = document.createElement('article');
        wrapper.className = 'shell-overlay-content';
        appendPanelContextHeader(wrapper, panel, screenState);

        const philosopher = guideRoot.querySelector('.screen-read-guide-philosopher-toggle');
        const content = guideRoot.querySelector('.screen-read-guide-content');
        const summary = guideRoot.querySelector('.screen-demo-dialogue-summary');
        const dialogue = guideRoot.querySelector('.screen-demo-dialogue-box');

        [philosopher, content, summary, dialogue].forEach((node) => {
            if (!node) return;
            wrapper.appendChild(sanitizeCloneTree(node.cloneNode(true)));
        });

        if (!wrapper.children.length) {
            wrapper.innerHTML = '<p>לא נמצא תוכן מדריך זמין.</p>';
        }
        return wrapper;
    }

    function resolvePanelSourceRoot(screenState, panel) {
        const sourceRoot = String(panel?.sourceRoot || 'workspace').trim();
        if (sourceRoot === 'section') return screenState.section;
        if (sourceRoot === 'document') return document;
        return screenState.workspaceNode || screenState.section;
    }

    function buildSelectorsPanelContent(screenState, panel) {
        const wrapper = document.createElement('article');
        wrapper.className = 'shell-overlay-content';
        appendPanelContextHeader(wrapper, panel, screenState);
        const root = resolvePanelSourceRoot(screenState, panel);
        const selectors = Array.isArray(panel?.selectors) ? panel.selectors : [];
        let matched = 0;

        selectors.forEach((selector) => {
            queryScoped(root, selector).forEach((node) => {
                if (!node) return;
                wrapper.appendChild(sanitizeCloneTree(node.cloneNode(true)));
                matched += 1;
            });
        });

        if (!matched) {
            const empty = document.createElement('p');
            empty.textContent = 'אין כרגע תוכן זמין בחלון הזה.';
            wrapper.appendChild(empty);
        }
        return wrapper;
    }

    function buildButtonsPanelContent(screenState, panel) {
        const wrapper = document.createElement('article');
        wrapper.className = 'shell-overlay-content';
        appendPanelContextHeader(wrapper, panel, screenState);
        if (panel?.description) {
            const description = document.createElement('p');
            description.textContent = panel.description;
            wrapper.appendChild(description);
        }

        const actions = document.createElement('div');
        actions.className = 'shell-overlay-actions';
        (Array.isArray(panel?.buttons) ? panel.buttons : []).forEach((buttonCfg) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `btn ${buttonCfg?.style === 'primary' ? 'btn-primary' : 'btn-secondary'}`;
            btn.textContent = String(buttonCfg?.label || 'פעולה').trim();
            btn.addEventListener('click', () => {
                const handlerName = String(buttonCfg?.handler || '').trim();
                if (handlerName && typeof global[handlerName] === 'function') {
                    global[handlerName]();
                }
            });
            actions.appendChild(btn);
        });
        wrapper.appendChild(actions);
        return wrapper;
    }

    function getGenericPanelById(screenState, panelId) {
        const panels = Array.isArray(screenState?.config?.panels) ? screenState.config.panels : [];
        return panels.find((panel) => String(panel?.id || '').trim() === String(panelId || '').trim()) || null;
    }

    function getPanelIcon(panelId, panelConfig = null) {
        const explicit = String(panelConfig?.icon || '').trim();
        if (explicit) return explicit;
        const id = String(panelId || '').trim();
        if (id.includes('guide') || id.includes('help')) return '❔';
        if (id.includes('history')) return '🕘';
        if (id.includes('settings') || id.includes('setup')) return '⚙️';
        if (id.includes('export')) return '📤';
        if (id.includes('schema') || id.includes('blueprint')) return '🧩';
        if (id.includes('menu')) return '☰';
        if (id.includes('about') || id.includes('intro')) return 'ℹ';
        if (id.includes('stats') || id.includes('performance')) return '📊';
        return '•';
    }

    function renderGenericFooter(screenState) {
        const body = screenState?.shell?.bottomBody;
        if (!body) return;
        const continueState = readContinueState();
        const lastOpen = screenState.lastPanelOpenAt
            ? new Date(screenState.lastPanelOpenAt).toLocaleString('he-IL')
            : getShellCopy()?.SHELL?.lastOpenedAtNone || 'עדיין לא נרשמה פתיחה של חלון משנה.';

        const panelText = screenState.lastOpenedPanelTitle
            ? escapeHtml(screenState.lastOpenedPanelTitle)
            : escapeHtml(getShellCopy()?.SHELL?.lastPanelNone || 'עדיין לא נפתח חלון משנה.');
        const continueText = continueState.screenId
            ? `${escapeHtml(continueState.screenTitle || getTabTitle(continueState.screenId))}${continueState.panelTitle ? ` · ${escapeHtml(continueState.panelTitle)}` : ''}`
            : escapeHtml(getShellCopy()?.SHELL?.continueNone || 'אין נקודת המשך שמורה עדיין.');

        body.innerHTML = `
            <p><strong>המשך שמור:</strong> ${continueText}</p>
            <p><strong>חלון אחרון במסך הזה:</strong> ${panelText}</p>
            <p><strong>נפתח ב:</strong> ${escapeHtml(lastOpen)}</p>
        `;
    }

    function renderGenericActionRail(screenState) {
        const actionsRoot = screenState?.shell?.actions;
        if (!actionsRoot) return;
        actionsRoot.innerHTML = '';

        const continueState = readContinueState();
        if (!continueState.screenId || continueState.screenId === screenState.id) {
            actionsRoot.hidden = true;
            return;
        }

        actionsRoot.hidden = false;
        const actionRow = document.createElement('div');
        actionRow.className = 'shell-inline-actions home-shell-actions';
        actionRow.appendChild(createActionButton({
            label: `${getShellActionLabel('resume', 'המשך')}: ${continueState.screenTitle || getTabTitle(continueState.screenId)}`,
            icon: '▶',
            onClick: () => resumeContinueState()
        }));
        actionsRoot.appendChild(actionRow);
    }

    function applyScreenHideSelectors(screenState) {
        if (!screenState) return;
        const workspace = screenState.workspaceNode || screenState.section;
        const section = screenState.section;
        const workspaceSelectors = Array.isArray(screenState.config?.hideSelectors) ? screenState.config.hideSelectors : [];
        const sectionSelectors = Array.isArray(screenState.config?.sectionHideSelectors) ? screenState.config.sectionHideSelectors : [];

        workspaceSelectors.forEach((selector) => {
            queryScoped(workspace, selector).forEach((node) => node.classList.add('shell-inline-hidden'));
        });
        sectionSelectors.forEach((selector) => {
            queryScoped(section, selector).forEach((node) => node.classList.add('shell-inline-hidden'));
        });
    }

    function openGenericPanelOverlay(screenState, panelId) {
        const panel = getGenericPanelById(screenState, panelId);
        if (!screenState || !panel) return false;
        ensureOverlayProvider();
        recordPanelOpen(screenState, panelId, panel.title);
        rememberContinueState(screenState.id, {
            panelId,
            panelTitle: panel.title,
            screenTitle: screenState.title
        });
        renderGenericFooter(screenState);

        let content = buildComicRoundPanelContent(screenState, panel);
        if (!content) {
            if (panel.type === 'guide') content = buildGuidePanelContent(screenState, panel);
            else if (panel.type === 'buttons') content = buildButtonsPanelContent(screenState, panel);
            else content = buildSelectorsPanelContent(screenState, panel);
        }

        global.MetaOverlayProvider.openOverlay({
            type: `${screenState.id}-${panel.id}`,
            title: panel.title || screenState.title,
            size: panel.size || 'md',
            closeOnBackdrop: true,
            content
        });
        return true;
    }

    function mountGenericShell(screenId) {
        const config = getShellRegistryEntry(screenId);
        if (!config || config.adapter !== 'generic') return null;
        const mode = getUiMode(screenId);
        if (mode !== 'shell') return null;

        const section = document.getElementById(screenId);
        if (!section) return null;
        if (stateByScreen[screenId]?.mounted) return stateByScreen[screenId];

        try {
            const container = section.querySelector(config.containerSelector) || section;
            const workspaceNode = section.querySelector(config.workspaceSelector);
            if (!workspaceNode) return null;

            const shellCopy = getShellScreenCopy(screenId);
            const shell = createAppShellFrame({
                screenId,
                title: shellCopy.title || getTabTitle(screenId),
                subtitle: shellCopy.subtitle || ''
            });
            shell.metrics.hidden = true;

            const screenState = {
                id: screenId,
                title: shellCopy.title || getTabTitle(screenId),
                mode,
                mounted: true,
                config,
                section,
                container,
                shell,
                workspaceNode,
                panelOpens: Object.create(null),
                lastOpenedPanel: '',
                lastOpenedPanelTitle: '',
                lastPanelOpenAt: ''
            };

            const headerActions = Array.isArray(config.panels) ? config.panels.filter((panel) => panel?.id !== 'legacy') : [];
            headerActions.forEach((panel) => {
                shell.headerActions.appendChild(createActionButton({
                    label: panel.action || panel.title || 'פרטים',
                    icon: getPanelIcon(panel.id, panel),
                    onClick: () => openGenericPanelOverlay(screenState, panel.id)
                }));
            });

            shell.workspace.appendChild(workspaceNode);
            container.prepend(shell.root);

            section.classList.add('shell-screen-active');
            section.setAttribute('data-ui-mode', 'shell');

            applyScreenHideSelectors(screenState);
            renderGenericActionRail(screenState);
            renderGenericFooter(screenState);

            stateByScreen[screenId] = screenState;
            return screenState;
        } catch (error) {
            renderShellFallback(section, screenId, error);
            return null;
        }
    }

    function restoreLauncherHome(screenState) {
        if (!screenState || !screenState.launcher || !screenState.launcherHost) return;
        if (!screenState.launcherHost.contains(screenState.launcher)) {
            screenState.launcherHost.appendChild(screenState.launcher);
        }
        screenState.launcher.hidden = true;
    }

    function openVerbSettingsOverlay(screenState, options) {
        if (!screenState || !screenState.launcher) return;
        ensureOverlayProvider();

        const opts = options && typeof options === 'object' ? options : {};
        const entryMode = opts.entry === true;
        const launcher = screenState.launcher;

        recordPanelOpen(screenState, entryMode ? 'wizard' : 'settings', entryMode ? 'הגדרות פתיחה' : 'הגדרות');
        rememberContinueState(screenState.id, {
            panelId: entryMode ? 'wizard' : 'settings',
            panelTitle: entryMode ? 'הגדרות פתיחה' : 'הגדרות',
            screenTitle: getShellScreenCopy(screenState.id)?.title || getTabTitle(screenState.id)
        });
        renderHistoryFooter(screenState);

        const wrapper = document.createElement('div');
        wrapper.className = 'shell-overlay-content shell-overlay-content-settings';

        const title = document.createElement('p');
        title.className = 'shell-overlay-kicker';
        title.textContent = entryMode ? 'הגדרות פתיחה' : 'הגדרות';
        wrapper.appendChild(title);

        const lead = document.createElement('p');
        lead.textContent = entryMode
            ? 'הגדרה חד-פעמית לפני התחלה. אחרי לחיצה על "התחל סשן" ההגדרות נפתחות רק דרך כפתור ההגדרות.'
            : 'בחר/י כלי מהיר ופתח/י אותו בלי לשנות את גובה עמוד העבודה.';
        wrapper.appendChild(lead);

        const launcherWrap = document.createElement('div');
        launcherWrap.className = 'shell-launcher-wrap opened-content';
        launcher.hidden = false;
        launcherWrap.appendChild(launcher);
        wrapper.appendChild(launcherWrap);

        const actions = document.createElement('div');
        actions.className = 'shell-overlay-actions';

        if (!screenState.sessionStarted) {
            const startBtn = document.createElement('button');
            startBtn.type = 'button';
            startBtn.className = 'btn btn-primary';
            startBtn.textContent = 'התחל סשן';
            startBtn.addEventListener('click', () => {
                screenState.sessionStarted = true;
                writeSessionFlag(VERB_SESSION_KEY, true);
                renderMetrics(screenState);
                renderHistoryFooter(screenState);
                global.MetaOverlayProvider.closeOverlay('session-started');
            });
            actions.appendChild(startBtn);
        }

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'btn btn-secondary';
        closeBtn.textContent = 'סגירה';
        closeBtn.addEventListener('click', () => global.MetaOverlayProvider.closeOverlay('close-settings'));
        actions.appendChild(closeBtn);
        wrapper.appendChild(actions);

        global.MetaOverlayProvider.openOverlay({
            type: 'settings',
            title: entryMode ? 'הגדרות פתיחה' : 'הגדרות',
            size: 'lg',
            closeOnBackdrop: true,
            content: wrapper,
            onClose: () => {
                restoreLauncherHome(screenState);
                renderMetrics(screenState);
                renderHistoryFooter(screenState);
            }
        });
    }

    function openVerbHelpOverlay(screenState) {
        if (!screenState) return;
        ensureOverlayProvider();
        recordPanelOpen(screenState, 'help', 'עזרה');
        rememberContinueState(screenState.id, {
            panelId: 'help',
            panelTitle: 'עזרה',
            screenTitle: getShellScreenCopy(screenState.id)?.title || getTabTitle(screenState.id)
        });
        renderHistoryFooter(screenState);

        const panel = document.createElement('article');
        panel.className = 'shell-overlay-content';
        panel.innerHTML = `
            <p class="shell-overlay-kicker">עזרה</p>
            <h4>${escapeHtml(screenState.helpCopy.title)}</h4>
            <p>${escapeHtml(screenState.helpCopy.subtitle)}</p>
            <p>${escapeHtml(screenState.helpCopy.note)}</p>
            <ol class="shell-help-list">
                <li>בחר/י כלי דרך כפתור ההגדרות.</li>
                <li>השאר/י את סביבת העבודה פתוחה ונקייה.</li>
                <li>סגור/י הסבר/הגדרות בלחיצה על "הבנתי" או ESC.</li>
            </ol>
        `;

        global.MetaOverlayProvider.openOverlay({
            type: 'help',
            title: 'איך עובדים במסך הזה',
            size: 'md',
            closeOnBackdrop: true,
            content: panel
        });
    }

    function openVerbStatsOverlay(screenState) {
        if (!screenState) return;
        ensureOverlayProvider();
        recordPanelOpen(screenState, 'stats', 'נתונים');
        rememberContinueState(screenState.id, {
            panelId: 'stats',
            panelTitle: 'נתונים',
            screenTitle: getShellScreenCopy(screenState.id)?.title || getTabTitle(screenState.id)
        });
        renderHistoryFooter(screenState);

        const panel = document.createElement('article');
        panel.className = 'shell-overlay-content';
        const lastOpen = screenState.lastPanelOpenAt
            ? new Date(screenState.lastPanelOpenAt).toLocaleString('he-IL')
            : '—';
        panel.innerHTML = `
            <p class="shell-overlay-kicker">נתונים</p>
            <ul class="shell-stats-list">
                <li><strong>מצב תצוגה:</strong> ${escapeHtml(screenState.mode)}</li>
                <li><strong>הסשן התחיל:</strong> ${screenState.sessionStarted ? 'כן' : 'לא'}</li>
                <li><strong>חלון אחרון:</strong> ${escapeHtml(screenState.lastOpenedPanelTitle || screenState.lastOpenedPanel || '—')}</li>
                <li><strong>נפתח ב:</strong> ${escapeHtml(lastOpen)}</li>
                <li><strong>פתיחות:</strong> הגדרות ${screenState.panelOpens.settings || 0} | עזרה ${screenState.panelOpens.help || 0} | נתונים ${screenState.panelOpens.stats || 0}</li>
            </ul>
        `;

        global.MetaOverlayProvider.openOverlay({
            type: 'stats',
            title: 'סטטיסטיקות קצרות',
            size: 'sm',
            closeOnBackdrop: true,
            content: panel
        });
    }

    function renderHistoryFooter(screenState) {
        const body = screenState.shell.bottomBody;
        if (!body) return;
        const lastOpen = screenState.lastPanelOpenAt
            ? new Date(screenState.lastPanelOpenAt).toLocaleString('he-IL')
            : 'עדיין לא נפתחו חלונות משנה';

        body.innerHTML = `
            <p><strong>חלון אחרון:</strong> ${escapeHtml(screenState.lastOpenedPanelTitle || screenState.lastOpenedPanel || '—')}</p>
            <p><strong>נפתח ב:</strong> ${escapeHtml(lastOpen)}</p>
            <p><strong>מסך פתיחה הוצג:</strong> ${screenState.wizardShown ? 'כן' : 'לא'}</p>
        `;
    }

    function renderHomeFooter(screenState) {
        const body = screenState?.shell?.bottomBody;
        if (!body) return;
        const lastOverlay = screenState.lastPanelOpenAt
            ? new Date(screenState.lastPanelOpenAt).toLocaleString('he-IL')
            : 'עדיין לא נפתחו חלונות עזר';
        const lastVisited = readHomeLastVisitedTab();
        const lastVisitedText = lastVisited
            ? `${escapeHtml(getTabTitle(lastVisited.tab))}${lastVisited.panelTitle ? ` · ${escapeHtml(lastVisited.panelTitle)}` : ''}${lastVisited.at ? ` · ${escapeHtml(new Date(lastVisited.at).toLocaleString('he-IL'))}` : ''}`
            : 'אין מסך המשך שמור';

        body.innerHTML = `
            <p><strong>המשך אחרון:</strong> ${lastVisitedText}</p>
            <p><strong>חלון אחרון:</strong> ${escapeHtml(screenState.lastOpenedPanelTitle || screenState.lastOpenedPanel || '—')}</p>
            <p><strong>נפתח ב:</strong> ${escapeHtml(lastOverlay)}</p>
        `;
    }

    function openHomeHelpOverlay(screenState) {
        if (!screenState) return;
        ensureOverlayProvider();
        recordPanelOpen(screenState, 'help', 'עזרה');
        rememberContinueState(screenState.id, {
            panelId: 'help',
            panelTitle: 'עזרה',
            screenTitle: getShellScreenCopy(screenState.id)?.title || getTabTitle(screenState.id)
        });
        renderHomeFooter(screenState);

        const panel = document.createElement('article');
        panel.className = 'shell-overlay-content';
        panel.innerHTML = `
            <p class="shell-overlay-kicker">עזרה</p>
            <h4>איך לעבוד מדף הבית</h4>
            <p>דף הבית נשאר קצר: בוחרים מסלול אחד, נכנסים לכלי החי שלו, וחוזרים לכאן רק כדי לבחור את הצעד הבא.</p>
            <ol class="shell-help-list">
                <li>התחל/י דרך אחד משערי הכניסה הראשיים או דרך התפריט המלא.</li>
                <li>אם צריך הקשר, פתח/י רקע או עזרה בשכבה בלי להפוך את הבית לדשבורד עמוס.</li>
                <li>השתמש/י ב״המשך אחרון״ כדי לחזור ישר למסך שבו עצרת.</li>
            </ol>
        `;

        global.MetaOverlayProvider.openOverlay({
            type: 'home-help',
            title: 'עזרה למסך הבית',
            size: 'md',
            closeOnBackdrop: true,
            content: panel
        });
    }

    function openHomeAboutOverlay(screenState) {
        if (!screenState) return;
        ensureOverlayProvider();
        recordPanelOpen(screenState, 'about', 'על המוצר');
        rememberContinueState(screenState.id, {
            panelId: 'about',
            panelTitle: 'על המוצר',
            screenTitle: getShellScreenCopy(screenState.id)?.title || getTabTitle(screenState.id)
        });
        renderHomeFooter(screenState);

        const panel = document.createElement('article');
        panel.className = 'shell-overlay-content';
        panel.innerHTML = `
            <p class="shell-overlay-kicker">רקע</p>
            <h4>סביבת התרגול</h4>
            <p>הפלטפורמה מחברת בין ארבעה סוגי עבודה: זיהוי מהיר, גשר תחושה-שפה, מעבדות עומק, וסימולציית שיחה.</p>
            <ul class="shell-help-list">
                <li><strong>תרגול:</strong> זיהוי מהיר וחידוד שאלה/תגובה.</li>
                <li><strong>הלימה:</strong> גשר תחושה-שפה לפני אתגור.</li>
                <li><strong>מעבדה:</strong> פירוק, מיפוי ותכנון צעד ההמשך.</li>
                <li><strong>ביצוע:</strong> סימולטור סצנות במסלול עצמאי.</li>
            </ul>
        `;

        const actions = document.createElement('div');
        actions.className = 'shell-overlay-actions';

        const openRouteBtn = document.createElement('button');
        openRouteBtn.type = 'button';
        openRouteBtn.className = 'btn btn-primary';
        openRouteBtn.textContent = 'פתח את מסך המוצר';
        openRouteBtn.addEventListener('click', () => {
            global.MetaOverlayProvider.closeOverlay('home-about-route');
            window.setTimeout(() => {
                if (typeof global.navigateTo === 'function') {
                    global.navigateTo('about', { playSound: true, scrollToTop: true });
                } else {
                    global.location.assign(buildUiModeUrl('about', 'legacy'));
                }
            }, 20);
        });
        actions.appendChild(openRouteBtn);

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'btn btn-secondary';
        closeBtn.textContent = 'סגירה';
        closeBtn.addEventListener('click', () => global.MetaOverlayProvider.closeOverlay('home-about-close'));
        actions.appendChild(closeBtn);
        panel.appendChild(actions);

        global.MetaOverlayProvider.openOverlay({
            type: 'home-about',
            title: 'על המוצר',
            size: 'md',
            closeOnBackdrop: true,
            content: panel
        });
    }

    function openHomeMenuOverlay(screenState) {
        if (!screenState) return false;
        ensureOverlayProvider();
        recordPanelOpen(screenState, 'menu', 'תפריט');
        rememberContinueState(screenState.id, {
            panelId: 'menu',
            panelTitle: 'תפריט',
            screenTitle: getShellScreenCopy(screenState.id)?.title || getTabTitle(screenState.id)
        });
        renderHomeFooter(screenState);
        closeInlineFeatureMapIfNeeded();

        const featureMap = document.getElementById('feature-map-toggle');
        const featureMapBody = featureMap?.querySelector('.feature-map-body');
        const panel = document.createElement('article');
        panel.className = 'shell-overlay-content';
        panel.innerHTML = `
            <p class="shell-overlay-kicker">תפריט</p>
            <h4>תפריט מלא</h4>
            <p>כל מסלולי האימון מרוכזים כאן, בלי להאריך את דף הבית.</p>
        `;

        const closeOverlayThen = (callback, reason = 'home-menu-action') => {
            if (typeof callback !== 'function') return;
            const provider = global.MetaOverlayProvider;
            const canCloseFirst = provider
                && typeof provider.isOpen === 'function'
                && typeof provider.closeOverlay === 'function'
                && provider.isOpen();
            if (!canCloseFirst) {
                callback();
                return;
            }
            provider.closeOverlay(reason);
            global.setTimeout(() => {
                callback();
            }, 70);
        };

        if (featureMapBody) {
            const clone = featureMapBody.cloneNode(true);
            stripIdsFromCloneTree(clone);
            clone.classList.add('home-shell-menu-clone');
            clone.addEventListener('click', (event) => {
                const trigger = event.target?.closest?.('a, button');
                if (!trigger) return;
                const navKey = String(trigger.getAttribute('data-nav-key') || '').trim();
                const fallbackHref = String(
                    trigger.getAttribute('data-versioned-href')
                    || trigger.getAttribute('href')
                    || ''
                ).trim();
                if (navKey && typeof global.navigateByNavKey === 'function') {
                    event.preventDefault();
                    closeOverlayThen(() => {
                        if (global.navigateByNavKey(navKey, { versioned: true }) !== false) return;
                        if (fallbackHref) {
                            const versionedHref = typeof global.__withAssetVersion === 'function'
                                ? global.__withAssetVersion(fallbackHref)
                                : fallbackHref;
                            global.location.assign(versionedHref);
                        }
                    }, 'home-menu-nav-key');
                    return;
                }
                if (fallbackHref) {
                    event.preventDefault();
                    closeOverlayThen(() => {
                        const versionedHref = typeof global.__withAssetVersion === 'function'
                            ? global.__withAssetVersion(fallbackHref)
                            : fallbackHref;
                        global.location.assign(versionedHref);
                    }, 'home-menu-action');
                    return;
                }
                closeOverlayThen(() => {}, 'home-menu-action');
            });
            clone.querySelectorAll('[data-global-feature-menu-select]').forEach((selectNode) => {
                selectNode.addEventListener('change', (event) => {
                    const sourceKey = String(event?.target?.getAttribute?.('data-global-feature-menu-select') || '').trim();
                    const selectedKey = String(event?.target?.value || '').trim();
                    if (!sourceKey || !selectedKey) return;

                    const liveSelect = featureMap?.querySelector?.(`[data-global-feature-menu-select="${sourceKey}"]`);
                    if (!(liveSelect instanceof HTMLSelectElement)) return;

                    closeOverlayThen(() => {
                        liveSelect.value = selectedKey;
                        liveSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    }, 'home-menu-select-action');
                });
            });
            panel.appendChild(clone);
        } else {
            const fallback = document.createElement('p');
            fallback.textContent = 'תוכן התפריט לא זמין כרגע.';
            panel.appendChild(fallback);
        }

        global.MetaOverlayProvider.openOverlay({
            type: 'home-menu',
            title: 'תפריט מלא',
            size: 'xl',
            closeOnBackdrop: true,
            content: panel
        });
        return true;
    }

    function renderHomeActionRail(screenState) {
        const actionsRoot = screenState?.shell?.actions;
        if (!actionsRoot) return;
        actionsRoot.innerHTML = '';

        const lastVisited = readHomeLastVisitedTab();
        if (!lastVisited) {
            actionsRoot.hidden = true;
            return;
        }

        actionsRoot.hidden = false;
        const actionRow = document.createElement('div');
        actionRow.className = 'shell-inline-actions home-shell-actions';

        const resumeBtn = createActionButton({
            label: `המשך: ${getTabTitle(lastVisited.tab)}`,
            icon: '▶',
            className: 'home-shell-resume-btn',
            onClick: () => resumeContinueState()
        });
        actionRow.appendChild(resumeBtn);
        actionsRoot.appendChild(actionRow);
    }

    function mountHomeShell() {
        const mode = getUiMode(HOME_SCREEN_ID);
        if (mode !== 'shell') return null;

        const section = document.getElementById(HOME_SCREEN_ID);
        if (!section) return null;
        if (stateByScreen[HOME_SCREEN_ID] && stateByScreen[HOME_SCREEN_ID].mounted) {
            return stateByScreen[HOME_SCREEN_ID];
        }

        try {
            const mobileFeed = section.querySelector('#mobile-feed-home');
            const hero = section.querySelector('.home-route-hero');
            const features = section.querySelector('.home-route-features');
            const primaryCta = section.querySelector('.home-route-primary-cta');
            if (!hero || !features || !primaryCta) return null;

            const shell = createAppShellFrame({
                screenId: HOME_SCREEN_ID,
                title: getShellScreenCopy(HOME_SCREEN_ID)?.title || 'מסך הבית',
                subtitle: getShellScreenCopy(HOME_SCREEN_ID)?.subtitle || 'דף בית קומפקטי. תפריט, עזרה ורקע נפתחים בשכבה.'
            });
            shell.metrics.hidden = true;
            const bottomSummary = shell.bottom.querySelector('summary');
            if (bottomSummary) bottomSummary.textContent = 'ניווט אחרון';

            const workspace = document.createElement('div');
            workspace.className = 'home-shell-workspace';
            [mobileFeed, hero, features, primaryCta].forEach((node) => {
                if (node) workspace.appendChild(node);
            });
            shell.workspace.appendChild(workspace);

            const screenState = {
                id: HOME_SCREEN_ID,
                mode,
                mounted: true,
                section,
                shell,
                workspace,
                panelOpens: Object.create(null),
                lastOpenedPanel: '',
                lastOpenedPanelTitle: '',
                lastPanelOpenAt: ''
            };

            const headerActions = [
                createActionButton({ label: 'תפריט', icon: '☰', onClick: () => openHomeMenuOverlay(screenState) }),
                createActionButton({ label: 'רקע', icon: 'ℹ', onClick: () => openHomeAboutOverlay(screenState) }),
                createActionButton({ label: 'עזרה', icon: '?', onClick: () => openHomeHelpOverlay(screenState) })
            ];
            headerActions.forEach((btn) => shell.headerActions.appendChild(btn));

            section.prepend(shell.root);
            section.classList.add('shell-screen-active');
            section.setAttribute('data-ui-mode', 'shell');

            renderHomeActionRail(screenState);
            renderHomeFooter(screenState);
            stateByScreen[HOME_SCREEN_ID] = screenState;
            return screenState;
        } catch (error) {
            renderShellFallback(section, HOME_SCREEN_ID, error);
            return null;
        }
    }

    function isHomeShellActive() {
        const screenState = stateByScreen[HOME_SCREEN_ID] || mountHomeShell();
        return Boolean(screenState && screenState.mode === 'shell' && screenState.section?.classList.contains('active'));
    }

    function openHomeMenu() {
        const screenState = stateByScreen[HOME_SCREEN_ID] || mountHomeShell();
        if (!screenState || screenState.mode !== 'shell') return false;
        return openHomeMenuOverlay(screenState);
    }

    function restoreContinuePanel(screenState, panelId) {
        if (!screenState || !panelId) return false;
        const safePanelId = String(panelId || '').trim();
        if (!safePanelId) return false;

        if (screenState.id === VERB_SCREEN_ID) {
            if (safePanelId === 'wizard') {
                openVerbSettingsOverlay(screenState, { entry: true });
                return true;
            }
            if (safePanelId === 'settings') {
                openVerbSettingsOverlay(screenState, { entry: false });
                return true;
            }
            if (safePanelId === 'help') {
                openVerbHelpOverlay(screenState);
                return true;
            }
            if (safePanelId === 'stats') {
                openVerbStatsOverlay(screenState);
                return true;
            }
            if (safePanelId.startsWith('metric:')) {
                const metricId = safePanelId.slice('metric:'.length);
                const metric = createMetricDefinitions(screenState).find((item) => item.id === metricId);
                if (metric) {
                    openMetricOverlay(screenState, metric);
                    return true;
                }
            }
            return false;
        }

        if (screenState.id === HOME_SCREEN_ID) {
            if (safePanelId === 'menu') return openHomeMenuOverlay(screenState);
            if (safePanelId === 'about') {
                openHomeAboutOverlay(screenState);
                return true;
            }
            if (safePanelId === 'help') {
                openHomeHelpOverlay(screenState);
                return true;
            }
            return false;
        }

        return openGenericPanelOverlay(screenState, safePanelId);
    }

    function resumeContinueState() {
        const continueState = readContinueState();
        if (!continueState.screenId) return false;
        if (typeof global.navigateTo !== 'function') {
            global.location.assign(buildUiModeUrl(continueState.screenId, 'shell'));
            return true;
        }

        global.navigateTo(continueState.screenId, { playSound: true, scrollToTop: true });
        if (!continueState.panelId) return true;

        global.setTimeout(() => {
            const screenState = stateByScreen[continueState.screenId] || mountScreenShell(continueState.screenId);
            if (!screenState) return;
            restoreContinuePanel(screenState, continueState.panelId);
        }, 90);
        return true;
    }

    function mountScreenShell(screenId) {
        const safeId = String(screenId || '').trim();
        if (!safeId) return null;
        if (safeId === HOME_SCREEN_ID) return mountHomeShell();
        if (safeId === VERB_SCREEN_ID) return mountVerbUnzipShell();
        return mountGenericShell(safeId);
    }

    function isShellModeScreen(screenId) {
        const safeId = String(screenId || '').trim();
        if (!safeId) return false;
        return getUiMode(safeId) === 'shell' && Boolean(getShellRegistryEntry(safeId) || safeId === VERB_SCREEN_ID || safeId === HOME_SCREEN_ID);
    }

    function mountVerbUnzipShell() {
        const mode = getUiMode(VERB_SCREEN_ID);
        if (mode !== 'shell') return null;

        const section = document.getElementById(VERB_SCREEN_ID);
        if (!section) return null;

        if (stateByScreen[VERB_SCREEN_ID] && stateByScreen[VERB_SCREEN_ID].mounted) {
            return stateByScreen[VERB_SCREEN_ID];
        }

        try {
            const container = section.querySelector('.practice-container');
            const card = section.querySelector('.practice-intro-card');
            const launcher = section.querySelector('[data-feature-launcher]');
            const iframe = section.querySelector('iframe');
            if (!container || !card || !launcher || !iframe) {
                return null;
            }

            const titleEl = card.querySelector('h2');
            const subtitleEl = card.querySelector('p.subtitle');
            const noteEl = subtitleEl ? subtitleEl.nextElementSibling : null;
            const embedTitle = card.querySelector('.feature-launcher-embed-title');

            const helpCopy = {
                title: String(titleEl?.textContent || 'פועל לא מפורט').trim(),
                subtitle: String(subtitleEl?.textContent || 'תרגול עם סביבת עבודה יציבה').replace(/\s+/g, ' ').trim(),
                note: String(noteEl?.textContent || 'פתחו תפריטי עזר בתוך overlay בלבד, בלי להזיז את המסך הראשי.').replace(/\s+/g, ' ').trim()
            };

            const shell = createAppShellFrame({
                screenId: VERB_SCREEN_ID,
                title: getShellScreenCopy(VERB_SCREEN_ID)?.title || 'מרכז כלים',
                subtitle: getShellScreenCopy(VERB_SCREEN_ID)?.subtitle || 'סביבת העבודה נשארת יציבה. הגדרות, עזרה ונתונים נפתחים בשכבה.'
            });

            const launcherHost = document.createElement('div');
            launcherHost.className = 'shell-hidden-host';
            launcherHost.hidden = true;
            launcherHost.setAttribute('aria-hidden', 'true');
            launcherHost.setAttribute('data-shell-launcher-host', '1');
            card.appendChild(launcherHost);
            launcherHost.appendChild(launcher);
            launcher.hidden = true;

            [titleEl, subtitleEl, noteEl, embedTitle].forEach((node) => {
                if (!node) return;
                node.classList.add('shell-inline-hidden');
            });

            card.classList.add('shell-workspace-card');
            iframe.classList.add('unzip-embed-frame');

            const actionPrimary = document.createElement('div');
            actionPrimary.className = 'shell-inline-actions';
            const openSettingsBtn = createActionButton({
                label: 'הגדרות',
                icon: '⚙️',
                className: 'shell-action-settings',
                onClick: () => openVerbSettingsOverlay(screenState, { entry: false })
            });
            const openHelpBtn = createActionButton({
                label: 'עזרה',
                icon: '❔',
                className: 'shell-action-help',
                onClick: () => openVerbHelpOverlay(screenState)
            });
            const openStatsBtn = createActionButton({
                label: 'סטטיסטיקות',
                icon: '📊',
                className: 'shell-action-stats',
                onClick: () => openVerbStatsOverlay(screenState)
            });

            actionPrimary.append(openSettingsBtn, openHelpBtn, openStatsBtn);
            shell.actions.appendChild(actionPrimary);

            const headerActions = [
                createActionButton({ label: 'הגדרות', icon: '⚙️', onClick: () => openVerbSettingsOverlay(screenState, { entry: false }) }),
                createActionButton({ label: 'עזרה', icon: '?', onClick: () => openVerbHelpOverlay(screenState) }),
                createActionButton({ label: 'נתונים', icon: '📈', onClick: () => openVerbStatsOverlay(screenState) })
            ];
            headerActions.forEach((btn) => shell.headerActions.appendChild(btn));

            shell.workspace.appendChild(card);
            container.prepend(shell.root);

            section.classList.add('shell-screen-active');
            section.setAttribute('data-ui-mode', 'shell');

            const screenState = {
                id: VERB_SCREEN_ID,
                mode,
                mounted: true,
                section,
                shell,
                card,
                launcher,
                launcherHost,
                helpCopy,
                launcherEntryCount: section.querySelectorAll('[data-feature-launcher] .feature-launcher-grid .btn').length,
                sessionStarted: readSessionFlag(VERB_SESSION_KEY),
                wizardShown: readSessionFlag(VERB_WIZARD_KEY),
                panelOpens: Object.create(null),
                lastOpenedPanel: '',
                lastOpenedPanelTitle: '',
                lastPanelOpenAt: ''
            };

            renderMetrics(screenState);
            renderHistoryFooter(screenState);

            stateByScreen[VERB_SCREEN_ID] = screenState;
            return screenState;
        } catch (error) {
            renderShellFallback(section, VERB_SCREEN_ID, error);
            return null;
        }
    }

    function notifyTabActivated(tabId) {
        const id = String(tabId || '').trim();
        if (id === HOME_SCREEN_ID) {
            const screenState = stateByScreen[HOME_SCREEN_ID] || mountHomeShell();
            if (!screenState || screenState.mode !== 'shell') return;
            closeInlineFeatureMapIfNeeded();
            renderHomeActionRail(screenState);
            renderHomeFooter(screenState);
            return;
        }

        if (id === VERB_SCREEN_ID) {
            const screenState = stateByScreen[VERB_SCREEN_ID] || mountVerbUnzipShell();
            if (!screenState || screenState.mode !== 'shell') return;

            rememberContinueState(id, {
                screenTitle: getShellScreenCopy(id)?.title || getTabTitle(id)
            });
            renderHistoryFooter(screenState);
            renderMetrics(screenState);

            if (!screenState.wizardShown) {
                screenState.wizardShown = true;
                writeSessionFlag(VERB_WIZARD_KEY, true);
                scheduleEntryOverlay(VERB_SCREEN_ID, () => {
                    if (!global.MetaOverlayProvider || !global.MetaOverlayProvider.isOpen || !global.MetaOverlayProvider.isOpen()) {
                        openVerbSettingsOverlay(screenState, { entry: true });
                    }
                });
            }
            return;
        }

        const registryEntry = getShellRegistryEntry(id);
        if (!registryEntry || registryEntry.adapter !== 'generic' || getUiMode(id) !== 'shell') {
            return;
        }

        const screenState = stateByScreen[id] || mountGenericShell(id);
        if (!screenState || screenState.mode !== 'shell') return;

        rememberContinueState(id, {
            screenTitle: getShellScreenCopy(id)?.title || getTabTitle(id)
        });
        applyScreenHideSelectors(screenState);
        renderGenericActionRail(screenState);
        renderGenericFooter(screenState);
    }

    function bootstrapShellScreens() {
        mountHomeShell();
        mountVerbUnzipShell();
    }

    function hasMountedShellScreens() {
        return Object.values(stateByScreen).some((screenState) => screenState?.mounted);
    }

    function listShellScreenIds() {
        try {
            if (global.MetaShellRegistry && typeof global.MetaShellRegistry.getAll === 'function') {
                return Object.keys(global.MetaShellRegistry.getAll() || {});
            }
        } catch (_error) {
            // noop
        }
        return [HOME_SCREEN_ID, VERB_SCREEN_ID];
    }

    function bootstrap() {
        try {
            ensureOverlayProvider();
        } catch (error) {
            console.warn('Overlay provider not ready yet', error);
        }

        bootstrapShellScreens();
        if (!hasMountedShellScreens() && !listShellScreenIds().some((screenId) => getUiMode(screenId) === 'shell')) return;

        const activeTab = document.querySelector('.tab-btn.active')?.getAttribute('data-tab') || 'home';
        notifyTabActivated(activeTab);
    }

    global.MetaAppShell = Object.freeze({
        bootstrap,
        notifyTabActivated,
        resumeContinueState,
        openHomeMenu,
        isHomeShellActive,
        isShellModeScreen,
        mountHomeShell,
        mountVerbUnzipShell,
        mountScreenShell,
        createAppShellFrame,
        getUiMode
    });
})(typeof window !== 'undefined' ? window : globalThis);
