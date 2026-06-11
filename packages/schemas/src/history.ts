import { z } from 'zod';

/**
 * One line of `~/.claude/history.jsonl` — a prompt the user submitted.
 * Deliberately a strict-shape object (not loose): unknown keys are stripped,
 * and `pastedContents` is intentionally omitted — raw clipboard pastes can
 * contain secrets and are never rendered, so they must not be held in memory.
 */
export const historyEntrySchema = z.object({
  display: z.string(),
  timestamp: z.number(),
  project: z.string().optional(),
  sessionId: z.string().optional(),
});

export type HistoryEntry = z.infer<typeof historyEntrySchema>;

export const parseHistoryLine = (line: string): HistoryEntry | undefined => {
  const trimmed = line.trim();
  if (trimmed === '') return undefined;
  let json: unknown;
  try {
    json = JSON.parse(trimmed);
  } catch {
    return undefined;
  }
  const result = historyEntrySchema.safeParse(json);
  return result.success ? result.data : undefined;
};
