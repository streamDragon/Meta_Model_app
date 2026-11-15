import type { PracticeStatement } from '../types';
import { content } from '../data/content';
import { shuffle, type Rng } from './random';

// "האימון של היום": a short daily set built from the core practice sentences.
// Order follows the practice research summarised in the app review:
// mixed recognition (warm-up), a question chosen for a stated goal, the
// learner's OWN question compared with a model and a short checklist (no AI
// grading), and one item brought back from an earlier miss.

export type DailyKind = 'recognize' | 'goal' | 'write';
export type DailyPhase = 'warmup' | 'goal' | 'write' | 'review';

export interface DailyItem {
  key: string;
  phase: DailyPhase;
  kind: DailyKind;
  statement: PracticeStatement;
  /** recognize: pattern ids; goal: question texts. Empty for write. */
  options: string[];
  /** recognize: correct pattern id; goal: correct question text. */
  answer: string;
}

export interface ReviewEntry {
  statementId: number;
  kind: DailyKind;
  /** Day (YYYY-MM-DD) from which the item is due again. */
  due: string;
  /** 0 = first return after 1 day, 1 = after 3 days, 2 = after 7 days. */
  step: number;
}

export interface PatternRecord { attempts: number; hits: number }

export interface DailyState {
  queue: ReviewEntry[];
  patterns: Record<string, PatternRecord>;
  /** Days on which a full set was completed. */
  completedDays: string[];
}

export const DAILY_SET_SIZE = 8;
export const REVIEW_GAPS_DAYS = [1, 3, 7] as const;
export const DAILY_STORAGE_KEY = 'dailySet.v1';

export const PHASE_LABEL: Record<DailyPhase, string> = {
  warmup: 'חימום · זיהוי',
  goal: 'שאלה למטרה',
  write: 'ניסוח משלכם',
  review: 'חזרה על טעות',
};

const SUBCATEGORIES = content.categories.flatMap((category) => category.subcategories);

export const PATTERN_HEBREW: Record<string, string> = Object.fromEntries(
  SUBCATEGORIES.map((sub) => [sub.id, sub.hebrew] as const),
);

/** What a good question does for each pattern. The first line is the core point. */
export const PATTERN_CHECKLIST: Record<string, string[]> = {
  simple_deletion: ['שאלתי מה חסר: מה בדיוק, על מה, לגבי מה', 'השאלה נשארת במילים של האדם'],
  comparative_deletion: ['שאלתי יותר או פחות ממה או ממי', 'שאלתי לפי איזה מדד'],
  lack_referential_index: ['שאלתי מי בדיוק או מה בדיוק', 'השאלה מבקשת אדם, דבר או מקרה מסוים'],
  nominalization: ['החזרתי את שם העצם לפעולה: מי עושה מה', 'שאלתי איך זה קורה בפועל'],
  cause_effect: ['שאלתי איך בדיוק דבר אחד גורם לשני', 'לא קיבלתי את הקשר כעובדה וגם לא תקפתי אותו'],
  mind_reading: ['שאלתי איך הוא יודע מה האחר חושב או מרגיש', 'ביקשתי מה ראה או שמע בפועל'],
  lost_performative: ['שאלתי מי קבע או לפי מי', 'שאלתי לפי איזה קריטריון'],
  presupposition: ['זיהיתי מה המשפט מניח כמובן מאליו', 'שאלתי על ההנחה עצמה, לא על מה שנבנה עליה'],
  complex_equivalence: ['שאלתי איך דבר אחד אומר את השני', 'חיפשתי מקרה שבו האחד קרה בלי השני'],
  universal_quantifier: ['שאלתי על המילה המכלילה: תמיד? כולם? אף פעם?', 'הזמנתי יוצא מן הכלל'],
  modal_operator: ['שאלתי מה יקרה אם כן או אם לא', 'או: מה מונע, מה מחייב'],
};

/** Applies to every pattern in the classical Meta Model. */
export const UNIVERSAL_CHECK = 'בלי "למה" ובלי עצה או ויכוח';

export function checklistFor(subcategory: string): string[] {
  return [...(PATTERN_CHECKLIST[subcategory] ?? ['שאלתי על החלק החסר או המעוות במשפט']), UNIVERSAL_CHECK];
}

/** The goal line shown for "question for a goal" items, from the core check. */
export function goalFor(subcategory: string): string {
  const description = SUBCATEGORIES.find((sub) => sub.id === subcategory)?.description;
  return description ? `המטרה: לברר את מה שהמשפט מסתיר. כאן: ${description}.` : 'המטרה: לברר את מה שהמשפט מסתיר.';
}

// Questions that sound helpful but do not recover what the sentence hides:
// a "why" question, advice, and argument. Classical Meta Model avoids all three.
const OFF_GOAL_QUESTIONS = [
  'למה אתה חושב ככה?',
  'אולי תנסה להסתכל על זה אחרת?',
  'זה לא באמת נכון, נכון?',
  'למה זה מפריע לך כל כך?',
  'ניסית פשוט לדבר על זה?',
];

export function isoDay(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return isoDay(new Date(y, m - 1, d + days));
}

export function emptyDailyState(): DailyState {
  return { queue: [], patterns: {}, completedDays: [] };
}

export function normalizeDailyState(value: unknown): DailyState {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<DailyState>;
  const queue = Array.isArray(raw.queue)
    ? raw.queue.filter((e): e is ReviewEntry =>
        !!e && typeof e.statementId === 'number' && typeof e.due === 'string' &&
        (e.kind === 'recognize' || e.kind === 'goal' || e.kind === 'write') && typeof e.step === 'number')
    : [];
  const patterns = raw.patterns && typeof raw.patterns === 'object' ? raw.patterns : {};
  const completedDays = Array.isArray(raw.completedDays) ? raw.completedDays.filter((d) => typeof d === 'string') : [];
  return { queue, patterns: patterns as Record<string, PatternRecord>, completedDays };
}

/** Items due on or before `today`, oldest first. */
export function dueReviews(state: DailyState, today: string): ReviewEntry[] {
  return state.queue.filter((entry) => entry.due <= today).sort((a, b) => a.due.localeCompare(b.due));
}

function recognitionOptions(statement: PracticeStatement, rng: Rng): string[] {
  // Two distractors from OTHER families, so the warm-up mixes families.
  const others = shuffle(
    SUBCATEGORIES.filter((sub) => sub.category !== statement.category && sub.id !== statement.subcategory),
    rng,
  );
  const picked: string[] = [];
  for (const sub of others) {
    if (picked.length === 2) break;
    if (!picked.some((id) => SUBCATEGORIES.find((s) => s.id === id)?.category === sub.category)) picked.push(sub.id);
  }
  return shuffle([statement.subcategory, ...picked], rng);
}

function goalOptions(statement: PracticeStatement, rng: Rng): string[] {
  const [offGoal] = shuffle(OFF_GOAL_QUESTIONS, rng);
  // A real Meta Model question, but for a different pattern: plausible, off target.
  // Taken from another family, so it cannot also be a fair question for this sentence.
  const sibling = shuffle(
    SUBCATEGORIES.filter((sub) => sub.category !== statement.category),
    rng,
  )[0];
  const options = [statement.suggested_question, offGoal];
  if (sibling && sibling.question !== statement.suggested_question) options.push(sibling.question);
  return shuffle(options, rng);
}

function makeItem(statement: PracticeStatement, phase: DailyPhase, kind: DailyKind, rng: Rng, index: number): DailyItem {
  if (kind === 'recognize') {
    return { key: `${index}-${statement.id}-r`, phase, kind, statement, options: recognitionOptions(statement, rng), answer: statement.subcategory };
  }
  if (kind === 'goal') {
    return { key: `${index}-${statement.id}-g`, phase, kind, statement, options: goalOptions(statement, rng), answer: statement.suggested_question };
  }
  return { key: `${index}-${statement.id}-w`, phase, kind, statement, options: [], answer: statement.suggested_question };
}

/**
 * Build today's set: 3 recognitions from three different families, 2 goal
 * questions, 2 written questions, then 1 review (a due earlier miss, or one
 * more written question when nothing is due). No sentence repeats in a set.
 */
export function buildDailySet(
  statements: readonly PracticeStatement[],
  state: DailyState,
  today: string,
  rng: Rng = Math.random,
): DailyItem[] {
  const byId = new Map(statements.map((s) => [s.id, s]));
  const review = dueReviews(state, today).find((entry) => byId.has(entry.statementId));
  // Queued sentences come back only as reviews, on their own schedule.
  const used = new Set<number>(state.queue.map((entry) => entry.statementId));
  const usedPatterns = new Set<string>();
  const pool = shuffle(statements, rng);

  const take = (predicate: (s: PracticeStatement) => boolean): PracticeStatement | undefined => {
    const found = pool.find((s) => !used.has(s.id) && predicate(s)) ?? pool.find((s) => !used.has(s.id));
    if (found) { used.add(found.id); usedPatterns.add(found.subcategory); }
    return found;
  };

  const items: DailyItem[] = [];
  const families = new Set<string>();
  for (let i = 0; i < 3; i++) {
    const s = take((c) => !families.has(c.category));
    if (s) { families.add(s.category); items.push(makeItem(s, 'warmup', 'recognize', rng, items.length)); }
  }
  for (let i = 0; i < 2; i++) {
    const s = take((c) => !usedPatterns.has(c.subcategory));
    if (s) items.push(makeItem(s, 'goal', 'goal', rng, items.length));
  }
  for (let i = 0; i < 2; i++) {
    const s = take((c) => !usedPatterns.has(c.subcategory));
    if (s) items.push(makeItem(s, 'write', 'write', rng, items.length));
  }
  const reviewStatement = review ? byId.get(review.statementId) : undefined;
  if (review && reviewStatement) {
    items.push(makeItem(reviewStatement, 'review', review.kind, rng, items.length));
  } else {
    const s = take((c) => !usedPatterns.has(c.subcategory));
    if (s) items.push(makeItem(s, 'write', 'write', rng, items.length));
  }
  return items;
}

/** Record one answered item: pattern stats plus the review queue. */
export function recordDailyResult(
  state: DailyState,
  item: DailyItem,
  success: boolean,
  today: string,
): DailyState {
  const pattern = item.statement.subcategory;
  const prev = state.patterns[pattern] ?? { attempts: 0, hits: 0 };
  const patterns = { ...state.patterns, [pattern]: { attempts: prev.attempts + 1, hits: prev.hits + (success ? 1 : 0) } };
  const existing = state.queue.find((e) => e.statementId === item.statement.id);
  const rest = state.queue.filter((e) => e.statementId !== item.statement.id);
  let queue = rest;
  if (!success) {
    queue = [...rest, { statementId: item.statement.id, kind: item.kind, due: addDays(today, REVIEW_GAPS_DAYS[0]), step: 0 }];
  } else if (existing && item.phase === 'review') {
    const step = existing.step + 1;
    queue = step < REVIEW_GAPS_DAYS.length
      ? [...rest, { ...existing, step, due: addDays(today, REVIEW_GAPS_DAYS[step]) }]
      : rest;
  } else if (existing) {
    queue = [...rest, existing];
  }
  return { ...state, patterns, queue };
}

export function markDayComplete(state: DailyState, today: string): DailyState {
  if (state.completedDays.includes(today)) return state;
  return { ...state, completedDays: [...state.completedDays, today].slice(-60) };
}

/** A written answer counts as a hit only when the learner ticked the core point. */
export function writtenSuccess(text: string, checked: readonly boolean[]): boolean {
  return text.trim().length >= 3 && checked[0] === true;
}

export function loadDailyState(): DailyState {
  try {
    const raw = localStorage.getItem(DAILY_STORAGE_KEY);
    return raw ? normalizeDailyState(JSON.parse(raw)) : emptyDailyState();
  } catch {
    return emptyDailyState();
  }
}

export function saveDailyState(state: DailyState): boolean {
  try {
    localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
