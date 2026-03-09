# Trainer Platform DOM Adapter

`Classic Classic` and `Scenario Trainer` are the supported DOM-side adapter paths for trainers that do not yet render through the React shell.

The adapter contract is intentionally small. A DOM trainer remains platform-compatible when it exposes the same shell semantics that the shared QA harness and standalone wrapper expect.

## Required shell markers

- Root shell: `data-trainer-platform="1"` and `data-trainer-id="<trainer-id>"`
- Mobile order declaration: `data-trainer-mobile-order="start,purpose,helper-steps,main,support"`
- Main/support zones when they exist:
  - `data-trainer-zone="purpose"`
  - `data-trainer-zone="start"`
  - `data-trainer-zone="helper-steps"`
  - `data-trainer-zone="main"`
  - `data-trainer-zone="support"`
- Settings shell: `data-trainer-settings-shell="1"` and `data-trainer-id="<trainer-id>"`

## Required shell actions

- Open settings: `data-trainer-action="open-settings"`
- Start session: `data-trainer-action="start-session"`
- Save/start from settings: `data-trainer-action="save-start"`
- Save settings in-session: `data-trainer-action="save-settings"`

## Required summary hooks

- Current visible summary: `data-trainer-summary="current"`
- Preview summary inside settings: `data-trainer-summary="preview"`
- Shared preset hooks for QA and fast mutations:
  - `data-trainer-preset="compact"`
  - `data-trainer-preset="standard"`

## Mobile ordering

The DOM adapter must read `mobilePriorityOrder` from the shared trainer contract and apply it to live layout ordering. Areas that do not exist in a given screen are skipped; fixed bars such as sticky top status bars may remain outside the reorderable set.

## Current platform stance

`Classic Classic` remains DOM-rendered for now, and `Scenario Trainer` uses the same adapter policy for its standalone dialogue runtime. Both remain first-class platform citizens through this adapter contract. Their educational engines stay in place, while shell behavior, settings semantics, wrapper boot, mobile ordering, and cross-trainer QA remain shared.
