import { describe, expect, it } from 'vitest';
import { resolveRoute } from './navigation';
const routes = [{ id: 'home', route: '#home' }, { id: 'categories', route: '#categories' }, { id: 'practice', route: '#practice' }];
describe('shared routes', () => {
  it('opens the category link supplied by the user', () => expect(resolveRoute('', '?tab=categories&v=1.0.52', routes)).toBe('categories'));
  it('gives an explicit valid fragment precedence', () => expect(resolveRoute('#practice', '?tab=categories', routes)).toBe('practice'));
  it('recovers from malformed and unknown routes', () => {
    expect(resolveRoute('#%E0%A4%A', '?tab=categories', routes)).toBe('categories');
    expect(resolveRoute('#unknown', '?tab=unknown', routes)).toBe('home');
  });
});
