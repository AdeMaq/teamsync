import { baseApi } from '../../../shared/api/baseApi';

const unwrap = (response) => response.data; // server envelope: { success, data }

// Cache tags: a workspace's project list is { type: 'Projects', id: workspaceId }, one project is { type: 'Project', id }.
export const projectApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // Returns { projects, total, page, limit }.
    listProjects: build.query({
      query: ({ workspaceId, ...params }) => ({ url: `/workspaces/${workspaceId}/projects`, params }),
      transformResponse: unwrap,
      providesTags: (_result, _error, { workspaceId }) => [{ type: 'Projects', id: workspaceId }],
    }),

    getProject: build.query({
      query: (id) => `/projects/${id}`,
      transformResponse: (response) => unwrap(response).project,
      providesTags: (_result, _error, id) => [{ type: 'Project', id }],
    }),

    createProject: build.mutation({
      query: ({ workspaceId, ...body }) => ({ url: `/workspaces/${workspaceId}/projects`, method: 'POST', body }),
      transformResponse: (response) => unwrap(response).project,
      invalidatesTags: (_result, _error, { workspaceId }) => [{ type: 'Projects', id: workspaceId }],
    }),

    updateProject: build.mutation({
      query: ({ id, ...body }) => ({ url: `/projects/${id}`, method: 'PATCH', body }),
      transformResponse: (response) => unwrap(response).project,
      invalidatesTags: (project, _error, { id }) => [
        { type: 'Project', id },
        ...(project ? [{ type: 'Projects', id: project.workspace }] : []),
      ],
    }),

    // The project is gone afterwards, so only the list is refreshed (refetching its details would 404).
    deleteProject: build.mutation({
      query: ({ id }) => ({ url: `/projects/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { workspaceId }) => [{ type: 'Projects', id: workspaceId }],
    }),
  }),
});

export const {
  useListProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
} = projectApi;
