export const CANONICAL_BREEN_ORDER = [
  'MR',
  'CEq',
  'CE',
  'PRE',
  'NOM',
  'LP',
  'UQ',
  'MN',
  'MP',
  'UV',
  'UN',
  'COMP',
  'DEL',
  'CTX',
  'VAK',
] as const;

export type CanonicalBreenCode = (typeof CANONICAL_BREEN_ORDER)[number];

// This is the single allowed visual layout for Breen categories in RTL mode.
export const CANONICAL_BREEN_GRID_RTL: ReadonlyArray<ReadonlyArray<CanonicalBreenCode>> = [
  ['MR', 'CEq', 'CE'],
  ['PRE', 'NOM', 'LP'],
  ['UQ', 'MN', 'MP'],
  ['UV', 'UN', 'COMP'],
  ['DEL', 'CTX', 'VAK'],
] as const;

export function orderBreenCategories<T extends CanonicalBreenCode>(codes: Iterable<T>): T[] {
  const allowed = new Set<T>(codes);
  return CANONICAL_BREEN_ORDER.filter((code): code is T => allowed.has(code as T));
}
