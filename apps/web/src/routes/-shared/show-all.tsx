import { Button } from '@dotclaude/ui/components/button';
import { useCallback, useState } from 'react';

/** Collapse-at-N-lines state shared by code blocks, truncated pres, and diffs. */
export const useTruncated = (lineCount: number, limit = 24): { visibleCount: number; truncated: boolean; expand: () => void } => {
  const [showAll, setShowAll] = useState(false);
  const expand = useCallback(() => {
    setShowAll(true);
  }, []);
  const truncated = !showAll && lineCount > limit;
  return { visibleCount: truncated ? limit : lineCount, truncated, expand };
};

export const ShowAllButton = ({ count, label, onClick }: { count: number; label: string; onClick: () => void }) => (
  <Button variant='ghost' size='sm' className='mt-1 h-6 text-xs' onClick={onClick}>
    Show all {count} {label}
  </Button>
);
