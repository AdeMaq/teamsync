import crypto from 'crypto';
import fs from 'fs';
import multer from 'multer';
import ApiError from '../errors/ApiError.js';
import { ERROR_CODES } from '../errors/errorTypes.js';
import { HTTP } from '../constants/httpStatusCodes.js';
import { avatarsDir } from '../../config/paths.js';

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

// The file extension comes from the verified mime type, never from the client's file name.
const EXTENSIONS = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

fs.mkdirSync(avatarsDir, { recursive: true });

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: avatarsDir,
    filename: (req, file, cb) => {
      const random = crypto.randomBytes(8).toString('hex');
      cb(null, `${req.user.id}-${random}${EXTENSIONS[file.mimetype]}`);
    },
  }),
  limits: { fileSize: MAX_AVATAR_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (EXTENSIONS[file.mimetype]) return cb(null, true);
    cb(
      new ApiError(HTTP.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, 'Only JPEG, PNG or WebP images are allowed', [
        { field: 'avatar', message: 'Only JPEG, PNG or WebP images are allowed' },
      ])
    );
  },
});

// Multipart field name: "avatar". Needs req.user (run requireAuth first).
export const uploadAvatar = avatarUpload.single('avatar');
