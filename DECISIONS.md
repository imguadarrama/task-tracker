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

## D6 — `PRAGMA foreign_keys = ON` on every connection

**Decision.** Immediately after opening the SQLite connection in `db.js`, run `db.pragma('foreign_keys = ON')`.

**Why.** SQLite ships with foreign key enforcement **off by default** for backward compatibility — a notorious foot-gun. Without this pragma, `tasks.owner_id REFERENCES users(id) ON DELETE CASCADE` is silently ignored, and orphan rows become possible. Setting it explicitly is non-negotiable.

---

## D7 — AI-assisted pair programming, disclosed

**Decision.** Disclose AI assistance (Claude) as a tool used during development, in the README's "Tools used" section. Every design decision and every line of code was reviewed and is owned by the author — this `DECISIONS.md` exists in large part so each choice is independently defensible.

**Why.** The brief doesn't forbid AI assistance and tech-industry norms in 2026 assume it's in use unless explicitly banned. Hiding it would be the higher-risk option for the inevitable follow-up technical conversation, where the value comes from being able to defend choices — which is exactly what this document supports.
