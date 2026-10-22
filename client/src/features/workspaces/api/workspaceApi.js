import { baseApi } from '../../../shared/api/baseApi';
import { selectWorkspace } from '../slice';

const unwrap = (response) => response.data; // server envelope: { success, data }

// After creating or joining a workspace, switch to it.
const switchToNewWorkspace = async (_arg, { dispatch, queryFulfilled }) => {
  try {
    const { data } = await queryFulfilled;
    dispatch(selectWorkspace(data.workspace._id));
  } catch {
    // The caller handles the error through .unwrap().
  }
};

export const workspaceApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // ---- workspaces ----
    listWorkspaces: build.query({
      query: () => '/workspaces',
      transformResponse: (response) => unwrap(response).workspaces,
      providesTags: ['Workspaces'],
    }),

    getWorkspace: build.query({
      query: (id) => `/workspaces/${id}`,
      transformResponse: (response) => unwrap(response).workspace,
      providesTags: (_result, _error, id) => [{ type: 'Workspace', id }],
    }),

    createWorkspace: build.mutation({
      query: (body) => ({ url: '/workspaces', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['Workspaces'],
      onQueryStarted: switchToNewWorkspace,
    }),

    updateWorkspace: build.mutation({
      query: ({ id, ...body }) => ({ url: `/workspaces/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => ['Workspaces', { type: 'Workspace', id }],
    }),

    // The workspace is gone afterwards, so only the list is refreshed (refetching its details would 404).
    deleteWorkspace: build.mutation({
      query: ({ id, confirmName }) => ({ url: `/workspaces/${id}`, method: 'DELETE', body: { confirmName } }),
      invalidatesTags: ['Workspaces'],
    }),

    transferOwnership: build.mutation({
      query: ({ id, userId }) => ({ url: `/workspaces/${id}/transfer-ownership`, method: 'POST', body: { userId } }),
      invalidatesTags: (_result, _error, { id }) => ['Workspaces', { type: 'Workspace', id }],
    }),

    // ---- members ----
    changeMemberRole: build.mutation({
      query: ({ id, memberId, role }) => ({ url: `/workspaces/${id}/members/${memberId}`, method: 'PATCH', body: { role } }),
      invalidatesTags: (_result, _error, { id }) => ['Workspaces', { type: 'Workspace', id }],
    }),

    removeMember: build.mutation({
      query: ({ id, memberId }) => ({ url: `/workspaces/${id}/members/${memberId}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { id }) => ['Workspaces', { type: 'Workspace', id }],
    }),

    // Leaving is the same endpoint with your own id; like deleting, it must not refetch the details you can no longer see.
    leaveWorkspace: build.mutation({
      query: ({ id, memberId }) => ({ url: `/workspaces/${id}/members/${memberId}`, method: 'DELETE' }),
      invalidatesTags: ['Workspaces'],
    }),

    // ---- invitations ----
    listInvites: build.query({
      query: (id) => `/workspaces/${id}/invites`,
      transformResponse: (response) => unwrap(response).invites,
      providesTags: (_result, _error, id) => [{ type: 'Invites', id }],
    }),

    inviteMember: build.mutation({
      query: ({ id, ...body }) => ({ url: `/workspaces/${id}/invite`, method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Invites', id }],
    }),

    revokeInvite: build.mutation({
      query: ({ id, inviteId }) => ({ url: `/workspaces/${id}/invites/${inviteId}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Invites', id }],
    }),

    acceptInvite: build.mutation({
      query: (token) => ({ url: '/workspaces/invites/accept', method: 'POST', body: { token } }),
      transformResponse: unwrap,
      invalidatesTags: ['Workspaces'],
      onQueryStarted: switchToNewWorkspace,
    }),
  }),
});

export const {
  useListWorkspacesQuery,
  useGetWorkspaceQuery,
  useCreateWorkspaceMutation,
  useUpdateWorkspaceMutation,
  useDeleteWorkspaceMutation,
  useTransferOwnershipMutation,
  useChangeMemberRoleMutation,
  useRemoveMemberMutation,
  useLeaveWorkspaceMutation,
  useListInvitesQuery,
  useInviteMemberMutation,
  useRevokeInviteMutation,
  useAcceptInviteMutation,
} = workspaceApi;
