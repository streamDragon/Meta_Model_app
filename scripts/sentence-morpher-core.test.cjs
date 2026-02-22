const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../js/sentence-morpher-core.js');

function createDemoAxes() {
    return [
        {
            id: 'time',
            selectionMode: 'single',
            chips: [
                {
                    id: 'time_never',
                    text: 'אף פעם',
                    insertStrategy: 'afterToken',
                    anchor: 'אני',
                    impliedTokens: [
                        {
                            text: 'לא',
                            insertStrategy: 'beforeToken',
                            anchor: 'יכול'
                        }
                    ]
                },
                {
                    id: 'time_always',
                    text: 'תמיד',
                    insertStrategy: 'afterToken',
                    anchor: 'אני'
                }
            ]
        },
        {
            id: 'words',
            selectionMode: 'single',
            chips: [
                {
                    id: 'words_style',
                    text: 'לא משנה איך אנסח',
                    insertStrategy: 'prepend'
                }
            ]
        },
        {
            id: 'people',
            selectionMode: 'single',
            chips: [
                {
                    id: 'people_helper',
                    text: 'גם אם מטפל יתערב',
                    insertStrategy: 'append'
                }
            ]
        }
    ];
}

test('selecting "אף פעם" adds implied "לא" and composes expected sentence', () => {
    const axes = createDemoAxes();
    let selected = core.createInitialSelectedState(axes);
    selected = core.toggleChipSelection(selected, axes, 'time', 'time_never');

    const composed = core.composeSentence({
        baseSentence: 'אני יכול להסביר לה מה אני רוצה',
        axes,
        selectedChips: selected
    });

    assert.equal(composed.plainSentence, 'אני [אף פעם] לא יכול להסביר לה מה אני רוצה');
});

test('multiple selected axes compose deterministically', () => {
    const axes = createDemoAxes();
    let selected = core.createInitialSelectedState(axes);
    selected = core.toggleChipSelection(selected, axes, 'time', 'time_always');
    selected = core.toggleChipSelection(selected, axes, 'words', 'words_style');
    selected = core.toggleChipSelection(selected, axes, 'people', 'people_helper');

    const composed = core.composeSentence({
        baseSentence: 'אני יכול להסביר לה מה אני רוצה',
        axes,
        selectedChips: selected
    });

    assert.equal(
        composed.plainSentence,
        '[לא משנה איך אנסח] אני [תמיד] יכול להסביר לה מה אני רוצה [גם אם מטפל יתערב]'
    );
});

test('reset state clears all selections and restores base sentence', () => {
    const axes = createDemoAxes();
    let selected = core.createInitialSelectedState(axes);
    selected = core.toggleChipSelection(selected, axes, 'time', 'time_never');

    const resetSelected = core.createInitialSelectedState(axes);
    const composed = core.composeSentence({
        baseSentence: 'אני יכול להסביר לה מה אני רוצה',
        axes,
        selectedChips: resetSelected
    });

    assert.equal(composed.plainSentence, 'אני יכול להסביר לה מה אני רוצה');
    assert.equal(Object.values(resetSelected).every((list) => list.length === 0), true);
});
