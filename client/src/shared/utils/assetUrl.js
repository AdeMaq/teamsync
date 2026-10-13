// Uploaded files are stored as server-relative paths (e.g. /uploads/avatars/x.png).
// The API and the React app run on different origins, so the path needs the API's origin.
const getApiOrigin = () => {
  try {
    return new URL(import.meta.env.VITE_API_BASE_URL).origin;
  } catch {
    return ''; // VITE_API_BASE_URL missing or invalid: fall back to same-origin paths
  }
};

const API_ORIGIN = getApiOrigin();

export const assetUrl = (path) => (path ? `${API_ORIGIN}${path}` : '');
