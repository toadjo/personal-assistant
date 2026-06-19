import type { IpcMainInvokeEvent } from "electron";
import type { Migration } from "../../db/migrations/registry";
import type { BackupModule } from "../backup/types";

/**
 * A life-area module bundles all the wiring for a domain (finance, car, family, health, hobbies):
 * - Migrations for schema changes
 * - Backup module for export/import
 * - IPC handler registration
 *
 * This allows adding a new life area in one manifest plus its own files.
 */
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
