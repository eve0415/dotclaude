import type { TranscriptRow } from './build-rows';
import type { ReactNode } from 'react';

import { usageToTotals } from '@dotclaude/schemas/usage';
import { Badge } from '@dotclaude/ui/components/badge';
import { Button } from '@dotclaude/ui/components/button';
import { cn } from '@dotclaude/ui/lib/utils';
import { Bot, Brain, ChevronDown, Info, User, Wrench } from 'lucide-react';
import { useCallback, useState } from 'react';
import Markdown from 'react-markdown';

import { formatOffset, formatTokens } from '#lib/format';

import { ModelBadge } from '../../-shared/model-badge';

const COLLAPSED_RESULT_LINES = 24;

const Gutter = ({ offsetMs, icon }: { offsetMs: number | undefined; icon: ReactNode }) => (
  <div aria-hidden className='flex w-20 shrink-0 flex-col items-end gap-1 pt-1'>
    <span className='text-muted-foreground/70 font-mono text-[10px] tabular-nums'>{offsetMs === undefined ? '' : formatOffset(offsetMs)}</span>
    <span className='text-muted-foreground/50'>{icon}</span>
  </div>
);

const markdownClasses =
  'max-w-none text-sm leading-relaxed break-words [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_h1]:mt-3 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:my-2 [&_table]:text-xs [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5';

const Collapsible = ({ summary, children, defaultOpen = false }: { summary: ReactNode; children: ReactNode; defaultOpen?: boolean }) => {
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
        <ChevronDown aria-hidden className={cn('size-3.5 transition-transform', !open && '-rotate-90')} />
        {summary}
      </button>
      {open ? <div className='mt-2'>{children}</div> : null}
    </div>
  );
};

const TruncatedPre = ({ text, label, flat = false }: { text: string; label: string; flat?: boolean }) => {
  const [showAll, setShowAll] = useState(false);
  const expand = useCallback(() => {
    setShowAll(true);
  }, []);
  const lines = text.split('\n');
  const truncated = !showAll && lines.length > COLLAPSED_RESULT_LINES;
  const visible = truncated ? lines.slice(0, COLLAPSED_RESULT_LINES).join('\n') : text;
  return (
    <div>
      <pre className={cn('max-h-[32rem] overflow-auto font-mono text-xs leading-relaxed whitespace-pre-wrap', flat ? 'p-0' : 'bg-muted/60 rounded-md p-3')}>
        {visible}
      </pre>
      {truncated ? (
        <Button variant='ghost' size='sm' className='mt-1 h-6 text-xs' onClick={expand}>
          Show all {lines.length} lines of {label}
        </Button>
      ) : null}
    </div>
  );
};

const formatInput = (input: unknown): string => {
  if (typeof input === 'object' && input !== null) {
    // The common single-field tools read better unwrapped.
    if ('command' in input && typeof input.command === 'string' && Object.keys(input).length <= 2) return input.command;
    if ('file_path' in input && typeof input.file_path === 'string' && Object.keys(input).length === 1) return input.file_path;
  }
  return JSON.stringify(input, null, 2);
};

const ToolRowView = ({
  row,
  onOpenAgent,
  agentForToolUse,
}: {
  row: Extract<TranscriptRow, { kind: 'tool' }>;
  onOpenAgent: ((toolUseId: string) => void) | undefined;
  agentForToolUse: string | undefined;
}) => {
  const statusColor = row.result === undefined ? 'bg-muted-foreground/40' : row.isError ? 'bg-destructive' : 'bg-emerald-500';
  const openAgent = useCallback(() => {
    onOpenAgent?.(row.toolUseId);
  }, [onOpenAgent, row.toolUseId]);
  return (
    <div className='flex gap-3 py-1'>
      <Gutter offsetMs={row.offsetMs} icon={<Wrench className='size-3.5' />} />
      <div className='border-border bg-card min-w-0 flex-1 overflow-hidden rounded-lg border'>
        <div className='border-border/60 bg-muted/40 flex items-center gap-2 border-b px-3 py-1.5'>
          <span aria-hidden className={cn('size-2 rounded-full', statusColor)} />
          <span className='sr-only'>{row.result === undefined ? 'no result recorded' : row.isError ? 'failed' : 'succeeded'}</span>
          <span className='font-mono text-xs font-medium'>{row.name}</span>
          {agentForToolUse === undefined || onOpenAgent === undefined ? null : (
            <Button variant='outline' size='sm' className='ml-auto h-6 text-xs' onClick={openAgent}>
              ↳ open subagent
            </Button>
          )}
        </div>
        <div className='flex flex-col gap-3 p-3'>
          <TruncatedPre flat text={formatInput(row.input)} label='input' />
          {row.result === undefined || row.result === '' ? null : (
            <div className='border-border/60 border-t pt-2'>
              <Collapsible summary={<span>result · {row.result.split('\n').length} lines</span>}>
                <TruncatedPre flat text={row.result} label='result' />
              </Collapsible>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface TranscriptRowViewProps {
  row: TranscriptRow;
  onOpenAgent: ((toolUseId: string) => void) | undefined;
  /** agentId when this tool call spawned a subagent. */
  agentForToolUse: string | undefined;
}

export const TranscriptRowView = ({ row, onOpenAgent, agentForToolUse }: TranscriptRowViewProps) => {
  switch (row.kind) {
    case 'user':
      return (
        <article aria-label='User prompt' className='flex gap-3 py-3'>
          <Gutter offsetMs={row.offsetMs} icon={<User className='size-3.5' />} />
          <div className='border-primary/60 bg-primary/5 min-w-0 flex-1 rounded-lg border-l-2 px-4 py-3'>
            <p className='text-sm leading-relaxed font-medium break-words whitespace-pre-wrap'>{row.text}</p>
          </div>
        </article>
      );

    case 'assistant-text':
      return (
        <article aria-label='Assistant response' className='flex gap-3 py-2'>
          <Gutter offsetMs={row.offsetMs} icon={<Bot className='size-3.5' />} />
          <div className='min-w-0 flex-1 px-1'>
            <div className={markdownClasses}>
              <Markdown>{row.markdown}</Markdown>
            </div>
            {row.usage === undefined && row.model === undefined ? null : (
              <div className='mt-1 flex items-center gap-2'>
                {row.model === undefined ? null : <ModelBadge model={row.model} />}
                {row.usage === undefined ? null : (
                  <span className='text-muted-foreground/70 font-mono text-[10px]'>
                    {formatTokens(usageToTotals(row.usage).outputTokens)} out · {formatTokens(usageToTotals(row.usage).cacheReadTokens)} cache read
                  </span>
                )}
              </div>
            )}
          </div>
        </article>
      );

    case 'thinking':
      return (
        <div className='flex gap-3 py-1'>
          <Gutter offsetMs={row.offsetMs} icon={<Brain className='size-3.5' />} />
          <div className='border-border/60 bg-muted/30 min-w-0 flex-1 rounded-lg border-l-2 px-4 py-2'>
            <Collapsible summary={<span className='italic'>thinking · {formatTokens(Math.round(row.text.length / 4))} tokens approx.</span>}>
              <p className='text-muted-foreground text-xs leading-relaxed break-words whitespace-pre-wrap'>{row.text}</p>
            </Collapsible>
          </div>
        </div>
      );

    case 'tool':
      return <ToolRowView row={row} onOpenAgent={onOpenAgent} agentForToolUse={agentForToolUse} />;

    case 'meta':
      return (
        <div className='flex gap-3 py-1'>
          <Gutter offsetMs={row.offsetMs} icon={<Info className='size-3.5' />} />
          <div className='min-w-0 flex-1 px-1'>
            <Collapsible
              summary={
                <span className='flex items-center gap-1.5'>
                  <Badge variant='outline' className='text-[10px]'>
                    {row.label}
                  </Badge>
                  <span className='truncate opacity-60'>{(row.detail ?? '').slice(0, 80)}</span>
                </span>
              }
            >
              <p className='text-muted-foreground text-xs break-words whitespace-pre-wrap'>{row.detail}</p>
            </Collapsible>
          </div>
        </div>
      );
  }
};
