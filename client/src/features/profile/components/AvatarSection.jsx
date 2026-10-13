import { useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import Avatar from '../../../shared/ui/Avatar';
import ActionButton from '../../../shared/ui/ActionButton';
import Card from '../../../shared/ui/Card';
import { parseApiError } from '../../../shared/api/errors';
import { assetUrl } from '../../../shared/utils/assetUrl';
import { selectCurrentUser } from '../../auth';
import { useRemoveAvatarMutation, useUploadAvatarMutation } from '../api/profileApi';

const MAX_BYTES = 2 * 1024 * 1024; // same limit as the server
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function AvatarSection() {
  const user = useSelector(selectCurrentUser);
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const [upload, { isLoading: uploading }] = useUploadAvatarMutation();
  const [remove, { isLoading: removing }] = useRemoveAvatarMutation();

  const handlePick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // lets the same file be picked again later
    if (!file) return;

    setError('');
    if (!TYPES.includes(file.type)) return setError('Use a JPEG, PNG or WebP image.');
    if (file.size > MAX_BYTES) return setError('Image must be 2 MB or smaller.');

    try {
      await upload(file).unwrap();
    } catch (err) {
      setError(parseApiError(err).message);
    }
  };

  const handleRemove = async () => {
    setError('');
    try {
      await remove().unwrap();
    } catch (err) {
      setError(parseApiError(err).message);
    }
  };

  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold text-dash-text">Profile photo</h2>
      <p className="mt-1 text-sm text-dash-muted">JPEG, PNG or WebP, up to 2 MB.</p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Avatar name={user?.name} src={assetUrl(user?.avatar)} size="xl" />

        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePick}
            className="hidden"
            aria-label="Choose a profile photo"
          />
          <ActionButton variant="primary" loading={uploading} onClick={() => inputRef.current?.click()}>
            {user?.avatar ? 'Change photo' : 'Upload photo'}
          </ActionButton>
          {user?.avatar && (
            <ActionButton loading={removing} onClick={handleRemove}>
              Remove
            </ActionButton>
          )}
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
    </Card>
  );
}
