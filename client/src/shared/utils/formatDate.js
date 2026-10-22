const formatter = new Intl.DateTimeFormat('en', { dateStyle: 'medium' });

// "2026-10-22T10:00:00Z" -> "Oct 22, 2026"
export const formatDate = (value) => (value ? formatter.format(new Date(value)) : '');
