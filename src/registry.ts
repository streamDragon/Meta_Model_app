import type { ComponentType } from 'react';
import { HomePage } from './features/home/HomePage';
import { CategoriesPage } from './features/categories/CategoriesPage';
import { TrainerPage } from './features/trainer/TrainerPage';
import { BlueprintPage } from './features/blueprint/BlueprintPage';
import { PrismLabPage } from './features/prismlab/PrismLabPage';
import { ValuesLabPage } from './features/valueslab/ValuesLabPage';
import { AboutPage } from './features/about/AboutPage';
import { MichaelHallDailyGym } from './components/MichaelHallDailyGym';
import { LegacyToolsPage } from './features/legacy/LegacyToolsPage';

export type Support = 'full' | 'partial' | 'none';
export type FeatureStatus = 'production' | 'beta' | 'prototype' | 'broken';
export type TheoryFamily =
  | 'meta-model'
  | 'logical-levels'
  | 'systemic-matrix'
  | 'prisms'
  | 'reframing'
  | 'anchors-habits'
  | 'sensory'
  | 'values-criteria'
  | 'dashboard';

export interface FeatureDef {
  id: string;
  title: string;
  shortDescription: string;
  theoryFamily: TheoryFamily;
  skillTrained: string;
  difficulty: 1 | 2 | 3;
  desktopSupport: Support;
  mobileSupport: Support;
  dataSource: string;
  route: string; // hash route, e.g. '#practice'
  component: ComponentType;
  status: FeatureStatus;
  sourceValidation: 'verified' | 'placeholder';
  navLabel: string;
  icon: string;
  inBottomNav: boolean;
  /** Copy for the graceful mobile fallback screen (used when mobileSupport === 'none'). */
  mobileFallback?: {
    why: string;
    stillCanDo: string;
  };
}

// Single source of truth for navigation, dashboard cards and (later)
// mobile fallback screens. Audit §8.3.
export const FEATURES: FeatureDef[] = [
  {
    id: 'home',
    title: 'בית',
    shortDescription: 'לוח התקדמות, משימה הבאה וכניסה מהירה לכל הכלים',
    theoryFamily: 'dashboard',
    skillTrained: 'ניווט והרגלי תרגול',
    difficulty: 1,
    desktopSupport: 'full',
    mobileSupport: 'full',
    dataSource: 'localStorage:userProgress',
    route: '#home',
    component: HomePage,
    status: 'production',
    sourceValidation: 'verified',
    navLabel: 'בית',
    icon: '🏠',
    inBottomNav: true,
  },
  {
    id: 'categories',
    title: 'קטגוריות',
    shortDescription: 'שלוש משפחות ההפרה: מחיקה, עיוות והכללה — עם דוגמאות ושאלות',
    theoryFamily: 'meta-model',
    skillTrained: 'הבנת מבנה ההפרות הלשוניות',
    difficulty: 1,
    desktopSupport: 'full',
    mobileSupport: 'full',
    dataSource: 'packs/meta-model-core.json#categories',
    route: '#categories',
    component: CategoriesPage,
    status: 'production',
    sourceValidation: 'verified',
    navLabel: 'קטגוריות',
    icon: '📚',
    inBottomNav: true,
  },
  {
    id: 'practice',
    title: 'תרגול',
    shortDescription: 'זיהוי מהיר של סוג ההפרה עם משוב מיידי ו-XP',
    theoryFamily: 'meta-model',
    skillTrained: 'זיהוי מחיקה / עיוות / הכללה',
    difficulty: 1,
    desktopSupport: 'full',
    mobileSupport: 'full',
    dataSource: 'packs/meta-model-core.json#practice_statements',
    route: '#practice',
    component: TrainerPage,
    status: 'production',
    sourceValidation: 'verified',
    navLabel: 'תרגול',
    icon: '🎯',
    inBottomNav: true,
  },
  {
    id: 'michael-hall-daily-gym',
    title: 'חדר אימון יומי - מייקל הול',
    shortDescription:
      'כרטיס יומי קצר של Neuro-Semantics: תמצית, שאלה, תרגילים, יישום והערות אישיות',
    theoryFamily: 'systemic-matrix',
    skillTrained: 'אימון יומי בחשיבה, משמעות ופתרון בעיות',
    difficulty: 2,
    desktopSupport: 'full',
    mobileSupport: 'full',
    dataSource: 'src/data/michaelHallDailyCards.ts',
    route: '#michael-hall-daily-gym',
    component: MichaelHallDailyGym,
    status: 'beta',
    sourceValidation: 'placeholder',
    navLabel: 'Michael Hall',
    icon: 'NS',
    inBottomNav: false,
  },
  {
    id: 'blueprint',
    title: 'Blueprint Builder',
    shortDescription: 'הפיכת כוונה עמומה לתוכנית ביצוע עם צעד ראשון ו-Plan B',
    theoryFamily: 'meta-model',
    skillTrained: 'הגדרת תוצאה ופירוק פעולה עמומה',
    difficulty: 2,
    desktopSupport: 'full',
    mobileSupport: 'partial',
    dataSource: 'packs/blueprint.json',
    route: '#blueprint',
    component: BlueprintPage,
    status: 'production',
    sourceValidation: 'verified',
    navLabel: 'Blueprint Builder',
    icon: '🏗️',
    inBottomNav: true,
  },
  {
    id: 'prismlab',
    title: 'מעבדת פריזמות',
    shortDescription: 'סריקת משפט דרך פריזמה והמלצת Pivot לפי חמש שכבות',
    theoryFamily: 'prisms',
    skillTrained: 'מיפוי דפוס לשכבות והמלצת התערבות',
    difficulty: 3,
    desktopSupport: 'full',
    mobileSupport: 'partial',
    // E/B/C/V/I scan is Dilts-style logical levels mislabeled "Breen" in the
    // legacy data — pending source validation (audit §4.2).
    dataSource: 'packs/prisms.json + packs/logical-levels.json',
    route: '#prismlab',
    component: PrismLabPage,
    status: 'beta',
    sourceValidation: 'placeholder',
    navLabel: 'מעבדת פריזמות',
    icon: '🔍',
    inBottomNav: true,
  },
  {
    id: 'valueslab',
    title: 'מעבדת ערכים ואילוצים',
    shortDescription: '"אני רוצה ___ אבל ___" — מיפוי אילוצים סמויים, התנגשויות ואבחון למה זה תקוע',
    theoryFamily: 'values-criteria',
    skillTrained: 'היררכיית קריטריונים וזיהוי קונפליקט ערכים',
    difficulty: 3,
    desktopSupport: 'full',
    mobileSupport: 'partial',
    dataSource: 'packs/values-constraints.json',
    route: '#valueslab',
    component: ValuesLabPage,
    status: 'beta',
    sourceValidation: 'verified',
    navLabel: 'מעבדת ערכים',
    icon: '💎',
    inBottomNav: false,
    mobileFallback: {
      why: 'מפת שתי הקומות המלאה צריכה מסך רחב; בנייד עובדים במצב אשף — כרטיס אחד בכל פעם.',
      stillCanDo: 'להוסיף ולערוך כרטיסים באשף, להריץ אבחון ולסקור סשנים שמורים.',
    },
  },
  {
    id: 'about',
    title: 'על הפרויקט',
    shortDescription: 'מה לומדים כאן, איך עובדים ומה הגבולות של הכלי',
    theoryFamily: 'dashboard',
    skillTrained: '—',
    difficulty: 1,
    desktopSupport: 'full',
    mobileSupport: 'full',
    dataSource: 'static',
    route: '#about',
    component: AboutPage,
    status: 'production',
    sourceValidation: 'verified',
    navLabel: 'על הפרויקט',
    icon: 'ℹ️',
    inBottomNav: false,
  },
  {
    id: 'legacy-tools',
    title: 'כלים שמורים',
    shortDescription: 'גישה לכלים הסטטיים הטובים שנשמרו מהגרסה הפרודקשנית בזמן המעבר ל-React',
    theoryFamily: 'dashboard',
    skillTrained: 'שימור תרגילים קיימים ובדיקת כלים שלא הוטמעו עדיין במעטפת החדשה',
    difficulty: 1,
    desktopSupport: 'full',
    mobileSupport: 'full',
    dataSource: 'legacy static html/js/data/assets restored from origin/main',
    route: '#legacy-tools',
    component: LegacyToolsPage,
    status: 'production',
    sourceValidation: 'verified',
    navLabel: 'כלים שמורים',
    icon: '🧰',
    inBottomNav: false,
  },
];

export function getFeature(id: string): FeatureDef | undefined {
  return FEATURES.find((f) => f.id === id);
}

export function isValidFeatureId(id: string): boolean {
  return FEATURES.some((f) => f.id === id);
}
