// "Northwind Labs!" -> "northwind-labs". Accents are stripped; empty results fall back to "workspace".
export const slugify = (text, maxLength = 40) => {
  const slug = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');

  return slug || 'workspace';
};
