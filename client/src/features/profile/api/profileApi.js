import { baseApi } from '../../../shared/api/baseApi';
import { userUpdated } from '../../auth';

const unwrap = (response) => response.data; // server envelope: { success, data }

// Keeps the signed-in user in Redux in sync with what the server returned.
const syncUser = async (_arg, { dispatch, queryFulfilled }) => {
  try {
    const { data } = await queryFulfilled;
    dispatch(userUpdated(data.user));
  } catch {
    // The caller handles the error through .unwrap().
  }
};

export const profileApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    updateName: build.mutation({
      query: (body) => ({ url: '/users/me', method: 'PATCH', body }),
      transformResponse: unwrap,
      onQueryStarted: syncUser,
    }),

    changeEmail: build.mutation({
      query: (body) => ({ url: '/users/me/email', method: 'PATCH', body }),
      transformResponse: unwrap,
      onQueryStarted: syncUser,
    }),

    // The server ends every session after this, so the component logs the user out locally.
    changePassword: build.mutation({
      query: (body) => ({ url: '/users/me/password', method: 'PATCH', body }),
    }),

    uploadAvatar: build.mutation({
      query: (file) => {
        const body = new FormData();
        body.append('avatar', file); // the browser sets the multipart Content-Type itself
        return { url: '/users/me/avatar', method: 'POST', body };
      },
      transformResponse: unwrap,
      onQueryStarted: syncUser,
    }),

    removeAvatar: build.mutation({
      query: () => ({ url: '/users/me/avatar', method: 'DELETE' }),
      transformResponse: unwrap,
      onQueryStarted: syncUser,
    }),

    // The component clears the local session after this succeeds (see DeleteAccountSection).
    deleteAccount: build.mutation({
      query: (body) => ({ url: '/users/me', method: 'DELETE', body }),
    }),
  }),
});

export const {
  useUpdateNameMutation,
  useChangePasswordMutation,
  useChangeEmailMutation,
  useUploadAvatarMutation,
  useRemoveAvatarMutation,
  useDeleteAccountMutation,
} = profileApi;
