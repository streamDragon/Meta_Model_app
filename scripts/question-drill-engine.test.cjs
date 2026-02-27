const test = require('node:test');
const assert = require('node:assert/strict');

const engine = require('../js/question-drill-engine.js');

test('selectItemsByDifficulty returns only matching level when available', () => {
    const items = [
        { id: 'a', difficulty: 'easy' },
        { id: 'b', difficulty: 'medium' },
        { id: 'c', difficulty: 'medium' }
    ];
    const result = engine.selectItemsByDifficulty(items, 'medium');
    assert.deepEqual(result.map((item) => item.id), ['b', 'c']);
});

test('selectItemsByDifficulty falls back to full set when level is missing', () => {
    const items = [
        { id: 'a', difficulty: 'easy' },
        { id: 'b', difficulty: 'medium' }
    ];
    const result = engine.selectItemsByDifficulty(items, 'hard');
    assert.equal(result.length, 2);
});

test('computeTestScoreDelta applies speed and streak bonuses on success', () => {
    const delta = engine.computeTestScoreDelta({ correct: true, rtMs: 800, streak: 2 });
    assert.equal(delta.base, 100);
    assert.equal(delta.speedBonus, 60);
    assert.equal(delta.streakBonus, 20);
    assert.equal(delta.total, 180);
});

test('computeTestScoreDelta applies penalty on wrong answer', () => {
    const delta = engine.computeTestScoreDelta({ correct: false, rtMs: 400, streak: 4 });
    assert.equal(delta.total, -50);
    assert.equal(delta.base, 0);
    assert.equal(delta.speedBonus, 0);
    assert.equal(delta.streakBonus, 0);
});
