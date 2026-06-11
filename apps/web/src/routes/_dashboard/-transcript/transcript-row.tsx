import type { TranscriptRow } from './build-rows';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { usageToTotals } from '@dotclaude/schemas/usage';
import { Badge } from '@dotclaude/ui/components/badge';
import { Button } from '@dotclaude/ui/components/button';
import { cn } from '@dotclaude/ui/lib/utils';
import { BookOpen, Bot, Brain, Info, MessageSquareWarning, SquareSlash, SquareTerminal, User, Wrench } from 'lucide-react';
import { useCallback, useMemo } from 'react';

import { formatLineCount, formatOffset, formatTokens } from '#lib/format';

import { MarkdownBlock, markdownClasses } from '../../-shared/markdown-block';
import { ModelBadge } from '../../-shared/model-badge';

import { Collapsible, TruncatedPre } from './primitives';
import { ToolInputBody, parseToolInput, toolModel, toolSummary } from './tool-input';
import { ToolResultBody } from './tool-result';
import { ImageAttachment, ImageRefChip } from './transcript-image';

const Gutter = ({ offsetMs, icon }: { offsetMs: number | undefined; icon: ReactNode }) => (
  <div aria-hidden className='flex w-14 shrink-0 flex-col items-end gap-1 pt-1 sm:w-20'>
    <span className='text-muted-foreground font-mono text-[10px] tabular-nums'>{offsetMs === undefined ? '' : formatOffset(offsetMs)}</span>
    <span className='text-muted-foreground/50'>{icon}</span>
  </div>
);

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
  const parsed = useMemo(() => parseToolInput(row.name, row.input), [row.name, row.input]);
  const summary = toolSummary(parsed);
  const model = toolModel(parsed);
  const canOpenAgent = agentForToolUse !== undefined && onOpenAgent !== undefined;
  return (
    <div className='flex gap-3 py-1'>
      <Gutter offsetMs={row.offsetMs} icon={<Wrench className='size-3.5' />} />
      <div className='border-border bg-card min-w-0 flex-1 overflow-hidden rounded-lg border'>
        <div className='border-border/60 bg-muted/40 flex items-center gap-2 border-b px-3 py-1.5'>
          <span aria-hidden className={cn('size-2 shrink-0 rounded-full', statusColor)} />
          <span className='sr-only'>{row.result === undefined ? 'no result recorded' : row.isError ? 'failed' : 'succeeded'}</span>
          <span className='shrink-0 font-mono text-xs font-medium'>{row.name}</span>
          {summary === undefined ? null : <span className='text-muted-foreground min-w-0 truncate text-xs'>{summary}</span>}
          {model === undefined && !canOpenAgent ? null : (
            <span className='ml-auto flex shrink-0 items-center gap-1.5'>
              {model === undefined ? null : <ModelBadge model={model} />}
              {canOpenAgent ? (
                <Button variant='outline' size='sm' className='h-6 text-xs' onClick={openAgent}>
                  ↳ open subagent
                </Button>
              ) : null}
            </span>
          )}
        </div>
        <div className='flex flex-col gap-3 p-3'>
          <ToolInputBody parsed={parsed} />
          {row.result === undefined || row.result === '' ? null : (
            <div className='border-border/60 border-t pt-2'>
              <Collapsible summary={<span>result · {formatLineCount(row.result.split('\n').length)}</span>}>
                <ToolResultBody parsed={parsed} result={row.result} />
              </Collapsible>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const META_ICONS: Record<Extract<TranscriptRow, { kind: 'meta' }>['variant'], LucideIcon> = {
  caveat: MessageSquareWarning,
  reminder: Info,
  context: Info,
  skill: BookOpen,
  system: SquareTerminal,
  other: Info,
};

/** First meaningful line of the detail, for the collapsed summary. */
const metaPreview = (detail: string | undefined): string => {
  if (detail === undefined) return '';
  for (const line of detail.split('\n')) {
    const trimmed = line.trim();
    if (trimmed !== '') return trimmed;
  }
  return '';
};

/** Token boundary for `[Image #N]` references — split keeps the tokens as their own parts. */
const IMAGE_TOKEN_SPLIT_RE = /(\[Image #\d+\])/;
const IMAGE_TOKEN_RE = /^\[Image #(\d+)\]$/;

/** Prompt text with `[Image #N]` tokens swapped for clickable image chips. */
const UserPromptText = ({ row }: { row: Extract<TranscriptRow, { kind: 'user' }> }) => {
  if (row.images.length === 0) return row.text;
  const bySourceIndex = new Map(row.images.map(image => [image.index, image.sourcePath]));
  return row.text.split(IMAGE_TOKEN_SPLIT_RE).map((part, i) => {
    const index = IMAGE_TOKEN_RE.exec(part)?.[1];
    const sourcePath = index === undefined ? undefined : bySourceIndex.get(Number(index));
    const key = `${String(i)}:${part.slice(0, 24)}`;
    if (index !== undefined && sourcePath !== undefined) return <ImageRefChip key={key} index={Number(index)} sourcePath={sourcePath} />;
    return <span key={key}>{part}</span>;
  });
};

const MetaRowView = ({ row }: { row: Extract<TranscriptRow, { kind: 'meta' }> }) => {
  const Icon = META_ICONS[row.variant];
  return (
    <div className='flex gap-3 py-0.5'>
      <Gutter offsetMs={row.offsetMs} icon={<Icon className='size-3.5' />} />
      <div className='min-w-0 flex-1 px-1'>
        {row.detail === undefined || row.detail.trim() === '' ? (
          <p className='text-muted-foreground flex items-center gap-1.5 py-0.5 text-xs'>
            <Badge variant='outline' className='text-muted-foreground shrink-0 text-[10px]'>
              {row.label}
            </Badge>
            <span className='italic'>empty</span>
          </p>
        ) : (
          <Collapsible
            summary={
              <span className='flex min-w-0 flex-1 items-center gap-1.5'>
                <Badge variant='outline' className='text-muted-foreground shrink-0 text-[10px]'>
                  {row.label}
                </Badge>
                <span className='min-w-0 truncate'>{metaPreview(row.detail)}</span>
              </span>
            }
          >
            <div className='border-border/60 bg-muted/30 rounded-md border-l-2 px-3 py-2'>
              {row.imageSource === undefined ? (
                row.variant === 'skill' ? (
                  <div className={`${markdownClasses} max-h-[32rem] overflow-auto`}>
                    <MarkdownBlock markdown={row.detail} />
                  </div>
                ) : (
                  <TruncatedPre flat text={row.detail} label={row.label} className='text-muted-foreground' />
                )
              ) : (
                <ImageAttachment sourcePath={row.imageSource} label='pasted image' />
              )}
            </div>
          </Collapsible>
        )}
      </div>
    </div>
  );
};

const CommandRowView = ({ row }: { row: Extract<TranscriptRow, { kind: 'command' }> }) => (
  <div className='flex gap-3 py-1.5'>
    <Gutter offsetMs={row.offsetMs} icon={<SquareSlash className='size-3.5' />} />
    <div className='min-w-0 flex-1 px-1'>
      <p className='flex min-w-0 items-baseline gap-2 text-xs'>
        <span className='text-muted-foreground shrink-0'>ran</span>
        <code className='bg-muted shrink-0 rounded px-1.5 py-0.5 font-mono font-medium'>{row.name}</code>
        {row.args === undefined ? null : <span className='text-muted-foreground min-w-0 truncate font-mono'>{row.args}</span>}
      </p>
      {row.args !== undefined && row.args.length > 80 ? (
        <div className='mt-1.5'>
          <Collapsible summary={<span>full arguments</span>}>
            <TruncatedPre flat text={row.args} label='arguments' className='text-muted-foreground' />
          </Collapsible>
        </div>
      ) : null}
      {row.stdout === undefined ? null : (
        <div className='mt-1.5'>
          <Collapsible summary={<span>output · {formatLineCount(row.stdout.split('\n').length)}</span>}>
            <TruncatedPre text={row.stdout} label='output' />
          </Collapsible>
        </div>
      )}
    </div>
  </div>
);

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
            <p className='text-sm leading-relaxed font-medium break-words whitespace-pre-wrap'>
              <UserPromptText row={row} />
            </p>
            {row.images.length === 0 ? null : (
              <div className='mt-3 flex flex-wrap gap-2'>
                {row.images.map(image => (
                  <ImageAttachment key={image.index} sourcePath={image.sourcePath} label={`Image #${String(image.index)}`} />
                ))}
              </div>
            )}
          </div>
        </article>
      );

    case 'assistant-text':
      return (
        <article aria-label='Assistant response' className='flex gap-3 py-2'>
          <Gutter offsetMs={row.offsetMs} icon={<Bot className='size-3.5' />} />
          <div className='min-w-0 flex-1 px-1'>
            <div className={markdownClasses}>
              <MarkdownBlock markdown={row.markdown} />
            </div>
            {row.usage === undefined && row.model === undefined ? null : (
              <div className='mt-1 flex items-center gap-2'>
                {row.model === undefined ? null : <ModelBadge model={row.model} />}
                {row.usage === undefined ? null : (
                  <span className='text-muted-foreground font-mono text-[10px]'>
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

    case 'command':
      return <CommandRowView row={row} />;

    case 'meta':
      return <MetaRowView row={row} />;
  }
};
