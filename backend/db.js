import { readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import "dotenv/config";

const here = dirname(fileURLToPath(import.meta.url));
const configured = process.env.DATABASE_FILE ?? "./data/app.db";

// ":memory:" => a true in-memory DB (used by the test suite): it must reach
// better-sqlite3 verbatim, so skip path resolution and directory creation.
const dbFile = configured === ":memory:" ? ":memory:" : resolve(here, configured);
if (dbFile !== ":memory:") {
  mkdirSync(dirname(dbFile), { recursive: true });
}

export const db = new Database(dbFile);
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

const schema = readFileSync(resolve(here, "schema.sql"), "utf8").trim();
if (schema.length > 0) db.exec(schema);
