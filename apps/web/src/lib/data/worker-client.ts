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
    // Without this, a worker that fails to load (bundling error, CSP block) would
    // leave every in-flight promise pending forever and the UI stuck on spinners.
    worker.addEventListener('error', event => {
      this.#failAll(worker, event.message === '' ? 'Parse worker failed to start' : event.message);
    });
    // A response that can't be structured-cloned back has the same hang-forever failure mode.
    worker.addEventListener('messageerror', () => {
      this.#failAll(worker, 'Parse worker response could not be deserialized');
    });
    return worker;
  }

  #failAll(worker: Worker, message: string): void {
    const error = new Error(message);
    for (const pending of this.#pending.values()) pending.reject(error);
    this.#pending.clear();
    worker.terminate();
    this.#worker = undefined;
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
    if (result.kind !== 'records') throw new Error(`Unexpected worker result: ${result.kind}`);
    return result.records;
  }

  async summarizeMany(files: { key: string; file: File }[], onProgress?: (done: number, total: number) => void): Promise<Map<string, SessionSummary>> {
    const result = await this.#request({ kind: 'summarize-many', files }, onProgress);
    if (result.kind !== 'summaries') throw new Error(`Unexpected worker result: ${result.kind}`);
    const map = new Map<string, SessionSummary>();
    for (const { key, summary } of result.summaries) map.set(key, summary);
    return map;
  }

  async parseHistory(file: File): Promise<HistoryEntry[]> {
    const result = await this.#request({ kind: 'parse-history', file });
    if (result.kind !== 'history') throw new Error(`Unexpected worker result: ${result.kind}`);
    return result.entries;
  }
}

export const parseWorker = new ParseWorkerClient();
