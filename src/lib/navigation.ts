export interface RouteTarget { id: string; route: string }

// Retired duplicate routes keep working: an old link opens the screen it duplicated.
export const ROUTE_ALIASES: Readonly<Record<string, string>> = {
  'gforce-action-map': 'gforce-clinic',
};

// Old shared ?tab= links and current # routes resolve through the same registry.
// A malformed fragment must never crash the app.
export function resolveRoute(hash: string, search: string, targets: readonly RouteTarget[]): string {
  let fragment = '';
  try { fragment = decodeURIComponent(hash.replace(/^#/, '')); } catch { /* invalid link */ }
  const query = new URLSearchParams(search).get('tab') ?? '';
  const candidates = [fragment, query].map((id) => ROUTE_ALIASES[id] ?? id);
  return candidates.find((id) => targets.some((target) => target.id === id)) ?? 'home';
}
