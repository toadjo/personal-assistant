import { useEffect, useState } from "react";
import type { AiConfigStatus, AiProvider } from "../../../shared/ai/types";
import { getAssistantApi, requireAssistantApi } from "../../lib/assistantApi";

export type AiConfigState = {
  config: AiConfigStatus | null;
  isConfigured: boolean;
  setKey: (provider: AiProvider, apiKey: string) => Promise<AiConfigStatus>;
  clearKey: () => Promise<AiConfigStatus>;
  testKey: () => Promise<{ success: true; model: string }>;
  refresh: () => Promise<AiConfigStatus>;
};

export function useAiConfig(opts?: { onStartupComplete?: () => void }): AiConfigState {
  const [aiConfig, setAiConfig] = useState<AiConfigStatus | null>(null);

  // Load AI config on mount
  useEffect(() => {
    void (async () => {
      try {
        const api = getAssistantApi();
        if (!api) return;
        const config = await api.getAiConfig();
        setAiConfig(config);
      } catch {
        // Ignore errors if AI is not configured
      } finally {
        // End app startup measurement after initial setup
        opts?.onStartupComplete?.();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setKey = async (provider: AiProvider, apiKey: string): Promise<AiConfigStatus> => {
    const api = requireAssistantApi();
    const config = await api.setAiKey({ provider, apiKey });
    setAiConfig(config);
    return config;
  };

  const clearKey = async (): Promise<AiConfigStatus> => {
    const api = requireAssistantApi();
    const config = await api.clearAiKey();
    setAiConfig(config);
    return config;
  };

  const testKey = async (): Promise<{ success: true; model: string }> => {
    const api = requireAssistantApi();
    const result = await api.testAiKey();
    return result;
  };

  const refresh = async (): Promise<AiConfigStatus> => {
    const api = requireAssistantApi();
    const config = await api.getAiConfig();
    setAiConfig(config);
    return config;
  };

  return {
    config: aiConfig,
    isConfigured: aiConfig?.configured ?? false,
    setKey,
    clearKey,
    testKey,
    refresh
  };
}
