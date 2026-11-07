# WISDOM KEY: Offline distribution (pilot)

This feature is **opt-in**. Build with `npm run build:offline` to turn on offline feature gating. Normal online builds remain unchanged. The current output is a web application bundle, **not an APK**. An Android WebView/Capacitor wrapper and actual-device testing are required before distribution.

## Model
- Free: home, categories, conversation/daily drill, about, legacy resources, Michael Hall daily gym.
- Paid: all other registry feature IDs; one signed key per category or 'all'.
- An offline license contains feature IDs, issued/expiry timestamps and optional device binding.
- Verify Ed25519 signatures with embedded public key. Private issuer key stays outside the repository in the seller's `~/.wisdom-licenses/issuer-private.pem`.
- Keep the original Android package identity and signing certificate across updates, or offline local storage may be lost.
- An update to content is a separate package; issuing keys does not modify exercises.
- Educate users that a key only unlocks exercises already present in the installed version.

## Seller workflow (Node.js on seller computer)
```shell
node scripts/wisdom-issue-license.mjs --public
node scripts/wisdom-issue-license.mjs DEVICECODE practice 7
node scripts/wisdom-issue-license.mjs DEVICECODE all 30
```
The printed `WKEY1...` token is supplied on paper or saved as `.wkey` text file on USB. A buyer reads the device code from the locked category and shares it with the seller; no network needed on the buyer device. Seller computer also works without internet.

## Important risks and missing production steps
- Do not lose or disclose issuer-private.pem. Back it up securely, off the buyer device.
- Browser `localStorage` is not robust license/device storage; clear-data or reinstall can change device ID and erase keys. A native Android wrapper should store a stable install ID and persistent license data with appropriate backup/recovery handling.
- User can set the clock forward and invalidate a key; restoring the clock does **not** revive it. A fully offline device cannot enforce wall-clock expiry perfectly. Offer seller renewal/recovery for clock issues.
- A modified client can bypass all client-side checks. This is convenience-oriented licensing, not unbreakable DRM.
- Code strings are long; USB import is preferred. For a compact printable code, later implement an optimized binary token with checksum.
- No native Android project/SDK was found in this React repo; an APK has **not** been built.
- No new content packs or offline content update importer have been implemented in this pilot.
