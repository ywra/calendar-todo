import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API = "http://localhost:3001";

const server = new McpServer({
  name: "calendar-todo",
  version: "1.0.0",
});

// 전체 할일 조회
server.tool("list-todos", "캘린더의 전체 할일 목록을 조회합니다", {}, async () => {
  const res = await fetch(`${API}/todos`);
  const todos = await res.json();
  return {
    content: [{ type: "text", text: JSON.stringify(todos, null, 2) }],
  };
});

// 할일 추가
server.tool(
  "add-todo",
  "캘린더에 새 할일을 추가합니다",
  {
    title: z.string().describe("할일 제목"),
    dueDate: z.string().describe("마감일 (YYYY-MM-DD 형식)"),
  },
  async ({ title, dueDate }) => {
    const res = await fetch(`${API}/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, dueDate }),
    });
    const todo = await res.json();
    return {
      content: [{ type: "text", text: JSON.stringify(todo, null, 2) }],
    };
  }
);

// 할일 완료 처리
server.tool(
  "complete-todo",
  "할일을 완료 처리합니다",
  {
    id: z.number().describe("할일 ID"),
  },
  async ({ id }) => {
    const res = await fetch(`${API}/todos/${id}`, { method: "PUT" });
    const todo = await res.json();
    return {
      content: [{ type: "text", text: JSON.stringify(todo, null, 2) }],
    };
  }
);

// 할일 삭제
server.tool(
  "delete-todo",
  "할일을 삭제합니다",
  {
    id: z.number().describe("할일 ID"),
  },
  async ({ id }) => {
    const res = await fetch(`${API}/todos/${id}`, { method: "DELETE" });
    const result = await res.json();
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
