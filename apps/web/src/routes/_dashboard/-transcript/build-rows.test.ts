import type { TranscriptRow } from './build-rows';
import type { TranscriptRecord } from '@dotclaude/schemas/transcript';

import { parseTranscriptLine } from '@dotclaude/schemas/transcript';
import { describe, expect, it } from 'vitest';

import { buildRows, rowMatches, toolResultText } from './build-rows';

const toolRows = (rows: TranscriptRow[]) => rows.flatMap(r => (r.kind === 'tool' ? [r] : []));
const assistantTextRows = (rows: TranscriptRow[]) => rows.flatMap(r => (r.kind === 'assistant-text' ? [r] : []));

const commandRow = (row: TranscriptRow | undefined) => {
  if (row?.kind !== 'command') throw new Error('expected a command row');
  return row;
};

const metaRow = (row: TranscriptRow | undefined) => {
  if (row?.kind !== 'meta') throw new Error('expected a meta row');
  return row;
};

const parse = (value: object): TranscriptRecord => {
  const record = parseTranscriptLine(JSON.stringify(value));
  if (record === undefined) throw new Error('fixture did not parse');
  return record;
};

const records = (): TranscriptRecord[] => [
  parse({ type: 'user', timestamp: '2026-06-10T01:00:00.000Z', message: { role: 'user', content: 'fix the build' } }),
  parse({
    type: 'assistant',
    timestamp: '2026-06-10T01:00:10.000Z',
    message: {
      model: 'claude-opus-4-6',
      role: 'assistant',
      content: [
        { type: 'thinking', thinking: '考える…' },
        { type: 'text', text: 'Running the build now.' },
        { type: 'tool_use', id: 'toolu_1', name: 'Bash', input: { command: 'pnpm build' } },
      ],
      usage: { input_tokens: 3, output_tokens: 50, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
    },
  }),
  parse({
    type: 'user',
    timestamp: '2026-06-10T01:00:20.000Z',
    message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: [{ type: 'text', text: 'error TS2322' }], is_error: true }] },
  }),
  parse({ type: 'user', timestamp: '2026-06-10T01:00:25.000Z', isMeta: true, message: { role: 'user', content: '<system-reminder>noise</system-reminder>' } }),
  parse({ type: 'file-history-snapshot', messageId: 'm', snapshot: {} }),
];

describe('buildRows', () => {
  it('flattens records into rows and merges tool results into tool rows', () => {
    const rows = buildRows(records());
    expect(rows.map(r => r.kind)).toEqual(['user', 'thinking', 'assistant-text', 'tool', 'meta']);

    const tools = toolRows(rows);
    expect(tools.map(t => t.name)).toEqual(['Bash']);
    expect(tools.map(t => t.result)).toEqual(['error TS2322']);
    expect(tools.map(t => t.isError)).toEqual([true]);
  });

  it('computes timeline offsets from the first timestamped record', () => {
    const rows = buildRows(records());
    expect(rows[0]?.offsetMs).toBe(0);
    expect(rows[1]?.offsetMs).toBe(10_000);
  });

  it('attaches usage to the last text row of a message', () => {
    const rows = buildRows(records());
    const texts = assistantTextRows(rows);
    expect(texts.map(t => t.usage?.output_tokens)).toEqual([50]);
  });
});

describe('user record classification', () => {
  it('parses slash-command invocations and merges the following stdout record', () => {
    const rows = buildRows([
      parse({
        type: 'user',
        timestamp: '2026-06-10T01:00:00.000Z',
        message: { role: 'user', content: '<command-name>/goal</command-name>\n<command-message>goal</command-message>\n<command-args>ship it</command-args>' },
      }),
      parse({
        type: 'user',
        timestamp: '2026-06-10T01:00:01.000Z',
        message: { role: 'user', content: '<local-command-stdout>Goal set.</local-command-stdout>' },
      }),
    ]);
    expect(rows).toHaveLength(1);
    const row = commandRow(rows[0]);
    expect(row.name).toBe('/goal');
    expect(row.args).toBe('ship it');
    expect(row.stdout).toBe('Goal set.');
  });

  it('keeps orphan stdout as a meta row and drops empty output', () => {
    const rows = buildRows([parse({ type: 'user', message: { role: 'user', content: '<local-command-stdout></local-command-stdout>' } })]);
    expect(rows.map(r => r.kind)).toEqual(['meta']);
    expect(metaRow(rows[0]).detail).toBeUndefined();
  });

  it('classifies caveats, reminders, and generic injected context', () => {
    const rows = buildRows([
      parse({ type: 'user', isMeta: true, message: { role: 'user', content: '<local-command-caveat>careful</local-command-caveat>' } }),
      parse({ type: 'user', isMeta: true, message: { role: 'user', content: '<system-reminder>remember</system-reminder>' } }),
      parse({ type: 'user', isMeta: true, message: { role: 'user', content: 'plain injected context' } }),
    ]);
    expect(rows.map(r => metaRow(r).variant)).toEqual(['caveat', 'reminder', 'context']);
  });

  it('folds local_command system stdout into the preceding command row', () => {
    const rows = buildRows([
      parse({
        type: 'user',
        message: { role: 'user', content: '<command-name>/clear</command-name><command-message>clear</command-message><command-args></command-args>' },
      }),
      parse({ type: 'system', subtype: 'local_command', content: '<local-command-stdout>done</local-command-stdout>' }),
    ]);
    expect(rows).toHaveLength(1);
    const row = commandRow(rows[0]);
    expect(row.args).toBeUndefined();
    expect(row.stdout).toBe('done');
  });
});

describe('toolResultText', () => {
  it('flattens block arrays, passes strings, stringifies objects', () => {
    expect(toolResultText('plain')).toBe('plain');
    expect(
      toolResultText([
        { type: 'text', text: 'a' },
        { type: 'text', text: 'b' },
      ]),
    ).toBe('a\nb');
    expect(toolResultText({ success: true })).toContain('"success": true');
    expect(toolResultText()).toBe('');
  });
});

describe('rowMatches', () => {
  it('searches across row content case-insensitively', () => {
    const rows = buildRows(records());
    expect(rows.filter(r => rowMatches(r, 'ts2322'))).toHaveLength(1);
    expect(rows.filter(r => rowMatches(r, 'pnpm build'))).toHaveLength(1);
    expect(rows.filter(r => rowMatches(r, 'zzz'))).toHaveLength(0);
  });
});
