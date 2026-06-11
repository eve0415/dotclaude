import type { UsageTotals } from './usage';

import { estimateCostUsd, sumDefined } from './cost';
import { addUsageTotals, emptyUsageTotals } from './usage';

/** One usage data point — typically one assistant message, or one whole session summary. */
export interface UsageEvent {
  timestamp: string;
  model: string;
  usage: UsageTotals;
}

export interface ModelRollup {
  model: string;
  usage: UsageTotals;
  costUsd: number | undefined;
  eventCount: number;
}

export interface DayRollup {
  /** Local-time calendar day, `YYYY-MM-DD`. */
  day: string;
  byModel: ModelRollup[];
  usage: UsageTotals;
  costUsd: number | undefined;
}

export interface UsageAggregate {
  byDay: DayRollup[];
  byModel: ModelRollup[];
  total: UsageTotals;
  totalCostUsd: number | undefined;
}

const localDayOf = (timestamp: string): string => {
  const d = new Date(timestamp);
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

const rollupCost = (rollups: ModelRollup[]): number | undefined => sumDefined(rollups.map(r => r.costUsd));

const intoModelRollups = (map: Map<string, { usage: UsageTotals; eventCount: number }>): ModelRollup[] =>
  [...map.entries()]
    .map(([model, { usage, eventCount }]) => ({ model, usage, eventCount, costUsd: estimateCostUsd(model, usage) }))
    .sort((a, b) => (b.costUsd ?? 0) - (a.costUsd ?? 0));

export const aggregateUsage = (events: UsageEvent[]): UsageAggregate => {
  const dayMap = new Map<string, Map<string, { usage: UsageTotals; eventCount: number }>>();
  const modelMap = new Map<string, { usage: UsageTotals; eventCount: number }>();
  let total = emptyUsageTotals();

  for (const event of events) {
    total = addUsageTotals(total, event.usage);

    const modelEntry = modelMap.get(event.model);
    if (modelEntry === undefined) {
      modelMap.set(event.model, { usage: event.usage, eventCount: 1 });
    } else {
      modelEntry.usage = addUsageTotals(modelEntry.usage, event.usage);
      modelEntry.eventCount += 1;
    }

    const day = localDayOf(event.timestamp);
    let dayModels = dayMap.get(day);
    if (dayModels === undefined) {
      dayModels = new Map();
      dayMap.set(day, dayModels);
    }
    const dayModelEntry = dayModels.get(event.model);
    if (dayModelEntry === undefined) {
      dayModels.set(event.model, { usage: event.usage, eventCount: 1 });
    } else {
      dayModelEntry.usage = addUsageTotals(dayModelEntry.usage, event.usage);
      dayModelEntry.eventCount += 1;
    }
  }

  const byDay: DayRollup[] = [...dayMap.entries()]
    .map(([day, models]) => {
      const byModel = intoModelRollups(models);
      let usage = emptyUsageTotals();
      for (const r of byModel) usage = addUsageTotals(usage, r.usage);
      return { day, byModel, usage, costUsd: rollupCost(byModel) };
    })
    .sort((a, b) => a.day.localeCompare(b.day));

  const byModel = intoModelRollups(modelMap);

  return { byDay, byModel, total, totalCostUsd: rollupCost(byModel) };
};

/** Merge per-session tool counts into one ranked list. */
export const mergeToolCounts = (counts: Record<string, number>[]): { name: string; count: number }[] => {
  const merged = new Map<string, number>();
  for (const record of counts) {
    for (const [name, count] of Object.entries(record)) {
      merged.set(name, (merged.get(name) ?? 0) + count);
    }
  }
  return [...merged.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
};
