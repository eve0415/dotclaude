import { Badge } from '@dotclaude/ui/components/badge';
import { Button } from '@dotclaude/ui/components/button';
import { Checkbox } from '@dotclaude/ui/components/checkbox';
import { Label } from '@dotclaude/ui/components/label';
import { Popover, PopoverContent, PopoverTrigger } from '@dotclaude/ui/components/popover';
import { TableHead } from '@dotclaude/ui/components/table';
import { cn } from '@dotclaude/ui/lib/utils';
import { ArrowDown, ArrowUp, ChevronsUpDown, ListFilter } from 'lucide-react';
import { useCallback, useMemo } from 'react';

import { shortModelName } from '#lib/format';

import { modelColorVar } from './model-badge';

export type SortDirection = 'asc' | 'desc';

export interface SortState<K extends string> {
  key: K;
  dir: SortDirection;
}

interface SortableHeadProps<K extends string> {
  label: string;
  sortKey: K;
  sort: SortState<K>;
  onSort: (key: K) => void;
  align?: 'left' | 'right';
}

/** Column header that toggles sort on click; sets aria-sort on the active column. */
export const SortableHead = <K extends string>({ label, sortKey, sort, onSort, align = 'left' }: SortableHeadProps<K>) => {
  const onClick = useCallback(() => {
    onSort(sortKey);
  }, [onSort, sortKey]);
  const active = sort.key === sortKey;
  const Arrow = active ? (sort.dir === 'asc' ? ArrowUp : ArrowDown) : ChevronsUpDown;
  return (
    <TableHead aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined} className={align === 'right' ? 'text-right' : undefined}>
      <button
        type='button'
        onClick={onClick}
        className={cn(
          'hover:text-foreground -mx-1 inline-flex cursor-pointer items-center gap-1 rounded-sm px-1 py-0.5 transition-colors',
          align === 'right' && 'flex-row-reverse',
          active ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {label}
        <Arrow aria-hidden className={cn('size-3', active ? 'opacity-100' : 'opacity-40')} />
      </button>
    </TableHead>
  );
};

interface ModelFilterItemProps {
  model: string;
  checked: boolean;
  onToggle: (model: string) => void;
}

const ModelFilterItem = ({ model, checked, onToggle }: ModelFilterItemProps) => {
  const onCheckedChange = useCallback(() => {
    onToggle(model);
  }, [onToggle, model]);
  const dotStyle = useMemo(() => ({ backgroundColor: modelColorVar(model) }), [model]);
  return (
    <Label className='hover:bg-muted -mx-1 cursor-pointer rounded-md px-2 py-1.5 font-normal'>
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
      <span aria-hidden className='size-1.5 shrink-0 rounded-full' style={dotStyle} />
      <span className='truncate font-mono text-xs'>{shortModelName(model)}</span>
    </Label>
  );
};

interface ModelFilterProps {
  models: string[];
  selected: ReadonlySet<string>;
  onToggle: (model: string) => void;
  onClear: () => void;
}

/** Faceted multi-select over the models present in the current table. */
export const ModelFilter = ({ models, selected, onToggle, onClear }: ModelFilterProps) => (
  <Popover>
    <PopoverTrigger render={<Button variant='outline' size='sm' />}>
      <ListFilter aria-hidden />
      Model
      {selected.size > 0 ? (
        <Badge variant='secondary' className='px-1.5 tabular-nums'>
          {selected.size}
        </Badge>
      ) : null}
    </PopoverTrigger>
    <PopoverContent align='start' className='w-60 gap-1 p-3'>
      <p className='text-muted-foreground px-1 pb-1 text-xs font-medium'>Filter by model</p>
      {models.map(model => (
        <ModelFilterItem key={model} model={model} checked={selected.has(model)} onToggle={onToggle} />
      ))}
      {selected.size > 0 ? (
        <Button variant='ghost' size='xs' onClick={onClear} className='mt-1'>
          Clear selection
        </Button>
      ) : null}
    </PopoverContent>
  </Popover>
);
