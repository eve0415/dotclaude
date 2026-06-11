import type { TranscriptRow } from './build-rows';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

import { VirtualItem, useTotalSizeStyle } from '../../-shared/virtual-item';

import { TranscriptRowView } from './transcript-row';

interface TranscriptViewProps {
  rows: TranscriptRow[];
  /** toolUseId → agentId for tool calls that spawned subagents. */
  agentsByToolUse: ReadonlyMap<string, string>;
  onOpenAgent: ((toolUseId: string) => void) | undefined;
  className?: string;
}

/**
 * Virtualized transcript — only the visible window is in the DOM, so a 4MB
 * session scrolls smoothly. Rows self-measure (markdown and tool output vary
 * wildly in height).
 */
export const TranscriptView = ({ rows, agentsByToolUse, onOpenAgent, className }: TranscriptViewProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 120,
    overscan: 8,
  });
  const spacerStyle = useTotalSizeStyle(virtualizer.getTotalSize());

  if (rows.length === 0) {
    return <p className='text-muted-foreground py-12 text-center text-sm'>Nothing matches the current filters.</p>;
  }

  return (
    <div ref={scrollRef} className={className ?? 'min-h-0 flex-1 overflow-y-auto'}>
      <div className='relative' style={spacerStyle}>
        {virtualizer.getVirtualItems().map(item => {
          const row = rows[item.index];
          if (row === undefined) return null;
          return (
            <VirtualItem key={row.id} index={item.index} start={item.start} measure={virtualizer.measureElement}>
              <TranscriptRowView row={row} onOpenAgent={onOpenAgent} agentForToolUse={row.kind === 'tool' ? agentsByToolUse.get(row.toolUseId) : undefined} />
            </VirtualItem>
          );
        })}
      </div>
    </div>
  );
};
