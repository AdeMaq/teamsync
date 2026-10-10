import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '../shared/api/baseApi';
import rootReducer from './rootReducer';

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
});
