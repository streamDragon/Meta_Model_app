(function attachScenarioTrainerAppV2() {
    const root = typeof globalThis !== 'undefined' ? globalThis : window;
    const trainerContract = typeof root.getMetaTrainerPlatformContract === 'function'
        ? root.getMetaTrainerPlatformContract('scenario-trainer')
        : null;
    const mountId = trainerContract?.wrapper?.mountId || 'scenario-trainer-root';
    const mount = document.getElementById(mountId);
    if (!mount || !trainerContract) return;

    const RUN_SIZE = 3;
    const OVERLAY_FADE_MS = 400;
    const THOUGHT_DELAY_MS = 500;
    const RESOLVE_DELAY_MS = 1100;
    const OPTION_IDS = Object.freeze(['A', 'B', 'C', 'D']);
    const OPTION_HINTS = Object.freeze({
        defensive_attack: 'מחזיר את השיחה למאבק',
        minimize: 'מקטין את החוויה שמולך',
        shutdown: 'סוגר את המגע ברגע הקריטי',
        false_fix: 'מרגיע לרגע בלי לפתוח בהירות',
        pseudo_apology: 'נשמע כמו תיקון בלי תיקון',
        stonewall: 'עוצר את הקשר והבירור',
        blame_reversal: 'מעביר את הדיון לאשמה',
        vague_yes: 'נשמע מסכים בלי כיוון',
        fake_agreement: 'כן בלי לפרק מה צריך לקרות',
        passive_aggressive: 'מוסיף עקיצה במקום בהירות',
        panic: 'מגיב מהלחץ ולא מהמשימה',
        blame: 'צובע את האדם כבעיה',
        collapse: 'משאיר את הצד השני מוצף',
        rage: 'שופך תסכול על המערכת',
        magical_thinking: 'מקווה שזה יסתדר מעצמו',
        random_guessing: 'קופץ לפעולה בלי אבחון',
        self_attack: 'הופך קושי להלקאה עצמית',
        overconfidence: 'בטוח מדי בלי בדיקה',
        avoidance: 'דוחה את הבעיה במקום לארגן אותה',
        panic_reinstall: 'קופץ לפתרון כבד מדי',
        criticism: 'פוגע בערך של האדם',
        comparison: 'מעלה בושה ותחרות',
        shame: 'מקטין ומכווץ',
        over_helping: 'לוקח את המשימה במקום לבנות יכולת',
        impatient_control: 'לוחץ בלי לפרק את המשימה',
        rescue: 'לוקח את המשימה מהצד השני',
        dismissive_reassurance: 'מרגיע בלי להתמודד',
        global_pressure: 'מגדיל מתח בלי יעד ברור',
        control: 'שולט בלי לייצר בהירות',
        false_confidence: 'קופץ למסקנה מוקדמת',
        clarify_process: 'מחזיר את השיחה למה שקורה בפועל',
        contain_and_clarify: 'מחזיק רגש ואז מדייק',
        contain_and_sequence: 'בונה סדר שאפשר לבצע',
        validate_and_repair: 'מכיר בפגיעה ופותח תיקון',
        validate_and_specify: 'מתקף ואז שואל מדויק',
        clarify_deliverable: 'מגדיר תוצר במקום ניחוש',
        clarify_format_and_ownership: 'מגדיר פורמט ובעלות',
        define_done_and_owner: 'מבהיר מה נחשב גמור',
        organize_requirements: 'מסדר דרישות במקום עומס',
        reduce_ambiguity: 'מוריד עמימות מהשלב הבא',
        clarify_required_fields: 'מפריד בין חובה ללא ברור',
        diagnose_then_act: 'בודק לפני שנוגעים במערכת',
        smallest_safe_step: 'מתחיל מצעד בטוח וקטן',
        diagnose_scope_first: 'ממפה היקף לפני פתרון',
        default_red: 'מגיב מתוך לחץ',
        default_green: 'פותח בהירות שאפשר לבדוק'
    });

    const state = {
        loading: true,
        loadError: '',
        data: { domains: [], difficulties: [], scenarios: [] },
        queue: [],
        index: 0,
        score: 0,
        selectedOptionId: '',
        phase: 'idle',
        overlayState: 'visible',
        appHeight: 0
    };

    const timers = {
        overlay: 0,
        thought: 0,
        resolve: 0
    };

    mount.addEventListener('click', handleClick);
    root.addEventListener('resize', handleResize);
    root.visualViewport?.addEventListener('resize', handleResize);

    init().catch((error) => {
        state.loading = false;
        state.loadError = error?.message || 'לא הצלחנו לטעון את הסימולטור.';
        render();
    });

    async function init() {
        updateLayoutMetrics(false);
        render();
        state.data = await loadData();
        state.loading = false;
        state.queue = buildQueue(state.data.scenarios);
        if (!state.queue.length) {
            state.loadError = 'לא נמצאו סצנות להצגה.';
        }
        render();
    }

    function handleResize() {
        updateLayoutMetrics(true);
    }

    function updateLayoutMetrics(shouldRender) {
        const topOffset = Math.max(0, mount.getBoundingClientRect().top);
        const nextHeight = Math.max(420, Math.floor(root.innerHeight - topOffset - 12));
        if (nextHeight === state.appHeight) return;
        state.appHeight = nextHeight;
        if (shouldRender) render();
    }

    function clearTimers() {
        clearTimeout(timers.overlay);
        clearTimeout(timers.thought);
        clearTimeout(timers.resolve);
        timers.overlay = 0;
        timers.thought = 0;
        timers.resolve = 0;
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function normalizeText(value, fallback = '') {
        const raw = String(value == null ? fallback : value);
        const compact = raw.replace(/\s+/g, ' ').trim();
        return compact || String(fallback || '').trim();
    }

    function normalizeScenarioOption(raw, fallbackId, isGreen) {
        const line = normalizeText(
            raw?.speakerLine || raw?.text || raw?.say,
            isGreen ? 'בואו נבדוק מה קורה כאן בפועל.' : 'אני מגיב מתוך לחץ.'
        );
        const feedback = normalizeText(
            isGreen ? (raw?.whyItWorks || raw?.feedback) : (raw?.whyItHurts || raw?.feedback),
            isGreen
                ? 'התגובה הזו מחזירה את השיחה למה שקורה בפועל.'
                : 'התגובה הזו מחליפה בירור ממשי בלחץ או סתימה.'
        );
        return {
            ...raw,
            id: normalizeText(raw?.id, fallbackId),
            tone: normalizeText(raw?.tone, isGreen ? 'default_green' : 'default_red'),
            speakerLine: line,
            choiceHint: normalizeText(
                raw?.choiceHint,
                OPTION_HINTS[normalizeText(raw?.tone, isGreen ? 'default_green' : 'default_red')] || OPTION_HINTS[isGreen ? 'default_green' : 'default_red']
            ),
            feedback,
            whyItHurts: normalizeText(raw?.whyItHurts, isGreen ? '' : feedback),
            whyItWorks: normalizeText(raw?.whyItWorks, isGreen ? feedback : ''),
            likelyOtherReply: normalizeText(
                raw?.likelyOtherReply || raw?.counterReply,
                isGreen ? 'אוקיי, עכשיו אפשר לראות מה בדיוק קורה.' : 'רגע, זה עדיין לא עוזר לי להבין מה קורה.'
            ),
            feedbackHeadline: normalizeText(raw?.feedbackHeadline, ''),
            emotionalImpact: normalizeText(raw?.emotionalImpact, ''),
            processImpact: normalizeText(raw?.processImpact, ''),
            score: isGreen ? 1 : 0
        };
    }

    function normalizeScenarioResponseSet(rawScenario) {
        const responseSet = rawScenario?.responseSet && typeof rawScenario.responseSet === 'object' ? rawScenario.responseSet : {};
        const legacyOptions = Array.isArray(rawScenario?.options) ? rawScenario.options : [];
        const legacyRed = legacyOptions.filter((item) => Number(item?.score) !== 1).slice(0, 4);
        const legacyGreen = legacyOptions.find((item) => Number(item?.score) === 1);
        const redPool = Array.isArray(responseSet.red) && responseSet.red.length ? responseSet.red : legacyRed;
        const red = redPool
            .slice(0, 4)
            .map((item, index) => normalizeScenarioOption(item, OPTION_IDS[index] || String(index + 1), false));
        const green = normalizeScenarioOption(
            responseSet.green || legacyGreen || { speakerLine: rawScenario?.greenSentence },
            'E',
            true
        );
        return { red, green };
    }

    function normalizeScenario(rawScenario, index, domainLabels) {
        const responseSet = normalizeScenarioResponseSet(rawScenario);
        return {
            ...rawScenario,
            scenarioId: normalizeText(rawScenario?.scenarioId || rawScenario?.id, `scenario_${index + 1}`),
            title: normalizeText(rawScenario?.sceneTitle || rawScenario?.title, `סצנה ${index + 1}`),
            sceneTitle: normalizeText(rawScenario?.sceneTitle || rawScenario?.title, `סצנה ${index + 1}`),
            domain: normalizeText(rawScenario?.domain, 'general'),
            domainLabel: normalizeText(rawScenario?.domainLabel, domainLabels[normalizeText(rawScenario?.domain, 'general')] || 'כללי'),
            difficulty: normalizeText(rawScenario?.difficulty, 'medium'),
            role: {
                player: normalizeText(rawScenario?.role?.player, 'את/ה'),
                other: normalizeText(rawScenario?.role?.other, 'הצד השני')
            },
            openingLine: normalizeText(rawScenario?.openingLine || rawScenario?.story?.[1], ''),
            responseSet
        };
    }

    async function loadData() {
        const response = await fetch('data/scenario-trainer-scenarios.json', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const domains = Array.isArray(data?.domains) ? data.domains : [];
        const domainLabels = domains.reduce((acc, item) => {
            const id = normalizeText(item?.id);
            if (id) acc[id] = normalizeText(item?.label, id);
            return acc;
        }, {});
        return {
            domains,
            difficulties: Array.isArray(data?.difficulties) ? data.difficulties : [],
            scenarios: Array.isArray(data?.scenarios)
                ? data.scenarios.map((item, index) => normalizeScenario(item, index, domainLabels))
                : []
        };
    }

    function shuffle(list) {
        const next = list.slice();
        for (let index = next.length - 1; index > 0; index -= 1) {
            const pick = Math.floor(Math.random() * (index + 1));
            const current = next[index];
            next[index] = next[pick];
            next[pick] = current;
        }
        return next;
    }

    function buildQueue(scenarios) {
        return shuffle(Array.isArray(scenarios) ? scenarios : []).slice(0, RUN_SIZE);
    }

    function getCurrentScene() {
        return state.queue[state.index] || null;
    }

    function buildSceneOptions(scene) {
        const red = Array.isArray(scene?.responseSet?.red) ? scene.responseSet.red : [];
        const green = scene?.responseSet?.green || null;
        const ordered = [red[0], green, red[1], red[2], red[3]].filter(Boolean);
        const seen = new Set();
        const unique = [];
        ordered.forEach((option) => {
            if (!option || seen.has(option.id)) return;
            seen.add(option.id);
            unique.push(option);
        });
        return unique.slice(0, 3);
    }

    function getCurrentOptions() {
        return buildSceneOptions(getCurrentScene());
    }

    function getSelectedOption() {
        return getCurrentOptions().find((option) => option.id === state.selectedOptionId) || null;
    }

    function isGreenOption(option) {
        return Number(option?.score) === 1;
    }

    function getOptionToneGroup(tone, isGreen) {
        const normalizedTone = normalizeText(tone, isGreen ? 'default_green' : 'default_red');
        if (isGreen) {
            if (['clarify_process', 'contain_and_clarify', 'validate_and_specify'].includes(normalizedTone)) return 'clarify';
            if (['contain_and_sequence', 'define_done_and_owner', 'clarify_format_and_ownership'].includes(normalizedTone)) return 'sequence';
            if (['validate_and_repair'].includes(normalizedTone)) return 'repair';
            if (['clarify_deliverable', 'organize_requirements', 'reduce_ambiguity', 'clarify_required_fields'].includes(normalizedTone)) return 'organize';
            if (['diagnose_then_act', 'smallest_safe_step', 'diagnose_scope_first'].includes(normalizedTone)) return 'diagnose';
            return 'clarify';
        }
        if (['defensive_attack', 'blame_reversal', 'blame', 'criticism', 'comparison', 'shame'].includes(normalizedTone)) return 'blame';
        if (['shutdown', 'stonewall', 'collapse'].includes(normalizedTone)) return 'shutdown';
        if (['impatient_control', 'control', 'global_pressure', 'panic', 'panic_fix', 'panic_reinstall'].includes(normalizedTone)) return 'control';
        if (['over_helping', 'rescue', 'takeover'].includes(normalizedTone)) return 'rescue';
        if (['minimize', 'dismissive_reassurance', 'false_fix', 'pseudo_apology', 'pseudo_solution', 'magical_thinking'].includes(normalizedTone)) return 'dismiss';
        if (['vague_yes', 'fake_agreement', 'passive_aggressive', 'false_confidence', 'random_guessing', 'rage', 'avoidance', 'overconfidence', 'self_attack'].includes(normalizedTone)) return 'blur';
        return 'default';
    }

    function getOptionOutcomeKind(option) {
        if (isGreenOption(option)) return 'green';
        const group = getOptionToneGroup(option?.tone, false);
        if (['control', 'rescue', 'dismiss', 'blur'].includes(group)) return 'amber';
        return 'red';
    }

    function getOptionTag(option) {
        if (isGreenOption(option)) return 'מטה-מודל ✓';
        const group = getOptionToneGroup(option?.tone, false);
        return {
            blame: 'מתווכח',
            shutdown: 'סוגר',
            control: 'לוחץ',
            rescue: 'מציל מהר',
            dismiss: 'מבטל',
            blur: 'עמום',
            default: 'לא מדויק'
        }[group] || 'לא מדויק';
    }

    function truncateText(text, maxLength) {
        const normalized = normalizeText(text);
        if (!normalized || normalized.length <= maxLength) return normalized;
        return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
    }

    function firstSentence(text, fallback = '') {
        const normalized = normalizeText(text, fallback);
        if (!normalized) return '';
        const match = normalized.match(/^(.+?[.!?])(?:\s|$)/);
        return truncateText(match ? match[1] : normalized, 120);
    }

    function getThoughtText(option) {
        return firstSentence(option?.emotionalImpact, option?.choiceHint || option?.feedbackHeadline || option?.feedback || '');
    }

    function getReplyText(option) {
        return truncateText(option?.likelyOtherReply || '', 130);
    }

    function getResultText(option) {
        if (isGreenOption(option)) {
            return firstSentence(option?.whyItWorks, option?.feedbackHeadline || option?.choiceHint || option?.feedback || '');
        }
        return firstSentence(option?.whyItHurts, option?.feedbackHeadline || option?.choiceHint || option?.feedback || '');
    }

    function getScoreLabel(score) {
        if (score <= 0) return 'נסה שוב — יש מה ללמוד';
        if (score === 1) return 'התחלה טובה — המשך להתאמן';
        if (score === 2) return 'לא רע! כמעט הגעת';
        return 'מצוין! יש לך עין מטה-מודל';
    }

    function getProgressState(index) {
        if (state.phase === 'complete') return 'done';
        if (index < state.index) return 'done';
        if (index === state.index) return 'active';
        return 'pending';
    }

    function getRoleEmoji(roleName, side) {
        const text = normalizeText(roleName);
        if (text.includes('נציג')) return '🧑‍💼';
        if (text.includes('מאמן')) return '🧑‍🏫';
        if (text.includes('לקוחה')) return '👩';
        if (text.includes('לקוח')) return '🙋';
        if (text.includes('בת זוג')) return '👩';
        if (text.includes('בן זוג')) return '👨';
        if (text.includes('הורה')) return '🧑';
        if (text.includes('ילדה')) return '👧';
        if (text.includes('ילד')) return '🧒';
        if (text.includes('מנהל')) return '👨‍💼';
        if (text.includes('מנהלת')) return '👩‍💼';
        return side === 'other' ? '🙂' : '🧭';
    }

    function dismissOverlay() {
        if (state.overlayState !== 'visible' || state.loading || state.loadError || !state.queue.length) return;
        state.overlayState = 'closing';
        render();
        timers.overlay = root.setTimeout(() => {
            state.overlayState = 'hidden';
            render();
            root.scrollTo?.({ top: 0, behavior: 'auto' });
        }, OVERLAY_FADE_MS);
    }

    function selectOption(optionId) {
        if (state.phase !== 'idle') return;
        const option = getCurrentOptions().find((item) => item.id === optionId);
        if (!option) return;
        clearTimeout(timers.thought);
        clearTimeout(timers.resolve);
        state.selectedOptionId = option.id;
        state.phase = 'agent';
        render();
        timers.thought = root.setTimeout(() => {
            state.phase = 'thought';
            render();
        }, THOUGHT_DELAY_MS);
        timers.resolve = root.setTimeout(() => {
            state.phase = 'resolved';
            if (isGreenOption(option)) state.score += 1;
            render();
        }, RESOLVE_DELAY_MS);
    }

    function goToNextScene() {
        if (state.phase !== 'resolved') return;
        clearTimeout(timers.thought);
        clearTimeout(timers.resolve);
        if (state.index >= state.queue.length - 1) {
            state.phase = 'complete';
            render();
            return;
        }
        state.index += 1;
        state.selectedOptionId = '';
        state.phase = 'idle';
        render();
        root.scrollTo?.({ top: 0, behavior: 'auto' });
    }

    function restartRun() {
        clearTimers();
        state.loadError = '';
        state.queue = buildQueue(state.data.scenarios);
        state.index = 0;
        state.score = 0;
        state.selectedOptionId = '';
        state.phase = 'idle';
        if (!state.queue.length) {
            state.loadError = 'לא נמצאו סצנות להצגה.';
        }
        render();
        root.scrollTo?.({ top: 0, behavior: 'auto' });
    }

    async function retryLoad() {
        clearTimers();
        state.loading = true;
        state.loadError = '';
        state.queue = [];
        state.index = 0;
        state.score = 0;
        state.selectedOptionId = '';
        state.phase = 'idle';
        render();
        try {
            state.data = await loadData();
            state.loading = false;
            state.queue = buildQueue(state.data.scenarios);
            if (!state.queue.length) {
                state.loadError = 'לא נמצאו סצנות להצגה.';
            }
        } catch (error) {
            state.loading = false;
            state.loadError = error?.message || 'לא הצלחנו לטעון את הסימולטור.';
        }
        render();
    }

    function handleClick(event) {
        const button = event.target.closest('button');
        if (!button) return;
        const action = button.getAttribute('data-scenario-action');
        if (!action) return;
        if (action === 'dismiss-overlay') return void dismissOverlay();
        if (action === 'pick-option') return void selectOption(button.getAttribute('data-option-id'));
        if (action === 'next-scene') return void goToNextScene();
        if (action === 'restart-run') return void restartRun();
        if (action === 'retry-load') return void retryLoad();
    }

    function renderStatusCard(title, body, actionMarkup = '') {
        return `
          <div class="scenario-status-card">
            <p class="scenario-status-kicker">${escapeHtml(title)}</p>
            <p class="scenario-status-body">${escapeHtml(body)}</p>
            ${actionMarkup}
          </div>
        `;
    }

    function renderProgressDots() {
        return `
          <div class="scenario-progress-dots" aria-label="התקדמות בסצנות">
            ${state.queue.map((_, index) => {
                const progressState = getProgressState(index);
                return `<span class="scenario-progress-dot is-${escapeHtml(progressState)}" aria-hidden="true"></span>`;
            }).join('')}
          </div>
        `;
    }

    function renderAvatar(roleName, side) {
        return `
          <div class="scenario-avatar scenario-avatar-${escapeHtml(side)}">
            <span class="scenario-avatar-emoji" aria-hidden="true">${escapeHtml(getRoleEmoji(roleName, side))}</span>
            <span class="scenario-avatar-name">${escapeHtml(roleName)}</span>
          </div>
        `;
    }

    function renderBubble(side, kind, speaker, text, extraClass = '') {
        if (!text) return '';
        const speakerMarkup = speaker ? `<span class="scenario-bubble-speaker">${escapeHtml(speaker)}</span>` : '';
        const prefix = kind === 'thought' ? '<span class="scenario-thought-prefix">💭</span>' : '';
        return `
          <article class="scenario-bubble-row is-${escapeHtml(side)} ${escapeHtml(extraClass)}">
            <div class="scenario-bubble is-${escapeHtml(kind)}">
              ${speakerMarkup}
              <p>${prefix}${escapeHtml(text)}</p>
            </div>
          </article>
        `;
    }

    function renderChatContent() {
        const scene = getCurrentScene();
        const selectedOption = getSelectedOption();
        if (state.loading) {
            return renderStatusCard('טוען', 'עוד רגע הסצנה הראשונה תופיע כאן.');
        }
        if (state.loadError) {
            return renderStatusCard(
                'שגיאה',
                state.loadError,
                '<button type="button" class="scenario-inline-btn" data-scenario-action="retry-load">נסה שוב</button>'
            );
        }
        if (!scene) {
            return renderStatusCard(
                'אין סצנות',
                'לא הצלחנו לבנות סבב חדש כרגע.',
                '<button type="button" class="scenario-inline-btn" data-scenario-action="restart-run">בנה סבב חדש</button>'
            );
        }
        if (state.phase === 'complete') {
            return `
              <section class="scenario-score-card" aria-live="polite">
                <p class="scenario-score-kicker">סיכום האימון</p>
                <p class="scenario-score-value">${escapeHtml(String(state.score))}/${escapeHtml(String(state.queue.length || RUN_SIZE))}</p>
                <p class="scenario-score-label">${escapeHtml(getScoreLabel(state.score))}</p>
                <button type="button" class="scenario-restart-btn" data-scenario-action="restart-run">↺ חזור להתחלה</button>
              </section>
            `;
        }

        return `
          <div class="scenario-chat-scene">
            <div class="scenario-avatars-row">
              ${renderAvatar(scene.role.other, 'other')}
              ${renderAvatar(scene.role.player, 'player')}
            </div>
            <div class="scenario-chat-stack">
              ${renderBubble('other', 'opening', scene.role.other, scene.openingLine, 'is-pop')}
              ${selectedOption ? renderBubble('player', 'choice', scene.role.player, selectedOption.speakerLine, 'is-pop') : ''}
              ${selectedOption && (state.phase === 'thought' || state.phase === 'resolved')
                  ? renderBubble('other', 'thought', '', getThoughtText(selectedOption), 'is-pop')
                  : ''}
              ${selectedOption && state.phase === 'resolved'
                  ? renderBubble('other', 'reply', scene.role.other, getReplyText(selectedOption), 'is-pop')
                  : ''}
            </div>
            ${selectedOption && state.phase === 'resolved' ? `
              <div class="scenario-result-bar is-${escapeHtml(getOptionOutcomeKind(selectedOption))}" aria-live="polite">
                ${escapeHtml(getResultText(selectedOption))}
              </div>
            ` : ''}
          </div>
        `;
    }

    function renderOptions() {
        const scene = getCurrentScene();
        const options = getCurrentOptions();
        if (state.loading) {
            return '<div class="scenario-dock-placeholder">טוען את הסצנות…</div>';
        }
        if (state.loadError) {
            return '<div class="scenario-dock-placeholder">ברגע שהטעינה תצליח, התגובות יופיעו כאן.</div>';
        }
        if (!scene) {
            return '<div class="scenario-dock-placeholder">אין כרגע תגובות להצגה.</div>';
        }
        if (state.phase === 'complete') {
            return `
              <div class="scenario-complete-actions">
                <p class="scenario-options-label">הסבב הסתיים.</p>
                <button type="button" class="scenario-primary-btn" data-scenario-action="restart-run">↺ חזור להתחלה</button>
              </div>
            `;
        }
        if (state.phase === 'resolved') {
            const isLastScene = state.index >= state.queue.length - 1;
            return `
              <div class="scenario-next-actions">
                <p class="scenario-options-label">${escapeHtml(isLastScene ? 'הסצנה האחרונה נסגרה.' : 'אפשר לעבור לסצנה הבאה.')}</p>
                <button type="button" class="scenario-primary-btn" data-scenario-action="next-scene">${escapeHtml(isLastScene ? 'לסיכום ←' : 'סצינה הבאה ←')}</button>
              </div>
            `;
        }

        return `
          <div class="scenario-options-panel">
            <p class="scenario-options-label">בחרו את התגובה שלכם:</p>
            <div class="scenario-option-list">
              ${options.map((option) => {
                  const outcomeKind = getOptionOutcomeKind(option);
                  const isSelected = state.selectedOptionId === option.id;
                  return `
                    <button
                      type="button"
                      class="scenario-option-btn is-${escapeHtml(outcomeKind)}${isSelected ? ' is-selected' : ''}"
                      data-scenario-action="pick-option"
                      data-option-id="${escapeHtml(option.id)}"
                      ${state.phase !== 'idle' ? 'disabled' : ''}
                    >
                      <span class="scenario-option-tag is-${escapeHtml(outcomeKind)}">${escapeHtml(getOptionTag(option))}</span>
                      <span class="scenario-option-text">"${escapeHtml(option.speakerLine)}"</span>
                    </button>
                  `;
              }).join('')}
            </div>
          </div>
        `;
    }

    function renderSceneStrip() {
        const scene = getCurrentScene();
        const title = state.phase === 'complete' ? 'סיכום האימון' : normalizeText(scene?.sceneTitle || scene?.title, 'טוען סצנה');
        return `
          <div class="scenario-scene-strip">
            <span class="scenario-scene-label">סצינה</span>
            <strong>${escapeHtml(title)}</strong>
          </div>
        `;
    }

    function renderOverlay() {
        const disabled = state.loading || !!state.loadError || !state.queue.length;
        const helperText = state.loading
            ? 'טוען את הסצנות...'
            : (state.loadError ? 'הטעינה לא הושלמה עדיין.' : 'שלוש סצנות מוכנות לתרגול.');
        return `
          <section class="scenario-entry-overlay${state.overlayState === 'closing' ? ' is-closing' : ''}" aria-hidden="${state.overlayState === 'hidden' ? 'true' : 'false'}">
            <div class="scenario-entry-panel">
              <span class="scenario-entry-badge">סימולטור סצינות · מטה מודל</span>
              <h1 class="scenario-entry-title">לפני שמדברים —<br>מבינים מה קורה</h1>
              <p class="scenario-entry-subtitle">משפטים נשמעים פשוטים, אבל הם מגיעים ממקומות שונים. כאן מתרגלים לזהות מאיפה הם באים לפני שבוחרים תגובה.</p>
              <div class="scenario-entry-pillars" aria-label="שלוש שכבות">
                <article class="scenario-entry-pillar is-blue">
                  <span class="scenario-entry-pillar-icon" aria-hidden="true">🌍</span>
                  <strong>חוץ</strong>
                  <span>מה קרה בפועל</span>
                </article>
                <article class="scenario-entry-pillar is-orange">
                  <span class="scenario-entry-pillar-icon" aria-hidden="true">🧠</span>
                  <strong>פנים</strong>
                  <span>הסיפור הפנימי</span>
                </article>
                <article class="scenario-entry-pillar is-purple">
                  <span class="scenario-entry-pillar-icon" aria-hidden="true">🔗</span>
                  <strong>פונקציה</strong>
                  <span>מה המשפט עושה</span>
                </article>
              </div>
              <div class="scenario-entry-flow" aria-label="זרימת התרגול">
                <span>משפט פותח</span>
                <span class="scenario-entry-arrow" aria-hidden="true">←</span>
                <span>בוחרים</span>
                <span class="scenario-entry-arrow" aria-hidden="true">←</span>
                <span>רואים תוצאה</span>
              </div>
              <button
                type="button"
                class="scenario-entry-cta"
                data-scenario-action="dismiss-overlay"
                ${disabled ? 'disabled' : ''}
              >
                אני מוכן — בוא נתחיל
              </button>
              <p class="scenario-entry-helper">${escapeHtml(helperText)}</p>
            </div>
          </section>
        `;
    }

    function render() {
        mount.innerHTML = `
          <div
            id="scenario-trainer"
            class="scenario-platform-root${state.overlayState !== 'hidden' ? ' is-locked' : ''}"
            dir="rtl"
            lang="he"
            style="--scenario-app-height:${escapeHtml(String(state.appHeight || 420))}px"
          >
            <div class="scenario-simulator-shell" aria-hidden="${state.overlayState !== 'hidden' ? 'true' : 'false'}">
              <header class="scenario-sim-topbar">
                <h2 class="scenario-sim-title">סימולטור סצינות</h2>
                ${renderProgressDots()}
              </header>
              ${renderSceneStrip()}
              <main class="scenario-chat-area">
                ${renderChatContent()}
              </main>
              <footer class="scenario-options-dock">
                ${renderOptions()}
              </footer>
            </div>
            ${state.overlayState === 'hidden' ? '' : renderOverlay()}
          </div>
        `;
    }
})();
