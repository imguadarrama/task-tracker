# Design Decisions & Tradeoffs

A running log of the non-obvious choices made while building this app, with the reasoning behind each. Entries are written **at the time the decision is made**, not reconstructed afterwards — so a reviewer can follow how the design evolved.

---

## D1 — SQLite (`better-sqlite3`) over Postgres

**Decision.** Use SQLite via `better-sqlite3` as the database engine instead of Postgres.

**Why.** The original plan called for Postgres, but the spec doesn't require it ("any modern stack"), and the hidden requirement of a take-home is *the reviewer's experience running it*. SQLite gives us `git clone → npm install → npm run dev` — no Docker, no `psql` install, no local DB server, no `.env` editing required for the defaults. The single-file DB lives at `backend/data/app.db` and is auto-created on first run.

**Tradeoffs.**
- SQLite serializes writes — fine for a single-machine demo, would not scale for concurrent web traffic.
- No native `JSONB`, `ENUM`, or `ILIKE` — we model `status` as `TEXT` with a `CHECK` constraint (same idea, portable), and use `LIKE COLLATE NOCASE` for case-insensitive search.
- For production, the schema and parameterized queries port to Postgres essentially 1:1; only the driver and a handful of operators would change.

**Rejected alternatives.**
- *Postgres in Docker* — adds a Docker dependency the reviewer didn't ask for.
- *Local Postgres install* — highest friction (download installer + create DB + edit `.env`).
- *Supabase* — would either require sharing a connection string (reviewer collision) or push each reviewer through Supabase project setup (more friction than SQLite). Using its built-in auth would also bypass the spec's "implement registration and login" requirement.

---

## D2 — Raw SQL over Prisma / an ORM

**Decision.** Hand-write all queries against `better-sqlite3`'s prepared-statement API. No ORM.

**Why.** Two reasons. (1) Defensibility: every query is something the author wrote and can explain line-by-line in a follow-up call — the spec's emphasis on "understand the implications" is easier to honor without a codegen layer in the way. (2) Time: Prisma's `init → schema → migrate → generate` flow costs ~10 minutes in a 2-hour budget that's better spent on the ownership-isolation test and the README.

**Tradeoffs.**
- No compile-time type safety on query results. Mitigated by keeping the schema tiny (two tables) and using prepared statements consistently.
- Slightly more code per route than `prisma.task.findMany(...)`. Worth it for the transparency.

---

## D3 — JWT stored in `localStorage`

**Decision.** Client stores the JWT in `localStorage` and attaches it as `Authorization: Bearer <token>` on every request.

**Why.** Simplest possible token flow for a demo, no cookie/CSRF plumbing, frontend and backend stay decoupled.

**Tradeoffs.**
- Exposed to XSS — any script that runs on the page can read the token. An httpOnly cookie with proper `SameSite` is the production-grade choice.
- Listed under "Improvements with more time" in the README so the reviewer sees we know.

---

## D4 — CORS wide-open for the demo

**Decision.** `app.use(cors())` with no origin restriction.

**Why.** For local development against `localhost:5173 → localhost:3000`, restrictive CORS is just one more knob that can be misconfigured. The demo runs end-to-end without it.

**Tradeoffs.** Not what you'd ship to production. Locking down origins is a one-line change (`cors({ origin: process.env.FRONTEND_ORIGIN })`) and is noted as such in the README.

---

## D5 — `status` enforced by a DB `CHECK` constraint

**Decision.** The `tasks.status` column is `TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','doing','done'))`.

**Why.** Defense in depth. The application validates incoming `status` values, but a bug in the validation layer can't insert an invalid status because the DB will reject it. Works identically in SQLite and Postgres, so this decision survives a future Postgres migration.

---

## D6 — SQLite pragmas set on every connection (`foreign_keys`, `journal_mode = WAL`)

**Decision.** Immediately after opening the SQLite connection in `db.js`, run two pragmas:

```js
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");
```

**Why `foreign_keys = ON`.** SQLite ships with foreign key enforcement **off by default** for backward compatibility — a notorious foot-gun. Without this pragma, `tasks.owner_id REFERENCES users(id) ON DELETE CASCADE` is silently ignored, and orphan rows become possible. Setting it explicitly is non-negotiable: it is the only thing that makes the FK declaration in `schema.sql` actually behave.

**Why `journal_mode = WAL`.** The default rollback-journal mode blocks readers while a writer is active. Write-Ahead Logging lets reads continue concurrently with a single writer, which matches how the API will hit the DB (many GETs from the frontend while occasional POST/PUT/DELETE land). WAL persists at the database-file level — once set, the mode survives connection close, so this pragma is idempotent on every startup. Migrates to Postgres as a no-op (Postgres uses WAL by default; the configuration moves from connection-time pragma to server config).

---

## D7 — AI-assisted pair programming, disclosed

**Decision.** Disclose AI assistance (Claude) as a tool used during development, in the README's "Tools used" section. Every design decision and every line of code was reviewed and is owned by the author — this `DECISIONS.md` exists in large part so each choice is independently defensible.

**Why.** The brief doesn't forbid AI assistance and tech-industry norms in 2026 assume it's in use unless explicitly banned. Hiding it would be the higher-risk option for the inevitable follow-up technical conversation, where the value comes from being able to defend choices — which is exactly what this document supports.

---

## D8 — Schema choices beyond the spec (full-system schema)

**Decision.** `backend/schema.sql` goes beyond the strict spec by adding `created_at` / `updated_at` timestamps, indices on `tasks(owner_id)` and `tasks(owner_id, status)`, `COLLATE NOCASE` on `users.username`, and an `AFTER UPDATE` trigger that maintains `updated_at`.

**Why.** The spec lists the minimum (`title`, `description`, `status`, `owner`) but every real task tracker has audit timestamps and indexed access paths. `CLAUDE.md` Rule 4 ("implement FULL systems, not patches") and Rule 2 ("build scalably") together push us past the minimum:

- **`COLLATE NOCASE` on `username`** — prevents "Alice" and "alice" from being two distinct accounts. Standard auth hygiene; the cost is zero.
- **`created_at`, `updated_at`** — answer the "when did this happen?" question without a schema migration later. Stored as ISO-8601 text via `datetime('now')`, which is the SQLite-idiomatic choice (no native timestamp type).
- **`AFTER UPDATE` trigger on `tasks`** — keeps `updated_at` correct regardless of which route or query touches the row. Per Rule 4, if we expose the column we must guarantee it stays accurate; doing it in application code would be a discipline tax that Rule 1 (DRY) and Rule 5 (best practices) flag as the wrong place for this concern.
- **`idx_tasks_owner` and `idx_tasks_owner_status`** — every list query in Phase 3 will filter by `owner_id`, and most by `status` too. Adding the indices at table-creation time is the "scalable" choice (Rule 2) and costs ~nothing on a small DB.

**Postgres migration notes.** Everything ports near-1:1:
- `INTEGER PRIMARY KEY` → `SERIAL` (or `GENERATED ALWAYS AS IDENTITY`).
- `TEXT COLLATE NOCASE` → `CITEXT` (extension) or `LOWER(username)` with a functional unique index.
- `datetime('now')` → `NOW()`, column type `TIMESTAMPTZ`.
- `CHECK (status IN ('todo','doing','done'))` → identical, or convert to an `ENUM` type.
- `AFTER UPDATE` trigger → `BEFORE UPDATE` trigger setting `NEW.updated_at = NOW()` (cheaper than the AFTER-with-recursive-UPDATE pattern SQLite needs).
- Indices port unchanged.

**Tradeoff.** Slightly more schema to defend in a follow-up call — but the rationale above is precisely what the reviewer would want to hear, so the schema is itself the answer.

---

## D9 — Task ownership responses (403 vs 404) and partial-update `PUT`

**Decision.** On the task routes, a request for a task that exists but belongs to another user
returns **403 Forbidden**; a request for a task id that doesn't exist returns **404 Not Found**;
a malformed (non-numeric) id returns **400**. `PUT /tasks/:id` uses **partial-update** semantics —
only the fields present in the body change, omitted fields keep their current values.

**Why the 403/404 split.** Distinguishing the two makes the API honest about what happened and is
the behavior the build plan calls for. Ownership is enforced **server-side** in one place
(`loadOwnedTask`) shared by `PUT` and `DELETE`: load the row, 404 if absent, 403 if
`owner_id !== req.userId`, only then mutate. Hiding controls in the frontend is not security — the
403 path is what actually protects another user's data.

**Why partial updates.** The frontend's common action is "change just the status" (build-plan
Phase 6). Partial semantics let the client send `{ "status": "done" }` without re-sending the whole
task, which avoids accidentally blanking `title`/`description` on a round-trip. Each provided field
is still validated; an empty body is a `400`. `updated_at` is maintained by the DB trigger, so it
stays correct no matter which subset of fields changed.

**Tradeoffs.**
- The 403 vs 404 split leaks the *existence* of another user's task id. For an app where ids aren't
  sensitive this is the more honest choice; an app that must not reveal existence would return 404
  for both the "missing" and "not yours" cases. Noted here so the choice is deliberate, not accidental.
- Partial updates under the `PUT` verb are technically more `PATCH`-like. Kept as `PUT` to match the
  build plan and spec while taking the more practical semantics.

**Manual API testing.** The task endpoints are exercised by hand with **Postman** — the full
register → login → create → list/filter → cross-user 403/404 → update → delete flow, asserting on
status codes and response bodies. This is the manual counterpart to the automated `node:test` +
`supertest` coverage added in Phase 4.
