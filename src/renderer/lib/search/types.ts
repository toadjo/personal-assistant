/**
 * Search result types for global command palette.
 */

export type SearchResultCategory = "note" | "task" | "reminder" | "automation" | "device" | "setting" | "team-task";

export type SearchResult = {
  id: string;
  category: SearchResultCategory;
  title: string;
  subtitle: string;
  action: string;
  score: number;
};
