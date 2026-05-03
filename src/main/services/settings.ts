import type { AssistantSettings } from "../../shared/types";
import { deleteSetting, getSetting, setSetting } from "./settingsRepository";

const ASSISTANT_NAME_KEY = "assistant.name";
const USER_PREFERRED_NAME_KEY = "user.preferredName";
const DEFAULT_ASSISTANT_NAME = "Assistant";

export function getAssistantSettings(): AssistantSettings {
  const normalizedName = normalizeAssistantName(getSetting(ASSISTANT_NAME_KEY) ?? "");
  const userPreferredName = normalizeAssistantName(getSetting(USER_PREFERRED_NAME_KEY) ?? "");
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
  setSetting(ASSISTANT_NAME_KEY, normalizedName);
  return getAssistantSettings();
}

/** Saves or clears the user's preferred first name for greetings (empty string clears). */
export function saveUserPreferredName(input: string): AssistantSettings {
  const normalized = normalizeAssistantName(input);
  if (!normalized) {
    deleteSetting(USER_PREFERRED_NAME_KEY);
    return getAssistantSettings();
  }
  setSetting(USER_PREFERRED_NAME_KEY, normalized);
  return getAssistantSettings();
}

function normalizeAssistantName(value: string): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, 60);
}
