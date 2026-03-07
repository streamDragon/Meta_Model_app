# UI Shell Migration Inventory (Meta_Model_app)

Last updated: 2026-03-07

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
- `home` (`?tab=home`)
  - Default UI mode switched to `shell`.
  - Compact hub stays inline; full `MENU`, `Help`, and `About` open in overlay.
  - Last visited screen is surfaced as a resume action inside the shell.
  - Legacy mode kept available via `?ui=legacy`.
- Global infrastructure
  - Shared overlay provider/root with focus trap, ESC/backdrop close, swipe sheet on mobile, history back-close, and scroll lock/restore.
  - Per-screen `ui` mode resolution (`legacy`/`shell`) with URL override support.
  - Shell runtime fallback includes `Open Legacy Mode`.
  - Reusable reveal highlight (`.opened-content`) for newly shown content.

## Remaining inline panels to migrate

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

1. `practice-radar`
2. `practice-triples-radar`
3. `prismlab`
4. remaining secondary training tabs
