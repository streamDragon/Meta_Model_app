import { describe, expect, it } from 'vitest';
import { CONVERSATION_SCENARIOS } from '../data/conversationScenarios';
import { CONVERSATION_SKILLS } from '../data/conversationSkills';
import { emptyLearning, normalizeLearning, recordConversation, recommendScenario, type LearningSession } from './conversationLearning';
const now = Date.UTC(2026, 9, 2, 12);
const scenario = CONVERSATION_SCENARIOS[0];
const session = (id = 'a', completedAt = now): LearningSession => ({ id, scenarioId: scenario.id, completedAt, transfer: 'planned', results: scenario.turns.map((t) => ({ skill: t.skill, quality: 'helpful' })) });
describe('conversation practice evidence', () => {
  it('has consistent fictional teaching content and covers all skills', () => {
    expect(new Set(CONVERSATION_SCENARIOS.map((s) => s.id)).size).toBe(CONVERSATION_SCENARIOS.length);
    for (const s of CONVERSATION_SCENARIOS) for (const t of s.turns) {
      expect(t.options.filter((o) => o.quality === 'helpful').length).toBeGreaterThan(0);
      expect(new Set(t.options.map((o) => o.id)).size).toBe(t.options.length);
      expect(t.options.every((o) => o.reply && o.feedback)).toBe(true);
    }
    expect(new Set(CONVERSATION_SCENARIOS.flatMap((s) => s.turns.map((t) => t.skill))).size).toBe(CONVERSATION_SKILLS.length);
  });
  it('records completion once and limits repeat rewards on the same local day', () => {
    const a = recordConversation(emptyLearning(), session());
    expect(a.xp).toBe(10);
    expect(recordConversation(a.data, session()).recorded).toBe(false);
    const b = recordConversation(a.data, session('b'));
    expect(b.xp).toBe(0);
    expect(b.data.sessions.length).toBe(2);
    expect(recordConversation(b.data, session('c', now + 86400000)).xp).toBe(10);
  });
  it('schedules mistakes for review and does not count them as helpful evidence', () => {
    const input = session(); input.results[0].quality = 'unhelpful';
    const result = recordConversation(emptyLearning(), input);
    expect(result.data.skills.attune?.dueAt).toBe(now);
    expect(result.data.skills.attune?.helpful).toBe(0);
    expect(result.data.skills.attune?.contexts).toEqual([]);
    expect(result.data.skills.goal?.dueAt).toBe(now + 86400000);
  });
  it('varies context after completion instead of recommending the same exercise', () => {
    const data = recordConversation(emptyLearning(), session()).data;
    expect(recommendScenario(data, now).id).not.toBe(scenario.id);
  });
  it('does not treat same-day repetitions as spaced practice', () => {
    const a = recordConversation(emptyLearning(), session()).data;
    const b = recordConversation(a, session('b')).data;
    expect(b.skills.attune?.streak).toBe(1);
    expect(b.skills.attune?.dueAt).toBe(now + 86400000);
    const c = recordConversation(b, session('c', now + 86400000)).data;
    expect(c.skills.attune?.streak).toBe(2);
    expect(c.skills.attune?.dueAt).toBe(now + 4 * 86400000);
  });
  it('ignores unknown versions and sanitizes corrupted saved evidence', () => {
    expect(normalizeLearning({ version: 2 })).toEqual(emptyLearning());
    const data = normalizeLearning({ version: 1, skills: { attune: { attempts: -1, helpful: Infinity, streak: NaN, contexts: ['missing'], dueAt: 'bad' } }, sessions: [null, { id: 'bad' }], rewardedOn: { meeting: null } });
    expect(data.skills.attune).toEqual({ attempts: 0, helpful: 0, streak: 0, contexts: [], dueAt: 0 });
    expect(data.sessions).toEqual([]);
  });
  it('rejects incomplete sessions and mismatched skill results', () => {
    const input = session(); input.results.pop();
    expect(recordConversation(emptyLearning(), input).recorded).toBe(false);
    const other = session(); other.results[0].skill = 'action';
    expect(recordConversation(emptyLearning(), other).recorded).toBe(false);
  });
});
