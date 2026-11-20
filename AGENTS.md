# Meta Model project: agent entrypoint

This repository is the **single source of truth** for the Meta Model website and its companion book. On the Windows workstation the only active working directory is `C:\\Users\\nlpis\\wkspaces\\META_MODEL_SLEIGHT_WORK`. Before editing, read `book/AGENTS.md` and `book/README.md`.

- Website code: current repository root and `src/`; public GitHub is the source of truth for deployable code.
- Book material: `book/`; published-safe documentation is tracked in Git, private research is local-only in `book/private/`.
- **MAIN ONLY:** work exclusively on `main`, synchronized with `origin/main`. Do not create new branches, worktrees, clones, backup copies, alternate apps, or Vercel projects.
- Before editing, run `git status -sb` and `git pull --ff-only`. If concurrent changes appear, stop, inspect, integrate on main, and recheck rather than overwriting them.
- After changes, run targeted tests and build, commit directly to `main`, push to `origin/main`, and confirm CI and Vercel. Never stage unrelated files from other agents blindly.
- Never commit therapy transcripts, private emails, participant names or private Drive URLs. See `book/AGENTS.md`.
