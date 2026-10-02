import { CONVERSATION_SCENARIOS } from '../data/conversationScenarios';
import { CONVERSATION_SKILLS, type ConversationSkill, type ResponseQuality } from '../data/conversationSkills';

export const LEARNING_KEY = 'conversationLearning:v1';
const DAY = 86_400_000;
export interface SkillEvidence {
  attempts: number; helpful: number; streak: number; contexts: string[]; dueAt: number; lastDay?: string;
}
export interface ConversationResult { skill: ConversationSkill; quality: ResponseQuality }
export interface LearningSession {
  id: string; scenarioId: string; completedAt: number;
  results: ConversationResult[]; transfer: 'planned' | 'tried' | 'not-yet';
}
export interface ConversationLearning {
  version: 1;
  skills: Partial<Record<ConversationSkill, SkillEvidence>>;
  sessions: LearningSession[];
  rewardedOn: Record<string, string>;
}
export function emptyLearning(): ConversationLearning {
  return { version: 1, skills: {}, sessions: [], rewardedOn: {} };
}
const validSkills = new Set<string>(CONVERSATION_SKILLS.map((s) => s.id));
const validScenarios = new Set(CONVERSATION_SCENARIOS.map((s) => s.id));
const validQuality = new Set(['helpful', 'mixed', 'unhelpful']);
const count = (v: unknown): number => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;

export function normalizeLearning(raw: unknown): ConversationLearning {
  const empty = emptyLearning();
  if (!raw || typeof raw !== 'object' || (raw as { version?: unknown }).version !== 1) return empty;
  const data = raw as Partial<ConversationLearning>;
  for (const skill of CONVERSATION_SKILLS) {
    const value = data.skills?.[skill.id];
    if (!value || typeof value !== 'object') continue;
    const attempts = count(value.attempts);
    empty.skills[skill.id] = { attempts, helpful: Math.min(attempts, count(value.helpful)),
      streak: Math.min(3, count(value.streak)), dueAt: count(value.dueAt),
      ...(typeof value.lastDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.lastDay) ? { lastDay: value.lastDay } : {}),
      contexts: Array.isArray(value.contexts) ? [...new Set(value.contexts.filter((id) => validScenarios.has(id)))] : [] };
  }
  if (Array.isArray(data.sessions)) {
    empty.sessions = data.sessions.filter((s) => s && typeof s.id === 'string' && validScenarios.has(s.scenarioId)
      && typeof s.completedAt === 'number' && Number.isFinite(s.completedAt) && s.completedAt >= 0
      && ['planned', 'tried', 'not-yet'].includes(s.transfer) && Array.isArray(s.results)
      && s.results.every((r) => r && validSkills.has(r.skill) && validQuality.has(r.quality)))
      .slice(-200).map((s) => ({ ...s, results: s.results.map((r) => ({ skill: r.skill, quality: r.quality })) }));
  }
  for (const scenario of CONVERSATION_SCENARIOS) {
    const value = data.rewardedOn?.[scenario.id];
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) empty.rewardedOn[scenario.id] = value;
  }
  return empty;
}
export function loadLearning(): ConversationLearning {
  try { return normalizeLearning(JSON.parse(localStorage.getItem(LEARNING_KEY) ?? 'null')); }
  catch { return emptyLearning(); }
}
export function saveLearning(data: ConversationLearning): boolean {
  try { localStorage.setItem(LEARNING_KEY, JSON.stringify(data)); return true; } catch { return false; }
}
export function localDay(now: number): string {
  const date = new Date(now);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function recordConversation(data: ConversationLearning, session: LearningSession): { data: ConversationLearning; xp: number; recorded: boolean } {
  if (data.sessions.some((s) => s.id === session.id)) return { data, xp: 0, recorded: false };
  const scenario = CONVERSATION_SCENARIOS.find((s) => s.id === session.scenarioId);
  if (!scenario || !Number.isFinite(session.completedAt) || session.results.length !== scenario.turns.length
    || session.results.some((r, i) => r.skill !== scenario.turns[i].skill || !validQuality.has(r.quality))) {
    return { data, xp: 0, recorded: false };
  }
  const skills = { ...data.skills };
  const day = localDay(session.completedAt);
  for (const result of session.results) {
    const prev = skills[result.skill] ?? { attempts: 0, helpful: 0, streak: 0, contexts: [], dueAt: 0 };
    const correct = result.quality === 'helpful';
    const streak = correct ? Math.max(1, Math.min(3, prev.streak + Number(prev.lastDay !== day))) : 0;
    skills[result.skill] = {
      attempts: prev.attempts + 1, helpful: prev.helpful + Number(correct), streak, lastDay: day,
      contexts: correct ? [...new Set([...prev.contexts, session.scenarioId])] : prev.contexts,
      // Product heuristic, not a clinically validated learning schedule.
      dueAt: session.completedAt + (correct ? [0, 1, 3, 7][streak] * DAY : 0),
    };
  }
  const reward = data.rewardedOn[session.scenarioId] !== day;
  return { recorded: true, xp: reward ? 10 : 0, data: {
    version: 1, skills, sessions: [...data.sessions, session].slice(-200),
    rewardedOn: { ...data.rewardedOn, [session.scenarioId]: day },
  } };
}
export function recommendScenario(data: ConversationLearning, now = Date.now()) {
  const recent = data.sessions[data.sessions.length - 1]?.scenarioId;
  const rank = (scenario: typeof CONVERSATION_SCENARIOS[number]) => {
    const due = scenario.turns.filter((turn) => (data.skills[turn.skill]?.dueAt ?? 0) <= now).length;
    const fresh = !data.sessions.some((s) => s.scenarioId === scenario.id);
    return due * 10 + Number(fresh) * 3 - Number(recent === scenario.id) * 5;
  };
  return [...CONVERSATION_SCENARIOS].sort((a, b) => rank(b) - rank(a))[0];
}
