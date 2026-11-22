import { baseApi } from '../../../shared/api/baseApi';

const unwrap = (response) => response.data; // server envelope: { success, data }

// Cache tag: a workspace's dashboard is { type: 'Dashboard', id: workspaceId }. Changing a task, comment or
// project invalidates the plain 'Dashboard' tag (every workspace), so the numbers are refetched.
export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // Returns { stats, weeklyThroughput, activity, projectHealth, workload }.
    getDashboard: build.query({
      query: (workspaceId) => `/workspaces/${workspaceId}/dashboard`,
      transformResponse: unwrap,
      providesTags: (_result, _error, workspaceId) => [{ type: 'Dashboard', id: workspaceId }],
    }),
  }),
});

export const { useGetDashboardQuery } = dashboardApi;
