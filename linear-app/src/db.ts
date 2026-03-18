import { Database } from "bun:sqlite";

const db = new Database("linear.db");

db.run(`
  CREATE TABLE IF NOT EXISTS issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'backlog',
    priority TEXT DEFAULT 'none',
    createdAt TEXT DEFAULT (datetime('now', 'localtime')),
    updatedAt TEXT DEFAULT (datetime('now', 'localtime'))
  )
`);

// 연동 컬럼 마이그레이션
try { db.run("ALTER TABLE issues ADD COLUMN dueDate TEXT"); } catch {}
try { db.run("ALTER TABLE issues ADD COLUMN sourceApp TEXT"); } catch {}
try { db.run("ALTER TABLE issues ADD COLUMN linkedTodoId INTEGER"); } catch {}

export interface Issue {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate?: string;
  sourceApp?: string;
  linkedTodoId?: number;
  createdAt: string;
  updatedAt: string;
}

export function getAllIssues(status?: string, priority?: string): Issue[] {
  let query = "SELECT * FROM issues";
  const conditions: string[] = [];
  const params: string[] = [];

  if (status) {
    conditions.push("status = ?");
    params.push(status);
  }
  if (priority) {
    conditions.push("priority = ?");
    params.push(priority);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }
  query += " ORDER BY createdAt DESC";

  return db.prepare(query).all(...params) as Issue[];
}

export function getIssue(id: number): Issue | null {
  return (db.prepare("SELECT * FROM issues WHERE id = ?").get(id) as Issue) || null;
}

export function createIssue(title: string, description: string, status: string, priority: string, dueDate?: string, sourceApp?: string, linkedTodoId?: number): Issue {
  const stmt = db.prepare(
    "INSERT INTO issues (title, description, status, priority, dueDate, sourceApp, linkedTodoId) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const result = stmt.run(title, description || "", status || "backlog", priority || "none", dueDate ?? null, sourceApp ?? null, linkedTodoId ?? null);
  return getIssue(result.lastInsertRowid as number)!;
}

export function updateIssue(id: number, fields: Partial<Omit<Issue, "id" | "createdAt" | "updatedAt">>): Issue | null {
  const existing = getIssue(id);
  if (!existing) return null;

  const updates: string[] = [];
  const params: any[] = [];

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      updates.push(`${key} = ?`);
      params.push(value);
    }
  }

  if (updates.length === 0) return existing;

  updates.push("updatedAt = datetime('now', 'localtime')");
  params.push(id);

  db.prepare(`UPDATE issues SET ${updates.join(", ")} WHERE id = ?`).run(...params);
  return getIssue(id);
}

export function deleteIssue(id: number): Issue | null {
  const existing = getIssue(id);
  if (!existing) return null;
  db.prepare("DELETE FROM issues WHERE id = ?").run(id);
  return existing;
}
