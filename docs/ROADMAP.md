# Personal OS Roadmap

This roadmap is forward-looking only. Completed work belongs in [CHANGELOG.md](../CHANGELOG.md), release notes, and git history.

Personal OS is aiming to become a local-first daily operating layer: one place to capture, plan, review, remember, and recover across work and real life without handing all of that context to a cloud account by default.

## North Star

Build a free community desktop app that people can run locally, inspect, fork, and adapt. It should feel useful on day one, trustworthy enough for personal data, and flexible enough that new life areas can be added without turning the app into a pile of one-off panels.

Final boss goal: friendly AI takeover of your tasks, calendar, chores, reminders, notes, and general life chaos through this app. World domination remains a stretch goal. Mostly joking.

## Phase C: UX And Accessibility

Goal: make the app feel polished, keyboard-safe, and reliable for repeated daily use.

- ~~Resolve remaining ProjectsPanel color contrast violation via accessible state color tokens ([#34](https://github.com/toadjo/personal-assistant/issues/34)).~~
- ~~Add focus-return E2E coverage for Command Palette and Quick Capture ([#35](https://github.com/toadjo/personal-assistant/issues/35)).~~
- ~~Move themes toward a JSON-backed system with user-authored themes and `prefers-color-scheme` defaults.~~
- ~~Refactor onboarding into one persisted flow with clear skip points and restart support. Consolidated three localStorage keys into a single `assistant-onboarding` key with one-time migration, merged `OnboardingCoach` + `OnboardingPanel` into `OnboardingFlow`, deleted dead `GuidedOnboardingPanel`, and centralized all dismissal/skip/defer/restart logic in `useOnboardingProgress`.~~

Acceptance signal:

- axe reports zero serious or critical issues on covered panels.
- Modal and drawer focus always returns to the trigger.
- Theme switching works without reload.

## Phase D: Reliability And Local Trust

Goal: make Personal OS safe enough to trust as a daily-driver tool.

- ~~Add renderer breadcrumbs to Sentry, gated by `allowCrashReporting`.~~
- ~~Add automatic local backups with rolling daily and weekly retention.~~
- ~~Add disk-space checks before backup writes.~~
- ~~Ship encrypted backup format for users who want portable encrypted archives.~~
- ~~Expose database health metrics in diagnostics.~~
- ~~Suggest `VACUUM` or optimize after meaningful write thresholds.~~
- Restore validated macOS and Linux release assets once packaging is reliable. (Cross-platform CI jobs landed in v3.9.1; publishing validated non-Windows assets remains open.)

Acceptance signal:

- Encrypted backup round-trips into a fresh install.
- Database health issues are visible to the user before data loss.
- At least one non-Windows release asset is published after validation.

## Phase E: New Capabilities

Goal: move from a personal assistant app toward a real Personal OS.

- ~~Build a plugin/module SDK for life areas: schema migration, IPC registration, panel registration, and backup registration from one manifest.~~
- ~~Add Outlook / Microsoft 365 calendar provider parity.~~
- Upgrade AI commands from prompt-template parsing to structured tool-calling against existing IPC handlers.
- Keep the preview-then-confirm pattern for AI-created changes.
- Explore encrypted optional sync using the existing Supabase infrastructure.
- Add a read-only mobile companion path for capture-on-phone and sort-on-desktop workflows.
- Add a local LLM option through Ollama or llama.cpp when outbound AI is disabled.

Acceptance signal:

- ~~A new life area can be added in one PR with a manifest plus its own files.~~
- ~~Outlook events appear beside Google events in the unified Calendar.~~
- An Ask command can create a reminder through tool-calling without regex parsing.

## Phase F: Community And Quality Bar

Goal: keep the project welcoming and hard to accidentally break as more people touch it.

- ~~Add performance budgets in CI for renderer bundle size and panel mount time.~~
- ~~Pilot mutation testing on `src/main/services/*`.~~
- ~~Add visual regression snapshots for Daily Command Center and Calendar.~~
- ~~Group Dependabot PRs and fast-track security updates.~~
- ~~Document good first issues and contributor-friendly module examples.~~
- ~~Add issue templates for bugs, feature ideas, accessibility reports, and security disclosures.~~
- Keep README focused on purpose, install, workflow, and contribution entry points.

Acceptance signal:

- New contributors can find a small issue, run the app, and make a safe first change.
- Visual and performance regressions fail before release.
- Security updates have a documented fast path.

## How To Use This Roadmap

- Treat each phase as a future release theme, not a promise of exact version timing.
- Move items into GitHub issues when they become active work.
- Keep completed work out of this file and record it in the changelog instead.
- Revisit this roadmap after each release so it stays honest and useful.

## Maintenance Notes

**Phase B (Completed in v3.7.0)**: Renderer data layer migrated to TanStack Query with optimistic mutations and panel crash isolation. See commit `175792c` and CHANGELOG.md for details.

**v3.8.0 accessibility and reliability foundation**: Axe E2E checks, keyboard smoke coverage, focus-stack manager, Command Palette ranking upgrades, initial axe fixes, disk-space pre-check for backup exports, VACUUM/optimize suggestion prompts, encrypted backup format, Sentry breadcrumb filtering, and the life-area module SDK all shipped in v3.8.0. See commit `6016aef` and CHANGELOG.md for details.

**v3.9.0 cleanup and performance**: Deprecated OAuth re-exports removed, Outlook/Microsoft 365 calendar parity confirmed (Phase E acceptance signal met), life-area panels lazy-loaded with code-splitting (main bundle reduced 38%), `registerValidated` IPC helper added. See CHANGELOG.md for details.

**v3.9.1 cross-platform CI**: macOS CI job added alongside existing Windows and Linux verify jobs, enabling validation of future non-Windows release assets (Phase D acceptance signal partially met).

**Phase C remaining work**: Phase C is complete. All items shipped: ProjectsPanel contrast (#34), focus-return E2E (#35), JSON-backed themes, and the onboarding consolidation.

**Phase D reliability work**: Renderer Sentry gated behind `allowCrashReporting` policy with user-action breadcrumbs (#43). Automatic local backups with rolling daily/weekly retention, encrypted snapshots written to `userData/backups/`, scheduler with disk-space and policy guards (#44). Disk-space pre-check, encrypted backup format, DB health diagnostics, and VACUUM/optimize prompts all shipped in v3.8.0. Only remaining item is publishing validated non-Windows release assets (release-process work for the next release).

**Non-blocking cleanup**: React `act(...)` warnings in async error-path tests remain as a low-priority maintenance item. These do not block Phase C work.
