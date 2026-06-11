import type { MichaelHallDailyCard } from '../data/michaelHallDailyCards';

export interface MichaelHallImportedSource {
  rawTitle: string;
  rawDate?: string;
  rawSeries: string;
  /**
   * Private source text supplied by the user at import time.
   * This field must stay local-only and should not be committed as seeded app data.
   */
  rawBodyPrivate: string;
  extractedConcepts: MichaelHallExtractedConcept[];
  generatedCardDraft: MichaelHallGeneratedCardDraft;
}

export interface MichaelHallExtractedConcept {
  label: string;
  category: MichaelHallDailyCard['category'];
  summaryHe: string;
  practiceAngleHe: string;
}

export type MichaelHallGeneratedCardDraft = Omit<
  MichaelHallDailyCard,
  'id' | 'dayIndex' | 'sourceNoteHe'
> & {
  sourceNoteHe?: string;
};

export const MICHAEL_HALL_IMPORT_NOTICE_HE =
  'ייבוא עתידי מיועד לחומרים פרטיים של המשתמש בלבד. ברירת המחדל באפליקציה נשארת פרפרזות קצרות ותרגוליות.';
