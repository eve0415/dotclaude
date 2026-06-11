import { z } from 'zod';

/** One line of `~/.claude/history.jsonl` — a prompt the user submitted. */
export const historyEntrySchema = z.looseObject({
  display: z.string(),
  timestamp: z.number(),
  project: z.string().optional(),
  sessionId: z.string().optional(),
  pastedContents: z.record(z.string(), z.unknown()).optional(),
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
