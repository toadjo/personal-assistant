import { useCallback, useEffect, useState } from "react";
import type { ExternalCalendarEvent } from "../../../shared/types";
import { getVisibleCalendarRangeIso } from "../../lib/externalCalendar";
import { requireAssistantApi } from "../../lib/assistantApi";
import { getAssistantInvokeErrorMessage } from "../../lib/errors";

export function useExternalCalendarEvents(
  calendarCursor: Date,
  refreshKey: number,
  onError?: (message: string) => void
): {
  externalEvents: ExternalCalendarEvent[];
  isLoading: boolean;
  reload: () => Promise<void>;
} {
  const [externalEvents, setExternalEvents] = useState<ExternalCalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const reload = useCallback(async () => {
    const range = getVisibleCalendarRangeIso(calendarCursor);
    setIsLoading(true);
    try {
      const api = requireAssistantApi();
      const events = await api.listExternalCalendarEvents({
        startAt: range.startAt,
        endAt: range.endAt
      });
      setExternalEvents(events);
    } catch (error) {
      onError?.(getAssistantInvokeErrorMessage(error));
      setExternalEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [calendarCursor, onError]);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  return { externalEvents, isLoading, reload };
}
