import { useEffect, useState } from 'react';
import { assetUrl } from '../../../shared/utils/assetUrl';

const SIZES = {
  md: 'h-9 w-9 rounded-xl text-sm', // sidebar switcher
  xl: 'h-16 w-16 rounded-2xl text-xl', // settings page
};

// The workspace's logo, or its first letter on the brand gradient when it has none.
export default function WorkspaceLogo({ workspace, size = 'md', className = '' }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false); // a new picture gets a fresh chance to load
  }, [workspace.logo]);

  if (workspace.logo && !failed) {
    return (
      <img
        src={assetUrl(workspace.logo)}
        alt=""
        onError={() => setFailed(true)}
        className={`${SIZES[size]} shrink-0 object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${SIZES[size]} flex shrink-0 items-center justify-center bg-dash-gradient font-bold text-dash-bg ${className}`}
      aria-hidden="true"
    >
      {workspace.name.trim().charAt(0).toUpperCase() || '?'}
    </div>
  );
}
