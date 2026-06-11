import type { AnsiSegment } from '#lib/ansi';
import type { ReactNode } from 'react';

import { Button } from '@dotclaude/ui/components/button';
import { cn } from '@dotclaude/ui/lib/utils';
import { ChevronDown } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { hasAnsi, parseAnsi } from '#lib/ansi';

const COLLAPSED_RESULT_LINES = 24;

const segmentClass = (segment: AnsiSegment): string | undefined =>
  cn(segment.bold && 'font-semibold', segment.dim && 'opacity-60', segment.italic && 'italic', segment.underline && 'underline') || undefined;

/** Styled text for output that carries ANSI escapes — bold et al. render, the bytes never do. */
export const AnsiText = ({ text }: { text: string }) => {
  const segments = useMemo(() => parseAnsi(text), [text]);
  return segments.map((segment, i) => (
    // Index keys are fine: segments are derived solely from `text` and never reorder.
    <span key={`${String(i)}:${segment.text.slice(0, 16)}`} className={segmentClass(segment)}>
      {segment.text}
    </span>
  ));
};

export const Collapsible = ({ summary, children, defaultOpen = false }: { summary: ReactNode; children: ReactNode; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = useCallback(() => {
    setOpen(value => !value);
  }, []);
  return (
    <div>
      <button
        type='button'
        aria-expanded={open}
        onClick={toggle}
        className='text-muted-foreground hover:text-foreground flex w-full items-center gap-1.5 text-left text-xs'
      >
        <ChevronDown aria-hidden className={cn('size-3.5 shrink-0 transition-transform', !open && '-rotate-90')} />
        {summary}
      </button>
      {open ? <div className='mt-2'>{children}</div> : null}
    </div>
  );
};

export const TruncatedPre = ({ text, label, flat = false, className }: { text: string; label: string; flat?: boolean; className?: string }) => {
  const [showAll, setShowAll] = useState(false);
  const expand = useCallback(() => {
    setShowAll(true);
  }, []);
  const lines = text.split('\n');
  const truncated = !showAll && lines.length > COLLAPSED_RESULT_LINES;
  const visible = truncated ? lines.slice(0, COLLAPSED_RESULT_LINES).join('\n') : text;
  return (
    <div className='min-w-0'>
      <pre
        className={cn(
          'max-h-[32rem] overflow-auto font-mono text-xs leading-relaxed whitespace-pre-wrap',
          flat ? 'p-0' : 'bg-muted/60 rounded-md p-3',
          className,
        )}
      >
        {hasAnsi(visible) ? <AnsiText text={visible} /> : visible}
      </pre>
      {truncated ? (
        <Button variant='ghost' size='sm' className='mt-1 h-6 text-xs' onClick={expand}>
          Show all {lines.length} lines of {label}
        </Button>
      ) : null}
    </div>
  );
};
