import type { useDataSource } from '#lib/data/data-source';
import type { DragEvent } from 'react';

import { Badge } from '@dotclaude/ui/components/badge';
import { Button } from '@dotclaude/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@dotclaude/ui/components/card';
import { Kbd } from '@dotclaude/ui/components/kbd';
import { cn } from '@dotclaude/ui/lib/utils';
import { FileJson2, FolderOpen, HardDriveDownload, History, ShieldCheck, WifiOff } from 'lucide-react';
import { useCallback, useState } from 'react';

import { GithubLink, GithubMark } from '../-shared/github-link';

type DataSourceValue = ReturnType<typeof useDataSource>;

interface OnboardingScreenProps {
  dataSource: DataSourceValue;
  error: string | undefined;
  runOpen: (open: () => Promise<boolean>) => Promise<void>;
}

const privacyPoints = [
  {
    icon: ShieldCheck,
    title: 'Nothing is uploaded',
    body: 'Your transcripts are read directly by your browser and parsed in a local worker. No file content ever leaves this tab.',
  },
  {
    icon: WifiOff,
    title: 'Works offline',
    body: 'Once the page is loaded you can disconnect from the network entirely — every view keeps working.',
  },
  {
    icon: HardDriveDownload,
    title: 'Read-only',
    body: 'The directory is opened with read-only permission. Nothing in ~/.claude is ever modified.',
  },
] as const;

export const OnboardingScreen = ({ dataSource, error, runOpen }: OnboardingScreenProps) => {
  const [dragging, setDragging] = useState(false);
  const { directoryPickerSupported, canRestore, restoreName } = dataSource;

  const onReconnect = useCallback(() => {
    void runOpen(dataSource.restoreLast);
  }, [runOpen, dataSource.restoreLast]);
  const onOpenDirectory = useCallback(() => {
    void runOpen(dataSource.openDirectory);
  }, [runOpen, dataSource.openDirectory]);
  const onOpenDirectoryFallback = useCallback(() => {
    void runOpen(dataSource.openDirectoryFallback);
  }, [runOpen, dataSource.openDirectoryFallback]);
  const onOpenFiles = useCallback(() => {
    void runOpen(dataSource.openFiles);
  }, [runOpen, dataSource.openFiles]);
  const onOpenDemo = useCallback(() => {
    void runOpen(dataSource.openDemo);
  }, [runOpen, dataSource.openDemo]);

  const onDrop = useCallback(
    (event: DragEvent<HTMLElement>): void => {
      event.preventDefault();
      setDragging(false);
      void runOpen(() => dataSource.openDropped(event.dataTransfer));
    },
    [runOpen, dataSource],
  );
  const onDragOver = useCallback((event: DragEvent<HTMLElement>): void => {
    event.preventDefault();
    setDragging(true);
  }, []);
  const onDragLeave = useCallback((): void => {
    setDragging(false);
  }, []);

  return (
    <main
      aria-label='Open your Claude Code data'
      className={cn('flex min-h-screen flex-col items-center justify-center px-6 py-16', dragging && 'bg-accent/40')}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className='w-full max-w-3xl'>
        <div className='mb-10 text-center'>
          <div className='bg-primary text-primary-foreground mx-auto mb-6 flex size-12 items-center justify-center rounded-xl font-mono text-lg font-bold'>
            ~/
          </div>
          <h1 className='text-3xl font-semibold tracking-tight'>Visualize your Claude Code activity, locally.</h1>
          <p className='text-muted-foreground mx-auto mt-3 max-w-xl text-balance'>
            Sessions, tool calls, subagents, token spend, and memories from <span className='font-mono text-sm'>~/.claude</span> — processed 100% in your
            browser.
          </p>
        </div>

        <div className='mb-8 grid gap-3 sm:grid-cols-3'>
          {privacyPoints.map(point => (
            <Card key={point.title} className='border-border/60'>
              <CardHeader className='pb-2'>
                <point.icon aria-hidden className='text-primary mb-1 size-5' />
                <CardTitle className='text-sm'>{point.title}</CardTitle>
              </CardHeader>
              <CardContent className='text-muted-foreground pt-0 text-xs leading-relaxed'>{point.body}</CardContent>
            </Card>
          ))}
        </div>

        {canRestore ? (
          <Card className='border-primary/40 mb-6'>
            <CardHeader className='flex-row items-center justify-between'>
              <div>
                <CardTitle className='text-base'>Welcome back</CardTitle>
                <CardDescription>
                  Reconnect to <span className='font-mono'>{restoreName ?? 'your last directory'}</span> — one click, no picker.
                </CardDescription>
              </div>
              <Button onClick={onReconnect}>
                <History aria-hidden /> Reconnect
              </Button>
            </CardHeader>
          </Card>
        ) : null}

        <div className='grid gap-3 sm:grid-cols-2'>
          <Card className={cn('transition-colors', dragging && 'border-primary')}>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-base'>
                <FolderOpen aria-hidden className='size-4' /> Open a directory
              </CardTitle>
              <CardDescription>
                Your whole <span className='font-mono'>~/.claude</span> directory, or a single project directory under{' '}
                <span className='font-mono'>projects/</span>. You can also drag &amp; drop it anywhere on this page.
              </CardDescription>
            </CardHeader>
            <CardContent className='flex flex-col gap-2'>
              {directoryPickerSupported ? (
                <Button onClick={onOpenDirectory}>Choose directory…</Button>
              ) : (
                <>
                  <Button onClick={onOpenDirectoryFallback}>Choose directory…</Button>
                  <p className='text-muted-foreground text-xs'>
                    Your browser doesn&apos;t support the File System Access API, so reconnect-on-return and live rescan are unavailable — files are loaded once
                    via the standard picker. Chrome, Edge, and Arc support the full experience.
                  </p>
                </>
              )}
              <p className='text-muted-foreground text-xs'>
                Hidden folders are invisible in the system picker by default — on macOS press <Kbd>⌘</Kbd>
                <Kbd>⇧</Kbd>
                <Kbd>.</Kbd> inside the picker to reveal <span className='font-mono'>.claude</span>.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-base'>
                <FileJson2 aria-hidden className='size-4' /> Open session files
              </CardTitle>
              <CardDescription>
                One or more <span className='font-mono'>&lt;session-id&gt;.jsonl</span> transcripts — useful for inspecting a single conversation someone sent
                you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant='outline' onClick={onOpenFiles}>
                Choose .jsonl files…
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className='text-muted-foreground mt-6 text-center text-sm'>
          No data handy?{' '}
          <Button variant='link' className='h-auto p-0 text-sm' onClick={onOpenDemo}>
            Explore with demo data
          </Button>
        </p>

        {error === undefined ? null : (
          <p role='alert' className='text-destructive mt-4 text-sm'>
            {error}
          </p>
        )}

        <p className='text-muted-foreground mt-10 text-center text-xs'>
          <GithubLink className='mr-2 align-middle'>
            <Badge variant='outline' className='hover:border-primary/50 hover:text-foreground gap-1.5 transition-colors'>
              <GithubMark className='size-3' />
              open source
            </Badge>
          </GithubLink>
          Server-side rendering only serves this page shell — auditable, self-hostable, zero telemetry.
        </p>
      </div>
    </main>
  );
};
