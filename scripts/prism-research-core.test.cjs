const test = require('node:test');
const assert = require('node:assert/strict');

const core = require('../js/prism-research-core.js');

function category(id, labelHe = id) {
    return {
        categoryId: id,
        labelHe,
        primaryQuestions: ['מה ספציפית?'],
        family: 'test'
    };
}

test('generateQuestion includes category and selection', () => {
    const q = core.generateQuestion({
        category: category('cause_effect', 'סיבה-תוצאה'),
        selectionText: 'נשבר החלון',
        contextText: 'נשבר החלון',
        stepIndex: 0
    });

    assert.equal(q.includes('סיבה-תוצאה'), true);
    assert.equal(q.includes('נשבר החלון'), true);
});

test('appendNode + computeStats builds depth and branches', () => {
    const session = core.createSession({ baseStoryText: 'בסיס' });

    const n1 = core.appendNode(session, {
        parentId: null,
        contextType: 'base',
        contextText: 'בסיס',
        selection: { start: 0, end: 4, text: 'בסיס' },
        category: category('cause_effect', 'סיבה-תוצאה'),
        questionText: 'Q1',
        answerText: 'A1',
        generatedSentence: 'G1'
    });

    core.appendNode(session, {
        parentId: n1.nodeId,
        contextType: 'continued',
        contextText: 'G1',
        selection: { start: 0, end: 2, text: 'G1' },
        category: category('cause_effect', 'סיבה-תוצאה'),
        questionText: 'Q2',
        answerText: 'A2',
        generatedSentence: 'G2'
    });

    core.appendNode(session, {
        parentId: null,
        contextType: 'base',
        contextText: 'בסיס',
        selection: { start: 0, end: 4, text: 'בסיס' },
        category: category('mind_reading', 'קריאת מחשבות'),
        questionText: 'Q3',
        answerText: 'A3',
        generatedSentence: 'G3'
    });

    const stats = core.computeStats(session);
    assert.equal(stats.totalNodes, 3);
    assert.equal(stats.branchCount, 2);
    assert.equal(stats.maxDepth, 2);
    assert.equal(stats.categoryCounts.cause_effect, 2);
});

test('buildAfaqReport returns sections, insights and next step', () => {
    const session = core.createSession({ baseStoryText: 'בסיס' });
    const categoriesById = {
        cause_effect: { labelHe: 'סיבה-תוצאה' },
        complex_equivalence: { labelHe: 'שקילות מורכבת' },
        mind_reading: { labelHe: 'קריאת מחשבות' }
    };

    const n1 = core.appendNode(session, {
        parentId: null,
        contextType: 'base',
        contextText: 'בסיס',
        selection: { start: 0, end: 4, text: 'בסיס' },
        category: category('cause_effect', 'סיבה-תוצאה'),
        questionText: 'Q1',
        answerText: 'A1',
        generatedSentence: 'X גרם ל-Y'
    });
    const n2 = core.appendNode(session, {
        parentId: n1.nodeId,
        contextType: 'continued',
        contextText: 'X גרם ל-Y',
        selection: { start: 0, end: 1, text: 'X' },
        category: category('cause_effect', 'סיבה-תוצאה'),
        questionText: 'Q2',
        answerText: 'A2',
        generatedSentence: 'Y גרם ל-Z'
    });
    core.appendNode(session, {
        parentId: n2.nodeId,
        contextType: 'continued',
        contextText: 'Y גרם ל-Z',
        selection: { start: 0, end: 1, text: 'Y' },
        category: category('complex_equivalence', 'שקילות מורכבת'),
        questionText: 'Q3',
        answerText: 'A3',
        generatedSentence: 'זה אומר שאני נכשל'
    });
    core.appendNode(session, {
        parentId: null,
        contextType: 'base',
        contextText: 'בסיס',
        selection: { start: 0, end: 4, text: 'בסיס' },
        category: category('mind_reading', 'קריאת מחשבות'),
        questionText: 'Q4',
        answerText: 'A4',
        generatedSentence: 'אני מסיק מהטון'
    });

    const report = core.buildAfaqReport(session, { categoriesById });
    assert.equal(typeof report.nextStep, 'string');
    assert.equal(report.nextStep.length > 0, true);
    assert.equal(Array.isArray(report.insights), true);
    assert.equal(report.insights.length >= 2, true);
    assert.equal(Array.isArray(report.sections.causalChains), true);

    const md = core.reportToMarkdown(report);
    assert.equal(md.includes('# AFAQ Report'), true);
});
