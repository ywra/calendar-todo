import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { getAllIssues, createIssue, updateIssue, deleteIssue } from "./db";

const app = new Hono();

app.use("/*", cors());

// 정적 파일
app.get("/", serveStatic({ path: "./public/index.html" }));
app.get("/style.css", serveStatic({ path: "./public/style.css" }));
app.get("/app.js", serveStatic({ path: "./public/app.js" }));

// GET /issues
app.get("/issues", (c) => {
  const status = c.req.query("status");
  const priority = c.req.query("priority");
  const issues = getAllIssues(status, priority);
  return c.json(issues);
});

// POST /issues
app.post("/issues", async (c) => {
  const { title, description, status, priority } = await c.req.json();
  if (!title) return c.json({ error: "title is required" }, 400);
  const issue = createIssue(title, description, status, priority);
  return c.json(issue, 201);
});

// PUT /issues/:id
app.put("/issues/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const fields = await c.req.json();
  const issue = updateIssue(id, fields);
  if (!issue) return c.json({ error: "issue not found" }, 404);
  return c.json(issue);
});

// DELETE /issues/:id
app.delete("/issues/:id", (c) => {
  const id = Number(c.req.param("id"));
  const issue = deleteIssue(id);
  if (!issue) return c.json({ error: "issue not found" }, 404);
  return c.json({ message: "deleted", issue });
});

export default {
  port: 3002,
  fetch: app.fetch,
};

console.log("Linear Clone running on http://localhost:3002");
