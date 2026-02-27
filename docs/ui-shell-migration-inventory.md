# UI Shell Migration Inventory (Meta_Model_app)

Last updated: 2026-02-27

## Completed (shell-ready)

- `practice-verb-unzip` (`?tab=practice-verb-unzip`)
  - Setup flow moved to overlay-first behavior in shell mode.
  - Secondary surfaces (settings/help/history/stats/import-export) routed through overlay.
  - Legacy mode kept available via `?ui=legacy`.
- `scenario-trainer` (`?tab=scenario-trainer`)
  - Active loop kept inline; secondary screens routed to overlay in shell mode.
  - Compact toolbar added for settings/history/decomposition/action map/blueprint.
  - Safety notice promoted to blocking overlay path in shell mode.
  - Legacy mode kept available via `?ui=legacy`.
- Global infrastructure
  - Shared overlay provider/root with focus trap, ESC/backdrop close, swipe sheet on mobile, history back-close, and scroll lock/restore.
  - Per-screen `ui` mode resolution (`legacy`/`shell`) with URL override support.
  - Shell runtime fallback includes `Open Legacy Mode`.
  - Reusable reveal highlight (`.opened-content`) for newly shown content.

## Remaining inline panels to migrate

- `home`
  - Long explanatory/training content still appears inline; move to help/about overlay or dedicated route in shell mode.
- `practice-question`
  - Secondary explanatory/history/stat blocks still inline in legacy layout.
- `practice-radar`
  - Help/diagnostic/details sections still inline.
- `practice-triples-radar`
  - Help/diagnostic/details sections still inline.
- `practice-wizard` (Bridge/SQHCEL)
  - Setup/help/history areas still inline.
- `comic-engine`
  - Secondary controls/details still inline.
- `categories`
  - Guidance/details still inline.
- `blueprint`
  - Schema/help/import-export panels still mixed inline.
- `prismlab`
  - Setup/theory/history sections still mixed inline.
- `about`
  - Content route exists; verify shell mode keeps concise hub entry from home.

## Next migration order

1. `home` (hub cleanup)
2. `practice-radar`
3. `practice-triples-radar`
4. `prismlab`
5. remaining secondary training tabs
