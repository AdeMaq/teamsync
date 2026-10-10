import { createSlice } from '@reduxjs/toolkit';

// Client-only auth state. The access token lives in memory only (never localStorage);
// a page reload restores the session through the refresh-token cookie.
// status: 'checking' (restoring session on load) | 'authenticated' | 'unauthenticated'
const initialState = {
  user: null,
  accessToken: null,
  status: 'checking',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, { payload }) {
      state.user = payload.user;
      state.accessToken = payload.accessToken;
      state.status = 'authenticated';
    },
    loggedOut(state) {
      state.user = null;
      state.accessToken = null;
      state.status = 'unauthenticated';
    },
  },
});

export const { setCredentials, loggedOut } = authSlice.actions;

export const selectCurrentUser = (state) => state.auth.user;
export const selectAuthStatus = (state) => state.auth.status;

export default authSlice.reducer;
