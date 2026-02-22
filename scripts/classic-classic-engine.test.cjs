const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const engine = require('../js/classic-classic-engine.js');
const rngApi = require('../js/classic-classic-rng.js');
const configApi = require('../js/classic-classic-config.js');

const patternsPath = path.join(__dirname, '..', 'data', 'metaModelPatterns.he.json');
const patternsData = JSON.parse(fs.readFileSync(patternsPath, 'utf8'));
const patterns = patternsData.patterns;

test('generateQuestionStageOptions returns 5 options with exactly 2 correct and no duplicates', () => {
    const pattern = patterns.find((item) => item.id === 'mind_reading');
    const rng = rngApi.createSeededRng('question-options-seed');
    const options = engine.generateQuestionStageOptions(pattern, rng, configApi.GAME_CONFIG);

    assert.equal(options.length, 5);
    assert.equal(options.filter((option) => option.isCorrect).length, 2);

    const ids = options.map((option) => option.id);
    assert.equal(new Set(ids).size, ids.length);
});

test('problem and goal stages always return 5 options with exactly 1 correct', () => {
    const pattern = patterns.find((item) => item.id === 'nominalization');
    const rng = rngApi.createSeededRng('problem-goal-seed');
    const problem = engine.generateProblemStageOptions(pattern, rng, configApi.GAME_CONFIG);
    const goal = engine.generateGoalStageOptions(pattern, rng, configApi.GAME_CONFIG);

    assert.equal(problem.length, 5);
    assert.equal(goal.length, 5);
    assert.equal(problem.filter((option) => option.isCorrect).length, 1);
    assert.equal(goal.filter((option) => option.isCorrect).length, 1);
});

test('stage transitions: correct advances stage in learning', () => {
    const session = engine.createSessionState({
        patterns,
        mode: 'learning',
        seed: 'learning-stage-seed',
        config: configApi.GAME_CONFIG
    });

    let round = engine.currentRound(session);
    assert.equal(round.stage, 'question');

    const correctQuestionOption = round.options.question.find((option) => option.isCorrect);
    const resultQuestion = engine.submitStageAnswer(session, correctQuestionOption.id);
    assert.equal(resultQuestion.ok, true);

    round = engine.currentRound(session);
    assert.equal(round.stage, 'problem');

    const correctProblemOption = round.options.problem.find((option) => option.isCorrect);
    engine.submitStageAnswer(session, correctProblemOption.id);
    round = engine.currentRound(session);
    assert.equal(round.stage, 'goal');
});

test('wrong answer behaves differently by mode (learning retry vs exam life penalty)', () => {
    const learningSession = engine.createSessionState({
        patterns,
        mode: 'learning',
        seed: 'learning-wrong-seed',
        config: configApi.GAME_CONFIG
    });
    const learningRound = engine.currentRound(learningSession);
    const learningWrong = learningRound.options.question.find((option) => !option.isCorrect);
    const learningResult = engine.submitStageAnswer(learningSession, learningWrong.id);

    assert.equal(learningResult.ok, false);
    assert.equal(learningResult.retryAllowed, true);
    assert.equal(engine.currentRound(learningSession).stage, 'question');
    assert.ok(learningResult.explanation.length > 0);

    const examSession = engine.createSessionState({
        patterns,
        mode: 'exam',
        seed: 'exam-wrong-seed',
        config: configApi.GAME_CONFIG
    });
    const examRound = engine.currentRound(examSession);
    const examWrong = examRound.options.question.find((option) => !option.isCorrect);
    const livesBefore = examSession.livesLeft;
    const examResult = engine.submitStageAnswer(examSession, examWrong.id);

    assert.equal(examResult.ok, false);
    assert.equal(examResult.retryAllowed, true);
    assert.equal(examSession.livesLeft, livesBefore - 1);
    assert.equal(examResult.explanation, '');
    assert.equal(engine.currentRound(examSession).stage, 'question');
});

test('seeded RNG reproducibility keeps question option order stable', () => {
    const pattern = patterns.find((item) => item.id === 'universal_quantifiers');
    const rngA = rngApi.createSeededRng('same-seed');
    const rngB = rngApi.createSeededRng('same-seed');

    const optionsA = engine.generateQuestionStageOptions(pattern, rngA, configApi.GAME_CONFIG).map((option) => option.id);
    const optionsB = engine.generateQuestionStageOptions(pattern, rngB, configApi.GAME_CONFIG).map((option) => option.id);

    assert.deepEqual(optionsA, optionsB);
});
