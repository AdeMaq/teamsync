import { useSelector } from 'react-redux';
import { useListWorkspacesQuery } from '../api/workspaceApi';
import { selectActiveWorkspaceId } from '../slice';

// The workspace the user is working in: their saved choice if it is still valid, otherwise the first one.
// `active` is a workspace summary (name, slug, plan, memberCount, myRole...); null while loading or when the
// user belongs to none. Other features read the current workspace through this hook.
export function useActiveWorkspace() {
  const { data, isLoading, isError, refetch } = useListWorkspacesQuery();
  const savedId = useSelector(selectActiveWorkspaceId);

  const workspaces = data ?? [];
  const active = workspaces.find((w) => w._id === savedId) ?? workspaces[0] ?? null;

  return { workspaces, active, isLoading, isError, refetch };
}
