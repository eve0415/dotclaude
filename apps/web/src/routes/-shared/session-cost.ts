import type { SessionSummary } from '@dotclaude/schemas/session';

import { estimateCostUsd } from '@dotclaude/schemas/cost';

/** Total estimated USD for a session, priced per model. Undefined when nothing is priceable. */
export const sessionCost = (summary: SessionSummary | undefined): number | undefined => {
  if (summary === undefined) return undefined;
  let cost: number | undefined;
  for (const [model, usage] of Object.entries(summary.usageByModel)) {
    const c = estimateCostUsd(model, usage);
    if (c !== undefined) cost = (cost ?? 0) + c;
  }
  return cost;
};

export const sessionToolTotal = (summary: SessionSummary | undefined): number => {
  let total = 0;
  for (const count of Object.values(summary?.toolCounts ?? {})) total += count;
  return total;
};
