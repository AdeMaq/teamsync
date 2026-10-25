import crypto from 'crypto';
import fs from 'fs';
import multer from 'multer';
import ApiError from '../errors/ApiError.js';
import { ERROR_CODES } from '../errors/errorTypes.js';
import { HTTP } from '../constants/httpStatusCodes.js';
import { avatarsDir, logosDir } from '../../config/paths.js';

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

// The file extension comes from the verified mime type, never from the client's file name.
const EXTENSIONS = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

// One image per request, saved in `dir` as "<owner>-<random>.<ext>".
// `ownerOf(req)` names whose picture it is (the user, or the workspace).
const imageUpload = ({ dir, field, ownerOf }) => {
  fs.mkdirSync(dir, { recursive: true });

  return multer({
    storage: multer.diskStorage({
      destination: dir,
      filename: (req, file, cb) => {
        const random = crypto.randomBytes(8).toString('hex');
        cb(null, `${ownerOf(req)}-${random}${EXTENSIONS[file.mimetype]}`);
      },
    }),
    limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (EXTENSIONS[file.mimetype]) return cb(null, true);
      cb(
        new ApiError(HTTP.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, 'Only JPEG, PNG or WebP images are allowed', [
          { field, message: 'Only JPEG, PNG or WebP images are allowed' },
        ])
      );
    },
  }).single(field);
};

// Multipart field "avatar". Needs req.user (run requireAuth first).
export const uploadAvatar = imageUpload({ dir: avatarsDir, field: 'avatar', ownerOf: (req) => req.user.id });

// Multipart field "logo". Needs the workspace id in the URL (:id). Run the permission check BEFORE this,
// so someone who may not change the logo can never write a file.
export const uploadLogo = imageUpload({ dir: logosDir, field: 'logo', ownerOf: (req) => req.params.id });
