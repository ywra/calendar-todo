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
  const { title, description, status, priority, dueDate, sourceApp, linkedTodoId } = await c.req.json();
  if (!title) return c.json({ error: "title is required" }, 400);
  const issue = createIssue(title, description, status, priority, dueDate, sourceApp, linkedTodoId) as any;

  // Calendar에 할일 자동 생성 (Linear에서 직접 추가 + dueDate가 있는 경우만)
  if (sourceApp !== "calendar" && dueDate) {
    try {
      await fetch("http://localhost:3001/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          dueDate,
          sourceApp: "linear",
          linkedIssueId: issue.id,
        }),
      });
    } catch (e) {
      console.error("Sync to Calendar failed:", e);
    }
  }

  return c.json(issue, 201);
});

// PUT /issues/:id
app.put("/issues/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const fields = await c.req.json();
  const issue = updateIssue(id, fields) as any;
  if (!issue) return c.json({ error: "issue not found" }, 404);

  // Calendar 동기화 (linkedTodoId가 있으면 연결된 할일 업데이트)
  if (issue.linkedTodoId) {
    try {
      const syncFields: Record<string, any> = {};
      if (fields.title) syncFields.title = fields.title;
      if (fields.dueDate !== undefined) syncFields.dueDate = fields.dueDate;
      if (fields.status === "done") syncFields.completed = 1;
      if (Object.keys(syncFields).length > 0) {
        await fetch(`http://localhost:3001/todos/${issue.linkedTodoId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(syncFields),
        });
      }
    } catch (e) {
      console.error("Sync update to Calendar failed:", e);
    }
  } else if (issue.sourceApp !== "calendar") {
    // linkedTodoId가 없지만 issueId로 연결된 할일 검색 후 업데이트
    try {
      const syncFields: Record<string, any> = {};
      if (fields.title) syncFields.title = fields.title;
      if (fields.dueDate !== undefined) syncFields.dueDate = fields.dueDate;
      if (fields.status === "done") syncFields.completed = 1;
      if (Object.keys(syncFields).length > 0) {
        await fetch(`http://localhost:3001/todos/sync/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(syncFields),
        });
      }
    } catch (e) {
      console.error("Sync update to Calendar failed:", e);
    }
  }

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
