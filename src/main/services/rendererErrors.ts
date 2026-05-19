import { randomUUID } from "node:crypto";
import { getDb } from "../db";
import { redactSecrets } from "../lib/redaction";

export function persistRendererError(payload: { message: string; stack?: string; componentStack?: string }): void {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  
  // Redact secrets before persistence
  const redactedMessage = redactSecrets(payload.message);
  const redactedStack = payload.stack ? redactSecrets(payload.stack) : null;
  const redactedComponentStack = payload.componentStack ? redactSecrets(payload.componentStack) : null;
  
  getDb()
    .prepare(
      `INSERT INTO renderer_errors (id, createdAt, message, stack, componentStack)
       VALUES (@id, @createdAt, @message, @stack, @componentStack)`
    )
    .run({
      id,
      createdAt,
      message: redactedMessage.slice(0, 4000),
      stack: redactedStack?.slice(0, 8000) ?? null,
      componentStack: redactedComponentStack?.slice(0, 8000) ?? null
    });
}
