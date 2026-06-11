import type { DayRollup } from '@dotclaude/schemas/aggregate';
import type { ReactNode } from 'react';

import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { formatUsd, shortModelName } from '#lib/format';

import { modelColorVar } from '../../-shared/model-badge';

import { axisTickStyle, chartMargin, legendWrapperStyle, tooltipContentStyle, tooltipItemStyle, tooltipLabelStyle } from './chart-style';

const formatYAxis = (value: number): string => formatUsd(value);
const formatTooltip = (value: unknown, name: unknown): [string, string] => [formatUsd(typeof value === 'number' ? value : 0), shortModelName(String(name))];
const formatLegend = (value: unknown): ReactNode => <span className='text-muted-foreground'>{shortModelName(String(value))}</span>;

/** Stacked estimated cost per day, one series per model. */
export const ActivityChart = ({ byDay }: { byDay: DayRollup[] }) => {
  const { data, models } = useMemo(() => {
    const modelSet = new Set<string>();
    for (const day of byDay) {
      for (const rollup of day.byModel) modelSet.add(rollup.model);
    }
    const allModels = [...modelSet];
    // Zero-fill every model on every day — undefined points break stacked series.
    const chartData = byDay.map(day => {
      const point: Record<string, number | string> = { day: day.day.slice(5) };
      for (const model of allModels) point[model] = 0;
      for (const rollup of day.byModel) {
        point[rollup.model] = Number((rollup.costUsd ?? 0).toFixed(2));
      }
      return point;
    });
    return { data: chartData, models: allModels };
  }, [byDay]);

  if (data.length === 0) {
    return <p className='text-muted-foreground py-12 text-center text-sm'>No usage data in the opened files.</p>;
  }

  return (
    <figure aria-label='Estimated API cost per day, stacked by model' className='h-64 w-full'>
      <ResponsiveContainer width='100%' height='100%'>
        <AreaChart accessibilityLayer data={data} margin={chartMargin}>
          <CartesianGrid strokeDasharray='3 3' stroke='var(--border)' vertical={false} />
          <XAxis dataKey='day' tick={axisTickStyle} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={formatYAxis} tick={axisTickStyle} tickLine={false} axisLine={false} width={56} />
          <Tooltip formatter={formatTooltip} contentStyle={tooltipContentStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
          <Legend formatter={formatLegend} iconType='circle' iconSize={8} wrapperStyle={legendWrapperStyle} />
          {models.map(model => (
            <Area
              key={model}
              dataKey={model}
              stackId='cost'
              type='monotone'
              stroke={modelColorVar(model)}
              fill={modelColorVar(model)}
              fillOpacity={0.35}
              name={model}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </figure>
  );
};
