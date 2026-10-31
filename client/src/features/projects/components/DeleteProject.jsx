import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ActionButton from '../../../shared/ui/ActionButton';
import { parseApiError } from '../../../shared/api/errors';
import { ROUTES } from '../../../app/routes/routePaths';
import { useDeleteProjectMutation } from '../api/projectApi';

export default function DeleteProject({ project }) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [deleteProject, { isLoading }] = useDeleteProjectMutation();

  const handleDelete = async () => {
    try {
      await deleteProject({ id: project._id, workspaceId: project.workspace }).unwrap();
      navigate(ROUTES.projects, { replace: true });
    } catch (err) {
      setError(parseApiError(err).message);
      setConfirming(false);
    }
  };

  return (
    <section className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
      <h2 className="font-display text-lg font-semibold text-red-300">Delete this project</h2>
      <p className="mt-1 text-sm text-dash-muted">
        Permanently deletes "{project.name}" and everything in it. This cannot be undone.
      </p>

      {confirming ? (
        <div className="mt-3 flex gap-2">
          <ActionButton variant="danger" loading={isLoading} onClick={handleDelete}>
            Yes, delete project
          </ActionButton>
          <ActionButton disabled={isLoading} onClick={() => setConfirming(false)}>
            Cancel
          </ActionButton>
        </div>
      ) : (
        <ActionButton variant="danger" className="mt-3" onClick={() => setConfirming(true)}>
          Delete project
        </ActionButton>
      )}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </section>
  );
}
