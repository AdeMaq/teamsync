import { useState } from 'react';
import Avatar from '../../../shared/ui/Avatar';
import { parseApiError } from '../../../shared/api/errors';
import { assetUrl } from '../../../shared/utils/assetUrl';
import { useDeleteCommentMutation, useEditCommentMutation } from '../api/commentApi';
import CommentForm from './CommentForm';

const timeFormatter = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' });

const linkButton = 'text-xs text-dash-muted hover:text-dash-text disabled:opacity-50';

// One comment: its author and time, with Edit / Delete only when the server says the caller may.
export default function CommentItem({ comment, taskId }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [editComment] = useEditCommentMutation();
  const [deleteComment, { isLoading: deleting }] = useDeleteCommentMutation();

  const { author } = comment; // null when that account was deleted

  const handleDelete = async () => {
    try {
      await deleteComment({ id: comment._id, taskId }).unwrap();
    } catch (err) {
      setError(parseApiError(err).message);
      setConfirming(false);
    }
  };

  return (
    <li className="flex gap-3">
      <Avatar name={author?.name ?? '?'} src={assetUrl(author?.avatar)} size="sm" />

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-xs">
          <span className="font-medium text-dash-text">{author?.name ?? 'Deleted user'}</span>
          <time dateTime={comment.createdAt} className="text-dash-muted">
            {timeFormatter.format(new Date(comment.createdAt))}
          </time>
          {comment.editedAt && <span className="text-dash-muted">(edited)</span>}
        </p>

        {editing ? (
          <div className="mt-1.5">
            <CommentForm
              autoFocus
              label="Edit comment"
              initialText={comment.text}
              submitLabel="Save"
              onCancel={() => setEditing(false)}
              onSubmit={async (text) => {
                await editComment({ id: comment._id, taskId, text }).unwrap();
                setEditing(false);
              }}
            />
          </div>
        ) : (
          <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-dash-text">{comment.text}</p>
        )}

        {!editing && (comment.canEdit || comment.canDelete) && (
          <div className="mt-1 flex items-center gap-3">
            {comment.canEdit && (
              <button type="button" className={linkButton} onClick={() => setEditing(true)}>
                Edit
              </button>
            )}
            {comment.canDelete &&
              (confirming ? (
                <span className="flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={handleDelete}
                    className="font-medium text-red-300 hover:text-red-200 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button type="button" disabled={deleting} className={linkButton} onClick={() => setConfirming(false)}>
                    Keep
                  </button>
                </span>
              ) : (
                <button type="button" className={linkButton} onClick={() => setConfirming(true)}>
                  Delete
                </button>
              ))}
          </div>
        )}
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    </li>
  );
}
