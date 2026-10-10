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
