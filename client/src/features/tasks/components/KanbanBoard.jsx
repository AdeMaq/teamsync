import { useMemo, useState } from 'react';
import ActionButton from '../../../shared/ui/ActionButton';
import SelectField from '../../../shared/ui/SelectField';
import Spinner from '../../../shared/ui/Spinner';
import { useGetWorkspaceQuery } from '../../workspaces';
import { useListTasksQuery, useMoveTaskMutation } from '../api/taskApi';
import { COLUMNS, MAX_TASKS_PER_PROJECT, PRIORITIES } from '../constants';
import { tasksInColumn } from '../utils';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';

const PRIORITY_FILTER = [{ value: '', label: 'All priorities' }, ...PRIORITIES.map(({ value, label }) => ({ value, label }))];

// The project's task board: four columns, drag a card to move or reorder it, click one to edit it.
export default function KanbanBoard({ project }) {
  const projectId = project._id;
  const { data: tasks, isLoading, error, refetch } = useListTasksQuery(projectId);
  const { data: workspace } = useGetWorkspaceQuery(project.workspace);
  const [moveTask, { error: moveError }] = useMoveTaskMutation();

  const [modal, setModal] = useState(null); // { task } to edit, { status } to create
  const [dragged, setDragged] = useState(null);
  const [over, setOver] = useState(null); // { status, beforeId } drop position being hovered
  const [filters, setFilters] = useState({ priority: '', assignee: '' });

  const members = workspace?.members ?? [];
  const assigneeFilter = [
    { value: '', label: 'Everyone' },
    { value: 'none', label: 'Unassigned' },
    ...members.map((m) => ({ value: m.user._id, label: m.user.name })),
  ];

  const matches = (t) =>
    (!filters.priority || t.priority === filters.priority) &&
    (!filters.assignee ||
      (filters.assignee === 'none' ? !t.assignee : t.assignee?._id === filters.assignee));

  const columns = useMemo(
    () => COLUMNS.map((column) => ({ ...column, all: tasksInColumn(tasks ?? [], column.value) })),
    [tasks],
  );

  if (isLoading) return <Spinner />;
  if (error) {
    return (
      <div className="text-sm text-dash-muted">
        Could not load the tasks.{' '}
        <button type="button" onClick={refetch} className="text-dash-teal hover:underline">
          Try again
        </button>
      </div>
    );
  }

  const filtering = Boolean(filters.priority || filters.assignee);
  const atLimit = tasks.length >= MAX_TASKS_PER_PROJECT;

  const endDrag = () => {
    setDragged(null);
    setOver(null);
  };

  // Drop on a card = place before it; drop on empty column space = bottom. The index counts the column
  // without the dragged card, over ALL its cards (filters only hide cards, they do not change the order).
  const handleDrop = (status, beforeId) => {
    const card = dragged;
    endDrag();
    if (!card) return;

    const others = tasksInColumn(tasks, status).filter((t) => t._id !== card._id);
    const index = beforeId ? others.findIndex((t) => t._id === beforeId) : undefined;
    if (beforeId && index === -1) return; // dropped on itself

    // Nothing to do when the card would stay exactly where it is.
    const current = tasksInColumn(tasks, status);
    const currentIndex = current.findIndex((t) => t._id === card._id);
    if (currentIndex !== -1 && (index ?? others.length) === currentIndex) return;

    moveTask({ id: card._id, projectId, status, index });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <SelectField
          aria-label="Filter by priority"
          className="w-full sm:w-40"
          value={filters.priority}
          onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
          options={PRIORITY_FILTER}
        />
        <SelectField
          aria-label="Filter by assignee"
          className="w-full sm:w-44"
          value={filters.assignee}
          onChange={(e) => setFilters((f) => ({ ...f, assignee: e.target.value }))}
          options={assigneeFilter}
        />
        {filtering && (
          <ActionButton onClick={() => setFilters({ priority: '', assignee: '' })}>Clear filters</ActionButton>
        )}
        <ActionButton
          variant="primary"
          className="sm:ml-auto"
          disabled={atLimit}
          onClick={() => setModal({ status: 'todo' })}
        >
          New task
        </ActionButton>
      </div>

      {atLimit && (
        <p className="text-xs text-amber-300">This project has reached the limit of {MAX_TASKS_PER_PROJECT} tasks.</p>
      )}
      {moveError && <p className="text-xs text-red-400">Could not move that task. It was put back.</p>}

      <div className="flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible">
        {columns.map((column) => {
          const visible = column.all.filter(matches);
          const columnOver = over?.status === column.value;

          return (
            <section
              key={column.value}
              aria-label={column.label}
              onDragOver={(e) => {
                if (!dragged) return;
                e.preventDefault(); // allows dropping here
                // Hovering a card marks "before this card"; hovering the gap marks the bottom.
                const card = e.target.closest('[data-task-id]');
                setOver({ status: column.value, beforeId: card?.dataset.taskId });
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setOver(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(column.value, over?.status === column.value ? over.beforeId : undefined);
              }}
              className={`flex min-h-40 w-72 shrink-0 flex-col rounded-2xl border bg-dash-inset p-3 transition-colors lg:w-auto
                ${columnOver ? 'border-dash-teal/60' : 'border-dash-border'}`}
            >
              <header className="mb-3 flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${column.dot}`} aria-hidden="true" />
                <h3 className="text-sm font-semibold text-dash-text">{column.label}</h3>
                <span className="text-xs text-dash-muted">
                  {filtering ? `${visible.length} of ${column.all.length}` : column.all.length}
                </span>
                <button
                  type="button"
                  aria-label={`Add a task to ${column.label}`}
                  disabled={atLimit}
                  onClick={() => setModal({ status: column.value })}
                  className="ml-auto rounded-lg px-2 text-lg leading-none text-dash-muted hover:text-dash-text disabled:opacity-40"
                >
                  +
                </button>
              </header>

              <div className="flex flex-1 flex-col gap-2">
                {visible.map((task) => (
                  <div key={task._id}>
                    {dragged && columnOver && over.beforeId === task._id && (
                      <div className="mb-2 h-0.5 rounded bg-dash-teal" aria-hidden="true" />
                    )}
                    <TaskCard
                      task={task}
                      dragging={dragged?._id === task._id}
                      onOpen={(t) => setModal({ task: t })}
                      onDragStart={setDragged}
                      onDragEnd={endDrag}
                    />
                  </div>
                ))}
                {dragged && columnOver && !over.beforeId && (
                  <div className="h-0.5 rounded bg-dash-teal" aria-hidden="true" />
                )}
                {visible.length === 0 && (
                  <p className="py-4 text-center text-xs text-dash-muted">
                    {column.all.length ? 'No matching tasks' : 'No tasks'}
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {modal && (
        <TaskModal
          // Remount per task so the form starts from that task's values.
          key={modal.task?._id ?? `new-${modal.status}`}
          projectId={projectId}
          task={modal.task}
          status={modal.status}
          members={members}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
