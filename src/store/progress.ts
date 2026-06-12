// Pure progress/gamification logic. Persistence lives in useProgress.tsx.

export interface BadgeAward {
  id: string;
  name: string;
  icon: string;
  earned: string;
}

export interface UserProgress {
  xp: number;
  streak: number;
  badges: BadgeAward[];
  sessions: number;
  lastSessionDate: string | null;
}

export const STORAGE_KEY = 'userProgress'; // legacy key kept so users keep XP

export const XP_REWARDS = {
  trainerCorrect: 10,
  blueprintComplete: 20, // audit bug B1: was defined but never awarded
  prismComplete: 15, // audit bug B1: was defined but never awarded
  thoughtMapComplete: 12,
  thoughtRecordComplete: 12,
  beliefLensComplete: 10,
  realityExperimentPlanned: 12,
  realityExperimentReviewed: 15,
  activationActionCompleted: 8,
  cbtDrillCorrect: 5,
  cbtLessonCompleted: 6,
} as const;

export function emptyProgress(): UserProgress {
  return { xp: 0, streak: 0, badges: [], sessions: 0, lastSessionDate: null };
}

export function normalizeProgress(value: unknown): UserProgress {
  const empty = emptyProgress();
  if (!value || typeof value !== 'object') return empty;
  const v = value as Partial<UserProgress>;
  return {
    xp: typeof v.xp === 'number' ? v.xp : empty.xp,
    streak: typeof v.streak === 'number' ? v.streak : empty.streak,
    badges: Array.isArray(v.badges) ? v.badges : empty.badges,
    sessions: typeof v.sessions === 'number' ? v.sessions : empty.sessions,
    lastSessionDate:
      typeof v.lastSessionDate === 'string' ? v.lastSessionDate : null,
  };
}

export function todayISO(now: Date = new Date()): string {
  return now.toISOString().split('T')[0];
}

export function updateStreak(p: UserProgress, today: string): UserProgress {
  if (p.lastSessionDate === today) return p;
  let streak: number;
  if (p.lastSessionDate === null) {
    streak = 1;
  } else {
    const diff = Math.floor(
      (new Date(today).getTime() - new Date(p.lastSessionDate).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (diff === 1) streak = p.streak + 1;
    else if (diff > 1) streak = 1;
    else streak = p.streak;
  }
  return { ...p, streak, lastSessionDate: today };
}

interface BadgeRule {
  id: string;
  name: string;
  icon: string;
  condition: (p: UserProgress) => boolean;
}

const BADGE_RULES: BadgeRule[] = [
  { id: 'first_thought_map', name: 'מפת מחשבה ראשונה', icon: '🗺️', condition: (p) => p.xp >= 10 },
  { id: 'reality_checker', name: 'בודק מציאות', icon: '🔎', condition: (p) => p.xp >= 35 },
  { id: 'generalization_breaker', name: 'שובר הכללות', icon: '🧩', condition: (p) => p.xp >= 60 },
  { id: 'belief_architect', name: 'אדריכל אמונות', icon: '🏗️', condition: (p) => p.xp >= 90 },
  { id: 'action_before_mood', name: 'פעולה לפני חשק', icon: '▶️', condition: (p) => p.xp >= 120 },
  { id: 'ten_small_experiments', name: '10 ניסויים קטנים', icon: '🧪', condition: (p) => p.sessions >= 10 && p.xp >= 150 },
  { id: 'first_step', name: 'צעד ראשון', icon: '👣', condition: (p) => p.xp >= 10 },
  { id: 'fire_10', name: 'להט 🔥', icon: '🔥', condition: (p) => p.streak >= 10 },
  { id: 'xp_100', name: '100 XP', icon: '⭐', condition: (p) => p.xp >= 100 },
  { id: 'xp_500', name: '500 XP', icon: '✨', condition: (p) => p.xp >= 500 },
  { id: 'sessions_10', name: '10 סשנים', icon: '📊', condition: (p) => p.sessions >= 10 },
];

export function checkBadges(
  p: UserProgress,
  now: Date = new Date(),
): { progress: UserProgress; newBadges: BadgeAward[] } {
  const newBadges: BadgeAward[] = [];
  for (const rule of BADGE_RULES) {
    if (rule.condition(p) && !p.badges.some((b) => b.id === rule.id)) {
      newBadges.push({
        id: rule.id,
        name: rule.name,
        icon: rule.icon,
        earned: now.toISOString(),
      });
    }
  }
  if (newBadges.length === 0) return { progress: p, newBadges };
  return { progress: { ...p, badges: [...p.badges, ...newBadges] }, newBadges };
}

export function applyXP(
  p: UserProgress,
  amount: number,
  now: Date = new Date(),
): { progress: UserProgress; newBadges: BadgeAward[] } {
  const withXP = { ...p, xp: p.xp + amount };
  const withStreak = updateStreak(withXP, todayISO(now));
  return checkBadges(withStreak, now);
}

export function applySession(
  p: UserProgress,
  now: Date = new Date(),
): { progress: UserProgress; newBadges: BadgeAward[] } {
  const withSession = { ...p, sessions: p.sessions + 1 };
  const withStreak = updateStreak(withSession, todayISO(now));
  return checkBadges(withStreak, now);
}

export function nextMission(p: UserProgress): string {
  if (p.sessions === 0) return 'התחל תרגול אחד כדי לפתוח רצף למידה.';
  if (p.xp < 50) return 'צבור 50 XP דרך תרגול או Blueprint קצר.';
  if (p.badges.length === 0) return 'השלם עוד סשן כדי לקבל תג ראשון.';
  return 'בחר פריזמה או Blueprint כדי להעמיק את התרגול הבא.';
}
