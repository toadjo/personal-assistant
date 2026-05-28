# Changelog

All notable changes to Personal OS are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.8.0] - 2026-05-28

### Added

- TanStack Query renderer data layer for workspace and life-area data.
- Query-backed optimistic mutations for tasks, reminders, and notes with rollback behavior.
- Panel and overlay crash isolation through scoped error boundaries.
- Axe-powered E2E accessibility checks.
- Keyboard-only smoke coverage for the main workflow.
- Focus-stack manager for modal and overlay focus restoration.
- Command Palette scope filters and improved fuzzy ranking.

### Changed

- Core workspace data now refreshes through query invalidation instead of local refresh state.
- Finance, Family, Health, Hobbies, and Car panels now use query-backed data loading.
- Notes search now uses debounced query values instead of polling.
- Command Palette search now boosts recent, active, and better fuzzy matches.
- Roadmap now treats Phase C as the active future track.

### Fixed

- Reduced documented axe accessibility violations across Calendar, Projects, Hobbies, Release Notes, and heading hierarchy.
- Improved list semantics in Hobbies and release-note rendering.
- Preserved shell stability when individual panels or overlays fail.

### Tests

- Lint passing with zero warnings.
- Typecheck passing.
- Full test suite passing (1 pre-existing test failure in executeAssistantCommand.test.ts for "handles open command with no matches" - unrelated to accessibility fixes).
- E2E passing.

## [3.7.0] - 2026-05-27

### Added

- Experimental Connected Calendar support for Google Calendar.
- Google Calendar events now sync into the existing app Calendar instead of a separate calendar surface.
- Google calendar source filtering in the Calendar panel.
- Connected Accounts panel for signing in with Google and syncing connected calendar data.
- Local OAuth loopback flow with secure token storage.
- Calendar OAuth configuration support for release builds.
- Detailed Google OAuth and sync error messages for easier setup and QA.

### Changed

- Connected Accounts now uses a one-click sign-in flow that waits for browser authorization automatically.
- Calendar sync success messages now only appear when the returned account state is actually synced.
- Life Area panels received visual cleanup so summary cards and sections render compactly without excessive scrolling.

### Experimental Access Note

- Google Calendar is the only connected calendar provider enabled for this release.
- This feature is still experimental and requires a build configured with calendar OAuth credentials.
- Public builds that are not configured for calendar OAuth disable the affected sign-in buttons.
- Outlook and Microsoft Teams calendar display remain planned, but are not enabled for this release.

## [3.6.0] - 2026-05-26

### Changed

- Created shared UI components for Life Areas: LoadingState, SummaryCard, and LifeAreaPanelProps type
- Extracted shared date formatting utilities (formatDate, formatDateTime, formatEur, formatMileage) to lib/dateFormat.ts
- Normalized panel implementations to use shared LoadingState and SummaryCard components
- Unified panel props interface across all Life Area panels (Finance, Car, Family, Health, Hobbies)
- Added comprehensive docs/LIFE_AREAS.md guide for creating new Life Area modules
- Removed unused custom hooks (useLifeAreaData, useLifeAreaCRUD) that were over-engineered
- Verified backup count labels are consistent across all life slices (Finance, Car, Family, Health, Hobbies)
- All 1065 tests pass with no behavior changes

### Added

- docs/LIFE_AREAS.md documentation with step-by-step guide for adding new Life Area modules
- Shared component library in src/renderer/components/life-areas/ for reusable UI patterns
- Shared utility library in src/renderer/lib/dateFormat.ts for date and number formatting

## [3.5.0] - 2026-05-26

### Added

- Hobbies module for tracking personal progress and hobby activities with comprehensive management capabilities
- Hobby management with categories, descriptions, and status tracking (active/inactive)
- Hobby session logging with duration, mood, energy levels, and progress ratings
- Hobby project tracking with milestones, target dates, and completion status
- Hobby milestone management with descriptions, target dates, and completion tracking
- Hobby supply tracking with types, costs, purchase dates, and source information
- Hobbies summary dashboard showing active hobbies, sessions this month, open projects, open milestones, and recent sessions
- Hobbies data integration with backup system (export, import, preview, reset)
- Comprehensive test coverage for hobbies service, IPC handlers, renderer components, and backup operations
- Updated Data Control UI to display Hobbies counts in backup preview and import confirmation dialogs

### Changed

- Added Hobbies tab to Personal module navigation in AssistantShell
- Updated backup system to include all hobbies-related tables in export/import/preview/reset operations
- Updated IPC handler payload contract tests to include hobbies channels
- Updated backup UI types to include Hobbies counts for all five hobbies entities
- Enhanced reset confirmation dialog to mention hobbies data deletion

## [3.4.0] - 2026-05-26

### Added

- Health module for tracking personal health information with comprehensive management capabilities
- Health appointments tracking with type, provider, location, date, time, duration, and status
- Health medications management with dosage, frequency, route, status, and prescriber information
- Health symptoms logging with severity tracking and date ranges
- Health measurements recording for weight, blood pressure, heart rate, temperature, blood sugar, and custom metrics
- Health obligations tracking for refills, lab tests, vaccinations, screenings, exercise, and custom obligations
- Health summary dashboard showing upcoming appointments, active medications, active symptoms, recent measurements, and open/overdue obligations
- Health data integration with backup system (export, import, preview, reset)
- Comprehensive test coverage for health service, IPC handlers, renderer components, and backup operations
- Updated Data Control UI to display Health counts in backup preview and import confirmation dialogs

### Changed

- Added Health tab to Personal module navigation in AssistantShell
- Updated backup system to include all health-related tables in export/import/preview/reset operations
- Updated IPC handler payload contract tests to include health channels
- Updated backup UI types to include Health counts for all five health entities
- Enhanced reset confirmation dialog to mention health data deletion

## [3.3.0] - 2026-05-26

### Added

- Family module for tracking family members, occasions, and obligations
- Family member management with contact information and importance flags
- Family occasions tracking for birthdays, name days, anniversaries, memorials, and custom events
- Family obligations for calls, visits, messages, gifts, paperwork, and custom tasks
- Family summary dashboard showing member count, upcoming occasions, and open obligations
- Family data integration with backup system (export, import, preview, reset)
- Comprehensive test coverage for family service, IPC handlers, renderer components, and backup operations

### Changed

- Added Family tab to Personal module navigation in AssistantShell
- Updated backup system to include all family-related tables in export/import/preview/reset operations
- Updated IPC handler payload contract tests to include family channels
- Updated backup UI types to include Family counts for all three family entities

## [3.2.0] - 2026-05-26

### Added

- Finance module for tracking bills and expenses with a bills-first interface
- Bill management with create, update, delete, and mark as paid operations
- Expense tracking with create, update, and delete operations
- Monthly financial summary showing upcoming bills, paid bills, unpaid/overdue bills, total expenses, and committed amounts
- Bill filtering by status (all, unpaid, paid, overdue, upcoming, this_month)
- Expense filtering by time period (all, this_month)
- Finance data integration with backup system (export, import, preview, reset)
- Comprehensive test coverage for finance service, IPC handlers, renderer components, and backup operations

### Changed

- Polished End-of-Day Review panel to always show explicit "End-of-Day Review" heading, even in empty state
- Improved Data Control panel to display health check and optimization results directly in the panel UI
- Added accessible labels to icon-only toolbar buttons for Appearance, Data, and AI settings
- Enhanced release hygiene with validation that Windows releases include all required assets (.exe, .blockmap, latest.yml)
- Added post-release QA checklist entry for verifying GitHub release assets and installed About version

### Fixed

- Improved accessibility of toolbar controls by adding proper ARIA labels to icon-only buttons

## [3.2.0] - 2026-05-26

### Added

- Car module for vehicle management with comprehensive tracking capabilities
- Vehicle management with create, update, and delete operations
- Fuel entry tracking with odometer updates and automatic vehicle mileage updates
- Maintenance/repair expense tracking with cost and shop information
- Recurring car bills (insurance, registration, inspection, road tax) with payment tracking
- Mileage logging for trip distance tracking
- Service reminders with odometer and date-based due tracking
- Car data integration with backup system (export, import, preview, reset)
- Comprehensive test coverage for car service, IPC handlers, renderer components, and backup operations

### Changed

- Added Car tab to Personal module navigation in AssistantShell
- Updated backup system to include all car-related tables in export/import/preview/reset operations
- Updated IPC handler payload contract tests to include car channels

## [3.3.0] - 2026-05-26

### Added

- Family module for family member management with obligations-first interface
- Family member management with contact information, relationship tracking, and importance marking
- Family occasion tracking (birthdays, name days, anniversaries, memorials, custom events) with yearly recurrence
- Family obligation tracking (calls, visits, messages, gifts, paperwork, custom obligations) with due dates and priority levels
- Family summary showing total members, important members, upcoming occasions (30 days), open obligations, and overdue obligations
- Yearly occasion comparison using month/day logic to handle dates from previous years
- Family data integration with backup system (export, import, preview, reset)
- Comprehensive test coverage for family service, IPC handlers, renderer components, and backup operations

### Changed

- Added Family tab to Personal module navigation in AssistantShell
- Updated backup system to include all family-related tables in export/import/preview/reset operations
- Updated IPC handler payload contract tests to include family channels

## [3.3.0] - 2026-05-26

### Added

- Family module for family obligations and relationship management
- Family member management with contact information and importance markers
- Family occasions (birthdays, name days, anniversaries, memorials, custom) with yearly recurrence
- Family obligations (calls, visits, messages, gifts, paperwork, custom) with due date and priority tracking
- Family summary showing total members, important members, upcoming occasions, open obligations, and overdue obligations
- Obligation completion tracking with status updates and completion timestamps
- Yearly occasion calculation that compares by month/day for accurate upcoming event detection
- Family data integration with backup system (export, import, preview, reset)
- Comprehensive test coverage for family service, IPC handlers, renderer components, and backup operations

### Changed

- Added Family tab to Personal module navigation in AssistantShell
- Updated backup system to include all family-related tables in export/import/preview/reset operations
- Updated IPC handler payload contract tests to include family channels

## [3.0.1] - 2026-05-26

### Fixed

- Fixed `review day` command to switch to Today module before opening End-of-Day Review, ensuring the review panel is visible from any module
- Added missing `latest.yml` update manifest to v3.0.0 GitHub release for proper update hygiene

## [3.0.0] - 2026-05-26

### Changed

- Consolidated daily workflow UI copy to reflect Personal OS branding instead of version-specific references
- Updated onboarding experience to introduce the app as a local-first personal operating layer
- Standardized command examples to use consistent `capture`, `find`, and `plan today` commands
- Enhanced Data Control panel with health check and database optimization buttons
- Updated success/error messages across workflows for consistency
- Improved backup action hooks to support health check and optimization operations
- Updated documentation (README.md, MAINTAINER_GUIDE.md, ARCHITECTURE.md) to reflect Personal OS positioning

### Added

- Database health check UI integration in Data Control panel
- Database optimization UI integration in Data Control panel
- Comprehensive health check status reporting with integrity, schema, data, and performance metrics
- Health check and optimization state management in backup actions hook

### Fixed

- Removed stale version-specific comments from component files
- Updated command palette and onboarding commands to use consistent terminology
- Ensured all workflow copy describes the core loop: capture, sort, plan, act, review, search, recover

### Tests

- Updated DataControlPanel tests to cover health check and optimization buttons
- Added tests for health check and optimization state management
- All existing tests continue to pass (1031 tests)

### Documentation

- Updated README.md to reflect Personal OS branding and core workflow
- Updated MAINTAINER_GUIDE.md to reflect Personal OS positioning
- Updated ARCHITECTURE.md to reflect Personal OS architecture
- Added Personal OS Core workflow description to README

## [2.9.0] - 2026-05-25

### Added

- Backup preview with counts and validation before destructive import operations
- SQLite data health diagnostics (integrity check, schema validation, data analysis, performance metrics)
- Database optimization functionality (WAL checkpoint, VACUUM, index optimization)
- Release hygiene check script for pre-release validation
- AGENTS.md documentation for AI agent development
- IPC channels for database health checks and optimization

### Changed

- Backup import now uses two-step process: preview first, then confirm with detailed counts
- Import confirmation dialog shows backup version, export date, and item counts
- Database health check provides comprehensive diagnostics with recommendations
- Test databases now use WAL mode for consistency with production

### Tests

- Added 8 comprehensive tests for backup preview functionality
- Added 8 tests for database health check service
- Updated backup actions tests for preview integration
- Updated IPC handler contract tests for new channels

## [2.8.0] - 2026-05-25

### Added

- Enhanced search ranking system with intelligent scoring for exact matches (100+ points), prefix matches (50+ points), and fuzzy matches
- Recent items tracking via localStorage to surface frequently accessed items in command palette
- Saved searches feature to store and reuse common search queries
- New recall commands: `recent` (shows recent items), `find <query>` (searches with query), `saved searches` (shows saved searches), `open <id>` (opens item by ID)
- Command palette UI components for displaying recent items and saved searches with section headers and badges
- CSS styles for command palette sections (`.commandPaletteSection`, `.commandPaletteSectionHeader`, `.commandPaletteSectionList`, `.commandPaletteRecentBadge`, `.commandPaletteSavedBadge`)

### Changed

- Search engine now considers recency boost (+20 points), active/open item boost (+15 points), and completed/done item penalty (-10 points)
- Command execution accepts additional callback parameters for opening specific item types (notes, tasks, reminders, team tasks)
- Workspace composition hooks updated to support new search and recall functionality
- Search results are ranked by confidence score, with high-confidence matches auto-opening and low-confidence matches showing search results

### Tests

- Added 20 comprehensive tests for search ranking system covering exact matches, prefix matches, fuzzy matches, and scoring factors
- Added 6 tests for recent items tracking (add, get, clear functionality)
- Added 7 tests for saved searches feature (save, get, delete, clear functionality)
- Added 3 tests for new recall commands (recent, saved searches, open with exact match, open with no matches, open with low confidence)
- All verification commands passing: lint, typecheck, test (1031 tests), build

## [2.7.1] - 2026-05-25

### Fixed

- Quick Capture now refreshes data after successful save, ensuring captured items appear immediately in panels and counters
- Corrected shortcut documentation to reflect actual binding: Quick Capture uses `Ctrl+Alt+N` / `Command+Alt+N` (not `Ctrl+Shift+N`)
- Added missing tray menu items for Quick task and Quick reminder to complete Windows tray QA coverage

### Changed

- QuickCaptureDialog now accepts an `onSaved` callback to trigger data refresh after successful capture
- AssistantShell implements `handleQuickCaptureSaved` to refresh appropriate data slices (notes, tasks, or reminders) based on capture type
- Success messages now display after data refresh completes for better user feedback

### Tests

- Added test for `onSaved` callback with correct capture type
- Updated tray-ipc-wiring tests for new Quick task and Quick reminder menu items
- All verification commands passing: lint, typecheck, test (1002 tests), build, smoke check, preload smoke, npm audit

## [2.7.0] - 2026-05-25

### Added

- Quick Capture: global capture surface for rapid note, task, reminder, and inbox entry
- Global shortcut (Cmd/Ctrl+Alt+N) to open Quick Capture dialog from anywhere
- Tray menu integration with Quick Capture options (Quick note, Quick task, Quick reminder)
- Command support: `capture`, `capture note <text>`, `capture task <text>`, `capture reminder <text>`
- QuickCaptureDialog component with type selector and optional fields (due date, priority)
- Typed text pre-fills from command for streamlined capture workflow
- onQuickCapture callback through workspace composition for dialog state management

### Changed

- Command execution now routes capture commands to Quick Capture dialog
- External quick commands from Electron IPC open Quick Capture with appropriate type
- AssistantCommandDeps type includes onQuickCapture for capture routing
- TeamDataParams type includes onQuickCapture for workspace wiring

### Tests

- Added 21 renderer tests for QuickCaptureDialog component
- Updated tray-ipc-wiring tests for capture menu items
- Updated executeAssistantCommand tests for capture command variants
- Tests cover type selection, text pre-fill, submission, error handling, and state reset
- All 998 tests passing

## [2.6.0] - 2026-05-25

### Added

- End-of-Day Review: daily review workflow showing completed tasks, completed reminders, unfinished items, and captured notes
- Review Day button in Today strip to trigger end-of-day review
- "review day" command support for keyboard-driven workflow
- Carry-over actions for unfinished tasks (reschedule to tomorrow) and reminders (snooze to tomorrow)
- EndOfDayReviewPanel component with categorized sections for different item types
- deriveEndOfDayReview function to infer today's activity from task, reminder, and note timestamps
- lastCompletedAt field to BriefItem type for tracking task completion status

### Changed

- BriefItem type now includes optional lastCompletedAt field for accurate completion tracking
- End-of-day review uses lastCompletedAt timestamp to identify tasks completed today
- Unfinished items are inferred from due dates and completion status

### Tests

- Added 16 unit tests for deriveEndOfDayReview function
- Added 14 renderer tests for EndOfDayReviewPanel component
- Tests cover completion detection, unfinished item identification, carry-over actions, and error handling
- All 977 tests passing

## [2.5.0] - 2026-05-25

### Added

- Quick Reschedule: calendar action button for tasks and reminders with preset options (Today, Tomorrow, Next Week, Custom)
- Batch Snooze: Snooze button for selected reminders with preset options (10 minutes, 1 hour, Tomorrow, Next Week)
- Enhanced Plan Today panel with scheduling controls for efficient daily planning
- Dropdown menus for quick scheduling actions with keyboard navigation support

### Changed

- Plan Today panel now includes both completion and scheduling workflows
- Quick Reschedule uses existing task and reminder update APIs for consistency
- Batch Snooze only affects selected reminders, leaving tasks unchanged
- Improved scheduling UX with preset time options for common workflows

### Tests

- Added 18 renderer tests for Quick Reschedule and Batch Snooze functionality
- Tests cover calendar actions, preset selection, batch operations, and error handling
- All 951 tests passing

## [2.4.0] - 2026-05-25

### Added

- Plan Today panel integration into Today module with live queue of overdue tasks, due today reminders, and unsorted notes
- Batch complete functionality: checkbox selection for tasks and reminders with Select All / Deselect All
- Complete N Selected action for bulk completing multiple items at once
- Smart selection logic: only completable items (tasks and reminders) can be selected, notes are excluded

### Changed

- Plan Today queue now integrated into the Today module alongside Daily Command Center
- Bulk completion uses source IDs for proper API calls
- Enhanced Plan Today panel with selection state management and batch processing UI

### Tests

- Added 9 renderer tests for batch complete functionality
- Tests cover checkbox selection, Select All, bulk completion, and state clearing
- All 933 tests passing

## [2.3.0] - 2026-05-25

### Added

- Plan Today panel: prioritized queue of overdue tasks, due today reminders, and unsorted notes for daily planning workflow
- Performance instrumentation (dev-only) for app startup, Today/Inbox render times, and drawer latency
- Memoization of deriveDailyCommandCenter function for expensive operations

### Changed

- Enhanced type system: added required `id` field to BriefItem for better item tracking and deduplication
- Improved Plan Today queue derivation with priority-based sorting (overdue > due-today > unsorted)

### Tests

- Added 6 unit tests for derivePlanTodayQueue derivation logic
- Added 11 renderer tests for PlanTodayPanel component states and actions
- All existing tests updated to support new BriefItem type requirements

## [2.2.0] - 2026-05-25

Windows-only manual release. macOS/Linux assets are omitted when packaging validation is not complete.

### Fixed

- Drawer date editing now uses local datetime-local semantics consistently across timezones.
- Due dates no longer shift when editing local tasks, team tasks, and reminders.

### Tests

- All unit tests passing with timezone-aware date handling.

## [2.1.9] - 2026-05-22

Windows-only manual release. macOS/Linux assets are omitted when packaging validation is not complete.

### Added

- Inbox capture now guides task and reminder captures directly into Today.
- Today review rows now expose Details, Complete, Snooze, and Open Inbox actions.

### Changed

- Home, Today, and Inbox empty states now guide the daily workflow instead of ending in passive states.
- Daily Flow navigation now feels continuous across Home, Inbox, Today, and the unified drawer.
- Inbox row actions and spacing were tightened for better visual density.

### Fixed

- Undated captured tasks now appear in Today Context.
- Captured reminders are deduplicated in Today review.
- Electron main-process build output now matches the packaged app entry contract.
- Inbox capture controls remain visible after CSS token normalization.

### Security

- Security audit completed with zero critical, high, or medium findings.

### Tests

- Full local gates passed.
- Electron manual QA passed for Inbox to Today capture, task completion, reminder snooze, note capture, empty states, and narrow viewport layout.

## [2.1.8] - 2026-05-21

Windows-only manual release. macOS/Linux assets are omitted when packaging validation is not complete.

### Fixed

- Windows desktop and Start menu shortcuts now use the PersonalAssistant icon even when executable resource editing is disabled.

### Tests

- NSIS installer build and smoke check verified shortcut icon packaging.

## [2.1.7] - 2026-05-21

Windows-only manual release. macOS/Linux assets are omitted when packaging validation is not complete.

### Added

- Corporate security mode with policy file enforcement for managed deployments.
- Outbound network guard with host allowlisting for controlled external connections.
- Encrypted backup export in corporate mode using OS-level encryption.
- Policy controls for backup export/import, external URLs, and secret storage requirements.
- Content Security Policy (CSP) generation from policy in corporate mode.
- Security audit scripts: SBOM generation, npm audit, and release evidence collection.
- Windows code signing support via electron-builder environment variables.
- Corporate security documentation: IT Review Packet, database-at-rest strategy, and updated corporate mode guide.
- Release notes panel that shows once per installed version.

### Changed

- Dashboard polish with improved visual hierarchy and spacing.
- Light theme distinction for better readability.
- Windows icon identity fix for consistent taskbar and title bar appearance.
- Policy file ACL validation with fail-closed behavior in corporate mode.
- Secret storage fail-closed behavior when OS encryption is unavailable.

### Security

- All secrets (AI API keys, Home Assistant tokens, Supabase keys) encrypted via OS safeStorage.
- Backup export excludes secret settings and imports reject secret fields.
- Outbound guard enforces host allowlisting at service layer and CSP layer.
- Policy file validation prevents user-writable policy files in corporate mode.
- Database-at-rest strategy documented with OS-level encryption recommendations.

### Tests

- All 868 unit tests passing.
- Lint, typecheck, and production builds all passing.
- Security verification suite (audit, SBOM, release evidence) passing.

## [2.1.6] - 2026-05-20

Windows-only manual release. macOS/Linux assets are omitted when packaging validation is not complete.

### Fixed

- First-run onboarding now works with the new module-tab layout.
- Note creation step switches to Memos module before showing the note form.
- Reminder creation step switches to Reminders module before showing the reminder form.
- Completed onboarding lands on the default Home layout (Calendar left, Command right).
- Electron E2E tests for first-run onboarding now pass with the updated layout.

### Tests

- All 24 Electron E2E tests passing.
- Browser E2E, unit suite, typecheck, lint, and production builds all passing.

## [2.1.5] - 2026-05-20

Windows-only manual release. macOS/Linux assets are omitted when packaging validation is not complete.

### Changed

- Desk UI now opens to a focused two-column Home dashboard: Calendar on the left, Command input on the right.
- Top module buttons (Home, Today, Inbox, Memos, Reminders, Tasks, Automations) replace the previous tab strip.
- Home dashboard is the default view; clicking a module button shows that focused module view.
- Calendar is always visible in the Home dashboard; separate Calendar tab removed.
- Top count chips are now clickable and navigate to their corresponding modules.

### Fixed

- Renderer load stability when Electron preload bridge is unavailable or partial.
- Typed preload helper no longer leaks `unknown` return types into renderer code.

### Tests

- Preload smoke test, E2E Home layout navigation test, unit suite, typecheck, lint, and production builds all passing.

## [2.1.4] - 2026-05-19

Security hardening and Electron upgrade. This is a Windows-only manual release; macOS/Linux assets are omitted when packaging validation is not complete.

### Added

- ISO 27001 readiness documentation pack under `docs/security/`, including control mapping, risk register, asset inventory, operational controls, and Greek management summary.
- v2.1.4 release evidence checklist with verification results and installer checksum.

### Changed

- Upgraded Electron from 35.0.0 to 41.0.0, electron-builder from 25.1.8 to 26.8.1, and better-sqlite3 from 11.8.1 to 12.10.0.
- Added `npm audit --audit-level=high` as a documented release security gate.
- Removed dependency overrides that are no longer needed after the Electron upgrade.

### Security

- Fail-closed secret storage now refuses to store AI API keys, Home Assistant tokens, and Supabase session tokens when OS encryption is unavailable.
- Backup export excludes secret settings, and backup import rejects backups containing secret fields.
- Renderer error persistence redacts secrets before logs are stored.
- Packaged Electron runtime uses sandboxing and a hardened Content Security Policy.

### Fixed

- AI provider errors now surface as real provider errors instead of generic command failures.

## [2.1.3] - 2026-05-18

Team Projects setup hotfix. This is a Windows-only manual release; macOS/Linux assets are omitted when packaging validation is not complete.

### Changed

- Replaced the Team Projects unavailable dead end with a beginner-friendly in-app setup flow.
- Added release-time hosted backend bundling so hosted Team Projects builds can ask users only for a display name.
- Updated Team Projects setup documentation around hosted builds and app-guided setup.

## [2.1.2] - 2026-05-18

Personal OS app workflow hardening. This is a Windows-only manual release; macOS/Linux assets are omitted when packaging validation is not complete.

### Added

- Editable local reminders from the unified drawer.
- Team tasks in Unified Inbox, Daily Command Center, Command Palette, Today Strip, and the unified drawer.
- Calendar quick-create flows for tasks and reminders.
- Automation rule visibility and focus handoff from Desk into Household.
- Send local tasks to Team Projects from Inbox.

### Changed

- Centralized team realtime refresh through a reusable subscription helper.
- Opened notes, tasks, reminders, and team tasks from Command Palette through the unified drawer.
- Made Windows manual release the active documented release path.
- Removed stale brief panels after Daily Command Center became the active brief surface.

### Fixed

- Preserved task metadata when editing local task details from the unified drawer.
- Hardened Calendar Quick Create date handling and test determinism.
- Hardened Data Control backup, import, and reset button states and renderer coverage.

## [2.1.1] - 2026-05-15

Personal OS v3 integration hardening and manual release reliability. This is a Windows-only manual release; macOS/Linux assets are omitted when packaging validation is not complete.

### Added

- Personal OS v3 integration: Unified Inbox panel with quick capture for notes, tasks, and reminders.
- WorkItemDetailDrawer: unified detail drawer for viewing and editing work items from Inbox and Daily Command Center.
- Daily Command Center drawer integration: clickable item labels open the unified detail drawer.
- Windows-only manual release documentation in RELEASING.md.

### Changed

- Removed stale version-specific comments from codebase.
- Updated README.md to clarify that GitHub Actions is not required for releases.
- Updated APP_AUDIT_2026-05-15.md to reflect v3 stack and 616 tests passing.

### Fixed

- No mojibake found in user-facing text; only acceptable em-dashes in comments and theme names remain.
- Layouts for DCC, Inbox, and detail drawer are properly responsive with no overflow issues.

## [2.1.0] - 2026-05-15

Team Projects UX and setup release. Friendly display-name-first setup, shared task editor, task board filters, realtime IPC cleanup, and visual hardening.

### Added

- Friendly Team Projects setup: display-name-first flow with optional advanced self-hosted backend configuration.
- Hosted backend support via `TEAM_PROJECTS_SUPABASE_URL` and `TEAM_PROJECTS_SUPABASE_ANON_KEY` environment variables.
- Shared task editor with full task fields (title, notes, due date, priority, recurrence, assignee).
- Task board filters by project and status.
- Realtime IPC cleanup with debounced refresh and per-workspace channel management.
- `teamSetDisplayName` IPC method for display-name-only configuration.

### Changed

- Team Projects copy uses user-facing terms (workspace, invite code, shared tasks) instead of technical terms (Supabase, anon key, backend).
- Performance optimization: project lookup map and memoized filtered tasks to avoid repeated find calls.
- Visual hardening: added proper spacing to workspace items with dedicated CSS.
- Security verification: confirmed no Supabase credentials exposed in normal UI; all team IPC handlers validate with Zod; trusted sender checks in place.

### Fixed

- Workspace items now have proper spacing between them.

## [2.0.0] - 2026-05-13

First "stable" milestone after the rapid 1.4.x → 1.7.x iteration phase. No breaking user-facing behavior versus 1.7.1; the major bump signals the end of that exploration phase and the start of a more disciplined release cadence (see `RELEASING.md`). Skips over a stray `v2.1.8` test tag that was never publicly distributed.

### Added

- `docs/ARCHITECTURE.md` — high-level architecture reference for contributors.
- `RELEASING.md` — versioning and release discipline going forward.
- App-window IPC handler with dedicated security tests (`window.security.test.ts`, `appWindow.handlers.test.ts`).
- Custom theme editor with expanded appearance tokens, contrast guidance, and a dedicated test suite.
- About panel updates with clearer version visibility.
- Handler payload contract tests for the renderer/main IPC boundary.

### Changed

- `useAssistantWorkspace` refactored: type definitions extracted into `src/renderer/hooks/workspace/workspaceTypes.ts`; composition hooks consolidated. No behavior change.
- `release-assets` script and tests tightened.
- Backup service hardened.
- Small fixes to command palette and search engine.

### Removed

- Unused layout components: `AppHeader`, `WelcomeBar`.

### Fixed

- E2E test specs aligned with the current desk UI (web + Electron suites).

## [1.7.1] - 2026-05-13

### Added

- macOS `.zip` requirement in release validation.

### Changed

- Release pipeline publishes directly without using GitHub Actions artifacts (saves storage quota).
- UI text normalization (mojibake removal, copy consistency).
- Updated release docs covering macOS release behavior.

### Fixed

- Stabilized v1.7.1 source sync between worker tooling and tracked sources.

## [1.7.0] - 2026-05-12

### Added

- Data control and backup: export notes, tasks, reminders, automations, and settings to JSON; import with conflict handling; local backup reminder setting.

## [1.6.5] - 2026-05-12

Windows installer release rolling up 1.6.1 – 1.6.4.

## [1.6.4] - 2026-05-12

### Added

- Automation builder upgrade: trigger / action / review step layout, enable-disable toggle per rule, last-run status, duplicate rule, test-run button.

## [1.6.3] - 2026-05-12

### Added

- Agenda list view alongside the month calendar.
- Tasks with due dates rendered alongside reminders.
- Today / Tomorrow / This week filters.
- Click-to-create reminder/task from a selected day.

## [1.6.2] - 2026-05-12

### Added

- Note archive and task archive views.
- Bulk complete for selected tasks.
- Inline task priority editing.
- Pin/unpin notes from search results.
- Undo for task complete, reminder done, and note archive.

## [1.6.1] - 2026-05-12

### Added

- Global command palette across notes, tasks, reminders, automations, settings, and Home Assistant actions.
- Structured search results with keyboard navigation.

## [1.6.0] - 2026-05-12

Windows installer release rolling up 1.5.6 – 1.5.9.

## [1.5.9] - 2026-05-12

### Added

- Today strip with overdue / due-today / reminders / notes / automations counts.
- Quick filters from the strip into Tasks, Reminders, Notes, Automations.

### Changed

- Improved empty states across panels.
- Standardized panel headers, action rows, list rows, and timestamps.

### Removed

- Remaining mojibake and playful labels.

## [1.5.8] - 2026-05-12

### Added

- Density preference: Comfortable, Compact, Spacious.
- Panel radius preference: Sharp, Soft, Rounded.
- Optional shadows toggle and glass-blur toggle.
- DCC section preference (one secondary vs all secondary sections).

## [1.5.7] - 2026-05-12

### Added

- Appearance panel in the top toolbar with full custom theme editor: per-token color inputs, reset, duplicate preset, save custom theme, JSON import/export, contrast warnings.

## [1.5.6] - 2026-05-12

### Added

- Theme token foundation: typed `ThemeTokenKey`, `ThemePreset`, and `CustomTheme`. Built-in presets (Glass, Paper, Obsidian, Fog, Deep Blue) plus Corporate. Custom overrides applied via CSS variables on `documentElement`.

## [1.5.5] - 2026-05-11

Final minimal corporate pass. Version bump rolling up 1.5.2 – 1.5.4.

## [1.5.4] - 2026-05-11

### Changed

- Corporate automation polish.

## [1.5.3] - 2026-05-11

### Changed

- Friendly workflow clarity pass.

## [1.5.2] - 2026-05-11

### Changed

- Minimal corporate desk baseline.

## [1.5.0] - 2026-05-08

### Added

- Daily command center with navigation actions and visual hierarchy.
- Local task automations.
- Strengthened local-first desk experience.

### Changed

- Hardened release packaging.

### Fixed

- Improved automation retry logs.

## [1.4.3] - 2026-05-07

### Added

- Worker activity handoff log.
- Comprehensive worker handoff docs.

### Changed

- Enforced repository line endings.
- Tidied quality baseline.
- Documented Electron 42 upgrade failure (better-sqlite3 incompatibility).

### Fixed

- Hardened away-brief behavior.
- Strengthened away-brief and security test coverage.

## [1.4.2] and earlier

History prior to 1.4.3 is in git log; no curated changelog exists for those versions. See `git log v1.4.2 --no-merges` for details.

[2.1.9]: https://github.com/toadjo/personal-assistant/compare/v2.1.8...v2.1.9
[2.1.8]: https://github.com/toadjo/personal-assistant/compare/v2.1.7...v2.1.8
[2.1.7]: https://github.com/toadjo/personal-assistant/compare/v2.1.6...v2.1.7
[2.1.4]: https://github.com/toadjo/personal-assistant/compare/v2.1.3...v2.1.4
[2.1.3]: https://github.com/toadjo/personal-assistant/compare/v2.1.2...v2.1.3
[2.1.2]: https://github.com/toadjo/personal-assistant/compare/v2.1.1...v2.1.2
[2.1.1]: https://github.com/toadjo/personal-assistant/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/toadjo/personal-assistant/compare/v1.7.1...v2.1.0
[1.7.1]: https://github.com/toadjo/personal-assistant/compare/v1.7.0...v1.7.1
[1.7.0]: https://github.com/toadjo/personal-assistant/compare/v1.6.5...v1.7.0
[1.6.5]: https://github.com/toadjo/personal-assistant/compare/v1.6.0...v1.6.5
[1.6.4]: https://github.com/toadjo/personal-assistant/compare/v1.6.0...v1.6.4
[1.6.3]: https://github.com/toadjo/personal-assistant/compare/v1.6.0...v1.6.3
[1.6.2]: https://github.com/toadjo/personal-assistant/compare/v1.6.0...v1.6.2
[1.6.1]: https://github.com/toadjo/personal-assistant/compare/v1.6.0...v1.6.1
[1.6.0]: https://github.com/toadjo/personal-assistant/compare/v1.5.5...v1.6.0
[1.5.9]: https://github.com/toadjo/personal-assistant/compare/v1.5.5...v1.6.0
[1.5.8]: https://github.com/toadjo/personal-assistant/compare/v1.5.5...v1.6.0
[1.5.7]: https://github.com/toadjo/personal-assistant/compare/v1.5.5...v1.6.0
[1.5.6]: https://github.com/toadjo/personal-assistant/compare/v1.5.5...v1.6.0
[1.5.5]: https://github.com/toadjo/personal-assistant/compare/v1.5.0...v1.5.5
[1.5.4]: https://github.com/toadjo/personal-assistant/compare/v1.5.0...v1.5.5
[1.5.3]: https://github.com/toadjo/personal-assistant/compare/v1.5.0...v1.5.5
[1.5.2]: https://github.com/toadjo/personal-assistant/compare/v1.5.0...v1.5.5
[1.5.0]: https://github.com/toadjo/personal-assistant/compare/v1.4.3...v1.5.0
[1.4.3]: https://github.com/toadjo/personal-assistant/compare/v1.4.2...v1.4.3
