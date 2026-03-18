import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { getAllTodos, createTodo, updateTodo, deleteTodo } from "./db";

const app = new Hono();

app.use("/*", cors());

// 메인 페이지
app.get("/", serveStatic({ path: "./public/index.html" }));

// GET /todos — 전체 목록
app.get("/todos", (c) => {
  const todos = getAllTodos();
  return c.json(todos);
});

// POST /todos — 새 할일 추가
app.post("/todos", async (c) => {
  const body = await c.req.json();
  const { title, dueDate, sourceApp, linkedIssueId } = body;

  if (!title) {
    return c.json({ error: "title is required" }, 400);
  }

  const todo = createTodo(title, dueDate, sourceApp, linkedIssueId) as any;

  // Linear에 이슈 자동 생성 (Calendar에서 직접 추가한 경우만)
  if (sourceApp !== "linear") {
    try {
      await fetch("http://localhost:3002/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          dueDate,
          description: "",
          status: "backlog",
          priority: "none",
          sourceApp: "calendar",
          linkedTodoId: todo.id,
        }),
      });
    } catch (e) {
      console.error("Sync to Linear failed:", e);
    }
  }

  return c.json(todo, 201);
});

// PUT /todos/:id — 완료 처리
app.put("/todos/:id", (c) => {
  const id = Number(c.req.param("id"));
  const todo = updateTodo(id);

  if (!todo) {
    return c.json({ error: "todo not found" }, 404);
  }

  return c.json(todo);
});

// DELETE /todos/:id — 삭제
app.delete("/todos/:id", (c) => {
  const id = Number(c.req.param("id"));
  const todo = deleteTodo(id);

  if (!todo) {
    return c.json({ error: "todo not found" }, 404);
  }

  return c.json({ message: "deleted", todo });
});

export default {
  port: 3001,
  fetch: app.fetch,
};

console.log("Todo API server running on http://localhost:3001");
