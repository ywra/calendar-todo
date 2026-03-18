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

// 연동 컬럼 마이그레이션
try { db.run("ALTER TABLE todos ADD COLUMN sourceApp TEXT"); } catch {}
try { db.run("ALTER TABLE todos ADD COLUMN linkedIssueId INTEGER"); } catch {}

export function getAllTodos() {
  return db.query("SELECT * FROM todos ORDER BY createdAt DESC").all();
}

export function createTodo(title: string, dueDate?: string, sourceApp?: string, linkedIssueId?: number) {
  const stmt = db.prepare(
    "INSERT INTO todos (title, dueDate, sourceApp, linkedIssueId) VALUES (?, ?, ?, ?)"
  );
  const result = stmt.run(title, dueDate ?? null, sourceApp ?? null, linkedIssueId ?? null);
  return db
    .query("SELECT * FROM todos WHERE id = ?")
    .get(result.lastInsertRowid);
}

export function updateTodo(id: number, fields?: Record<string, any>) {
  if (!fields) {
    // 기존 동작: 완료 처리
    db.run("UPDATE todos SET completed = 1 WHERE id = ?", [id]);
  } else {
    const updates: string[] = [];
    const params: any[] = [];
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && !["id", "createdAt", "sourceApp", "linkedIssueId"].includes(key)) {
        updates.push(`${key} = ?`);
        params.push(value);
      }
    }
    if (updates.length > 0) {
      params.push(id);
      db.prepare(`UPDATE todos SET ${updates.join(", ")} WHERE id = ?`).run(...params);
    }
  }
  return db.query("SELECT * FROM todos WHERE id = ?").get(id);
}

export function findTodoByLinkedIssueId(issueId: number) {
  return db.query("SELECT * FROM todos WHERE linkedIssueId = ?").get(issueId);
}

export function deleteTodo(id: number) {
  const todo = db.query("SELECT * FROM todos WHERE id = ?").get(id);
  if (!todo) return null;
  db.run("DELETE FROM todos WHERE id = ?", [id]);
  return todo;
}
