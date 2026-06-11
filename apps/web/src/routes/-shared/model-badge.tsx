import { Badge } from '@dotclaude/ui/components/badge';
import { cn } from '@dotclaude/ui/lib/utils';
import { useMemo } from 'react';

import { shortModelName } from '#lib/format';

/** Stable hue per model family so charts and badges agree. */
export const modelColorVar = (model: string): string => {
  if (model.includes('opus')) return 'var(--chart-2)';
  if (model.includes('sonnet')) return 'var(--chart-3)';
  if (model.includes('haiku')) return 'var(--chart-1)';
  if (model.includes('fable') || model.includes('mythos')) return 'var(--chart-4)';
  return 'var(--chart-5)';
};

export const ModelBadge = ({ model, className }: { model: string; className?: string }) => {
  const dotStyle = useMemo(() => ({ backgroundColor: modelColorVar(model) }), [model]);
  return (
    <Badge variant='outline' className={cn('shrink-0 gap-1.5 font-mono text-[11px] font-normal', className)}>
      <span aria-hidden className='size-1.5 rounded-full' style={dotStyle} />
      {shortModelName(model)}
    </Badge>
  );
};
