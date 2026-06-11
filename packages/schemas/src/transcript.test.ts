import { describe, expect, it } from 'vitest';

import { isAssistantRecord, parseTranscriptLine } from './transcript';

const assistantLine = JSON.stringify({
  type: 'assistant',
  uuid: 'a1',
  parentUuid: 'u1',
  sessionId: 's1',
  timestamp: '2026-06-10T01:00:00.000Z',
  isSidechain: false,
  cwd: '/workspaces/demo',
  version: '2.1.172',
  gitBranch: 'main',
  slug: 'fix-build-errors',
  requestId: 'req_1',
  message: {
    model: 'claude-opus-4-6',
    id: 'msg_01',
    type: 'message',
    role: 'assistant',
    content: [
      { type: 'thinking', thinking: '', signature: 'abc' },
      { type: 'text', text: 'Reading the file now.' },
      { type: 'tool_use', id: 'toolu_01', name: 'Bash', input: { command: 'ls' }, caller: { type: 'direct' } },
    ],
    stop_reason: 'tool_use',
    usage: {
      input_tokens: 3,
      cache_creation_input_tokens: 19_266,
      cache_read_input_tokens: 13_863,
      output_tokens: 605,
      service_tier: 'standard',
      cache_creation: { ephemeral_1h_input_tokens: 19_266, ephemeral_5m_input_tokens: 0 },
    },
  },
});

const parsedAssistant = parseTranscriptLine(assistantLine);
const assistantRecord = parsedAssistant !== undefined && isAssistantRecord(parsedAssistant) ? parsedAssistant : undefined;

describe('parseTranscriptLine', () => {
  it('parses an assistant record with content blocks and usage', () => {
    expect(assistantRecord?.message.model).toBe('claude-opus-4-6');
    expect(assistantRecord?.message.content).toHaveLength(3);
    expect(assistantRecord?.message.content[2]?.type).toBe('tool_use');
    expect(assistantRecord?.message.usage?.cache_read_input_tokens).toBe(13_863);
  });

  it('parses a user record with a tool_result block', () => {
    const line = JSON.stringify({
      type: 'user',
      uuid: 'u2',
      sessionId: 's1',
      message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_01', content: 'file-a\nfile-b' }] },
      toolUseResult: { success: true },
    });
    const record = parseTranscriptLine(line);
    expect(record?.type).toBe('user');
  });

  it('parses a plain-string user prompt', () => {
    const record = parseTranscriptLine(JSON.stringify({ type: 'user', message: { role: 'user', content: 'fix the build' } }));
    expect(record?.type).toBe('user');
  });

  it('passes through unknown record types instead of failing', () => {
    const record = parseTranscriptLine(JSON.stringify({ type: 'file-history-snapshot', messageId: 'm1', snapshot: {} }));
    expect(record?.type).toBe('file-history-snapshot');
  });

  it('tolerates unknown content block types', () => {
    const line = JSON.stringify({
      type: 'user',
      message: { role: 'user', content: [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'xx' } }] },
    });
    expect(parseTranscriptLine(line)?.type).toBe('user');
  });

  it('returns undefined for blank and corrupt lines', () => {
    expect(parseTranscriptLine('')).toBeUndefined();
    expect(parseTranscriptLine('   ')).toBeUndefined();
    expect(parseTranscriptLine('{"type": "assist')).toBeUndefined();
    expect(parseTranscriptLine('42')).toBeUndefined();
  });
});
