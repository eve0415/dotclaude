import type { SortDirection, SortState } from '../-shared/table-controls';
import type { ChangeEvent } from 'react';

import { Badge } from '@dotclaude/ui/components/badge';
import { Button } from '@dotclaude/ui/components/button';
import { Input } from '@dotclaude/ui/components/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@dotclaude/ui/components/table';
import { createFileRoute } from '@tanstack/react-router';
import { X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { useDataSource } from '#lib/data/data-source';
import { formatDateTime, formatDuration, formatTokens, formatUsd } from '#lib/format';

import { SessionLink } from '../-shared/entity-links';
import { ModelBadge } from '../-shared/model-badge';
import { sessionCost, sessionToolTotal } from '../-shared/session-cost';
import { SweepProgress } from '../-shared/sweep-progress';
import { ModelFilter, SortableHead } from '../-shared/table-controls';
import { useSummaries } from '../-shared/use-summaries';

type SortKey = 'session' | 'started' | 'duration' | 'turns' | 'tools' | 'outTokens' | 'cost' | 'agents';

/** Row with sort/filter fields precomputed so sorting never re-derives them. */
interface SessionTableRow {
  sessionId: string;
  title: string;
  startedAt: string | undefined;
  startedMs: number | undefined;
  durationMs: number | undefined;
  models: string[];
  turns: number | undefined;
  tools: number;
  outTokens: number | undefined;
  cost: number | undefined;
  agents: number;
}

interface SortColumn {
  accessor: (row: SessionTableRow) => number | string | undefined;
  /** First click sorts the way you usually want: titles A→Z, metrics largest-first. */
  initialDir: SortDirection;
}

const SORT_COLUMNS: Record<SortKey, SortColumn> = {
  session: { accessor: row => row.title.toLowerCase(), initialDir: 'asc' },
  started: { accessor: row => row.startedMs, initialDir: 'desc' },
  duration: { accessor: row => row.durationMs, initialDir: 'desc' },
  turns: { accessor: row => row.turns, initialDir: 'desc' },
  tools: { accessor: row => row.tools, initialDir: 'desc' },
  outTokens: { accessor: row => row.outTokens, initialDir: 'desc' },
  cost: { accessor: row => row.cost, initialDir: 'desc' },
  agents: { accessor: row => row.agents, initialDir: 'desc' },
};

const DEFAULT_SORT: SortState<SortKey> = { key: 'started', dir: 'desc' };
const NO_MODELS: ReadonlySet<string> = new Set();

const compareRows = (a: SessionTableRow, b: SessionTableRow, sort: SortState<SortKey>): number => {
  const { accessor } = SORT_COLUMNS[sort.key];
  const av = accessor(a);
  const bv = accessor(b);
  // Sessions without the field sink to the bottom in either direction.
  if (av === undefined) return bv === undefined ? 0 : 1;
  if (bv === undefined) return -1;
  const base = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv) : typeof av === 'number' && typeof bv === 'number' ? av - bv : 0;
  return sort.dir === 'asc' ? base : -base;
};

const ProjectDetail = () => {
  const { projectId } = Route.useParams();
  const { index } = useDataSource();
  const summaries = useSummaries(index);

  const [search, setSearch] = useState('');
  const [selectedModels, setSelectedModels] = useState<ReadonlySet<string>>(NO_MODELS);
  const [sort, setSort] = useState<SortState<SortKey>>(DEFAULT_SORT);

  const onSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  }, []);
  const onToggleModel = useCallback((model: string) => {
    setSelectedModels(previous => {
      const next = new Set(previous);
      if (next.has(model)) next.delete(model);
      else next.add(model);
      return next;
    });
  }, []);
  const onClearModels = useCallback(() => {
    setSelectedModels(NO_MODELS);
  }, []);
  const onClearFilters = useCallback(() => {
    setSearch('');
    setSelectedModels(NO_MODELS);
  }, []);
  const onSort = useCallback((key: SortKey) => {
    setSort(previous => (previous.key === key ? { key, dir: previous.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: SORT_COLUMNS[key].initialDir }));
  }, []);

  const projectRows = useMemo(() => {
    if (summaries.rows === undefined) return;
    const result: SessionTableRow[] = [];
    for (const { project, session, summary } of summaries.rows) {
      if (project.encodedName !== projectId) continue;
      const startedMs = summary?.startedAt === undefined ? undefined : Date.parse(summary.startedAt);
      result.push({
        sessionId: session.sessionId,
        title: summary?.slug ?? summary?.firstUserPrompt ?? session.sessionId,
        startedAt: summary?.startedAt,
        startedMs: startedMs !== undefined && Number.isNaN(startedMs) ? undefined : startedMs,
        durationMs: summary?.durationMs,
        models: summary?.models ?? [],
        turns: summary?.userMessageCount,
        tools: sessionToolTotal(summary),
        outTokens: summary?.usage.outputTokens,
        cost: sessionCost(summary),
        agents: session.agents.length,
      });
    }
    return result;
  }, [summaries.rows, projectId]);

  const availableModels = useMemo(() => {
    const models = new Set<string>();
    for (const row of projectRows ?? []) for (const model of row.models) models.add(model);
    return [...models].sort();
  }, [projectRows]);

  const visibleRows = useMemo(() => {
    if (projectRows === undefined) return;
    const needle = search.trim().toLowerCase();
    let result = projectRows;
    if (needle !== '') result = result.filter(row => row.title.toLowerCase().includes(needle) || row.sessionId.toLowerCase().includes(needle));
    if (selectedModels.size > 0) result = result.filter(row => row.models.some(model => selectedModels.has(model)));
    return [...result].sort((a, b) => compareRows(a, b, sort));
  }, [projectRows, search, selectedModels, sort]);

  const project = index?.projects.find(p => p.encodedName === projectId);
  if (index === undefined || project === undefined) {
    return <p className='text-muted-foreground text-sm'>Project not found in the opened data.</p>;
  }
  if (projectRows === undefined || visibleRows === undefined) {
    return <SweepProgress progress={summaries.progress} sessionCount={index.sessionCount} />;
  }

  const filtered = search.trim() !== '' || selectedModels.size > 0;

  return (
    <div className='flex flex-col gap-4'>
      <div>
        <h1 className='text-xl font-semibold'>{project.label}</h1>
        <p className='text-muted-foreground font-mono text-xs'>{project.displayPath}</p>
      </div>
      <div className='flex flex-wrap items-center gap-2'>
        <Input value={search} onChange={onSearchChange} placeholder='Search sessions…' aria-label='Search sessions' className='w-64' />
        <ModelFilter models={availableModels} selected={selectedModels} onToggle={onToggleModel} onClear={onClearModels} />
        {filtered ? (
          <Button variant='ghost' size='sm' onClick={onClearFilters}>
            <X aria-hidden />
            Clear
          </Button>
        ) : null}
        <p className='text-muted-foreground ml-auto text-xs tabular-nums'>
          {filtered ? `${visibleRows.length} of ${projectRows.length}` : projectRows.length} sessions
        </p>
      </div>
      <div className='rounded-lg border'>
        <Table scrollRegionLabel={`Sessions in ${project.label}`}>
          <TableHeader>
            <TableRow>
              <SortableHead label='Session' sortKey='session' sort={sort} onSort={onSort} />
              <SortableHead label='Started' sortKey='started' sort={sort} onSort={onSort} />
              <SortableHead label='Duration' sortKey='duration' sort={sort} onSort={onSort} />
              <TableHead>Model</TableHead>
              <SortableHead label='Turns' sortKey='turns' sort={sort} onSort={onSort} align='right' />
              <SortableHead label='Tools' sortKey='tools' sort={sort} onSort={onSort} align='right' />
              <SortableHead label='Out tokens' sortKey='outTokens' sort={sort} onSort={onSort} align='right' />
              <SortableHead label='Est. cost' sortKey='cost' sort={sort} onSort={onSort} align='right' />
              <SortableHead label='Agents' sortKey='agents' sort={sort} onSort={onSort} align='right' />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className='text-muted-foreground h-24 text-center'>
                  No sessions match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.map(row => (
                <TableRow key={row.sessionId}>
                  <TableCell className='max-w-md'>
                    <SessionLink sessionId={row.sessionId} className='hover:underline'>
                      <span className='block truncate'>{row.title}</span>
                    </SessionLink>
                  </TableCell>
                  <TableCell className='text-muted-foreground whitespace-nowrap'>{formatDateTime(row.startedAt)}</TableCell>
                  <TableCell className='text-muted-foreground'>{formatDuration(row.durationMs)}</TableCell>
                  <TableCell>
                    <div className='flex gap-1'>
                      {row.models.map(model => (
                        <ModelBadge key={model} model={model} />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className='text-right tabular-nums'>{row.turns ?? '—'}</TableCell>
                  <TableCell className='text-right tabular-nums'>{row.tools}</TableCell>
                  <TableCell className='text-right tabular-nums'>{formatTokens(row.outTokens ?? 0)}</TableCell>
                  <TableCell className='text-right tabular-nums'>{formatUsd(row.cost)}</TableCell>
                  <TableCell className='text-right'>
                    {row.agents === 0 ? <span className='text-muted-foreground'>—</span> : <Badge variant='secondary'>{row.agents}</Badge>}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/_dashboard/projects/$projectId')({
  component: ProjectDetail,
});
