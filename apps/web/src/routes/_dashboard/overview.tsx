import type { SessionRow } from '../-shared/use-summaries';
import type { UsageEvent } from '@dotclaude/schemas/aggregate';

import { aggregateUsage, mergeToolCounts } from '@dotclaude/schemas/aggregate';
import { totalContextTokens } from '@dotclaude/schemas/usage';
import { Card, CardContent, CardHeader, CardTitle } from '@dotclaude/ui/components/card';
import { createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';

import { useDataSource } from '#lib/data/data-source';
import { formatBytes, formatDateTime, formatTokens, formatUsd } from '#lib/format';

import { SessionLink } from '../-shared/entity-links';
import { MeterBar } from '../-shared/meter-bar';
import { ModelBadge } from '../-shared/model-badge';
import { StatCard } from '../-shared/stat-card';
import { SweepProgress } from '../-shared/sweep-progress';
import { useSummaries } from '../-shared/use-summaries';

import { ActivityChart } from './-components/activity-chart';

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

const Overview = () => {
  const { index } = useDataSource();
  const summaries = useSummaries(index ?? { rootKind: 'project-dir', projects: [], historyEntry: undefined, sessionCount: 0, totalSessionBytes: 0 });
  const { rows } = summaries;

  const derived = useMemo(() => {
    if (rows === undefined) return;
    const aggregate = aggregateUsage(usageEvents(rows));
    const topTools = mergeToolCounts(rows.map(row => row.summary?.toolCounts ?? {})).slice(0, 8);
    const recent = rows.filter(row => row.summary !== undefined).slice(0, 6);
    return { aggregate, topTools, recent };
  }, [rows]);

  if (index === undefined) return null;
  if (derived === undefined) return <SweepProgress progress={summaries.progress} sessionCount={index.sessionCount} />;
  const { aggregate, topTools, recent } = derived;
  const maxToolCount = topTools[0]?.count ?? 1;

  return (
    <div className='flex flex-col gap-6'>
      <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
        <StatCard label='Sessions' value={index.sessionCount} detail={`${index.projects.length} projects · ${formatBytes(index.totalSessionBytes)}`} />
        <StatCard
          label='Output tokens'
          value={formatTokens(aggregate.total.outputTokens)}
          detail={`${formatTokens(totalContextTokens(aggregate.total))} context read`}
        />
        <StatCard
          label='Cache efficiency'
          value={`${Math.round((aggregate.total.cacheReadTokens / Math.max(1, totalContextTokens(aggregate.total))) * 100)}%`}
          detail='of context served from cache'
        />
        <StatCard label='Est. API cost' value={formatUsd(aggregate.totalCostUsd)} detail='at current per-model pricing' />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityChart byDay={aggregate.byDay} />
        </CardContent>
      </Card>

      <div className='grid gap-6 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Top tools</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className='flex flex-col gap-2'>
              {topTools.map(tool => (
                <li key={tool.name} className='flex items-center gap-3 text-sm'>
                  <span className='w-40 truncate font-mono text-xs'>{tool.name}</span>
                  <MeterBar fraction={tool.count / maxToolCount} />
                  <span className='text-muted-foreground w-12 text-right text-xs tabular-nums'>{tool.count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Recent sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className='flex flex-col'>
              {recent.map(row => (
                <li key={row.session.sessionId} className='border-border/60 border-b py-2 last:border-b-0'>
                  <SessionLink sessionId={row.session.sessionId} className='hover:bg-accent/50 -mx-2 flex items-center gap-3 rounded-md px-2 py-1'>
                    <div className='min-w-0 flex-1'>
                      <p className='truncate text-sm'>{row.summary?.slug ?? row.summary?.firstUserPrompt ?? row.session.sessionId}</p>
                      <p className='text-muted-foreground text-xs'>
                        {row.project.label} · {formatDateTime(row.summary?.startedAt)}
                      </p>
                    </div>
                    {row.summary?.models[0] === undefined ? null : <ModelBadge model={row.summary.models[0]} />}
                  </SessionLink>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/_dashboard/overview')({
  component: Overview,
});
