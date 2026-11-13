import { describe, expect, it } from 'vitest';
import { content } from '../data/content';
import {
  cleanImpliedFullText,
  evaluateLayeredAnswer,
  FULL_LAYERED_XP,
  layeredScoreSummary,
  PARTIAL_LAYERED_XP,
  patternNameHe,
  toLayeredStatement,
} from './violationLayers';

const layeredModal = () => {
  const statement = content.practice_statements.find((s) => s.id === 33);
  if (!statement) throw new Error('statement 33 is required for layered modal tests');
  return statement;
};

describe('evaluateLayeredAnswer', () => {
  it('awards full XP when the surface answer and a hidden distortion are correct', () => {
    const result = evaluateLayeredAnswer(layeredModal(), 'GENERALIZATION', 'DISTORTION');

    expect(result.status).toBe('full');
    expect(result.surfaceCorrect).toBe(true);
    expect(result.hiddenCorrect).toBe(true);
    expect(result.xp).toBe(FULL_LAYERED_XP);
  });

  it('accepts the hidden generalization reading for the same modal sentence', () => {
    const result = evaluateLayeredAnswer(layeredModal(), 'GENERALIZATION', 'GENERALIZATION');

    expect(result.status).toBe('full');
    expect(result.xp).toBe(FULL_LAYERED_XP);
  });

  it('awards partial XP when only the surface answer is correct', () => {
    const result = evaluateLayeredAnswer(layeredModal(), 'GENERALIZATION', 'DELETION');

    expect(result.status).toBe('partial');
    expect(result.surfaceCorrect).toBe(true);
    expect(result.hiddenCorrect).toBe(false);
    expect(result.xp).toBe(PARTIAL_LAYERED_XP);
  });

  it('awards partial XP when only the hidden answer is correct', () => {
    const result = evaluateLayeredAnswer(layeredModal(), 'DELETION', 'DISTORTION');

    expect(result.status).toBe('partial');
    expect(result.surfaceCorrect).toBe(false);
    expect(result.hiddenCorrect).toBe(true);
    expect(result.xp).toBe(PARTIAL_LAYERED_XP);
  });

  it('awards no XP when both layers are wrong', () => {
    const result = evaluateLayeredAnswer(layeredModal(), 'DELETION', 'DELETION');

    expect(result.status).toBe('incorrect');
    expect(result.surfaceCorrect).toBe(false);
    expect(result.hiddenCorrect).toBe(false);
    expect(result.xp).toBe(0);
  });
});

describe('cleanImpliedFullText', () => {
  it('drops the generated placeholder that only repeats the statement', () => {
    const statement = 'כל הגברים הם אותו דבר';
    const placeholder = 'המשפט המלא כאילו מוסיף: "כל הגברים הם אותו דבר" - וזה נכון גם מעבר למה שנאמר בפועל.';
    expect(cleanImpliedFullText(placeholder, statement)).toBeUndefined();
  });

  it('strips a duplicated label prefix but keeps real completions', () => {
    expect(cleanImpliedFullText('המשפט המלא כאילו: אי אפשר לדבר איתו בשום מצב.', 'אי אפשר לדבר איתו')).toBe(
      'אי אפשר לדבר איתו בשום מצב.',
    );
    expect(cleanImpliedFullText('אי אפשר לדבר איתו בשום מצב.', 'אי אפשר לדבר איתו')).toBe(
      'אי אפשר לדבר איתו בשום מצב.',
    );
  });

  it('never leaves the label text inside any pack completion', () => {
    for (const statement of content.practice_statements) {
      const text = toLayeredStatement(statement).impliedFullTextHe;
      if (text) {
        expect(text).not.toContain('המשפט המלא כאילו');
        expect(text.replace(/["\s.]/g, '')).not.toBe(statement.statement.replace(/["\s.]/g, ''));
      }
    }
  });
});

describe('patternNameHe', () => {
  it('uses the Hebrew subcategory name for every pack layer', () => {
    for (const statement of content.practice_statements) {
      const layered = toLayeredStatement(statement);
      for (const layer of [layered.surfaceViolation, ...layered.hiddenViolations]) {
        expect(patternNameHe(layer)).toMatch(/[\u0590-\u05FF]/);
      }
    }
  });
});

describe('layeredScoreSummary', () => {
  it('reports partial answers instead of hiding them behind a zero', () => {
    const summary = layeredScoreSummary(0, 9, 10);
    expect(summary.rate).toBe(45);
    expect(summary.labelHe).toBe('0 מלאות · 9 חלקיות');
  });

  it('omits the partial count when there is none', () => {
    expect(layeredScoreSummary(10, 0, 10)).toMatchObject({ rate: 100, labelHe: '10 מלאות' });
  });
});
