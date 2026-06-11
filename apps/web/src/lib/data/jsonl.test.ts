import { describe, expect, it } from 'vitest';

import { streamLines } from './jsonl';

const collect = async (file: File): Promise<string[]> => {
  const lines: string[] = [];
  for await (const line of streamLines(file)) lines.push(line);
  return lines;
};

/** A File whose stream yields the given chunks verbatim, so boundaries land exactly where the test puts them. */
const chunkedFile = (chunks: string[]): File => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  const file = new File([chunks.join('')], 'test.jsonl');
  // jsdom's File has no stream() — substitute one with controlled chunk boundaries.
  Object.defineProperty(file, 'stream', { value: () => stream });
  return file;
};

describe('streamLines', () => {
  it('yields each line of a single-chunk file', async () => {
    await expect(collect(chunkedFile(['{"a":1}\n{"b":2}\n']))).resolves.toEqual(['{"a":1}', '{"b":2}']);
  });

  it('reassembles a line split across chunk boundaries mid-token', async () => {
    await expect(collect(chunkedFile(['{"type":"assist', 'ant","n":1}\n{"ty', 'pe":"user"}\n']))).resolves.toEqual([
      '{"type":"assistant","n":1}',
      '{"type":"user"}',
    ]);
  });

  it('yields a final line without a trailing newline', async () => {
    await expect(collect(chunkedFile(['{"a":1}\n{"b"', ':2}']))).resolves.toEqual(['{"a":1}', '{"b":2}']);
  });

  it('skips blank lines, including consecutive newlines across chunks', async () => {
    await expect(collect(chunkedFile(['{"a":1}\n\n', '\n{"b":2}\n\n']))).resolves.toEqual(['{"a":1}', '{"b":2}']);
  });

  it('handles a chunk boundary exactly on a newline', async () => {
    await expect(collect(chunkedFile(['{"a":1}\n', '{"b":2}\n']))).resolves.toEqual(['{"a":1}', '{"b":2}']);
  });

  it('handles an empty file', async () => {
    await expect(collect(chunkedFile([]))).resolves.toEqual([]);
  });

  it('carries a line spanning more than two chunks', async () => {
    await expect(collect(chunkedFile(['{"long', '":"val', 'ue"}\n']))).resolves.toEqual(['{"long":"value"}']);
  });
});
