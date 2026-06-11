import type { SessionSummary, TranscriptRecord } from './worker-protocol';
import type { WorkerRequest, WorkerResponse } from './worker-protocol';

import { parseHistoryLine } from '@dotclaude/schemas/history';
import { summarizeSession } from '@dotclaude/schemas/session';
import { parseTranscriptLine } from '@dotclaude/schemas/transcript';

import { streamLines } from './jsonl';

/**
 * All JSONL parsing runs here, off the main thread — a 4MB transcript parse or a
 * 300-session aggregate sweep must never block scrolling. Files arrive via
 * structured clone (cheap: File is a handle, not a byte copy).
 */

const parseFile = async (file: File): Promise<TranscriptRecord[]> => {
  const records: TranscriptRecord[] = [];
  for await (const line of streamLines(file)) {
    const record = parseTranscriptLine(line);
    if (record !== undefined) records.push(record);
  }
  return records;
};

const summarizeFiles = async (files: { key: string; file: File }[], post: (response: WorkerResponse) => void, requestId: number): Promise<void> => {
  const summaries: { key: string; summary: SessionSummary }[] = [];
  let done = 0;
  for (const { key, file } of files) {
    summaries.push({ key, summary: summarizeSession(await parseFile(file)) });
    done += 1;
    if (done % 5 === 0 || done === files.length) {
      post({ type: 'progress', requestId, done, total: files.length });
    }
  }
  post({ type: 'result', requestId, result: { kind: 'summaries', summaries } });
};

const handle = async (request: WorkerRequest, post: (response: WorkerResponse) => void): Promise<void> => {
  switch (request.op.kind) {
    case 'parse-session': {
      post({ type: 'result', requestId: request.requestId, result: { kind: 'records', records: await parseFile(request.op.file) } });
      return;
    }
    case 'summarize-many': {
      await summarizeFiles(request.op.files, post, request.requestId);
      return;
    }
    case 'parse-history': {
      const entries = [];
      for await (const line of streamLines(request.op.file)) {
        const entry = parseHistoryLine(line);
        if (entry !== undefined) entries.push(entry);
      }
      post({ type: 'result', requestId: request.requestId, result: { kind: 'history', entries } });
    }
  }
};

const post = (response: WorkerResponse): void => {
  globalThis.postMessage(response);
};

const onMessage = async (event: MessageEvent<WorkerRequest>): Promise<void> => {
  try {
    await handle(event.data, post);
  } catch (error) {
    post({ type: 'error', requestId: event.data.requestId, message: error instanceof Error ? error.message : String(error) });
  }
};

globalThis.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  void onMessage(event);
});
