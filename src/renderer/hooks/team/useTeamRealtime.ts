/**
 * Reusable hook for team realtime updates.
 *
 * Starts realtime when an active workspace exists, debounces refreshes,
 * and stops on cleanup. Best-effort: failures do not block the UI.
 */

import { useEffect, useRef } from "react";
import type { TeamState } from "./useTeamState";

type RefreshOptions = {
  projects?: boolean;
  tasks?: boolean;
  enabled?: boolean;
};

export function useTeamRealtime(
  team: TeamState,
  options: RefreshOptions = {}
): void {
  const { enabled = true, projects, tasks } = options;
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const realtimePendingTablesRef = useRef<Set<"projects" | "tasks">>(new Set());
  
  useEffect(() => {
    if (!enabled) return;
    
    const activeId = team.activeWorkspace?.id ?? null;
    if (!activeId) {
      return;
    }
    let cancelled = false;
    void window.assistantApi.teamRealtimeStart().catch(() => {
      // realtime is best-effort; silent failure keeps the UI functional
    });
    const off = window.assistantApi.onTeamDataUpdated((_event, payload) => {
      if (cancelled) return;
      if (payload.workspaceId !== activeId) return;
      // Accumulate tables during debounce window
      payload.tables.forEach((table) => realtimePendingTablesRef.current.add(table as "projects" | "tasks"));
      // Reset debounce timer
      if (realtimeDebounceRef.current) {
        clearTimeout(realtimeDebounceRef.current);
      }
      realtimeDebounceRef.current = setTimeout(() => {
        realtimeDebounceRef.current = null;
        const tablesToRefresh = realtimePendingTablesRef.current;
        realtimePendingTablesRef.current = new Set();
        if (projects && tablesToRefresh.has("projects")) {
          void team.loadProjects();
        }
        if (tasks && tablesToRefresh.has("tasks")) {
          void team.loadTasks();
        }
      }, 200);
    });
    return () => {
      cancelled = true;
      off();
      if (realtimeDebounceRef.current) {
        clearTimeout(realtimeDebounceRef.current);
        realtimeDebounceRef.current = null;
      }
      realtimePendingTablesRef.current.clear();
      void window.assistantApi.teamRealtimeStop().catch(() => {
        /* best-effort */
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.activeWorkspace?.id, projects, tasks, enabled]);
}
