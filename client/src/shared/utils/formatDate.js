const formatter = new Intl.DateTimeFormat('en', { dateStyle: 'medium' });

// "2026-10-22T10:00:00Z" -> "Oct 22, 2026"
export const formatDate = (value) => (value ? formatter.format(new Date(value)) : '');

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

// "just now", "12 minutes ago", "3 hours ago", "yesterday", "4 days ago"; older than a week falls back to the date.
export const formatRelative = (value, now = Date.now()) => {
  if (!value) return '';
  const seconds = Math.round((new Date(value).getTime() - now) / 1000); // negative = in the past
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(seconds / 3600);
  const days = Math.round(seconds / 86400);

  if (Math.abs(seconds) < 45) return 'just now';
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute');
  if (Math.abs(hours) < 24) return relative.format(hours, 'hour');
  if (Math.abs(days) < 7) return relative.format(days, 'day');
  return formatDate(value);
};
