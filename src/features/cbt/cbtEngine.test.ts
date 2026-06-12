import { describe, expect, it } from 'vitest';
import {
  analyzeThought,
  detectCbtPatterns,
  detectMetaModelPatterns,
  generateCbtQuestions,
  generateMetaModelQuestions,
  suggestRealityExperiment,
} from './cbtEngine';

describe('cbtEngine', () => {
  it('maps should/must and universal language into CBT and Meta Model patterns', () => {
    const text = 'אני חייב לעשות מה שכולם אומרים.';

    expect(detectCbtPatterns(text)).toEqual(
      expect.arrayContaining(['should_must', 'approval_belief']),
    );
    expect(detectMetaModelPatterns(text)).toEqual(
      expect.arrayContaining(['modal_operator', 'universal_quantifier', 'missing_referential_index']),
    );
  });

  it('generates gentle questions and moves from a thought analysis', () => {
    const analysis = analyzeThought('הם לא ענו לי, בטח לא רוצים אותי.');

    expect(analysis.paceHe).toContain('מפה');
    expect(analysis.cbtPatterns).toEqual(expect.arrayContaining(['mind_reading']));
    expect(analysis.metaModelPatterns).toEqual(expect.arrayContaining(['mind_reading']));
    expect(generateMetaModelQuestions(analysis)).toEqual(
      expect.arrayContaining(['מי בדיוק לא ענה?', 'לפי מה אתה יודע שזה אומר שלא רוצים אותך?']),
    );
    expect(generateCbtQuestions(analysis)[0]).toContain('ראיה');
    expect(analysis.suggestedMoves.map((move) => move.type)).toContain('missing_information_question');
  });

  it('suggests a small safe experiment for social predictions', () => {
    const analysis = analyzeThought('אם אגיד לא, יכעסו עליי.');

    expect(suggestRealityExperiment(analysis)).toContain('צריך לבדוק');
  });
});
