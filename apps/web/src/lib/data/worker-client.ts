import type { HistoryEntry, SessionSummary, TranscriptRecord, WorkerOp, WorkerResponse, WorkerResult } from './worker-protocol';

interface Pending {
  resolve: (result: WorkerResult) => void;
  reject: (error: Error) => void;
  onProgress: ((done: number, total: number) => void) | undefined;
}

/** Thin promise RPC over the parse worker. One shared worker per tab is plenty. */
class ParseWorkerClient {
  #worker: Worker | undefined;
  #pending = new Map<number, Pending>();
  #nextId = 1;

  #ensureWorker(): Worker {
    this.#worker ??= this.#createWorker();
    return this.#worker;
  }

  #createWorker(): Worker {
    const worker = new Worker(new URL('./parse.worker.ts', import.meta.url), { type: 'module' });
    worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      const pending = this.#pending.get(response.requestId);
      if (pending === undefined) return;
      if (response.type === 'progress') {
        pending.onProgress?.(response.done, response.total);
        return;
      }
      this.#pending.delete(response.requestId);
      if (response.type === 'result') pending.resolve(response.result);
      else pending.reject(new Error(response.message));
    });
    return worker;
  }

  #request(op: WorkerOp, onProgress?: (done: number, total: number) => void): Promise<WorkerResult> {
    const requestId = this.#nextId;
    this.#nextId += 1;
    return new Promise<WorkerResult>((resolve, reject) => {
      this.#pending.set(requestId, { resolve, reject, onProgress });
      this.#ensureWorker().postMessage({ requestId, op });
    });
  }

  async parseSession(file: File): Promise<TranscriptRecord[]> {
    const result = await this.#request({ kind: 'parse-session', file });
    return result.kind === 'records' ? result.records : [];
  }

  async summarizeMany(files: { key: string; file: File }[], onProgress?: (done: number, total: number) => void): Promise<Map<string, SessionSummary>> {
    const result = await this.#request({ kind: 'summarize-many', files }, onProgress);
    const map = new Map<string, SessionSummary>();
    if (result.kind === 'summaries') {
      for (const { key, summary } of result.summaries) map.set(key, summary);
    }
    return map;
  }

  async parseHistory(file: File): Promise<HistoryEntry[]> {
    const result = await this.#request({ kind: 'parse-history', file });
    return result.kind === 'history' ? result.entries : [];
  }
}

export const parseWorker = new ParseWorkerClient();
