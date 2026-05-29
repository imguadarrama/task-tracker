# CLAUDE.md — Operating rules for this project

Non-negotiable directives for all code in this repository. When in doubt, default to the stricter reading.

## Code rules

1. **DRY and SOLID.** No copy-pasted logic, no god functions, single responsibility per module. If two routes share validation or query shape, extract.

2. **Build scalably.** Cohesive modules, clear seams between layers (routes → services → data), no accidental coupling between unrelated features. The database engine choice (SQLite for delivery — see `docs/DECISIONS.md` D1) is the only documented exception; application code on top must port to Postgres without rewrites.

3. **Build maintainably.** Names carry intent. Functions do one thing. Files stay focused. A new contributor can add a feature without re-reading the whole codebase.

4. **No patches, no TODOs, no temporary scaffolds.** Every implementation ships as the full thing — error handling, validation, edge cases done at write-time, not "fixed later." If something can't be implemented fully in scope, surface it explicitly rather than half-wiring it.

5. **Backend best practices.** Parameterized queries always. Auth middleware on every protected route. Server-side ownership enforcement (never trust the client). Structured JSON error bodies with appropriate status codes. Secrets in `.env`, never hard-coded.

6. **Frontend best practices.** Components do one thing. State lives at the lowest level it's needed. Side effects in `useEffect`, never in render. Loading and error states are first-class, not afterthoughts. Form inputs are controlled; submissions go through a single API helper.

7. **Comments only when truly necessary — refactor instead.** Inline comments are noise. Before writing one, refactor: rename the variable, extract the function, split the expression. A comment is justified only when it explains a non-obvious *why* (a constraint, an invariant, a workaround) — never the *what*, which good naming already does.

## Workflow

All changes ship via pull requests — never direct pushes to `master`.

- Each phase or focused change gets its own branch (`phase-2-auth`, `fix-login-error-state`, `docs/sync-build-plan-and-workflow`, etc.). Branch names are descriptive, not chronological.
- Open the PR when the branch is ready for review. The PR description references the relevant phase or spec section and lists the verification done (smoke tests, manual checks, automated tests).
- `master` always reflects working, reviewable state. A broken `master` blocks every other PR.
- After merge, delete the branch (locally and on the remote). Stale branches accumulate ambiguity about what's live.
- Phases 0 and 1 were committed directly to `master` before this rule existed; everything from this commit forward uses the PR flow.

## Authoritative context

- `docs/specifications.md` — the original take-home brief.
- `docs/build-plan.md` — the phase-by-phase delivery plan (kept aligned with the SQLite delivery — see `docs/DECISIONS.md` D1 for the engine choice).
- `docs/DECISIONS.md` — running log of design choices with reasoning. Read before second-guessing an architectural decision.
- `README.md` — public-facing project doc.
