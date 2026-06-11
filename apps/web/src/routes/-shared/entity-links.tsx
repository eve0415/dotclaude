import type { ReactNode } from 'react';

import { Link } from '@tanstack/react-router';
import { useMemo } from 'react';

/** Links with memoized `params` so list rows don't re-render on every parent render. */

export const SessionLink = ({ sessionId, className, children }: { sessionId: string; className?: string; children: ReactNode }) => {
  const params = useMemo(() => ({ sessionId }), [sessionId]);
  return (
    <Link to='/sessions/$sessionId' params={params} className={className}>
      {children}
    </Link>
  );
};

export const ProjectLink = ({ projectId, className, children }: { projectId: string; className?: string; children: ReactNode }) => {
  const params = useMemo(() => ({ projectId }), [projectId]);
  return (
    <Link to='/projects/$projectId' params={params} className={className}>
      {children}
    </Link>
  );
};
