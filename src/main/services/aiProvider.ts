import type { AiProvider, AiChatRequest, AiChatResponse } from "../../shared/ai/types";
import { throwAssistantInvoke } from "./structuredInvokeError";
import { checkAiAllowed, checkHostAllowed } from "../security/outboundGuard";

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

  /**
   * Send a chat request to the provider and return the response.
   * Throws structured errors on failure; returns chat response on 2xx.
   */
  chat(apiKey: string, request: AiChatRequest): Promise<AiChatResponse>;
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
    checkAiAllowed();
    checkHostAllowed(new URL(this.baseUrl).hostname);
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
      if (
        error instanceof Error &&
        error.cause &&
        typeof error.cause === "object" &&
        "code" in error.cause &&
        error.cause.code === "ECONNREFUSED"
      ) {
        throwAi({ code: "NETWORK_FAILURE", message: "Network error connecting to OpenAI.", retryable: true });
      }
      // Re-throw structured errors from above
      throw error;
    }
  }

  async chat(apiKey: string, request: AiChatRequest): Promise<AiChatResponse> {
    checkAiAllowed();
    checkHostAllowed(new URL(this.baseUrl).hostname);
    if (!apiKey) {
      throwAi({ code: "NOT_CONFIGURED", message: "OpenAI API key is not configured.", retryable: false });
    }

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: this.modelId,
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant. Respond concisely. When suggesting actions, include a JSON object with type, action, and reason fields."
            },
            { role: "user", content: request.message }
          ],
          max_tokens: 500
        }),
        signal: AbortSignal.timeout(30_000)
      });

      if (!res.ok) {
        if (res.status === 401) {
          throwAi({ code: "INVALID_KEY", message: "OpenAI API key is invalid or expired.", retryable: false });
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

      const choices = (data as { choices?: unknown }).choices;
      if (!choices || !Array.isArray(choices) || choices.length === 0) {
        throwAi({ code: "MALFORMED_RESPONSE", message: "OpenAI response has no choices.", retryable: false });
      }
      const firstChoice = choices[0];
      if (!firstChoice || typeof firstChoice !== "object") {
        throwAi({ code: "MALFORMED_RESPONSE", message: "OpenAI response choice is not an object.", retryable: false });
      }
      const message = (firstChoice as { message?: unknown }).message;
      if (!message || typeof message !== "object") {
        throwAi({ code: "MALFORMED_RESPONSE", message: "OpenAI response has no message.", retryable: false });
      }
      const content = (message as { content?: unknown }).content;
      if (!content || typeof content !== "string") {
        throwAi({ code: "MALFORMED_RESPONSE", message: "OpenAI response has no message content.", retryable: false });
      }
      const reply = content;

      return { reply };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throwAi({ code: "NETWORK_FAILURE", message: "OpenAI API request timed out.", retryable: true });
      }
      if (
        error instanceof Error &&
        error.cause &&
        typeof error.cause === "object" &&
        "code" in error.cause &&
        error.cause.code === "ECONNREFUSED"
      ) {
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
    checkAiAllowed();
    checkHostAllowed(new URL(this.baseUrl).hostname);
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
      if (
        error instanceof Error &&
        error.cause &&
        typeof error.cause === "object" &&
        "code" in error.cause &&
        error.cause.code === "ECONNREFUSED"
      ) {
        throwAi({ code: "NETWORK_FAILURE", message: "Network error connecting to Anthropic.", retryable: true });
      }
      // Re-throw structured errors from above
      throw error;
    }
  }

  async chat(apiKey: string, request: AiChatRequest): Promise<AiChatResponse> {
    checkAiAllowed();
    checkHostAllowed(new URL(this.baseUrl).hostname);
    if (!apiKey) {
      throwAi({ code: "NOT_CONFIGURED", message: "Anthropic API key is not configured.", retryable: false });
    }

    try {
      const res = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: this.modelId,
          max_tokens: 500,
          system:
            "You are a helpful assistant. Respond concisely. When suggesting actions, include a JSON object with type, action, and reason fields.",
          messages: [{ role: "user", content: request.message }]
        }),
        signal: AbortSignal.timeout(30_000)
      });

      if (!res.ok) {
        if (res.status === 401) {
          throwAi({ code: "INVALID_KEY", message: "Anthropic API key is invalid or expired.", retryable: false });
        }
        if (res.status === 429) {
          throwAi({ code: "RATE_LIMITED", message: "Anthropic rate limit exceeded.", retryable: true });
        }
        throwAi({
          code: "PROVIDER_UNAVAILABLE",
          message: `Anthropic API returned ${res.status}: ${res.statusText}`,
          retryable: true
        });
      }

      const responseText = await res.text();
      let data: unknown;
      try {
        data = JSON.parse(responseText);
      } catch {
        throwAi({ code: "MALFORMED_RESPONSE", message: "Anthropic returned invalid JSON.", retryable: false });
      }

      if (!data || typeof data !== "object" || Array.isArray(data)) {
        throwAi({ code: "MALFORMED_RESPONSE", message: "Anthropic response is not an object.", retryable: false });
      }

      const content = (data as { content?: unknown }).content;
      if (!content || !Array.isArray(content) || content.length === 0) {
        throwAi({ code: "MALFORMED_RESPONSE", message: "Anthropic response has no content.", retryable: false });
      }
      const textBlock = content.find((block) => {
        return block && typeof block === "object" && (block as { type?: string }).type === "text";
      });
      if (!textBlock || typeof textBlock !== "object") {
        throwAi({ code: "MALFORMED_RESPONSE", message: "Anthropic response has no text block.", retryable: false });
      }
      const text = (textBlock as { text?: unknown }).text;
      if (!text || typeof text !== "string") {
        throwAi({ code: "MALFORMED_RESPONSE", message: "Anthropic text block has no text.", retryable: false });
      }
      const reply = text;

      return { reply };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throwAi({ code: "NETWORK_FAILURE", message: "Anthropic API request timed out.", retryable: true });
      }
      if (
        error instanceof Error &&
        error.cause &&
        typeof error.cause === "object" &&
        "code" in error.cause &&
        error.cause.code === "ECONNREFUSED"
      ) {
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
