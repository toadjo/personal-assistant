export type ProactiveTipInput = {
  haReady: boolean;
  overdueCount: number;
  todayAgendaCount: number;
  commandHistoryLength: number;
};

export function proactiveTipText(input: ProactiveTipInput): string {
  if (!input.haReady) {
    return "Assistant tip: connect Home Assistant to unlock device commands like `toggle kitchen light`.";
  }
  if (input.overdueCount > 0) {
    return `Assistant tip: you have ${input.overdueCount} overdue reminder${input.overdueCount === 1 ? "" : "s"} - run 'list reminders' to review now.`;
  }
  if (input.todayAgendaCount > 0) {
    return `Assistant tip: you have ${input.todayAgendaCount} item${input.todayAgendaCount === 1 ? "" : "s"} due today - run 'list reminders' for focus mode.`;
  }
  if (input.commandHistoryLength === 0) {
    return "Assistant tip: start with `help` to see supported commands and fast examples.";
  }
  return "Assistant tip: reuse command history below to repeat frequent actions faster.";
}
