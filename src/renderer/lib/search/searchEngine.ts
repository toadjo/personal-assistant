/**
 * Fuzzy search engine for the global command palette.
 */

import type { Note, Task, Reminder, AutomationRule } from "../../../shared/types";
import type { HaDeviceRow } from "../../types";
import type { SearchResult } from "./types";

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
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

function rankResults(query: string, items: SearchResult[]): SearchResult[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return items;

  const scored = items.map((item) => {
    const titleScore = scoreMatch(queryTokens, item.title) * 3;
    const subtitleScore = scoreMatch(queryTokens, item.subtitle);
    const actionScore = scoreMatch(queryTokens, item.action);
    const totalScore = titleScore + subtitleScore + actionScore;
    return { ...item, score: totalScore };
  });

  return scored
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function buildSearchIndex(
  notes: Note[],
  tasks: Task[],
  reminders: Reminder[],
  rules: AutomationRule[],
  devices: HaDeviceRow[]
): SearchResult[] {
  const results: SearchResult[] = [];

  notes.forEach((n) => {
    results.push({
      id: `note:${n.id}`,
      category: "note",
      title: n.title,
      subtitle: n.content?.slice(0, 80) ?? "",
      action: "Open note",
      score: 0
    });
  });

  tasks.forEach((t) => {
    results.push({
      id: `task:${t.id}`,
      category: "task",
      title: t.title,
      subtitle: t.status === "open" ? "Open" : "Done",
      action: "Open task",
      score: 0
    });
  });

  reminders.forEach((r) => {
    results.push({
      id: `reminder:${r.id}`,
      category: "reminder",
      title: r.text,
      subtitle: r.status === "done" ? "Done" : "Pending",
      action: "Open reminder",
      score: 0
    });
  });

  rules.forEach((rule) => {
    results.push({
      id: `automation:${rule.id}`,
      category: "automation",
      title: rule.name,
      subtitle: `${rule.triggerConfig.at} — ${rule.actionType}`,
      action: "Open automation",
      score: 0
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

  // Static settings/actions
  results.push(
    { id: "setting:theme", category: "setting", title: "Appearance", subtitle: "Change theme and colors", action: "Open appearance", score: 0 },
    { id: "setting:density", category: "setting", title: "Layout", subtitle: "Density, radius, shadows, blur", action: "Open layout", score: 0 }
  );

  return results;
}

export function search(query: string, index: SearchResult[]): SearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return index.slice(0, 12);
  return rankResults(trimmed, index).slice(0, 12);
}
