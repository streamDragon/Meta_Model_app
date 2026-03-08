import TRAINER_PLATFORM_CONTRACTS from './generatedTrainerContracts';

export interface TrainerHelperStepContract {
  title: string;
  description: string;
}

export interface TrainerProcessStepContract {
  id: string;
  label: string;
  description: string;
  shortLabel?: string;
}

export interface TrainerStandaloneBootContract {
  htmlFile?: string;
  manifestKey?: string;
  bundlePath?: string;
  buildMetaGlobalKey?: string;
  assetVersionGlobalKey?: string;
  css?: ReadonlyArray<string>;
  scripts?: ReadonlyArray<string>;
}

export interface TrainerStandaloneWrapperContract {
  pageTitle: string;
  mountId: string;
  loadingTitle: string;
  loadingText: string;
  errorTitle: string;
  navLinks: ReadonlyArray<{ href: string; label: string }>;
  accent?: {
    primary?: string;
    border?: string;
    glow?: string;
    background?: string;
  };
  standalone?: TrainerStandaloneBootContract;
}

export interface TrainerPlatformContract {
  id: string;
  title: string;
  subtitle: string;
  familyLabel: string;
  quickStartLabel: string;
  startActionLabel: string;
  settingsTitle: string;
  settingsSubtitle: string;
  helperSteps: ReadonlyArray<TrainerHelperStepContract>;
  processSteps?: ReadonlyArray<TrainerProcessStepContract>;
  supportRailMode?: string;
  settingsGroups?: ReadonlyArray<string>;
  mobilePriorityOrder?: ReadonlyArray<string>;
  wrapper: TrainerStandaloneWrapperContract;
}

export type TrainerPlatformContractMap = Record<string, TrainerPlatformContract>;

declare global {
  interface Window {
    MetaTrainerPlatformContracts?: Record<string, TrainerPlatformContract>;
  }
}

const UNKNOWN_TRAINER_DEFAULTS: Omit<TrainerPlatformContract, 'id' | 'title' | 'wrapper'> = {
  subtitle: '',
  familyLabel: '',
  quickStartLabel: 'מתחילים',
  startActionLabel: 'התחל',
  settingsTitle: 'הגדרות',
  settingsSubtitle: '',
  helperSteps: [],
  processSteps: [],
  supportRailMode: 'default',
  settingsGroups: [],
  mobilePriorityOrder: ['start', 'purpose', 'helper-steps', 'main', 'support']
};

export const trainerPlatformContracts: TrainerPlatformContractMap = TRAINER_PLATFORM_CONTRACTS;

export function getTrainerContract(id: string): TrainerPlatformContract {
  const key = String(id || '').trim();
  const runtimeContracts = typeof window !== 'undefined' ? window.MetaTrainerPlatformContracts : null;
  if (runtimeContracts?.[key]) {
    return runtimeContracts[key];
  }
  if (trainerPlatformContracts[key]) {
    return trainerPlatformContracts[key];
  }
  return {
    id: key,
    title: key,
    ...UNKNOWN_TRAINER_DEFAULTS,
    wrapper: {
      pageTitle: key,
      mountId: 'trainer-root',
      loadingTitle: 'טוען...',
      loadingText: '',
      errorTitle: 'שגיאה בטעינה',
      navLinks: []
    }
  };
}
