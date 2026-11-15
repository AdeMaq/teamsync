import { useState } from 'react';
import ActionButton from '../../../shared/ui/ActionButton';
import { parseApiError } from '../../../shared/api/errors';

export const MAX_COMMENT_LENGTH = 5000; // the server's limit

// One box for writing a comment: used for a new comment (`onSubmit` adds it) and for editing (`initialText`).
// `onSubmit(text)` returns a promise; the form clears itself only when it succeeds.
export default function CommentForm({ initialText = '', submitLabel, label, onSubmit, onCancel, autoFocus }) {
  const [text, setText] = useState(initialText);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const trimmed = text.trim();
  const unchanged = trimmed === initialText.trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onSubmit(trimmed);
      setText(initialText ? text : ''); // a new comment clears the box; an edit is closed by the parent
      setError('');
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-2">
      <textarea
        aria-label={label}
        autoFocus={autoFocus}
        rows={2}
        maxLength={MAX_COMMENT_LENGTH}
        placeholder="Write a comment…"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setError('');
        }}
        onKeyDown={(e) => {
          // Ctrl/Cmd + Enter sends, like most chat and comment boxes.
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e);
        }}
        className="w-full resize-y rounded-xl border border-dash-border bg-dash-inset px-3 py-2 text-sm text-dash-text outline-none transition-colors placeholder:text-dash-muted/60 focus:border-dash-teal/60"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex items-center gap-2">
        <ActionButton type="submit" variant="primary" loading={busy} disabled={!trimmed || unchanged}>
          {submitLabel}
        </ActionButton>
        {onCancel && (
          <ActionButton disabled={busy} onClick={onCancel}>
            Cancel
          </ActionButton>
        )}
        {text.length > MAX_COMMENT_LENGTH * 0.9 && (
          <span className="ml-auto text-xs text-dash-muted">
            {text.length} / {MAX_COMMENT_LENGTH}
          </span>
        )}
      </div>
    </form>
  );
}
