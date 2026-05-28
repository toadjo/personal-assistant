/**
 * Fuzzy search engine for the global command palette.
 */

import type { Note, Task, Reminder, AutomationRule } from "../../../shared/types";
import type { TeamProjectTask, TeamProject } from "../../../shared/team/types";
import type { HaDeviceRow } from "../../types";
import type { SearchResult } from "./types";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

function tokenize(text: string): string[] {
  return normalize(text).split(/\s+/).filter(Boolean);
}

function scoreMatch(queryTokens: string[], haystack: string): number {
  const hayTokens = tokenize(haystack);
  if (hayTokens.length === 0) return 0;

  let matched = 0;
  for (const qt of queryTokens) {
    for (const ht of hayTokens) {
      if (ht.includes(qt)) {
        matched++;
        break;
      }
    }
  }
  return matched / queryTokens.length;
}

// Enhanced fuzzy matching with character-level scoring
function fuzzyMatch(query: string, text: string): number {
  const normalizedQuery = normalize(query);
  const normalizedText = normalize(text);
  
  if (!normalizedQuery) return 0;
  if (normalizedText === normalizedQuery) return 1; // Exact match
  
  let queryIndex = 0;
  let textIndex = 0;
  let matches = 0;
  
  while (queryIndex < normalizedQuery.length && textIndex < normalizedText.length) {
    if (normalizedQuery[queryIndex] === normalizedText[textIndex]) {
      matches++;
      queryIndex++;
    }
    textIndex++;
  }
  
  // Calculate score based on how many characters matched and their position
  const score = matches / normalizedQuery.length;
  
  // Bonus for consecutive matches at start
  if (normalizedQuery.length > 0 && normalizedText.length > 0) {
    const firstChar = normalizedQuery[0];
    if (firstChar && normalizedText.startsWith(firstChar)) {
      return score * 1.5;
    }
  }
  
  return score;
}

function isExactMatch(query: string, text: string): boolean {
  return normalize(query) === normalize(text);
}

function isPrefixMatch(query: string, text: string): boolean {
  const normalizedQuery = normalize(query);
  const normalizedText = normalize(text);
  return normalizedText.startsWith(normalizedQuery);
}

function isOpenOrActive(item: SearchResult): boolean {
  // Check if item is marked as open or active
  if (item.isOpen) return true;

  // Consider tasks/reminders that are not done as "active"
  if (item.category === "task" && !item.subtitle.includes("Done")) return true;
  if (item.category === "reminder" && !item.subtitle.includes("Done")) return true;

  return false;
}

function isCompletedOrDone(item: SearchResult): boolean {
  return item.subtitle.includes("Done");
}

function rankResults(query: string, items: SearchResult[]): SearchResult[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return items;

  const scored = items.map((item) => {
    let score = 0;

    // Exact title match: highest priority (100 points)
    if (isExactMatch(query, item.title)) {
      score += 100;
    }

    // Prefix match: high priority (50 points)
    else if (isPrefixMatch(query, item.title)) {
      score += 50;
    }

    // Enhanced fuzzy matching for title
    const fuzzyTitleScore = fuzzyMatch(query, item.title) * 40;
    score += fuzzyTitleScore;

    // Fuzzy/content matches for subtitle and action
    const titleScore = scoreMatch(queryTokens, item.title) * 3;
    const subtitleScore = scoreMatch(queryTokens, item.subtitle);
    const actionScore = scoreMatch(queryTokens, item.action);
    score += titleScore + subtitleScore + actionScore;

    // Boost for recent items (25 points, increased from 20)
    if (item.isRecent) {
      score += 25;
    }

    // Boost for open/active items (20 points, increased from 15)
    if (isOpenOrActive(item)) {
      score += 20;
    }

    // Penalize completed/done items (15 points, increased from 10)
    if (isCompletedOrDone(item)) {
      score -= 15;
    }

    // Recency boost based on timestamp (up to 10 points)
    if (item.timestamp) {
      const daysSinceUpdate = (Date.now() - item.timestamp) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < 1) {
        score += 10;
      } else if (daysSinceUpdate < 7) {
        score += 5;
      }
    }

    return { ...item, score };
  });

  return scored.filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
}

export function buildSearchIndex(
  notes: Note[],
  tasks: Task[],
  reminders: Reminder[],
  rules: AutomationRule[],
  devices: HaDeviceRow[],
  teamTasks: TeamProjectTask[] = [],
  teamProjects: TeamProject[] = [],
  recentItemIds: Set<string> = new Set()
): SearchResult[] {
  const results: SearchResult[] = [];

  notes.forEach((n) => {
    results.push({
      id: `note:${n.id}`,
      category: "note",
      title: n.title,
      subtitle: n.content?.slice(0, 80) ?? "",
      action: "Open note",
      score: 0,
      isRecent: recentItemIds.has(`note:${n.id}`),
      timestamp: new Date(n.updatedAt).getTime()
    });
  });

  tasks.forEach((t) => {
    results.push({
      id: `task:${t.id}`,
      category: "task",
      title: t.title,
      subtitle: t.status === "open" ? "Open" : "Done",
      action: "Open task",
      score: 0,
      isOpen: t.status === "open",
      isRecent: recentItemIds.has(`task:${t.id}`),
      timestamp: new Date(t.updatedAt).getTime()
    });
  });

  reminders.forEach((r) => {
    results.push({
      id: `reminder:${r.id}`,
      category: "reminder",
      title: r.text,
      subtitle: r.status === "done" ? "Done" : "Pending",
      action: "Open reminder",
      score: 0,
      isOpen: r.status === "pending",
      isRecent: recentItemIds.has(`reminder:${r.id}`),
      timestamp: new Date(r.dueAt).getTime()
    });
  });

  rules.forEach((rule) => {
    results.push({
      id: `automation:${rule.id}`,
      category: "automation",
      title: rule.name,
      subtitle: `${rule.triggerConfig.at} | ${rule.actionType}`,
      action: "Open automation",
      score: 0,
      isRecent: recentItemIds.has(`automation:${rule.id}`)
    });
  });

  devices.forEach((d) => {
    results.push({
      id: `device:${d.entityId}`,
      category: "device",
      title: d.friendlyName,
      subtitle: d.state,
      action: "Toggle device",
      score: 0
    });
  });

  teamTasks.forEach((tt) => {
    const project = teamProjects.find((p) => p.id === tt.projectId);
    const subtitleParts: string[] = [];

    if (tt.status === "done") subtitleParts.push("Done");
    else subtitleParts.push("Open");

    if (project?.name) subtitleParts.push(project.name);
    if (tt.assigneeDisplayName) subtitleParts.push(tt.assigneeDisplayName);
    if (tt.dueAt) subtitleParts.push(new Date(tt.dueAt).toLocaleDateString());
    if (tt.notes) subtitleParts.push(tt.notes.slice(0, 60)); // Include notes for searchability

    results.push({
      id: `team-task:${tt.id}`,
      category: "team-task",
      title: tt.title,
      subtitle: subtitleParts.join(" | "),
      action: "Open team task",
      score: 0,
      isOpen: tt.status === "open",
      isRecent: recentItemIds.has(`team-task:${tt.id}`),
      timestamp: new Date(tt.updatedAt).getTime()
    });
  });

  // Static settings/actions
  results.push(
    {
      id: "setting:theme",
      category: "setting",
      title: "Appearance",
      subtitle: "Change theme and colors",
      action: "Open appearance",
      score: 0
    },
    {
      id: "setting:density",
      category: "setting",
      title: "Layout",
      subtitle: "Density, radius, shadows, blur",
      action: "Open layout",
      score: 0
    }
  );

  return results;
}

export function search(query: string, index: SearchResult[]): SearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) {
    // When empty, prioritize recent items first, then by timestamp
    const withRecent = index.filter((item) => item.isRecent);
    const withoutRecent = index.filter((item) => !item.isRecent);

    // Sort recent by timestamp (most recent first)
    const sortedRecent = withRecent.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    // Sort others by timestamp (most recent first)
    const sortedOthers = withoutRecent.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    return [...sortedRecent, ...sortedOthers].slice(0, 12);
  }
  return rankResults(trimmed, index).slice(0, 12);
}
