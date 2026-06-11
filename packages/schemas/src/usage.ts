import { z } from 'zod';

/** Token usage as reported on assistant records (`message.usage`). Tolerant of new fields. */
export const tokenUsageSchema = z.looseObject({
  input_tokens: z.number().default(0),
  output_tokens: z.number().default(0),
  cache_creation_input_tokens: z.number().default(0),
  cache_read_input_tokens: z.number().default(0),
  cache_creation: z
    .looseObject({
      ephemeral_5m_input_tokens: z.number().default(0),
      ephemeral_1h_input_tokens: z.number().default(0),
    })
    .optional(),
  service_tier: z.string().optional(),
  speed: z.string().optional(),
});

export type TokenUsage = z.infer<typeof tokenUsageSchema>;

/** Plain additive totals — what the UI aggregates and displays. */
export interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheCreation5mTokens: number;
  cacheCreation1hTokens: number;
  cacheReadTokens: number;
}

export const emptyUsageTotals = (): UsageTotals => ({
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationTokens: 0,
  cacheCreation5mTokens: 0,
  cacheCreation1hTokens: 0,
  cacheReadTokens: 0,
});

export const usageToTotals = (usage: TokenUsage): UsageTotals => ({
  inputTokens: usage.input_tokens,
  outputTokens: usage.output_tokens,
  cacheCreationTokens: usage.cache_creation_input_tokens,
  cacheCreation5mTokens: usage.cache_creation?.ephemeral_5m_input_tokens ?? 0,
  cacheCreation1hTokens: usage.cache_creation?.ephemeral_1h_input_tokens ?? 0,
  cacheReadTokens: usage.cache_read_input_tokens,
});

export const addUsageTotals = (a: UsageTotals, b: UsageTotals): UsageTotals => ({
  inputTokens: a.inputTokens + b.inputTokens,
  outputTokens: a.outputTokens + b.outputTokens,
  cacheCreationTokens: a.cacheCreationTokens + b.cacheCreationTokens,
  cacheCreation5mTokens: a.cacheCreation5mTokens + b.cacheCreation5mTokens,
  cacheCreation1hTokens: a.cacheCreation1hTokens + b.cacheCreation1hTokens,
  cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
});

/** All context the model read this turn, cached or not. */
export const totalContextTokens = (t: UsageTotals): number => t.inputTokens + t.cacheCreationTokens + t.cacheReadTokens;
