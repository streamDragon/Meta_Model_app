export type UiMode = 'legacy' | 'shell';

export interface ScreenUiFlag {
  id: string;
  path: string;
  title: string;
  defaultUiMode: UiMode;
  overlayPanels?: string[];
  aliases?: string[];
  notes?: string;
}

export const UI_FLAG_REGISTRY: Record<string, ScreenUiFlag> = {
  home: { id: 'home', path: '?tab=home', title: 'Home Hub', defaultUiMode: 'legacy', overlayPanels: ['help', 'about'] },
  'practice-question': {
    id: 'practice-question',
    path: '?tab=practice-question',
    title: 'Questions',
    defaultUiMode: 'legacy',
    overlayPanels: ['settings', 'help', 'history', 'stats'],
  },
  'practice-radar': {
    id: 'practice-radar',
    path: '?tab=practice-radar',
    title: 'Meta Radar',
    defaultUiMode: 'legacy',
    overlayPanels: ['settings', 'help', 'history', 'stats'],
  },
  'practice-triples-radar': {
    id: 'practice-triples-radar',
    path: '?tab=practice-triples-radar',
    title: 'Triples Radar',
    defaultUiMode: 'legacy',
    overlayPanels: ['settings', 'help', 'history', 'stats'],
  },
  'practice-wizard': {
    id: 'practice-wizard',
    path: '?tab=practice-wizard',
    title: 'Bridge / SQHCEL',
    defaultUiMode: 'legacy',
    aliases: ['bridge'],
    overlayPanels: ['settings', 'help', 'history', 'stats'],
  },
  'practice-verb-unzip': {
    id: 'practice-verb-unzip',
    path: '?tab=practice-verb-unzip',
    title: 'Unspecified Verb',
    defaultUiMode: 'shell',
    aliases: ['unspecified-verb', 'unzip'],
    overlayPanels: ['settings', 'help', 'history', 'stats', 'import-export'],
    notes: 'Initial migration target',
  },
  prismlab: {
    id: 'prismlab',
    path: '?tab=prismlab',
    title: 'Prism Lab',
    defaultUiMode: 'legacy',
    overlayPanels: ['settings', 'help', 'history', 'stats'],
  },
  blueprint: {
    id: 'blueprint',
    path: '?tab=blueprint',
    title: 'Blueprint Builder',
    defaultUiMode: 'legacy',
    overlayPanels: ['help', 'history', 'schema', 'import-export'],
  },
  'scenario-trainer': {
    id: 'scenario-trainer',
    path: '?tab=scenario-trainer',
    title: 'Scenes / Execution',
    defaultUiMode: 'shell',
    aliases: ['scenes', 'execution'],
    overlayPanels: ['setup', 'settings', 'history', 'decomposition', 'action-map', 'blueprint', 'diagnostics'],
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
