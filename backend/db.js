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
