import type { AgentFileRef, ClaudeIndex, SessionFileRef } from '#lib/data/scan';
import type { TranscriptRow } from './-transcript/build-rows';
import type { ReactNode } from 'react';

import { summarizeSession } from '@dotclaude/schemas/session';
import { Badge } from '@dotclaude/ui/components/badge';
import { Input } from '@dotclaude/ui/components/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@dotclaude/ui/components/sheet';
import { Toggle } from '@dotclaude/ui/components/toggle';
import { useQueries, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Brain, ChevronRight, Info, Wrench } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { z } from 'zod';

import { useDataSource } from '#lib/data/data-source';
import { MISSING_FILE_ENTRY } from '#lib/data/file-entry';
import { agentMetaQuery, sessionRecordsQuery } from '#lib/data/queries';
import { formatDateTime, formatDuration, formatTokens, formatUsd } from '#lib/format';

import { ModelBadge } from '../-shared/model-badge';
import { sessionCost } from '../-shared/session-cost';

import { buildRows, rowMatches } from './-transcript/build-rows';
import { TranscriptView } from './-transcript/transcript-view';

const searchSchema = z.object({
  /** Open subagent drawer: path from the main transcript down to the visible agent. */
  agent: z.array(z.string()).optional(),
});

interface RowFilters {
  thinking: boolean;
  tools: boolean;
  meta: boolean;
}

const findSession = (index: ClaudeIndex | undefined, sessionId: string) => {
  let found: { project: ClaudeIndex['projects'][number]; session: SessionFileRef } | undefined;
  for (const project of index?.projects ?? []) {
    const session = project.sessions.find(s => s.sessionId === sessionId);
    if (session !== undefined) {
      found = { project, session };
      break;
    }
  }
  return found;
};

const AgentCrumb = ({ label, depth, onNavigate }: { label: string; depth: number; onNavigate: (depth: number) => void }) => {
  const onClick = useCallback(() => {
    onNavigate(depth);
  }, [onNavigate, depth]);
  return (
    <button type='button' onClick={onClick} className='hover:text-foreground max-w-40 truncate underline-offset-2 hover:underline'>
      {label}
    </button>
  );
};

/**
 * Right-hand drawer showing one agent transcript. Agents can spawn agents —
 * the `path` is the spawn chain from the session root; the last entry is shown
 * and the rest become breadcrumbs.
 */
const AgentDrawer = ({
  session,
  path,
  agentsByToolUse,
  onNavigatePath,
  onClose,
}: {
  session: SessionFileRef;
  path: string[];
  agentsByToolUse: ReadonlyMap<string, string>;
  onNavigatePath: (path: string[]) => void;
  onClose: () => void;
}) => {
  const agentId = path.at(-1) ?? '';
  const agent = session.agents.find(a => a.agentId === agentId);
  const records = useQuery({ ...sessionRecordsQuery(agent?.entry ?? MISSING_FILE_ENTRY), enabled: agent !== undefined });
  const meta = useQuery({ ...agentMetaQuery(agent?.metaEntry ?? MISSING_FILE_ENTRY), enabled: agent?.metaEntry !== undefined });
  const pathAgents = useMemo(() => path.map(id => session.agents.find(a => a.agentId === id)), [path, session.agents]);
  const crumbMetas = useQueries({
    queries: pathAgents.map(a => agentMetaQuery(a?.metaEntry ?? MISSING_FILE_ENTRY)),
    combine: results => results.map(result => result.data),
  });
  const rows = useMemo(() => buildRows(records.data ?? []), [records.data]);

  const onOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose],
  );
  const onOpenChild = useCallback(
    (toolUseId: string) => {
      const childId = agentsByToolUse.get(toolUseId);
      if (childId !== undefined) onNavigatePath([...path, childId]);
    },
    [agentsByToolUse, onNavigatePath, path],
  );
  const onCrumb = useCallback(
    (depth: number) => {
      onNavigatePath(path.slice(0, depth + 1));
    },
    [onNavigatePath, path],
  );

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent side='right' className='flex w-full flex-col sm:max-w-3xl'>
        <SheetHeader>
          {path.length < 2 ? null : (
            <nav aria-label='Agent chain' className='text-muted-foreground flex flex-wrap items-center gap-1 text-xs'>
              {path.slice(0, -1).map((id, depth) => (
                <span key={id} className='flex items-center gap-1'>
                  <AgentCrumb label={crumbMetas[depth]?.description ?? crumbMetas[depth]?.agentType ?? id} depth={depth} onNavigate={onCrumb} />
                  <ChevronRight aria-hidden className='size-3' />
                </span>
              ))}
              <span aria-current='page' className='text-foreground max-w-40 truncate'>
                {meta.data?.description ?? agentId}
              </span>
            </nav>
          )}
          <SheetTitle className='text-sm'>↳ {meta.data?.description ?? `subagent ${agentId}`}</SheetTitle>
          <SheetDescription className='font-mono text-xs'>
            agent-{agentId}
            {meta.data?.agentType === undefined ? '' : ` · ${meta.data.agentType}`}
          </SheetDescription>
        </SheetHeader>
        {agent === undefined ? (
          <p className='text-muted-foreground p-4 text-sm'>This agent is not present in the opened data.</p>
        ) : records.isPending ? (
          <p className='text-muted-foreground p-4 text-sm'>Parsing subagent transcript…</p>
        ) : (
          <TranscriptView rows={rows} agentsByToolUse={agentsByToolUse} onOpenAgent={onOpenChild} className='min-h-0 flex-1 overflow-y-auto px-4 pb-6' />
        )}
      </SheetContent>
    </Sheet>
  );
};

const useAgentMap = (agents: AgentFileRef[]): ReadonlyMap<string, string> => {
  const withMeta = useMemo(() => agents.filter(agent => agent.metaEntry !== undefined), [agents]);
  const metaQueries = useQueries({
    queries: withMeta.map(agent => agentMetaQuery(agent.metaEntry ?? agent.entry)),
    combine: results => results.map(result => result.data),
  });
  return useMemo(() => {
    const map = new Map<string, string>();
    for (const [i, meta] of metaQueries.entries()) {
      const agent = withMeta[i];
      if (agent !== undefined && meta?.toolUseId !== undefined) map.set(meta.toolUseId, agent.agentId);
    }
    return map;
  }, [withMeta, metaQueries]);
};

interface KindCounts {
  thinking: number;
  tools: number;
  meta: number;
}

const countKinds = (rows: TranscriptRow[]): KindCounts => {
  const counts: KindCounts = { thinking: 0, tools: 0, meta: 0 };
  for (const row of rows) {
    if (row.kind === 'thinking') counts.thinking += 1;
    else if (row.kind === 'tool') counts.tools += 1;
    else if (row.kind === 'meta') counts.meta += 1;
  }
  return counts;
};

const FILTER_TOGGLE_CLASSES = 'text-muted-foreground border border-transparent aria-pressed:border-border aria-pressed:text-foreground';

const FilterToggle = ({
  pressed,
  onPressedChange,
  icon,
  label,
  count,
  description,
}: {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  icon: ReactNode;
  label: string;
  count: number;
  description: string;
}) => (
  <Toggle
    size='sm'
    pressed={pressed}
    onPressedChange={onPressedChange}
    aria-label={`${pressed ? 'Hide' : 'Show'} ${description}`}
    title={`${pressed ? 'Hide' : 'Show'} ${description} (${String(count)} in this session)`}
    className={FILTER_TOGGLE_CLASSES}
    disabled={count === 0}
  >
    {icon} {label}
    <span className='text-muted-foreground font-mono text-[10px] tabular-nums'>{count}</span>
  </Toggle>
);

const SessionDetail = () => {
  const { sessionId } = Route.useParams();
  const { agent: agentPath } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { index } = useDataSource();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<RowFilters>({ thinking: true, tools: true, meta: false });

  const found = findSession(index, sessionId);
  const records = useQuery({ ...sessionRecordsQuery(found?.session.entry ?? MISSING_FILE_ENTRY), enabled: found !== undefined });
  const agentsByToolUse = useAgentMap(found?.session.agents ?? []);
  const summary = useMemo(() => (records.data === undefined ? undefined : summarizeSession(records.data)), [records.data]);

  const allRows = useMemo(() => buildRows(records.data ?? []), [records.data]);
  const counts = useMemo(() => countKinds(allRows), [allRows]);
  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return allRows.filter(row => {
      if (row.kind === 'thinking' && !filters.thinking) return false;
      if (row.kind === 'tool' && !filters.tools) return false;
      if (row.kind === 'meta' && !filters.meta) return false;
      if (needle !== '' && !rowMatches(row, needle)) return false;
      return true;
    });
  }, [allRows, search, filters]);

  const onSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  }, []);
  const onToggleThinking = useCallback((pressed: boolean) => {
    setFilters(f => ({ ...f, thinking: pressed }));
  }, []);
  const onToggleTools = useCallback((pressed: boolean) => {
    setFilters(f => ({ ...f, tools: pressed }));
  }, []);
  const onToggleMeta = useCallback((pressed: boolean) => {
    setFilters(f => ({ ...f, meta: pressed }));
  }, []);
  const onNavigatePath = useCallback(
    (path: string[]) => {
      void navigate({ search: path.length === 0 ? {} : { agent: path } });
    },
    [navigate],
  );
  const onOpenAgent = useCallback(
    (toolUseId: string) => {
      const agentId = agentsByToolUse.get(toolUseId);
      if (agentId !== undefined) onNavigatePath([agentId]);
    },
    [agentsByToolUse, onNavigatePath],
  );
  const onCloseAgent = useCallback(() => {
    onNavigatePath([]);
  }, [onNavigatePath]);

  if (found === undefined) {
    return <p className='text-muted-foreground text-sm'>Session not found in the opened data.</p>;
  }
  const { project, session } = found;

  return (
    <div className='flex h-[calc(100vh-8rem)] flex-col gap-4'>
      <header className='flex flex-col gap-2'>
        <h1 className='truncate text-lg font-semibold'>{summary?.slug ?? summary?.firstUserPrompt ?? sessionId}</h1>
        <div className='text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs'>
          <span className='font-mono'>{project.displayPath}</span>
          <span>{formatDateTime(summary?.startedAt)}</span>
          <span>{formatDuration(summary?.durationMs)}</span>
          {summary?.gitBranch === undefined ? null : (
            <Badge variant='outline' className='font-mono text-[10px]'>
              {summary.gitBranch}
            </Badge>
          )}
          {(summary?.models ?? []).map(model => (
            <ModelBadge key={model} model={model} />
          ))}
          <span className='tabular-nums'>{formatTokens(summary?.usage.outputTokens ?? 0)} out</span>
          <span className='tabular-nums'>{formatUsd(sessionCost(summary))}</span>
          {session.agents.length === 0 ? null : <span>{session.agents.length} subagents</span>}
        </div>
      </header>

      <fieldset aria-label='Transcript filters' className='flex flex-wrap items-center gap-2'>
        <Input value={search} onChange={onSearchChange} placeholder='Search this session…' aria-label='Search transcript' className='h-8 max-w-xs' />
        <FilterToggle
          pressed={filters.thinking}
          onPressedChange={onToggleThinking}
          icon={<Brain aria-hidden />}
          label='thinking'
          count={counts.thinking}
          description="the assistant's internal reasoning blocks"
        />
        <FilterToggle
          pressed={filters.tools}
          onPressedChange={onToggleTools}
          icon={<Wrench aria-hidden />}
          label='tools'
          count={counts.tools}
          description='tool calls and their results'
        />
        <FilterToggle
          pressed={filters.meta}
          onPressedChange={onToggleMeta}
          icon={<Info aria-hidden />}
          label='meta'
          count={counts.meta}
          description='injected context and system records'
        />
        <span className='text-muted-foreground ml-auto text-xs tabular-nums' aria-live='polite'>
          {rows.length} of {allRows.length} rows
        </span>
      </fieldset>

      {records.isPending ? (
        <p className='text-muted-foreground text-sm'>Parsing transcript…</p>
      ) : (
        <TranscriptView rows={rows} agentsByToolUse={agentsByToolUse} onOpenAgent={onOpenAgent} />
      )}

      {agentPath === undefined || agentPath.length === 0 ? null : (
        <AgentDrawer session={session} path={agentPath} agentsByToolUse={agentsByToolUse} onNavigatePath={onNavigatePath} onClose={onCloseAgent} />
      )}
    </div>
  );
};

export const Route = createFileRoute('/_dashboard/sessions/$sessionId')({
  validateSearch: searchSchema,
  component: SessionDetail,
});
