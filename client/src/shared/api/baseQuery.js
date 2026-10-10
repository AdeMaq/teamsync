import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
// Leaf module on purpose: importing the feature's index.js here would create an import cycle.
import { loggedOut, setCredentials } from '../../features/auth/slice';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  credentials: 'include', // sends the httpOnly refresh-token cookie
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.accessToken;
    if (token) headers.set('authorization', `Bearer ${token}`);
    return headers;
  },
});

// A 401 from these means "wrong credentials / no session", not "access token expired".
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

// Shared by every request that fails at the same moment, so only ONE refresh is sent.
// (Refresh tokens rotate; two parallel refreshes would trip reuse detection and log the user out.)
let refreshInFlight = null;

export const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  const url = typeof args === 'string' ? args : args.url;
  if (result.error?.status === 401 && !AUTH_ENDPOINTS.includes(url)) {
    refreshInFlight ??= Promise.resolve(
      rawBaseQuery({ url: '/auth/refresh', method: 'POST' }, api, extraOptions)
    ).finally(() => {
      refreshInFlight = null;
    });

    const refresh = await refreshInFlight;
    if (refresh.data) {
      api.dispatch(setCredentials(refresh.data.data));
      result = await rawBaseQuery(args, api, extraOptions); // retry once with the new token
    } else {
      api.dispatch(loggedOut());
    }
  }

  return result;
};
