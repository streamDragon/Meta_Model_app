export type UiMode = 'legacy' | 'shell';

export interface ScreenUiFlag {
  id: string;
  path: string;
  title: string;
  defaultUiMode: UiMode;
  notes?: string;
}

export const UI_FLAG_REGISTRY: Record<string, ScreenUiFlag> = {
  home: { id: 'home', path: '?tab=home', title: 'Home', defaultUiMode: 'legacy' },
  'practice-question': {
    id: 'practice-question',
    path: '?tab=practice-question',
    title: 'Question Drill',
    defaultUiMode: 'legacy',
  },
  'practice-radar': {
    id: 'practice-radar',
    path: '?tab=practice-radar',
    title: 'Meta Radar',
    defaultUiMode: 'legacy',
  },
  'practice-triples-radar': {
    id: 'practice-triples-radar',
    path: '?tab=practice-triples-radar',
    title: 'Triples Radar',
    defaultUiMode: 'legacy',
  },
  'practice-wizard': {
    id: 'practice-wizard',
    path: '?tab=practice-wizard',
    title: 'SQHCEL Wizard',
    defaultUiMode: 'legacy',
  },
  'practice-verb-unzip': {
    id: 'practice-verb-unzip',
    path: '?tab=practice-verb-unzip',
    title: 'Unspecified Verb',
    defaultUiMode: 'shell',
    notes: 'Initial migration target',
  },
  prismlab: { id: 'prismlab', path: '?tab=prismlab', title: 'Prism Lab', defaultUiMode: 'legacy' },
  blueprint: { id: 'blueprint', path: '?tab=blueprint', title: 'Blueprint', defaultUiMode: 'legacy' },
  'scenario-trainer': {
    id: 'scenario-trainer',
    path: '?tab=scenario-trainer',
    title: 'Scenario Trainer',
    defaultUiMode: 'legacy',
  },
};

const VALID_UI_MODES: UiMode[] = ['legacy', 'shell'];

export function normalizeUiMode(mode: string | null | undefined): UiMode | '' {
  const value = String(mode || '').trim().toLowerCase() as UiMode;
  return VALID_UI_MODES.includes(value) ? value : '';
}

export function resolveUiMode(
  screenId: string,
  locationSearch: string,
  devOverride?: Partial<Record<string, UiMode>> | UiMode | null
): UiMode {
  const defaultMode = UI_FLAG_REGISTRY[screenId]?.defaultUiMode || 'legacy';
  const queryMode = normalizeUiMode(new URLSearchParams(locationSearch).get('ui'));
  if (queryMode) return queryMode;

  if (typeof devOverride === 'string') {
    const normalized = normalizeUiMode(devOverride);
    if (normalized) return normalized;
  }

  if (devOverride && typeof devOverride === 'object') {
    const specific = normalizeUiMode(devOverride[screenId]);
    if (specific) return specific;
    const global = normalizeUiMode(devOverride['*']);
    if (global) return global;
  }

  return defaultMode;
}
