# Life Areas Module Guide

This guide explains how to add a new Life Area module to Personal Assistant. Life Areas are domain-specific panels (Finance, Car, Family, Health, Hobbies) that track personal data with CRUD operations.

## Architecture Overview

Life Areas follow a consistent pattern:

1. **Database Layer**: Migration file with tables and cascade delete support
2. **Service Layer**: Business logic in `src/main/services/[area].ts`
3. **IPC Layer**: Handlers in `src/main/ipc/handlers/[area].handlers.ts`
4. **Type Layer**: Shared types in `src/shared/types.ts`
5. **IPC Channels**: Channel definitions in `src/shared/ipc-channels.ts`
6. **UI Layer**: Panel component in `src/renderer/components/panels/[Area]Panel.tsx`
7. **API Layer**: Typed API wrapper in `src/renderer/lib/assistantApi.ts`
8. **Backup Integration**: Export/import/preview/reset support in `src/main/services/backup.ts`

## Adding a New Life Area

### Step 1: Database Migration

Create a migration file in `src/main/db/migrations/`:

```typescript
// src/main/db/migrations/011_[area].ts
import { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // Create main entity table
  await db.schema
    .createTable("[area]_entities")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("status", "text", (col) => col.notNull())
    .addColumn("created_at", "text", (col) => col.notNull())
    .addColumn("updated_at", "text", (col) => col.notNull())
    .execute();

  // Create related entity tables with foreign keys
  await db.schema
    .createTable("[area]_related")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("entity_id", "text", (col) => col.notNull())
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("created_at", "text", (col) => col.notNull())
    .addColumn("updated_at", "text", (col) => col.notNull())
    .addForeignKeyConstraint("fk_entity", ["entity_id"], "[area]_entities", ["id"], (cb) => cb.onDelete("cascade"))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("[area]_related").execute();
  await db.schema.dropTable("[area]_entities").execute();
}
```

**Important**: Use cascade delete for related tables to ensure data integrity.

### Step 2: Register Migration

Add to `src/main/db/migrations/registry.ts`:

```typescript
import migration011 from "./011_[area]";

const migrations = {
  // ... existing migrations
  11: migration011
};
```

### Step 3: Add Types

Add types to `src/shared/types.ts`:

```typescript
export type [Area]Entity = {
  id: string;
  name: string;
  description: string | null;
  status: '[Area]Status';
  created_at: string;
  updated_at: string;
};

export type [Area]Related = {
  id: string;
  entity_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type [Area]Status = 'active' | 'inactive';

export type [Area]Summary = {
  totalEntities: number;
  activeEntities: number;
  relatedCount: number;
};
```

### Step 4: Add IPC Channels

Add channels to `src/shared/ipc-channels.ts`:

```typescript
// Main entity CRUD
list[Area]Entities: invokeChannel('[Area]Entity[]'),
create[Area]Entity: invokeChannel('[Area]Entity', Omit<[Area]Entity, 'id' | 'created_at' | 'updated_at'>),
update[Area]Entity: invokeChannel('[Area]Entity', [Area]Entity),
delete[Area]Entity: invokeChannel('void', string),

// Related entity CRUD
list[Area]Related: invokeChannel('[Area]Related[]', string), // entity_id
create[Area]Related: invokeChannel('[Area]Related', Omit<[Area]Related, 'id' | 'created_at' | 'updated_at'>),
update[Area]Related: invokeChannel('[Area]Related', [Area]Related),
delete[Area]Related: invokeChannel('void', string),

// Summary
get[Area]Summary: invokeChannel('[Area]Summary'),
```

### Step 5: Create Service Layer

Create `src/main/services/[area].ts`:

```typescript
import { db } from './db';
import type { [Area]Entity, [Area]Related, [Area]Summary } from '../../shared/types';

export function list[Area]Entities(): [Area]Entity[] {
  return db.selectFrom('[area]_entities')
    .selectAll()
    .orderBy('created_at', 'desc')
    .execute();
}

export function create[Area]Entity(data: Omit<[Area]Entity, 'id' | 'created_at' | 'updated_at'>): [Area]Entity {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const entity = {
    ...data,
    id,
    created_at: now,
    updated_at: now,
  };
  db.insertInto('[area]_entities')
    .values(entity)
    .execute();
  return entity;
}

export function update[Area]Entity(data: [Area]Entity): [Area]Entity {
  const updated = {
    ...data,
    updated_at: new Date().toISOString(),
  };
  db.updateTable('[area]_entities')
    .set(updated)
    .where('id', '=', data.id)
    .execute();
  return updated;
}

export function delete[Area]Entity(id: string): void {
  db.deleteFrom('[area]_entities')
    .where('id', '=', id)
    .execute();
}

// Similar functions for related entities...

export function get[Area]Summary(): [Area]Summary {
  const entities = list[Area]Entities();
  const active = entities.filter(e => e.status === 'active').length;
  const related = db.selectFrom('[area]_related')
    .selectAll()
    .execute();

  return {
    totalEntities: entities.length,
    activeEntities: active,
    relatedCount: related.length,
  };
}
```

### Step 6: Create IPC Handlers

Create `src/main/ipc/handlers/[area].handlers.ts`:

```typescript
import { registerHandler } from '../register-handlers';
import * as [Area]Service from '../../services/[area]';
import type { [Area]Entity, [Area]Related, [Area]Summary } from '../../../shared/types';

registerHandler('list[Area]Entities', () => [Area]Service.list[Area]Entities());
registerHandler('create[Area]Entity', (data) => [Area]Service.create[Area]Entity(data));
registerHandler('update[Area]Entity', (data) => [Area]Service.update[Area]Entity(data));
registerHandler('delete[Area]Entity', (id) => [Area]Service.delete[Area]Entity(id));

// Similar handlers for related entities...

registerHandler('get[Area]Summary', () => [Area]Service.get[Area]Summary());
```

### Step 7: Register Handlers

Add to `src/main/ipc/register-handlers.ts`:

```typescript
import "./handlers/[area].handlers";
```

### Step 8: Add API Types

Add to `src/renderer/lib/assistantApi.ts`:

```typescript
export interface AssistantApi {
  // Main entity
  list[Area]Entities: () => Promise<[Area]Entity[]>;
  create[Area]Entity: (data: Omit<[Area]Entity, 'id' | 'created_at' | 'updated_at'>) => Promise<[Area]Entity>;
  update[Area]Entity: (data: [Area]Entity) => Promise<[Area]Entity>;
  delete[Area]Entity: (id: string) => Promise<void>;

  // Related entity
  list[Area]Related: (entityId: string) => Promise<[Area]Related[]>;
  create[Area]Related: (data: Omit<[Area]Related, 'id' | 'created_at' | 'updated_at'>) => Promise<[Area]Related>;
  update[Area]Related: (data: [Area]Related) => Promise<[Area]Related>;
  delete[Area]Related: (id: string) => Promise<void>;

  // Summary
  get[Area]Summary: () => Promise<[Area]Summary>;
}
```

Add to `src/renderer/vite-env.d.ts`:

```typescript
interface Window {
  assistantApi: AssistantApi;
}
```

### Step 9: Create Panel Component

Create `src/renderer/components/panels/[Area]Panel.tsx`:

```typescript
import { useState, useEffect, memo } from "react";
import { IconName, Plus, Trash2 } from "lucide-react";
import { PanelHeader } from "../ui/PanelHeader";
import { EmptyState } from "../ui/EmptyState";
import { LoadingState } from "../life-areas/LoadingState";
import { SummaryCard } from "../life-areas/SummaryCard";
import { LifeAreaPanelProps } from "../life-areas/types";
import { formatDate } from "../../lib/dateFormat";
import { requireAssistantApi } from "../../lib/assistantApi";
import type { [Area]Entity, [Area]Related, [Area]Summary } from "../../../shared/types";

export const [Area]Panel = memo(function [Area]Panel({
  isRefreshing: _isRefreshing,
  onRefresh: _onRefresh,
  onError,
  onShowSuccess
}: LifeAreaPanelProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [entities, setEntities] = useState<[Area]Entity[]>([]);
  const [related, setRelated] = useState<[Area]Related[]>([]);
  const [summary, setSummary] = useState<[Area]Summary | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "active" as const
  });

  const api = requireAssistantApi();

  async function loadData() {
    setIsLoading(true);
    try {
      const [entitiesData, relatedData, summaryData] = await Promise.all([
        api.list[Area]Entities(),
        api.list[Area]Related("default"), // or appropriate entity_id
        api.get[Area]Summary()
      ]);
      setEntities(entitiesData);
      setRelated(relatedData);
      setSummary(summaryData);
    } catch {
      onError("Failed to load [area] data");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleCreate() {
    try {
      await api.create[Area]Entity(form);
      setShowForm(false);
      setForm({ name: "", description: "", status: "active" });
      onShowSuccess?.("[Area] created");
      await loadData();
    } catch {
      onError("Failed to create [area]");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this [area]?")) return;
    try {
      await api.delete[Area]Entity(id);
      onShowSuccess?.("[Area] deleted");
      await loadData();
    } catch {
      onError("Failed to delete [area]");
    }
  }

  if (isLoading) {
    return <LoadingState message="Loading [area] data..." />;
  }

  return (
    <section className="panel" aria-labelledby="[area]-panel-heading">
      <PanelHeader
        icon={IconName}
        title="[Area]"
        actions={
          <div className="panelActions">
            <button
              type="button"
              className="iconButton"
              aria-label="Add [area]"
              onClick={() => setShowForm(true)}
            >
              <Plus size={16} />
            </button>
          </div>
        }
      />

      <div className="panelContent">
        {entities.length === 0 ? (
          <EmptyState
            icon={IconName}
            title="No [area] yet"
            description="Start tracking your [area] data"
          />
        ) : (
          <>
            {/* Summary Cards */}
            {summary && (
              <div className="summaryGrid">
                <SummaryCard label="Total" value={summary.totalEntities} />
                <SummaryCard label="Active" value={summary.activeEntities} />
                <SummaryCard label="Related" value={summary.relatedCount} />
              </div>
            )}

            {/* Entity List */}
            <div className="sectionHeader">
              <h3>[Area] Entities</h3>
            </div>
            <div className="list">
              {entities.map((entity) => (
                <div key={entity.id} className="listItem">
                  <div className="listItemContent">
                    <div className="listItemTitle">{entity.name}</div>
                    <div className="listItemSubtitle">{entity.status}</div>
                    {entity.description && (
                      <div className="listItemDescription">{entity.description}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(entity.id)}
                    className="btn btn-sm btn-danger"
                    aria-label="Delete [area]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Form */}
            {showForm && (
              <div className="formPanel">
                <h3>Add [Area]</h3>
                <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }}>
                  <div className="formRow">
                    <label>
                      Name
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                      />
                    </label>
                  </div>
                  <div className="formRow">
                    <label>
                      Description
                      <textarea
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                      />
                    </label>
                  </div>
                  <div className="formActions">
                    <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Create
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
});
```

### Step 10: Add to Navigation

Add to `src/renderer/components/AssistantShell.tsx`:

```typescript
import { [Area]Panel } from "./panels/[Area]Panel";

// Add to the navigation tabs
const tabs = [
  // ... existing tabs
  { id: "[area]", label: "[Area]", icon: IconName, component: [Area]Panel },
];
```

### Step 11: Backup Integration

Add to `src/main/services/backup.ts`:

```typescript
// In exportData function
const [area]Entities = db.selectFrom('[area]_entities').selectAll().execute();
const [area]Related = db.selectFrom('[area]_related').selectAll().execute();

return {
  // ... existing fields
  [area]_entities: [area]Entities,
  [area]_related: [area]Related,
};

// In importData function
if (data.[area]_entities) {
  for (const entity of data.[area]_entities) {
    db.insertInto('[area]_entities').values(entity).execute();
  }
}
if (data.[area]_related) {
  for (const item of data.[area]_related) {
    db.insertInto('[area]_related').values(item).execute();
  }
}

// In previewBackup function
const [area]Entities = db.selectFrom('[area]_entities').selectAll().execute();
const [area]Related = db.selectFrom('[area]_related').selectAll().execute();

return {
  // ... existing counts
  [area]_entities: [area]Entities.length,
  [area]_related: [area]Related.length,
};

// In resetAllData function
db.deleteFrom('[area]_related').execute();
db.deleteFrom('[area]_entities').execute();
```

### Step 12: Update Backup UI

Add to `src/renderer/hooks/workspace/useBackupActions.ts`:

```typescript
export type BackupResult = {
  // ... existing fields
  [area]_entities: number;
  [area]_related: number;
};

export type BackupPreviewResult = {
  // ... existing fields
  [area]_entities: number;
  [area]_related: number;
};
```

Add to `src/renderer/lib/assistantApi.ts`:

```typescript
export interface AssistantApi {
  exportData: () => Promise<BackupResult>;
  importData: (data: any) => Promise<BackupResult>;
  previewImportData: (data: any) => Promise<BackupPreviewResult>;
}
```

Add to `src/renderer/vite-env.d.ts`:

```typescript
interface Window {
  assistantApi: AssistantApi;
}
```

### Step 13: Add Tests

Create service tests in `src/main/services/[area].test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createMemoryDatabase } from '../test/memoryDb';
import * as [Area]Service from './[area]';

describe('[Area] Service', () => {
  beforeEach(() => {
    const db = createMemoryDatabase();
    // Run migration
  });

  it('should list entities', () => {
    const entities = [Area]Service.list[Area]Entities();
    expect(entities).toEqual([]);
  });

  it('should create entity', () => {
    const entity = [Area]Service.create[Area]Entity({
      name: "Test",
      description: "Test description",
      status: "active"
    });
    expect(entity.id).toBeDefined();
    expect(entity.name).toBe("Test");
  });

  // Add more tests...
});
```

Create panel tests in `src/renderer/components/panels/[Area]Panel.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import { [Area]Panel } from "./[Area]Panel";

describe("[Area]Panel", () => {
  const defaultProps = {
    isRefreshing: false,
    onRefresh: vi.fn(),
    onError: vi.fn(),
    onShowSuccess: vi.fn()
  };

  it("renders empty state when no data", async () => {
    render(<[Area]Panel {...defaultProps} />);
    // Add assertions
  });

  // Add more tests...
});
```

### Step 14: Update Handler Payload Contract Tests

Add to `src/main/ipc/handlers/handler-payload-contract.test.ts`:

```typescript
// Add to ZERO_ARG_INVOKE_CHANNELS
'list[Area]Entities',
'get[Area]Summary',

// Add schema imports
import type { [Area]Entity, [Area]Related, [Area]Summary } from '../../../shared/types';

// Add schema validation tests
it('validates [Area]Entity schema', () => {
  // Add test
});
```

## Shared Patterns

### Date Formatting

Use the shared date formatting utilities:

```typescript
import { formatDate, formatDateTime, formatEur, formatMileage } from "../../lib/dateFormat";
```

### Loading State

Use the shared LoadingState component:

```typescript
import { LoadingState } from "../life-areas/LoadingState";

if (isLoading) {
  return <LoadingState message="Loading data..." />;
}
```

### Summary Cards

Use the shared SummaryCard component:

```typescript
import { SummaryCard } from "../life-areas/SummaryCard";

<SummaryCard label="Total" value={summary.total} />
```

### Panel Props

Use the shared LifeAreaPanelProps type:

```typescript
import { LifeAreaPanelProps } from "../life-areas/types";

export const [Area]Panel = memo(function [Area]Panel(
  props: LifeAreaPanelProps
): JSX.Element {
  // ...
});
```

## Best Practices

1. **Cascade Delete**: Always use cascade delete for related tables to ensure data integrity
2. **Type Safety**: Use TypeScript types consistently across all layers
3. **Error Handling**: Provide clear error messages in UI components
4. **Loading States**: Show loading states during data fetching
5. **Empty States**: Show helpful empty states when no data exists
6. **Backup Support**: Always include backup integration for new life areas
7. **Test Coverage**: Write comprehensive tests for service layer and UI components
8. **Accessibility**: Use proper ARIA labels and semantic HTML
9. **Performance**: Use memo() for panel components to prevent unnecessary re-renders
10. **Consistency**: Follow existing patterns for naming, structure, and UI

## Migration Checklist

- [ ] Create migration file with proper up/down functions
- [ ] Register migration in registry
- [ ] Add types to shared/types.ts
- [ ] Add IPC channels to ipc-channels.ts
- [ ] Create service layer with CRUD operations
- [ ] Create IPC handlers
- [ ] Register handlers in register-handlers.ts
- [ ] Add API types to assistantApi.ts
- [ ] Add Window interface to vite-env.d.ts
- [ ] Create panel component
- [ ] Add to navigation in AssistantShell
- [ ] Integrate with backup system
- [ ] Update backup UI types
- [ ] Write service tests
- [ ] Write panel tests
- [ ] Update handler-payload-contract tests
- [ ] Run full test suite
- [ ] Test backup export/import
- [ ] Update CHANGELOG.md
