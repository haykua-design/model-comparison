// ===== Data Store =====
const store = {
  members: [
    { id: 'm1', name: '林小明', role: '前端开发', email: 'xiaoming@team.com', color: '#6366f1' },
    { id: 'm2', name: '王芳', role: 'UI 设计师', email: 'wangfang@team.com', color: '#ec4899' },
    { id: 'm3', name: '张伟', role: '后端开发', email: 'zhangwei@team.com', color: '#10b981' },
    { id: 'm4', name: '李娜', role: '产品经理', email: 'lina@team.com', color: '#f59e0b' },
    { id: 'm5', name: '陈磊', role: '测试工程师', email: 'chenlei@team.com', color: '#06b6d4' },
    { id: 'm6', name: '赵婷', role: '前端开发', email: 'zhaoting@team.com', color: '#8b5cf6' },
    { id: 'm7', name: '刘洋', role: '后端开发', email: 'liuyang@team.com', color: '#ef4444' },
    { id: 'm8', name: '周杰', role: '运维工程师', email: 'zhoujie@team.com', color: '#64748b' },
  ],
  tasks: [
    { id: 't1', title: '用户登录页面重构', desc: '使用新设计稿重构登录页面，支持手机号和邮箱登录', status: 'todo', priority: 'high', assignee: 'm1', dueDate: '2026-03-05', tags: ['前端', '重构'] },
    { id: 't2', title: '消息推送 API 设计', desc: '设计并文档化消息推送系统的 RESTful API', status: 'todo', priority: 'urgent', assignee: 'm3', dueDate: '2026-03-03', tags: ['后端', 'API'] },
    { id: 't3', title: '设计系统组件库更新', desc: '更新 Button、Input、Modal 等基础组件到 v2 版本', status: 'todo', priority: 'medium', assignee: 'm2', dueDate: '2026-03-10', tags: ['设计', '组件'] },
    { id: 't4', title: '数据看板性能优化', desc: '解决数据看板在大数据量下的渲染卡顿问题', status: 'inprogress', priority: 'high', assignee: 'm6', dueDate: '2026-03-04', tags: ['前端', '性能'] },
    { id: 't5', title: '用户权限系统重构', desc: 'RBAC 权限模型实现，支持多租户', status: 'inprogress', priority: 'urgent', assignee: 'm7', dueDate: '2026-03-02', tags: ['后端', '安全'] },
    { id: 't6', title: '移动端适配测试', desc: '覆盖 iOS 和 Android 主流机型的兼容性测试', status: 'inprogress', priority: 'medium', assignee: 'm5', dueDate: '2026-03-08', tags: ['测试', '移动端'] },
    { id: 't7', title: '需求评审 - Sprint 12', desc: '评审下个 Sprint 的产品需求，确认优先级', status: 'todo', priority: 'medium', assignee: 'm4', dueDate: '2026-03-01', tags: ['产品', '评审'] },
    { id: 't8', title: 'CI/CD 流水线优化', desc: '优化构建时间，增加自动化测试覆盖率', status: 'inprogress', priority: 'medium', assignee: 'm8', dueDate: '2026-03-06', tags: ['运维', 'CI/CD'] },
    { id: 't9', title: '首页数据接口开发', desc: '开发首页所需的数据聚合接口，支持缓存', status: 'done', priority: 'high', assignee: 'm3', dueDate: '2026-02-28', tags: ['后端', 'API'] },
    { id: 't10', title: '注册流程 UI 设计', desc: '新用户注册流程的视觉设计和交互稿', status: 'done', priority: 'medium', assignee: 'm2', dueDate: '2026-02-25', tags: ['设计'] },
    { id: 't11', title: '单元测试覆盖率提升', desc: '将核心模块测试覆盖率从 60% 提升到 85%', status: 'done', priority: 'low', assignee: 'm5', dueDate: '2026-02-27', tags: ['测试'] },
    { id: 't12', title: '搜索功能全文索引', desc: '使用 Elasticsearch 实现全文搜索功能', status: 'todo', priority: 'high', assignee: 'm7', dueDate: '2026-03-12', tags: ['后端', '搜索'] },
    { id: 't13', title: '深色模式适配', desc: '全站支持深色模式切换，保存用户偏好', status: 'todo', priority: 'low', assignee: 'm1', dueDate: '2026-03-15', tags: ['前端', 'UI'] },
    { id: 't14', title: '项目文档整理', desc: '整理项目技术文档和 API 文档到 Confluence', status: 'done', priority: 'low', assignee: 'm4', dueDate: '2026-02-26', tags: ['文档'] },
  ],
  nextTaskId: 15,
  nextMemberId: 9,
};

// ===== Utility =====
function genId(prefix) {
  if (prefix === 't') return `t${store.nextTaskId++}`;
  return `m${store.nextMemberId++}`;
}

function getMember(id) {
  return store.members.find(m => m.id === id);
}

function getInitial(name) {
  return name.charAt(0);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getDueStatus(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + 'T00:00:00');
  const diff = (due - now) / (1000 * 60 * 60 * 24);
  if (diff < 0) return 'overdue';
  if (diff <= 2) return 'soon';
  return '';
}

const priorityLabels = { urgent: '紧急', high: '高', medium: '中', low: '低' };

// ===== Rendering =====
function renderBoard() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const filterP = document.getElementById('filterPriority').value;
  const filterM = document.getElementById('filterMember').value;

  const filtered = store.tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search) && !(t.desc || '').toLowerCase().includes(search)) return false;
    if (filterP && t.priority !== filterP) return false;
    if (filterM && t.assignee !== filterM) return false;
    return true;
  });

  ['todo', 'inprogress', 'done'].forEach(status => {
    const col = document.getElementById(`${status}Column`);
    const tasks = filtered.filter(t => t.status === status);
    document.getElementById(`${status}Count`).textContent = tasks.length;

    col.innerHTML = tasks.length === 0
      ? `<div class="empty-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
          <p>暂无任务</p>
        </div>`
      : tasks.map(renderTaskCard).join('');
  });

  initDragAndDrop();
}

function renderTaskCard(task) {
  const member = getMember(task.assignee);
  const dueStatus = getDueStatus(task.dueDate);
  const tagsHtml = (task.tags || []).map(t => `<span class="tag">${t}</span>`).join('');

  return `
    <div class="task-card" draggable="true" data-id="${task.id}">
      <div class="task-card-header">
        <div class="task-card-title">${task.title}</div>
        <span class="priority-badge ${task.priority}">${priorityLabels[task.priority]}</span>
      </div>
      ${task.desc ? `<div class="task-card-desc">${task.desc}</div>` : ''}
      ${tagsHtml ? `<div class="task-card-tags">${tagsHtml}</div>` : ''}
      <div class="task-card-footer">
        <div class="task-card-assignee">
          ${member ? `<div class="avatar avatar-xs" style="background:${member.color}">${getInitial(member.name)}</div>
          <span class="task-card-assignee-name">${member.name}</span>` : '<span class="task-card-assignee-name" style="color:#d1d5db">未指派</span>'}
        </div>
        ${task.dueDate ? `<div class="task-card-due ${dueStatus}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${formatDate(task.dueDate)}
        </div>` : ''}
      </div>
    </div>
  `;
}

function renderTeam() {
  const grid = document.getElementById('teamGrid');
  grid.innerHTML = store.members.map(member => {
    const tasks = store.tasks.filter(t => t.assignee === member.id);
    const active = tasks.filter(t => t.status === 'inprogress').length;
    const done = tasks.filter(t => t.status === 'done').length;
    const todo = tasks.filter(t => t.status === 'todo').length;

    return `
      <div class="member-card" data-id="${member.id}">
        <div class="avatar avatar-lg" style="background:${member.color}">${getInitial(member.name)}</div>
        <div class="member-name">${member.name}</div>
        <div class="member-role">${member.role}</div>
        <div class="member-email">${member.email}</div>
        <div class="member-task-stats">
          <div class="member-stat">
            <div class="member-stat-num">${todo}</div>
            <div class="member-stat-label">待办</div>
          </div>
          <div class="member-stat">
            <div class="member-stat-num" style="color:var(--primary)">${active}</div>
            <div class="member-stat-label">进行中</div>
          </div>
          <div class="member-stat">
            <div class="member-stat-num" style="color:var(--success)">${done}</div>
            <div class="member-stat-label">已完成</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Update stats
  document.getElementById('totalMembers').textContent = store.members.length;
  document.getElementById('totalActiveTasks').textContent = store.tasks.filter(t => t.status === 'inprogress').length;
  document.getElementById('totalCompletedTasks').textContent = store.tasks.filter(t => t.status === 'done').length;

  // Click to edit member
  grid.querySelectorAll('.member-card').forEach(card => {
    card.addEventListener('click', () => openMemberModal(card.dataset.id));
  });
}

function populateAssigneeSelects() {
  const selects = [document.getElementById('taskAssignee'), document.getElementById('filterMember')];
  selects.forEach(sel => {
    const val = sel.value;
    const opts = sel.querySelectorAll('option:not(:first-child)');
    opts.forEach(o => o.remove());
    store.members.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      sel.appendChild(opt);
    });
    sel.value = val;
  });
}

// ===== Drag & Drop =====
let draggedTaskId = null;

function initDragAndDrop() {
  document.querySelectorAll('.task-card').forEach(card => {
    card.addEventListener('dragstart', onDragStart);
    card.addEventListener('dragend', onDragEnd);
    card.addEventListener('click', () => openTaskModal(card.dataset.id));
  });

  document.querySelectorAll('.column-body').forEach(col => {
    col.addEventListener('dragover', onDragOver);
    col.addEventListener('dragenter', onDragEnter);
    col.addEventListener('dragleave', onDragLeave);
    col.addEventListener('drop', onDrop);
  });
}

function onDragStart(e) {
  draggedTaskId = e.currentTarget.dataset.id;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedTaskId);
  // Delay for visual effect
  requestAnimationFrame(() => {
    e.currentTarget.style.opacity = '0.4';
  });
}

function onDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  e.currentTarget.style.opacity = '';
  document.querySelectorAll('.column-body').forEach(col => col.classList.remove('drag-over'));
  document.querySelectorAll('.drop-placeholder').forEach(ph => ph.remove());
  draggedTaskId = null;
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';

  const col = e.currentTarget;
  const afterElement = getDragAfterElement(col, e.clientY);

  // Manage placeholder
  let placeholder = col.querySelector('.drop-placeholder');
  if (!placeholder) {
    placeholder = document.createElement('div');
    placeholder.className = 'drop-placeholder';
  }

  if (afterElement == null) {
    col.appendChild(placeholder);
  } else {
    col.insertBefore(placeholder, afterElement);
  }
}

function getDragAfterElement(container, y) {
  const cards = [...container.querySelectorAll('.task-card:not(.dragging)')];
  return cards.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function onDragEnter(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}

function onDragLeave(e) {
  // Only remove class if we're actually leaving the column
  const rect = e.currentTarget.getBoundingClientRect();
  if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
    e.currentTarget.classList.remove('drag-over');
    const ph = e.currentTarget.querySelector('.drop-placeholder');
    if (ph) ph.remove();
  }
}

function onDrop(e) {
  e.preventDefault();
  const col = e.currentTarget;
  col.classList.remove('drag-over');
  const ph = col.querySelector('.drop-placeholder');
  if (ph) ph.remove();

  if (!draggedTaskId) return;
  const newStatus = col.dataset.status;
  const task = store.tasks.find(t => t.id === draggedTaskId);
  if (task) {
    task.status = newStatus;
    renderBoard();
  }
}

// ===== Task Modal =====
function openTaskModal(taskId) {
  const modal = document.getElementById('taskModal');
  const form = document.getElementById('taskForm');
  const deleteBtn = document.getElementById('deleteTaskBtn');

  form.reset();
  document.getElementById('taskTags').innerHTML = '';
  currentTags = [];

  if (taskId) {
    const task = store.tasks.find(t => t.id === taskId);
    if (!task) return;
    document.getElementById('modalTitle').textContent = '编辑任务';
    document.getElementById('taskId').value = task.id;
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDesc').value = task.desc || '';
    document.getElementById('taskStatus').value = task.status;
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskAssignee').value = task.assignee || '';
    document.getElementById('taskDueDate').value = task.dueDate || '';
    currentTags = [...(task.tags || [])];
    renderTagList();
    deleteBtn.style.display = '';
  } else {
    document.getElementById('modalTitle').textContent = '新建任务';
    document.getElementById('taskId').value = '';
    document.getElementById('taskPriority').value = 'medium';
    deleteBtn.style.display = 'none';
  }

  modal.classList.remove('hidden');
  document.getElementById('taskTitle').focus();
}

function closeTaskModal() {
  document.getElementById('taskModal').classList.add('hidden');
}

function saveTask(e) {
  e.preventDefault();
  const id = document.getElementById('taskId').value;
  const data = {
    title: document.getElementById('taskTitle').value.trim(),
    desc: document.getElementById('taskDesc').value.trim(),
    status: document.getElementById('taskStatus').value,
    priority: document.getElementById('taskPriority').value,
    assignee: document.getElementById('taskAssignee').value,
    dueDate: document.getElementById('taskDueDate').value,
    tags: [...currentTags],
  };

  if (!data.title) return;

  if (id) {
    const task = store.tasks.find(t => t.id === id);
    Object.assign(task, data);
  } else {
    data.id = genId('t');
    store.tasks.push(data);
  }

  closeTaskModal();
  renderBoard();
  renderTeam();
}

function deleteTask() {
  const id = document.getElementById('taskId').value;
  if (!id) return;
  store.tasks = store.tasks.filter(t => t.id !== id);
  closeTaskModal();
  renderBoard();
  renderTeam();
}

// ===== Tag Input =====
let currentTags = [];

function renderTagList() {
  const container = document.getElementById('taskTags');
  container.innerHTML = currentTags.map(tag =>
    `<span class="tag-item">${tag}<span class="remove-tag" data-tag="${tag}">&times;</span></span>`
  ).join('');

  container.querySelectorAll('.remove-tag').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentTags = currentTags.filter(t => t !== btn.dataset.tag);
      renderTagList();
    });
  });
}

// ===== Member Modal =====
function openMemberModal(memberId) {
  const modal = document.getElementById('memberModal');
  const form = document.getElementById('memberForm');
  const deleteBtn = document.getElementById('deleteMemberBtn');

  form.reset();

  // Reset color picker
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
  document.querySelector('.color-swatch[data-color="#6366f1"]').classList.add('active');

  if (memberId) {
    const member = store.members.find(m => m.id === memberId);
    if (!member) return;
    document.getElementById('memberModalTitle').textContent = '编辑成员';
    document.getElementById('memberId').value = member.id;
    document.getElementById('memberName').value = member.name;
    document.getElementById('memberRole').value = member.role;
    document.getElementById('memberEmail').value = member.email || '';
    // Set color
    document.querySelectorAll('.color-swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.color === member.color);
    });
    deleteBtn.style.display = '';
  } else {
    document.getElementById('memberModalTitle').textContent = '添加成员';
    document.getElementById('memberId').value = '';
    deleteBtn.style.display = 'none';
  }

  modal.classList.remove('hidden');
  document.getElementById('memberName').focus();
}

function closeMemberModal() {
  document.getElementById('memberModal').classList.add('hidden');
}

function saveMember(e) {
  e.preventDefault();
  const id = document.getElementById('memberId').value;
  const activeColor = document.querySelector('.color-swatch.active');
  const data = {
    name: document.getElementById('memberName').value.trim(),
    role: document.getElementById('memberRole').value,
    email: document.getElementById('memberEmail').value.trim(),
    color: activeColor ? activeColor.dataset.color : '#6366f1',
  };

  if (!data.name) return;

  if (id) {
    const member = store.members.find(m => m.id === id);
    Object.assign(member, data);
  } else {
    data.id = genId('m');
    store.members.push(data);
  }

  closeMemberModal();
  populateAssigneeSelects();
  renderTeam();
  renderBoard();
}

function deleteMember() {
  const id = document.getElementById('memberId').value;
  if (!id) return;
  store.members = store.members.filter(m => m.id !== id);
  // Unassign tasks
  store.tasks.forEach(t => { if (t.assignee === id) t.assignee = ''; });
  closeMemberModal();
  populateAssigneeSelects();
  renderTeam();
  renderBoard();
}

// ===== Navigation =====
function switchView(view) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-view="${view}"]`).classList.add('active');

  const boardView = document.getElementById('boardView');
  const teamView = document.getElementById('teamView');
  const boardFilters = document.getElementById('boardFilters');
  const addTaskBtn = document.getElementById('addTaskBtn');
  const pageTitle = document.getElementById('pageTitle');

  if (view === 'board') {
    boardView.classList.remove('hidden');
    teamView.classList.add('hidden');
    boardFilters.style.display = '';
    addTaskBtn.style.display = '';
    pageTitle.textContent = '项目看板';
    renderBoard();
  } else {
    boardView.classList.add('hidden');
    teamView.classList.remove('hidden');
    boardFilters.style.display = 'none';
    addTaskBtn.style.display = 'none';
    pageTitle.textContent = '团队成员';
    renderTeam();
  }
}

// ===== Event Listeners =====
document.addEventListener('DOMContentLoaded', () => {
  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => switchView(item.dataset.view));
  });

  // Add task buttons
  document.getElementById('addTaskBtn').addEventListener('click', () => openTaskModal());
  document.querySelectorAll('.add-task-col').forEach(btn => {
    btn.addEventListener('click', () => {
      openTaskModal();
      document.getElementById('taskStatus').value = btn.dataset.status;
    });
  });

  // Task modal
  document.getElementById('taskForm').addEventListener('submit', saveTask);
  document.getElementById('closeModal').addEventListener('click', closeTaskModal);
  document.getElementById('cancelModal').addEventListener('click', closeTaskModal);
  document.getElementById('deleteTaskBtn').addEventListener('click', deleteTask);

  // Tag input
  document.getElementById('tagInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = e.target.value.trim();
      if (val && !currentTags.includes(val)) {
        currentTags.push(val);
        renderTagList();
      }
      e.target.value = '';
    }
  });

  // Member modal
  document.getElementById('addMemberBtn').addEventListener('click', () => openMemberModal());
  document.getElementById('memberForm').addEventListener('submit', saveMember);
  document.getElementById('closeMemberModal').addEventListener('click', closeMemberModal);
  document.getElementById('cancelMemberModal').addEventListener('click', closeMemberModal);
  document.getElementById('deleteMemberBtn').addEventListener('click', deleteMember);

  // Color picker
  document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
    });
  });

  // Close modals on overlay click
  document.getElementById('taskModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeTaskModal();
  });
  document.getElementById('memberModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeMemberModal();
  });

  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeTaskModal();
      closeMemberModal();
    }
  });

  // Filters
  document.getElementById('searchInput').addEventListener('input', renderBoard);
  document.getElementById('filterPriority').addEventListener('change', renderBoard);
  document.getElementById('filterMember').addEventListener('change', renderBoard);

  // Init
  populateAssigneeSelects();
  renderBoard();
});
