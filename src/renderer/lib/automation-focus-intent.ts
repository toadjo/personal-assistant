const AUTOMATION_FOCUS_INTENT_KEY = "assistant-automation-focus-intent";
const INTENT_EXPIRY_MS = 30000; // 30 seconds

export type AutomationFocusIntent = {
  ruleId: string;
  createdAt: number;
};

export function setAutomationFocusIntent(ruleId: string): void {
  try {
    const intent: AutomationFocusIntent = {
      ruleId,
      createdAt: Date.now()
    };
    localStorage.setItem(AUTOMATION_FOCUS_INTENT_KEY, JSON.stringify(intent));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

export function getAutomationFocusIntent(): string | null {
  try {
    const value = localStorage.getItem(AUTOMATION_FOCUS_INTENT_KEY);
    if (!value) return null;
    
    const intent: AutomationFocusIntent = JSON.parse(value);
    
    // Ignore intents older than 30 seconds
    if (Date.now() - intent.createdAt > INTENT_EXPIRY_MS) {
      clearAutomationFocusIntent();
      return null;
    }
    
    return intent.ruleId;
  } catch {
    return null;
  }
}

export function clearAutomationFocusIntent(): void {
  try {
    localStorage.removeItem(AUTOMATION_FOCUS_INTENT_KEY);
  } catch {
    // Silently fail if localStorage is unavailable
  }
}
