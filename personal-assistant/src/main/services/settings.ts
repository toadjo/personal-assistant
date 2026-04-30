import { getDb } from "../db";
import type { AssistantSettings } from "../../shared/types";

const ASSISTANT_NAME_KEY = "assistant.name";
const DEFAULT_ASSISTANT_NAME = "Assistant";

export function getAssistantSettings(): AssistantSettings {
  const row = getDb()
    .prepare("SELECT value FROM app_settings WHERE key = ?")
    .get(ASSISTANT_NAME_KEY) as { value?: string } | undefined;
  const normalizedName = normalizeAssistantName(row?.value ?? "");
  if (!normalizedName) {
    return {
      name: DEFAULT_ASSISTANT_NAME,
      isConfigured: false
    };
  }
  return {
    name: normalizedName,
    isConfigured: true
  };
}

export function saveAssistantName(inputName: string): AssistantSettings {
  const normalizedName = normalizeAssistantName(inputName);
  if (!normalizedName) {
    throw new Error("Assistant name is required.");
  }
  getDb()
    .prepare("INSERT INTO app_settings (key, value, updatedAt) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updatedAt=excluded.updatedAt")
    .run(ASSISTANT_NAME_KEY, normalizedName, new Date().toISOString());
  return {
    name: normalizedName,
    isConfigured: true
  };
}

function normalizeAssistantName(value: string): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, 60);
}
