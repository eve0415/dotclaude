import type { AgentFileRef, ClaudeIndex, SessionFileRef } from '#lib/data/scan';

import { summarizeSession } from '@dotclaude/schemas/session';
import { Badge } from '@dotclaude/ui/components/badge';
import { Input } from '@dotclaude/ui/components/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@dotclaude/ui/components/sheet';
import { Toggle } from '@dotclaude/ui/components/toggle';
import { useQueries, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Brain, Info, Wrench } from 'lucide-react';
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
  agent: z.string().optional(),
});

interface RowFilters {
  thinking: boolean;
  tools: boolean;
  meta: boolean;
}

const EMPTY_AGENT_MAP: ReadonlyMap<string, string> = new Map();

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

const AgentDrawer = ({ session, agentId, onClose }: { session: SessionFileRef; agentId: string; onClose: () => void }) => {
  const agent = session.agents.find(a => a.agentId === agentId);
  const records = useQuery({ ...sessionRecordsQuery(agent?.entry ?? MISSING_FILE_ENTRY), enabled: agent !== undefined });
  const meta = useQuery({ ...agentMetaQuery(agent?.metaEntry ?? MISSING_FILE_ENTRY), enabled: agent?.metaEntry !== undefined });
  const rows = useMemo(() => buildRows(records.data ?? []), [records.data]);

  const onOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose],
  );

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent side='right' className='flex w-full flex-col sm:max-w-3xl'>
        <SheetHeader>
          <SheetTitle className='font-mono text-sm'>
            ↳ subagent {agentId}
            {meta.data?.agentType === undefined ? '' : ` · ${meta.data.agentType}`}
          </SheetTitle>
          <SheetDescription>{meta.data?.description ?? 'Subagent transcript'}</SheetDescription>
        </SheetHeader>
        {records.isPending ? (
          <p className='text-muted-foreground p-4 text-sm'>Parsing subagent transcript…</p>
        ) : (
          <TranscriptView rows={rows} agentsByToolUse={EMPTY_AGENT_MAP} onOpenAgent={undefined} className='min-h-0 flex-1 overflow-y-auto px-4 pb-6' />
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

const SessionDetail = () => {
  const { sessionId } = Route.useParams();
  const { agent: openAgentId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { index } = useDataSource();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<RowFilters>({ thinking: true, tools: true, meta: false });

  const found = findSession(index, sessionId);
  const records = useQuery({ ...sessionRecordsQuery(found?.session.entry ?? MISSING_FILE_ENTRY), enabled: found !== undefined });
  const agentsByToolUse = useAgentMap(found?.session.agents ?? []);
  const summary = useMemo(() => (records.data === undefined ? undefined : summarizeSession(records.data)), [records.data]);

  const allRows = useMemo(() => buildRows(records.data ?? []), [records.data]);
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
  const onOpenAgent = useCallback(
    (toolUseId: string) => {
      const agentId = agentsByToolUse.get(toolUseId);
      if (agentId !== undefined) void navigate({ search: { agent: agentId } });
    },
    [agentsByToolUse, navigate],
  );
  const onCloseAgent = useCallback(() => {
    void navigate({ search: {} });
  }, [navigate]);

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

      <div className='flex flex-wrap items-center gap-2'>
        <Input value={search} onChange={onSearchChange} placeholder='Search this session…' aria-label='Search transcript' className='h-8 max-w-xs' />
        <Toggle size='sm' pressed={filters.thinking} onPressedChange={onToggleThinking} aria-label='Show thinking blocks'>
          <Brain aria-hidden /> thinking
        </Toggle>
        <Toggle size='sm' pressed={filters.tools} onPressedChange={onToggleTools} aria-label='Show tool calls'>
          <Wrench aria-hidden /> tools
        </Toggle>
        <Toggle size='sm' pressed={filters.meta} onPressedChange={onToggleMeta} aria-label='Show injected context'>
          <Info aria-hidden /> meta
        </Toggle>
        <span className='text-muted-foreground ml-auto text-xs tabular-nums'>{rows.length} rows</span>
      </div>

      {records.isPending ? (
        <p className='text-muted-foreground text-sm'>Parsing transcript…</p>
      ) : (
        <TranscriptView rows={rows} agentsByToolUse={agentsByToolUse} onOpenAgent={onOpenAgent} />
      )}

      {openAgentId === undefined ? null : <AgentDrawer session={session} agentId={openAgentId} onClose={onCloseAgent} />}
    </div>
  );
};

export const Route = createFileRoute('/_dashboard/sessions/$sessionId')({
  validateSearch: searchSchema,
  component: SessionDetail,
});
