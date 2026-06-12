import { describe, expect, it } from 'vitest';
import { content, PACKS_META } from './content';
import { PRISM_LEVELS } from '../types';

describe('content pack integrity', () => {
  const allSubcategories = content.categories.flatMap((c) => c.subcategories);

  it('has unique statement ids', () => {
    const ids = content.practice_statements.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers every subcategory with at least 3 practice statements', () => {
    for (const sub of allSubcategories) {
      const count = content.practice_statements.filter(
        (s) => s.subcategory === sub.id,
      ).length;
      expect(count, `subcategory ${sub.id}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps every statement consistent with its subcategory family', () => {
    const familyBySub = new Map(
      allSubcategories.map((sub) => [sub.id, sub.category]),
    );
    for (const s of content.practice_statements) {
      expect(familyBySub.get(s.subcategory), `statement ${s.id}`).toBe(s.category);
      expect(s.statement.length).toBeGreaterThan(0);
      expect(s.suggested_question.length).toBeGreaterThan(0);
      expect(s.explanation.length).toBeGreaterThan(0);
      expect(['easy', 'medium', 'hard']).toContain(s.difficulty);
    }
  });

  it('adds authored surface and hidden violation layers to every practice statement', () => {
    for (const s of content.practice_statements) {
      const layered = s as unknown as Record<string, any>;
      expect(layered.surfaceViolation?.family, `statement ${s.id} surface family`).toBe(
        s.category,
      );
      expect(
        layered.surfaceViolation?.subcategory,
        `statement ${s.id} surface subcategory`,
      ).toBe(s.subcategory);
      expect(layered.surfaceViolation?.questionHe, `statement ${s.id} surface question`).toBeTruthy();
      expect(
        Array.isArray(layered.hiddenViolations),
        `statement ${s.id} hidden violations`,
      ).toBe(true);
      expect(layered.hiddenViolations.length, `statement ${s.id} hidden count`).toBeGreaterThan(0);

      for (const hidden of layered.hiddenViolations) {
        expect(['DELETION', 'DISTORTION', 'GENERALIZATION']).toContain(hidden.family);
        expect(hidden.subcategory, `statement ${s.id} hidden subcategory`).toBeTruthy();
        expect(hidden.violation, `statement ${s.id} hidden violation`).toBeTruthy();
        expect(hidden.questionHe, `statement ${s.id} hidden question`).toBeTruthy();
        expect(hidden.explanationHe, `statement ${s.id} hidden explanation`).toBeTruthy();
      }
    }
  });

  it('treats "אי אפשר לדבר איתו" as a layered modal with hidden distortion and generalization', () => {
    const statement = content.practice_statements.find((s) => s.id === 33) as unknown as
      | Record<string, any>
      | undefined;
    expect(statement).toBeTruthy();
    expect(statement?.surfaceViolation.family).toBe('GENERALIZATION');
    expect(statement?.surfaceViolation.subcategory).toBe('modal_operator');
    expect(statement?.hiddenViolations.map((layer: any) => layer.family)).toEqual(
      expect.arrayContaining(['DISTORTION', 'GENERALIZATION']),
    );
    expect(statement?.impliedFullTextHe).toContain('בשום מצב');
  });

  it('provides choices with cleanup questions for all five logical levels', () => {
    for (const level of PRISM_LEVELS) {
      const choices = content.choice_packs.prism_breen.levels[level.id] ?? [];
      expect(choices.length, `level ${level.id}`).toBeGreaterThanOrEqual(3);
      for (const choice of choices) {
        expect(choice.question, `choice ${choice.id}`).toBeTruthy();
      }
    }
  });

  it('uses training vocabulary, not clinical vocabulary', () => {
    for (const prism of content.prisms) {
      expect(prism.trainer_intent).toBeTruthy();
      expect(prism.trainer_intent).not.toContain('מטופל');
      expect((prism as unknown as Record<string, unknown>).therapist_intent).toBeUndefined();
    }
  });

  it('marks unvalidated packs as placeholder and validated packs as verified', () => {
    const byId = Object.fromEntries(PACKS_META.map((p) => [p.id, p.sourceValidation]));
    expect(byId['meta-model-core-he']).toBe('verified');
    expect(byId['logical-levels-scan-he']).toBe('placeholder');
    expect(byId['prisms-he']).toBe('placeholder');
  });

  it('keeps blueprint reframe templates aligned with the gap-hint heuristic', () => {
    const hints = content.blueprint_builder.reframe_templates.map((t) => t.gap_hint);
    for (const required of ['יכולת נמוכה', 'חסר ידע', 'חסר כלים', 'חסר אישור / הסכמה']) {
      expect(hints).toContain(required);
    }
  });
});
