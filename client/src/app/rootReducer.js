import { combineReducers } from '@reduxjs/toolkit';
import { baseApi } from '../shared/api/baseApi';
import { authReducer } from '../features/auth';
import { workspacesReducer } from '../features/workspaces';

// Server data lives in the RTK Query cache (baseApi). Slices hold client-only state.
const rootReducer = combineReducers({
  [baseApi.reducerPath]: baseApi.reducer,
  auth: authReducer,
  workspaces: workspacesReducer,
});

export default rootReducer;
