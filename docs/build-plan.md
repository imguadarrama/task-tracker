# Task Tracker — 2-Hour Build Plan (Express · React · SQLite · Node)

A step-by-step plan to deliver a working full-stack task-tracking app within the time limit, using **Express · React · SQLite · Node**. Priority order: **make it work → enforce the rules in the spec → write the README**. UI polish is explicitly out of scope.

> **Status note.** The original plan called for PostgreSQL ("PERN"). After Phase 0, the database engine was changed to **SQLite via `better-sqlite3`** to give the reviewer a literal `npm install && npm run dev` experience with zero external services. The full reasoning is in [`DECISIONS.md` D1](DECISIONS.md). This plan has been updated end-to-end so every code sample and command matches what was actually built. Engine-agnostic phases (auth flow, ownership checks, frontend) are unchanged in shape.

---

## Stack & key decisions

- **DB:** SQLite, accessed with raw `better-sqlite3` + a single `schema.sql` file. No ORM — you see exactly what every query does (matches the "understand the implications" goal in the brief). `db.js` opens the file, sets pragmas, and auto-applies `schema.sql` on startup — there is no migration command for the reviewer to run.
- **Backend:** Node + Express. Auth with `bcryptjs` (no native build step) + `jsonwebtoken`.
- **Frontend:** React + Vite, plain `fetch`, no extra state libraries.
- **Test:** Vitest + `supertest` — a modern, fast Jest alternative with watch mode and built-in TS support. See [`DECISIONS.md` D10](DECISIONS.md).

> **Why not Postgres / Prisma / Supabase?** See `DECISIONS.md` D1 and D2 for the full comparison.

**Two terminals:** one for the API (`npm run dev` → `node --watch server.js`), one for the frontend (`vite`). Enable CORS on Express with one line.

---

## Time budget (≈120 min, with triage)

| Phase | What | Time |
|---|---|---|
| 0 | Setup, scaffolding (SQLite is a file — no DB server) | 12 min |
| 1 | Schema + DB connection | 10 min |
| 2 | Auth (register, login, hashing, JWT) | 20 min |
| 3 | Task CRUD + ownership + filter/search + errors | 25 min |
| 4 | One automated test | 10 min |
| 5 | Frontend: auth pages + token handling | 20 min |
| 6 | Frontend: task list + CRUD + filter/search | 18 min |
| 7 | README + design notes + final smoke test | 15 min |

**If you fall behind (triage order):** the test (Phase 4) and any frontend nicety go first. A working backend you can prove with curl/Postman beats a half-built everything. Never cut: password hashing, ownership checks, the README.

---

## Phase 0 — Setup & scaffolding (12 min)

No database server to install, run, or configure — SQLite is a single file at `backend/data/app.db` that `db.js` creates on startup and seeds from `schema.sql`. Reviewer flow ends at `npm install && npm run dev`.

```bash
mkdir tasktracker && cd tasktracker
# Backend
mkdir backend && cd backend && npm init -y
npm install express better-sqlite3 bcryptjs jsonwebtoken cors dotenv
npm install --save-dev vitest supertest
cd ..
# Frontend
npm create vite@latest frontend -- --template react
cd frontend && npm install && cd ..
```

- [ ] Backend `package.json` has `"type": "module"` and scripts: `"dev": "node --watch server.js"`, `"test": "vitest run"`, `"test:watch": "vitest"`
- [ ] Frontend scaffolded; `npm run dev` opens the Vite page
- [ ] `backend/.env.example` (committed) and `backend/.env` (gitignored) with `JWT_SECRET=<random hex>`, `PORT=3000`, `DATABASE_FILE=./data/app.db`
- [ ] Generate a real `JWT_SECRET` with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Create empty (or near-empty) files: `backend/server.js`, `backend/db.js`, `backend/schema.sql`

**Understand:** the frontend and backend are two separate processes that only share JSON over HTTP. The SQLite file is opened by the backend process only — the frontend never touches it directly. A JWT is what ties a request back to a user.

---

## Phase 1 — Schema + DB connection (10 min)

In `backend/schema.sql` (SQLite syntax; full-system per CLAUDE.md Rules 2 and 4 — indexed access paths, timestamps, NOCASE):

```sql
CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY,
  username        TEXT NOT NULL UNIQUE COLLATE NOCASE,
  hashed_password TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id          INTEGER PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','doing','done')),
  owner_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_owner        ON tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_owner_status ON tasks(owner_id, status);

CREATE TRIGGER IF NOT EXISTS trg_tasks_updated_at
AFTER UPDATE ON tasks
FOR EACH ROW
BEGIN
  UPDATE tasks SET updated_at = datetime('now') WHERE id = NEW.id;
END;
```

In `backend/db.js`, open the SQLite file, set the pragmas, and auto-apply `schema.sql`:

```js
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import "dotenv/config";

const here = dirname(fileURLToPath(import.meta.url));
const dbFile = resolve(here, process.env.DATABASE_FILE ?? "./data/app.db");

mkdirSync(dirname(dbFile), { recursive: true });

export const db = new Database(dbFile);
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

const schema = readFileSync(resolve(here, "schema.sql"), "utf8").trim();
if (schema.length > 0) db.exec(schema);
```

Smoke test from `backend/`: `node -e "import('./db.js').then(m => console.log(m.db.prepare('SELECT 1 AS one').get()))"` prints `{ one: 1 }`.

- [ ] Both tables created (verify by listing `sqlite_master` or running the smoke test above)
- [ ] `status` CHECK constraint enforces the three allowed values **at the DB level**
- [ ] `PRAGMA foreign_keys` returns `[{ foreign_keys: 1 }]` — without this, the FK on `tasks.owner_id` is silently ignored

**Understand:** `owner_id` (with the FK) is the linchpin of "users can only touch their own tasks." The DB `CHECK` on `status` is a free safety net — even a buggy endpoint can't insert an invalid status. The `foreign_keys = ON` pragma is non-negotiable in SQLite: without it, `ON DELETE CASCADE` does literally nothing.

---

## Phase 2 — Auth: register, login, hashing, JWT (20 min)

In `backend/server.js` (Express app), build:

```js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "./db.js";

// register
const hashed = await bcrypt.hash(password, 10);
db.prepare("INSERT INTO users (username, hashed_password) VALUES (?, ?)").run(username, hashed);
// on UNIQUE-constraint violation -> 409

// login
const user = db.prepare("SELECT id, hashed_password FROM users WHERE username = ?").get(username);
const ok = user && (await bcrypt.compare(password, user.hashed_password));
const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: "12h" });
```

Endpoints:
- `POST /register` → reject duplicate username (**409**), hash password, insert user.
- `POST /login` → verify password, return `{ token }`. Wrong creds → **401**.
- Middleware `auth(req, res, next)` → read `Authorization: Bearer <token>`, `jwt.verify`, attach `req.userId`, else **401**. Every task route uses it.

- [x] Register hashes the password — **plaintext is never stored**
- [x] Login returns a token; bad credentials return 401
- [x] `auth` middleware rejects missing/invalid tokens with 401

**Understand:**
- **Hashing vs encryption:** bcrypt is one-way and salted; you verify a password but can never recover it. That's what "securely hashed" requires.
- **JWT:** a signed token the client returns on each request. The signature (your `JWT_SECRET`) is what stops a client from forging `sub` and impersonating another user.
- **better-sqlite3 is synchronous.** `db.prepare(...).run/get/all(...)` are blocking calls — no `await` on the DB. The only `await` in Phase 2 is bcrypt's hash/compare.

---

## Phase 3 — Task CRUD + ownership + filter/search + errors (25 min)

All task routes use the `auth` middleware. Use **parameterized queries** (`?` placeholders) everywhere — never string-concatenate input (SQL injection).

- `POST /tasks` — insert with `owner_id = req.userId` (**never** take owner from the body). → **201**
- `GET /tasks` — `WHERE owner_id = ?`, plus optional `status` and `search`:
  ```sql
  SELECT * FROM tasks
  WHERE owner_id = ?
    AND (? IS NULL OR status = ?)
    AND (? IS NULL OR title       LIKE '%' || ? || '%' COLLATE NOCASE
                   OR description LIKE '%' || ? || '%' COLLATE NOCASE)
  ORDER BY id DESC;
  ```
  > SQLite uses `?` placeholders (not `$1`), and `LIKE ... COLLATE NOCASE` instead of Postgres's `ILIKE`. The composite index on `(owner_id, status)` covers the common filter; the search predicate falls back to a scan within the owner partition (acceptable at this scale; FTS is a Phase-7 improvement note).
- `PUT /tasks/:id` — fetch first: **404** if not found, **403** if `owner_id !== req.userId`, else update. → **200**
- `DELETE /tasks/:id` — same ownership check, then delete. → **204**

Status codes to use deliberately: `201` create, `200` read/update, `204` delete, `400` bad input, `401` not logged in, `403` not your task, `404` not found. Send structured errors: `res.status(404).json({ error: "Task not found" })`.

- [x] Create/list/update/delete all work (tested via Postman)
- [x] A second user **cannot** see or modify the first user's tasks
- [x] `?status=doing` and `?search=keyword` filter correctly (DB does the filtering)
- [x] Status codes + JSON error bodies match the spec

**Understand:** the ownership check is **server-side and non-negotiable**. Hiding edit buttons in React is not security — anyone can hit the API directly. The 403 path is what actually protects user data, and it's the most-scrutinized requirement in the spec. Spend your time here.

---

## Phase 4 — One automated test (10 min)

Create `backend/app.test.js` with **Vitest** (`describe`/`it`/`expect`) + `supertest`. The Express
`app` is already exported from `app.js` (`server.js` owns `app.listen`), so the test drives it
in-process without binding a port. Tool rationale is in [`DECISIONS.md` D10](DECISIONS.md).

For isolation: a `backend/vitest.config.js` registers `test/setup.js`, which sets
`process.env.DATABASE_FILE = ':memory:'` (and a test `JWT_SECRET`) **before** any test module's
imports evaluate — winning the ESM hoist race so `db.js` opens a fully in-process DB. `db.js`
short-circuits `':memory:'` to reach `better-sqlite3` verbatim (instead of resolving it to a path),
so the DB vanishes on exit and leaves no `-wal`/`-shm` files to clean up.

Cover the critical path:
1. Register user A → login → `/me` → create a task → `GET /tasks` returns it.
2. Ownership: register user B → B's `GET /tasks` does **not** include A's task, and B gets **403** on
   `PUT`/`DELETE` of it.

Run: `npm test` (which runs `vitest run`); `npm run test:watch` for watch mode.

- [x] `npm test` passes
- [x] Test asserts on **status codes and body**, not just "no crash"

**Understand:** the ownership-isolation test proves the spec's hardest requirement. If you write only one assertion, make it that one. SQLite makes isolation cheap — a fresh `:memory:` DB means no leftover rows between runs, and the schema is re-applied automatically by `db.js` on first import.

---

## Phase 5 — Frontend: auth pages + token handling (20 min)

In the Vite React app:
- A tiny auth screen with **register** and **login** forms (toggle between them — keep it ugly, keep it working).
- On login success, store the token in `localStorage` and switch to the tasks view.
- An `api()` helper that attaches `Authorization: Bearer <token>` to every request.
- Point requests at `http://localhost:3000` (or your API port) and enable CORS on Express:
  ```js
  import cors from "cors";
  app.use(cors());          // demo-wide open; lock to your origin in prod
  app.use(express.json());
  ```

- [x] Register → login → land on the task view
- [x] Token is sent on authenticated requests
- [x] A failed login shows an error message

**Understand:** `app.use(cors())` is fine for a local demo but wide open; in production you'd restrict it to your frontend's origin. Noted in `DECISIONS.md` D4.

---

## Phase 6 — Frontend: task list + CRUD + filter/search + states (18 min)

- Fetch and render the user's tasks on load.
- Form to **create**; inline controls to **edit** (at minimum, change status) and **delete**.
- Status dropdown filter + search box → re-fetch with `?status=` / `?search=` (let the backend filter — don't reimplement client-side).
- **Loading state** while fetching; **error message** when a request fails.

- [x] List shows only my tasks
- [x] Create / edit / delete update the list
- [x] Filter + search hit the backend params and work end-to-end
- [x] Loading indicator and error text both appear at the right times

**Understand:** the spec explicitly lists "loading states and error messages" — they're cheap (`useState` flags) and reviewers check for them. Don't drop them to polish layout.

---

## Phase 7 — README + design notes + final smoke test (15 min)

Update `README.md` (scaffolded in Phase 0) to cover:
1. **How to run** — clone, `cp .env.example .env` in `backend/` and set `JWT_SECRET`, `npm install && npm run dev` in `backend/`, `npm install && npm run dev` in `frontend/`, `npm test` for the test. No external services, no DB to install, no migration command.
2. **Design decisions / tradeoffs** — point at `docs/DECISIONS.md` for the full log, but call out the headline choices: SQLite over Postgres (zero-setup delivery), raw SQL over an ORM (transparency vs boilerplate), JWT in localStorage (simple but XSS-exposed; httpOnly cookie is safer), CORS wide-open for the demo, `status` enforced by a DB CHECK.
3. **Three+ improvements with more time**, e.g.:
   - httpOnly cookie + refresh-token rotation instead of localStorage JWT.
   - Migrate to Postgres for concurrent writes and richer types; the schema and queries port nearly 1:1 (see `docs/DECISIONS.md` D8 for the migration notes).
   - Pagination + FTS (full-text search) on tasks instead of returning all rows with `LIKE`.
   - Request validation (e.g. zod) + rate limiting, and a fuller test suite (auth failures, 403 paths).

Final smoke test, fresh eyes:
- [ ] Register → login → create → filter → search → edit → delete, all from the running UI
- [ ] Log in as a second user → confirm task isolation
- [ ] `npm test` green
- [ ] README runs exactly as written (try the commands literally)

---

## The "do not skip" list (spec #3: it must work)

1. Passwords hashed (bcrypt), never plaintext.
2. Every task route requires a valid token.
3. Ownership enforced server-side (403/404), proven by a test.
4. Parameterized queries everywhere (no SQL injection).
5. Correct status codes + structured JSON errors.
6. A README that actually runs.

Build top-to-bottom, commit after each phase via a PR (see `CLAUDE.md` → Workflow), and stop polishing the moment this list is green.
