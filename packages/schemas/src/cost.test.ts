import { describe, expect, it } from 'vitest';

import { estimateCostUsd, lookupPricing } from './cost';
import { emptyUsageTotals } from './usage';

describe('lookupPricing', () => {
  it('matches exact model ids', () => {
    expect(lookupPricing('claude-sonnet-4-6')?.inputPerMTok).toBe(3);
  });

  it('matches suffixed deployment ids by prefix', () => {
    expect(lookupPricing('claude-opus-4-6[1m]')?.inputPerMTok).toBe(5);
    expect(lookupPricing('claude-haiku-4-5-20251001')?.inputPerMTok).toBe(1);
  });

  it('returns undefined for unknown models', () => {
    expect(lookupPricing('some-future-model')).toBeUndefined();
  });
});

describe('estimateCostUsd', () => {
  it('prices input, output, cache write, and cache read distinctly', () => {
    const cost = estimateCostUsd('claude-opus-4-6', {
      ...emptyUsageTotals(),
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      cacheCreationTokens: 1_000_000,
      cacheCreation5mTokens: 1_000_000,
      cacheReadTokens: 1_000_000,
    });
    // 5 (input) + 25 (output) + 5 * 1.25 (5m cache write) + 5 * 0.1 (cache read)
    expect(cost).toBeCloseTo(5 + 25 + 6.25 + 0.5, 6);
  });

  it('prices 1h cache writes at the 2x rate', () => {
    const cost = estimateCostUsd('claude-opus-4-6', {
      ...emptyUsageTotals(),
      cacheCreationTokens: 1_000_000,
      cacheCreation1hTokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(10, 6);
  });

  it('falls back to the 5m rate when the TTL split is missing', () => {
    const cost = estimateCostUsd('claude-opus-4-6', { ...emptyUsageTotals(), cacheCreationTokens: 1_000_000 });
    expect(cost).toBeCloseTo(6.25, 6);
  });

  it('returns undefined for unknown models instead of a misleading zero', () => {
    expect(estimateCostUsd('mystery-model', emptyUsageTotals())).toBeUndefined();
  });
});
