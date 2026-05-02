import { getDb } from "../db";
import type { AssistantSettings } from "../../shared/types";

const ASSISTANT_NAME_KEY = "assistant.name";
const USER_PREFERRED_NAME_KEY = "user.preferredName";
const DEFAULT_ASSISTANT_NAME = "Assistant";

export function getAssistantSettings(): AssistantSettings {
  const row = getDb().prepare("SELECT value FROM app_settings WHERE key = ?").get(ASSISTANT_NAME_KEY) as
    | { value?: string }
    | undefined;
  const normalizedName = normalizeAssistantName(row?.value ?? "");
  const userRow = getDb().prepare("SELECT value FROM app_settings WHERE key = ?").get(USER_PREFERRED_NAME_KEY) as
    | { value?: string }
    | undefined;
  const userPreferredName = normalizeAssistantName(userRow?.value ?? "");
  if (!normalizedName) {
    return {
      name: DEFAULT_ASSISTANT_NAME,
      isConfigured: false,
      userPreferredName,
      userPreferredNameIsSet: Boolean(userPreferredName)
    };
  }
  return {
    name: normalizedName,
    isConfigured: true,
    userPreferredName,
    userPreferredNameIsSet: Boolean(userPreferredName)
  };
}

export function saveAssistantName(inputName: string): AssistantSettings {
  const normalizedName = normalizeAssistantName(inputName);
  if (!normalizedName) {
    throw new Error("Assistant name is required.");
  }
  getDb()
    .prepare(
      "INSERT INTO app_settings (key, value, updatedAt) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updatedAt=excluded.updatedAt"
    )
    .run(ASSISTANT_NAME_KEY, normalizedName, new Date().toISOString());
  return getAssistantSettings();
}

/** Saves or clears the user's preferred first name for greetings (empty string clears). */
export function saveUserPreferredName(input: string): AssistantSettings {
  const normalized = normalizeAssistantName(input);
  if (!normalized) {
    getDb().prepare("DELETE FROM app_settings WHERE key = ?").run(USER_PREFERRED_NAME_KEY);
    return getAssistantSettings();
  }
  getDb()
    .prepare(
      "INSERT INTO app_settings (key, value, updatedAt) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updatedAt=excluded.updatedAt"
    )
    .run(USER_PREFERRED_NAME_KEY, normalized, new Date().toISOString());
  return getAssistantSettings();
}

function normalizeAssistantName(value: string): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, 60);
}
