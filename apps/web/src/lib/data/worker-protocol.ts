import type { HistoryEntry } from '@dotclaude/schemas/history';
import type { SessionSummary } from '@dotclaude/schemas/session';
import type { TranscriptRecord } from '@dotclaude/schemas/transcript';

export type { HistoryEntry, SessionSummary, TranscriptRecord };

export type WorkerOp =
  | { kind: 'parse-session'; file: File }
  | { kind: 'summarize-many'; files: { key: string; file: File }[] }
  | { kind: 'parse-history'; file: File };

export interface WorkerRequest {
  requestId: number;
  op: WorkerOp;
}

export type WorkerResult =
  | { kind: 'records'; records: TranscriptRecord[] }
  | { kind: 'summaries'; summaries: { key: string; summary: SessionSummary }[] }
  | { kind: 'history'; entries: HistoryEntry[] };

export type WorkerResponse =
  | { type: 'result'; requestId: number; result: WorkerResult }
  | { type: 'progress'; requestId: number; done: number; total: number }
  | { type: 'error'; requestId: number; message: string };
