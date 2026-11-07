import type { ResponseQuality } from '../data/conversationSkills';

/**
 * A reversible illustration of momentum in a fictional dialogue.
 * It is NOT a validated relationship score or an estimate of a real person's emotions.
 */
export const STARTING_CONNECTION = 50;
export const MOMENTUM_DELTA: Record<ResponseQuality, number> = {
  helpful: 16,
  mixed: -6,
  unhelpful: -20,
};
export const REPAIR_DELTA = 14;

export function applyConversationMove(score: number, quality: ResponseQuality): number {
  return Math.max(8, Math.min(92, score + MOMENTUM_DELTA[quality]));
}

export function applyRepair(score: number): number {
  return Math.max(8, Math.min(92, score + REPAIR_DELTA));
}

export function connectionDescription(score: number): string {
  if (score < 38) return 'התרחקות בדוגמה';
  if (score > 62) return 'התקרבות בדוגמה';
  return 'הקשר עדיין בתנועה';
}

export function illustratedEmotion(quality: ResponseQuality): { icon: string; label: string } {
  if (quality === 'helpful') return { icon: '🌤️', label: 'נפתח מעט' };
  if (quality === 'mixed') return { icon: '🌥️', label: 'מהסס' };
  return { icon: '🌧️', label: 'נסגר מעט' };
}
