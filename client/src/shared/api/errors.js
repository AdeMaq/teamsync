// Turns an RTK Query error into { message, code, fieldErrors } for the UI.
// Server errors look like { success: false, error: { code, message, details: [{ field, message }] } }.
export function parseApiError(err) {
  const apiError = err?.data?.error;

  if (apiError) {
    const fieldErrors = {};
    (apiError.details ?? []).forEach((d) => {
      if (d.field && !fieldErrors[d.field]) fieldErrors[d.field] = d.message;
    });
    return { message: apiError.message, code: apiError.code, fieldErrors };
  }

  if (err?.status === 'FETCH_ERROR') {
    return { message: 'Cannot reach the server. Check your connection.', code: 'NETWORK_ERROR', fieldErrors: {} };
  }

  return { message: 'Something went wrong. Try again.', code: 'UNKNOWN', fieldErrors: {} };
}
