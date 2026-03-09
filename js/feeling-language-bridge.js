(function attachFeelingLanguageBridge(global) {
    if (!global || typeof global.setupFeelingLanguageBridge === 'function') return;

    const STORAGE_KEY = 'feeling_language_bridge_v1';
    const STAGES = Object.freeze([
        Object.freeze({ id: 'sentence', label: 'משפט', kicker: 'שלב 1' }),
        Object.freeze({ id: 'outer', label: 'חוץ', kicker: 'שלב 2' }),
        Object.freeze({ id: 'inner', label: 'פנים', kicker: 'שלב 3' }),
        Object.freeze({ id: 'bridge', label: 'גשר', kicker: 'שלב 4' }),
        Object.freeze({ id: 'congruence', label: 'הלימה', kicker: 'שלב 5' }),
        Object.freeze({ id: 'insight', label: 'תובנה', kicker: 'אחרי הלימה' })
    ]);
    const CONGRUENCE_LEVELS = Object.freeze([
        Object.freeze({ id: 'not-yet', label: 'עוד לא', note: 'יש כאן משהו חי, אבל הניסוח עוד לא יושב.' }),
        Object.freeze({ id: 'close', label: 'קרוב', note: 'זה כבר מתקרב, אבל חסרה עוד התאמה קטנה.' }),
        Object.freeze({ id: 'almost', label: 'כמעט', note: 'רובו כבר מדויק. נשאר ליטוש קטן.' }),
        Object.freeze({ id: 'yes', label: 'כן, זה זה', note: 'המשפט הזה נשמע כמו מה שקורה, ולא רק כמו הכותרת של זה.' })
    ]);
    const OUTER_PROMPTS = Object.freeze(['כש...', 'בפעמים ש...', 'מה שקרה בפועל...', 'הוא עשה...', 'הוא לא עשה...', 'שמתי לב ש...']);
    const INNER_PROMPTS = Object.freeze(['עולה בי...', 'בגוף נהיה...', 'זה נהיה כמו...', 'אני מיד מרגיש/ה...', 'יש בי דחף...', 'מה שאני צריך/ה שם...']);
    const INNER_TAGS = Object.freeze(['כיווץ', 'לחץ', 'עלבון', 'בדידות', 'שקיפות', 'בושה', 'דחף להתרחק', 'רצון שיראו אותי']);
    const INNER_IMAGES = Object.freeze(['כאילו אני נעלם', 'כאילו אין לי מקום', 'כאילו אני מדבר לקיר', 'כאילו סגרו עליי דלת', 'כאילו אני קטן מדי']);
    const INNER_ZONES = Object.freeze([
        Object.freeze({ id: 'head', label: 'ראש', locative: 'בראש', top: '10%', left: '49%' }),
        Object.freeze({ id: 'throat', label: 'גרון', locative: 'בגרון', top: '24%', left: '49%' }),
        Object.freeze({ id: 'chest', label: 'חזה', locative: 'בחזה', top: '39%', left: '49%' }),
        Object.freeze({ id: 'solar', label: 'בטן', locative: 'בבטן', top: '54%', left: '49%' }),
        Object.freeze({ id: 'arms', label: 'כתפיים', locative: 'בכתפיים', top: '35%', left: '24%' }),
        Object.freeze({ id: 'heart', label: 'לב', locative: 'בלב', top: '42%', left: '32%' })
    ]);
    const ABSOLUTE_RE = /(תמיד|אף פעם|אף-פעם|כולם|אף אחד|לגמרי|אין מצב|אין לי דרך|בשום דרך|לעולם לא|פשוט)/;
    const REFERENTIAL_RE = /(הוא|היא|הם|הן|זה|זאת|אלה|אלו)/;
    const STOP_WORDS = new Set(['אני', 'אתה', 'את', 'הוא', 'היא', 'הם', 'הן', 'אנחנו', 'זה', 'זאת', 'של', 'על', 'עם', 'כי', 'אותי', 'לי', 'לו', 'לה', 'גם']);
    const SEED_CASES = Object.freeze([
        Object.freeze({
            id: 'seen',
            label: 'זוגיות',
            title: 'הוא לא רואה אותי',
            originalSentence: 'הוא לא רואה אותי',
            hotPhrases: Object.freeze(['לא רואה אותי', 'אותי', 'לא רואה']),
            outerSuggestions: Object.freeze([
                'בשלוש השיחות האחרונות הוא כמעט לא שאל אותי שאלות.',
                'כשאני משתפת משהו אישי, הוא עובר מהר לדבר על עצמו.',
                'בבית, ליד הילדים, הוא כמעט לא מגיב למה שאני אומרת.'
            ]),
            innerSuggestions: Object.freeze([
                'אני מיד מתכווצת ומרגישה לא חשובה.',
                'עולה בי תחושת שקיפות.',
                'זה נהיה כמו מחיקה.'
            ]),
            innerTags: Object.freeze(['שקיפות', 'עלבון', 'רצון שיראו אותי']),
            innerImages: Object.freeze(['כאילו אני נעלמת', 'כאילו אני מדברת לקיר']),
            defaultZone: 'chest'
        }),
        Object.freeze({
            id: 'capable',
            label: 'יכולת',
            title: 'אני לא באמת מסוגל',
            originalSentence: 'אני לא באמת מסוגל',
            hotPhrases: Object.freeze(['לא באמת מסוגל', 'באמת מסוגל', 'לא מסוגל']),
            outerSuggestions: Object.freeze([
                'בשני הניסיונות האחרונים עצרתי מיד אחרי שהופיעה תקלה.',
                'כשאני לא יודע איך מתחילים, אני סוגר מהר את המשימה.',
                'מול משימות חדשות אני כמעט לא נשאר מספיק זמן כדי ללמוד אותן.'
            ]),
            innerSuggestions: Object.freeze([
                'אני נהיה קטן ומוותר מהר.',
                'עולה בי בושה לפני שבכלל ניסיתי עד הסוף.',
                'בבטן נהיה כיווץ חזק כאילו אין לי בסיס.'
            ]),
            innerTags: Object.freeze(['בושה', 'כיווץ', 'דחף להתרחק']),
            innerImages: Object.freeze(['כאילו אין לי בסיס', 'כאילו אני כבר מאחור']),
            defaultZone: 'solar'
        }),
        Object.freeze({
            id: 'child',
            label: 'הורות',
            title: 'הילד פשוט לא מקשיב',
            originalSentence: 'הילד פשוט לא מקשיב',
            hotPhrases: Object.freeze(['פשוט לא מקשיב', 'לא מקשיב', 'פשוט']),
            outerSuggestions: Object.freeze([
                'בבוקר, כשאני מבקש ממנו להתלבש, הוא ממשיך לשחק ולא עונה.',
                'אני צריך לחזור שלוש פעמים על אותה בקשה לפני שיש תזוזה.',
                'כשיש מסך פתוח ברקע, כמעט אין תגובה למה שאני אומר.'
            ]),
            innerSuggestions: Object.freeze([
                'אני מיד עולה בטון ומרגיש חסר אונים.',
                'בכתפיים נהיה עומס וכעס.',
                'זה נהיה כאילו אני לבד מול הקיר.'
            ]),
            innerTags: Object.freeze(['לחץ', 'כעס', 'חסר אונים']),
            innerImages: Object.freeze(['כאילו אני לבד מול הקיר', 'כאילו אף אחד לא פוגש אותי']),
            defaultZone: 'arms'
        }),
        Object.freeze({
            id: 'exit',
            label: 'תקיעות',
            title: 'אין לי דרך לצאת מזה',
            originalSentence: 'אין לי דרך לצאת מזה',
            hotPhrases: Object.freeze(['אין לי דרך', 'לצאת מזה', 'אין דרך']),
            outerSuggestions: Object.freeze([
                'כרגע יש שלוש בעיות שנפתחו בבת אחת ואין לי למי להעביר חלק מהן.',
                'בשבוע האחרון כל פתרון שניסיתי טיפל רק בחלק קטן מהמצב.',
                'כשאני ניגש לזה לבד, אני נתקע כבר בצעד הראשון.'
            ]),
            innerSuggestions: Object.freeze([
                'הכול נהיה צפוף ומכביד מאוד.',
                'עולה בי תחושת חוסר אונים.',
                'אני מרגיש לכוד כאילו הדלת נסגרה.'
            ]),
            innerTags: Object.freeze(['לחץ', 'בדידות', 'חוסר אונים']),
            innerImages: Object.freeze(['כאילו הדלת נסגרה', 'כאילו אין אוויר']),
            defaultZone: 'throat'
        })
    ]);

    function setupFeelingLanguageBridge() {
        const root = document.getElementById('feeling-language-bridge');
        if (!root || root.dataset.flbBound === 'true') return;
        root.dataset.flbBound = 'true';

        const normalize = (value) => {
            if (typeof global.normalizeText === 'function') return global.normalizeText(value);
            return String(value == null ? '' : value).trim();
        };
        const html = (value) => {
            if (typeof global.escapeHtml === 'function') return global.escapeHtml(value);
            return String(value || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        };
        const trimText = (value, max = 220) => {
            const cleaned = normalize(value).replace(/\s+/g, ' ').trim();
            if (!cleaned) return '';
            return cleaned.length > max ? `${cleaned.slice(0, max - 3)}...` : cleaned;
        };
        const uniqueTexts = (items, max = 6) => {
            const seen = new Set();
            return (Array.isArray(items) ? items : [])
                .map((item) => trimText(item, 180))
                .filter((item) => {
                    const key = normalize(item).toLowerCase();
                    if (!key || seen.has(key)) return false;
                    seen.add(key);
                    return true;
                })
                .slice(0, max);
        };
        const caseById = (caseId) => SEED_CASES.find((item) => item.id === String(caseId || '').trim()) || SEED_CASES[0];
        const zoneById = (zoneId) => INNER_ZONES.find((item) => item.id === zoneId) || null;
        const congruenceById = (levelId) => CONGRUENCE_LEVELS.find((item) => item.id === levelId) || CONGRUENCE_LEVELS[0];

        function inferHotPhrases(sentence, seed) {
            const normalized = trimText(sentence, 180);
            if (!normalized) return [];
            const source = seed && normalize(seed.originalSentence) === normalize(normalized) ? [...(seed.hotPhrases || [])] : [];
            const words = normalized.split(/\s+/).filter(Boolean);
            const dynamic = [];
            words.forEach((word, index) => {
                const clean = word.replace(/[.,!?]/g, '');
                if (STOP_WORDS.has(clean)) return;
                if (clean.length <= 2 && !/(לא|אין)/.test(clean)) return;
                if (/(לא|אין|פשוט|באמת|תמיד|אף|לעולם|מסוגל|רואה|מקשיב|דרך|לצאת)/.test(clean)) {
                    dynamic.push(words.slice(Math.max(0, index - 1), Math.min(words.length, index + 2)).join(' '));
                    dynamic.push(words.slice(index, Math.min(words.length, index + 2)).join(' '));
                }
            });
            if (words.length >= 2) {
                dynamic.push(words.slice(0, 2).join(' '));
                dynamic.push(words.slice(Math.max(0, words.length - 2)).join(' '));
            }
            if (words.length >= 3) dynamic.push(words.slice(0, 3).join(' '));
            dynamic.push(normalized);
            return uniqueTexts([...source, ...dynamic], 6);
        }

        function createDefaultState(seed) {
            return {
                selectedCaseId: seed.id,
                originalSentence: seed.originalSentence,
                sentenceDraft: seed.originalSentence,
                hotPhrase: (seed.hotPhrases && seed.hotPhrases[0]) || seed.originalSentence,
                outerFragments: [],
                innerFragments: [],
                bridgeDrafts: [],
                selectedBridgeDraft: '',
                congruenceLevel: 'not-yet',
                metaModelInsights: [],
                nextQuestion: '',
                activeStage: 'sentence',
                outerDraft: '',
                innerDraft: '',
                bridgeEditorDraft: '',
                activeOuterFragment: '',
                activeInnerFragment: '',
                selectedInnerZone: seed.defaultZone || 'chest',
                selectedInnerTone: (seed.innerTags && seed.innerTags[0]) || '',
                selectedInnerImagery: (seed.innerImages && seed.innerImages[0]) || '',
                insightOpen: false
            };
        }

        let state;
        let pendingFocusId = '';

        function sanitizeLoadedState(raw) {
            const seed = caseById(raw?.selectedCaseId);
            const base = createDefaultState(seed);
            return {
                ...base,
                selectedCaseId: seed.id,
                originalSentence: trimText(raw?.originalSentence || base.originalSentence, 180) || base.originalSentence,
                sentenceDraft: trimText(raw?.sentenceDraft || raw?.originalSentence || base.originalSentence, 180) || base.originalSentence,
                hotPhrase: trimText(raw?.hotPhrase || base.hotPhrase, 80) || base.hotPhrase,
                outerFragments: uniqueTexts(raw?.outerFragments, 5),
                innerFragments: uniqueTexts(raw?.innerFragments, 5),
                bridgeDrafts: uniqueTexts(raw?.bridgeDrafts, 4),
                selectedBridgeDraft: trimText(raw?.selectedBridgeDraft, 220),
                congruenceLevel: congruenceById(raw?.congruenceLevel).id,
                metaModelInsights: uniqueTexts(raw?.metaModelInsights, 4),
                nextQuestion: trimText(raw?.nextQuestion, 160),
                activeStage: STAGES.some((item) => item.id === raw?.activeStage) ? raw.activeStage : 'sentence',
                outerDraft: trimText(raw?.outerDraft, 180),
                innerDraft: trimText(raw?.innerDraft, 180),
                bridgeEditorDraft: trimText(raw?.bridgeEditorDraft, 220),
                activeOuterFragment: trimText(raw?.activeOuterFragment, 180),
                activeInnerFragment: trimText(raw?.activeInnerFragment, 180),
                selectedInnerZone: zoneById(raw?.selectedInnerZone)?.id || base.selectedInnerZone,
                selectedInnerTone: trimText(raw?.selectedInnerTone || base.selectedInnerTone, 42),
                selectedInnerImagery: trimText(raw?.selectedInnerImagery || base.selectedInnerImagery, 72),
                insightOpen: raw?.insightOpen === true
            };
        }

        function playUi(kind) {
            if (typeof global.playUISound === 'function') {
                global.playUISound(kind);
            }
        }

        function getSeed() {
            return caseById(state.selectedCaseId);
        }

        function getPrimaryOuter() {
            return normalize(state.activeOuterFragment || state.outerFragments[0] || '');
        }

        function getPrimaryInner() {
            return normalize(state.activeInnerFragment || state.innerFragments[0] || composeInnerPreview() || '');
        }

        function composeInnerPreview() {
            const zone = zoneById(state.selectedInnerZone);
            const zoneText = zone ? `${zone.locative} ` : '';
            const toneText = trimText(state.selectedInnerTone, 42);
            const imageText = trimText(state.selectedInnerImagery, 72);
            const base = toneText ? `${zoneText}נהיה ${toneText}` : '';
            if (base && imageText) return `${base}, ${imageText}.`;
            if (base) return `${base}.`;
            if (imageText) return imageText.endsWith('.') ? imageText : `${imageText}.`;
            return '';
        }

        function normalizeOuterForTemplate(text, prefix = 'כש') {
            const normalized = trimText(text, 180).replace(/[.]+$/, '');
            if (!normalized) return '';
            if (/^(כש|במצבים ש|לא תמיד, אבל כש|ברגעים שבהם)/.test(normalized)) return normalized;
            return `${prefix}${normalized.startsWith(' ') ? '' : ' '}${normalized}`;
        }

        function normalizeInnerForTemplate(text) {
            const normalized = trimText(text, 180).replace(/[.]+$/, '');
            return normalized.replace(/^(אני|עולה בי|בגוף נהיה)\s*/, '').trim() || normalized;
        }

        function buildBridgeDrafts() {
            const outer = getPrimaryOuter();
            const inner = getPrimaryInner();
            if (!outer || !inner) return [];
            const normalizedInner = normalizeInnerForTemplate(inner);
            return uniqueTexts([
                `${normalizeOuterForTemplate(outer)}, עולה בי ${normalizedInner}.`,
                `במצבים ש${outer.replace(/^כש\s*/, '')}, אני מרגיש/ה ${normalizedInner}.`,
                `${normalizeOuterForTemplate(outer)}, זה נהיה עבורי כמו ${normalizedInner}.`,
                `לא תמיד, אבל ${normalizeOuterForTemplate(outer)}, עולה בי חוויה של ${normalizedInner}.`
            ], 4);
        }

        function deriveInsights() {
            const original = normalize(state.originalSentence);
            if (!original) return [];
            const insights = [
                'המשפט המקורי היה כותרת דחוסה; כאן פיצלנו בין מה שקורה בחוץ לבין מה שנהיה בפנים.'
            ];
            if (ABSOLUTE_RE.test(original)) {
                insights.push('נחשף כמת נסתר או מוחלטות סמויה, ועכשיו יש מתי, איפה וכמה במקום כותרת כוללת.');
            }
            if (state.outerFragments.length) {
                insights.push('נוספה שכבת חוץ: אירועים נצפים, זמנים, הקשר ומה שנאמר או לא נאמר בפועל.');
            }
            if (state.innerFragments.length) {
                insights.push('נוספה שכבת פנים: תחושה, תחושת גוף, דימוי או משמעות שחוזרת ברגעים האלה.');
            }
            if (REFERENTIAL_RE.test(original)) {
                insights.push('החוויה הפנימית כבר לא מוצגת כעובדה על אדם אחר, אלא מקבלת ניסוח נפרד ומדויק יותר.');
            }
            return uniqueTexts(insights, 4);
        }

        function deriveNextQuestion() {
            const outer = getPrimaryOuter();
            const inner = getPrimaryInner();
            if (state.congruenceLevel === 'yes' && outer) {
                return `כשזה מנוסח כך, איזו בקשה קטנה או צעד ברור היית רוצה להביא לרגע שבו ${outer.replace(/[.]+$/, '')}?`;
            }
            if ((state.congruenceLevel === 'almost' || state.congruenceLevel === 'close') && inner) {
                return `מה עוד חסר במשפט כדי שגם ${inner.replace(/[.]+$/, '')} יקבל מקום בלי למחוק את מה שקורה בחוץ?`;
            }
            return 'מה עוד צריך להיכנס למשפט כדי שהוא יישב גם בגוף וגם במציאות?';
        }

        function getCompletions() {
            const bridgeText = normalize(state.bridgeEditorDraft || state.selectedBridgeDraft || '');
            return {
                sentence: Boolean(normalize(state.originalSentence) && normalize(state.hotPhrase)),
                outer: state.outerFragments.length > 0,
                inner: state.innerFragments.length > 0,
                bridge: Boolean(bridgeText),
                congruence: state.congruenceLevel !== 'not-yet',
                insight: state.congruenceLevel === 'almost' || state.congruenceLevel === 'yes'
            };
        }

        function getUnlockedStages() {
            const completed = getCompletions();
            return {
                sentence: true,
                outer: completed.sentence,
                inner: completed.outer,
                bridge: completed.inner,
                congruence: completed.bridge,
                insight: completed.insight
            };
        }

        function canOpenStage(stageId) {
            return Boolean(getUnlockedStages()[stageId]);
        }

        function syncState(options = {}) {
            const preserveBridgeEditor = options.preserveBridgeEditor !== false;
            state.outerFragments = uniqueTexts(state.outerFragments, 5);
            state.innerFragments = uniqueTexts(state.innerFragments, 5);
            if (!state.outerFragments.includes(state.activeOuterFragment)) state.activeOuterFragment = state.outerFragments[0] || '';
            if (!state.innerFragments.includes(state.activeInnerFragment)) state.activeInnerFragment = state.innerFragments[0] || '';
            state.bridgeDrafts = buildBridgeDrafts();
            if (!normalize(state.selectedBridgeDraft) && state.bridgeDrafts[0]) state.selectedBridgeDraft = state.bridgeDrafts[0];
            if (!preserveBridgeEditor && !normalize(state.bridgeEditorDraft) && normalize(state.selectedBridgeDraft)) {
                state.bridgeEditorDraft = state.selectedBridgeDraft;
            }
            state.metaModelInsights = deriveInsights();
            state.nextQuestion = deriveNextQuestion();
            if (!canOpenStage(state.activeStage)) {
                const fallback = STAGES.find((item) => canOpenStage(item.id)) || STAGES[0];
                state.activeStage = fallback.id;
            }
            if (!getUnlockedStages().insight) state.insightOpen = false;
        }

        function saveState() {
            try {
                global.localStorage.setItem(STORAGE_KEY, JSON.stringify({
                    selectedCaseId: state.selectedCaseId,
                    originalSentence: state.originalSentence,
                    sentenceDraft: state.sentenceDraft,
                    hotPhrase: state.hotPhrase,
                    outerFragments: state.outerFragments,
                    innerFragments: state.innerFragments,
                    bridgeDrafts: state.bridgeDrafts,
                    selectedBridgeDraft: state.selectedBridgeDraft,
                    congruenceLevel: state.congruenceLevel,
                    metaModelInsights: state.metaModelInsights,
                    nextQuestion: state.nextQuestion,
                    activeStage: state.activeStage,
                    outerDraft: state.outerDraft,
                    innerDraft: state.innerDraft,
                    bridgeEditorDraft: state.bridgeEditorDraft,
                    activeOuterFragment: state.activeOuterFragment,
                    activeInnerFragment: state.activeInnerFragment,
                    selectedInnerZone: state.selectedInnerZone,
                    selectedInnerTone: state.selectedInnerTone,
                    selectedInnerImagery: state.selectedInnerImagery,
                    insightOpen: state.insightOpen
                }));
            } catch (_error) {
                // ignore storage failures
            }
        }

        function setCase(caseId) {
            state = createDefaultState(caseById(caseId));
            syncState({ preserveBridgeEditor: false });
            playUi('prism_open');
        }

        function applySentenceFromDraft() {
            const nextSentence = trimText(state.sentenceDraft, 180);
            if (!nextSentence) return;
            const changed = normalize(nextSentence) !== normalize(state.originalSentence);
            state.originalSentence = nextSentence;
            if (changed) {
                state.hotPhrase = inferHotPhrases(nextSentence, getSeed())[0] || nextSentence;
                state.outerFragments = [];
                state.innerFragments = [];
                state.bridgeDrafts = [];
                state.selectedBridgeDraft = '';
                state.bridgeEditorDraft = '';
                state.activeOuterFragment = '';
                state.activeInnerFragment = '';
                state.congruenceLevel = 'not-yet';
                state.insightOpen = false;
                state.activeStage = 'sentence';
            }
            syncState({ preserveBridgeEditor: false });
            playUi('select_soft');
        }

        function addFragment(kind, text) {
            const normalizedText = trimText(text, 180);
            if (!normalizedText) return;
            if (kind === 'outer') {
                state.outerFragments = uniqueTexts([...state.outerFragments, normalizedText], 5);
                state.activeOuterFragment = normalizedText;
                state.outerDraft = '';
                if (state.activeStage === 'outer') state.activeStage = 'inner';
            } else {
                state.innerFragments = uniqueTexts([...state.innerFragments, normalizedText], 5);
                state.activeInnerFragment = normalizedText;
                state.innerDraft = '';
                if (state.activeStage === 'inner') state.activeStage = 'bridge';
            }
            state.congruenceLevel = 'not-yet';
            state.insightOpen = false;
            syncState({ preserveBridgeEditor: false });
            playUi('prism_pick');
        }

        function removeFragment(kind, text) {
            if (kind === 'outer') {
                state.outerFragments = state.outerFragments.filter((item) => item !== text);
                if (state.activeOuterFragment === text) state.activeOuterFragment = state.outerFragments[0] || '';
            } else {
                state.innerFragments = state.innerFragments.filter((item) => item !== text);
                if (state.activeInnerFragment === text) state.activeInnerFragment = state.innerFragments[0] || '';
            }
            state.congruenceLevel = 'not-yet';
            state.insightOpen = false;
            syncState({ preserveBridgeEditor: false });
            playUi('prism_back');
        }

        function getGuideCopy() {
            const congruence = congruenceById(state.congruenceLevel);
            const map = {
                sentence: 'יש כאן משהו דחוס. בוא נגלה מה חסר כדי שזה יתאים למה שקורה.',
                outer: 'בוא נבדוק מה קורה בחוץ כשזה נהיה נכון.',
                inner: 'ועכשיו, מה נהיה בך ברגעים האלה?',
                bridge: 'ננסה למצוא ניסוח שיושב גם בפנים וגם במציאות.',
                congruence: congruence.id === 'yes'
                    ? 'עכשיו זה כבר נשמע יותר כמו מה שקורה, ולא רק כמו הכותרת של זה.'
                    : 'לא מתקנים עדיין. קודם יוצרים הלימה.',
                insight: 'רק עכשיו אפשר לראות מה היה חסר במשפט המקורי, בלי לקטול את החוויה.'
            };
            return map[state.activeStage] || map.sentence;
        }

        function highlightSentence(sentence, hotPhrase) {
            const base = html(trimText(sentence, 180));
            const target = normalize(hotPhrase);
            if (!target) return base;
            const escapedTarget = html(target);
            const index = base.indexOf(escapedTarget);
            if (index === -1) return base;
            return `${base.slice(0, index)}<span class="flb-hot-mark">${escapedTarget}</span>${base.slice(index + escapedTarget.length)}`;
        }

        function renderStagePills() {
            const completed = getCompletions();
            const unlocked = getUnlockedStages();
            return STAGES.map((stage) => {
                const active = state.activeStage === stage.id ? ' is-active' : '';
                const done = completed[stage.id] ? ' is-done' : '';
                const locked = !unlocked[stage.id] ? ' is-locked' : '';
                return `
                    <button type="button" class="flb-stage-pill${active}${done}${locked}" data-action="go-stage" data-stage="${html(stage.id)}" ${!unlocked[stage.id] ? 'disabled' : ''}>
                        <span>${html(stage.kicker)}</span>
                        <strong>${html(stage.label)}</strong>
                    </button>
                `;
            }).join('');
        }

        function renderFragmentTray(items, activeValue, kind) {
            if (!items.length) {
                return `<p class="flb-empty-note">עוד לא אספנו ניסוח ${kind === 'outer' ? 'חיצוני' : 'פנימי'}.</p>`;
            }
            return `
                <div class="flb-fragment-tray">
                    ${items.map((item) => `
                        <span class="flb-fragment-pill${activeValue === item ? ' is-active' : ''}">
                            <button type="button" data-action="set-active-${kind}" data-value="${html(item)}">${html(item)}</button>
                            <button type="button" class="flb-fragment-pill__remove" data-action="remove-${kind}" data-value="${html(item)}" aria-label="הסר">×</button>
                        </span>
                    `).join('')}
                </div>
            `;
        }

        function renderSuggestionCards(items, kind) {
            const selectedItems = kind === 'outer' ? state.outerFragments : state.innerFragments;
            return `
                <div class="flb-suggestion-grid">
                    ${items.map((item) => `
                        <button type="button" class="flb-suggestion-card${selectedItems.includes(item) ? ' is-selected' : ''}" data-action="add-${kind}" data-value="${html(item)}">
                            <span>${kind === 'outer' ? 'חוץ' : 'פנים'}</span>
                            <strong>${html(item)}</strong>
                        </button>
                    `).join('')}
                </div>
            `;
        }

        function renderSentenceStage(seed) {
            const hotPhraseOptions = inferHotPhrases(state.originalSentence || state.sentenceDraft, seed);
            return `
                <section class="flb-panel flb-panel--sentence">
                    <div class="flb-panel-head">
                        <div>
                            <p class="flb-panel-kicker">שלב 1</p>
                            <h4>על איזו מילה כדאי לעצור?</h4>
                            <p>שומרים את המשפט המקורי, לא מתקנים אותו, ורק בוחרים את החלק שהכי חי עכשיו.</p>
                        </div>
                        <button type="button" class="btn btn-secondary" data-action="go-stage" data-stage="outer" ${!getCompletions().sentence ? 'disabled' : ''}>להמשיך לחוץ</button>
                    </div>

                    <div class="flb-case-row">
                        ${SEED_CASES.map((item) => `
                            <button type="button" class="flb-case-chip${state.selectedCaseId === item.id ? ' is-active' : ''}" data-action="select-case" data-case="${html(item.id)}">${html(item.label)}</button>
                        `).join('')}
                    </div>

                    <label class="flb-field">
                        <span>משפט פתיחה</span>
                        <textarea id="flb-sentence-draft" name="sentence-draft" rows="2" placeholder="לדוגמה: הוא לא רואה אותי">${html(state.sentenceDraft)}</textarea>
                    </label>

                    <div class="flb-inline-actions">
                        <button type="button" class="btn btn-primary" data-action="apply-sentence">שמור את המשפט</button>
                        <span class="flb-inline-note">אפשר להתחיל מדוגמה ואז לשנות למשהו שלך.</span>
                    </div>

                    <div class="flb-chip-section">
                        <p class="flb-chip-section__title">מה במשפט הזה הכי חי כרגע?</p>
                        <div class="flb-chip-cloud">
                            ${hotPhraseOptions.map((phrase) => `
                                <button type="button" class="flb-choice-chip${state.hotPhrase === phrase ? ' is-active' : ''}" data-action="set-hot-phrase" data-value="${html(phrase)}">${html(phrase)}</button>
                            `).join('')}
                        </div>
                        <p class="flb-hot-note">כרגע עצרנו על: <strong>${html(state.hotPhrase || 'בחר/י ביטוי')}</strong></p>
                    </div>
                </section>
            `;
        }

        function renderOuterStage(seed) {
            return `
                <section class="flb-panel flb-panel--outer">
                    <div class="flb-panel-head">
                        <div>
                            <p class="flb-panel-kicker">שלב 2</p>
                            <h4>מה קורה בחוץ כשזה נכון?</h4>
                            <p>לא מחפשים אם המשפט "נכון". מחפשים מתי, איפה, ומה קורה בפועל כשזה מרגיש נכון.</p>
                        </div>
                        <button type="button" class="btn btn-secondary" data-action="go-stage" data-stage="inner" ${!getCompletions().outer ? 'disabled' : ''}>להמשיך לפנים</button>
                    </div>

                    ${renderFragmentTray(state.outerFragments, state.activeOuterFragment, 'outer')}

                    <div class="flb-chip-section">
                        <p class="flb-chip-section__title">מסגרות עדינות לאיסוף חוץ</p>
                        <div class="flb-chip-cloud">
                            ${OUTER_PROMPTS.map((item) => `
                                <button type="button" class="flb-choice-chip" data-action="fill-outer-draft" data-value="${html(item)}">${html(item)}</button>
                            `).join('')}
                        </div>
                    </div>

                    ${renderSuggestionCards(seed.outerSuggestions || [], 'outer')}

                    <label class="flb-field">
                        <span>ניסוח חיצוני</span>
                        <textarea id="flb-outer-draft" name="outer-draft" rows="3" placeholder="לדוגמה: כשאני משתפת משהו אישי, הוא כמעט לא מגיב.">${html(state.outerDraft)}</textarea>
                    </label>

                    <div class="flb-inline-actions">
                        <button type="button" class="btn btn-primary" data-action="commit-outer">הוסף לחוץ</button>
                        <span class="flb-inline-note">כדאי לנסח את זה כאירוע נצפה, לא כמסקנה על האדם.</span>
                    </div>
                </section>
            `;
        }

        function renderInnerStage(seed) {
            const innerPreview = composeInnerPreview();
            const tagOptions = seed.innerTags && seed.innerTags.length ? seed.innerTags : INNER_TAGS;
            const imageOptions = uniqueTexts([...(seed.innerImages || []), ...INNER_IMAGES], 8);
            return `
                <section class="flb-panel flb-panel--inner">
                    <div class="flb-panel-head">
                        <div>
                            <p class="flb-panel-kicker">שלב 3</p>
                            <h4>ומה נהיה בי אז?</h4>
                            <p>נותנים לחוויה הפנימית שם, מקום וצבע. לא כהסבר רפואי, אלא כשפה חיה של גוף ורגש.</p>
                        </div>
                        <button type="button" class="btn btn-secondary" data-action="go-stage" data-stage="bridge" ${!getCompletions().inner ? 'disabled' : ''}>להמשיך לגשר</button>
                    </div>

                    ${renderFragmentTray(state.innerFragments, state.activeInnerFragment, 'inner')}

                    <div class="flb-inner-grid">
                        <div class="flb-felt-field">
                            <div class="flb-felt-field__aura" aria-hidden="true"></div>
                            <div class="flb-felt-field__figure" aria-hidden="true"></div>
                            ${INNER_ZONES.map((zone) => `
                                <button type="button" class="flb-zone-btn${state.selectedInnerZone === zone.id ? ' is-active' : ''}" style="top:${zone.top};left:${zone.left};" data-action="select-zone" data-value="${html(zone.id)}">${html(zone.label)}</button>
                            `).join('')}
                        </div>

                        <div class="flb-inner-builder">
                            <div class="flb-chip-section">
                                <p class="flb-chip-section__title">אילו גוונים נהיים שם?</p>
                                <div class="flb-chip-cloud">
                                    ${tagOptions.map((item) => `
                                        <button type="button" class="flb-choice-chip${state.selectedInnerTone === item ? ' is-active' : ''}" data-action="select-inner-tone" data-value="${html(item)}">${html(item)}</button>
                                    `).join('')}
                                </div>
                            </div>

                            <div class="flb-chip-section">
                                <p class="flb-chip-section__title">אם יש דימוי קטן, מה הוא?</p>
                                <div class="flb-chip-cloud flb-chip-cloud--imagery">
                                    ${imageOptions.map((item) => `
                                        <button type="button" class="flb-choice-chip flb-choice-chip--imagery${state.selectedInnerImagery === item ? ' is-active' : ''}" data-action="select-inner-imagery" data-value="${html(item)}">${html(item)}</button>
                                    `).join('')}
                                </div>
                            </div>

                            <div class="flb-preview-card">
                                <span>שורת felt-sense שנבנית עכשיו</span>
                                <strong>${html(innerPreview || 'בחר/י אזור, גוון או דימוי כדי לייצר משפט פנימי קטן.')}</strong>
                                <button type="button" class="btn btn-secondary" data-action="commit-inner-preview" ${innerPreview ? '' : 'disabled'}>הוסף לפנים</button>
                            </div>
                        </div>
                    </div>

                    ${renderSuggestionCards(seed.innerSuggestions || [], 'inner')}

                    <div class="flb-chip-section">
                        <p class="flb-chip-section__title">פתיחי ניסוח פנימיים</p>
                        <div class="flb-chip-cloud">
                            ${INNER_PROMPTS.map((item) => `
                                <button type="button" class="flb-choice-chip" data-action="fill-inner-draft" data-value="${html(item)}">${html(item)}</button>
                            `).join('')}
                        </div>
                    </div>

                    <label class="flb-field">
                        <span>ניסוח פנימי</span>
                        <textarea id="flb-inner-draft" name="inner-draft" rows="3" placeholder="לדוגמה: אני מיד מתכווצת ומרגישה לא חשובה.">${html(state.innerDraft)}</textarea>
                    </label>

                    <div class="flb-inline-actions">
                        <button type="button" class="btn btn-primary" data-action="commit-inner">הוסף לפנים</button>
                        <span class="flb-inline-note">מותר שזה יהיה גוף, רגש, דימוי או צורך. לא חייבים לבחור רק אחד.</span>
                    </div>
                </section>
            `;
        }

        function renderBridgeStage() {
            const primaryOuter = getPrimaryOuter();
            const primaryInner = getPrimaryInner();
            const bridgeValue = trimText(state.bridgeEditorDraft || state.selectedBridgeDraft || '', 220);
            return `
                <section class="flb-panel flb-panel--bridge">
                    <div class="flb-panel-head">
                        <div>
                            <p class="flb-panel-kicker">שלב 4</p>
                            <h4>גשר הלימה</h4>
                            <p>כאן מחברים בין חוץ לפנים במשפט אחד שמחזיק גם את המציאות וגם את החוויה.</p>
                        </div>
                        <button type="button" class="btn btn-secondary" data-action="go-stage" data-stage="congruence" ${!getCompletions().bridge ? 'disabled' : ''}>לבדיקת הלימה</button>
                    </div>

                    <div class="flb-token-grid">
                        <div class="flb-token-group flb-token-group--outer">
                            <span>חוץ</span>
                            ${state.outerFragments.length ? state.outerFragments.map((item) => `
                                <button type="button" class="flb-token${primaryOuter === item ? ' is-active' : ''}" data-action="set-active-outer" data-value="${html(item)}">${html(item)}</button>
                            `).join('') : '<p class="flb-empty-note">בחר/י ניסוח חוץ אחד לפחות.</p>'}
                        </div>
                        <div class="flb-token-group flb-token-group--inner">
                            <span>פנים</span>
                            ${state.innerFragments.length ? state.innerFragments.map((item) => `
                                <button type="button" class="flb-token${primaryInner === item ? ' is-active' : ''}" data-action="set-active-inner" data-value="${html(item)}">${html(item)}</button>
                            `).join('') : '<p class="flb-empty-note">בחר/י ניסוח פנים אחד לפחות.</p>'}
                        </div>
                    </div>

                    <div class="flb-draft-grid">
                        ${state.bridgeDrafts.length ? state.bridgeDrafts.map((item) => `
                            <button type="button" class="flb-draft-card${normalize(state.selectedBridgeDraft) === normalize(item) ? ' is-active' : ''}" data-action="choose-bridge-draft" data-value="${html(item)}">
                                <span>טיוטת גשר</span>
                                <strong>${html(item)}</strong>
                            </button>
                        `).join('') : '<p class="flb-empty-note">כדי לבנות טיוטות, צריך לפחות ניסוח אחד בחוץ ואחד בפנים.</p>'}
                    </div>

                    <label class="flb-field">
                        <span>ניסוח הגשר</span>
                        <textarea id="flb-bridge-editor" name="bridge-editor" rows="4" placeholder="כש..., עולה בי...">${html(bridgeValue)}</textarea>
                    </label>

                    <div class="flb-inline-actions">
                        <button type="button" class="btn btn-primary" data-action="save-bridge-editor">שמור ניסוח גשר</button>
                        <span class="flb-inline-note">הניסוח יכול להיות עדין: "לא תמיד, אבל כש..." זה חלק מהכלי.</span>
                    </div>
                </section>
            `;
        }

        function renderCongruenceStage() {
            const congruence = congruenceById(state.congruenceLevel);
            const bridgeValue = trimText(state.bridgeEditorDraft || state.selectedBridgeDraft || '', 220);
            return `
                <section class="flb-panel flb-panel--congruence">
                    <div class="flb-panel-head">
                        <div>
                            <p class="flb-panel-kicker">שלב 5</p>
                            <h4>עד כמה זה יושב?</h4>
                            <p>זה לא מד אמת. זה מד הלימה בין המשפט, החוויה והמציאות.</p>
                        </div>
                        <button type="button" class="btn btn-secondary" data-action="go-stage" data-stage="bridge">לחזור לליטוש</button>
                    </div>

                    <div class="flb-landing-card flb-landing-card--${html(congruence.id)}">
                        <p class="flb-landing-sentence">${html(bridgeValue || 'בחר/י או נסח/י משפט גשר קודם.')}</p>
                        <div class="flb-meter-scale">
                            ${CONGRUENCE_LEVELS.map((item) => `
                                <button type="button" class="flb-meter-chip${state.congruenceLevel === item.id ? ' is-active' : ''}" data-action="set-congruence" data-value="${html(item.id)}">
                                    <strong>${html(item.label)}</strong>
                                    <span>${html(item.note)}</span>
                                </button>
                            `).join('')}
                        </div>
                        <p class="flb-meter-note">${html(congruence.note)}</p>
                    </div>

                    <label class="flb-field">
                        <span>ליטוש אחרון</span>
                        <textarea id="flb-bridge-editor-inline" name="bridge-editor" rows="3" placeholder="ערוך/י עד שזה יישב">${html(bridgeValue)}</textarea>
                    </label>

                    <div class="flb-inline-actions">
                        <button type="button" class="btn btn-primary" data-action="save-bridge-editor">עדכן ניסוח</button>
                        <button type="button" class="btn btn-secondary" data-action="toggle-insight" ${!(state.congruenceLevel === 'almost' || state.congruenceLevel === 'yes') ? 'disabled' : ''}>לפתוח שכבת תובנה</button>
                    </div>
                </section>
            `;
        }

        function renderInsights() {
            if (!(state.congruenceLevel === 'almost' || state.congruenceLevel === 'yes')) return '';
            const bridgeSentence = trimText(state.bridgeEditorDraft || state.selectedBridgeDraft || '', 220);
            const sayOutLoud = bridgeSentence ? `${bridgeSentence} חשוב לי שנעצור על זה רגע.` : '';
            return `
                <section class="flb-insight-drawer${state.insightOpen ? ' is-open' : ''}">
                    <button type="button" class="flb-insight-toggle" data-action="toggle-insight">
                        <span>שכבת תובנה</span>
                        <strong>מה היה חסר במשפט המקורי?</strong>
                    </button>
                    <div class="flb-insight-body">
                        <article class="flb-insight-card">
                            <span>Meta Model אחרי הלימה</span>
                            <ul class="flb-insight-list">
                                ${state.metaModelInsights.map((item) => `<li>${html(item)}</li>`).join('')}
                            </ul>
                        </article>
                        <article class="flb-insight-card">
                            <span>שאלה שכדאי לשאול</span>
                            <strong>${html(state.nextQuestion || 'מה עוד צריך כדי שהמשפט הזה יישב?')}</strong>
                        </article>
                        <article class="flb-insight-card">
                            <span>ניסוח שכדאי לומר בקול</span>
                            <strong>${html(sayOutLoud || 'בחר/י קודם ניסוח גשר שמרגיש יושב.')}</strong>
                        </article>
                    </div>
                </section>
            `;
        }

        function renderWorldCard(kind) {
            if (kind === 'sentence') {
                return `
                    <article class="flb-world flb-world--sentence">
                        <div class="flb-world__head">
                            <span>WORLD A</span>
                            <strong>Sentence</strong>
                        </div>
                        <div class="flb-world__body">
                            <p class="flb-sentence-display">${highlightSentence(state.originalSentence, state.hotPhrase)}</p>
                            <p class="flb-world__meta">הביטוי החי כרגע: <strong>${html(state.hotPhrase || 'בחר/י ביטוי')}</strong></p>
                        </div>
                        <button type="button" class="flb-world__cta" data-action="go-stage" data-stage="sentence">לעבוד על המשפט</button>
                    </article>
                `;
            }
            if (kind === 'inner') {
                return `
                    <article class="flb-world flb-world--inner">
                        <div class="flb-world__head">
                            <span>WORLD B</span>
                            <strong>Inner Felt Experience</strong>
                        </div>
                        <div class="flb-world__body">
                            <p>${html(getPrimaryInner() || 'עוד לא אספנו ניסוח פנימי.')}</p>
                            <p class="flb-world__meta">אזור נוכחי: <strong>${html(zoneById(state.selectedInnerZone)?.locative || 'ללא אזור')}</strong></p>
                        </div>
                        <button type="button" class="flb-world__cta" data-action="go-stage" data-stage="inner" ${!canOpenStage('inner') ? 'disabled' : ''}>לעבוד על הפנים</button>
                    </article>
                `;
            }
            if (kind === 'outer') {
                return `
                    <article class="flb-world flb-world--outer">
                        <div class="flb-world__head">
                            <span>WORLD C</span>
                            <strong>Outer Situation</strong>
                        </div>
                        <div class="flb-world__body">
                            <p>${html(getPrimaryOuter() || 'עוד לא אספנו ניסוח חיצוני.')}</p>
                            <p class="flb-world__meta">המטרה כאן: לתפוס רגע, התנהגות, או הקשר שאפשר לראות.</p>
                        </div>
                        <button type="button" class="flb-world__cta" data-action="go-stage" data-stage="outer" ${!canOpenStage('outer') ? 'disabled' : ''}>לעבוד על החוץ</button>
                    </article>
                `;
            }
            const congruence = congruenceById(state.congruenceLevel);
            return `
                <article class="flb-world flb-world--bridge">
                    <div class="flb-world__head">
                        <span>גשר הלימה</span>
                        <strong>${html(congruence.label)}</strong>
                    </div>
                    <div class="flb-world__body">
                        <p>${html(trimText(state.bridgeEditorDraft || state.selectedBridgeDraft || 'כאן נבנה את המשפט המשולב.', 220))}</p>
                        <p class="flb-world__meta">${html(congruence.note)}</p>
                    </div>
                    <button type="button" class="flb-world__cta" data-action="go-stage" data-stage="bridge" ${!canOpenStage('bridge') ? 'disabled' : ''}>לעבוד על הגשר</button>
                </article>
            `;
        }

        function renderWorkspace(seed) {
            if (state.activeStage === 'outer') return renderOuterStage(seed);
            if (state.activeStage === 'inner') return renderInnerStage(seed);
            if (state.activeStage === 'bridge') return renderBridgeStage();
            if (state.activeStage === 'congruence' || state.activeStage === 'insight') return renderCongruenceStage();
            return renderSentenceStage(seed);
        }

        function render() {
            syncState({ preserveBridgeEditor: true });
            const seed = getSeed();
            const congruence = congruenceById(state.congruenceLevel);
            root.className = `flb-root flb-root--${html(state.activeStage)} flb-root--${html(congruence.id)}`;
            root.innerHTML = `
                <section class="screen-read-guide" data-screen-guide="practice-wizard">
                    <details class="screen-read-guide-philosopher-toggle" open>
                        <summary class="screen-read-guide-philosopher-summary">
                            <span class="screen-read-guide-illustration-media" aria-hidden="true">
                                <span class="flb-guide-glyph"></span>
                            </span>
                            <span class="screen-read-guide-illustration-copy">
                                <strong>איך עובדים כאן</strong>
                                <span>לא מתחילים מאתגר או מתיקון. מתחילים מהלימה.</span>
                            </span>
                        </summary>
                        <div class="screen-read-guide-philosopher-panel">
                            <p>המסך הזה עוזר לקחת משפט דחוס ולחבר אותו מחדש לשלושה עולמות: מה נאמר, מה קורה בחוץ, ומה נהיה בפנים.</p>
                            <p><strong>העיקרון:</strong> קודם בונים משפט שיושב גם בגוף וגם במציאות. רק אחר כך מסתכלים על התבנית המטה-מודלית.</p>
                        </div>
                    </details>
                    <div class="screen-read-guide-content">
                        <h4>חמשת השלבים</h4>
                        <p>עוצרים על הביטוי החי, אוספים ניסוח חיצוני, אוספים ניסוח פנימי, בונים גשר הלימה, ואז בודקים עד כמה זה יושב.</p>
                        <ol class="screen-read-guide-steps">
                            <li>שומרים את המשפט המקורי כפי שנאמר.</li>
                            <li>מנסחים מה קורה בחוץ ברגעים שבהם זה מרגיש נכון.</li>
                            <li>מנסחים מה נהיה בפנים באותם רגעים.</li>
                            <li>מחברים את שני הצדדים למשפט גשר אחד.</li>
                            <li>בודקים הלימה, ורק אחרי זה פותחים תובנה מטה-מודלית.</li>
                        </ol>
                        <div class="screen-read-guide-summary">לא מתקנים עדיין - קודם יוצרים הלימה.</div>
                    </div>
                    <div class="screen-demo-dialogue-summary">
                        <h4>מה נקבל בסוף</h4>
                        <ul class="screen-demo-dialogue-list">
                            <li>משפט גשר משולב שמחזיק גם חוץ וגם פנים.</li>
                            <li>תחושת "כן, זה זה" במקום רק דיוק לוגי.</li>
                            <li>שכבת Meta Model עדינה שמופיעה רק אחרי שיש נחיתה.</li>
                        </ul>
                        <p class="screen-demo-dialogue-footnote">המסך בנוי ככלי הלימה, לא כבודק שגיאות.</p>
                    </div>
                </section>

                <div class="practice-section-header">
                    <h3>גשר תחושה-שפה</h3>
                    <p>מעבדה עדינה בין שלושה עולמות: המשפט הדחוס, מה שקורה בחוץ, ומה שנהיה בפנים. רק אחרי שיש הלימה נפתחת שכבת Meta Model.</p>
                </div>

                <div class="flb-shell">
                    <section class="flb-guide-card" aria-label="נוכחות מלווה">
                        <div class="flb-guide-card__figure" aria-hidden="true"><span class="flb-guide-lantern"></span></div>
                        <div class="flb-guide-card__copy">
                            <span>נוכחות מלווה</span>
                            <strong>${html(getGuideCopy())}</strong>
                        </div>
                    </section>

                    <div class="flb-stage-rail" role="tablist" aria-label="שלבי גשר תחושה-שפה">${renderStagePills()}</div>

                    <section class="flb-cosmos" aria-label="שלושת העולמות">
                        ${renderWorldCard('sentence')}
                        ${renderWorldCard('inner')}
                        ${renderWorldCard('outer')}
                        <div class="flb-bridge-visual" aria-hidden="true">
                            <span class="flb-bridge-visual__shore flb-bridge-visual__shore--inner"></span>
                            <span class="flb-bridge-visual__path"></span>
                            <span class="flb-bridge-visual__shore flb-bridge-visual__shore--outer"></span>
                        </div>
                        ${renderWorldCard('bridge')}
                    </section>

                    ${renderWorkspace(seed)}
                    ${renderInsights()}
                </div>
            `;

            if (pendingFocusId) {
                const focusNode = root.querySelector(`#${pendingFocusId}`);
                if (focusNode && typeof focusNode.focus === 'function') {
                    focusNode.focus();
                    if ('selectionStart' in focusNode && typeof focusNode.value === 'string') {
                        const length = focusNode.value.length;
                        focusNode.selectionStart = length;
                        focusNode.selectionEnd = length;
                    }
                }
                pendingFocusId = '';
            }

            saveState();
        }

        try {
            state = sanitizeLoadedState(JSON.parse(global.localStorage.getItem(STORAGE_KEY) || '{}'));
        } catch (_error) {
            state = createDefaultState(SEED_CASES[0]);
        }

        root.addEventListener('input', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLTextAreaElement)) return;
            if (target.name === 'sentence-draft') state.sentenceDraft = trimText(target.value, 180);
            if (target.name === 'outer-draft') state.outerDraft = trimText(target.value, 180);
            if (target.name === 'inner-draft') state.innerDraft = trimText(target.value, 180);
            if (target.name === 'bridge-editor') state.bridgeEditorDraft = trimText(target.value, 220);
            saveState();
        });

        root.addEventListener('click', (event) => {
            const button = event.target instanceof Element ? event.target.closest('[data-action]') : null;
            if (!button) return;
            const action = String(button.getAttribute('data-action') || '').trim();
            const value = String(button.getAttribute('data-value') || '').trim();
            const stage = String(button.getAttribute('data-stage') || '').trim();
            const caseId = String(button.getAttribute('data-case') || '').trim();

            if (action === 'select-case') { setCase(caseId); render(); return; }
            if (action === 'apply-sentence') { applySentenceFromDraft(); render(); return; }
            if (action === 'set-hot-phrase') { state.hotPhrase = trimText(value, 80); state.activeStage = 'outer'; syncState({ preserveBridgeEditor: true }); playUi('select_soft'); render(); return; }
            if (action === 'go-stage' && canOpenStage(stage)) { state.activeStage = stage; render(); return; }
            if (action === 'fill-outer-draft') { state.outerDraft = trimText(`${value} `, 180); pendingFocusId = 'flb-outer-draft'; render(); return; }
            if (action === 'fill-inner-draft') { state.innerDraft = trimText(`${value} `, 180); pendingFocusId = 'flb-inner-draft'; render(); return; }
            if (action === 'add-outer') { addFragment('outer', value); render(); return; }
            if (action === 'add-inner') { addFragment('inner', value); render(); return; }
            if (action === 'commit-outer') { addFragment('outer', state.outerDraft); render(); return; }
            if (action === 'commit-inner') { addFragment('inner', state.innerDraft); render(); return; }
            if (action === 'remove-outer') { removeFragment('outer', value); render(); return; }
            if (action === 'remove-inner') { removeFragment('inner', value); render(); return; }
            if (action === 'set-active-outer') { state.activeOuterFragment = value; syncState({ preserveBridgeEditor: false }); render(); return; }
            if (action === 'set-active-inner') { state.activeInnerFragment = value; syncState({ preserveBridgeEditor: false }); render(); return; }
            if (action === 'select-zone') { state.selectedInnerZone = zoneById(value)?.id || state.selectedInnerZone; render(); return; }
            if (action === 'select-inner-tone') { state.selectedInnerTone = trimText(value, 42); render(); return; }
            if (action === 'select-inner-imagery') { state.selectedInnerImagery = trimText(value, 72); render(); return; }
            if (action === 'commit-inner-preview') { addFragment('inner', composeInnerPreview()); render(); return; }
            if (action === 'choose-bridge-draft') { state.selectedBridgeDraft = trimText(value, 220); state.bridgeEditorDraft = state.selectedBridgeDraft; state.activeStage = 'congruence'; syncState({ preserveBridgeEditor: true }); playUi('prism_submit'); render(); return; }
            if (action === 'save-bridge-editor') { state.bridgeEditorDraft = trimText(state.bridgeEditorDraft, 220); state.selectedBridgeDraft = state.bridgeEditorDraft; if (state.activeStage === 'bridge') state.activeStage = 'congruence'; syncState({ preserveBridgeEditor: true }); playUi('prism_submit'); render(); return; }
            if (action === 'set-congruence') { state.congruenceLevel = congruenceById(value).id; state.insightOpen = state.congruenceLevel === 'almost' || state.congruenceLevel === 'yes'; state.activeStage = state.insightOpen ? 'insight' : 'congruence'; syncState({ preserveBridgeEditor: true }); playUi(state.insightOpen ? 'prism_open' : 'select_soft'); render(); return; }
            if (action === 'toggle-insight' && (state.congruenceLevel === 'almost' || state.congruenceLevel === 'yes')) { state.insightOpen = !state.insightOpen; state.activeStage = state.insightOpen ? 'insight' : 'congruence'; render(); }
        });

        root.addEventListener('keydown', (event) => {
            if (!(event.target instanceof HTMLTextAreaElement)) return;
            if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter') return;
            if (event.target.name === 'outer-draft') { event.preventDefault(); addFragment('outer', state.outerDraft); render(); return; }
            if (event.target.name === 'inner-draft') { event.preventDefault(); addFragment('inner', state.innerDraft); render(); return; }
            if (event.target.name === 'bridge-editor') { event.preventDefault(); state.selectedBridgeDraft = trimText(state.bridgeEditorDraft, 220); syncState({ preserveBridgeEditor: true }); render(); }
        });

        syncState({ preserveBridgeEditor: false });
        render();
    }

    global.setupFeelingLanguageBridge = setupFeelingLanguageBridge;
})(typeof window !== 'undefined' ? window : globalThis);
