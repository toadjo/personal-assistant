# Linux AppImage Testing Checklist

## Purpose

Repeatable checklist for testing Linux AppImage packages after Inbox drawer polish changes (PR #32 and #33). This ensures packaged-app behavior matches local development verification.

## Pre-Test Setup

1. **Download AppImage**
   - Obtain the latest `.AppImage` file from the release assets
   - Make it executable: `chmod +x PersonalAssistant-*.AppImage`
   - Verify file integrity with SHA256 checksum if available

2. **Clean Test Environment**
   - Close any running Personal Assistant instances
   - Backup existing data directory if preserving state is needed
   - Optionally test with fresh data directory by moving `~/.config/PersonalAssistant` aside

## Core Functionality Tests

### Inbox Drawer Polish (PR #33)

#### Local Task Editing in Drawer

- [ ] Open Inbox module
- [ ] Click on a local task to open drawer
- [ ] Click Edit button
- [ ] Verify all fields are preloaded correctly:
  - [ ] Title field shows current task title
  - [ ] Notes field shows current task notes
  - [ ] Due Date field shows current due date (if set)
  - [ ] Priority field shows current priority
  - [ ] Recurrence field shows current recurrence
- [ ] Modify title and save
- [ ] **Verify**: Drawer detail refreshes immediately after save (no stale content)
- [ ] **Verify**: Drawer stays open after saving local task
- [ ] Close drawer and reopen the same task
- [ ] **Verify**: Edit form shows the updated values (not stale data)

#### Validation: Recurring Tasks Require Due Date

- [ ] Open a local task in drawer
- [ ] Click Edit
- [ ] Set Recurrence to "daily" or "weekly"
- [ ] Clear Due Date field
- [ ] Click Save
- [ ] **Verify**: Validation error appears ("Recurring tasks require a due date")
- [ ] **Verify**: Task is not saved
- [ ] Set a due date and save
- [ ] **Verify**: Save succeeds

#### Inline Inbox Actions

- [ ] Open Inbox module
- [ ] Navigate to "All Items" section
- [ ] **Verify**: Complete button appears for open tasks
- [ ] Click complete button on a task
- [ ] **Verify**: Task is marked as completed
- [ ] **Verify**: Task moves to completed state or disappears from open list
- [ ] **Verify**: Delete button appears for tasks
- [ ] Click delete button on a task
- [ ] **Verify**: Task is removed from the list
- [ ] Navigate to "Needs Sorting" section
- [ ] **Verify**: Convert to Task button appears for notes
- [ ] Click convert button on a note
- [ ] **Verify**: Note is converted to task

#### Drawer Content Refresh (Critical Regression Test)

- [ ] Open a local task in drawer
- [ ] Make a change (e.g., edit title) and save
- [ ] **Verify**: Drawer content updates immediately to show new title
- [ ] Do not close drawer
- [ ] Make another change and save
- [ ] **Verify**: Drawer content updates again
- [ ] **Verify**: No stale content remains visible

### Team Task Editing (PR #32)

#### Team Task Drawer

- [ ] Configure Team Projects (if not already configured)
- [ ] Open Inbox module
- [ ] Click on a team task to open drawer
- [ ] **Verify**: Project name is displayed in metadata
- [ ] **Verify**: Assignee display name is shown
- [ ] Click Edit button
- [ ] **Verify**: All team task fields are preloaded:
  - [ ] Title
  - [ ] Notes
  - [ ] Due Date
  - [ ] Priority
  - [ ] Recurrence
  - [ ] Assignee
  - [ ] Status
- [ ] Modify fields and save
- [ ] **Verify**: Changes persist
- [ ] **Verify**: Drawer closes after save (team task behavior differs from local)

#### Team Task Complete/Reopen

- [ ] Open an open team task in drawer
- [ ] **Verify**: Complete button is visible
- [ ] Click complete button
- [ ] **Verify**: Task status changes to "done"
- [ ] **Verify**: Drawer closes
- [ ] Reopen the same task
- [ ] **Verify**: Reopen button is now visible
- [ ] Click reopen button
- [ ] **Verify**: Task status changes to "open"
- [ ] **Verify**: Drawer closes

## Cross-Feature Verification

### Daily Command Center Integration

- [ ] Open Home or Today module
- [ ] Click on a task in Daily Command Center
- [ ] **Verify**: Drawer opens with correct task
- [ ] Edit and save the task
- [ ] **Verify**: DCC reflects the changes (may require refresh)

### Command Palette Integration

- [ ] Open command palette (Ctrl+K)
- [ ] Search for a task
- [ ] Select and open the task
- [ ] **Verify**: Drawer opens with correct task
- [ ] Edit and save
- [ ] **Verify**: Changes are reflected

## Data Persistence

### Local Data Storage

- [ ] Create a new task via Inbox
- [ ] Edit the task in drawer
- [ ] Close the app completely
- [ ] Reopen the app
- [ ] **Verify**: Task still exists with all edits preserved

### Team Data Sync

- [ ] Create or edit a team task
- [ ] Verify changes are reflected in Team Projects panel
- [ ] If realtime is enabled, verify changes sync across sessions

## UI/UX Checks

### Visual Consistency

- [ ] Verify drawer opens smoothly without flicker
- [ ] Verify edit form fields are properly aligned
- [ ] Verify validation error messages are visible and readable
- [ ] Verify inline action buttons are properly spaced and not overlapping text

### Performance

- [ ] Verify drawer opens within 1 second of clicking
- [ ] Verify save operations complete within 2 seconds
- [ ] Verify no UI lag when switching between Inbox items

## Post-Test Cleanup

1. **Restore Data Directory** (if backed up)
   - Move backup data back to `~/.config/PersonalAssistant`
   - Or leave test data for further verification

2. **Document Results**
   - Record any failures or unexpected behavior
   - Note AppImage version and commit hash tested
   - Report issues with reproduction steps

## Known Issues to Watch For

- **Stale drawer content**: Drawer should always show latest data after save
- **Missing field preloads**: Edit form should show current values, not empty fields
- **Validation bypass**: Recurring tasks should require due date before save
- **Inline action failures**: Complete/delete/convert buttons should work reliably
- **Team vs local behavior**: Team tasks close drawer after save, local tasks stay open

## Test Environment Notes

- Test on multiple Linux distributions if possible (Ubuntu, Fedora, Debian)
- Test with both fresh data and existing user data
- Test with and without Team Projects configured
- Note any distribution-specific issues

## Success Criteria

All critical tests must pass:

- Drawer content refreshes immediately after save
- Edit form preloads saved values correctly
- Inline actions work reliably
- Validation prevents invalid state
- Data persists across app restarts
