// Offline licenses are enabled only in explicitly configured offline builds.
// This is a piracy deterrent, not tamper-proof DRM: a modified APK can bypass JavaScript.
export const OFFLINE_LICENSE_MODE = import.meta.env.VITE_OFFLINE_LICENSE_MODE === 'true';
const STORAGE_KEY = 'wisdom.offline.licenses.v1';
const CLOCK_KEY = 'wisdom.offline.last-seen.v1';
const DEVICE_KEY = 'wisdom.offline.device.v1';
const PUBLIC_SPKI = 'MCowBQYDK2VwAyEAi42pZMVMFe//Ba9oZvQQdCYyvYMCzP6yXsX4L0qcB9I=';
export type LicenseBody = { v: number; id: string; device: string; features: string[]; issuedAt: number; expiresAt: number; buyer?: string };
function bytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i=0;i<raw.length;i++) out[i] = raw.charCodeAt(i);
  return out;
}
export function deviceCode(): string {
  try {
    let code = localStorage.getItem(DEVICE_KEY);
    if (!code) {
      code = Array.from(crypto.getRandomValues(new Uint8Array(8)), n => n.toString(16).padStart(2,'0')).join('').toUpperCase();
      localStorage.setItem(DEVICE_KEY, code);
    }
    return code;
  } catch { return 'UNAVAILABLE'; }
}
function currentTime(): number {
  const now = Date.now();
  try {
    const last = Number(localStorage.getItem(CLOCK_KEY) || 0);
    if (now >= last) localStorage.setItem(CLOCK_KEY,String(now));
    return Math.max(now,last);
  } catch { return now; }
}
export function savedKeys(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value.filter((v):v is string => typeof v === 'string') : [];
  } catch { return []; }
}
export async function verifyLicense(key: string): Promise<LicenseBody> {
  const parts = key.trim().split('.');
  if (parts.length !== 3 || parts[0] !== 'WKEY1') throw Error('פורמט מפתח לא תקין');
  const [_,payload,signature] = parts;
  if (!globalThis.crypto?.subtle) throw Error('המכשיר אינו תומך באימות מפתחות');
  let body: LicenseBody;
  try { body = JSON.parse(new TextDecoder().decode(bytes(payload))); }
  catch { throw Error('נתוני המפתח פגומים'); }
  if (body.v !== 1 || typeof body.id !== 'string' || !Array.isArray(body.features) ||
      !body.features.every(f => typeof f === 'string') ||
      !Number.isFinite(body.issuedAt) || !Number.isFinite(body.expiresAt)) throw Error('נתוני המפתח לא תקינים');
  const publicKey = await crypto.subtle.importKey('spki',bytes(PUBLIC_SPKI),'Ed25519',false,['verify']);
  const valid = await crypto.subtle.verify('Ed25519',publicKey,bytes(signature),new TextEncoder().encode(payload));
  if (!valid) throw Error('חתימת המפתח אינה תקינה');
  if (body.device !== '*' && body.device !== deviceCode()) throw Error('המפתח מיועד למכשיר אחר');
  if (body.issuedAt > currentTime() + 86400000) throw Error('תאריך המפתח אינו תקין');
  if (body.expiresAt <= currentTime()) throw Error('תוקף המפתח הסתיים');
  return body;
}
export async function activateLicense(key: string): Promise<LicenseBody> {
  const body = await verifyLicense(key);
  const existing = savedKeys();
  if (!existing.includes(key.trim())) localStorage.setItem(STORAGE_KEY,JSON.stringify([...existing,key.trim()]));
  window.dispatchEvent(new Event('wisdom-license-changed'));
  return body;
}
export async function getActiveLicenses(): Promise<LicenseBody[]> {
  const results = await Promise.all(savedKeys().map(async key => {
    try { return await verifyLicense(key); } catch { return null; }
  }));
  return results.filter((x): x is LicenseBody => !!x);
}
export function featureIsFree(featureId: string): boolean {
  return ['home','categories','conversation','about','legacy-tools','michael-hall-daily-gym'].includes(featureId);
}
export function hasLicense(licenses: LicenseBody[], featureId: string): boolean {
  return licenses.some(l => l.features.includes('all') || l.features.includes(featureId));
}
