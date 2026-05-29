import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const BCRYPT_COST = 10;
const TOKEN_TTL = "12h";

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

router.post("/register", async (req, res) => {
  const { username, password } = req.body ?? {};

  if (!isNonEmptyString(username) || !isNonEmptyString(password)) {
    return res.status(400).json({ error: "username and password are required" });
  }

  const hashed = await bcrypt.hash(password, BCRYPT_COST);

  try {
    const result = db
      .prepare("INSERT INTO users (username, hashed_password) VALUES (?, ?)")
      .run(username, hashed);
    return res.status(201).json({ id: result.lastInsertRowid, username });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "Username already taken" });
    }
    throw err;
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body ?? {};

  if (!isNonEmptyString(username) || !isNonEmptyString(password)) {
    return res.status(400).json({ error: "username and password are required" });
  }

  const user = db
    .prepare("SELECT id, hashed_password FROM users WHERE username = ?")
    .get(username);

  const valid = user && (await bcrypt.compare(password, user.hashed_password));
  if (!valid) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: TOKEN_TTL });
  return res.status(200).json({ token });
});

router.get("/me", requireAuth, (req, res) => {
  const user = db
    .prepare("SELECT id, username FROM users WHERE id = ?")
    .get(req.userId);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  return res.status(200).json(user);
});

export default router;
