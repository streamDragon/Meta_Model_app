# SPEC: Unspecified Verb -> Execution (Scenario Trainer)

## 1) Product Goal
Build a playful, Hebrew RTL training experience that teaches:

`Unspecified Verb -> Executable Process`

Primary outcome:
- reduce anger/shame reactions
- increase process mapping and small-step execution

Tone default:
- Israeli day-to-day language (`ישראלי-יומיומי`)

## 2) Platform + Constraints
- Static web app only (`HTML/CSS/JS`)
- Mobile-first, RTL
- No backend
- Content-driven from local JSON
- localStorage persistence for:
  - settings
  - progress
  - scenario history
- Minimal animation + optional sound (toggle in settings)

## 3) Core State Machine
`HOME -> DOMAIN_PICK -> SCENARIO -> OPTION_PICK -> FEEDBACK -> BLUEPRINT -> SCORE -> NEXT_SCENARIO`

Behavior notes:
- Each scene should take 10-60 seconds
- Interaction-first, short text
- No dense lectures

## 4) UX Requirements
### 4.1 Home
- Buttons:
  - `סצנות`
  - `פריזמות (Drag&Drop)`
  - `היסטוריה`
  - `הגדרות`
- Quick stats:
  - completed scenes
  - green answer rate
  - stars
  - best streak

### 4.2 Domain Pick
- Domain selector (5 domains)
- Difficulty selector (`קל/בינוני/קשה`)
- Run size selector (5-10 scenes)

### 4.3 Scenario
- Scenario card:
  - role
  - title
  - 2-5 story lines
  - explicit unspecified-verb line (`נו, פשוט תעשה X`)
- 5 large option buttons with emoji:
  - 4 red archetypes
  - 1 green meta-model

### 4.4 Feedback
- 1-second animation:
  - red X or green check
- 1-2 lines feedback:
  - why red is identity/shame/avoidance
  - why green is process mapping
- Consequence simulation card:
  - show immediate behavior after the chosen response
  - show practical outcome (not only moral explanation)
  - for red choices, emphasize "old path -> concrete failure/risk"

### 4.5 Blueprint
Compact blueprint with:
- goal
- first step (10 min)
- 3-7 steps
- stuck point
- Plan B
- done definition
- green sentence + copy button

Optional:
- prism wheel mini component after green answer

### 4.6 Score
- stars
- simple 0/1 per scene score
- streak
- progress bar
- continue to next scene

## 5) Fixed Response Archetypes
Use the same red archetypes across scenarios:
1. Identity blame 😡
2. Comparison shame 🙄
3. Overtake/do-it-for-them 🥴
4. Avoid/pretend 😬

Green:
5. Meta-model/process mapping ✅🙂

## 6) Data Model
Source of truth:
- `data/scenario-trainer-scenarios.json`

Schema fields (per scenario):
- `scenarioId`
- `domain`
- `domainLabel`
- `level`
- `difficulty`
- `title`
- `story[]`
- `unspecifiedVerb`
- `expectation { speaker, belief, pressure }`
- `stuckPointHint`
- `hiddenSteps[]`
- `alternatives[]`
- `options[]` (optional if using global templates)
- `greenSentence`
- `greenBlueprint { goal, firstStep, steps[], stuckPoint, doneDefinition, planB }`

## 7) Safety
If user-entered text implies self-harm:
- show safety notice
- stop game flow
- do not continue scene progression

Avoid clinical wording in normal gameplay.

## 8) Gamification + Persistence
Track:
- score
- stars
- green streak
- completed scenes
- history with selected option + note

Persist in localStorage:
- `scenario_trainer_settings_v1`
- `scenario_trainer_progress_v1`

## 9) Acceptance Criteria
MVP is valid when:
1. User can play 10 scenes in a row without flow breaks.
2. Every scene ends with a clear blueprint and 10-minute first step.
3. History is stored (choice + stars + note + timestamp).
4. Green sentence can be copied.
5. RTL layout is readable and usable on mobile.

## 10) Manual QA Checklist
1. Start from home and enter scenario run.
2. Filter by domain + difficulty and start a session.
3. Verify 5 options render and are tappable.
4. Verify red/green feedback animation appears.
5. Verify blueprint fields populate correctly.
6. Verify prism wheel appears only when green and toggle is ON.
7. Verify history export JSON includes user notes.
8. Verify page refresh keeps progress/history/settings.
