(function attachTriplesRadarCore(rootFactory) {
    const root = typeof globalThis !== 'undefined'
        ? globalThis
        : (typeof window !== 'undefined' ? window : this);
    const api = rootFactory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.triplesRadarCore = api;
})(function createTriplesRadarCore() {
    const ROWS = Object.freeze([
        Object.freeze({
            id: 'row1',
            label: 'שלשה 1 | מקור, הנחה וכוונה',
            categories: Object.freeze(['lost_performative', 'assumptions', 'mind_reading'])
        }),
        Object.freeze({
            id: 'row2',
            label: 'שלשה 2 | חוקי משחק וגבולות',
            categories: Object.freeze(['universal_quantifier', 'modal_operator', 'cause_effect'])
        }),
        Object.freeze({
            id: 'row3',
            label: 'שלשה 3 | משמעות, זהות והסקה',
            categories: Object.freeze(['nominalisations', 'identity_predicates', 'complex_equivalence'])
        }),
        Object.freeze({
            id: 'row4',
            label: 'שלשה 4 | הקשר, זמן וייחוס',
            categories: Object.freeze(['comparative_deletion', 'time_space_predicates', 'lack_referential_index'])
        }),
        Object.freeze({
            id: 'row5',
            label: 'שלשה 5 | קרקע חושית ופעולה',
            categories: Object.freeze(['non_referring_nouns', 'sensory_predicates', 'unspecified_verbs'])
        })
    ]);

    const CATEGORY_TO_ROW = Object.freeze(ROWS.reduce((acc, row) => {
        row.categories.forEach((categoryId) => {
            acc[categoryId] = row.id;
        });
        return acc;
    }, {}));

    function normalizeCategoryId(value) {
        const raw = String(value || '').trim().toLowerCase();
        if (!raw) return '';

        const compact = raw
            .replace(/&/g, ' and ')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .replace(/_+/g, '_');

        const aliases = {
            assumptions: 'assumptions',
            assumption: 'assumptions',
            lost_performative: 'lost_performative',
            mind_reading: 'mind_reading',
            universal_quantifier: 'universal_quantifier',
            universal_quantifiers: 'universal_quantifier',
            modal_operator: 'modal_operator',
            cause_effect: 'cause_effect',
            cause_and_effect: 'cause_effect',
            nominalisation: 'nominalisations',
            nominalisations: 'nominalisations',
            nominalization: 'nominalisations',
            identity_predicates: 'identity_predicates',
            complex_equivalence: 'complex_equivalence',
            comparative_deletion: 'comparative_deletion',
            time_space: 'time_space_predicates',
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

    function getRowIdByCategory(categoryId) {
        const normalized = normalizeCategoryId(categoryId);
        return CATEGORY_TO_ROW[normalized] || '';
    }

    function evaluateSelection(correctCategoryId, selectedCategoryId) {
        const normalizedCorrect = normalizeCategoryId(correctCategoryId);
        const normalizedSelected = normalizeCategoryId(selectedCategoryId);
        const correctRowId = getRowIdByCategory(normalizedCorrect);
        const selectedRowId = getRowIdByCategory(normalizedSelected);

        if (!normalizedCorrect || !normalizedSelected || !correctRowId || !selectedRowId) {
            return {
                status: 'invalid',
                correctCategoryId: normalizedCorrect,
                selectedCategoryId: normalizedSelected,
                correctRowId,
                selectedRowId
            };
        }

        if (normalizedCorrect === normalizedSelected) {
            return {
                status: 'exact',
                correctCategoryId: normalizedCorrect,
                selectedCategoryId: normalizedSelected,
                correctRowId,
                selectedRowId
            };
        }

        if (correctRowId === selectedRowId) {
            return {
                status: 'same_row',
                correctCategoryId: normalizedCorrect,
                selectedCategoryId: normalizedSelected,
                correctRowId,
                selectedRowId
            };
        }

        return {
            status: 'wrong_row',
            correctCategoryId: normalizedCorrect,
            selectedCategoryId: normalizedSelected,
            correctRowId,
            selectedRowId
        };
    }

    return Object.freeze({
        ROWS,
        CATEGORY_TO_ROW,
        normalizeCategoryId,
        getRowIdByCategory,
        evaluateSelection
    });
});
