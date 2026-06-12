import { describe, expect, it } from 'vitest';
import cbtCore from '../../../packs/cbt-core.json';
import cbtPractice from '../../../packs/cbt-practice.json';

describe('CBT content packs', () => {
  it('ships lessons, patterns and starter practice with source metadata', () => {
    expect(cbtCore.schemaVersion).toBe(1);
    expect(cbtCore.sourceValidation).toBe('placeholder');
    expect(cbtCore.patterns.length).toBeGreaterThanOrEqual(10);
    expect(cbtCore.lessons.length).toBeGreaterThanOrEqual(10);
    expect(cbtPractice.practiceItems.length).toBeGreaterThanOrEqual(10);
  });

  it('keeps every practice item connected to CBT and Meta Model categories', () => {
    for (const item of cbtPractice.practiceItems) {
      expect(item.statementHe.length).toBeGreaterThan(0);
      expect(item.cbtPatterns.length, item.id).toBeGreaterThan(0);
      expect(item.metaModelPatterns.length, item.id).toBeGreaterThan(0);
      expect(item.suggestedMoveTypes.length, item.id).toBeGreaterThan(0);
      expect(item.betterQuestionHe.length, item.id).toBeGreaterThan(0);
    }
  });
});
