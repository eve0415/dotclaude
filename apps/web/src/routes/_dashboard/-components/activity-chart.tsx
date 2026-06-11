import type { DayRollup, ModelRollup } from '@dotclaude/schemas/aggregate';

import { formatUsd } from '#lib/format';

import { StackedDayChart } from './stacked-day-chart';

const costOf = (rollup: ModelRollup): number => Number((rollup.costUsd ?? 0).toFixed(2));

/** Stacked estimated cost per day, one series per model. */
export const ActivityChart = ({ byDay }: { byDay: DayRollup[] }) => (
  <StackedDayChart byDay={byDay} kind='area' ariaLabel='Estimated API cost per day, stacked by model' valueOf={costOf} formatValue={formatUsd} />
);
