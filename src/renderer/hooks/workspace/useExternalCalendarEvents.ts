import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ExternalCalendarEvent } from "../../../shared/types";
import { getVisibleCalendarRangeIso } from "../../lib/externalCalendar";
import { requireAssistantApi } from "../../lib/assistantApi";
import { getAssistantInvokeErrorMessage } from "../../lib/errors";
import { workspaceQueryKeys } from "../../lib/query/keys";

export function useExternalCalendarEvents(
  calendarCursor: Date,
  refreshKey: number,
  onError?: (message: string) => void
): {
  externalEvents: ExternalCalendarEvent[];
  isLoading: boolean;
  reload: () => Promise<void>;
} {
  const queryClient = useQueryClient();
  const range = getVisibleCalendarRangeIso(calendarCursor);

  const externalEventsQuery = useQuery({
    queryKey: workspaceQueryKeys.calendar.externalEvents(range.startAt, range.endAt, refreshKey),
    queryFn: async () => {
      const api = requireAssistantApi();
      return api.listExternalCalendarEvents({
        startAt: range.startAt,
        endAt: range.endAt
      });
    }
  });

  const reload = useCallback(async () => {
    await queryClient.invalidateQueries({
      predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "workspace" && q.queryKey[1] === "calendar"
    });
  }, [queryClient]);

  useEffect(() => {
    if (!externalEventsQuery.error) return;
    onError?.(getAssistantInvokeErrorMessage(externalEventsQuery.error));
  }, [externalEventsQuery.error, onError]);

  return {
    externalEvents: (externalEventsQuery.data ?? []) as ExternalCalendarEvent[],
    isLoading: externalEventsQuery.isLoading || externalEventsQuery.isFetching,
    reload
  };
}
