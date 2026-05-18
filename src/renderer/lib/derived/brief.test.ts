import { describe, it, expect } from "vitest";
import { deriveFocusBrief, getBriefSummary } from "./brief";
import type { Note, Reminder, Task, AutomationRule } from "../../../shared/types";
import type { TeamProjectTask, TeamProject } from "../../../shared/team/types";

describe("deriveFocusBrief", () => {
  const now = new Date("2024-01-15T12:00:00Z");

  it("should return empty array when all inputs are empty", () => {
    const result = deriveFocusBrief({
      overdueTasks: [],
      dueTodayTasks: [],
      upcomingReminders: [],
      selectedDayAgenda: [],
      pinnedNotes: [],
      now
    });
    expect(result).toEqual([]);
  });

  it("should prioritize overdue tasks", () => {
    const overdueTask: Task = {
      id: "1",
      title: "Overdue task",
      notes: "",
      dueAt: "2024-01-01T00:00:00Z",
      priority: "normal",
      status: "open",
      recurrence: "none",
      notifyChannel: "desktop",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      lastCompletedAt: null
    };

    const result = deriveFocusBrief({
      overdueTasks: [overdueTask],
      dueTodayTasks: [],
      upcomingReminders: [],
      selectedDayAgenda: [],
      pinnedNotes: [],
      now
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.kind).toBe("task");
    expect(result[0]?.urgency).toBe("overdue");
    expect(result[0]?.label).toBe("Overdue task");
  });

  it("should include due today tasks with today urgency", () => {
    const todayTask: Task = {
      id: "1",
      title: "Today task",
      notes: "",
      dueAt: "2024-01-15T12:00:00Z",
      priority: "normal",
      status: "open",
      recurrence: "none",
      notifyChannel: "desktop",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      lastCompletedAt: null
    };

    const result = deriveFocusBrief({
      overdueTasks: [],
      dueTodayTasks: [todayTask],
      upcomingReminders: [],
      selectedDayAgenda: [],
      pinnedNotes: [],
      now
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.urgency).toBe("today");
  });

  it("should include pinned notes with context urgency", () => {
    const note: Note = {
      id: "1",
      title: "Pinned note",
      content: "Important context",
      tags: [],
      pinned: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z"
    };

    const result = deriveFocusBrief({
      overdueTasks: [],
      dueTodayTasks: [],
      upcomingReminders: [],
      selectedDayAgenda: [],
      pinnedNotes: [note],
      now
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.kind).toBe("note");
    expect(result[0]?.urgency).toBe("context");
  });

  it("should sort items by urgency: overdue > today > upcoming > context", () => {
    const overdueTask: Task = {
      id: "1",
      title: "Overdue",
      notes: "",
      dueAt: "2024-01-01T00:00:00Z",
      priority: "normal",
      status: "open",
      recurrence: "none",
      notifyChannel: "desktop",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      lastCompletedAt: null
    };

    const todayTask: Task = {
      id: "2",
      title: "Today",
      notes: "",
      dueAt: "2024-01-15T12:00:00Z",
      priority: "normal",
      status: "open",
      recurrence: "none",
      notifyChannel: "desktop",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      lastCompletedAt: null
    };

    const note: Note = {
      id: "3",
      title: "Context",
      content: "",
      tags: [],
      pinned: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z"
    };

    const result = deriveFocusBrief({
      overdueTasks: [overdueTask],
      dueTodayTasks: [todayTask],
      upcomingReminders: [],
      selectedDayAgenda: [],
      pinnedNotes: [note],
      now
    });

    expect(result).toHaveLength(3);
    expect(result[0]?.urgency).toBe("overdue");
    expect(result[1]?.urgency).toBe("today");
    expect(result[2]?.urgency).toBe("context");
  });

  it("should include upcoming reminders", () => {
    const reminder: Reminder = {
      id: "1",
      text: "Upcoming reminder",
      dueAt: "2024-01-16T12:00:00Z",
      recurrence: "none",
      status: "pending",
      notifyChannel: "desktop"
    };

    const result = deriveFocusBrief({
      overdueTasks: [],
      dueTodayTasks: [],
      upcomingReminders: [reminder],
      selectedDayAgenda: [],
      pinnedNotes: [],
      now
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.kind).toBe("reminder");
    expect(result[0]?.urgency).toBe("upcoming");
  });

  it("should include selected day agenda items", () => {
    const reminder: Reminder = {
      id: "1",
      text: "Agenda item",
      dueAt: "2024-01-15T12:00:00Z",
      recurrence: "none",
      status: "pending",
      notifyChannel: "desktop"
    };

    const result = deriveFocusBrief({
      overdueTasks: [],
      dueTodayTasks: [],
      upcomingReminders: [],
      selectedDayAgenda: [reminder],
      pinnedNotes: [],
      now
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.kind).toBe("agenda");
    expect(result[0]?.urgency).toBe("today");
  });

  it("should deduplicate items by source id", () => {
    const reminder: Reminder = {
      id: "1",
      text: "Same reminder",
      dueAt: "2024-01-15T12:00:00Z",
      recurrence: "none",
      status: "pending",
      notifyChannel: "desktop"
    };

    const result = deriveFocusBrief({
      overdueTasks: [],
      dueTodayTasks: [],
      upcomingReminders: [reminder],
      selectedDayAgenda: [reminder],
      pinnedNotes: [],
      now
    });

    // With source-aware dedupe, reminder and agenda are different kinds, so both appear
    expect(result).toHaveLength(2);
    expect(result[0]?.kind).toBe("reminder");
    expect(result[1]?.kind).toBe("agenda");
  });

  describe("team tasks", () => {
    it("should include overdue team tasks with overdue urgency", () => {
      const teamTask: TeamProjectTask = {
        id: "team-1",
        projectId: "proj-1",
        workspaceId: "ws-1",
        title: "Overdue team task",
        notes: "",
        dueAt: "2024-01-01T00:00:00Z",
        priority: "normal",
        recurrence: "none",
        assigneeDisplayName: null,
        status: "open",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1",
        updatedBy: "user-1"
      };

      const result = deriveFocusBrief({
        overdueTasks: [],
        dueTodayTasks: [],
        upcomingReminders: [],
        selectedDayAgenda: [],
        pinnedNotes: [],
        teamTasks: [teamTask],
        teamProjects: [],
        now
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.kind).toBe("team-task");
      expect(result[0]?.urgency).toBe("overdue");
      expect(result[0]?.label).toBe("Overdue team task");
    });

    it("should include due today team tasks with today urgency", () => {
      const teamTask: TeamProjectTask = {
        id: "team-1",
        projectId: "proj-1",
        workspaceId: "ws-1",
        title: "Today team task",
        notes: "",
        dueAt: "2024-01-15T12:00:00Z",
        priority: "normal",
        recurrence: "none",
        assigneeDisplayName: null,
        status: "open",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1",
        updatedBy: "user-1"
      };

      const result = deriveFocusBrief({
        overdueTasks: [],
        dueTodayTasks: [],
        upcomingReminders: [],
        selectedDayAgenda: [],
        pinnedNotes: [],
        teamTasks: [teamTask],
        teamProjects: [],
        now
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.urgency).toBe("today");
    });

    it("should include upcoming team tasks with upcoming urgency", () => {
      const teamTask: TeamProjectTask = {
        id: "team-1",
        projectId: "proj-1",
        workspaceId: "ws-1",
        title: "Upcoming team task",
        notes: "",
        dueAt: "2024-01-16T12:00:00Z",
        priority: "normal",
        recurrence: "none",
        assigneeDisplayName: null,
        status: "open",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1",
        updatedBy: "user-1"
      };

      const result = deriveFocusBrief({
        overdueTasks: [],
        dueTodayTasks: [],
        upcomingReminders: [],
        selectedDayAgenda: [],
        pinnedNotes: [],
        teamTasks: [teamTask],
        teamProjects: [],
        now
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.urgency).toBe("upcoming");
    });

    it("should include unscheduled team tasks with context urgency", () => {
      const teamTask: TeamProjectTask = {
        id: "team-1",
        projectId: "proj-1",
        workspaceId: "ws-1",
        title: "Unscheduled team task",
        notes: "",
        dueAt: null,
        priority: "normal",
        recurrence: "none",
        assigneeDisplayName: null,
        status: "open",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1",
        updatedBy: "user-1"
      };

      const result = deriveFocusBrief({
        overdueTasks: [],
        dueTodayTasks: [],
        upcomingReminders: [],
        selectedDayAgenda: [],
        pinnedNotes: [],
        teamTasks: [teamTask],
        teamProjects: [],
        now
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.urgency).toBe("context");
    });

    it("should exclude done team tasks", () => {
      const teamTask: TeamProjectTask = {
        id: "team-1",
        projectId: "proj-1",
        workspaceId: "ws-1",
        title: "Done team task",
        notes: "",
        dueAt: "2024-01-15T12:00:00Z",
        priority: "normal",
        recurrence: "none",
        assigneeDisplayName: null,
        status: "done",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1",
        updatedBy: "user-1"
      };

      const result = deriveFocusBrief({
        overdueTasks: [],
        dueTodayTasks: [],
        upcomingReminders: [],
        selectedDayAgenda: [],
        pinnedNotes: [],
        teamTasks: [teamTask],
        teamProjects: [],
        now
      });

      expect(result).toHaveLength(0);
    });

    it("should include project name in detail when available", () => {
      const teamTask: TeamProjectTask = {
        id: "team-1",
        projectId: "proj-1",
        workspaceId: "ws-1",
        title: "Team task with project",
        notes: "",
        dueAt: "2024-01-15T12:00:00Z",
        priority: "normal",
        recurrence: "none",
        assigneeDisplayName: null,
        status: "open",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1",
        updatedBy: "user-1"
      };

      const project: TeamProject = {
        id: "proj-1",
        workspaceId: "ws-1",
        name: "Frontend",
        createdAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1"
      };

      const result = deriveFocusBrief({
        overdueTasks: [],
        dueTodayTasks: [],
        upcomingReminders: [],
        selectedDayAgenda: [],
        pinnedNotes: [],
        teamTasks: [teamTask],
        teamProjects: [project],
        now
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.detail).toContain("Frontend");
    });

    it("should include assignee in detail when available", () => {
      const teamTask: TeamProjectTask = {
        id: "team-1",
        projectId: "proj-1",
        workspaceId: "ws-1",
        title: "Team task with assignee",
        notes: "",
        dueAt: "2024-01-15T12:00:00Z",
        priority: "normal",
        recurrence: "none",
        assigneeDisplayName: "Alice",
        status: "open",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1",
        updatedBy: "user-1"
      };

      const result = deriveFocusBrief({
        overdueTasks: [],
        dueTodayTasks: [],
        upcomingReminders: [],
        selectedDayAgenda: [],
        pinnedNotes: [],
        teamTasks: [teamTask],
        teamProjects: [],
        now
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.detail).toContain("Alice");
    });

    it("should allow local task and team task with same id to both appear", () => {
      const localTask: Task = {
        id: "same-id",
        title: "Local task",
        notes: "",
        dueAt: "2024-01-15T12:00:00Z",
        priority: "normal",
        status: "open",
        recurrence: "none",
        notifyChannel: "desktop",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        lastCompletedAt: null
      };

      const teamTask: TeamProjectTask = {
        id: "same-id",
        projectId: "proj-1",
        workspaceId: "ws-1",
        title: "Team task",
        notes: "",
        dueAt: "2024-01-15T12:00:00Z",
        priority: "normal",
        recurrence: "none",
        assigneeDisplayName: null,
        status: "open",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        createdBy: "user-1",
        updatedBy: "user-1"
      };

      const result = deriveFocusBrief({
        overdueTasks: [],
        dueTodayTasks: [localTask],
        upcomingReminders: [],
        selectedDayAgenda: [],
        pinnedNotes: [],
        teamTasks: [teamTask],
        teamProjects: [],
        now
      });

      expect(result).toHaveLength(2);
      expect(result[0]?.kind).toBe("task");
      expect(result[1]?.kind).toBe("team-task");
    });
  });

  describe("automation rules", () => {
    it("should include enabled automation rules with context urgency", () => {
      const rule: AutomationRule = {
        id: "rule-1",
        name: "Morning reminder",
        triggerType: "time",
        triggerConfig: { at: "08:00" },
        actionType: "localReminder",
        actionConfig: { text: "Wake up" },
        enabled: true
      };

      const result = deriveFocusBrief({
        overdueTasks: [],
        dueTodayTasks: [],
        upcomingReminders: [],
        selectedDayAgenda: [],
        pinnedNotes: [],
        automationRules: [rule],
        now
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.kind).toBe("automation");
      expect(result[0]?.urgency).toBe("context");
      expect(result[0]?.label).toBe("Morning reminder");
      expect(result[0]?.detail).toBe("Runs at 08:00 | reminder");
    });

    it("should exclude disabled automation rules", () => {
      const rule: AutomationRule = {
        id: "rule-1",
        name: "Disabled rule",
        triggerType: "time",
        triggerConfig: { at: "08:00" },
        actionType: "localReminder",
        actionConfig: { text: "Wake up" },
        enabled: false
      };

      const result = deriveFocusBrief({
        overdueTasks: [],
        dueTodayTasks: [],
        upcomingReminders: [],
        selectedDayAgenda: [],
        pinnedNotes: [],
        automationRules: [rule],
        now
      });

      expect(result).toHaveLength(0);
    });

    it("should format detail for localTask action type", () => {
      const rule: AutomationRule = {
        id: "rule-1",
        name: "Daily task",
        triggerType: "time",
        triggerConfig: { at: "09:00" },
        actionType: "localTask",
        actionConfig: {
          title: "Check email",
          notes: "",
          dueAt: null,
          priority: "normal",
          recurrence: "none"
        },
        enabled: true
      };

      const result = deriveFocusBrief({
        overdueTasks: [],
        dueTodayTasks: [],
        upcomingReminders: [],
        selectedDayAgenda: [],
        pinnedNotes: [],
        automationRules: [rule],
        now
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.detail).toBe("Runs at 09:00 | create task");
    });

    it("should format detail for haToggle action type", () => {
      const rule: AutomationRule = {
        id: "rule-1",
        name: "Morning lights",
        triggerType: "time",
        triggerConfig: { at: "07:00" },
        actionType: "haToggle",
        actionConfig: { entityId: "light.kitchen" },
        enabled: true
      };

      const result = deriveFocusBrief({
        overdueTasks: [],
        dueTodayTasks: [],
        upcomingReminders: [],
        selectedDayAgenda: [],
        pinnedNotes: [],
        automationRules: [rule],
        now
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.detail).toBe("Runs at 07:00 | toggle device");
    });

    it("should sort automation rules in context section with other context items", () => {
      const note: Note = {
        id: "1",
        title: "Pinned note",
        content: "Important context",
        tags: [],
        pinned: true,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z"
      };

      const rule: AutomationRule = {
        id: "rule-1",
        name: "Morning reminder",
        triggerType: "time",
        triggerConfig: { at: "08:00" },
        actionType: "localReminder",
        actionConfig: { text: "Wake up" },
        enabled: true
      };

      const result = deriveFocusBrief({
        overdueTasks: [],
        dueTodayTasks: [],
        upcomingReminders: [],
        selectedDayAgenda: [],
        pinnedNotes: [note],
        automationRules: [rule],
        now
      });

      expect(result).toHaveLength(2);
      expect(result.every(item => item.urgency === "context")).toBe(true);
      expect(result[0]?.kind).toBe("automation");
      expect(result[1]?.kind).toBe("note");
    });
  });
});

describe("getBriefSummary", () => {
  it("should return all clear message when no items", () => {
    const result = getBriefSummary([]);
    expect(result).toBe("All clear - no urgent items.");
  });

  it("should count overdue items", () => {
    const items = [
      { kind: "task" as const, label: "Task", urgency: "overdue" as const, sourceId: "1" },
      { kind: "reminder" as const, label: "Reminder", urgency: "overdue" as const, sourceId: "2" }
    ];
    const result = getBriefSummary(items);
    expect(result).toBe("Focus: 2 overdue.");
  });

  it("should count today items", () => {
    const items = [
      { kind: "task" as const, label: "Task", urgency: "today" as const, sourceId: "1" },
      { kind: "reminder" as const, label: "Reminder", urgency: "today" as const, sourceId: "2" }
    ];
    const result = getBriefSummary(items);
    expect(result).toBe("Focus: 2 due today.");
  });

  it("should count context items", () => {
    const items = [{ kind: "note" as const, label: "Note", urgency: "context" as const, sourceId: "1" }];
    const result = getBriefSummary(items);
    expect(result).toBe("Focus: 1 context items.");
  });

  it("should combine multiple urgency counts", () => {
    const items = [
      { kind: "task" as const, label: "Overdue", urgency: "overdue" as const, sourceId: "1" },
      { kind: "task" as const, label: "Today", urgency: "today" as const, sourceId: "2" },
      { kind: "note" as const, label: "Context", urgency: "context" as const, sourceId: "3" }
    ];
    const result = getBriefSummary(items);
    expect(result).toBe("Focus: 1 overdue, 1 due today, 1 context items.");
  });
});
