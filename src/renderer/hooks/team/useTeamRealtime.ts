/**
 * Reusable hook for team realtime updates.
 *
 * Starts realtime when an active workspace exists, debounces refreshes,
 * and stops on cleanup. Best-effort: failures do not block the UI.
 */

import { useEffect } from "react";
import type { TeamState } from "./useTeamState";
import { startTeamRealtimeSubscription } from "./teamRealtimeSubscription";
import { getAssistantApi } from "../../lib/assistantApi";

type RefreshOptions = {
  projects?: boolean;
  tasks?: boolean;
  enabled?: boolean;
};

export function useTeamRealtime(team: TeamState, options: RefreshOptions = {}): void {
  const { enabled = true, projects, tasks } = options;

  useEffect(() => {
    if (!enabled) return;

    const activeId = team.activeWorkspace?.id ?? null;
    const api = getAssistantApi();
    if (!api) return;

    const cleanup = startTeamRealtimeSubscription({
      activeWorkspaceId: activeId,
      refreshProjects: () => team.loadProjects(),
      refreshTasks: () => team.loadTasks(),
      startRealtime: () => api.teamRealtimeStart(),
      stopRealtime: () => api.teamRealtimeStop(),
      onTeamDataUpdated: (callback) => api.onTeamDataUpdated(callback),
      refreshProjectsEnabled: !!projects,
      refreshTasksEnabled: !!tasks,
      debounceMs: 200
    });

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.activeWorkspace?.id, projects, tasks, enabled]);
}
