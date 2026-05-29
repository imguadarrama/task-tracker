import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { isNonEmptyString, isValidStatus } from "../validators.js";

const router = Router();

router.use(requireAuth);

const STATUS_ERROR = "status must be one of: todo, doing, done";

function loadOwnedTask(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Invalid task id" });
    return null;
  }

  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return null;
  }

  if (task.owner_id !== req.userId) {
    res.status(403).json({ error: "You do not have access to this task" });
    return null;
  }

  return task;
}

router.post("/", (req, res) => {
  const { title, description, status } = req.body ?? {};

  if (!isNonEmptyString(title)) {
    return res.status(400).json({ error: "title is required" });
  }
  if (description !== undefined && typeof description !== "string") {
    return res.status(400).json({ error: "description must be a string" });
  }
  if (status !== undefined && !isValidStatus(status)) {
    return res.status(400).json({ error: STATUS_ERROR });
  }

  const result = db
    .prepare(
      "INSERT INTO tasks (title, description, status, owner_id) VALUES (?, ?, ?, ?)"
    )
    .run(title.trim(), description ?? "", status ?? "todo", req.userId);

  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(result.lastInsertRowid);
  return res.status(201).json(task);
});

router.get("/", (req, res) => {
  const { status, search } = req.query;

  if (status !== undefined && !isValidStatus(status)) {
    return res.status(400).json({ error: STATUS_ERROR });
  }

  const tasks = db
    .prepare(
      `SELECT * FROM tasks
       WHERE owner_id = @owner
         AND (@status IS NULL OR status = @status)
         AND (@search IS NULL OR title       LIKE '%' || @search || '%' COLLATE NOCASE
                              OR description LIKE '%' || @search || '%' COLLATE NOCASE)
       ORDER BY id DESC`
    )
    .all({
      owner: req.userId,
      status: status ?? null,
      search: isNonEmptyString(search) ? search : null,
    });

  return res.status(200).json(tasks);
});

router.put("/:id", (req, res) => {
  const task = loadOwnedTask(req, res);
  if (!task) return;

  const { title, description, status } = req.body ?? {};

  if (title === undefined && description === undefined && status === undefined) {
    return res.status(400).json({ error: "No fields to update" });
  }
  if (title !== undefined && !isNonEmptyString(title)) {
    return res.status(400).json({ error: "title must be a non-empty string" });
  }
  if (description !== undefined && typeof description !== "string") {
    return res.status(400).json({ error: "description must be a string" });
  }
  if (status !== undefined && !isValidStatus(status)) {
    return res.status(400).json({ error: STATUS_ERROR });
  }

  const nextTitle = title !== undefined ? title.trim() : task.title;
  const nextDescription = description !== undefined ? description : task.description;
  const nextStatus = status !== undefined ? status : task.status;

  db.prepare("UPDATE tasks SET title = ?, description = ?, status = ? WHERE id = ?").run(
    nextTitle,
    nextDescription,
    nextStatus,
    task.id
  );

  const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(task.id);
  return res.status(200).json(updated);
});

router.delete("/:id", (req, res) => {
  const task = loadOwnedTask(req, res);
  if (!task) return;

  db.prepare("DELETE FROM tasks WHERE id = ?").run(task.id);
  return res.status(204).end();
});

export default router;
