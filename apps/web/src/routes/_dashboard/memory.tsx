import type { ProjectRef } from '#lib/data/scan';

import { Badge } from '@dotclaude/ui/components/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@dotclaude/ui/components/card';
import { Tabs, TabsList, TabsTrigger } from '@dotclaude/ui/components/tabs';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useState } from 'react';

import { useDataSource } from '#lib/data/data-source';
import { projectMemoryQuery } from '#lib/data/queries';

import { MarkdownBlock } from '../-shared/markdown-block';

const typeVariant = (memoryType: string | undefined): 'default' | 'secondary' | 'outline' => {
  if (memoryType === 'feedback') return 'default';
  if (memoryType === 'project') return 'secondary';
  return 'outline';
};

const ProjectMemories = ({ project }: { project: ProjectRef }) => {
  const memories = useQuery(projectMemoryQuery(project));

  if (memories.isPending) return <p className='text-muted-foreground text-sm'>Reading memory files…</p>;
  const files = (memories.data ?? []).filter(({ entry }) => entry.name !== 'MEMORY.md');
  if (files.length === 0) return <p className='text-muted-foreground text-sm'>No memory files in this project.</p>;

  return (
    <div className='grid gap-4 xl:grid-cols-2'>
      {files.map(({ entry, memory }) => (
        <Card key={entry.path}>
          <CardHeader>
            <div className='flex items-center justify-between gap-2'>
              <CardTitle className='truncate font-mono text-sm'>{memory.name ?? entry.name}</CardTitle>
              {memory.memoryType === undefined ? null : <Badge variant={typeVariant(memory.memoryType)}>{memory.memoryType}</Badge>}
            </div>
            {memory.description === undefined ? null : <CardDescription>{memory.description}</CardDescription>}
          </CardHeader>
          <CardContent>
            <div className='prose-sm text-foreground/90 max-w-none text-sm leading-relaxed [&_code]:font-mono [&_code]:text-xs [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5'>
              <MarkdownBlock markdown={memory.body} />
            </div>
            {memory.links.length === 0 ? null : (
              <div className='mt-3 flex flex-wrap gap-1.5'>
                {memory.links.map(link => (
                  <Badge key={link} variant='outline' className='font-mono text-[10px]'>
                    {link}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const MemoryPage = () => {
  const { index } = useDataSource();
  const projectsWithMemory = (index?.projects ?? []).filter(project => project.memoryFiles.length > 0);
  const [selected, setSelected] = useState<string | undefined>();
  const onSelect = useCallback((value: unknown) => {
    if (typeof value === 'string') setSelected(value);
  }, []);

  if (projectsWithMemory.length === 0) {
    return (
      <div className='py-16 text-center'>
        <h1 className='text-sm font-medium'>No memories found</h1>
        <p className='text-muted-foreground mt-1 text-xs'>
          Memory files live in <span className='font-mono'>projects/&lt;project&gt;/memory/</span> — none of the opened projects have any yet.
        </p>
      </div>
    );
  }

  const active = projectsWithMemory.find(p => p.encodedName === selected) ?? projectsWithMemory[0];
  if (active === undefined) return null;

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='sr-only'>Memory</h1>
      <Tabs value={active.encodedName} onValueChange={onSelect}>
        <TabsList>
          {projectsWithMemory.map(project => (
            <TabsTrigger key={project.encodedName} value={project.encodedName}>
              {project.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <ProjectMemories project={active} />
    </div>
  );
};

export const Route = createFileRoute('/_dashboard/memory')({
  component: MemoryPage,
});
