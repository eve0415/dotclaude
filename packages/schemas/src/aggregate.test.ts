import type { UsageEvent } from './aggregate';

import { describe, expect, it } from 'vitest';

import { aggregateUsage, mergeToolCounts } from './aggregate';
import { emptyUsageTotals } from './usage';

const event = (timestamp: string, model: string, outputTokens: number): UsageEvent => ({
  timestamp,
  model,
  usage: { ...emptyUsageTotals(), outputTokens },
});

describe('aggregateUsage', () => {
  it('rolls up by local day and by model', () => {
    const aggregate = aggregateUsage([
      event('2026-06-09T10:00:00.000Z', 'claude-opus-4-6', 100),
      event('2026-06-09T11:00:00.000Z', 'claude-haiku-4-5', 50),
      event('2026-06-10T09:00:00.000Z', 'claude-opus-4-6', 200),
    ]);
    expect(aggregate.byDay.map(d => d.day)).toEqual(['2026-06-09', '2026-06-10']);
    expect(aggregate.total.outputTokens).toBe(350);
    const opus = aggregate.byModel.find(m => m.model === 'claude-opus-4-6');
    expect(opus?.usage.outputTokens).toBe(300);
    expect(opus?.eventCount).toBe(2);
    expect(aggregate.totalCostUsd).toBeGreaterThan(0);
  });

  it('keeps unknown-model cost out of the total instead of zeroing it', () => {
    const aggregate = aggregateUsage([event('2026-06-09T10:00:00.000Z', 'mystery-model', 100)]);
    expect(aggregate.totalCostUsd).toBeUndefined();
  });

  it('handles no events', () => {
    const aggregate = aggregateUsage([]);
    expect(aggregate.byDay).toEqual([]);
    expect(aggregate.byModel).toEqual([]);
    expect(aggregate.totalCostUsd).toBeUndefined();
  });
});

describe('mergeToolCounts', () => {
  it('merges and ranks tool counts', () => {
    const merged = mergeToolCounts([
      { Bash: 3, Edit: 1 },
      { Bash: 2, Read: 5 },
    ]);
    expect(merged[0]).toEqual({ name: 'Bash', count: 5 });
    expect(merged).toHaveLength(3);
  });
});
