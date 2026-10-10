import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { authApi } from '../api/authApi';

// Module-level so React StrictMode's double effect cannot fire two refreshes
// (refresh tokens rotate; a second parallel refresh would look like token reuse).
let started = false;

// Runs once on app load: tries to restore the session from the refresh-token cookie.
export function useBootstrapAuth() {
  const dispatch = useDispatch();

  useEffect(() => {
    if (started) return;
    started = true;
    dispatch(authApi.endpoints.refresh.initiate());
  }, [dispatch]);
}
