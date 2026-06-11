import type { SessionRow } from '../-shared/use-summaries';
import type { UsageEvent } from '@dotclaude/schemas/aggregate';

import { aggregateUsage, mergeToolCounts } from '@dotclaude/schemas/aggregate';
import { totalContextTokens } from '@dotclaude/schemas/usage';
import { Card, CardContent, CardHeader, CardTitle } from '@dotclaude/ui/components/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@dotclaude/ui/components/table';
import { createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';

import { useDataSource } from '#lib/data/data-source';
import { formatTokens, formatUsd } from '#lib/format';

import { MeterBar } from '../-shared/meter-bar';
import { ModelBadge } from '../-shared/model-badge';
import { StatCard } from '../-shared/stat-card';
import { SweepProgress } from '../-shared/sweep-progress';
import { useSummaries } from '../-shared/use-summaries';

import { ActivityChart } from './-components/activity-chart';
import { TokensChart } from './-components/tokens-chart';

const usageEvents = (rows: SessionRow[]): UsageEvent[] => {
  const events: UsageEvent[] = [];
  for (const row of rows) {
    if (row.summary?.startedAt === undefined) continue;
    for (const [model, usage] of Object.entries(row.summary.usageByModel)) {
      events.push({ timestamp: row.summary.startedAt, model, usage });
    }
  }
  return events;
};

const UsagePage = () => {
  const { index } = useDataSource();
  const summaries = useSummaries(index ?? { rootKind: 'project-dir', projects: [], historyEntry: undefined, sessionCount: 0, totalSessionBytes: 0 });
  const { rows } = summaries;

  const derived = useMemo(() => {
    if (rows === undefined) return;
    const aggregate = aggregateUsage(usageEvents(rows));
    const tools = mergeToolCounts(rows.map(row => row.summary?.toolCounts ?? {}));
    return { aggregate, tools };
  }, [rows]);

  if (index === undefined) return null;
  if (derived === undefined) return <SweepProgress progress={summaries.progress} sessionCount={index.sessionCount} />;
  const { aggregate, tools } = derived;
  const context = totalContextTokens(aggregate.total);
  const maxToolCount = tools[0]?.count ?? 1;

  return (
    <div className='flex flex-col gap-6'>
      <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
        <StatCard label='Est. total cost' value={formatUsd(aggregate.totalCostUsd)} detail='input + cache + output, per-model pricing' />
        <StatCard label='Output tokens' value={formatTokens(aggregate.total.outputTokens)} />
        <StatCard
          label='Cache reads'
          value={formatTokens(aggregate.total.cacheReadTokens)}
          detail={`${Math.round((aggregate.total.cacheReadTokens / Math.max(1, context)) * 100)}% of all context`}
        />
        <StatCard
          label='Cache writes'
          value={formatTokens(aggregate.total.cacheCreationTokens)}
          detail={`${formatTokens(aggregate.total.inputTokens)} uncached input`}
        />
      </div>

      <div className='grid gap-6 xl:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Estimated cost per day</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityChart byDay={aggregate.byDay} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Output tokens per day</CardTitle>
          </CardHeader>
          <CardContent>
            <TokensChart byDay={aggregate.byDay} />
          </CardContent>
        </Card>
      </div>

      <div className='grid gap-6 xl:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>By model</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead className='text-right'>Messages</TableHead>
                  <TableHead className='text-right'>Output</TableHead>
                  <TableHead className='text-right'>Cache read</TableHead>
                  <TableHead className='text-right'>Est. cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aggregate.byModel.map(rollup => (
                  <TableRow key={rollup.model}>
                    <TableCell>
                      <ModelBadge model={rollup.model} />
                    </TableCell>
                    <TableCell className='text-right tabular-nums'>{rollup.eventCount}</TableCell>
                    <TableCell className='text-right tabular-nums'>{formatTokens(rollup.usage.outputTokens)}</TableCell>
                    <TableCell className='text-right tabular-nums'>{formatTokens(rollup.usage.cacheReadTokens)}</TableCell>
                    <TableCell className='text-right tabular-nums'>{formatUsd(rollup.costUsd)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Tool calls</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className='flex max-h-96 flex-col gap-2 overflow-y-auto pr-2'>
              {tools.map(tool => (
                <li key={tool.name} className='flex items-center gap-3 text-sm'>
                  <span className='w-44 truncate font-mono text-xs'>{tool.name}</span>
                  <MeterBar fraction={tool.count / maxToolCount} />
                  <span className='text-muted-foreground w-12 text-right text-xs tabular-nums'>{tool.count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/_dashboard/usage')({
  component: UsagePage,
});
