import type { DayRollup, ModelRollup } from '@dotclaude/schemas/aggregate';

import { formatTokens } from '#lib/format';

import { StackedDayChart } from './stacked-day-chart';

const outputTokensOf = (rollup: ModelRollup): number => rollup.usage.outputTokens;

/** Stacked output tokens per day, one series per model. */
export const TokensChart = ({ byDay }: { byDay: DayRollup[] }) => (
  <StackedDayChart
    byDay={byDay}
    kind='bar'
    ariaLabel='Output tokens per day, stacked by model'
    valueOf={outputTokensOf}
    formatValue={formatTokens}
    yAxisWidth={48}
  />
);
