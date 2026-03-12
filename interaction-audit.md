# Interaction Audit

## Scope

Audit date: 2026-03-12  
Project: `Meta_Model_app`  
Mode: audit first, no code changes before documentation

## Sources Used

- Static review of:
  - `index.html`
  - `js/app.js`
  - `js/onboarding.js`
  - `js/nav-map.js`
  - `js/trainer-standalone.js`
  - `js/trainer-platform-contracts.js`
  - `css/style.css`
  - `css/ui-enhancements.css`
- Existing automation:
  - `npm run audit:nav`
  - `npm run test:shell-smoke`
  - `npm run test:mobile`
- Additional Playwright spot checks run during audit:
  - home at widths `320 / 360 / 375 / 390 / 412 / 768 / 1024 / 1440`
  - key tabs at mobile width `390`

## What Is Actually Broken

### P0 - Click blocker: onboarding overlay still intercepts clicks after close

Evidence:

- `npm run test:shell-smoke` fails because:
  - `.mm-ob-backdrop` from `#mm-onboarding` intercepts pointer events.
- Reproduced in direct Playwright checks on desktop and mobile.
- Reproduced even after completing the onboarding flow.

Root cause:

- `#mm-onboarding` uses the native `hidden` attribute in markup and JS.
- `css/ui-enhancements.css` sets `.mm-onboarding { display: flex; ... }`.
- There is no explicit rule restoring `display: none` for `.mm-onboarding[hidden]`.
- Result: the UA `hidden` behavior is overridden, so the overlay remains mounted and hit-testable even when JS sets `overlay.hidden = true`.

Impact:

- Desktop primary CTAs appear dead.
- Home shell actions appear dead.
- Tab/button clicks can fail anywhere under the overlay.
- This is the main reason the app feels "not clickable".

### P0 - First-run flow blocks the app too aggressively

Evidence:

- On widths `320-1440`, after ~4.2s the onboarding appears above the home screen.
- The main CTA center point resolves to onboarding elements, not the actual button below.

Root cause:

- The onboarding is intentionally modal, but:
  - there is no early dismiss option on steps 1-2
  - the whole app is blocked before the user can use any visible home CTA
- Combined with the hidden-state bug above, the block persists longer than intended.

Impact:

- New users can perceive the app as frozen or broken.
- Desktop clickability complaints are fully consistent with this behavior.

### P0 - Mobile sticky CTA overlaps floating audio controls on some tabs

Evidence:

- Mobile runtime checks at `390px` show overlap on:
  - `practice-wizard`
  - `blueprint`
- `stickyCoveredByAudio: true` in both cases.

Root cause:

- Sticky CTA visibility is toggled in `updateMobileStickyCta()`.
- The floating audio safe zone is calculated by `getFloatingAudioBottomOffsetPx()`.
- But `setMobileStickyCtaVisibility()` does not sync the audio safe zone after sticky CTA state changes.
- Result: floating controls can remain docked in the same bottom-right area while the sticky CTA is shown.

Impact:

- Important mobile actions can be partially blocked or visually crowded.
- This matches the reported "phone display broke" symptom more than a global layout collapse.

## High Priority Findings

### P1 - Existing shell smoke is already failing

Evidence:

- `npm run test:shell-smoke` currently fails before any functional shell verification completes.

Meaning:

- The current app does not meet baseline interaction reliability.
- Fixing the onboarding blocker should be the first move before debugging smaller CTA issues.

### P1 - Navigation audit reports two broken main-menu CTAs

Evidence from `npm run audit:nav`:

- `candidates=108`
- `ok=26`
- `broken=2`
- `mainMenuBroken=2`

Broken items:

- desktop home feature card CTA for `practice-question`
- desktop home primary CTA for `practice-question`

Interpretation:

- These are not missing handlers.
- They are blocked by the onboarding layer intercepting clicks.

### P1 - Audio control behavior is inconsistent across tabs on mobile

Observed:

- On some tabs the audio controls are repositioned away from the sticky CTA.
- On others they remain overlapping or appear in inconsistent coordinates.

Interpretation:

- The floating control safe-zone logic exists, but its lifecycle is incomplete.
- After P0 fixes, this needs a deterministic re-sync whenever tab/viewport/sticky state changes.

## Medium Priority Findings

### P2 - No major horizontal overflow reproduced on audited widths

Observed:

- Home at `320 / 360 / 375 / 390 / 412 / 768 / 1024 / 1440` did not show major horizontal overflow.
- Key tabs at mobile width `390` also stayed within viewport width in audit checks.

Conclusion:

- The mobile issue is not a broad `overflow-x` collapse.
- The more likely problems are:
  - blocked controls
  - bottom-right overlap
  - tall screens where primary actions are far below the fold

### P2 - Standalone trainer pages are minimal wrappers, not the direct source of the dead-click bug

Observed:

- Files such as `classic_classic_trainer.html` and `scenario_trainer.html` boot through `js/trainer-standalone.js`.
- Back/home navigation is injected by `js/trainer-platform-contracts.js`, not hardcoded in each raw HTML file.

Conclusion:

- The main desktop click failure is in the primary app shell, not in standalone wrappers.
- Standalone pages still deserve follow-up QA, but they are not P0 for this bug report.

### P2 - Bootstrap request aborts appear in nav audit but are not the primary blocker

Observed:

- `audit:nav` shows temporary `net::ERR_ABORTED` on freemium and supabase-related scripts during bootstrap.

Interpretation:

- These requests later return `200` in the same report.
- This looks like transient Vite/bootstrap churn, not the root cause of dead home CTAs.

## Fix Order

1. Restore true hidden behavior for onboarding and stop it from intercepting clicks when closed.
2. Add a clear early exit path for onboarding so first-run users are not trapped behind it.
3. Re-run shell smoke and nav audit.
4. Fix sticky CTA / floating audio overlap on mobile.
5. Add runtime tests for:
   - onboarding closed state
   - home CTA clickability after onboarding
   - sticky CTA vs floating controls on mobile

## Remaining Risks After P0/P1

- Some tabs may still have tab-specific interaction regressions hidden behind the onboarding blocker.
- Mobile screens may still feel too long or too dense even if technically valid.
- Copy encoding issues still exist in some files, but they are not the main interaction blocker in this pass.
