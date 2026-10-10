import { baseApi } from '../../../shared/api/baseApi';
import { loggedOut, setCredentials } from '../slice';

const unwrap = (response) => response.data; // server envelope: { success, data }

// Stores the session in Redux as soon as the request succeeds.
const saveSession = async (_arg, { dispatch, queryFulfilled }) => {
  try {
    const { data } = await queryFulfilled;
    dispatch(setCredentials(data));
  } catch {
    // The caller handles the error through .unwrap().
  }
};

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    register: build.mutation({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      transformResponse: unwrap,
      onQueryStarted: saveSession,
    }),

    login: build.mutation({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      transformResponse: unwrap,
      onQueryStarted: saveSession,
    }),

    // Used on app load to restore the session from the refresh-token cookie.
    refresh: build.mutation({
      query: () => ({ url: '/auth/refresh', method: 'POST' }),
      transformResponse: unwrap,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials(data));
        } catch {
          dispatch(loggedOut());
        }
      },
    }),

    logout: build.mutation({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          // Log out locally even if the request failed, and drop all cached server data.
          dispatch(loggedOut());
          dispatch(baseApi.util.resetApiState());
        }
      },
    }),
  }),
});

export const { useRegisterMutation, useLoginMutation, useRefreshMutation, useLogoutMutation } = authApi;
