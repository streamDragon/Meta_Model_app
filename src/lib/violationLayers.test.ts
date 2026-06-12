import { describe, expect, it } from 'vitest';
import { content } from '../data/content';
import { evaluateLayeredAnswer, FULL_LAYERED_XP, PARTIAL_LAYERED_XP } from './violationLayers';

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
