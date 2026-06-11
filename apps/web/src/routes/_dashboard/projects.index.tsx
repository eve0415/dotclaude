import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@dotclaude/ui/components/card';
import { createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';

import { useDataSource } from '#lib/data/data-source';
import { formatRelativeTime, formatTokens, formatUsd } from '#lib/format';

import { ProjectLink } from '../-shared/entity-links';
import { sessionCost } from '../-shared/session-cost';
import { SweepProgress } from '../-shared/sweep-progress';
import { useSummaries } from '../-shared/use-summaries';

const ProjectsIndex = () => {
  const { index } = useDataSource();
  const summaries = useSummaries(index);
  const { rows } = summaries;

  const perProject = useMemo(() => {
    if (rows === undefined || index === undefined) return;
    // One pass over all rows, grouped by project — not one scan per project card.
    const byProject = new Map<string, { outputTokens: number; cost: number | undefined }>();
    for (const row of rows) {
      if (row.summary === undefined) continue;
      let acc = byProject.get(row.project.encodedName);
      if (acc === undefined) {
        acc = { outputTokens: 0, cost: undefined };
        byProject.set(row.project.encodedName, acc);
      }
      acc.outputTokens += row.summary.usage.outputTokens;
      const cost = sessionCost(row.summary);
      if (cost !== undefined) acc.cost = (acc.cost ?? 0) + cost;
    }
    return index.projects.map(project => {
      const acc = byProject.get(project.encodedName);
      return { project, outputTokens: acc?.outputTokens ?? 0, cost: acc?.cost };
    });
  }, [rows, index]);

  if (index === undefined) return null;
  if (perProject === undefined) return <SweepProgress progress={summaries.progress} sessionCount={index.sessionCount} />;

  return (
    <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
      <h1 className='sr-only'>Projects</h1>
      {perProject.map(({ project, outputTokens, cost }) => (
        <ProjectLink key={project.encodedName} projectId={project.encodedName} className='group'>
          <Card className='group-hover:border-primary/50 h-full transition-colors'>
            <CardHeader>
              <CardTitle className='truncate text-base'>{project.label}</CardTitle>
              <CardDescription className='truncate font-mono text-xs'>{project.displayPath}</CardDescription>
            </CardHeader>
            <CardContent className='text-muted-foreground flex items-center gap-4 text-xs'>
              <span>{project.sessions.length} sessions</span>
              <span>{formatTokens(outputTokens)} out</span>
              <span>{formatUsd(cost)}</span>
              <span className='ml-auto'>{formatRelativeTime(project.sessions[0]?.entry.lastModified)}</span>
            </CardContent>
          </Card>
        </ProjectLink>
      ))}
    </div>
  );
};

export const Route = createFileRoute('/_dashboard/projects/')({
  component: ProjectsIndex,
});
