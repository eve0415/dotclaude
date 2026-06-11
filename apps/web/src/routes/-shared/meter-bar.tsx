import { useMemo } from 'react';

/** Tiny horizontal proportion bar (tool frequency lists, progress). Purely decorative — pair with visible numbers. */
export const MeterBar = ({ fraction }: { fraction: number }) => {
  const style = useMemo(() => ({ width: `${Math.max(0, Math.min(1, fraction)) * 100}%` }), [fraction]);
  return (
    <div aria-hidden className='bg-muted h-2 flex-1 overflow-hidden rounded-full'>
      <div className='bg-primary/70 h-full rounded-full' style={style} />
    </div>
  );
};
