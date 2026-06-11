import type { DayRollup } from '@dotclaude/schemas/aggregate';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { formatTokens, shortModelName } from '#lib/format';

import { modelColorVar } from '../../-shared/model-badge';

import { axisTickStyle, barCursorStyle, chartMargin, tooltipContentStyle } from './chart-style';

const formatYAxis = (value: number): string => formatTokens(value);
const formatTooltip = (value: unknown, name: unknown): [string, string] => [formatTokens(typeof value === 'number' ? value : 0), shortModelName(String(name))];

/** Stacked output tokens per day, one series per model. */
export const TokensChart = ({ byDay }: { byDay: DayRollup[] }) => {
  const { data, models } = useMemo(() => {
    const modelSet = new Set<string>();
    const chartData = byDay.map(day => {
      const point: Record<string, number | string> = { day: day.day.slice(5) };
      for (const rollup of day.byModel) {
        modelSet.add(rollup.model);
        point[rollup.model] = rollup.usage.outputTokens;
      }
      return point;
    });
    return { data: chartData, models: [...modelSet] };
  }, [byDay]);

  if (data.length === 0) {
    return <p className='text-muted-foreground py-12 text-center text-sm'>No usage data in the opened files.</p>;
  }

  return (
    <figure aria-label='Output tokens per day, stacked by model' className='h-64 w-full'>
      <ResponsiveContainer width='100%' height='100%'>
        <BarChart accessibilityLayer data={data} margin={chartMargin}>
          <CartesianGrid strokeDasharray='3 3' stroke='var(--border)' vertical={false} />
          <XAxis dataKey='day' tick={axisTickStyle} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={formatYAxis} tick={axisTickStyle} tickLine={false} axisLine={false} width={48} />
          <Tooltip formatter={formatTooltip} contentStyle={tooltipContentStyle} cursor={barCursorStyle} />
          {models.map(model => (
            <Bar key={model} dataKey={model} stackId='tokens' fill={modelColorVar(model)} fillOpacity={0.8} name={model} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </figure>
  );
};
