import type { AiProvider } from "../../shared/ai/types";
import { throwAssistantInvoke } from "./structuredInvokeError";

/**
 * Model IDs for each provider. Configurable in code; can be changed without database migration.
 */
export const AI_MODEL_IDS = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-20241022"
} as const satisfies Record<AiProvider, string>;

export type AiModelId = (typeof AI_MODEL_IDS)[AiProvider];

/**
 * Connection test result. On success, returns the model name that was validated.
 */
export type AiTestResult = {
  success: true;
  model: AiModelId;
};

/**
 * Provider adapter interface. Each implementation handles provider-specific API quirks
 * (endpoints, auth headers, response parsing) while presenting a uniform shape to the service layer.
 */
export interface AiProviderAdapter {
  readonly provider: AiProvider;
  readonly modelId: AiModelId;

  /**
   * Test the API key by making a lightweight request (e.g., model list or minimal completion).
   * Throws structured errors on failure; returns success result on 2xx.
   */
  testConnection(apiKey: string): Promise<AiTestResult>;
}

function throwAi(partial: Omit<Parameters<typeof throwAssistantInvoke>[0], "domain">): never {
  return throwAssistantInvoke({
    domain: "ai",
    ...partial
  });
}

/**
 * OpenAI adapter using the Chat Completions API.
 */
export class OpenAiAdapter implements AiProviderAdapter {
  readonly provider = "openai" as const;
  readonly modelId = AI_MODEL_IDS.openai;
  private readonly baseUrl = "https://api.openai.com/v1";

  async testConnection(apiKey: string): Promise<AiTestResult> {
    if (!apiKey) {
      throwAi({ code: "NOT_CONFIGURED", message: "OpenAI API key is not configured.", retryable: false });
    }

    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`
        },
        signal: AbortSignal.timeout(10_000)
      });

      if (!res.ok) {
        if (res.status === 401) {
          throwAi({
            code: "INVALID_KEY",
            message: "OpenAI API key is invalid or expired.",
            retryable: false
          });
        }
        if (res.status === 429) {
          throwAi({ code: "RATE_LIMITED", message: "OpenAI rate limit exceeded.", retryable: true });
        }
        throwAi({
          code: "PROVIDER_UNAVAILABLE",
          message: `OpenAI API returned ${res.status}: ${res.statusText}`,
          retryable: true
        });
      }

      const text = await res.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        throwAi({ code: "MALFORMED_RESPONSE", message: "OpenAI returned invalid JSON.", retryable: false });
      }

      if (!data || typeof data !== "object" || Array.isArray(data)) {
        throwAi({ code: "MALFORMED_RESPONSE", message: "OpenAI response is not an object.", retryable: false });
      }

      return { success: true, model: this.modelId };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throwAi({ code: "NETWORK_FAILURE", message: "OpenAI API request timed out.", retryable: true });
      }
      if (error instanceof Error && error.cause && typeof error.cause === "object" && "code" in error.cause && error.cause.code === "ECONNREFUSED") {
        throwAi({ code: "NETWORK_FAILURE", message: "Network error connecting to OpenAI.", retryable: true });
      }
      // Re-throw structured errors from above
      throw error;
    }
  }
}

/**
 * Anthropic adapter using the Messages API.
 */
export class AnthropicAdapter implements AiProviderAdapter {
  readonly provider = "anthropic" as const;
  readonly modelId = AI_MODEL_IDS.anthropic;
  private readonly baseUrl = "https://api.anthropic.com/v1";

  async testConnection(apiKey: string): Promise<AiTestResult> {
    if (!apiKey) {
      throwAi({ code: "NOT_CONFIGURED", message: "Anthropic API key is not configured.", retryable: false });
    }

    try {
      // Anthropic doesn't have a lightweight model list endpoint; use a minimal message instead
      const res = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: this.modelId,
          max_tokens: 10,
          messages: [{ role: "user", content: "ping" }]
        }),
        signal: AbortSignal.timeout(10_000)
      });

      if (!res.ok) {
        if (res.status === 401) {
          throwAi({
            code: "INVALID_KEY",
            message: "Anthropic API key is invalid or expired.",
            retryable: false
          });
        }
        if (res.status === 429) {
          throwAi({ code: "RATE_LIMITED", message: "Anthropic rate limit exceeded.", retryable: true });
        }
        if (res.status === 400) {
          const text = await res.text();
          if (text.includes("invalid model")) {
            throwAi({
              code: "INVALID_MODEL",
              message: `Configured Anthropic model "${this.modelId}" is not available.`,
              retryable: false
            });
          }
        }
        throwAi({
          code: "PROVIDER_UNAVAILABLE",
          message: `Anthropic API returned ${res.status}: ${res.statusText}`,
          retryable: true
        });
      }

      const text = await res.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        throwAi({ code: "MALFORMED_RESPONSE", message: "Anthropic returned invalid JSON.", retryable: false });
      }

      if (!data || typeof data !== "object" || Array.isArray(data)) {
        throwAi({ code: "MALFORMED_RESPONSE", message: "Anthropic response is not an object.", retryable: false });
      }

      return { success: true, model: this.modelId };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throwAi({ code: "NETWORK_FAILURE", message: "Anthropic API request timed out.", retryable: true });
      }
      if (error instanceof Error && error.cause && typeof error.cause === "object" && "code" in error.cause && error.cause.code === "ECONNREFUSED") {
        throwAi({ code: "NETWORK_FAILURE", message: "Network error connecting to Anthropic.", retryable: true });
      }
      // Re-throw structured errors from above
      throw error;
    }
  }
}

export function createAdapter(provider: AiProvider): AiProviderAdapter {
  switch (provider) {
    case "openai":
      return new OpenAiAdapter();
    case "anthropic":
      return new AnthropicAdapter();
  }
}
