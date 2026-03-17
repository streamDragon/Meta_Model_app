(function attachPrismLab(global, document) {
    'use strict';

    if (!global || !document) return;

    const ROOT_SELECTOR = '[data-prism-necessity-app]';
    const STYLE_PATH = 'css/prism-necessity.css';
    const DATA_SOURCES = Object.freeze({
        ui: 'data/prism-lab-ui.he.json',
        categories: 'data/prism-lab-categories.he.json',
        extraExercises: 'data/prism-lab-extra-exercises.he.json',
        glossary: 'data/meta_model_glossary_blueprint.he.json',
        legacyExercises: 'data/prism-necessity.json'
    });
    const LEVEL_SOURCE_MAP = Object.freeze({
        E: 'environment',
        B: 'behavior',
        C: 'capability_strategy',
        V: 'beliefs_values',
        I: 'identity',
        S: 'belonging_mission'
    });
    const LEVEL_ORDER = Object.freeze(['environment', 'behavior', 'capability_strategy', 'beliefs_values', 'identity', 'belonging_mission']);
    const LEVEL_LABELS = Object.freeze({
        environment: 'סביבה',
        behavior: 'התנהגות',
        capability_strategy: 'יכולת / אסטרטגיה',
        beliefs_values: 'אמונות / ערכים',
        identity: 'זהות',
        belonging_mission: 'שייכות / ייעוד'
    });
    const LEGACY_CATEGORY_MAP = Object.freeze({
        comparison: 'comparative_deletion',
        time_place: 'time_space_predicate',
        modal_operator: 'modal_operators_action',
        cause_effect: 'cause_effect',
        complex_equivalence: 'complex_equivalence',
        mind_reading: 'mind_reading',
        universal_quantifier: 'universal_quantifier',
        nominalization: 'nominalization',
        unspecified_verb: 'unspecified_verb',
        lost_performative: 'lost_performative'
    });

    let payloadPromise = null;
    let payloadCache = null;

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function normalizeText(value) {
        return String(value ?? '').replace(/\s+/g, ' ').trim();
    }

    function uniqueList(items) {
        return Array.from(new Set((items || []).map((item) => normalizeText(item)).filter(Boolean)));
    }

    function resolveAssetPath(filePath) {
        if (typeof global.__withAssetVersion === 'function') {
            try {
                return global.__withAssetVersion(filePath);
            } catch (_error) {
                return filePath;
            }
        }
        const version = String(global.__META_MODEL_ASSET_V__ || global.__PRISM_LAB_ASSET_V__ || '').trim();
        if (!version) return filePath;
        return `${filePath}${filePath.includes('?') ? '&' : '?'}v=${encodeURIComponent(version)}`;
    }

    function ensureStylesheet() {
        if (document.querySelector('link[data-prism-necessity-style="true"]')) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = resolveAssetPath(STYLE_PATH);
        link.setAttribute('data-prism-necessity-style', 'true');
        document.head.appendChild(link);
    }

    async function fetchJson(sourcePath) {
        const response = await fetch(resolveAssetPath(sourcePath), { cache: 'force-cache' });
        if (!response.ok) {
            throw new Error(`Failed to load ${sourcePath}: HTTP ${response.status}`);
        }
        return response.json();
    }

    function buildDiltsMap(glossaryItem) {
        const entries = Array.isArray(glossaryItem?.dilts_levels) ? glossaryItem.dilts_levels : [];
        return LEVEL_ORDER.reduce((acc, levelId) => {
            const sourceCode = Object.keys(LEVEL_SOURCE_MAP).find((key) => LEVEL_SOURCE_MAP[key] === levelId) || '';
            const sourceEntry = entries.find((entry) => normalizeText(entry?.level).toUpperCase() === sourceCode);
            acc[levelId] = {
                what_to_recover: normalizeText(sourceEntry?.focus) || LEVEL_LABELS[levelId],
                guiding_frame: uniqueList(sourceEntry?.interventions || [])[0] || ''
            };
            return acc;
        }, {});
    }

    function mergeCategory(config, glossaryItem) {
        return {
            id: config.id,
            source_id: config.source_id,
            family: config.family,
            label_he: config.label_he,
            label_en: config.label_en,
            short_subtitle_he: config.short_subtitle_he,
            category_tag_he: config.category_tag_he,
            difficulty_he: config.difficulty_he,
            conceptual_focus_he: config.conceptual_focus_he,
            core_missing_information_he: config.core_missing_information_he,
            target_of_recovery_he: Array.isArray(config.target_of_recovery_he) ? config.target_of_recovery_he : [],
            surface_risk_he: config.surface_risk_he,
            what_learner_looks_for_he: config.what_learner_looks_for_he,
            deep_note_he: config.deep_note_he,
            therapist_note_he: config.therapist_note_he,
            common_mistake_he: config.common_mistake_he,
            dominant_levels: Array.isArray(config.dominant_levels) ? config.dominant_levels : [],
            aliases: Array.isArray(config.aliases) ? config.aliases : [],
            learning_paths: Array.isArray(config.learning_paths) ? config.learning_paths : [],
            question_goal_he: normalizeText(glossaryItem?.question_goal),
            target_information_he: normalizeText(glossaryItem?.target_information),
            meta_model_questions_he: uniqueList(glossaryItem?.meta_model_questions || []).slice(0, 6),
            question_sets_he: {
                canonical: uniqueList(glossaryItem?.question_sets?.canonical || []).slice(0, 6),
                daily: uniqueList(glossaryItem?.question_sets?.daily || []).slice(0, 4),
                identity: uniqueList(glossaryItem?.question_sets?.identity || []).slice(0, 4)
            },
            sample_sentence_he: normalizeText(glossaryItem?.clinical_story?.client_line || glossaryItem?.story?.client_line),
            turning_point_he: normalizeText(glossaryItem?.clinical_story?.turning_point),
            philosophical_background_he: normalizeText(glossaryItem?.philosophical_background),
            anti_patterns_he: uniqueList(glossaryItem?.anti_patterns || []).slice(0, 4),
            dilts_map_he: buildDiltsMap(glossaryItem)
        };
    }

    function buildLegacyContext(category, sentence) {
        return [
            'הדובר/ת מביא/ה ניסוח שמרגיש לו/ה שלם, אבל הוא כבר דוחס הרבה מתחת לפני השטח.',
            `המשפט במוקד הוא: "${normalizeText(sentence)}"`,
            `${category.label_he}: ${category.core_missing_information_he}`,
            'העבודה כאן היא לשחזר את מה שנמחק, ולא להסתפק במשטח של המשפט.'
        ];
    }

    function normalizeLegacyProbes(rawExercise, category) {
        const probes = (Array.isArray(rawExercise?.questions) ? rawExercise.questions : [])
            .map((probe, index) => {
                const levelId = LEVEL_SOURCE_MAP[normalizeText(probe?.level).toUpperCase()] || 'behavior';
                const sideLabel = probe?.side === 'b'
                    ? normalizeText(rawExercise?.sideB_label) || 'מוקד משלים'
                    : normalizeText(rawExercise?.sideA_label) || 'מוקד ראשי';
                const levelCopy = category.dilts_map_he[levelId] || { what_to_recover: LEVEL_LABELS[levelId] };
                return {
                    id: `${normalizeText(rawExercise?.id || 'legacy')}_${index + 1}`,
                    level_id: levelId,
                    level_label_he: LEVEL_LABELS[levelId] || 'רמה',
                    support_label_he: sideLabel,
                    challenge_he: `ברובד ${LEVEL_LABELS[levelId] || 'רמה'} · ${sideLabel}, איזו שאלה תחזיר: ${levelCopy.what_to_recover}?`,
                    reveal_question_he: normalizeText(probe?.question),
                    reveal_answer_he: normalizeText(probe?.answer),
                    score: Number(probe?.score) || 0
                };
            })
            .filter((probe) => probe.reveal_question_he && probe.reveal_answer_he);

        probes.sort((left, right) => {
            const levelDiff = LEVEL_ORDER.indexOf(left.level_id) - LEVEL_ORDER.indexOf(right.level_id);
            if (levelDiff !== 0) return levelDiff;
            return String(left.support_label_he).localeCompare(String(right.support_label_he), 'he');
        });
        return probes;
    }

    function convertLegacyExercise(rawExercise, category) {
        const probes = normalizeLegacyProbes(rawExercise, category);
        if (!probes.length) return null;
        return {
            id: normalizeText(rawExercise?.id),
            category_id: category.id,
            title_he: normalizeText(rawExercise?.sentence).slice(0, 68),
            sentence_he: normalizeText(rawExercise?.sentence),
            context_lines_he: buildLegacyContext(category, rawExercise?.sentence),
            what_is_missing_here_he: category.core_missing_information_he,
            what_to_recover_now_he: category.target_of_recovery_he,
            summary_core_he: normalizeText(rawExercise?.core),
            summary_shift_he: normalizeText(rawExercise?.crack),
            reflection_core_he: normalizeText(rawExercise?.reflectCore),
            reflection_shift_he: normalizeText(rawExercise?.reflectCrack),
            punch_question_he: normalizeText(rawExercise?.punchQ),
            punch_answer_he: normalizeText(rawExercise?.punchA),
            probes
        };
    }

    function normalizeExtraExercise(rawExercise, category) {
        return {
            id: normalizeText(rawExercise?.id),
            category_id: category.id,
            title_he: normalizeText(rawExercise?.title_he) || category.label_he,
            sentence_he: normalizeText(rawExercise?.sentence_he),
            context_lines_he: uniqueList(rawExercise?.context_lines_he || []).slice(0, 4),
            what_is_missing_here_he: category.core_missing_information_he,
            what_to_recover_now_he: category.target_of_recovery_he,
            summary_core_he: category.what_learner_looks_for_he,
            summary_shift_he: category.surface_risk_he,
            reflection_core_he: category.deep_note_he,
            reflection_shift_he: category.therapist_note_he,
            punch_question_he: category.meta_model_questions_he[0] || '',
            punch_answer_he: category.common_mistake_he,
            probes: (Array.isArray(rawExercise?.probes) ? rawExercise.probes : []).map((probe, index) => ({
                id: `${normalizeText(rawExercise?.id)}_${index + 1}`,
                level_id: normalizeText(probe?.level_id) || 'behavior',
                level_label_he: LEVEL_LABELS[normalizeText(probe?.level_id)] || 'רמה',
                support_label_he: '',
                challenge_he: normalizeText(probe?.challenge_he),
                reveal_question_he: normalizeText(probe?.reveal_question_he),
                reveal_answer_he: normalizeText(probe?.reveal_answer_he),
                score: 0
            }))
        };
    }

    async function loadPayload() {
        if (payloadCache) return payloadCache;
        if (payloadPromise) return payloadPromise;

        payloadPromise = Promise.all([
            fetchJson(DATA_SOURCES.ui),
            fetchJson(DATA_SOURCES.categories),
            fetchJson(DATA_SOURCES.extraExercises),
            fetchJson(DATA_SOURCES.glossary),
            fetchJson(DATA_SOURCES.legacyExercises)
        ]).then(([uiPayload, categoryPayload, extraPayload, glossaryPayload, legacyPayload]) => {
            const glossaryItems = Array.isArray(glossaryPayload?.items) ? glossaryPayload.items : [];
            const glossaryById = Object.fromEntries(glossaryItems.map((item) => [normalizeText(item?.id), item]));
            const categories = (Array.isArray(categoryPayload?.categories) ? categoryPayload.categories : []).map((entry) => {
                const glossaryItem = glossaryById[normalizeText(entry?.source_id)];
                if (!glossaryItem) {
                    throw new Error(`Missing glossary content for Prism Lab category: ${entry?.source_id}`);
                }
                return mergeCategory(entry, glossaryItem);
            });
            const categoriesById = Object.fromEntries(categories.map((category) => [category.id, category]));

            const legacyExercises = (Array.isArray(legacyPayload) ? legacyPayload : [])
                .map((exercise) => {
                    const categoryId = LEGACY_CATEGORY_MAP[normalizeText(exercise?.category)] || '';
                    return categoryId && categoriesById[categoryId]
                        ? convertLegacyExercise(exercise, categoriesById[categoryId])
                        : null;
                })
                .filter(Boolean);

            const extraExercises = (Array.isArray(extraPayload?.exercises) ? extraPayload.exercises : [])
                .map((exercise) => {
                    const category = categoriesById[normalizeText(exercise?.category_id)];
                    return category ? normalizeExtraExercise(exercise, category) : null;
                })
                .filter(Boolean);

            const exercises = legacyExercises.concat(extraExercises);
            const exercisesByCategory = exercises.reduce((acc, exercise) => {
                (acc[exercise.category_id] = acc[exercise.category_id] || []).push(exercise);
                return acc;
            }, {});

            payloadCache = {
                ui: uiPayload,
                logicalLevels: Array.isArray(categoryPayload?.logical_levels) ? categoryPayload.logical_levels : [],
                categories,
                categoriesById,
                exercises,
                exercisesByCategory
            };
            return payloadCache;
        }).finally(() => {
            payloadPromise = null;
        });

        return payloadPromise;
    }

    function createState(root) {
        return {
            root,
            mode: root.getAttribute('data-prism-necessity-mode') || 'embedded',
            loaded: false,
            error: '',
            payload: null,
            view: 'landing',
            pathId: '',
            selectedCategoryId: '',
            exerciseIndex: 0,
            probeIndex: 0,
            revealOpen: false,
            deepenOpen: false
        };
    }

    function getCategory(state) {
        return state.payload?.categoriesById?.[state.selectedCategoryId] || null;
    }

    function getCategoryExercises(state) {
        return state.payload?.exercisesByCategory?.[state.selectedCategoryId] || [];
    }

    function getExercise(state) {
        return getCategoryExercises(state)[state.exerciseIndex] || null;
    }

    function getProbe(state) {
        return getExercise(state)?.probes?.[state.probeIndex] || null;
    }

    function goToLanding(state) {
        state.view = 'landing';
        state.pathId = '';
        state.selectedCategoryId = '';
        state.exerciseIndex = 0;
        state.probeIndex = 0;
        state.revealOpen = false;
        state.deepenOpen = false;
    }

    function goToCategories(state, pathId = '') {
        state.view = 'categories';
        state.pathId = normalizeText(pathId);
        state.selectedCategoryId = '';
        state.exerciseIndex = 0;
        state.probeIndex = 0;
        state.revealOpen = false;
        state.deepenOpen = false;
    }

    function openCategoryWorkspace(state, categoryId) {
        state.view = 'workspace';
        state.selectedCategoryId = categoryId;
        state.exerciseIndex = 0;
        state.probeIndex = 0;
        state.revealOpen = false;
        state.deepenOpen = false;
    }

    function restartCurrentSession(state) {
        if (state.view !== 'workspace') {
            renderApp(state);
            return true;
        }
        state.exerciseIndex = 0;
        state.probeIndex = 0;
        state.revealOpen = false;
        state.deepenOpen = false;
        renderApp(state);
        return true;
    }

    function stepBack(state) {
        if (state.view === 'workspace') {
            if (state.deepenOpen) {
                state.deepenOpen = false;
                renderApp(state);
                return true;
            }
            if (state.revealOpen) {
                state.revealOpen = false;
                renderApp(state);
                return true;
            }
            if (state.probeIndex > 0) {
                state.probeIndex -= 1;
                renderApp(state);
                return true;
            }
            if (state.exerciseIndex > 0) {
                state.exerciseIndex -= 1;
                state.probeIndex = Math.max(0, (getExercise(state)?.probes?.length || 1) - 1);
                renderApp(state);
                return true;
            }
            goToCategories(state, state.pathId);
            renderApp(state);
            return true;
        }
        if (state.view === 'categories') {
            goToLanding(state);
            renderApp(state);
            return true;
        }
        return false;
    }

    function registerController(state) {
        global.__metaFeatureControllers = global.__metaFeatureControllers || {};
        global.__metaFeatureControllers.prismlab = {
            stepBack() {
                return stepBack(state);
            },
            restart() {
                return restartCurrentSession(state);
            }
        };
    }

    function getVisibleCategories(state) {
        const categories = Array.isArray(state.payload?.categories) ? state.payload.categories : [];
        if (!state.pathId) return categories;
        return categories.filter((category) => Array.isArray(category.learning_paths) && category.learning_paths.includes(state.pathId));
    }

    function renderLevelCards(category, payload) {
        const logicalLevels = Array.isArray(payload?.logicalLevels) ? payload.logicalLevels : [];
        return logicalLevels.map((level) => {
            const details = category?.dilts_map_he?.[level.id] || {};
            const isDominant = Array.isArray(category?.dominant_levels) && category.dominant_levels.includes(level.id);
            return `
                <article class="pnm-level-card${isDominant ? ' is-dominant' : ''}">
                    <strong>${escapeHtml(level.label_he)}</strong>
                    <p>${escapeHtml(details.what_to_recover || level.short_he || '')}</p>
                    <small>${escapeHtml(details.guiding_frame || '')}</small>
                </article>
            `;
        }).join('');
    }

    function renderCategoryCard(category, payload, compact = false) {
        const exerciseCount = (payload?.exercisesByCategory?.[category.id] || []).length;
        return `
            <button type="button" class="pnm-category-card${compact ? ' is-compact' : ''}" data-action="open-category" data-category-id="${escapeHtml(category.id)}">
                <div class="pnm-category-card-head">
                    <span class="pnm-tag">${escapeHtml(category.category_tag_he)}</span>
                    <span class="pnm-meta">${escapeHtml(category.difficulty_he)}</span>
                </div>
                <strong>${escapeHtml(category.label_he)}</strong>
                <p class="pnm-category-subtitle">${escapeHtml(category.short_subtitle_he)}</p>
                <p class="pnm-category-missing">${escapeHtml(category.core_missing_information_he)}</p>
                <small>${exerciseCount} מוקדים · ${escapeHtml(category.what_learner_looks_for_he)}</small>
            </button>
        `;
    }

    function renderLanding(state) {
        const ui = state.payload.ui;
        const categories = state.payload.categories.slice(0, 4);
        const paths = Array.isArray(ui?.learning_paths) ? ui.learning_paths : [];
        const levelNotes = Array.isArray(state.payload.logicalLevels) ? state.payload.logicalLevels : [];
        return `
            <section class="pnm-view pnm-view--landing">
                <div class="pnm-title-block">
                    <p class="pnm-kicker">Prism Lab</p>
                    <h1>${escapeHtml(ui?.title || 'מעבדת הפריזמות')}</h1>
                    <p class="pnm-subtitle">${escapeHtml(ui?.subtitle || '')}</p>
                    <p class="pnm-copy">${escapeHtml(ui?.intro || '')}</p>
                </div>
                <div class="pnm-landing-actions">
                    <button type="button" class="pnm-btn pnm-btn--primary" data-action="start-lab">${escapeHtml(ui?.buttons?.start_lab || 'התחל')}</button>
                    <button type="button" class="pnm-btn pnm-btn--ghost" data-action="choose-category">${escapeHtml(ui?.buttons?.choose_category || 'בחר קטגוריה')}</button>
                </div>
                <div class="pnm-grid pnm-grid--three">
                    ${(Array.isArray(ui?.welcome_cards) ? ui.welcome_cards : []).map((card) => `
                        <article class="pnm-panel">
                            <strong>${escapeHtml(card.title_he)}</strong>
                            <p>${escapeHtml(card.body_he)}</p>
                        </article>
                    `).join('')}
                </div>
                <section class="pnm-panel pnm-panel--paths">
                    <div class="pnm-section-head">
                        <strong>${escapeHtml(ui?.sections?.choose_path || 'בחר מסלול')}</strong>
                        <p>${escapeHtml(ui?.instruction_templates?.landing || '')}</p>
                    </div>
                    <div class="pnm-path-grid">
                        ${paths.map((pathEntry) => `
                            <button type="button" class="pnm-path-card" data-action="select-path" data-path-id="${escapeHtml(pathEntry.id)}">
                                <strong>${escapeHtml(pathEntry.label_he)}</strong>
                                <p>${escapeHtml(pathEntry.subtitle_he)}</p>
                            </button>
                        `).join('')}
                    </div>
                </section>
                <section class="pnm-panel">
                    <div class="pnm-section-head">
                        <strong>${escapeHtml(ui?.sections?.theory || 'רמות לוגיות')}</strong>
                        <p>${escapeHtml(ui?.logical_levels_intro_he || '')}</p>
                    </div>
                    <div class="pnm-level-inline">
                        ${levelNotes.map((level) => `<span>${escapeHtml(level.label_he)}</span>`).join('')}
                    </div>
                    <details class="pnm-theory" data-prism-panel="theory">
                        <summary>${escapeHtml(ui?.sections?.theory || 'רמות לוגיות')}</summary>
                        <p>${escapeHtml(ui?.logical_levels_note_he || '')}</p>
                    </details>
                </section>
                <section class="pnm-panel">
                    <div class="pnm-section-head">
                        <strong>${escapeHtml(ui?.sections?.choose_category || 'בחר קטגוריה')}</strong>
                        <p>טעימה מהקטגוריות הזמינות עכשיו.</p>
                    </div>
                    <div class="pnm-category-grid">
                        ${categories.map((category) => renderCategoryCard(category, state.payload, true)).join('')}
                    </div>
                </section>
            </section>
        `;
    }

    function renderCategories(state) {
        const ui = state.payload.ui;
        const pathLabel = (ui?.learning_paths || []).find((entry) => entry.id === state.pathId)?.label_he || '';
        return `
            <section class="pnm-view pnm-view--categories">
                <div class="pnm-title-block pnm-title-block--compact">
                    <p class="pnm-kicker">Prism Lab</p>
                    <h2>${escapeHtml(ui?.sections?.choose_category || 'בחר קטגוריה')}</h2>
                    <p class="pnm-copy">${escapeHtml(ui?.instruction_templates?.categories || '')}</p>
                </div>
                <div class="pnm-inline-actions">
                    <button type="button" class="pnm-mini-btn" data-action="back-landing">${escapeHtml(ui?.buttons?.back_to_landing || 'פתיחה')}</button>
                    ${state.pathId ? `<span class="pnm-chip">${escapeHtml(pathLabel)}</span>` : ''}
                </div>
                <div class="pnm-category-grid">
                    ${getVisibleCategories(state).map((category) => renderCategoryCard(category, state.payload, false)).join('')}
                </div>
            </section>
        `;
    }

    function renderWorkspace(state) {
        const ui = state.payload.ui;
        const category = getCategory(state);
        const exercise = getExercise(state);
        const probe = getProbe(state);
        if (!category || !exercise || !probe) {
            return `
                <section class="pnm-view">
                    <div class="pnm-panel pnm-panel--error">
                        <strong>אין כרגע תרגיל זמין בקטגוריה הזאת.</strong>
                        <button type="button" class="pnm-btn pnm-btn--ghost" data-action="back-categories">${escapeHtml(ui?.buttons?.back_to_categories || 'קטגוריות')}</button>
                    </div>
                </section>
            `;
        }

        const categoryExercises = getCategoryExercises(state);
        return `
            <section class="pnm-view pnm-view--workspace">
                <div class="pnm-work-header">
                    <div>
                        <p class="pnm-kicker">${escapeHtml(category.label_he)} · ${state.exerciseIndex + 1}/${categoryExercises.length}</p>
                        <h2>${escapeHtml(exercise.title_he || category.label_he)}</h2>
                    </div>
                    <div class="pnm-inline-actions">
                        <button type="button" class="pnm-mini-btn" data-action="back-categories">${escapeHtml(ui?.buttons?.back_to_categories || 'קטגוריות')}</button>
                        <button type="button" class="pnm-mini-btn" data-action="next-probe">${escapeHtml(ui?.buttons?.next_probe || 'מוקד נוסף')}</button>
                    </div>
                </div>
                <article class="pnm-context-card" data-meta-context-frame="prismlab">
                    <span class="pnm-section-label">${escapeHtml(ui?.workspace_labels?.context || 'הקשר / בעיה')}</span>
                    <div class="pnm-context-lines">
                        ${(exercise.context_lines_he || []).map((line) => `<p>${escapeHtml(line)}</p>`).join('')}
                    </div>
                    <blockquote class="pnm-sentence">"${escapeHtml(exercise.sentence_he || '')}"</blockquote>
                </article>
                <article class="pnm-band pnm-band--missing">
                    <span class="pnm-section-label">${escapeHtml(ui?.workspace_labels?.missing || 'מה חסר כאן')}</span>
                    <p>${escapeHtml(exercise.what_is_missing_here_he || category.core_missing_information_he)}</p>
                </article>
                <article class="pnm-band pnm-band--recover">
                    <span class="pnm-section-label">${escapeHtml(ui?.workspace_labels?.recover || 'מה מנסים לשחזר')}</span>
                    <div class="pnm-chip-row">
                        ${(exercise.what_to_recover_now_he || []).map((item) => `<span class="pnm-chip">${escapeHtml(item)}</span>`).join('')}
                    </div>
                </article>
                <article class="pnm-instruction-card" data-meta-instruction-frame="prismlab">
                    <span class="pnm-section-label">${escapeHtml(ui?.workspace_labels?.instruction || 'מה עושים עכשיו')}</span>
                    <p>${escapeHtml(ui?.instruction_templates?.workspace || '')}</p>
                </article>
                <section class="pnm-level-strip-wrap">
                    <div class="pnm-section-head">
                        <strong>${escapeHtml(ui?.workspace_labels?.levels || 'מפת רמות לוגיות')}</strong>
                        <p>${escapeHtml(category.what_learner_looks_for_he || '')}</p>
                    </div>
                    <div class="pnm-level-strip">
                        ${renderLevelCards(category, state.payload)}
                    </div>
                </section>
                <article class="pnm-question-card">
                    <div class="pnm-question-meta">
                        <span class="pnm-chip">${escapeHtml(probe.level_label_he || '')}</span>
                        ${probe.support_label_he ? `<span class="pnm-chip">${escapeHtml(probe.support_label_he)}</span>` : ''}
                    </div>
                    <h3>${escapeHtml(probe.challenge_he || '')}</h3>
                    <div class="pnm-action-row">
                        <button type="button" class="pnm-btn pnm-btn--primary" data-action="reveal-answer">${escapeHtml(ui?.buttons?.reveal || 'חשוף תשובה')}</button>
                        <button type="button" class="pnm-btn pnm-btn--secondary" data-action="toggle-deepen">${escapeHtml(ui?.buttons?.deepen || 'העמקה')}</button>
                    </div>
                    ${state.revealOpen ? `
                        <div class="pnm-answer-block">
                            <span class="pnm-section-label">${escapeHtml(ui?.workspace_labels?.answer || 'שאלה מומלצת')}</span>
                            <strong>${escapeHtml(probe.reveal_question_he || '')}</strong>
                            <p>${escapeHtml(probe.reveal_answer_he || '')}</p>
                        </div>
                    ` : ''}
                    ${state.deepenOpen ? `
                        <div class="pnm-deepen-block">
                            <span class="pnm-section-label">${escapeHtml(ui?.workspace_labels?.deepen || 'שכבת עומק')}</span>
                            <p>${escapeHtml(category.deep_note_he || '')}</p>
                            <p>${escapeHtml(category.therapist_note_he || '')}</p>
                            <p><strong>${escapeHtml(ui?.workspace_labels?.common_mistake || 'טעות נפוצה')}:</strong> ${escapeHtml(category.common_mistake_he || '')}</p>
                        </div>
                    ` : ''}
                </article>
            </section>
        `;
    }

    function renderLoading() {
        return '<section class="pnm-view"><div class="pnm-panel pnm-panel--loading">טוען את Prism Lab...</div></section>';
    }

    function renderError(state) {
        return `
            <section class="pnm-view">
                <div class="pnm-panel pnm-panel--error">
                    <strong>Prism Lab לא נטען.</strong>
                    <p>${escapeHtml(state.error || 'תקלה לא ידועה')}</p>
                    <button type="button" class="pnm-btn pnm-btn--primary" data-action="retry-load">נסה שוב</button>
                </div>
            </section>
        `;
    }

    function renderApp(state) {
        const shellClass = state.mode === 'standalone' ? 'pnm-app pnm-app--standalone' : 'pnm-app pnm-app--embedded';
        let body = '';
        if (state.error) body = renderError(state);
        else if (!state.loaded || !state.payload) body = renderLoading();
        else if (state.view === 'categories') body = renderCategories(state);
        else if (state.view === 'workspace') body = renderWorkspace(state);
        else body = renderLanding(state);
        state.root.innerHTML = `<div class="${shellClass}" data-view="${escapeHtml(state.view)}">${body}</div>`;
        registerController(state);
    }

    function goNextProbe(state) {
        const exercises = getCategoryExercises(state);
        const exercise = getExercise(state);
        if (!exercise || !exercises.length) return;
        if (state.probeIndex < (exercise.probes.length - 1)) {
            state.probeIndex += 1;
        } else if (state.exerciseIndex < (exercises.length - 1)) {
            state.exerciseIndex += 1;
            state.probeIndex = 0;
        } else {
            state.exerciseIndex = 0;
            state.probeIndex = 0;
        }
        state.revealOpen = false;
        state.deepenOpen = false;
    }

    function bindEvents(state) {
        state.root.onclick = async (event) => {
            const actionNode = event.target.closest('[data-action]');
            if (!actionNode) return;
            const action = normalizeText(actionNode.getAttribute('data-action'));
            if (action === 'retry-load') {
                state.error = '';
                state.loaded = false;
                renderApp(state);
                try {
                    state.payload = await loadPayload();
                    state.loaded = true;
                } catch (error) {
                    state.error = error?.message || 'Loading failed';
                }
                renderApp(state);
                return;
            }
            if (!state.loaded || !state.payload) return;
            if (action === 'start-lab' || action === 'choose-category') goToCategories(state, '');
            if (action === 'back-landing') goToLanding(state);
            if (action === 'back-categories') goToCategories(state, state.pathId);
            if (action === 'select-path') goToCategories(state, actionNode.getAttribute('data-path-id') || '');
            if (action === 'open-category') openCategoryWorkspace(state, normalizeText(actionNode.getAttribute('data-category-id')));
            if (action === 'reveal-answer') state.revealOpen = true;
            if (action === 'toggle-deepen') state.deepenOpen = !state.deepenOpen;
            if (action === 'next-probe') goNextProbe(state);
            renderApp(state);
        };
    }

    async function mount(root) {
        const state = createState(root);
        ensureStylesheet();
        bindEvents(state);
        renderApp(state);
        try {
            state.payload = await loadPayload();
            state.loaded = true;
        } catch (error) {
            state.error = error?.message || 'Loading failed';
        }
        renderApp(state);
    }

    function boot() {
        Array.from(document.querySelectorAll(ROOT_SELECTOR)).forEach((root) => {
            if (root.__prismLabMounted) return;
            root.__prismLabMounted = true;
            mount(root);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})(typeof window !== 'undefined' ? window : globalThis, typeof document !== 'undefined' ? document : null);
