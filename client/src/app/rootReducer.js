import { combineReducers } from '@reduxjs/toolkit';
import { baseApi } from '../shared/api/baseApi';
import { authReducer } from '../features/auth';

// Server data lives in the RTK Query cache (baseApi). Slices hold client-only state.
const rootReducer = combineReducers({
  [baseApi.reducerPath]: baseApi.reducer,
  auth: authReducer,
});

export default rootReducer;
