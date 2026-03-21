---
name: hagai-frontend-ui
description: Use when the task involves designing, reviewing, improving, debugging, or refactoring a frontend page, feature screen, flow, layout, interaction pattern, landing section, or mobile UI. Especially relevant for RTL interfaces, educational tools, therapy-training apps, and visually sensitive product screens. Do not use for backend-only, API-only, database-only, or infrastructure-only tasks.
---

# Hagai Frontend UI Skill

Use this skill when success depends on hierarchy, visual clarity, layout discipline, interaction quality, and polished frontend execution.

## Goal
Produce frontend work that feels intentional, clean, modern, readable, mobile-first, and visually focused.

## Operating model
Before changing code:
1. Identify the page goal in one sentence.
2. Identify the primary user action.
3. Identify what currently distracts from that action.
4. Identify what must dominate the first viewport.
5. Prefer the smallest structural improvement that meaningfully improves the screen.

## Core principles
- Start from hierarchy and attention flow, not from random component additions.
- Prefer one strong focal area per screen.
- Each section should have one job.
- Reduce visual noise before adding new UI.
- Avoid dashboard clutter unless the product explicitly needs dense monitoring.
- Avoid box-inside-box-inside-box layouts.
- Prefer spacing, grouping, and hierarchy over excessive card usage.
- Prefer short labels over long explanatory button text.
- Use motion only when it improves clarity, focus, or state change.

## RTL rules
- Assume right-to-left reading flow matters.
- Keep primary attention and content flow aligned with RTL expectations.
- Do not waste the right side on low-priority controls.
- Push secondary controls upward or leftward when they compete with core content.
- Check icon direction, text alignment, spacing rhythm, and visual balance in RTL.

## Mobile-first rules
- Design for mobile first, then scale upward.
- The first screen should make sense immediately.
- Avoid sidebars that steal width on mobile.
- Avoid fixed UI that covers important content.
- Keep touch targets clear and comfortably tappable.
