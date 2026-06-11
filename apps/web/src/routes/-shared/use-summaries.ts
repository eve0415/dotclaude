import type { ClaudeIndex, ProjectRef, SessionFileRef } from '#lib/data/scan';
import type { UsageEvent } from '@dotclaude/schemas/aggregate';
import type { SessionSummary } from '@dotclaude/schemas/session';

import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

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

const EMPTY_INDEX: ClaudeIndex = { rootKind: 'project-dir', projects: [], historyEntry: undefined, sessionCount: 0, totalSessionBytes: 0 };

/**
 * All session summaries for the open index, with worker progress for the first
 * sweep. TanStack Query caches the queryFn from its first run, so the progress
 * callback must never go stale — `setProgress` from useState is identity-stable
 * across renders, which makes this closure safe to cache.
 */
export const useSummaries = (index: ClaudeIndex | undefined): SummariesState => {
  const [progress, setProgress] = useState(0);
  const onProgress = useCallback((done: number, total: number) => {
    setProgress(total === 0 ? 1 : done / total);
  }, []);
  const query = useQuery(sessionSummariesQuery(index ?? EMPTY_INDEX, onProgress));
  return { rows: query.data, isLoading: query.isPending, error: query.error, progress };
};

/** One usage event per (session, model) pair — input for `aggregateUsage`. */
export const usageEvents = (rows: SessionRow[]): UsageEvent[] => {
  const events: UsageEvent[] = [];
  for (const row of rows) {
    if (row.summary?.startedAt === undefined) continue;
    for (const [model, usage] of Object.entries(row.summary.usageByModel)) {
      events.push({ timestamp: row.summary.startedAt, model, usage });
    }
  }
  return events;
};
