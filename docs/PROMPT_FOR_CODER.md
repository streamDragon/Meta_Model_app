# PROMPT FOR CODER (Copy/Paste)

## Role
You are a Senior Frontend Engineer and App-Coding Agent.

## Goal
Build a playful scenario-based training module for an existing Meta Model web app (Hebrew RTL).

Core teaching objective:
`Unspecified Verb -> Executable Process`

Secondary objective:
reduce anger/shame responses by turning vague instructions into step-by-step execution blueprints.

## Inputs
1. UI references:
   - `docs/mockups/scenario_trainer_storyboard.svg`
   - `docs/mockups/scenario_trainer_ui_kit.svg`
   - optional PNG references placed by user in `docs/mockups/`
2. Product spec:
   - `docs/SPEC_UNSPECIFIED_VERB_EXECUTION.md`
3. Data source:
   - `data/scenario-trainer-scenarios.json`

## Constraints
- Static app only (`HTML/CSS/JS`)
- No backend, no build step required
- Mobile-first and RTL
- localStorage persistence for settings/progress/history
- minimal animations and optional sounds (toggle in settings)
- no external libraries required

## Required Flow (State Machine)
`HOME -> DOMAIN_PICK -> SCENARIO -> OPTION_PICK -> FEEDBACK -> BLUEPRINT -> SCORE -> NEXT_SCENARIO`

## UI Requirements
- Scenario card with 2-5 short lines
- 5 large option buttons with emojis:
  - 4 red archetypes
  - 1 green meta-model
- Feedback screen: red X / green check animation (~1s) + 1-2 lines explanation
- After each choice, add a "what happens next" consequence card:
  - immediate action taken by the character
  - practical result of that path
  - for red options, show concrete negative consequence
- Blueprint screen:
  - goal
  - first step (10 min)
  - 3-7 steps
  - stuck point
  - plan B
  - done definition
- Score screen:
  - stars
  - streak
  - simple 0/1 score
  - progress bar

## Fixed Option Archetypes
Red options:
1. Identity blame 😡
2. Comparison shame 🙄
3. Overtake / do-it-for-them 🥴
4. Avoid / pretend 😬

Green option:
5. Meta-model/process mapping ✅🙂

## Data + Content
- Load scenarios from local JSON
- Seed minimum 15 scenarios across 5 domains:
  - parenting
  - relationships
  - work
  - bureaucracy
  - tech/home

## Features
1. Settings:
   - sound on/off
   - difficulty
   - domain filter
   - prism-wheel toggle
2. History:
   - completed scenarios
   - selected choices
   - stars
   - user notes
3. Export:
   - JSON export of completed scenarios + notes
4. Copy:
   - copy-to-clipboard for green sentence
5. Optional:
   - prism-wheel mini component after green choice

## Safety
- If user text implies self-harm:
  - show a safety notice
  - stop gameplay flow
- Avoid clinical language elsewhere.

## Deliverables
- Working MVP code integrated in existing app files
- Data model + seed scenarios
- PRD + state machine + wireframe notes + JSON schema
- Acceptance tests + manual QA checklist

## Style
- Colorful and friendly
- Rounded cards
- Accessible button sizes
- Readable typography
- Works cleanly on mobile and desktop
