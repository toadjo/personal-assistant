/**
 * Pure helper for team realtime subscription logic.
 * Extracted from useTeamRealtime to enable testing without React.
 */

export interface TeamRealtimeDependencies {
  activeWorkspaceId: string | null;
  refreshProjects: () => void | Promise<void>;
  refreshTasks: () => void | Promise<void>;
  startRealtime: () => void | Promise<void>;
  stopRealtime: () => void | Promise<void>;
  onTeamDataUpdated: (
    callback: (event: unknown, payload: { workspaceId: string; tables: string[] }) => void
  ) => () => void;
  refreshProjectsEnabled: boolean;
  refreshTasksEnabled: boolean;
  debounceMs?: number;
}

/**
 * Starts a team realtime subscription and returns a cleanup function.
 *
 * @param dependencies - The dependencies for the realtime subscription
 * @returns A cleanup function that stops the subscription
 */
export function startTeamRealtimeSubscription(dependencies: TeamRealtimeDependencies): () => void {
  const {
    activeWorkspaceId,
    refreshProjects,
    refreshTasks,
    startRealtime,
    stopRealtime,
    onTeamDataUpdated,
    refreshProjectsEnabled,
    refreshTasksEnabled,
    debounceMs = 200
  } = dependencies;

  // No active workspace - return no-op cleanup
  if (!activeWorkspaceId) {
    return () => {};
  }

  let cancelled = false;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const pendingTables = new Set<"projects" | "tasks">();

  // Start realtime (best-effort)
  Promise.resolve(startRealtime()).catch(() => {
    // silent failure keeps UI functional
  });

  // Register listener
  const off = onTeamDataUpdated((_event, payload) => {
    if (cancelled) return;
    if (payload.workspaceId !== activeWorkspaceId) return;

    // Accumulate tables during debounce window
    payload.tables.forEach((table) => pendingTables.add(table as "projects" | "tasks"));

    // Reset debounce timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      const tablesToRefresh = new Set(pendingTables);
      pendingTables.clear();

      if (refreshProjectsEnabled && tablesToRefresh.has("projects")) {
        void refreshProjects();
      }
      if (refreshTasksEnabled && tablesToRefresh.has("tasks")) {
        void refreshTasks();
      }
    }, debounceMs);
  });

  // Return cleanup function
  return () => {
    cancelled = true;
    off();
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    pendingTables.clear();
    Promise.resolve(stopRealtime()).catch(() => {
      /* best-effort */
    });
  };
}
