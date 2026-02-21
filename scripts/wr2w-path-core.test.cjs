const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../js/wr2w-path-core.js');

test('canEnterPath requires resolved confirmation', () => {
    assert.equal(core.canEnterPath({ confirmResolved: false }), false);
    assert.equal(core.canEnterPath({ confirmResolved: true }), true);
});

test('canEnterException requires PATH choice after confirm', () => {
    assert.equal(core.canEnterException({ confirmResolved: true, pathChoice: '' }), false);
    assert.equal(core.canEnterException({ confirmResolved: false, pathChoice: 'outside' }), false);
    assert.equal(core.canEnterException({ confirmResolved: true, pathChoice: 'outside' }), true);
});

test('outside learning requires functional pattern + condition', () => {
    const good = core.evaluateLearningByPath('outside', {
        singleText: "זה לא 'אף פעם', זה דפוס לא עקבי — בעיקר כשאני מגיע עייף."
    });
    assert.equal(good.ok, true);

    const bad = core.evaluateLearningByPath('outside', {
        singleText: 'זה תמיד ככה.'
    });
    assert.equal(bad.ok, false);
});

test('both path requires two valid sentences', () => {
    const invalid = core.evaluateLearningByPath('both', {
        outsideText: 'זה לא עקבי בעיקר כשיש לחץ.',
        insideText: 'קצת קשה.'
    });
    assert.equal(invalid.ok, false);

    const valid = core.evaluateLearningByPath('both', {
        outsideText: 'זה דפוס לא עקבי בעיקר כשאין גבול ברור.',
        insideText: "זה מרגיש תמיד בעיקר כשיש דופק מהיר ולחץ."
    });
    assert.equal(valid.ok, true);
    assert.equal(valid.bothComplete, true);
});

test('round scoring includes PATH point and BOTH bonus', () => {
    const result = core.computeRoundScore({
        criteria: {
            signal: true,
            quantifier: true,
            hypothesis: true,
            confirm: true,
            path: true,
            exception: true
        },
        pathChoice: 'both',
        bothLearningComplete: true
    });

    assert.equal(result.completed, 6);
    assert.equal(result.pathPoint, 1);
    assert.equal(result.bothBonus, 1);
    assert.equal(result.total, 46);
});

test('analytics tracks path distribution and stuck points', () => {
    const base = core.createDefaultAnalytics();
    const afterPath = core.recordPathChoice(base, 'inside', 'scene_1');
    assert.equal(afterPath.pathChoices.inside, 1);
    assert.equal(afterPath.recentPaths.length, 1);

    const afterStuck = core.markStuck(afterPath, 'H');
    assert.equal(afterStuck.stuck.H, 1);
    assert.equal(afterStuck.stuck.C, 0);
});

