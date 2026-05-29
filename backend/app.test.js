import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "./app.js";

const PASSWORD = "correct-horse-battery";

async function makeUser(username) {
  await request(app).post("/register").send({ username, password: PASSWORD }).expect(201);
  const res = await request(app).post("/login").send({ username, password: PASSWORD }).expect(200);
  return res.body.token;
}

function authed(method, path, token) {
  return request(app)[method](path).set("Authorization", `Bearer ${token}`);
}

describe("auth + tasks critical path", () => {
  let token;

  beforeAll(async () => {
    token = await makeUser("alice");
  });

  it("registers, logs in, and /me identifies the user", async () => {
    const res = await authed("get", "/me", token).expect(200);
    expect(res.body).toMatchObject({ username: "alice" });
    expect(res.body.id).toEqual(expect.any(Number));
  });

  it("creates a task and returns it from GET /tasks", async () => {
    const created = await authed("post", "/tasks", token)
      .send({ title: "Write the Vitest suite", status: "doing" })
      .expect(201);
    expect(created.body).toMatchObject({
      title: "Write the Vitest suite",
      status: "doing",
    });
    expect(created.body.id).toEqual(expect.any(Number));

    const list = await authed("get", "/tasks", token).expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(created.body.id);
  });

  it("rejects unauthenticated task access with 401", async () => {
    const res = await request(app).get("/tasks").expect(401);
    expect(res.body).toHaveProperty("error");
  });
});

describe("ownership is enforced server-side", () => {
  let ownerToken;
  let intruderToken;
  let taskId;

  beforeAll(async () => {
    ownerToken = await makeUser("owner");
    intruderToken = await makeUser("intruder");

    const created = await authed("post", "/tasks", ownerToken)
      .send({ title: "Owned by owner" })
      .expect(201);
    taskId = created.body.id;
  });

  it("does not leak another user's task into their list", async () => {
    const list = await authed("get", "/tasks", intruderToken).expect(200);
    expect(list.body.some((task) => task.id === taskId)).toBe(false);
  });

  it("forbids updating another user's task with 403", async () => {
    const res = await authed("put", `/tasks/${taskId}`, intruderToken)
      .send({ title: "hijacked" })
      .expect(403);
    expect(res.body).toHaveProperty("error");
  });

  it("forbids deleting another user's task with 403", async () => {
    await authed("delete", `/tasks/${taskId}`, intruderToken).expect(403);
  });

  it("still serves the owner their own task untouched", async () => {
    const list = await authed("get", "/tasks", ownerToken).expect(200);
    const task = list.body.find((t) => t.id === taskId);
    expect(task).toMatchObject({ title: "Owned by owner" });
  });
});
