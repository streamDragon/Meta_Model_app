# Mockups Folder

This folder contains visual references that are both human-friendly and machine-readable.

## Files
- `scenario_trainer_storyboard.svg`
  - 5-screen flow storyboard (home -> scenario -> feedback -> blueprint -> reward)
- `scenario_trainer_ui_kit.svg`
  - reusable UI elements (buttons, cards, progress, avatars, badges)
- `wireframes_v1.json`
  - machine-readable layout specification for each screen

## Optional PNG References (from user)
If you have exported images, place them here as:
- `mockups_v1_flow.png`
- `mockups_v1_ui_kit.png`

## How to use in VSCode/Cursor
1. Open `docs/PROMPT_FOR_CODER.md`
2. Attach or reference files from this folder
3. Instruct the coding agent to match structure from:
   - `wireframes_v1.json` (layout logic)
   - `scenario_trainer_storyboard.svg` (visual flow)
   - `scenario_trainer_ui_kit.svg` (visual style)
