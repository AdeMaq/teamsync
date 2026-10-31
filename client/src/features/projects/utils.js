import { ROUTES } from '../../app/routes/routePaths';

export const projectPath = (id) => ROUTES.project.replace(':projectId', id);

// Project dates are calendar days stored at midnight UTC, so they are shown in UTC; the user's own time zone
// could otherwise move them to the day before.
const formatter = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' });

export const formatProjectDate = (value) => (value ? formatter.format(new Date(value)) : '');

// "2026-10-22T00:00:00.000Z" -> "2026-10-22" (the value an <input type="date"> uses)
export const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

export const formatDateRange = (startDate, endDate) => {
  if (startDate && endDate) return `${formatProjectDate(startDate)} – ${formatProjectDate(endDate)}`;
  if (startDate) return `Starts ${formatProjectDate(startDate)}`;
  if (endDate) return `Due ${formatProjectDate(endDate)}`;
  return 'No dates set';
};
