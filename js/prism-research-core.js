(function initPrismResearchCore(globalFactory) {
    const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this);
    const api = globalFactory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.prismResearchCore = api;
})(function prismResearchCoreFactory() {
    'use strict';

    const MIN_REPORT_NODES = 6;

    const CATEGORY_TAGS = Object.freeze({
        unspecified_noun: ['meaning', 'scope'],
        unspecified_verb: ['process', 'steps'],
        simple_deletion: ['specificity', 'missing_info'],
        comparative_deletion: ['criteria', 'comparison'],
        lack_ref_index: ['referent', 'scope'],
        mind_reading: ['evidence', 'source'],
        cause_effect: ['cause', 'evidence'],
        complex_equivalence: ['meaning', 'evidence'],
        presuppositions: ['assumption', 'evidence'],
        nominalization: ['process', 'action'],
        universal_quantifiers: ['generalization', 'exceptions', 'scope'],
        modal_necessity: ['modal', 'constraints', 'alternatives'],
        modal_possibility: ['modal', 'capability', 'constraints'],
        lost_performative: ['criteria', 'source', 'evidence'],
        rules_generalization: ['rules', 'generalization', 'exceptions']
    });

    const TAG_SECTION_MAP = Object.freeze({
        cause: 'causalChains',
        meaning: 'meaningChains',
        evidence: 'evidenceCriteria',
        criteria: 'evidenceCriteria',
        source: 'evidenceCriteria',
        assumption: 'evidenceCriteria',
        scope: 'conditionsScope',
        referent: 'conditionsScope',
        comparison: 'conditionsScope',
        exceptions: 'generalizations',
        generalization: 'generalizations',
        modal: 'modalConstraints',
        constraints: 'modalConstraints',
        alternatives: 'modalConstraints',
        capability: 'modalConstraints',
        process: 'conditionsScope',
        steps: 'conditionsScope',
        action: 'conditionsScope'
    });

    function safeString(value) {
        return String(value == null ? '' : value).trim();
    }

    function nowIso() {
        return new Date().toISOString();
    }

    function createId(prefix) {
        const p = safeString(prefix) || 'id';
        return `${p}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    }

    function normalizeCategoryFromPattern(pattern, index) {
        if (!pattern || typeof pattern !== 'object') return null;
        const categoryId = safeString(pattern.id) || `CAT_${String((index || 0) + 1).padStart(2, '0')}`;
        const labelHe = safeString(pattern.name) || categoryId;
        const labelEn = safeString(pattern.id || categoryId);
        const primaryQuestions = Array.isArray(pattern.goodQuestions)
            ? pattern.goodQuestions.map(item => safeString(item && item.text)).filter(Boolean)
            : [];
        const answerSeeds = Array.isArray(pattern.examples)
            ? pattern.examples.map(v => safeString(v)).filter(Boolean)
            : [];

        return {
            categoryId,
            labelHe,
            labelEn,
            family: safeString(pattern.family),
            breenCellId: safeString(pattern.breenCellId),
            definition: safeString(pattern.definition),
            primaryQuestions,
            answerSeeds,
            tags: inferTagsForCategoryId(categoryId)
        };
    }

    function inferTagsForCategoryId(categoryId) {
        const id = safeString(categoryId);
        return (CATEGORY_TAGS[id] || ['specificity']).slice();
    }

    function createSession(options) {
        const baseStoryText = safeString(options && options.baseStoryText);
        return {
            sessionId: createId('prism'),
            language: safeString(options && options.language) || 'he',
            baseStoryId: safeString(options && options.baseStoryId) || 'custom',
            baseStoryText,
            createdAt: nowIso(),
            nodes: []
        };
    }

    function pickPrimaryQuestion(category, stepIndex) {
        const list = Array.isArray(category && category.primaryQuestions) ? category.primaryQuestions.filter(Boolean) : [];
        if (!list.length) return 'מה ספציפית קורה כאן?';
        const idx = Math.abs(Number(stepIndex) || 0) % list.length;
        return list[idx];
    }

    function generateQuestion(options) {
        const category = options && options.category ? options.category : {};
        const selectionText = safeString(options && options.selectionText) || 'זה';
        const contextText = safeString(options && options.contextText);
        const stepIndex = Number(options && options.stepIndex) || 0;
        const base = pickPrimaryQuestion(category, stepIndex);
        const prefix = `פריזמה: ${safeString(category.labelHe || category.categoryId || 'קטגוריה')}`;
        let questionText = `${prefix} | על "${selectionText}": ${base}`;
        if (contextText && questionText.length < 220) {
            const shortCtx = contextText.length > 72 ? `${contextText.slice(0, 69)}...` : contextText;
            questionText += ` (בהקשר: ${shortCtx})`;
        }
        return questionText;
    }

    function normalizeSentence(text) {
        let out = safeString(text);
        if (!out) return '';
        if (!/[.!?…]$/.test(out)) out += '.';
        return out;
    }

    function generateContinuityAnswer(options) {
        const category = options && options.category ? options.category : {};
        const categoryId = safeString(category.categoryId);
        const selectionText = safeString(options && options.selectionText) || 'זה';
        const contextText = safeString(options && options.contextText);
        const stepIndex = Math.abs(Number(options && options.stepIndex) || 0);

        const quoted = `"${selectionText}"`;
        const contextHint = contextText ? ` במשפט "${contextText.length > 44 ? `${contextText.slice(0, 41)}...` : contextText}"` : '';

        const variants = {
            unspecified_noun: [
                `כשאני אומר/ת ${quoted}, אני מתכוון/ת לדבר מאוד מסוים: האופן שבו מדברים אליי בפגישה.`,
                `בשבילי ${quoted} זה לא רעיון כללי, אלא מצב שבו אני מרגיש/ה שאין לי השפעה.`
            ],
            unspecified_verb: [
                `בפועל זה קורה כך: אני שותק/ת, מהנהנ/ת, ואז מסכים/ה בלי לשאול.`,
                `כשאני אומר/ת ${quoted}, הכוונה היא לכמה צעדים ברצף: דוחה, נמנע/ת, ואז מתנתק/ת.`
            ],
            simple_deletion: [
                `הפרט החסר הוא שזה קורה בעיקר מול אדם מסוים ובזמן לחץ.`,
                `מה שלא נאמר כאן הוא מתי זה קורה ועם מי, וזה משנה את כל התמונה.`
            ],
            comparative_deletion: [
                `אני מתכוון/ת ליותר לחוץ/ה מהרגיל, ביחס לפגישות עם אנשים אחרים.`,
                `זה "פחות טוב" לפי הקריטריון שלי שאני מדבר/ת ברור ולא נתקע/ת.`
            ],
            lack_ref_index: [
                `כשאמרתי ${quoted}, התכוונתי בעיקר למנהל הישיר שלי ולא לכולם.`,
                `ה"זה" כאן הוא השיחה עצמה, לא כל העבודה.` 
            ],
            mind_reading: [
                `אני חושב/ת את זה כי הוא לא הסתכל עליי וענה בקצרה, אז פירשתי שזה זלזול.`,
                `אין לי ודאות; אני מסיק/ה את זה מהטון ומהשתיקה שלו.`
            ],
            cause_effect: [
                `זה קרה כי קודם נאמר משפט שפגע בי, ואז נסגרתי מיד.`,
                `מבחינתי ${quoted} גרם לזה כי אחרי זה ישר עלתה תגובת לחץ בגוף.`
            ],
            complex_equivalence: [
                `אצלי זה שווה ל"${selectionText}" = "לא מעריכים אותי", ולכן זה מרגיש אישי.`,
                `בשבילי הדבר הזה אומר שאני נכשל/ת, למרות שזו רק פרשנות כרגע.`
            ],
            presuppositions: [
                `השאלה כאן מניחה שכבר נכשלתי, ואני שם/ה לב שהנחה הזו נכנסת אוטומטית.`,
                `יש פה הנחת יסוד שאני חייב/ת להצליח מיד, וזה מה שמלחיץ אותי.`
            ],
            nominalization: [
                `אם מפרקים את ${quoted} לפעולות, זה נראה כמו להימנע, לשתוק, ואז לדחות שיחה.`,
                `במקום המושג הכללי, בפועל אני עושה כמה פעולות חוזרות שמייצרות את זה.`
            ],
            universal_quantifiers: [
                `זה לא באמת תמיד; זה קורה בעיקר כשאני עייף/ה או כשיש לחץ זמן.`,
                `יש יוצא דופן: מול אדם אחד אני דווקא רגוע/ה ומדויק/ת יותר.`
            ],
            modal_necessity: [
                `אני מרגיש/ה שאני חייב/ת כי אם לא, אני מפחד/ת שיהיה מחיר חברתי.`,
                `ה"חייב" מגיע מכלל פנימי שלי: לא לאכזב אף אחד.`
            ],
            modal_possibility: [
                `אני אומר/ת "לא יכול/ה", אבל כרגע זה יותר קשה/לא נעים מאשר בלתי אפשרי.`,
                `אולי זה אפשרי חלקית; אני פשוט לא רואה עדיין דרך נוחה לעשות את זה.`
            ],
            lost_performative: [
                `מי שקבע שזה "לא בסדר" הוא בעיקר קול פנימי שלמדתי בבית.`,
                `זה נשען על סטנדרט ישן שלי, לא על כלל אובייקטיבי.`
            ],
            rules_generalization: [
                `יש לי כלל כזה: אם אני לא מושלם/ת, עדיף לא להתחיל בכלל.`,
                `זה כלל שהתרחב יותר מדי; הוא עובד רק בחלק קטן מהמקרים.`
            ]
        };

        const list = variants[categoryId] || [
            `אם מדייקים את ${quoted}${contextHint}, מתגלה כאן פרט שלא נאמר קודם ומחדד את המפה.`,
            `כשחופרים דרך הקטגוריה הזו, עולים תנאים וראיות שלא היו גלויים לפני רגע.`
        ];
        const answerText = normalizeSentence(list[stepIndex % list.length]);
        let generatedSentence = answerText;

        if (categoryId === 'cause_effect') {
            const generated = stepIndex % 2 === 0
                ? 'מישהו זרק הערה שפירשתי כביקורת.'
                : 'עלתה אצלי תגובת לחץ ולכן נסגרתי.';
            generatedSentence = generated;
        } else if (categoryId === 'mind_reading') {
            generatedSentence = 'פירשתי את הטון שלו כסימן לזלזול.';
        } else if (categoryId === 'complex_equivalence') {
            generatedSentence = 'הפרשנות שלי הפכה את האירוע לסימן שאני נכשל/ת.';
        } else if (categoryId === 'universal_quantifiers') {
            generatedSentence = 'זה קורה בעיקר במצבי לחץ, לא בכל מצב.';
        } else if (categoryId === 'modal_necessity' || categoryId === 'rules_generalization') {
            generatedSentence = 'יש לי כלל פנימי שמפעיל עליי לחץ חזק.';
        } else if (categoryId === 'nominalization') {
            generatedSentence = 'כשמפרקים את זה לפעולות, יש רצף ברור של צעדים.';
        }

        return {
            answerText,
            generatedSentence: normalizeSentence(generatedSentence),
            tags: inferTagsForCategoryId(categoryId)
        };
    }

    function appendNode(session, input) {
        if (!session || typeof session !== 'object') throw new Error('session is required');
        const category = input && input.category ? input.category : null;
        if (!category) throw new Error('category is required');
        const selection = input && input.selection ? input.selection : null;
        if (!selection || typeof selection.start !== 'number' || typeof selection.end !== 'number') {
            throw new Error('selection is required');
        }

        const node = {
            nodeId: createId('node'),
            parentId: input.parentId || null,
            branchRootId: input.branchRootId || null,
            contextType: input.contextType === 'continued' ? 'continued' : 'base',
            contextText: safeString(input.contextText),
            selection: {
                start: Number(selection.start),
                end: Number(selection.end),
                text: safeString(selection.text)
            },
            categoryId: safeString(category.categoryId),
            categoryLabelHe: safeString(category.labelHe || category.categoryId),
            questionText: safeString(input.questionText),
            answerText: safeString(input.answerText),
            generatedSentence: safeString(input.generatedSentence || input.answerText),
            tags: Array.isArray(input.tags) && input.tags.length ? input.tags.map(safeString).filter(Boolean) : inferTagsForCategoryId(category.categoryId),
            createdAt: nowIso()
        };

        if (node.selection.end < node.selection.start) {
            const t = node.selection.start;
            node.selection.start = node.selection.end;
            node.selection.end = t;
        }

        session.nodes.push(node);
        return node;
    }

    function buildNodeMaps(session) {
        const nodes = Array.isArray(session && session.nodes) ? session.nodes : [];
        const nodeById = new Map(nodes.map(n => [n.nodeId, n]));
        const childrenById = new Map();
        nodes.forEach((node) => {
            const key = node.parentId || '__root__';
            if (!childrenById.has(key)) childrenById.set(key, []);
            childrenById.get(key).push(node);
        });
        return { nodeById, childrenById };
    }

    function computeNodeDepth(node, nodeById) {
        let depth = 1;
        let current = node;
        const seen = new Set();
        while (current && current.parentId && nodeById.has(current.parentId) && !seen.has(current.parentId)) {
            seen.add(current.parentId);
            current = nodeById.get(current.parentId);
            depth += 1;
        }
        return depth;
    }

    function computeStats(session) {
        const nodes = Array.isArray(session && session.nodes) ? session.nodes : [];
        const { nodeById, childrenById } = buildNodeMaps(session);
        const categoryCounts = {};
        const tagCounts = {};
        const depths = [];

        nodes.forEach((node) => {
            categoryCounts[node.categoryId] = (categoryCounts[node.categoryId] || 0) + 1;
            (Array.isArray(node.tags) ? node.tags : []).forEach((tag) => {
                const key = safeString(tag);
                if (!key) return;
                tagCounts[key] = (tagCounts[key] || 0) + 1;
            });
            depths.push(computeNodeDepth(node, nodeById));
        });

        const branchCount = (childrenById.get('__root__') || []).length;
        const maxDepth = depths.length ? Math.max(...depths) : 0;
        const avgDepth = depths.length ? depths.reduce((a, b) => a + b, 0) / depths.length : 0;
        const topCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);

        return {
            totalNodes: nodes.length,
            branchCount,
            maxDepth,
            avgDepth,
            categoryCounts,
            tagCounts,
            topCategories
        };
    }

    function extractTaggedChains(session, tag) {
        const nodes = Array.isArray(session && session.nodes) ? session.nodes : [];
        const { nodeById, childrenById } = buildNodeMaps(session);
        const hasTag = (node) => Array.isArray(node.tags) && node.tags.includes(tag);
        const chains = [];

        function walk(node, current) {
            const taggedChildren = (childrenById.get(node.nodeId) || []).filter(hasTag);
            if (!taggedChildren.length) {
                if (current.length) chains.push(current.slice());
                return;
            }
            taggedChildren.forEach((child) => {
                const next = current.concat(child);
                walk(child, next);
            });
        }

        nodes.filter((node) => hasTag(node) && !(node.parentId && nodeById.has(node.parentId) && hasTag(nodeById.get(node.parentId)))).forEach((startNode) => {
            walk(startNode, [startNode]);
        });

        return chains.filter(chain => chain.length >= 2);
    }

    function formatChain(chain) {
        return chain
            .map(node => safeString(node.generatedSentence || node.answerText || node.selection?.text || node.categoryLabelHe))
            .filter(Boolean)
            .join(' -> ');
    }

    function buildSections(session) {
        const nodes = Array.isArray(session && session.nodes) ? session.nodes : [];
        const sections = {
            causalChains: [],
            meaningChains: [],
            evidenceCriteria: [],
            conditionsScope: [],
            modalConstraints: [],
            generalizations: []
        };

        extractTaggedChains(session, 'cause').forEach((chain) => {
            sections.causalChains.push(formatChain(chain));
        });
        extractTaggedChains(session, 'meaning').forEach((chain) => {
            sections.meaningChains.push(formatChain(chain));
        });

        nodes.forEach((node) => {
            const tags = Array.isArray(node.tags) ? node.tags : [];
            const text = `${node.categoryLabelHe}: ${safeString(node.answerText || node.generatedSentence)}`;
            const sectionKeys = new Set(tags.map(tag => TAG_SECTION_MAP[tag]).filter(Boolean));
            sectionKeys.forEach((key) => {
                if (key === 'causalChains' || key === 'meaningChains') return;
                sections[key].push(text);
            });
        });

        Object.keys(sections).forEach((key) => {
            sections[key] = [...new Set(sections[key])];
        });

        return sections;
    }

    function buildAutoInsights(session, categoriesById) {
        const stats = computeStats(session);
        const insights = [];
        const top = stats.topCategories.slice(0, 2);
        if (top.length) {
            const labels = top.map(([id, count]) => `${safeString(categoriesById && categoriesById[id]?.labelHe) || id} (${count})`).join(', ');
            insights.push(`הקטגוריות הדומיננטיות במחקר: ${labels}.`);
        }

        const meaning = stats.tagCounts.meaning || 0;
        const evidence = stats.tagCounts.evidence || 0;
        const cause = stats.tagCounts.cause || 0;
        const generalization = stats.tagCounts.generalization || 0;

        if (meaning > 0 && evidence === 0) {
            insights.push('המפה כרגע עשירה במשמעות/פרשנות אך כמעט בלי ראיות מפורשות; שווה להצליב עם פריזמת ראיות/קריטריונים.');
        } else if (meaning >= evidence + 2) {
            insights.push('יש נטייה לפרשנות מהירה יחסית לכמות הראיות שנאספה; זה מקום טוב לחיזוק דיוק.');
        } else if (evidence > 0) {
            insights.push('נאספו ראיות/קריטריונים בפועל, מה שמחזק את איכות המיפוי ולא רק פרשנות כללית.');
        }

        if (cause >= 3) {
            insights.push('נבנתה שרשרת סיבתית משמעותית; כדאי לבדוק גם תנאים ויוצאי-דופן כדי למנוע סיפור סיבתי קשיח מדי.');
        } else if (stats.maxDepth >= 4) {
            insights.push(`העומק המקסימלי (${stats.maxDepth}) מראה חפירה טובה באותו קו חקירה, לא רק מעבר בין קטגוריות.`);
        } else if (stats.branchCount >= 3) {
            insights.push(`נוצרו ${stats.branchCount} ענפים מהבסיס, כלומר חקירה רחבה מזוויות שונות.`);
        }

        if (generalization >= 2 && insights.length < 3) {
            insights.push('יש משקל להכללות/חוקים; כדאי לבדוק יוצאי-דופן ולדייק תנאי זמן/מקום.');
        }

        while (insights.length < 2 && stats.totalNodes > 0) {
            insights.push(`נאספו ${stats.totalNodes} צמתים עם עומק ממוצע ${stats.avgDepth.toFixed(1)} ו-${stats.branchCount} ענפי בסיס.`);
        }

        return insights.slice(0, 3);
    }

    function buildNextStep(session) {
        const stats = computeStats(session);
        const t = stats.tagCounts;
        if ((t.meaning || 0) > (t.evidence || 0) + 1) {
            return 'צעד הבא: בחר/י את משפט המשמעות הכי טעון ושאל/י עליו פריזמת ראיות/קריטריונים.';
        }
        if ((t.cause || 0) >= 3) {
            return 'צעד הבא: קח/י חוליה אחת בשרשרת הסיבתית ובדוק/י תנאים או סיבות חלופיות.';
        }
        if ((t.modal || 0) >= 2 || (t.constraints || 0) >= 2) {
            return 'צעד הבא: על אחד ה"חייב/אי-אפשר" הפעל/י פריזמת אפשרות/רצון/מחיר כדי לפתוח חלופות.';
        }
        if ((t.generalization || 0) >= 2) {
            return 'צעד הבא: אסוף/י יוצא-דופן אחד מדויק (מתי זה לא קורה) כדי לדייק את המפה.';
        }
        return 'צעד הבא: המשך/י עוד 2-3 צעדים באותה פריזמה לפני החלפת קטגוריה כדי להעמיק את החקירה.';
    }

    function buildAfaqReport(session, options) {
        const categoriesById = options && options.categoriesById ? options.categoriesById : {};
        const stats = computeStats(session);
        const sections = buildSections(session);
        const insights = buildAutoInsights(session, categoriesById);
        const nextStep = buildNextStep(session);
        return {
            stats,
            sections,
            insights,
            nextStep,
            generatedAt: nowIso()
        };
    }

    function reportToMarkdown(report) {
        if (!report) return '';
        const sectionMap = [
            ['Causal Chains', report.sections && report.sections.causalChains],
            ['Meaning Chains', report.sections && report.sections.meaningChains],
            ['Evidence / Criteria', report.sections && report.sections.evidenceCriteria],
            ['Conditions / Scope', report.sections && report.sections.conditionsScope],
            ['Modal Constraints', report.sections && report.sections.modalConstraints],
            ['Generalizations', report.sections && report.sections.generalizations]
        ];

        const lines = [
            '# AFAQ Report',
            '',
            `Generated: ${safeString(report.generatedAt)}`,
            '',
            '## Stats',
            `- Total nodes: ${Number(report.stats && report.stats.totalNodes) || 0}`,
            `- Branches: ${Number(report.stats && report.stats.branchCount) || 0}`,
            `- Max depth: ${Number(report.stats && report.stats.maxDepth) || 0}`,
            `- Avg depth: ${Number(report.stats && report.stats.avgDepth || 0).toFixed(1)}`
        ];

        sectionMap.forEach(([title, items]) => {
            lines.push('', `## ${title}`);
            if (!Array.isArray(items) || !items.length) {
                lines.push('- (none yet)');
                return;
            }
            items.forEach((item) => lines.push(`- ${safeString(item)}`));
        });

        lines.push('', '## Insights');
        (Array.isArray(report.insights) ? report.insights : []).forEach((item) => lines.push(`- ${safeString(item)}`));
        lines.push('', '## Next Step', safeString(report.nextStep));

        return lines.join('\n');
    }

    return {
        MIN_REPORT_NODES,
        CATEGORY_TAGS,
        normalizeCategoryFromPattern,
        inferTagsForCategoryId,
        createSession,
        generateQuestion,
        generateContinuityAnswer,
        appendNode,
        computeStats,
        buildAfaqReport,
        reportToMarkdown
    };
});
