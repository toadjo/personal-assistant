import { z } from "zod";

/** One row from Home Assistant `GET /api/states` (minimal fields we persist). */
export const haStateRowSchema = z.object({
  entity_id: z.string().min(1),
  state: z.string(),
  attributes: z.record(z.string(), z.unknown()).optional()
});

export const haStatesResponseSchema = z.array(haStateRowSchema);

export type HaStateRow = z.infer<typeof haStateRowSchema>;

export function parseHaStatesResponse(json: unknown): HaStateRow[] {
  const parsed = haStatesResponseSchema.safeParse(json);
  if (!parsed.success) {
    const detail = parsed.error.flatten().formErrors.join("; ") || parsed.error.message;
    throw new Error(`Invalid Home Assistant states response: ${detail}`);
  }
  return parsed.data;
}
