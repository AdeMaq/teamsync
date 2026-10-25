// Client-side checks for fast feedback. The server validates again and is the source of truth.
const EMAIL_RE = /^\S+@\S+\.\S+$/;

export function validateLogin({ email, password }) {
  const errors = {};
  if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid email address';
  if (!password) errors.password = 'Enter your password';
  return errors;
}

export function validateRegister({ name, email, password }) {
  const errors = {};
  if (name.trim().length < 2) errors.name = 'Enter your full name';
  if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid email address';
  if (password.length < 8) errors.password = 'Password must be at least 8 characters';
  else if (password.length > 72) errors.password = 'Password must be at most 72 characters';
  return errors;
}

export function validateNewPassword(password, confirm) {
  const errors = {};
  if (password.length < 8) errors.password = 'Password must be at least 8 characters';
  else if (password.length > 72) errors.password = 'Password must be at most 72 characters';
  if (confirm !== password) errors.confirm = 'Passwords do not match';
  return errors;
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // same limit as the server

// Returns a message when the file is not an acceptable picture, otherwise ''. The server checks again.
export function validateImageFile(file) {
  if (!IMAGE_TYPES.includes(file.type)) return 'Use a JPEG, PNG or WebP image.';
  if (file.size > MAX_IMAGE_BYTES) return 'Image must be 2 MB or smaller.';
  return '';
}
