# TOTE Portrait (MVP)

Single-page React + TypeScript module for Meta-Model training.

## What it includes

- Utterance input -> predicate extraction -> predicate type (`Action | Process | State`).
- State normalization panel (`State -> Hidden Verb`) with editable suggestions.
- 9-slot TOTE ellipse map with drag/drop (`@dnd-kit/core`).
- Question bank filtered by predicate type.
- AnswerBlock creation with rule-based auto-tagging + confidence score.
- Soft placement guidance (no hard wrong), including "move to suggested slot".
- Multi-slot workflow + duplicate block (`שכפל`).
- Stuck wizard hint.
- Loop arrow pulse logic + 3-cycle simulate.
- `toteMap.json` export.

## Run

```bash
cd tote-portrait
npm install
npm run dev
```

## Build & lint

```bash
npm run lint
npm run build
```

