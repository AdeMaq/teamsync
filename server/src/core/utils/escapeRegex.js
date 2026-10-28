// Makes user text safe to put inside a regular expression, so a search for "a.b" or "(" matches those characters
// literally instead of being read as a pattern.
export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
