import { useState } from 'react';
import Spinner from '../../../shared/ui/Spinner';
import { COMMENTS_PER_PAGE, useAddCommentMutation, useListCommentsQuery } from '../api/commentApi';
import CommentForm from './CommentForm';
import CommentItem from './CommentItem';

// One page of the thread. Each page is its own cached query, so any change to the thread (tag) refetches them all.
function CommentsPage({ taskId, page }) {
  const { data } = useListCommentsQuery({ taskId, page });
  return (data?.comments ?? []).map((comment) => <CommentItem key={comment._id} comment={comment} taskId={taskId} />);
}

// The conversation on one task, oldest first, with a box to add to it.
export default function CommentThread({ taskId }) {
  const [pages, setPages] = useState(1);
  const { data, isLoading, isError, refetch } = useListCommentsQuery({ taskId, page: 1 });
  const [addComment] = useAddCommentMutation();

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / COMMENTS_PER_PAGE));
  const shown = Math.min(pages, totalPages); // deleting comments can leave fewer pages than were opened

  const handleAdd = async (text) => {
    await addComment({ taskId, text }).unwrap();
    // The new comment is last: make sure the page it landed on is open.
    setPages(Math.max(1, Math.ceil((total + 1) / COMMENTS_PER_PAGE)));
  };

  return (
    <section aria-label="Comments" className="mt-5 border-t border-dash-border pt-4">
      <h3 className="mb-3 text-sm font-semibold text-dash-text">
        Comments{total > 0 && <span className="ml-1.5 font-normal text-dash-muted">{total}</span>}
      </h3>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <p className="text-sm text-dash-muted">
          Could not load comments.{' '}
          <button type="button" onClick={refetch} className="text-dash-teal hover:underline">
            Try again
          </button>
        </p>
      ) : (
        <>
          {total === 0 ? (
            <p className="mb-4 text-sm text-dash-muted">No comments yet. Start the conversation.</p>
          ) : (
            <ul className="mb-4 space-y-4">
              {Array.from({ length: shown }, (_, i) => (
                <CommentsPage key={i + 1} taskId={taskId} page={i + 1} />
              ))}
            </ul>
          )}

          {shown < totalPages && (
            <button
              type="button"
              onClick={() => setPages(shown + 1)}
              className="mb-4 text-xs text-dash-teal hover:underline"
            >
              Load more comments
            </button>
          )}

          <CommentForm label="Add a comment" submitLabel="Comment" onSubmit={handleAdd} />
        </>
      )}
    </section>
  );
}
