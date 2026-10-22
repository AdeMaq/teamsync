import { createSlice } from '@reduxjs/toolkit';

// Which workspace the user is looking at. Remembered in the browser as a convenience; if the saved id is
// no longer valid (left the workspace, different account) useActiveWorkspace falls back to the first one.
const STORAGE_KEY = 'teamsync.activeWorkspaceId';

const readSaved = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // storage can be unavailable (private mode, blocked cookies)
  }
};

const writeSaved = (id) => {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // not remembering the choice is fine
  }
};

const workspacesSlice = createSlice({
  name: 'workspaces',
  initialState: { activeWorkspaceId: readSaved() },
  reducers: {
    setActiveWorkspace(state, { payload }) {
      state.activeWorkspaceId = payload;
    },
  },
});

const { setActiveWorkspace } = workspacesSlice.actions;

// Thunk instead of a plain action so the browser storage write stays out of the reducer.
export const selectWorkspace = (id) => (dispatch) => {
  writeSaved(id);
  dispatch(setActiveWorkspace(id));
};

export const selectActiveWorkspaceId = (state) => state.workspaces.activeWorkspaceId;

export default workspacesSlice.reducer;
