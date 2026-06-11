import type { ReactNode } from 'react';

import { useMemo } from 'react';

/** Absolutely-positioned row wrapper for @tanstack/react-virtual lists, with stable style identity. */
export const VirtualItem = ({
  index,
  start,
  measure,
  className,
  children,
}: {
  index: number;
  start: number;
  measure: (element: Element | null) => void;
  className?: string;
  children: ReactNode;
}) => {
  const style = useMemo(() => ({ transform: `translateY(${start}px)` }), [start]);
  return (
    <div data-index={index} ref={measure} className={className ?? 'absolute inset-x-0'} style={style}>
      {children}
    </div>
  );
};

/** Stable height style for the virtual list spacer element. */
export const useTotalSizeStyle = (totalSize: number) => useMemo(() => ({ height: totalSize }), [totalSize]);
