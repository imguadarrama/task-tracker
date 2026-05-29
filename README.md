# Task Tracker

A minimal task-tracking app: register, log in, create/edit/delete tasks, filter by status, search by keyword. Built as a take-home exercise — focus is correctness and clarity, not UI polish.

**Status:** In progress. This README is updated as the project evolves through its build phases. See `docs/build-plan.md` for the phase-by-phase plan and `docs/DECISIONS.md` for the running log of design choices.

---

## Stack

- **Backend:** Node.js (≥ 20) + Express, raw SQL via `better-sqlite3`, auth via `bcryptjs` + `jsonwebtoken`.
- **Frontend:** React (Vite), plain `fetch` for API calls, `localStorage` for the JWT.
- **Database:** SQLite — single file, no server to install. See `docs/DECISIONS.md` for why this was chosen over Postgres for the take-home.
- **Tests:** Vitest + `supertest` (run in-process against the exported Express app). See `docs/DECISIONS.md` D10.

---

## How to run

Requires Node 20+ (developed against Node 22). No Docker, no separate database server, no manual migration step — the schema is applied automatically on backend startup.

```bash
# 1. Backend
cd backend
cp .env.example .env          # then edit JWT_SECRET (see note below)
npm install
npm run dev                   # starts the API on http://localhost:3000

# 2. Frontend (in a second terminal)
cd frontend
npm install
npm run dev                   # starts Vite on http://localhost:5173
```

> Generate a real `JWT_SECRET` with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### Running the tests

```bash
cd backend
npm test            # vitest run — single pass
npm run test:watch  # vitest watch mode
```

The suite drives the Express app in-process with `supertest` against a throwaway in-memory SQLite DB,
covering the critical path (register → login → `/me` → create → list) and server-side ownership (a
second user can't see or modify another user's task — 403). No `.env` or running server needed.

---

## Project structure

```
.
├── backend/
│   ├── server.js          # Express app + routes
│   ├── db.js              # SQLite connection, applies schema.sql on startup
│   ├── schema.sql         # users + tasks tables, CHECK constraints, FK
│   ├── data/              # SQLite DB file lives here (gitignored)
│   ├── .env.example       # template — copy to .env
│   └── package.json
├── frontend/              # Vite + React app
├── docs/
│   ├── DECISIONS.md       # running log of design decisions and tradeoffs
│   ├── build-plan.md      # phase-by-phase build plan
│   └── specifications.md  # original assignment brief
├── CLAUDE.md              # operating rules for code in this repo
└── README.md              # this file
```

---

## Design decisions & tradeoffs

The short version is in this section. The full reasoning behind every non-obvious choice is in **`docs/DECISIONS.md`**, which is updated as decisions are made (not reconstructed at the end).

Highlights:

- **SQLite over Postgres** for the take-home — `npm install && npm run dev` with zero external services. Schema and queries port 1:1 to Postgres for production.
- **Raw SQL over an ORM** — every query is hand-written and directly defensible.
- **JWT in `localStorage`** — simplest for the demo; an httpOnly cookie would be the production choice.
- **`status` column enforced by a DB `CHECK` constraint** — defense in depth: even a buggy endpoint cannot insert an invalid value.
- **`PRAGMA foreign_keys = ON`** set on every SQLite connection (it's off by default in SQLite for backward compatibility).

---

## Improvements with more time

1. **Move JWT from `localStorage` to an httpOnly cookie** with a refresh-token rotation flow, to neutralize the XSS exfiltration risk.
2. **Pagination + indexed search** on `tasks` — currently we return all of a user's tasks per request and rely on SQL `LIKE`. Adding `LIMIT/OFFSET` (or keyset pagination) plus an index on `owner_id` and a FTS index on `title/description` would scale.
3. **Request validation + rate limiting** — schema validation via `zod` on every endpoint, and an Express rate limiter on `/login` and `/register` to blunt credential stuffing.
4. **Broader test coverage** — currently covers the critical ownership-isolation path; would add auth failure cases, 403/404 paths on every task route, and a small frontend test (e.g., Vitest + Testing Library).
5. **Container the whole stack** (`docker-compose` with the API + a Postgres service) for one-command production-style startup, and move secrets to proper env management.

---

## Tools used

This project was built with AI-assisted pair programming (Claude). Every design decision, tradeoff, and line of code was reviewed and is owned by the author — see `docs/DECISIONS.md` for the reasoning behind each choice.
