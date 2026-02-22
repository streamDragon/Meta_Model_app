const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sanitize = require('../js/hebrew-sanitize.js');

const REQUIRED_WIZARD_TITLE = 'כמתים נסתרים – ההכללות שמשתמעות אבל לא נאמרות';
const REQUIRED_WIZARD_FORMULA = 'חוץ (מצלמה) + כמת נסתר → עוצמה בפנים';

test('sanitizeHebrewText fixes known typo words', () => {
    assert.equal(sanitize.sanitizeHebrewText('מפששט'), 'משפט');
    assert.equal(sanitize.sanitizeHebrewText('נורת הההתובנות'), 'נורת ההתובנות');
    assert.equal(sanitize.sanitizeHebrewText('הההתובנות'), 'ההתובנות');
});

test('collapseRepeatedHebrewLetters collapses triple Hebrew repeats', () => {
    assert.equal(sanitize.collapseRepeatedHebrewLetters('הההתובנות'), 'ההתובנות');
});

test('sanitizeHebrewText normalizes punctuation spacing', () => {
    assert.equal(
        sanitize.sanitizeHebrewText('זה  מבחן  ,בלי  רווח נכון!  עכשיו'),
        'זה מבחן, בלי רווח נכון! עכשיו'
    );
});

test('sanitizeHebrewText is idempotent', () => {
    const source = 'נורת הההתובנות  ,זה  מפששט   חשוב';
    const once = sanitize.sanitizeHebrewText(source);
    const twice = sanitize.sanitizeHebrewText(once);
    assert.equal(once, twice);
});

test('hasObviousHebrewTypos flags triple repeated Hebrew letters', () => {
    const report = sanitize.hasObviousHebrewTypos('הההרגשה הזו חזקה');
    assert.equal(report.ok, false);
    assert.equal(report.issues.includes('repeated_hebrew_letter_3plus'), true);
});

test('sanitizeHebrewJsonStrings sanitizes nested AI-like payload fields', () => {
    const payload = {
        case_builder: {
            hidden_deep_sentence: 'זה מפששט מרכזי.',
            exception_example: 'נורת הההתובנות נדלקה.'
        },
        patient_simulator: {
            reply_text: 'הההתובנות האלה חזקות.'
        },
        evaluator: {
            one_fix_suggestion: 'זה לא שקר, רק חסר הקשר.'
        }
    };

    const cleaned = sanitize.sanitizeHebrewJsonStrings(payload);

    assert.equal(cleaned.case_builder.hidden_deep_sentence, 'זה משפט מרכזי.');
    assert.equal(cleaned.case_builder.exception_example, 'נורת ההתובנות נדלקה.');
    assert.equal(cleaned.patient_simulator.reply_text, 'ההתובנות האלה חזקות.');
    assert.equal(cleaned.evaluator.one_fix_suggestion, 'זה לא בהכרח שקר, רק חסר הקשר.');
});

test('Wizard title and formula strings are present in app UI', () => {
    const appPath = path.join(__dirname, '..', 'js', 'app.js');
    const appSource = fs.readFileSync(appPath, 'utf8');
    assert.equal(appSource.includes(REQUIRED_WIZARD_TITLE), true);
    assert.equal(appSource.includes(REQUIRED_WIZARD_FORMULA), true);
});
