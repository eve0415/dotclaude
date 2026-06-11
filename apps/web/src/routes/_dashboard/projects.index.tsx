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
    return index.projects.map(project => {
      let outputTokens = 0;
      let cost: number | undefined;
      for (const row of rows) {
        if (row.project.encodedName !== project.encodedName || row.summary === undefined) continue;
        outputTokens += row.summary.usage.outputTokens;
        const c = sessionCost(row.summary);
        if (c !== undefined) cost = (cost ?? 0) + c;
      }
      return { project, outputTokens, cost };
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
