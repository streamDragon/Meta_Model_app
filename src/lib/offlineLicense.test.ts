import { describe, expect, it, vi } from 'vitest';
import { featureIsFree, hasLicense, savedKeys, verifyLicense } from './offlineLicense';
describe('offline license access', () => {
  it('keeps daily practice available without keys', () => {
    expect(featureIsFree('home')).toBe(true);
    expect(featureIsFree('conversation')).toBe(true);
    expect(featureIsFree('practice')).toBe(false);
    expect(featureIsFree('prismlab')).toBe(false);
  });
  it('unlocks only the selected paid feature, or all', () => {
    const license = {v:1,id:'a',device:'*',issuedAt:1,expiresAt:9999999999999,features:['practice']};
    expect(hasLicense([license],'practice')).toBe(true);
    expect(hasLicense([license],'prismlab')).toBe(false);
    expect(hasLicense([{...license,features:['all']}],'prismlab')).toBe(true);
  });
  it('rejects malformed and unsigned keys', async () => {
    await expect(verifyLicense('hello')).rejects.toThrow('פורמט');
    await expect(verifyLicense('WKEY1.invalid.invalid')).rejects.toThrow();
  });
  it('handles storage failures without blocking free use', () => {
    vi.stubGlobal('localStorage',{getItem(){throw Error('blocked');}});
    expect(savedKeys()).toEqual([]);
    vi.unstubAllGlobals();
  });
});
