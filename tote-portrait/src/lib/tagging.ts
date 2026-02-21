export interface TaggingResult {
  tags: string[];
  suggestedSlotId: number;
  confidence: number;
  cueStats: Record<number, number>;
}

const CUE_RULES: Array<{ regex: RegExp; tags: string[]; slotScores: number[] }> = [
  { regex: /(כש|בכל פעם|בבית|בעבודה|אתמול|היום|מחר|\d{1,2}:\d{2})/g, tags: ['Trigger', 'Context', 'Episode'], slotScores: [1, 2] },
  { regex: /(לפני|רגע לפני|שנייה לפני|מיד לפני)/g, tags: ['Precipitating', 'Trigger', 'Episode'], slotScores: [2] },
  { regex: /(רואה|שומע|מרגיש|בוהה|לא כתבתי|סימן|עדות)/g, tags: ['Evidence', 'Test', 'Sensory'], slotScores: [3] },
  { regex: /(פותח|קורא|הולך|מסתכל|דוחה|כותב|מדבר|שואל|מכין)/g, tags: ['Step', 'Operate', 'Action'], slotScores: [4, 5, 6] },
  { regex: /(כי|אז|לכן|אם.*אז)/g, tags: ['Link', 'BeliefCandidate'], slotScores: [7] },
  { regex: /(תמיד|אף פעם|כולם|שום דבר|אין סיכוי)/g, tags: ['Generalization', 'BeliefCandidate'], slotScores: [7] },
  { regex: /(לחץ|כאב|דופק|כיווץ|חום|קור|חנק)/g, tags: ['Body', 'Auto', 'Emotion'], slotScores: [8] },
  { regex: /(טיפש|כישלון|אפס|גרוע|לא שווה)/g, tags: ['Identity', 'Belief'], slotScores: [7] },
  { regex: /(יציאה|התקדמות|מינימלית|הצלחתי|סיימתי|דראפט)/g, tags: ['Exit', 'Outcome', 'Criterion'], slotScores: [9] },
];

const clamp = (value: number, min = 0, max = 100): number => Math.max(min, Math.min(max, value));

export const isUnknownAnswer = (text: string): boolean => {
  const clean = text.trim();
  return clean === '' || /לא יודע|לא יודעת|אין לי מושג|לא בטוח/.test(clean);
};

export const inferTagsAndConfidence = (text: string, suggestedSlotId: number): TaggingResult => {
  const clean = text.trim();
  const tagsSet = new Set<string>();
  const cueStats: Record<number, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
    8: 0,
    9: 0,
  };

  for (const rule of CUE_RULES) {
    if (!rule.regex.test(clean)) {
      continue;
    }

    rule.tags.forEach((tag) => tagsSet.add(tag));
    rule.slotScores.forEach((slotId) => {
      cueStats[slotId] = (cueStats[slotId] ?? 0) + 1;
    });
  }

  const slotEntries = Object.entries(cueStats).map(([slot, score]) => [Number(slot), score] as const);
  const [bestSlotId, bestSlotScore] = slotEntries.reduce(
    (best, current) => {
      if (current[1] > best[1]) {
        return current;
      }
      return best;
    },
    [suggestedSlotId, 0] as const,
  );

  let confidence = 60;
  if ((cueStats[suggestedSlotId] ?? 0) >= 2) {
    confidence += 10;
  }
  if (bestSlotScore >= 2 && bestSlotId === suggestedSlotId) {
    confidence += 5;
  }
  if (isUnknownAnswer(clean) || clean.length < 8) {
    confidence -= 15;
  }

  return {
    tags: [...tagsSet],
    suggestedSlotId: bestSlotScore > 0 ? bestSlotId : suggestedSlotId,
    confidence: clamp(confidence),
    cueStats,
  };
};

