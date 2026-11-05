import { baseApi } from '../../../shared/api/baseApi';
import { positionFor, tasksInColumn } from '../utils';

const unwrap = (response) => response.data; // server envelope: { success, data }

// Cache tag: a project's whole board is { type: 'Tasks', id: projectId }.
export const taskApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // Every task of the project (the board needs all cards). Filtering is done on the screen.
    listTasks: build.query({
      query: (projectId) => `/projects/${projectId}/tasks`,
      transformResponse: (response) => unwrap(response).tasks,
      providesTags: (_result, _error, projectId) => [{ type: 'Tasks', id: projectId }],
    }),

    createTask: build.mutation({
      query: ({ projectId, ...body }) => ({ url: `/projects/${projectId}/tasks`, method: 'POST', body }),
      transformResponse: (response) => unwrap(response).task,
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Tasks', id: projectId }],
    }),

    // Cannot change the column; use moveTask for that.
    updateTask: build.mutation({
      query: ({ id, projectId: _projectId, ...body }) => ({ url: `/tasks/${id}`, method: 'PATCH', body }),
      transformResponse: (response) => unwrap(response).task,
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Tasks', id: projectId }],
    }),

    // { id, projectId, status, index } - `index` is the place in the destination column (0 = top), left out = bottom.
    // The card moves on screen at once and snaps back if the server refuses.
    moveTask: build.mutation({
      query: ({ id, status, index }) => ({ url: `/tasks/${id}/move`, method: 'POST', body: { status, index } }),
      async onQueryStarted({ id, projectId, status, index }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          taskApi.util.updateQueryData('listTasks', projectId, (tasks) => {
            const task = tasks.find((t) => t._id === id);
            if (!task) return;
            const others = tasksInColumn(tasks, status).filter((t) => t._id !== id);
            task.position = positionFor(others, index);
            task.status = status;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      // Refetch afterwards: the server may have renumbered the column.
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Tasks', id: projectId }],
    }),

    deleteTask: build.mutation({
      query: ({ id }) => ({ url: `/tasks/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Tasks', id: projectId }],
    }),
  }),
});

export const {
  useListTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useMoveTaskMutation,
  useDeleteTaskMutation,
} = taskApi;
