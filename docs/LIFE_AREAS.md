# Life-Area Module SDK

This document describes the life-area module system, which allows adding a new life area (like Finance, Car, Family, Health, Hobbies) in one manifest plus its own files.

## Overview

A life-area module bundles all the wiring for a domain:
- **Migrations** for schema changes
- **Backup module** for export/import
- **IPC handler registration** for renderer communication

This collapses what used to be 5 separate registration points into a single manifest object.

## Module Interface

```typescript
export interface LifeAreaModule {
  /** Unique identifier for the life area (e.g., "finance", "car") */
  readonly id: string;

  /** Display name for UI (e.g., "Finance", "Car Maintenance") */
  readonly displayName: string;

  /** Database migrations for this life area */
  readonly migrations: readonly Migration[];

  /** Backup module for export/import of this life area's data */
  readonly backupModule: BackupModule;

  /**
   * Register IPC handlers for this life area.
   * Called during app startup with the trusted window assertion function.
   */
  registerHandlers(assertSender: (event: IpcMainInvokeEvent) => void): void;
}
```

## Adding a New Life Area

### Step 1: Create the manifest

Create a new file in `src/main/services/lifeAreas/`:

```typescript
// src/main/services/lifeAreas/yourArea.module.ts
import type { IpcMainInvokeEvent } from "electron";
import { migration as yourAreaMigration } from "../../db/migrations/012_your_area";
import { yourAreaModule } from "../backup/modules/yourArea";
import { registerYourAreaHandlers } from "../../ipc/handlers/yourArea.handlers";
import type { LifeAreaModule } from "./types";

export const yourAreaLifeArea: LifeAreaModule = {
  id: "yourArea",
  displayName: "Your Area",
  migrations: [
    {
      version: 12,
      name: "your_area",
      up: yourAreaMigration.up,
      down: yourAreaMigration.down
    }
  ],
  backupModule: yourAreaModule,
  registerHandlers: registerYourAreaHandlers
};
```

### Step 2: Register the module

Add your module to the registry in `src/main/services/lifeAreas/registry.ts`:

```typescript
import { yourAreaLifeArea } from "./yourArea.module";

export const LIFE_AREAS: readonly LifeAreaModule[] = [
  financeLifeArea,
  carLifeArea,
  familyLifeArea,
  healthLifeArea,
  hobbiesLifeArea,
  yourAreaLifeArea
];
```

### Step 3: Wire the backup module

Add your backup module to the registry in `src/main/services/backup/registry.ts`:

```typescript
import { yourAreaLifeArea } from "../lifeAreas/yourArea.module";

export const BACKUP_MODULES: readonly BackupModule[] = [
  notesModule,
  remindersModule,
  tasksModule,
  automationModule,
  financeLifeArea.backupModule,
  carLifeArea.backupModule,
  familyLifeArea.backupModule,
  healthLifeArea.backupModule,
  hobbiesLifeArea.backupModule,
  yourAreaLifeArea.backupModule,
  connectedCalendarModule,
  settingsModule
];
```

### Step 4: Create the required files

You'll need to create the following files (following existing patterns):

1. **Migration**: `src/main/db/migrations/012_your_area.ts`
   - Define your schema with `up` and optional `down` functions
   - Follow the versioning sequence (next available number)

2. **Backup module**: `src/main/services/backup/modules/yourArea.ts`
   - Implement `BackupModule` interface
   - Define `payloadKeys` for your data tables
   - Implement `exportData`, `ensureDefaults`, `deleteAll`, `importData`, `previewSection`

3. **IPC handlers**: `src/main/ipc/handlers/yourArea.handlers.ts`
   - Export a `registerYourAreaHandlers(assertSender)` function
   - Use `registerInvoke` for each IPC channel
   - Add Zod schemas for validation in `src/main/ipc/handlers/schemas.ts`

4. **IPC channels**: Add your channels to `src/shared/ipc-channels.ts`
   - Add to `IpcInvoke` object (channel name)
   - Add to `IpcInvokeMethodNames` object (method name for preload)

5. **Renderer panel**: Create UI in `src/renderer/components/panels/YourAreaPanel.tsx`
   - Follow existing panel patterns
   - Use shared components from `src/renderer/components/life-areas/`

6. **Renderer nav**: Add to `PersonalModule` union in `src/renderer/hooks/shell/useShellNav.ts`
   - Add your module ID to the union type
   - Wire up panel switching in the shell

## Existing Life Areas

The following life areas are already implemented as modules:

- **Finance** (`finance.module.ts`) - Bills, expenses, monthly summary
- **Car** (`car.module.ts`) - Vehicles, fuel, maintenance, recurring bills, mileage, service reminders
- **Family** (`family.module.ts`) - Members, occasions, obligations
- **Health** (`health.module.ts`) - Appointments, medications, symptoms, measurements, obligations
- **Hobbies** (`hobbies.module.ts`) - Hobbies, sessions, projects, milestones, supplies

## Testing

The registry includes tests to ensure:
- Unique IDs across all life areas
- Unique display names
- Each life area has migrations, backup module, and handlers
- Backup payload keys are unique
- Migration versions are unique

Run the registry tests:

```bash
npm test -- src/main/services/lifeAreas/registry.test.ts
```

## Notes

- **Migrations** are still registered in `src/main/db/migrations/registry.ts` directly to avoid circular dependencies
- **Backup modules** are composed via the life-area registry in `src/main/services/backup/registry.ts`
- **IPC handlers** are registered via the life-area registry in `src/main/ipc/register-handlers.ts`
- This is a main-process only system; renderer panel/nav registration is separate (follow-up work)
