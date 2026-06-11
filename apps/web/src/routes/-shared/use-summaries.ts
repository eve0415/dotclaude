import type { ClaudeIndex, ProjectRef, SessionFileRef } from '#lib/data/scan';
import type { SessionSummary } from '@dotclaude/schemas/session';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { sessionSummariesQuery } from '#lib/data/queries';

export interface SessionRow {
  project: ProjectRef;
  session: SessionFileRef;
  summary: SessionSummary | undefined;
}

interface SummariesState {
  rows: SessionRow[] | undefined;
  isLoading: boolean;
  error: Error | null;
  /** Sweep progress while the worker chews through the directory, 0..1. */
  progress: number;
}

/** All session summaries for the open index, with worker progress for the first sweep. */
export const useSummaries = (index: ClaudeIndex): SummariesState => {
  const [progress, setProgress] = useState(0);
  const query = useQuery(
    sessionSummariesQuery(index, (done, total) => {
      setProgress(total === 0 ? 1 : done / total);
    }),
  );
  return { rows: query.data, isLoading: query.isPending, error: query.error, progress };
};
