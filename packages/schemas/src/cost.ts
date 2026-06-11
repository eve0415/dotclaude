import type { UsageTotals } from './usage';

/** USD per million tokens. Cache-write multipliers per Anthropic pricing: 1.25x (5m TTL), 2x (1h TTL). */
export interface ModelPricing {
  inputPerMTok: number;
  outputPerMTok: number;
}

const CACHE_WRITE_5M_MULTIPLIER = 1.25;
const CACHE_WRITE_1H_MULTIPLIER = 2;
const CACHE_READ_MULTIPLIER = 0.1;

/**
 * Longest-prefix-match pricing table. Model ids in transcripts can carry suffixes
 * (`claude-opus-4-6[1m]`, dated snapshots), so entries are prefixes, and adding a
 * future model is a single new entry.
 */
const PRICING_TABLE: readonly (readonly [prefix: string, pricing: ModelPricing])[] = [
  // Harness-injected pseudo-model on synthetic records — real but free.
  ['<synthetic>', { inputPerMTok: 0, outputPerMTok: 0 }],
  ['claude-fable-5', { inputPerMTok: 10, outputPerMTok: 50 }],
  ['claude-mythos-5', { inputPerMTok: 10, outputPerMTok: 50 }],
  ['claude-opus-4-8', { inputPerMTok: 5, outputPerMTok: 25 }],
  ['claude-opus-4-7', { inputPerMTok: 5, outputPerMTok: 25 }],
  ['claude-opus-4-6', { inputPerMTok: 5, outputPerMTok: 25 }],
  ['claude-opus-4-5', { inputPerMTok: 5, outputPerMTok: 25 }],
  ['claude-opus-4', { inputPerMTok: 15, outputPerMTok: 75 }],
  ['claude-sonnet-4', { inputPerMTok: 3, outputPerMTok: 15 }],
  ['claude-haiku-4-5', { inputPerMTok: 1, outputPerMTok: 5 }],
  ['claude-3-5-haiku', { inputPerMTok: 0.8, outputPerMTok: 4 }],
  ['claude-3-haiku', { inputPerMTok: 0.25, outputPerMTok: 1.25 }],
];

export const lookupPricing = (model: string): ModelPricing | undefined => {
  for (const [prefix, pricing] of PRICING_TABLE) {
    if (model.startsWith(prefix)) return pricing;
  }
  return undefined;
};

/** Estimated USD cost for one usage block. `undefined` when the model is unknown — render as "n/a", never as $0. */
export const estimateCostUsd = (model: string, totals: UsageTotals): number | undefined => {
  const pricing = lookupPricing(model);
  if (pricing === undefined) return undefined;
  const perTok = pricing.inputPerMTok / 1_000_000;
  // When the 5m/1h split is missing (older records), price all cache writes at the cheaper 5m rate.
  const splitKnown = totals.cacheCreation5mTokens + totals.cacheCreation1hTokens > 0;
  const cacheWrite = splitKnown
    ? totals.cacheCreation5mTokens * perTok * CACHE_WRITE_5M_MULTIPLIER + totals.cacheCreation1hTokens * perTok * CACHE_WRITE_1H_MULTIPLIER
    : totals.cacheCreationTokens * perTok * CACHE_WRITE_5M_MULTIPLIER;
  return (
    totals.inputTokens * perTok +
    cacheWrite +
    totals.cacheReadTokens * perTok * CACHE_READ_MULTIPLIER +
    totals.outputTokens * (pricing.outputPerMTok / 1_000_000)
  );
};
