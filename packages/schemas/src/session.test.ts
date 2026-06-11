import type { TranscriptRecord } from './transcript';

import { describe, expect, it } from 'vitest';

import { summarizeSession } from './session';
import { parseTranscriptLine } from './transcript';

const parse = (value: object): TranscriptRecord => {
  const record = parseTranscriptLine(JSON.stringify(value));
  if (record === undefined) throw new Error('fixture did not parse');
  return record;
};

const fixtureRecords = (): TranscriptRecord[] => [
  parse({
    type: 'user',
    uuid: 'u0',
    sessionId: 's1',
    timestamp: '2026-06-10T01:00:00.000Z',
    isMeta: true,
    message: { role: 'user', content: '<local-command-caveat>noise</local-command-caveat>' },
  }),
  parse({
    type: 'user',
    uuid: 'u1',
    sessionId: 's1',
    timestamp: '2026-06-10T01:00:05.000Z',
    cwd: '/workspaces/demo',
    gitBranch: 'main',
    version: '2.1.172',
    message: { role: 'user', content: 'fix the failing build' },
  }),
  parse({
    type: 'assistant',
    uuid: 'a1',
    sessionId: 's1',
    timestamp: '2026-06-10T01:00:10.000Z',
    slug: 'fix-failing-build',
    message: {
      model: 'claude-opus-4-6',
      role: 'assistant',
      content: [
        { type: 'text', text: 'Running the build.' },
        { type: 'tool_use', id: 'toolu_1', name: 'Bash', input: { command: 'pnpm build' } },
      ],
      usage: { input_tokens: 10, output_tokens: 100, cache_creation_input_tokens: 1000, cache_read_input_tokens: 5000 },
    },
  }),
  parse({
    type: 'user',
    uuid: 'u2',
    sessionId: 's1',
    timestamp: '2026-06-10T01:00:20.000Z',
    message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'error TS2322', is_error: true }] },
  }),
  parse({
    type: 'assistant',
    uuid: 'a2',
    sessionId: 's1',
    timestamp: '2026-06-10T01:01:00.000Z',
    message: {
      model: 'claude-haiku-4-5',
      role: 'assistant',
      content: [{ type: 'tool_use', id: 'toolu_2', name: 'Edit', input: { file_path: '/x.ts' } }],
      usage: { input_tokens: 5, output_tokens: 50, cache_creation_input_tokens: 0, cache_read_input_tokens: 200 },
    },
  }),
];

describe('summarizeSession', () => {
  it('aggregates ids, timing, models, usage, and tool counts', () => {
    const summary = summarizeSession(fixtureRecords());
    expect(summary.sessionId).toBe('s1');
    expect(summary.slug).toBe('fix-failing-build');
    expect(summary.firstUserPrompt).toBe('fix the failing build');
    expect(summary.startedAt).toBe('2026-06-10T01:00:00.000Z');
    expect(summary.endedAt).toBe('2026-06-10T01:01:00.000Z');
    expect(summary.durationMs).toBe(60_000);
    expect(summary.models.sort()).toEqual(['claude-haiku-4-5', 'claude-opus-4-6']);
    expect(summary.usage.inputTokens).toBe(15);
    expect(summary.usage.outputTokens).toBe(150);
    expect(summary.usage.cacheReadTokens).toBe(5200);
    expect(summary.usageByModel['claude-opus-4-6']?.outputTokens).toBe(100);
    expect(summary.toolCounts).toEqual({ Bash: 1, Edit: 1 });
    expect(summary.userMessageCount).toBe(1);
    expect(summary.assistantMessageCount).toBe(2);
    expect(summary.gitBranch).toBe('main');
    expect(summary.cwd).toBe('/workspaces/demo');
  });

  it('counts block-content human turns but not tool results', () => {
    const records = [
      ...fixtureRecords(),
      parse({
        type: 'user',
        uuid: 'u3',
        sessionId: 's1',
        timestamp: '2026-06-10T01:02:00.000Z',
        message: { role: 'user', content: [{ type: 'text', text: 'also fix the lint warnings' }] },
      }),
    ];
    expect(summarizeSession(records).userMessageCount).toBe(2);
  });

  it('handles an empty record list', () => {
    const summary = summarizeSession([]);
    expect(summary.sessionId).toBeUndefined();
    expect(summary.durationMs).toBeUndefined();
    expect(summary.models).toEqual([]);
  });
});
