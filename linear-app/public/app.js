const API = "http://localhost:3002";

const STATUSES = [
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "Todo" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
  { key: "cancelled", label: "Cancelled" },
];

const PRIORITIES = ["urgent", "high", "medium", "low", "none"];

let allIssues = [];
let currentView = "board";
let editingIssue = null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ---- API ----
async function fetchIssues() {
  const res = await fetch(`${API}/issues`);
  allIssues = await res.json();
}

async function apiCreateIssue(data) {
  await fetch(`${API}/issues`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  await fetchIssues();
}

async function apiUpdateIssue(id, fields) {
  await fetch(`${API}/issues/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  await fetchIssues();
}

async function apiDeleteIssue(id) {
  await fetch(`${API}/issues/${id}`, { method: "DELETE" });
  await fetchIssues();
}

// ---- Render Board ----
function renderBoard() {
  const board = $("#board");
  board.innerHTML = "";

  STATUSES.forEach((s) => {
    const issues = allIssues.filter((i) => i.status === s.key);
    const col = document.createElement("div");
    col.className = "column";
    col.innerHTML = `
      <div class="column-header">
        <span class="status-icon ${s.key}"></span>
        ${s.label}
        <span class="count">${issues.length}</span>
      </div>
    `;

    const body = document.createElement("div");
    body.className = "column-body";
    body.dataset.status = s.key;

    // Drag & Drop
    body.addEventListener("dragover", (e) => {
      e.preventDefault();
      body.classList.add("drag-over");
    });
    body.addEventListener("dragleave", () => body.classList.remove("drag-over"));
    body.addEventListener("drop", async (e) => {
      e.preventDefault();
      body.classList.remove("drag-over");
      const id = Number(e.dataTransfer.getData("text/plain"));
      if (id) {
        await apiUpdateIssue(id, { status: s.key });
        render();
      }
    });

    issues.forEach((issue) => {
      body.appendChild(createIssueCard(issue));
    });

    col.appendChild(body);
    board.appendChild(col);
  });
}

function createIssueCard(issue) {
  const card = document.createElement("div");
  card.className = "issue-card";
  card.draggable = true;

  card.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", String(issue.id));
    card.classList.add("dragging");
  });
  card.addEventListener("dragend", () => card.classList.remove("dragging"));
  card.addEventListener("click", () => openEditModal(issue));

  card.innerHTML = `
    <div class="issue-card-header">
      <span class="status-icon ${issue.status}"></span>
      <span class="issue-id">LIN-${issue.id}</span>
    </div>
    <div class="issue-title">${escapeHtml(issue.title)}</div>
    <div class="issue-card-footer">
      <span class="priority-badge ${issue.priority}">${issue.priority === "none" ? "" : issue.priority}</span>
      ${issue.dueDate ? `<span style="font-size:11px;color:#888;margin-left:auto;">${issue.dueDate}</span>` : ""}
    </div>
  `;

  return card;
}

// ---- Render List ----
function renderList() {
  const list = $("#listView");
  list.innerHTML = "";

  STATUSES.forEach((s) => {
    const issues = allIssues.filter((i) => i.status === s.key);
    if (issues.length === 0) return;

    const header = document.createElement("div");
    header.className = "list-group-header";
    header.innerHTML = `
      <span class="status-icon ${s.key}"></span>
      ${s.label}
      <span class="count">${issues.length}</span>
    `;
    list.appendChild(header);

    issues.forEach((issue) => {
      const item = document.createElement("div");
      item.className = "list-item";
      item.addEventListener("click", () => openEditModal(issue));
      item.innerHTML = `
        <span class="status-icon ${issue.status}"></span>
        <span class="issue-id">LIN-${issue.id}</span>
        <span class="issue-title">${escapeHtml(issue.title)}</span>
        <div class="list-item-actions">
          <span class="priority-badge ${issue.priority}">${issue.priority === "none" ? "" : issue.priority}</span>
        </div>
      `;
      list.appendChild(item);
    });
  });
}

// ---- Render ----
function render() {
  renderBoard();
  renderList();
}

// ---- Modal ----
function openCreateModal() {
  editingIssue = null;
  $("#modalTitle").textContent = "새 이슈";
  $("#issueTitle").value = "";
  $("#issueDesc").value = "";
  $("#issueStatus").value = "backlog";
  $("#issuePriority").value = "none";
  $("#issueDueDate").value = "";
  $("#deleteBtn").style.display = "none";
  $("#modalOverlay").classList.add("active");
  $("#issueTitle").focus();
}

function openEditModal(issue) {
  editingIssue = issue;
  $("#modalTitle").textContent = `LIN-${issue.id}`;
  $("#issueTitle").value = issue.title;
  $("#issueDesc").value = issue.description || "";
  $("#issueStatus").value = issue.status;
  $("#issuePriority").value = issue.priority;
  $("#issueDueDate").value = issue.dueDate || "";
  $("#deleteBtn").style.display = "inline-block";
  $("#modalOverlay").classList.add("active");
  $("#issueTitle").focus();
}

function closeModal() {
  $("#modalOverlay").classList.remove("active");
  editingIssue = null;
}

async function saveIssue() {
  const title = $("#issueTitle").value.trim();
  if (!title) return;

  const data = {
    title,
    description: $("#issueDesc").value.trim(),
    status: $("#issueStatus").value,
    priority: $("#issuePriority").value,
    dueDate: $("#issueDueDate").value || undefined,
  };

  if (editingIssue) {
    await apiUpdateIssue(editingIssue.id, data);
  } else {
    await apiCreateIssue(data);
  }

  closeModal();
  render();
}

async function deleteCurrentIssue() {
  if (!editingIssue) return;
  await apiDeleteIssue(editingIssue.id);
  closeModal();
  render();
}

// ---- View Toggle ----
function setView(view) {
  currentView = view;
  $$(".view-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.view === view));
  $("#board").style.display = view === "board" ? "flex" : "none";
  $("#listView").style.display = view === "list" ? "block" : "none";
}

// ---- Events ----
$("#createBtn").addEventListener("click", openCreateModal);
$$(".view-btn").forEach((btn) =>
  btn.addEventListener("click", () => setView(btn.dataset.view))
);
$("#modalOverlay").addEventListener("click", (e) => {
  if (e.target === $("#modalOverlay")) closeModal();
});
$("#cancelBtn").addEventListener("click", closeModal);
$("#saveBtn").addEventListener("click", saveIssue);
$("#deleteBtn").addEventListener("click", deleteCurrentIssue);

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
  if (e.key === "c" && !e.ctrlKey && !e.metaKey && !$("#modalOverlay").classList.contains("active")) {
    e.preventDefault();
    openCreateModal();
  }
});

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ---- Init ----
async function init() {
  await fetchIssues();
  render();
}

init();
