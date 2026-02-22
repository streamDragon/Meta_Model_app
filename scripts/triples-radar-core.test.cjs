const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../js/triples-radar-core.js');

test('exact selection returns exact status', () => {
    const result = core.evaluateSelection('mind_reading', 'mind_reading');
    assert.equal(result.status, 'exact');
    assert.equal(result.correctRowId, 'row1');
    assert.equal(result.selectedRowId, 'row1');
});

test('different category in same row returns same_row status', () => {
    const result = core.evaluateSelection('mind_reading', 'assumptions');
    assert.equal(result.status, 'same_row');
    assert.equal(result.correctRowId, 'row1');
    assert.equal(result.selectedRowId, 'row1');
});

test('different rows return wrong_row status', () => {
    const result = core.evaluateSelection('mind_reading', 'modal_operator');
    assert.equal(result.status, 'wrong_row');
    assert.equal(result.correctRowId, 'row1');
    assert.equal(result.selectedRowId, 'row2');
});

test('aliases normalize correctly', () => {
    const normalized = core.normalizeCategoryId('cause-and-effect');
    assert.equal(normalized, 'cause_effect');
});
