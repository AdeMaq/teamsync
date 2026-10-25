import path from 'path';
import { fileURLToPath } from 'url';

// server/ (this file is server/src/config/paths.js), independent of the process working directory.
const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const uploadsDir = path.join(serverRoot, 'uploads');
export const avatarsDir = path.join(uploadsDir, 'avatars');
export const logosDir = path.join(uploadsDir, 'logos');

// Public URL prefixes (served by app.js), stored in the database instead of absolute file paths.
export const UPLOADS_URL_PREFIX = '/uploads';
export const AVATAR_URL_PREFIX = `${UPLOADS_URL_PREFIX}/avatars/`;
export const LOGO_URL_PREFIX = `${UPLOADS_URL_PREFIX}/logos/`;
