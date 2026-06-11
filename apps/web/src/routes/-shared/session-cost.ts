import type { SessionSummary } from '@dotclaude/schemas/session';

import { estimateCostUsd, sumDefined } from '@dotclaude/schemas/cost';

/** Total estimated USD for a session, priced per model. Undefined when nothing is priceable. */
export const sessionCost = (summary: SessionSummary | undefined): number | undefined => {
  if (summary === undefined) return undefined;
  return sumDefined(Object.entries(summary.usageByModel).map(([model, usage]) => estimateCostUsd(model, usage)));
};

export const sessionToolTotal = (summary: SessionSummary | undefined): number => {
  let total = 0;
  for (const count of Object.values(summary?.toolCounts ?? {})) total += count;
  return total;
};
