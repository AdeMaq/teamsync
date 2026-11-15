import { baseApi } from '../../../shared/api/baseApi';

const unwrap = (response) => response.data; // server envelope: { success, data }

export const COMMENTS_PER_PAGE = 50; // the server's default page size

// Cache tag: all pages of one task's thread are { type: 'Comments', id: taskId }, so any change refetches them.
export const commentApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // Returns { comments, total, page, limit }, oldest first.
    listComments: build.query({
      query: ({ taskId, page }) => ({ url: `/tasks/${taskId}/comments`, params: { page, limit: COMMENTS_PER_PAGE } }),
      transformResponse: unwrap,
      providesTags: (_result, _error, { taskId }) => [{ type: 'Comments', id: taskId }],
    }),

    addComment: build.mutation({
      query: ({ taskId, text }) => ({ url: `/tasks/${taskId}/comments`, method: 'POST', body: { text } }),
      transformResponse: (response) => unwrap(response).comment,
      invalidatesTags: (_result, _error, { taskId }) => [{ type: 'Comments', id: taskId }],
    }),

    editComment: build.mutation({
      query: ({ id, text }) => ({ url: `/comments/${id}`, method: 'PATCH', body: { text } }),
      transformResponse: (response) => unwrap(response).comment,
      invalidatesTags: (_result, _error, { taskId }) => [{ type: 'Comments', id: taskId }],
    }),

    deleteComment: build.mutation({
      query: ({ id }) => ({ url: `/comments/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { taskId }) => [{ type: 'Comments', id: taskId }],
    }),
  }),
});

export const {
  useListCommentsQuery,
  useAddCommentMutation,
  useEditCommentMutation,
  useDeleteCommentMutation,
} = commentApi;
