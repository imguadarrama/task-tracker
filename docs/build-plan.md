# Task Tracker — 2-Hour Build Plan (PERN)

A step-by-step plan to deliver a working full-stack task-tracking app within the time limit, using **PostgreSQL · Express · React · Node**. Priority order: **make it work → enforce the rules in the spec → write the README**. UI polish is explicitly out of scope.

---

## Stack & key decisions

- **DB:** PostgreSQL, accessed with raw `pg` (node-postgres) + a single `schema.sql` file. No ORM — less setup, and you see exactly what every query does (matches your "understand the implications" goal).
- **Backend:** Node + Express. Auth with `bcryptjs` (no native build step) + `jsonwebtoken`.
- **Frontend:** React + Vite, plain `fetch`, no extra state libraries.
- **Test:** Node's built-in test runner (`node:test`) + `supertest` — avoids Jest config overhead.

> **Prisma alternative:** if you prefer typed queries, swap raw `pg` for Prisma — but `init → schema → migrate → generate` costs ~10 min you may not have. Decide now and don't switch later.

**Two terminals:** one for the API (`node`/`nodemon`), one for the frontend (`vite`). Enable CORS on Express with one line.

---

## Time budget (≈120 min, with triage)

| Phase | What | Time |
|---|---|---|
| 0 | Setup, scaffolding & a running Postgres | 12 min |
| 1 | Schema + DB connection | 10 min |
| 2 | Auth (register, login, hashing, JWT) | 20 min |
| 3 | Task CRUD + ownership + filter/search + errors | 25 min |
| 4 | One automated test | 10 min |
| 5 | Frontend: auth pages + token handling | 20 min |
| 6 | Frontend: task list + CRUD + filter/search | 18 min |
| 7 | README + design notes + final smoke test | 15 min |

**If you fall behind (triage order):** the test (Phase 4) and any frontend nicety go first. A working backend you can prove with curl/Postman beats a half-built everything. Never cut: password hashing, ownership checks, the README.

---

## Phase 0 — Setup, scaffolding & Postgres (12 min)

Get Postgres running first (this is the one extra cost vs SQLite). Fastest local option is Docker:

```bash
docker run --name tt-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=tasktracker -p 5432:5432 -d postgres
```
(No Docker? A local Postgres install or a free Neon/Supabase database works too — just grab the connection string.)

```bash
mkdir tasktracker && cd tasktracker
# Backend
mkdir backend && cd backend && npm init -y
npm install express pg bcryptjs jsonwebtoken cors dotenv
npm install --save-dev nodemon supertest
cd ..
# Frontend
npm create vite@latest frontend -- --template react
cd frontend && npm install && cd ..
```

- [ ] Postgres reachable on `localhost:5432`
- [ ] Backend `package.json` exists with deps installed (set `"type": "module"` if you want `import` syntax)
- [ ] Frontend scaffolded; `npm run dev` opens the Vite page
- [ ] Create `backend/.env` with `DATABASE_URL=postgres://postgres:postgres@localhost:5432/tasktracker` and `JWT_SECRET=change-me`
- [ ] Create empty files: `backend/server.js`, `backend/db.js`, `backend/schema.sql`

**Understand:** the frontend and backend are two separate processes that only share JSON over HTTP. Postgres is a third process. Nothing is shared in memory — a token is what ties a request back to a user.

---

## Phase 1 — Schema + DB connection (10 min)

In `backend/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  hashed_password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','doing','done')),
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
);
```

In `backend/db.js`, export a `pg` pool:

```js
import pg from "pg";
import "dotenv/config";
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
```

Apply the schema once: `psql "$DATABASE_URL" -f schema.sql` (or run it from a tiny script).

- [ ] Both tables created (check with `psql ... -c '\dt'`)
- [ ] `status` CHECK constraint enforces the three allowed values **at the DB level**
- [ ] A quick `pool.query('SELECT 1')` succeeds

**Understand:** `owner_id` (with the FK) is the linchpin of "users can only touch their own tasks." The DB `CHECK` on `status` is a free safety net — even a buggy endpoint can't insert an invalid status.

---

## Phase 2 — Auth: register, login, hashing, JWT (20 min)

In `backend/server.js` (Express app), build:

```js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// register
const hashed = await bcrypt.hash(password, 10);
// store user; on duplicate username -> 409

// login
const ok = await bcrypt.compare(password, user.hashed_password); // false -> 401
const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: "12h" });
```

Endpoints:
- `POST /register` → reject duplicate username (**409**), hash password, insert user.
- `POST /login` → verify password, return `{ token }`. Wrong creds → **401**.
- Middleware `auth(req, res, next)` → read `Authorization: Bearer <token>`, `jwt.verify`, attach `req.userId`, else **401**. Every task route uses it.

- [ ] Register hashes the password — **plaintext is never stored**
- [ ] Login returns a token; bad credentials return 401
- [ ] `auth` middleware rejects missing/invalid tokens with 401

**Understand:**
- **Hashing vs encryption:** bcrypt is one-way and salted; you verify a password but can never recover it. That's what "securely hashed" requires.
- **JWT:** a signed token the client returns on each request. The signature (your `JWT_SECRET`) is what stops a client from forging `sub` and impersonating another user.

---

## Phase 3 — Task CRUD + ownership + filter/search + errors (25 min)

All task routes use the `auth` middleware. Use **parameterized queries** (`$1, $2…`) everywhere — never string-concatenate input (SQL injection).

- `POST /tasks` — insert with `owner_id = req.userId` (**never** take owner from the body). → **201**
- `GET /tasks` — `WHERE owner_id = $1`, plus optional `status` and `search`:
  ```sql
  SELECT * FROM tasks
  WHERE owner_id = $1
    AND ($2::text IS NULL OR status = $2)
    AND ($3::text IS NULL OR title ILIKE '%'||$3||'%' OR description ILIKE '%'||$3||'%')
  ORDER BY id DESC;
  ```
- `PUT /tasks/:id` — fetch first: **404** if not found, **403** if `owner_id !== req.userId`, else update. → **200**
- `DELETE /tasks/:id` — same ownership check, then delete. → **204**

Status codes to use deliberately: `201` create, `200` read/update, `204` delete, `400` bad input, `401` not logged in, `403` not your task, `404` not found. Send structured errors: `res.status(404).json({ error: "Task not found" })`.

- [ ] Create/list/update/delete all work (test via Postman/curl)
- [ ] A second user **cannot** see or modify the first user's tasks
- [ ] `?status=doing` and `?search=keyword` filter correctly (DB does the filtering)
- [ ] Status codes + JSON error bodies match the spec

**Understand:** the ownership check is **server-side and non-negotiable**. Hiding edit buttons in React is not security — anyone can hit the API directly. The 403 path is what actually protects user data, and it's the most-scrutinized requirement in the spec. Spend your time here.

---

## Phase 4 — One automated test (10 min)

Create `backend/server.test.js` with `node:test` + `supertest` (export your Express `app` from `server.js` so the test can import it without binding a port).

Cover the critical path:
1. Register user A → login → create a task → `GET /tasks` returns it.
2. (Bonus if time) Register user B → B's `GET /tasks` does **not** include A's task, and B gets 403/404 editing it.

Run: `node --test`.

- [ ] `node --test` passes
- [ ] Test asserts on **status codes and body**, not just "no crash"

**Understand:** the ownership-isolation test proves the spec's hardest requirement. If you write only one assertion, make it that one. (Tip: point the test at a throwaway DB or clean up rows after, so it's repeatable.)

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

- [ ] Register → login → land on the task view
- [ ] Token is sent on authenticated requests
- [ ] A failed login shows an error message

**Understand:** `app.use(cors())` is fine for a local demo but wide open; in production you'd restrict it to your frontend's origin. Note that in your README tradeoffs.

---

## Phase 6 — Frontend: task list + CRUD + filter/search + states (18 min)

- Fetch and render the user's tasks on load.
- Form to **create**; inline controls to **edit** (at minimum, change status) and **delete**.
- Status dropdown filter + search box → re-fetch with `?status=` / `?search=` (let the backend filter — don't reimplement client-side).
- **Loading state** while fetching; **error message** when a request fails.

- [ ] List shows only my tasks
- [ ] Create / edit / delete update the list
- [ ] Filter + search hit the backend params and work end-to-end
- [ ] Loading indicator and error text both appear at the right times

**Understand:** the spec explicitly lists "loading states and error messages" — they're cheap (`useState` flags) and reviewers check for them. Don't drop them to polish layout.

---

## Phase 7 — README + design notes + final smoke test (15 min)

Write `README.md` covering:
1. **How to run** — start Postgres, apply `schema.sql`, set `.env`, `npm run dev`/`nodemon server.js` for the API, `npm run dev` for the frontend, and `node --test` for the test.
2. **Design decisions / tradeoffs** — raw `pg` over an ORM (transparency vs boilerplate), JWT in localStorage (simple but XSS-exposed; httpOnly cookie is safer), CORS wide-open for the demo, `status` enforced by a DB CHECK.
3. **Three+ improvements with more time**, e.g.:
   - httpOnly cookie / refresh-token rotation instead of localStorage JWT.
   - Pagination + indexed search instead of returning all tasks.
   - Request validation (e.g. zod) + rate limiting, and a fuller test suite (auth failures, 403 paths).
   - Dockerize the whole stack (`docker-compose`) for one-command startup; move secrets to env management.

Final smoke test, fresh eyes:
- [ ] Register → login → create → filter → search → edit → delete, all from the running UI
- [ ] Log in as a second user → confirm task isolation
- [ ] `node --test` green
- [ ] README runs exactly as written (try the commands literally)

---

## The "do not skip" list (your spec #3: it must work)

1. Passwords hashed (bcrypt), never plaintext.
2. Every task route requires a valid token.
3. Ownership enforced server-side (403/404), proven by a test.
4. Parameterized queries everywhere (no SQL injection).
5. Correct status codes + structured JSON errors.
6. A README that actually runs.

Build top-to-bottom, commit after each phase, and stop polishing the moment this list is green.
