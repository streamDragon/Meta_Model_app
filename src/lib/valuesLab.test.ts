import { describe, expect, it } from 'vitest';
import {
  createVclCard,
  createVclSession,
  diagnoseValuesSession,
  extractVclDesire,
  generateVclMoves,
  generateVclQuestions,
  type VclCard,
  type VclSession,
} from './valuesLab';
import rawPack from '../../packs/values-constraints.json';
import type { VclData } from './valuesLab';

const data = rawPack as unknown as VclData;

function card(overrides: Partial<VclCard>): VclCard {
  return createVclCard({ label: 'תנאי', ...overrides });
}

function session(
  cards: VclCard[],
  tradeoffs: VclSession['tradeoffs'] = [],
): VclSession {
  return { ...createVclSession('אני רוצה לנוח אבל יש עבודה'), constraints: cards, tradeoffs };
}

describe('extractVclDesire', () => {
  it('cuts at the first "but" connector and strips the "I want" prefix', () => {
    expect(extractVclDesire('אני רוצה לישון אבל יש לי דדליין')).toBe('לישון');
    expect(extractVclDesire('אני צריך שקט, וגם שיהיה מהר')).toBe('שקט');
  });

  it('returns the whole trimmed text when no connector exists', () => {
    expect(extractVclDesire('שלווה')).toBe('שלווה');
    expect(extractVclDesire('')).toBe('');
  });
});

describe('diagnoseValuesSession rules', () => {
  it('flags too many simultaneous hard constraints', () => {
    const cards = Array.from({ length: 4 }, (_, i) =>
      card({ label: `קשיח ${i}`, negotiability: 'fixed', importance: 9 }),
    );
    const findings = diagnoseValuesSession(session(cards));
    expect(findings.map((f) => f.id)).toContain('too_many_hard');
  });

  it('flags a hidden identity issue for fixed identity-level demands', () => {
    const findings = diagnoseValuesSession(
      session([card({ label: 'להישאר אני', logicalLevel: 'identity', negotiability: 'fixed' })]),
    );
    expect(findings.map((f) => f.id)).toContain('hidden_identity');
    expect(findings.find((f) => f.id === 'hidden_identity')?.evidence).toContain('להישאר אני');
  });

  it('flags missing resource when pressure cards exist without solvers', () => {
    const withPressure = diagnoseValuesSession(
      session([card({ type: 'fear', label: 'פחד' })]),
    );
    expect(withPressure.map((f) => f.id)).toContain('missing_resource');

    const withSolver = diagnoseValuesSession(
      session([card({ type: 'fear', label: 'פחד' }), card({ type: 'strategy', label: 'דרך' })]),
    );
    expect(withSolver.map((f) => f.id)).not.toContain('missing_resource');
  });

  it('flags unresolved value conflict from open tradeoffs', () => {
    const a = card({ label: 'א', importance: 5 });
    const b = card({ label: 'ב', importance: 5 });
    const findings = diagnoseValuesSession(
      session([a, b], [{ id: 't1', between: [a.id, b.id], winner: '', note: '' }]),
    );
    expect(findings.map((f) => f.id)).toContain('value_conflict');
    expect(findings.find((f) => f.id === 'value_conflict')?.evidence[0]).toBe('א ⟷ ב');
  });

  it('flags all-or-nothing when minimum equals ideal on an important card', () => {
    const findings = diagnoseValuesSession(
      session([card({ importance: 8, minimum: 'מושלם', ideal: 'מושלם' })]),
    );
    expect(findings.map((f) => f.id)).toContain('all_or_nothing');
  });

  it('flags over-compromise for important flexible cards without a minimum', () => {
    const findings = diagnoseValuesSession(
      session([card({ importance: 8, negotiability: 'flexible', minimum: '' })]),
    );
    expect(findings.map((f) => f.id)).toContain('over_compromise');
  });

  it('returns no findings for a balanced map', () => {
    const findings = diagnoseValuesSession(
      session([
        card({ importance: 6, negotiability: 'flexible', minimum: 'סביר', ideal: 'מצוין' }),
      ]),
    );
    expect(findings).toEqual([]);
  });
});

describe('generateVclQuestions', () => {
  it('fills desire and card templates without leftover placeholders', () => {
    const a = card({ label: 'מהירות', importance: 9, negotiability: 'fixed' });
    const questions = generateVclQuestions(session([a]), data.meta_model_questions);
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.join(' ')).toContain('מהירות');
    expect(questions.join(' ')).not.toMatch(/\{\w+\}/);
  });

  it('adds tradeoff questions naming both cards', () => {
    const a = card({ label: 'שלום' });
    const b = card({ label: 'שליטה' });
    const questions = generateVclQuestions(
      session([a, b], [{ id: 't', between: [a.id, b.id], winner: '', note: '' }]),
      data.meta_model_questions,
    );
    expect(questions.some((q) => q.includes('שלום') && q.includes('שליטה'))).toBe(true);
  });
});

describe('generateVclMoves', () => {
  it('maps findings to their configured moves', () => {
    const moves = generateVclMoves([{ id: 'hidden_identity', evidence: [] }], data.moves);
    expect(moves.map((m) => m.id)).toContain('identity_to_behavior');
  });

  it('returns nothing for no findings', () => {
    expect(generateVclMoves([], data.moves)).toEqual([]);
  });
});

describe('starter examples', () => {
  it('every example diagnoses without errors and has valid card references', () => {
    for (const example of data.starter_examples) {
      const cardIds = new Set(example.constraints.map((c) => c.id));
      for (const t of example.tradeoffs) {
        for (const id of t.between) {
          expect(cardIds.has(id), `tradeoff ref ${id} in ${example.sessionId}`).toBe(true);
        }
      }
      expect(() => diagnoseValuesSession(example)).not.toThrow();
    }
  });
});
