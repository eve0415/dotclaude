import { Skeleton } from '@dotclaude/ui/components/skeleton';

/** Shown while the worker sweeps the directory for session summaries. */
export const SweepProgress = ({ progress, sessionCount }: { progress: number; sessionCount: number }) => {
  const percent = Math.round(progress * 100);
  return (
    <div aria-live='polite' className='flex flex-col gap-4'>
      <div>
        <p className='text-sm font-medium'>Reading {sessionCount} sessions…</p>
        <p className='text-muted-foreground text-xs'>Parsing happens in a local worker — nothing leaves your browser.</p>
      </div>
      <progress
        value={percent}
        max={100}
        aria-label='Parsing sessions'
        className='[&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary h-1.5 w-full max-w-md appearance-none overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-[var(--muted)] [&::-webkit-progress-value]:transition-[width] [&::-webkit-progress-value]:duration-300'
      />
      <div className='grid gap-3 sm:grid-cols-3'>
        <Skeleton className='h-24 rounded-lg' />
        <Skeleton className='h-24 rounded-lg' />
        <Skeleton className='h-24 rounded-lg' />
      </div>
    </div>
  );
};
