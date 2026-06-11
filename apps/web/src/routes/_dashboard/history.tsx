import { Input } from '@dotclaude/ui/components/input';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';

import { useDataSource } from '#lib/data/data-source';
import { historyQuery } from '#lib/data/queries';
import { formatDateTime } from '#lib/format';

import { VirtualItem, useTotalSizeStyle } from '../-shared/virtual-item';

const HistoryPage = () => {
  const { index } = useDataSource();
  const historyEntry = index?.historyEntry;
  const query = useQuery(historyQuery(historyEntry));
  const [filter, setFilter] = useState('');
  const deferredFilter = useDeferredValue(filter);
  const scrollRef = useRef<HTMLDivElement>(null);

  const onFilterChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(event.target.value);
  }, []);

  // Sort once per dataset, with lowercased haystacks; the per-keystroke memo only filters.
  const sorted = useMemo(
    () =>
      [...(query.data ?? [])]
        .sort((a, b) => b.timestamp - a.timestamp)
        .map(entry => ({ entry, haystack: `${entry.display}\n${entry.project ?? ''}`.toLowerCase() })),
    [query.data],
  );
  const entries = useMemo(() => {
    const needle = deferredFilter.trim().toLowerCase();
    const matched = needle === '' ? sorted : sorted.filter(item => item.haystack.includes(needle));
    return matched.map(item => item.entry);
  }, [sorted, deferredFilter]);

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 64,
    overscan: 10,
  });
  const spacerStyle = useTotalSizeStyle(virtualizer.getTotalSize());

  if (historyEntry === undefined) {
    return (
      <div className='py-16 text-center'>
        <h1 className='text-sm font-medium'>No prompt history</h1>
        <p className='text-muted-foreground mt-1 text-xs'>
          <span className='font-mono'>history.jsonl</span> is only present when the whole <span className='font-mono'>~/.claude</span> directory is opened.
        </p>
      </div>
    );
  }

  return (
    <div className='flex h-[calc(100vh-8rem)] flex-col gap-3'>
      <h1 className='sr-only'>Prompt history</h1>
      <Input value={filter} onChange={onFilterChange} placeholder='Filter prompts or projects…' aria-label='Filter prompt history' className='max-w-md' />
      <p className='text-muted-foreground text-xs'>{entries.length} prompts</p>
      <div ref={scrollRef} className='min-h-0 flex-1 overflow-y-auto rounded-lg border'>
        <div className='relative' style={spacerStyle}>
          {virtualizer.getVirtualItems().map(item => {
            const entry = entries[item.index];
            if (entry === undefined) return null;
            return (
              <VirtualItem key={item.key} index={item.index} start={item.start} measure={virtualizer.measureElement} className='absolute inset-x-0'>
                <div className='border-border/60 border-b px-4 py-2'>
                  <p className='truncate font-mono text-sm'>{entry.display}</p>
                  <p className='text-muted-foreground text-xs'>
                    {entry.project ?? 'unknown project'} · {formatDateTime(entry.timestamp)}
                  </p>
                </div>
              </VirtualItem>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/_dashboard/history')({
  component: HistoryPage,
});
