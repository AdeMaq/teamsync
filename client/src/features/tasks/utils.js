// Tasks of one column in board order.
export const tasksInColumn = (tasks, status) =>
  tasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position);

// Mirrors the server's move rule so the card lands in the right place before the server answers:
// `index` counts the column WITHOUT the moved task (0 = top); null/undefined = bottom.
export const positionFor = (columnWithoutTask, index) => {
  if (index == null || index >= columnWithoutTask.length) {
    const last = columnWithoutTask[columnWithoutTask.length - 1];
    return last ? last.position + 1000 : 1000;
  }
  const next = columnWithoutTask[index].position;
  const prev = index > 0 ? columnWithoutTask[index - 1].position : null;
  return prev == null ? next / 2 : (prev + next) / 2;
};

// "2026-11-05T00:00:00.000Z" -> "2026-11-05" (the value an <input type="date"> uses).
export const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

const formatter = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' });
export const formatDue = (value) => (value ? formatter.format(new Date(value)) : '');

// Overdue = a calendar day before today (due dates are stored at midnight UTC) on a task that is not done.
export const isOverdue = (task) =>
  Boolean(task.dueDate) && task.status !== 'done' && toDateInput(task.dueDate) < new Date().toISOString().slice(0, 10);
