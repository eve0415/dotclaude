import { Badge } from '@dotclaude/ui/components/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@dotclaude/ui/components/table';
import { createFileRoute } from '@tanstack/react-router';

import { useDataSource } from '#lib/data/data-source';
import { formatDateTime, formatDuration, formatTokens, formatUsd } from '#lib/format';

import { SessionLink } from '../-shared/entity-links';
import { ModelBadge } from '../-shared/model-badge';
import { sessionCost, sessionToolTotal } from '../-shared/session-cost';
import { SweepProgress } from '../-shared/sweep-progress';
import { useSummaries } from '../-shared/use-summaries';

const ProjectDetail = () => {
  const { projectId } = Route.useParams();
  const { index } = useDataSource();
  const summaries = useSummaries(index);

  const project = index?.projects.find(p => p.encodedName === projectId);
  if (index === undefined || project === undefined) {
    return <p className='text-muted-foreground text-sm'>Project not found in the opened data.</p>;
  }
  if (summaries.rows === undefined) return <SweepProgress progress={summaries.progress} sessionCount={index.sessionCount} />;

  const rows = summaries.rows.filter(row => row.project.encodedName === projectId);

  return (
    <div className='flex flex-col gap-4'>
      <div>
        <h1 className='text-xl font-semibold'>{project.label}</h1>
        <p className='text-muted-foreground font-mono text-xs'>{project.displayPath}</p>
      </div>
      <div className='rounded-lg border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Model</TableHead>
              <TableHead className='text-right'>Turns</TableHead>
              <TableHead className='text-right'>Tools</TableHead>
              <TableHead className='text-right'>Out tokens</TableHead>
              <TableHead className='text-right'>Est. cost</TableHead>
              <TableHead className='text-right'>Agents</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ session, summary }) => {
              const toolTotal = sessionToolTotal(summary);
              const cost = sessionCost(summary);
              return (
                <TableRow key={session.sessionId}>
                  <TableCell className='max-w-md'>
                    <SessionLink sessionId={session.sessionId} className='hover:underline'>
                      <span className='block truncate'>{summary?.slug ?? summary?.firstUserPrompt ?? session.sessionId}</span>
                    </SessionLink>
                  </TableCell>
                  <TableCell className='text-muted-foreground whitespace-nowrap'>{formatDateTime(summary?.startedAt)}</TableCell>
                  <TableCell className='text-muted-foreground'>{formatDuration(summary?.durationMs)}</TableCell>
                  <TableCell>
                    <div className='flex gap-1'>
                      {summary?.models.map(model => (
                        <ModelBadge key={model} model={model} />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className='text-right tabular-nums'>{summary?.userMessageCount ?? '—'}</TableCell>
                  <TableCell className='text-right tabular-nums'>{toolTotal}</TableCell>
                  <TableCell className='text-right tabular-nums'>{formatTokens(summary?.usage.outputTokens ?? 0)}</TableCell>
                  <TableCell className='text-right tabular-nums'>{formatUsd(cost)}</TableCell>
                  <TableCell className='text-right'>
                    {session.agents.length === 0 ? (
                      <span className='text-muted-foreground'>—</span>
                    ) : (
                      <Badge variant='secondary'>{session.agents.length}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/_dashboard/projects/$projectId')({
  component: ProjectDetail,
});
