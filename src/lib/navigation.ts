export interface RouteTarget { id: string; route: string }

// Old shared ?tab= links and current # routes resolve through the same registry.
// A malformed fragment must never crash the app.
export function resolveRoute(hash: string, search: string, targets: readonly RouteTarget[]): string {
  let fragment = '';
  try { fragment = decodeURIComponent(hash.replace(/^#/, '')); } catch { /* invalid link */ }
  const query = new URLSearchParams(search).get('tab') ?? '';
  return [fragment, query].find((id) => targets.some((target) => target.id === id)) ?? 'home';
}
