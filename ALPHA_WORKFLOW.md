# Meta Model Gym: internal alpha workflow

**Status: internal development. Not a commercial release.**

This project is being developed by the owner, the partner, and their AI coding assistants.
GitHub is the source of truth for code, reviews, and automated checks.

## Branches and authority

- `alpha` is the **integration branch** for current development.
- Each contributor/agent works in a short-lived branch from the latest `alpha` (for example `feat/clinic-replies`), pushes changes and opens a pull request **targeting `alpha`**.
- Only integrate a PR after reviewing changes and after `npm test` and `npm run build` pass.
- Do not merge to `main`, publish to GitHub Pages, or deploy to Vercel as part of normal alpha tasks.
- `main` is retained without rewriting or deleting its history; it may still have production automation in its current configuration.
- Do not blindly overwrite another agent's commits. Reconcile conflicting files before merging.

## Run locally

```sh
git fetch origin
git switch alpha
git pull --ff-only origin alpha
npm ci
npm test
npm run build
npm run dev
```

Open the URL printed by Vite on the development computer. A phone preview can be arranged on the same trusted local network, but is **not** automatically exposed to the public internet.

## GitHub checks and publication

- `.github/workflows/ci.yml` validates pushes to `alpha` and PRs with tests and a build.
- On the `alpha` branch, GitHub Pages publishing workflows are **not present**. Pushes to alpha run CI only, without a Pages publication.
- Existing deployment automation outside alpha (including Vercel's Git integration) is managed separately.
- No Vercel CLI/API deployment is required for ordinary development.

**Important caveat:** This repository is currently public. An `alpha` branch is not a privacy barrier; all committed code and fixture data can be viewed by others. Keep real patient stories, personal files, authentication tokens, secrets, and identifiable user data out of the repository. Real private-case intake needs separate access-controlled storage and consent.

**Another caveat:** A connected external deployment service may independently react to Git events. Alpha's GitHub workflows cannot disable Vercel's own Git integration; verify its branch/build settings before relying on zero Vercel builds. No Vercel settings were changed in this alpha setup.

## Release gate (later, not now)

When the owner explicitly authorizes a release, validate the reviewed `alpha` commit, decide which hosting service to use, confirm privacy and security requirements, and publish deliberately. Payments, customer accounts, production databases, and paid APIs are outside the present alpha scope.
