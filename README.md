# Todo Calendar

웹 캘린더 기반 할일 관리 앱. REST API + MCP 서버를 통해 Claude Code에서도 일정을 관리할 수 있습니다.

## Tech Stack

- **Bun + Hono** — API 서버
- **SQLite** (bun:sqlite) — 데이터 저장
- **MCP Server** — Claude Code 연동
- **Vanilla JS** — 캘린더 프론트엔드

## 설치 및 실행

```bash
# 의존성 설치
bun install

# 서버 실행 (포트 3001)
bun run start

# 개발 모드 (핫리로드)
bun run dev
```

브라우저에서 http://localhost:3001 접속

## API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /todos | 전체 할일 조회 |
| POST | /todos | 할일 추가 (`title`, `dueDate`) |
| PUT | /todos/:id | 완료 처리 |
| DELETE | /todos/:id | 삭제 |

### 사용 예시

```bash
# 할일 추가
curl -X POST http://localhost:3001/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"회의","dueDate":"2026-03-20"}'

# 전체 조회
curl http://localhost:3001/todos

# 완료 처리
curl -X PUT http://localhost:3001/todos/1

# 삭제
curl -X DELETE http://localhost:3001/todos/1
```

## MCP 서버 (Claude Code 연동)

`.mcp.json`에 아래 설정을 추가하면 Claude Code에서 자연어로 일정을 관리할 수 있습니다.

```json
{
  "mcpServers": {
    "calendar-todo": {
      "command": "bun",
      "args": ["run", "/path/to/calendar_app/mcp-server.ts"]
    }
  }
}
```

### MCP 도구

| 도구 | 설명 |
|------|------|
| `list-todos` | 전체 할일 조회 |
| `add-todo` | 할일 추가 (title, dueDate) |
| `complete-todo` | 완료 처리 (id) |
| `delete-todo` | 삭제 (id) |

## 파일 구조

```
calendar_app/
├── src/
│   ├── index.ts        # Hono API 서버 + 라우트
│   └── db.ts           # SQLite DB 초기화 + CRUD
├── public/
│   └── index.html      # 캘린더 프론트엔드
├── mcp-server.ts       # MCP 서버 (Claude Code 연동)
├── package.json
└── .gitignore
```
