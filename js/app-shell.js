(function initMetaAppShell(global) {
    'use strict';

    if (!global) return;
    if (global.MetaAppShell && typeof global.MetaAppShell.bootstrap === 'function') return;

    const VERB_SCREEN_ID = 'practice-verb-unzip';
    const VERB_SESSION_KEY = 'verb_unzip_shell_session_started_v1';
    const VERB_WIZARD_KEY = 'verb_unzip_shell_wizard_seen_v1';

    const stateByScreen = Object.create(null);

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>'"]/g, (char) => {
            if (char === '&') return '&amp;';
            if (char === '<') return '&lt;';
            if (char === '>') return '&gt;';
            if (char === '"') return '&quot;';
            return '&#39;';
        });
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

    function recordPanelOpen(screenState, panelId) {
        if (!screenState) return;
        screenState.panelOpens[panelId] = (screenState.panelOpens[panelId] || 0) + 1;
        screenState.lastOpenedPanel = panelId;
        screenState.lastPanelOpenAt = new Date().toISOString();
    }

    function createAppShellFrame(config) {
        const cfg = config && typeof config === 'object' ? config : {};
        const root = document.createElement('section');
        root.className = 'app-shell';
        root.setAttribute('data-app-shell-screen', String(cfg.screenId || 'screen'));

        root.innerHTML = `
            <header class="app-shell-header">
                <div class="app-shell-title-wrap">
                    <p class="app-shell-kicker">LAB SHELL</p>
                    <h2 class="app-shell-title">${escapeHtml(cfg.title || 'Lab')}</h2>
                    <p class="app-shell-subtitle">${escapeHtml(cfg.subtitle || '')}</p>
                </div>
                <div class="app-shell-actions" data-shell-header-actions></div>
            </header>
            <section class="app-shell-metrics" data-shell-metrics aria-label="Metrics strip"></section>
            <div class="lab-container" data-lab-container>
                <div class="lab-container-workspace" data-lab-workspace></div>
                <div class="lab-container-actions" data-lab-actions></div>
                <details class="lab-container-bottom" data-lab-bottom>
                    <summary>Session history</summary>
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
        btn.innerHTML = `${icon ? `<span aria-hidden="true">${escapeHtml(icon)}</span>` : ''}<span>${escapeHtml(label || 'Action')}</span>`;
        if (typeof onClick === 'function') {
            btn.addEventListener('click', onClick);
        }
        return btn;
    }

    function renderShellFallback(sectionEl, screenId, error) {
        if (!sectionEl || sectionEl.querySelector('[data-shell-error-fallback]')) return;

        const fallback = document.createElement('div');
        fallback.className = 'shell-runtime-fallback card';
        fallback.setAttribute('data-shell-error-fallback', '1');
        fallback.innerHTML = `
            <h3>Shell mode failed</h3>
            <p>נסיון ממשק ה־Shell נכשל במסך הזה. אפשר להמשיך מיד ב־Legacy בלי לאבד פונקציונליות.</p>
            <button type="button" class="btn btn-primary" data-shell-switch-legacy>Switch to Legacy</button>
        `;

        const button = fallback.querySelector('[data-shell-switch-legacy]');
        if (button) {
            button.addEventListener('click', () => {
                global.location.assign(buildUiModeUrl(screenId, 'legacy'));
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
                details: 'ב־Shell mode הסברים/הגדרות נפתחים מעל המסך, בלי להאריך את הדף.'
            }
        ];
    }

    function openMetricOverlay(screenState, metric) {
        if (!screenState || !metric) return;
        recordPanelOpen(screenState, `metric:${metric.id}`);
        renderHistoryFooter(screenState);

        const panel = document.createElement('article');
        panel.className = 'shell-overlay-content';
        panel.innerHTML = `
            <p class="shell-overlay-kicker">Metric</p>
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

        recordPanelOpen(screenState, entryMode ? 'wizard' : 'settings');
        renderHistoryFooter(screenState);

        const wrapper = document.createElement('div');
        wrapper.className = 'shell-overlay-content shell-overlay-content-settings';

        const title = document.createElement('p');
        title.className = 'shell-overlay-kicker';
        title.textContent = entryMode ? 'Settings Wizard' : 'Settings';
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
        recordPanelOpen(screenState, 'help');
        renderHistoryFooter(screenState);

        const panel = document.createElement('article');
        panel.className = 'shell-overlay-content';
        panel.innerHTML = `
            <p class="shell-overlay-kicker">Help</p>
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
        recordPanelOpen(screenState, 'stats');
        renderHistoryFooter(screenState);

        const panel = document.createElement('article');
        panel.className = 'shell-overlay-content';
        const lastOpen = screenState.lastPanelOpenAt
            ? new Date(screenState.lastPanelOpenAt).toLocaleString('he-IL')
            : '—';
        panel.innerHTML = `
            <p class="shell-overlay-kicker">Session Stats</p>
            <ul class="shell-stats-list">
                <li><strong>UI mode:</strong> ${escapeHtml(screenState.mode)}</li>
                <li><strong>Session started:</strong> ${screenState.sessionStarted ? 'כן' : 'לא'}</li>
                <li><strong>Last panel:</strong> ${escapeHtml(screenState.lastOpenedPanel || '—')}</li>
                <li><strong>Last opened:</strong> ${escapeHtml(lastOpen)}</li>
                <li><strong>Opens:</strong> settings ${screenState.panelOpens.settings || 0} | help ${screenState.panelOpens.help || 0} | stats ${screenState.panelOpens.stats || 0}</li>
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
            <p><strong>Last panel:</strong> ${escapeHtml(screenState.lastOpenedPanel || '—')}</p>
            <p><strong>Opened at:</strong> ${escapeHtml(lastOpen)}</p>
            <p><strong>Wizard shown:</strong> ${screenState.wizardShown ? 'כן' : 'לא'}</p>
        `;
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
                title: 'פועל לא מפורט (Unzip)',
                subtitle: 'Primary workspace stays visible. Settings/help/stats open in overlay.'
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
                createActionButton({ label: 'Settings', icon: '⚙️', onClick: () => openVerbSettingsOverlay(screenState, { entry: false }) }),
                createActionButton({ label: 'Help', icon: '?', onClick: () => openVerbHelpOverlay(screenState) }),
                createActionButton({ label: 'Stats', icon: '📈', onClick: () => openVerbStatsOverlay(screenState) }),
                createActionButton({
                    label: 'Legacy',
                    icon: '↩',
                    className: 'shell-action-legacy',
                    onClick: () => global.location.assign(buildUiModeUrl(VERB_SCREEN_ID, 'legacy'))
                })
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
        if (id !== VERB_SCREEN_ID) return;

        const screenState = stateByScreen[VERB_SCREEN_ID] || mountVerbUnzipShell();
        if (!screenState || screenState.mode !== 'shell') return;

        renderHistoryFooter(screenState);
        renderMetrics(screenState);

        if (!screenState.wizardShown) {
            screenState.wizardShown = true;
            writeSessionFlag(VERB_WIZARD_KEY, true);
            if (!global.MetaOverlayProvider || !global.MetaOverlayProvider.isOpen || !global.MetaOverlayProvider.isOpen()) {
                openVerbSettingsOverlay(screenState, { entry: true });
            }
        }
    }

    function bootstrap() {
        try {
            ensureOverlayProvider();
        } catch (error) {
            console.warn('Overlay provider not ready yet', error);
        }

        const shellState = mountVerbUnzipShell();
        if (!shellState) return;

        const activeTab = document.querySelector('.tab-btn.active')?.getAttribute('data-tab') || 'home';
        notifyTabActivated(activeTab);
    }

    global.MetaAppShell = Object.freeze({
        bootstrap,
        notifyTabActivated,
        mountVerbUnzipShell,
        createAppShellFrame,
        getUiMode
    });
})(typeof window !== 'undefined' ? window : globalThis);
