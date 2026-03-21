# Meta_Model_app repository instructions

This repository contains feature-heavy educational and therapy-oriented interfaces.
Preserve clarity, flow, and frontend consistency.

## Repository priorities
- Preserve RTL correctness.
- Preserve mobile-first usability.
- Prefer clean hierarchy over crowded feature density.
- Avoid adding new UI layers unless they clearly improve the task.
- Reuse existing patterns when they are still good enough.

## UI rules
- Avoid side dashboards unless the feature truly needs dense simultaneous controls.
- Prefer top and bottom structure over left-right clutter in RTL screens.
- Reduce nested cards and repeated framing.
- Keep the first viewport understandable without scroll confusion.
- Prefer short button labels.
- Floating controls should not cover main content.
- Explanatory text should be scannable and secondary to the user’s main task.

## Feature work process
For any existing feature:
1. define what this screen is supposed to help the user do
2. identify the current friction
3. identify the smallest high-leverage fix
4. inspect existing shared components before creating new ones
5. preserve working logic when only UI needs improvement

## Review output
Always report:
1. feature goal
2. current UX problems
3. what to fix first
4. files to change
5. risks after the change

## Constraints
- Do not break working feature logic just to improve visuals.
- Do not introduce decorative complexity without clear UX benefit.
- Keep text and layout coherent in Hebrew / RTL.
- Check mobile layout explicitly.