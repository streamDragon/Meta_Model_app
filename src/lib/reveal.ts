/**
 * Scroll an element into view on the page, keeping it clear of the sticky
 * mobile top bar and the fixed bottom nav. Plain `scrollIntoView` ignores both,
 * and `block: 'nearest'` often does not move at all on a phone.
 *
 * align 'start': put the element's top just under the top bar.
 * align 'end': if the element fits, bring its bottom just above the bottom nav
 * (no-op when already fully visible); otherwise fall back to 'start'.
 * extraTop: height of any page-level sticky block that also covers the top.
 */
export function revealElement(
  el: HTMLElement | null | undefined,
  align: 'start' | 'end' = 'start',
  extraTop = 0,
): void {
  if (!el || typeof window === 'undefined' || typeof window.scrollTo !== 'function') return;
  const fixedHeight = (selector: string, positions: string[]) => {
    const node = document.querySelector<HTMLElement>(selector);
    if (!node) return 0;
    const style = getComputedStyle(node);
    return positions.includes(style.position) && style.display !== 'none' ? node.offsetHeight : 0;
  };
  const topH = fixedHeight('.mobile-topbar', ['sticky', 'fixed']) + extraTop;
  const navH = fixedHeight('.bottom-nav', ['fixed']);
  const rect = el.getBoundingClientRect();
  const visibleBottom = window.innerHeight - navH;
  let top = window.scrollY + rect.top - topH - 12;
  if (align === 'end' && rect.height <= visibleBottom - topH - 24) {
    if (rect.top >= topH && rect.bottom <= visibleBottom) return;
    top = window.scrollY + rect.bottom - visibleBottom + 12;
  }
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}
