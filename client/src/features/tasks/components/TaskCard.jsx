import Avatar from '../../../shared/ui/Avatar';
import { assetUrl } from '../../../shared/utils/assetUrl';
import { PRIORITY_BY_VALUE } from '../constants';
import { formatDue, isOverdue } from '../utils';

// One card on the board. Draggable; clicking (or Enter) opens it.
export default function TaskCard({ task, onOpen, onDragStart, onDragEnd, dragging }) {
  const priority = PRIORITY_BY_VALUE[task.priority] ?? PRIORITY_BY_VALUE.medium;
  const overdue = isOverdue(task);

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      data-task-id={task._id}
      onClick={() => onOpen(task)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(task);
        }
      }}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', task._id);
        onDragStart(task);
      }}
      onDragEnd={onDragEnd}
      className={`cursor-grab rounded-xl border border-dash-border bg-dash-card p-3 text-left transition
        hover:border-[#2F3A5C] focus-visible:border-dash-teal/60 focus-visible:outline-none active:cursor-grabbing
        ${dragging ? 'opacity-40' : ''}`}
    >
      <p className="break-words text-sm font-medium text-dash-text">{task.title}</p>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <span className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium ${priority.tone}`}>
          {priority.label}
        </span>
        {task.dueDate && (
          <span className={`text-[11px] ${overdue ? 'font-medium text-red-300' : 'text-dash-muted'}`}>
            {overdue ? 'Overdue · ' : 'Due '}
            {formatDue(task.dueDate)}
          </span>
        )}
        {task.assignee && (
          <Avatar
            name={task.assignee.name}
            src={assetUrl(task.assignee.avatar)}
            size="xs"
            className="ml-auto"
          />
        )}
      </div>
    </div>
  );
}
