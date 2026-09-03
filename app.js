const STORAGE_KEY = 'study-mission-assignments';

const elements = {
  list: document.querySelector('#assignment-list'),
  filter: document.querySelector('#assignment-filter'),
  total: document.querySelector('#assignment-total'),
  unfinished: document.querySelector('#unfinished-count'),
  completed: document.querySelector('#completed-count'),
  high: document.querySelector('#high-count'),
  next: document.querySelector('#next-assignment'),
  nextDue: document.querySelector('#next-due'),
  modal: document.querySelector('#assignment-modal'),
  form: document.querySelector('#assignment-form'),
  modalTitle: document.querySelector('#modal-title'),
  modalEyebrow: document.querySelector('#modal-eyebrow'),
  id: document.querySelector('#assignment-id'),
  name: document.querySelector('#assignment-name'),
  subject: document.querySelector('#assignment-subject'),
  due: document.querySelector('#assignment-due'),
  save: document.querySelector('#save-assignment')
};

let assignments = loadAssignments();

function loadAssignments() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
}

function saveAssignments() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatDueDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function dateValue(dateString) {
  return new Date(`${dateString}T00:00:00`).getTime();
}

function isOverdue(assignment) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return !assignment.completed && dateValue(assignment.due) < today.getTime();
}

function render() {
  const unfinished = assignments.filter((assignment) => !assignment.completed);
  const completed = assignments.filter((assignment) => assignment.completed);
  const highPriority = unfinished.filter((assignment) => assignment.priority === 'high');
  const nextAssignment = [...unfinished].sort((a, b) => dateValue(a.due) - dateValue(b.due))[0];
  const filter = elements.filter.value;
  const visible = [...assignments]
    .filter((assignment) => filter === 'all' || (filter === 'completed' ? assignment.completed : !assignment.completed))
    .sort((a, b) => dateValue(a.due) - dateValue(b.due));

  elements.unfinished.textContent = unfinished.length;
  elements.completed.textContent = completed.length;
  elements.high.textContent = highPriority.length;
  elements.total.textContent = visible.length;
  elements.next.textContent = nextAssignment ? nextAssignment.name : 'Nothing due yet';
  elements.nextDue.textContent = nextAssignment ? `${formatDueDate(nextAssignment.due)} · ${nextAssignment.subject}` : 'Your schedule is clear';
  document.querySelector('#list-caption').textContent = filter === 'completed' ? 'A record of what you have finished.' : 'The closest deadlines are at the top.';

  if (!visible.length) {
    const emptyTitle = filter === 'completed' ? 'No completed assignments yet' : 'No assignments on your list';
    const emptyText = filter === 'completed' ? 'Finished work will appear here.' : 'Add your first assignment to get moving.';
    elements.list.innerHTML = `<div class="empty-state"><strong>${emptyTitle}</strong><span>${emptyText}</span></div>`;
    return;
  }

  elements.list.innerHTML = visible.map((assignment) => `
    <article class="assignment ${assignment.completed ? 'completed' : ''}">
      <div><p class="assignment-name">${escapeHtml(assignment.name)}</p><span class="subject">${escapeHtml(assignment.subject)}</span></div>
      <div class="assignment-meta"><span class="due ${isOverdue(assignment) ? 'overdue' : ''}">${isOverdue(assignment) ? 'Overdue · ' : 'Due '}${formatDueDate(assignment.due)}</span></div>
      <span class="priority priority-${assignment.priority}">${assignment.priority[0].toUpperCase() + assignment.priority.slice(1)}</span>
      <div class="assignment-actions">
        <button class="complete-button" data-action="complete" data-id="${assignment.id}" type="button" aria-label="${assignment.completed ? 'Mark incomplete' : 'Mark completed'}" title="${assignment.completed ? 'Mark incomplete' : 'Mark completed'}">✓</button>
        <button class="icon-button" data-action="edit" data-id="${assignment.id}" type="button" aria-label="Edit ${escapeHtml(assignment.name)}" title="Edit assignment">✎</button>
        <button class="icon-button" data-action="delete" data-id="${assignment.id}" type="button" aria-label="Delete ${escapeHtml(assignment.name)}" title="Delete assignment">×</button>
      </div>
    </article>`).join('');
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
}

function openModal(assignment) {
  elements.form.reset();
  if (assignment) {
    elements.modalTitle.textContent = 'Edit an assignment';
    elements.modalEyebrow.textContent = 'Update mission';
    elements.save.textContent = 'Save changes';
    elements.id.value = assignment.id;
    elements.name.value = assignment.name;
    elements.subject.value = assignment.subject;
    elements.due.value = assignment.due;
    document.querySelector(`input[name="priority"][value="${assignment.priority}"]`).checked = true;
  } else {
    elements.modalTitle.textContent = 'Add an assignment';
    elements.modalEyebrow.textContent = 'New mission';
    elements.save.textContent = 'Save assignment';
    elements.due.value = new Date().toISOString().slice(0, 10);
  }
  elements.modal.hidden = false;
  elements.name.focus();
}

function closeModal() {
  elements.modal.hidden = true;
}

document.querySelector('#add-assignment-button').addEventListener('click', () => openModal());
document.querySelector('#close-modal').addEventListener('click', closeModal);
document.querySelector('#cancel-modal').addEventListener('click', closeModal);
elements.filter.addEventListener('change', render);
elements.modal.addEventListener('click', (event) => { if (event.target === elements.modal) closeModal(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !elements.modal.hidden) closeModal(); });

elements.form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(elements.form);
  const existingId = elements.id.value;
  const values = { name: data.get('name').trim(), subject: data.get('subject').trim(), due: data.get('due'), priority: data.get('priority') };
  if (existingId) {
    assignments = assignments.map((assignment) => assignment.id === existingId ? { ...assignment, ...values } : assignment);
  } else {
    assignments.push({ id: makeId(), ...values, completed: false });
  }
  saveAssignments();
  closeModal();
  render();
});

elements.list.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const assignment = assignments.find((item) => item.id === button.dataset.id);
  if (!assignment) return;
  if (button.dataset.action === 'complete') assignment.completed = !assignment.completed;
  if (button.dataset.action === 'edit') return openModal(assignment);
  if (button.dataset.action === 'delete') {
    if (!window.confirm(`Delete "${assignment.name}"?`)) return;
    assignments = assignments.filter((item) => item.id !== assignment.id);
  }
  saveAssignments();
  render();
});

render();
