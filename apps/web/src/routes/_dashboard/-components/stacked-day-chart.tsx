import type { DayRollup, ModelRollup } from '@dotclaude/schemas/aggregate';

import { VisArea, VisAxis, VisBulletLegend, VisCrosshair, VisStackedBar, VisTooltip, VisXYContainer } from '@unovis/react';
import { CurveType } from '@unovis/ts';
import { useCallback, useMemo } from 'react';

import { shortModelName } from '#lib/format';

import { modelColorVar } from '../../-shared/model-badge';

/** Series values live in an array indexed by model position, so model names
 * coming from transcripts (e.g. "__proto__") never become object keys. */
interface DayPoint {
  index: number;
  day: string;
  values: number[];
}

const xOf = (d: DayPoint): number => d.index;

const escapeHtml = (text: string): string =>
  text.replaceAll(/[&<>"']/g, char => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });

interface StackedDayChartProps {
  byDay: DayRollup[];
  kind: 'area' | 'bar';
  ariaLabel: string;
  /** Value plotted per (day, model) point. */
  valueOf: (rollup: ModelRollup) => number;
  /** Axis tick and tooltip value formatting. */
  formatValue: (value: number) => string;
}

/** Stacked per-day chart, one series per model, zero-filled so stacked series never break. */
export const StackedDayChart = ({ byDay, kind, ariaLabel, valueOf, formatValue }: StackedDayChartProps) => {
  const { data, models } = useMemo(() => {
    const modelSet = new Set<string>();
    for (const day of byDay) {
      for (const rollup of day.byModel) modelSet.add(rollup.model);
    }
    const allModels = [...modelSet];
    const seriesIndexOf = new Map(allModels.map((model, i) => [model, i]));
    const chartData = byDay.map((day, index) => {
      const values = allModels.map(() => 0);
      for (const rollup of day.byModel) {
        const seriesIndex = seriesIndexOf.get(rollup.model);
        if (seriesIndex !== undefined) values[seriesIndex] = valueOf(rollup);
      }
      return { index, day: day.day.slice(5), values };
    });
    return { data: chartData, models: allModels };
  }, [byDay, valueOf]);

  const yAccessors = useMemo(() => models.map((_, seriesIndex) => (d: DayPoint) => d.values[seriesIndex] ?? 0), [models]);

  const colors = useMemo(() => models.map(model => modelColorVar(model)), [models]);

  const legendItems = useMemo(() => models.map(model => ({ name: shortModelName(model), color: modelColorVar(model) })), [models]);

  const formatDayTick = useCallback(
    (tick: number | Date): string => (typeof tick === 'number' && Number.isInteger(tick) ? (data[tick]?.day ?? '') : ''),
    [data],
  );

  const formatValueTick = useCallback((tick: number | Date): string => (typeof tick === 'number' ? formatValue(tick) : ''), [formatValue]);

  const tooltipTemplate = useCallback(
    (d: DayPoint): string => {
      const rows = models
        .map((model, seriesIndex) => {
          const value = formatValue(d.values[seriesIndex] ?? 0);
          return (
            `<div class="flex items-center gap-1.5">` +
            `<span class="size-2 shrink-0 rounded-full" style="background:${modelColorVar(model)}"></span>` +
            `<span>${escapeHtml(shortModelName(model))}</span>` +
            `<span class="ml-auto pl-3 font-medium">${escapeHtml(value)}</span>` +
            `</div>`
          );
        })
        .join('');
      return `<div class="min-w-36 text-xs"><div class="text-muted-foreground mb-1 font-medium">${escapeHtml(d.day)}</div>${rows}</div>`;
    },
    [models, formatValue],
  );

  if (data.length === 0) {
    return <p className='text-muted-foreground py-12 text-center text-sm'>No usage data in the opened files.</p>;
  }

  return (
    <figure aria-label={ariaLabel} className='vis-chart w-full'>
      <VisXYContainer<DayPoint> data={data} className='h-60'>
        {kind === 'area' ? (
          <VisArea<DayPoint> x={xOf} y={yAccessors} color={colors} curveType={CurveType.MonotoneX} opacity={0.35} />
        ) : (
          <VisStackedBar<DayPoint> x={xOf} y={yAccessors} color={colors} roundedCorners={2} barPadding={0.2} />
        )}
        <VisAxis<DayPoint> type='x' tickFormat={formatDayTick} gridLine={false} tickLine={false} domainLine={false} />
        <VisAxis<DayPoint> type='y' tickFormat={formatValueTick} tickLine={false} domainLine={false} />
        {/* Days can be far apart in px on sparse data — never hide the snapped crosshair. */}
        <VisCrosshair<DayPoint> x={xOf} yStacked={yAccessors} color={colors} template={tooltipTemplate} hideWhenFarFromPointer={false} />
        <VisTooltip />
      </VisXYContainer>
      <div className='mt-2'>
        <VisBulletLegend items={legendItems} />
      </div>
    </figure>
  );
};
