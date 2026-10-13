import { useEffect, useState } from 'react';

const SIZES = {
  xs: 'h-6 w-6 text-[10px]', // 24px: activity feed, workload
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-9 w-9 text-xs', // 36px: sidebar user card
  xl: 'h-16 w-16 text-lg', // 64px: profile page
};

export const getInitials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '?';

// Shows the user's picture when `src` is given, otherwise a gradient circle with their initials.
export default function Avatar({ name, src, size = 'md', className = '' }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false); // a new picture gets a fresh chance to load
  }, [src]);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        className={`${SIZES[size]} shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${SIZES[size]} flex shrink-0 items-center justify-center rounded-full bg-dash-gradient
        font-semibold text-dash-bg ${className}`}
      aria-hidden="true"
    >
      {getInitials(name)}
    </div>
  );
}
