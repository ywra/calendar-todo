import { Database } from "bun:sqlite";

const db = new Database("calendar_todo.db");

db.run(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    dueDate TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

export function getAllTodos() {
  return db.query("SELECT * FROM todos ORDER BY createdAt DESC").all();
}

export function createTodo(title: string, dueDate?: string) {
  const stmt = db.prepare(
    "INSERT INTO todos (title, dueDate) VALUES (?, ?)"
  );
  const result = stmt.run(title, dueDate ?? null);
  return db
    .query("SELECT * FROM todos WHERE id = ?")
    .get(result.lastInsertRowid);
}

export function updateTodo(id: number) {
  db.run("UPDATE todos SET completed = 1 WHERE id = ?", [id]);
  return db.query("SELECT * FROM todos WHERE id = ?").get(id);
}

export function deleteTodo(id: number) {
  const todo = db.query("SELECT * FROM todos WHERE id = ?").get(id);
  if (!todo) return null;
  db.run("DELETE FROM todos WHERE id = ?", [id]);
  return todo;
}
