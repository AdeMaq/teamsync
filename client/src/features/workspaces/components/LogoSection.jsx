import { useRef, useState } from 'react';
import ActionButton from '../../../shared/ui/ActionButton';
import Card from '../../../shared/ui/Card';
import { parseApiError } from '../../../shared/api/errors';
import { validateImageFile } from '../../../shared/utils/validators';
import { useRemoveLogoMutation, useUploadLogoMutation } from '../api/workspaceApi';
import WorkspaceLogo from './WorkspaceLogo';

// Only shown to admins and the owner (the page decides); the server enforces the same rule.
export default function LogoSection({ workspace }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const [upload, { isLoading: uploading }] = useUploadLogoMutation();
  const [remove, { isLoading: removing }] = useRemoveLogoMutation();

  const handlePick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // lets the same file be picked again later
    if (!file) return;

    setError('');
    const problem = validateImageFile(file);
    if (problem) return setError(problem);

    try {
      await upload({ id: workspace._id, file }).unwrap();
    } catch (err) {
      setError(parseApiError(err).message);
    }
  };

  const handleRemove = async () => {
    setError('');
    try {
      await remove(workspace._id).unwrap();
    } catch (err) {
      setError(parseApiError(err).message);
    }
  };

  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold text-dash-text">Logo</h2>
      <p className="mt-1 text-sm text-dash-muted">Shown in the sidebar for everyone. JPEG, PNG or WebP, up to 2 MB.</p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <WorkspaceLogo workspace={workspace} size="xl" />

        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePick}
            className="hidden"
            aria-label="Choose a workspace logo"
          />
          <ActionButton variant="primary" loading={uploading} onClick={() => inputRef.current?.click()}>
            {workspace.logo ? 'Change logo' : 'Upload logo'}
          </ActionButton>
          {workspace.logo && (
            <ActionButton loading={removing} onClick={handleRemove}>
              Remove
            </ActionButton>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-3 text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </Card>
  );
}
