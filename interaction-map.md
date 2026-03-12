# Interaction Map

## Global Shell

| Surface | Selector / Entry | Intended Action | Current Status |
|---|---|---|---|
| Top tab bar | `.tab-btn[data-tab]` | Navigate to app tab/section | Bound via `activateTabByName()` / `navigateTo()`. Functionally present, but can be blocked by onboarding overlay. |
| Mobile tab selector | `#mobile-tab-select` | Navigate between tabs on mobile | Wired in app shell. Needs regression check after blocker fix. |
| Feature map menu | `#feature-map-toggle`, `#home-open-feature-map` | Open full navigation menu / overlay | Wired via `openFeatureMapMenu()` and `setupFeatureMapOverlayControls()`. |
| Global overlay root | `.overlay-root` | Host modal/panel content | Not currently the main blocker. Hidden behavior looks explicit. |
| Floating audio controls | `.audio-floating-control` | Mute / random / stop audio | Functional, but can overlap mobile sticky CTA on some tabs. |
| Mobile sticky CTA | `#mobile-sticky-cta` | Mirror current tab primary action | Exists and is auto-generated. Overlap bug with floating audio on some tabs. |

## Onboarding

| Surface | Selector / Entry | Intended Action | Current Status |
|---|---|---|---|
| Onboarding modal root | `#mm-onboarding` | First-run onboarding flow | P0 blocker. Hidden state is broken because CSS overrides native `hidden`. |
| Role choices | `#mm-onboarding [data-role]` | Move from step 1 to step 2 | Click handlers exist. |
| Level choices | `#mm-onboarding [data-level]` | Move from step 2 to step 3 | Click handlers exist. |
| Launch CTA | `#mm-ob-launch-btn` | Navigate to recommended tool | Exists, but overlay remains hit-testable after close. |
| Explore CTA | `#mm-ob-explore-btn` | Close onboarding and let user explore | Exists, but overlay remains hit-testable after close. |

## Home Screen

### Desktop home

| Surface | Selector / Entry | Intended Action | Current Status |
|---|---|---|---|
| Hero primary CTA | `#home [data-nav-key="sentenceMap"]` | Navigate to sentence map | Handler exists. Blocked by onboarding during audit. |
| Hero standalone CTA | `#home a[data-nav-key="scenarioTrainer"]` | Open standalone scenario trainer | Handler exists. |
| Feature cards | `.home-route-feature-card .btn` | Navigate to mapped feature | Handlers are bound by `setupCanonicalNavLaunchers()`. Two audited failures were blocker-related, not missing handlers. |
| Primary CTA strip | `.home-route-primary-cta .btn` | Jump into main learning paths | Bound, but audited desktop clicks fail when onboarding overlay is present. |
| Preferences | `#home-lobby-reduce-motion-toggle`, `#home-lobby-mute-toggle` | Toggle motion/audio preferences | Wired in `setupHomeLobbyExperience()`. |

### Mobile home

| Surface | Selector / Entry | Intended Action | Current Status |
|---|---|---|---|
| Launchpad cards | `.mobile-feed-launch-card .btn` | Start a main path | Present and visible in mobile feed. |
| Quick search | `#mobile-feed-search` | Filter mobile feed items | Present. Needs final runtime sanity after blocker fix. |
| Feed chips | `#mobile-feed-chips` | Filter by category | Present. |
| Feed list cards | `#mobile-feed-list` | Navigate to tools/features | Present. |

## Major Learning Tabs

| Tab | Primary Controls | Status |
|---|---|---|
| `sentence-map` | mode toggle, case selector, step actions | Core UI present. Mobile width check showed no overflow. |
| `practice-question` | mode buttons, start/help/data buttons | Visible and reachable in audit run. |
| `practice-radar` | mode buttons, start/help/data buttons | Visible, but needs post-blocker verification with sticky CTA logic. |
| `practice-wizard` | stage actions, focus areas, onboarding help | Mobile sticky CTA overlaps floating audio controls. |
| `blueprint` | step buttons, export/start-over/do-now | Mobile sticky CTA overlaps floating audio controls. |
| `categories` | glossary filters and buttons | No major overflow reproduced; interaction to verify after P0 fix. |
| `comic-engine` | choice deck, info, back, expand stage | Covered by existing `test-shell-smoke` path after shell blocker is fixed. |

## Standalone Pages

| Page | Entry | Intended Action | Current Status |
|---|---|---|---|
| `classic_classic_trainer.html` | direct page | Standalone trainer | Uses `MetaTrainerStandalone.boot()`; nav is injected from trainer contracts. |
| `classic2_trainer.html` | direct page | Standalone trainer | Same wrapper pattern. |
| `scenario_trainer.html` | direct page | Standalone trainer | Covered by existing scenario smoke test. |
| `living_triples_trainer.html` | direct page | Standalone trainer | Wrapper-driven. |
| `sentence_morpher_trainer.html` | direct page | Standalone trainer | Wrapper-driven. |
| `verb_unzip_trainer.html` | direct page | Standalone trainer | Wrapper-driven. |
| `prism_research_trainer.html` | direct page | Standalone trainer | Wrapper-driven. |

## Priority Repair Targets

### P0

1. `#mm-onboarding` hidden/click-blocking behavior
2. onboarding dismiss path for first-run users
3. mobile sticky CTA and floating audio overlap

### P1

1. desktop home CTA smoke coverage after onboarding close
2. mobile sticky CTA collision coverage
3. tab-by-tab quick interaction sanity on `sentence-map`, `practice-question`, `practice-radar`, `practice-wizard`, `blueprint`
