# UI Shell Migration Inventory (Meta_Model_app)

Last updated: 2026-03-07

## Diagnosis summary

- Working before this wave
  - Shared overlay root/provider already handled focus trap, ESC, backdrop close, history back-close, scroll lock/restore, and mobile sheet behavior.
  - `home`, `practice-verb-unzip`, and `scenario-trainer` already had meaningful shell behavior.
- Inconsistent before this wave
  - Major training screens still mixed compact workspaces with large inline help/history/theory surfaces.
  - Visible copy was still mixed Hebrew/English across shell titles, feature labels, buttons, and helper text.
  - Resume behavior remembered only the last tab, not the last meaningful panel/work state.
  - `js/app-shell.js`, `js/app.js`, and `css/style.css` carried growing maintenance risk from scattered assumptions and broad selectors.
- Migrated in this coordinated wave
  - `practice-question`
  - `practice-radar`
  - `practice-triples-radar`
  - `practice-wizard`
  - `comic-engine`
  - `categories`
  - `blueprint`
  - `prismlab`
  - `about`
- Normalized globally
  - Explicit shell registry for screen contracts.
  - Central Hebrew-first shell copy map.
  - One continue/resume strategy on top of existing per-feature state.
  - Overlay-first secondary surfaces across major shell screens.
  - Reduced-motion and mobile overflow normalization for shell/overlay surfaces.
- Intentionally still inline
  - The primary learning/work loop of each screen remains inline: question drill, radar arena, triples arena, SQHCEL flow, verb workspace, scenario play/feedback loop, comic simulator, blueprint builder, prism lab workspace, and the compact home hub.

## Shell-first screens

- `home`
  - Compact hub stays inline.
  - `תפריט`, `על המוצר`, and `עזרה` open in overlay.
  - Home exposes a single continue action for the last meaningful screen/panel.
- `practice-question`
  - Drill loop remains inline.
  - Session stats/help move to overlay-first access.
- `practice-radar`
  - Live radar arena remains inline.
  - Round help, cumulative feedback, and explanation move to overlay.
- `practice-triples-radar`
  - Live triples work surface remains inline.
  - Breen/reference material moves to overlay.
- `practice-wizard`
  - SQHCEL/bridge workflow remains inline.
  - Method/help surfaces move to overlay.
- `practice-verb-unzip`
  - Verb workspace and embed remain inline.
  - Settings/help/stats are overlay-first.
- `scenario-trainer`
  - Play/feedback/score remain inline.
  - Setup/history/blueprint/settings route through overlay.
- `comic-engine`
  - Simulator workspace remains inline.
  - Intro/help surfaces move to overlay.
- `categories`
  - Main glossary workspace remains inline.
  - Intro/guidance moves to overlay.
- `blueprint`
  - Builder workspace remains inline.
  - Export/help surfaces move to overlay.
- `prismlab`
  - Lab workspace remains inline.
  - Deep guide/export move to overlay.
- `about`
  - Opens cleanly as its own shell screen and from home overlay without turning home into a long content dump.

## Shared foundation

- Shell contract / registry
  - `js/shell-screen-registry.js` is the central screen registry.
  - Each shell screen declares `id`, adapter type, container/workspace selectors, inline surfaces to hide in shell mode, and supported overlay panels.
- Shared copy
  - `js/shell-copy.js` centralizes Hebrew-first shell titles, labels, actions, groups, and panel names.
- Shared shell runtime
  - `js/app-shell.js` owns screen bootstrap, registry lookup, generic shell mounting, overlay launchers, continue helpers, metrics/footer rendering, and entry overlay scheduling.
- Shared overlay root
  - `js/app-overlay.js` remains the single overlay provider/root.
  - Focus return, ESC/backdrop close, history back-close, and mobile sheet behavior remain shared instead of per-screen hacks.

## Persistence strategy

- `localStorage`
  - `meta_shell_continue_v1`
    - Stores the last meaningful shell target: `screenId`, `screenTitle`, `panelId`, `panelTitle`, and `at`.
    - Keeps the last panel only while staying on the same screen; switching screens clears stale deep-panel restoration.
  - `meta_home_last_tab_v1`
    - Legacy fallback for basic last-tab resume.
- `sessionStorage`
  - `verb_unzip_shell_session_started_v1`
  - `verb_unzip_shell_wizard_seen_v1`
  - `scenario_shell_setup_seen_v1`
  - These keep first-entry setup/wizard overlays scoped to the current browser session.
- Safety rules
  - Continue is navigation-safe by default and restores deep panels only through explicit continue/resume.
  - First-entry overlays for shell screens are scheduled after route history settles, so closing them does not bounce the user back to `home`.

## Legacy availability

- Shell-first is now the default for:
  - `home`
  - `practice-question`
  - `practice-radar`
  - `practice-triples-radar`
  - `practice-wizard`
  - `practice-verb-unzip`
  - `scenario-trainer`
  - `comic-engine`
  - `categories`
  - `blueprint`
  - `prismlab`
  - `about`
- Legacy mode remains available per screen through the existing `ui=legacy` URL override.

## Manual QA snapshot (2026-03-07)

- Passed in browser
  - Home overlay open/close, history back-close, ESC close, focus return, and continue action.
  - Shell screens for `practice-question`, `practice-radar`, `practice-triples-radar`, `practice-wizard`, `practice-verb-unzip`, `scenario-trainer`, `comic-engine`, `categories`, `blueprint`, `prismlab`, and `about`.
  - Overlay titles matched the registry-defined panel titles on generic shell screens.
  - No migrated generic screen left visible inline secondary panels in shell mode.
  - Mobile portrait checks for `home`, `practice-radar`, and `blueprint` showed no horizontal overflow and a reachable overlay close button.
  - Reduced-motion media path still opened overlays correctly.
- Repeatable smoke coverage
  - `npm run test:shell-smoke` now runs the same shell-first browser checks through Playwright.
  - The script can reuse an existing app server via `--base=<url>` or boot a temporary local `vite` server automatically.
