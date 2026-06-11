import type { DayRollup, ModelRollup } from '@dotclaude/schemas/aggregate';
import type { ReactNode } from 'react';

import { useCallback, useMemo } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { shortModelName } from '#lib/format';

import { modelColorVar } from '../../-shared/model-badge';

import { axisTickStyle, barCursorStyle, chartMargin, legendWrapperStyle, tooltipContentStyle, tooltipItemStyle, tooltipLabelStyle } from './chart-style';

const formatLegend = (value: unknown): ReactNode => <span className='text-muted-foreground'>{shortModelName(String(value))}</span>;

interface StackedDayChartProps {
  byDay: DayRollup[];
  kind: 'area' | 'bar';
  ariaLabel: string;
  /** Value plotted per (day, model) point. */
  valueOf: (rollup: ModelRollup) => number;
  /** Axis tick and tooltip value formatting. */
  formatValue: (value: number) => string;
  yAxisWidth: number;
}

/** Stacked per-day chart, one series per model, zero-filled so stacked series never break. */
export const StackedDayChart = ({ byDay, kind, ariaLabel, valueOf, formatValue, yAxisWidth }: StackedDayChartProps) => {
  const { data, models } = useMemo(() => {
    const modelSet = new Set<string>();
    for (const day of byDay) {
      for (const rollup of day.byModel) modelSet.add(rollup.model);
    }
    const allModels = [...modelSet];
    const chartData = byDay.map(day => {
      // Build points through a Map: model names come from transcripts, so keys
      // like "__proto__" must become plain data properties, never prototype hits.
      const point = new Map<string, number | string>([['day', day.day.slice(5)]]);
      for (const model of allModels) point.set(model, 0);
      for (const rollup of day.byModel) point.set(rollup.model, valueOf(rollup));
      return Object.fromEntries(point);
    });
    return { data: chartData, models: allModels };
  }, [byDay, valueOf]);

  const formatTooltip = useCallback(
    (value: unknown, name: unknown): [string, string] => [formatValue(typeof value === 'number' ? value : 0), shortModelName(String(name))],
    [formatValue],
  );

  if (data.length === 0) {
    return <p className='text-muted-foreground py-12 text-center text-sm'>No usage data in the opened files.</p>;
  }

  return (
    <figure aria-label={ariaLabel} className='h-64 w-full'>
      <ResponsiveContainer width='100%' height='100%'>
        {kind === 'area' ? (
          <AreaChart accessibilityLayer data={data} margin={chartMargin}>
            <CartesianGrid strokeDasharray='3 3' stroke='var(--border)' vertical={false} />
            <XAxis dataKey='day' tick={axisTickStyle} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={formatValue} tick={axisTickStyle} tickLine={false} axisLine={false} width={yAxisWidth} />
            <Tooltip formatter={formatTooltip} contentStyle={tooltipContentStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
            <Legend formatter={formatLegend} iconType='circle' iconSize={8} wrapperStyle={legendWrapperStyle} />
            {models.map(model => (
              <Area
                key={model}
                dataKey={model}
                stackId='stack'
                type='monotone'
                stroke={modelColorVar(model)}
                fill={modelColorVar(model)}
                fillOpacity={0.35}
                name={model}
              />
            ))}
          </AreaChart>
        ) : (
          <BarChart accessibilityLayer data={data} margin={chartMargin}>
            <CartesianGrid strokeDasharray='3 3' stroke='var(--border)' vertical={false} />
            <XAxis dataKey='day' tick={axisTickStyle} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={formatValue} tick={axisTickStyle} tickLine={false} axisLine={false} width={yAxisWidth} />
            <Tooltip
              formatter={formatTooltip}
              contentStyle={tooltipContentStyle}
              itemStyle={tooltipItemStyle}
              labelStyle={tooltipLabelStyle}
              cursor={barCursorStyle}
            />
            <Legend formatter={formatLegend} iconType='circle' iconSize={8} wrapperStyle={legendWrapperStyle} />
            {models.map(model => (
              <Bar key={model} dataKey={model} stackId='stack' fill={modelColorVar(model)} fillOpacity={0.8} name={model} />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </figure>
  );
};
