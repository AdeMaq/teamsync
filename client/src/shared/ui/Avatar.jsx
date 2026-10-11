const SIZES = {
  xs: 'h-6 w-6 text-[10px]', // 24px: activity feed, workload
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-9 w-9 text-xs', // 36px: sidebar user card
};

export const getInitials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '?';

// Gradient circle with the person's initials in dark navy.
export default function Avatar({ name, size = 'md', className = '' }) {
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
