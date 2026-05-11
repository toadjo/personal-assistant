# Worker Activity Log

## Purpose

A concise, durable record of meaningful worker slices for cross-machine continuity. This is the short-form counterpart to `WORKER_HANDOFF.md`.

## Rules

- One entry per meaningful worker slice.
- No secrets, tokens, or personal data.
- No local absolute machine paths.
- Keep entries brief and factual.

## Entry format

```
## YYYY-MM-DD: Goal summary

- Files touched: ...
- Checks run: ...
- Next action: ...
```

## Entries

## 2026-05-11: Add worker activity log workflow

- Files touched: `WORKER_ACTIVITY.md`, `scripts/activity.mjs`, `scripts/activity.test.mjs`, `package.json`, `scripts/handoff.mjs`, `WORKER_HANDOFF.md`
- Checks run: `npm test -- scripts/activity.test.mjs`, `npm run activity`, `npm run handoff`
- Next action: Use this log for every meaningful worker slice going forward.

## 2026-05-11: Prepare and tag v1.4.3 release package

- Files touched: `package.json`, `package-lock.json`, `WORKER_ACTIVITY.md`
- Checks run: `git status --short --branch`, `npm test -- scripts/activity.test.mjs`, `npm run activity`
- Next action: Monitor GitHub Actions "Release package" workflow for v1.4.3.

## 2026-05-11: Daily Command Center Foundation (v1.4.4)

- Files touched: `src/renderer/lib/derived/daily-command-center.ts`, `src/renderer/lib/derived/daily-command-center.test.ts`, `src/renderer/components/panels/DailyCommandCenterPanel.tsx`, `src/renderer/components/panels/DailyCommandCenterPanel.test.tsx`, `src/renderer/components/panels/DailyCommandCenterPanel.css`, `src/renderer/components/AssistantShell.tsx`
- Checks run: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`
- Next action: Verify Daily Command Center renders as primary desk surface.

## 2026-05-11: Daily Command Center Polish (v1.4.5)

- Files touched: `src/renderer/components/panels/DailyCommandCenterPanel.tsx`, `src/renderer/components/panels/DailyCommandCenterPanel.test.tsx`, `src/renderer/components/panels/DailyCommandCenterPanel.css`, `src/renderer/components/AssistantShell.tsx`, `src/renderer/lib/derived/daily-command-center.test.ts`
- Changes: Added open-panel navigation actions (tasks, reminders, notes) to DCC items; improved visual hierarchy with primary Summary/Now cards and compact Attention/Context; added mark-seen regression test and Now ordering stability test.
- Checks run: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`
- Next action: Continue local automation and local-first desk experience work.

## 2026-05-11: Local Personal Automations (v1.4.6)

- Files touched: `src/shared/types.ts`, `src/main/ipc/schemas.ts`, `src/main/ipc/schemas.test.ts`, `src/main/services/automation.ts`, `src/main/services/automation.test.ts`, `src/main/ipc/automation/formatActionLabel.ts`, `src/main/preload.ts`, `src/renderer/components/forms/RuleForm.tsx`, `src/renderer/components/forms/RuleForm.test.tsx`, `src/renderer/components/panels/AutomationRulesPanel.tsx`
- Changes: Extended automation action types with `localTask`. Added full task fields (title, notes, dueAt, priority, recurrence) to IPC schema and automation service. Updated `RuleForm` with local-first ordering and task creation fields. Updated `AutomationRulesPanel` copy to local-first. Added IPC schema tests, automation service tests, and RuleForm renderer tests.
- Checks run: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`
- Next action: Ship v1.4.6.

## 2026-05-11: Automation Reliability And Logs (v1.4.7)

- Files touched: `src/main/services/automation.ts`, `src/main/services/automation.test.ts`, `src/main/ipc/automation/formatActionLabel.ts`, `src/main/ipc/automation/formatActionLabel.test.ts`, `src/main/ipc/handlers/automation.handlers.ts`, `src/main/preload.ts`, `src/renderer/components/panels/AutomationLogsPanel.tsx`, `src/renderer/components/panels/AutomationLogsPanel.test.tsx`, `src/renderer/hooks/data/useAssistantData.ts`, `src/renderer/types.ts`
- Changes: Fixed `withRetry` to preserve `attemptsUsed` and `retryCount` in thrown `AutomationRetryError` so failed logs record correct retry metadata. Tightened `validateLocalTaskConfig` to reject invalid priority and recurrence instead of silently defaulting. Updated `isInvalidAutomationStoredConfigError` to include `localTask` validation messages. Improved `AutomationLogsPanel` with action labels, plain ASCII separators, and concise error formatting. Updated `ExecutionLogRow` renderer type and `useAssistantData` to pass through `ruleName` and `actionLabel`.
- Checks run: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`
- Next action: Continue reliability work or move toward v1.2.7 UX improvements.
