import { randomUUID } from "node:crypto";
import { getDb } from "../db";

export function persistRendererError(payload: { message: string; stack?: string; componentStack?: string }): void {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO renderer_errors (id, createdAt, message, stack, componentStack)
       VALUES (@id, @createdAt, @message, @stack, @componentStack)`
    )
    .run({
      id,
      createdAt,
      message: payload.message.slice(0, 4000),
      stack: payload.stack?.slice(0, 8000) ?? null,
      componentStack: payload.componentStack?.slice(0, 8000) ?? null
    });
}
