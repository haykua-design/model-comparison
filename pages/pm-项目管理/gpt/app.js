const STORAGE_KEY = "teamPmPrototype.v1";

const STATUS = /** @type {const} */ ({
  todo: { id: "todo", title: "待办" },
  doing: { id: "doing", title: "进行中" },
  done: { id: "done", title: "已完成" },
});

const PRIORITY = /** @type {const} */ ({
  low: { id: "low", label: "低" },
  medium: { id: "medium", label: "中" },
  high: { id: "high", label: "高" },
  urgent: { id: "urgent", label: "紧急" },
});

const AVATAR_COLORS = [
  "#7c5cff",
  "#2dd4bf",
  "#fbbf24",
  "#fb7185",
  "#60a5fa",
  "#a78bfa",
  "#34d399",
  "#f472b6",
];

/** @typedef {{id:string,name:string,role:string,color:string}} Member */
/** @typedef {{id:string,title:string,description:string,assigneeId:string|null,dueDate:string|null,priority:keyof typeof PRIORITY,status:keyof typeof STATUS,createdAt:number}} Task */
/** @typedef {{version:1,members:Member[],tasksById:Record<string,Task>,columns:Record<keyof typeof STATUS,{id:string,taskIds:string[]}>}} AppState */

const elBoard = document.getElementById("board");
const elMemberList = document.getElementById("member-list");
const elMemberCount = document.getElementById("member-count");

const elBackdrop = document.getElementById("modal-backdrop");
const elTaskModal = document.getElementById("task-modal");
const elTaskForm = document.getElementById("task-form");
const elAssigneeSelect = document.getElementById("assignee-select");
const elDeleteTask = document.getElementById("btn-delete-task");

const elMemberModal = document.getElementById("member-modal");
const elMemberForm = document.getElementById("member-form");
const elDeleteMember = document.getElementById("btn-delete-member");

let state = loadState();
let draggedTaskId = null;
let openModal = /** @type {null | "task" | "member"} */ (null);
let activeTaskId = /** @type {string|null} */ (null);
let activeMemberId = /** @type {string|null} */ (null);
let saveTimer = /** @type {number|null} */ (null);
let lastDropAt = 0;

init();

function init() {
  document.getElementById("btn-new-task").addEventListener("click", () => openTaskModal());
  document.getElementById("btn-new-member").addEventListener("click", () => openMemberModal());
  document.getElementById("btn-reset").addEventListener("click", () => {
    if (!confirm("将清空本地数据并恢复 Demo，确认继续？")) return;
    localStorage.removeItem(STORAGE_KEY);
    state = loadState();
    render();
  });

  document.getElementById("task-modal-close").addEventListener("click", closeModals);
  document.getElementById("btn-cancel-task").addEventListener("click", closeModals);
  elDeleteTask.addEventListener("click", () => {
    if (!activeTaskId) return;
    if (!confirm("确认删除该任务？")) return;
    deleteTask(activeTaskId);
    closeModals();
    render();
  });

  document.getElementById("member-modal-close").addEventListener("click", closeModals);
  document.getElementById("btn-cancel-member").addEventListener("click", closeModals);
  elDeleteMember.addEventListener("click", () => {
    if (!activeMemberId) return;
    if (!confirm("确认删除该成员？其负责任务将变为“未分配”。")) return;
    deleteMember(activeMemberId);
    closeModals();
    render();
  });

  elBackdrop.addEventListener("click", closeModals);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModals();
  });

  elTaskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = /** @type {HTMLFormElement} */ (e.currentTarget);
    const data = Object.fromEntries(new FormData(form).entries());
    const id = String(data.id || "");
    const next = normalizeTaskInput({
      id: id || newId(),
      title: String(data.title || "").trim(),
      description: String(data.description || ""),
      assigneeId: String(data.assigneeId || ""),
      dueDate: String(data.dueDate || ""),
      priority: String(data.priority || "medium"),
      status: String(data.status || "todo"),
    });

    if (!next.title) return;

    if (state.tasksById[next.id]) {
      updateTask(next.id, next);
    } else {
      createTask(next);
    }

    closeModals();
    render();
  });

  elMemberForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = /** @type {HTMLFormElement} */ (e.currentTarget);
    const data = Object.fromEntries(new FormData(form).entries());
    const id = String(data.id || "");
    const name = String(data.name || "").trim();
    const role = String(data.role || "Dev");
    if (!name) return;

    if (id && state.members.find((m) => m.id === id)) {
      updateMember(id, { name, role });
    } else {
      addMember({ name, role });
    }

    closeModals();
    render();
  });

  render();
}

function render() {
  ensureColumnIntegrity();
  renderMembers();
  renderAssigneeOptions();
  renderBoard();
  scheduleSave();
}

function renderMembers() {
  elMemberCount.textContent = `${state.members.length} 人`;
  elMemberList.innerHTML = "";

  for (const member of state.members) {
    const row = document.createElement("div");
    row.className = "member";

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.style.background = member.color;
    avatar.textContent = initials(member.name);

    const main = document.createElement("div");
    main.className = "member-main";
    const name = document.createElement("div");
    name.className = "member-name";
    name.textContent = member.name;
    const role = document.createElement("div");
    role.className = "member-role";
    role.textContent = member.role;
    main.append(name, role);

    const actions = document.createElement("div");
    actions.className = "member-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "mini-btn";
    editBtn.type = "button";
    editBtn.textContent = "编辑";
    editBtn.addEventListener("click", () => openMemberModal(member.id));

    actions.append(editBtn);
    row.append(avatar, main, actions);
    elMemberList.append(row);
  }
}

function renderAssigneeOptions() {
  const current = elAssigneeSelect.value;
  elAssigneeSelect.innerHTML = "";

  const none = document.createElement("option");
  none.value = "";
  none.textContent = "未分配";
  elAssigneeSelect.append(none);

  for (const m of state.members) {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = `${m.name}（${m.role}）`;
    elAssigneeSelect.append(opt);
  }

  if (current) elAssigneeSelect.value = current;
}

function renderBoard() {
  elBoard.innerHTML = "";

  for (const statusId of /** @type {(keyof typeof STATUS)[]} */ (Object.keys(STATUS))) {
    const col = document.createElement("div");
    col.className = "column";
    col.dataset.status = statusId;

    const header = document.createElement("div");
    header.className = "column-header";

    const title = document.createElement("div");
    title.className = "column-title";
    title.textContent = STATUS[statusId].title;

    const pill = document.createElement("div");
    pill.className = "pill";
    pill.textContent = String(state.columns[statusId].taskIds.length);

    header.append(title, pill);

    const list = document.createElement("div");
    list.className = "task-list";
    list.dataset.status = statusId;

    list.addEventListener("dragover", (e) => {
      e.preventDefault();
      list.classList.add("drag-over");
    });
    list.addEventListener("dragleave", () => list.classList.remove("drag-over"));
    list.addEventListener("drop", (e) => {
      e.preventDefault();
      list.classList.remove("drag-over");
      if (!draggedTaskId) return;
      moveTaskByDrop({ taskId: draggedTaskId, targetStatus: statusId, beforeTaskId: null });
      render();
    });

    for (const taskId of state.columns[statusId].taskIds) {
      const task = state.tasksById[taskId];
      if (!task) continue;
      const card = renderTaskCard(task);
      list.append(card);
    }

    col.append(header, list);
    elBoard.append(col);
  }
}

function renderTaskCard(task) {
  const card = document.createElement("div");
  card.className = "task-card";
  card.draggable = true;
  card.dataset.taskId = task.id;
  card.dataset.status = task.status;

  card.addEventListener("click", () => {
    if (Date.now() - lastDropAt < 350) return;
    openTaskModal(task.id);
  });
  card.addEventListener("dragstart", (e) => {
    draggedTaskId = task.id;
    try {
      e.dataTransfer?.setData("text/plain", task.id);
      e.dataTransfer?.setDragImage(card, 12, 12);
    } catch {}
  });
  card.addEventListener("dragend", () => {
    draggedTaskId = null;
  });
  card.addEventListener("dragover", (e) => {
    e.preventDefault();
  });
  card.addEventListener("drop", (e) => {
    e.preventDefault();
    lastDropAt = Date.now();
    const beforeTaskId = card.dataset.taskId || null;
    const targetStatus = /** @type {keyof typeof STATUS} */ (card.dataset.status);
    if (!draggedTaskId) return;
    moveTaskByDrop({ taskId: draggedTaskId, targetStatus, beforeTaskId });
    render();
  });

  const title = document.createElement("div");
  title.className = "task-title";
  title.textContent = task.title;

  const meta = document.createElement("div");
  meta.className = "task-meta";

  const left = document.createElement("div");
  left.className = "meta-left";

  const assignee = document.createElement("div");
  assignee.className = "assignee-chip";

  const { label: assigneeLabel, color: assigneeColor, initials: assigneeInitials } = getAssigneeMeta(task.assigneeId);
  const av = document.createElement("div");
  av.className = "avatar";
  av.style.background = assigneeColor;
  av.textContent = assigneeInitials;

  const an = document.createElement("div");
  an.className = "assignee-name";
  an.textContent = assigneeLabel;

  assignee.append(av, an);

  const due = document.createElement("div");
  due.textContent = task.dueDate ? `截止 ${formatDate(task.dueDate)}` : "无截止";

  left.append(assignee, due);

  const badge = document.createElement("div");
  badge.className = `badge ${task.priority}`;
  badge.textContent = `优先级：${PRIORITY[task.priority]?.label ?? "中"}`;

  meta.append(left, badge);
  card.append(title, meta);
  return card;
}

function openTaskModal(taskId) {
  openModal = "task";
  activeTaskId = taskId || null;
  const task = taskId ? state.tasksById[taskId] : null;

  setHidden(elMemberModal, true);
  setHidden(elTaskModal, false);
  setHidden(elBackdrop, false);

  elTaskForm.reset();
  elTaskForm.elements.id.value = task?.id || "";
  elTaskForm.elements.title.value = task?.title || "";
  elTaskForm.elements.description.value = task?.description || "";
  elTaskForm.elements.assigneeId.value = task?.assigneeId || "";
  elTaskForm.elements.dueDate.value = task?.dueDate || "";
  elTaskForm.elements.priority.value = task?.priority || "medium";
  elTaskForm.elements.status.value = task?.status || "todo";
  elDeleteTask.style.visibility = task ? "visible" : "hidden";

  const title = document.getElementById("task-modal-title");
  title.textContent = task ? "任务详情" : "新建任务";

  queueMicrotask(() => elTaskForm.elements.title.focus());
}

function openMemberModal(memberId) {
  openModal = "member";
  activeMemberId = memberId || null;
  const member = memberId ? state.members.find((m) => m.id === memberId) : null;

  setHidden(elTaskModal, true);
  setHidden(elMemberModal, false);
  setHidden(elBackdrop, false);

  elMemberForm.reset();
  elMemberForm.elements.id.value = member?.id || "";
  elMemberForm.elements.name.value = member?.name || "";
  elMemberForm.elements.role.value = member?.role || "Dev";

  const title = document.getElementById("member-modal-title");
  title.textContent = member ? "编辑成员" : "添加成员";
  setHidden(elDeleteMember, !member);

  queueMicrotask(() => elMemberForm.elements.name.focus());
}

function closeModals() {
  if (!openModal) return;
  openModal = null;
  activeTaskId = null;
  activeMemberId = null;
  setHidden(elTaskModal, true);
  setHidden(elMemberModal, true);
  setHidden(elBackdrop, true);
}

function moveTaskByDrop({ taskId, targetStatus, beforeTaskId }) {
  const task = state.tasksById[taskId];
  if (!task) return;

  // remove from all columns
  for (const statusId of /** @type {(keyof typeof STATUS)[]} */ (Object.keys(STATUS))) {
    const ids = state.columns[statusId].taskIds;
    const idx = ids.indexOf(taskId);
    if (idx >= 0) ids.splice(idx, 1);
  }

  const targetIds = state.columns[targetStatus].taskIds;
  if (beforeTaskId) {
    const at = targetIds.indexOf(beforeTaskId);
    if (at >= 0) targetIds.splice(at, 0, taskId);
    else targetIds.push(taskId);
  } else {
    targetIds.push(taskId);
  }

  task.status = targetStatus;
}

function createTask(taskLike) {
  const task = /** @type {Task} */ ({
    id: taskLike.id,
    title: taskLike.title,
    description: taskLike.description,
    assigneeId: taskLike.assigneeId,
    dueDate: taskLike.dueDate,
    priority: taskLike.priority,
    status: taskLike.status,
    createdAt: Date.now(),
  });
  state.tasksById[task.id] = task;
  state.columns[task.status].taskIds.push(task.id);
}

function updateTask(taskId, patch) {
  const current = state.tasksById[taskId];
  if (!current) return;

  const nextStatus = patch.status || current.status;
  const statusChanged = nextStatus !== current.status;

  state.tasksById[taskId] = {
    ...current,
    title: patch.title,
    description: patch.description,
    assigneeId: patch.assigneeId,
    dueDate: patch.dueDate,
    priority: patch.priority,
    status: nextStatus,
  };

  if (statusChanged) {
    const fromIds = state.columns[current.status].taskIds;
    const idx = fromIds.indexOf(taskId);
    if (idx >= 0) fromIds.splice(idx, 1);
    state.columns[nextStatus].taskIds.unshift(taskId);
  }
}

function deleteTask(taskId) {
  delete state.tasksById[taskId];
  for (const statusId of /** @type {(keyof typeof STATUS)[]} */ (Object.keys(STATUS))) {
    const ids = state.columns[statusId].taskIds;
    const idx = ids.indexOf(taskId);
    if (idx >= 0) ids.splice(idx, 1);
  }
}

function addMember({ name, role }) {
  const member = /** @type {Member} */ ({
    id: newId(),
    name,
    role,
    color: pickColor(name),
  });
  state.members.unshift(member);
}

function updateMember(memberId, patch) {
  const m = state.members.find((x) => x.id === memberId);
  if (!m) return;
  m.name = patch.name ?? m.name;
  m.role = patch.role ?? m.role;
  m.color = pickColor(m.name);
}

function deleteMember(memberId) {
  state.members = state.members.filter((m) => m.id !== memberId);
  for (const task of Object.values(state.tasksById)) {
    if (task.assigneeId === memberId) task.assigneeId = null;
  }
}

function getAssigneeMeta(assigneeId) {
  const m = assigneeId ? state.members.find((x) => x.id === assigneeId) : null;
  if (!m) return { label: "未分配", color: "rgba(255,255,255,0.18)", initials: "—" };
  return { label: m.name, color: m.color, initials: initials(m.name) };
}

function normalizeTaskInput(input) {
  const status = /** @type {keyof typeof STATUS} */ (Object.keys(STATUS).includes(input.status) ? input.status : "todo");
  const priority = /** @type {keyof typeof PRIORITY} */ (
    Object.keys(PRIORITY).includes(input.priority) ? input.priority : "medium"
  );
  const assigneeId = input.assigneeId ? String(input.assigneeId) : null;
  const dueDate = input.dueDate ? String(input.dueDate) : null;
  return {
    id: String(input.id),
    title: String(input.title || ""),
    description: String(input.description || ""),
    assigneeId,
    dueDate,
    priority,
    status,
  };
}

function ensureColumnIntegrity() {
  for (const statusId of /** @type {(keyof typeof STATUS)[]} */ (Object.keys(STATUS))) {
    const ids = state.columns[statusId]?.taskIds || [];
    state.columns[statusId] = state.columns[statusId] || { id: statusId, taskIds: [] };
    state.columns[statusId].taskIds = ids.filter((id) => Boolean(state.tasksById[id]));
  }
}

function scheduleSave() {
  if (saveTimer) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    saveTimer = null;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, 120);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 1) return /** @type {AppState} */ (parsed);
    }
  } catch {}
  return demoState();
}

function demoState() {
  const members = [
    makeMember("李雷", "PM"),
    makeMember("韩梅梅", "Design"),
    makeMember("张伟", "Dev"),
    makeMember("王芳", "QA"),
  ];

  const tasks = [
    makeTask({
      title: "对齐需求范围 & 里程碑",
      description: "把本期目标拆成 2–3 个可交付里程碑，明确验收标准。",
      assigneeId: members[0].id,
      dueInDays: 2,
      priority: "high",
      status: "todo",
    }),
    makeTask({
      title: "看板原型交互走查",
      description: "确认拖拽、弹窗编辑、信息密度是否适配 10–30 人团队。",
      assigneeId: members[1].id,
      dueInDays: 4,
      priority: "medium",
      status: "todo",
    }),
    makeTask({
      title: "接入成员与权限模型（草案）",
      description: "定义角色：PM/开发/设计/测试/运维，明确可见性与操作权限边界。",
      assigneeId: members[2].id,
      dueInDays: 6,
      priority: "medium",
      status: "doing",
    }),
    makeTask({
      title: "清理历史任务 & 标签规范",
      description: "统一命名：动词开头、可验收、可拆分；补齐截止日期。",
      assigneeId: members[0].id,
      dueInDays: 7,
      priority: "low",
      status: "doing",
    }),
    makeTask({
      title: "发布 v0.1 Demo（内部）",
      description: "收集 3 轮团队反馈，形成下一步迭代清单。",
      assigneeId: members[3].id,
      dueInDays: 10,
      priority: "urgent",
      status: "done",
    }),
  ];

  /** @type {AppState} */
  const initial = {
    version: 1,
    members,
    tasksById: Object.fromEntries(tasks.map((t) => [t.id, t])),
    columns: {
      todo: { id: "todo", taskIds: tasks.filter((t) => t.status === "todo").map((t) => t.id) },
      doing: { id: "doing", taskIds: tasks.filter((t) => t.status === "doing").map((t) => t.id) },
      done: { id: "done", taskIds: tasks.filter((t) => t.status === "done").map((t) => t.id) },
    },
  };
  return initial;
}

function makeMember(name, role) {
  return /** @type {Member} */ ({
    id: newId(),
    name,
    role,
    color: pickColor(name),
  });
}

function makeTask({ title, description, assigneeId, dueInDays, priority, status }) {
  const due = new Date();
  due.setDate(due.getDate() + dueInDays);
  return /** @type {Task} */ ({
    id: newId(),
    title,
    description,
    assigneeId: assigneeId || null,
    dueDate: due.toISOString().slice(0, 10),
    priority,
    status,
    createdAt: Date.now(),
  });
}

function pickColor(seed) {
  const n = hashCode(seed);
  return AVATAR_COLORS[Math.abs(n) % AVATAR_COLORS.length];
}

function initials(name) {
  const s = String(name || "").trim();
  if (!s) return "—";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  const chars = Array.from(s);
  return chars.slice(0, 2).join("").toUpperCase();
}

function formatDate(isoDate) {
  // isoDate: YYYY-MM-DD
  const [y, m, d] = String(isoDate).split("-").map((x) => Number(x));
  if (!y || !m || !d) return String(isoDate);
  return `${m}/${d}`;
}

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id_${Date.now().toString(36)}_${Math.random().toString(16).slice(2)}`;
}

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return h | 0;
}

function setHidden(el, hidden) {
  if (!el) return;
  el.hidden = Boolean(hidden);
}
