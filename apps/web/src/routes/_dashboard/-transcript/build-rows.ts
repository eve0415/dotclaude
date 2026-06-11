import type { TranscriptRecord } from '@dotclaude/schemas/transcript';
import type { TokenUsage } from '@dotclaude/schemas/usage';

import { isAssistantRecord, isUserRecord } from '@dotclaude/schemas/transcript';

/**
 * Flatten transcript records into renderable rows for the virtualized list.
 * One assistant record can yield several rows (thinking, text, tool calls);
 * tool_result user records merge into the tool row they answer instead of
 * appearing on their own.
 */

interface BaseRow {
  /** Stable list key. */
  id: string;
  timestamp: string | undefined;
  /** Milliseconds since the first timestamped record — the timeline gutter value. */
  offsetMs: number | undefined;
}

export interface UserRow extends BaseRow {
  kind: 'user';
  text: string;
}

export interface AssistantTextRow extends BaseRow {
  kind: 'assistant-text';
  markdown: string;
  model: string | undefined;
  /** Usage of the containing message — attached to its last content row only. */
  usage: TokenUsage | undefined;
}

export interface ThinkingRow extends BaseRow {
  kind: 'thinking';
  text: string;
}

export interface ToolRow extends BaseRow {
  kind: 'tool';
  toolUseId: string;
  name: string;
  input: unknown;
  /** Serialized once at build time so per-keystroke search never re-stringifies. */
  inputText: string;
  result: string | undefined;
  isError: boolean;
}

export interface MetaRow extends BaseRow {
  kind: 'meta';
  label: string;
  detail: string | undefined;
}

export type TranscriptRow = UserRow | AssistantTextRow | ThinkingRow | ToolRow | MetaRow;

/** tool_result content is a string or an array of text blocks — flatten for display. */
export const toolResultText = (content?: unknown): string => {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const blocks: unknown[] = content;
    const parts: string[] = [];
    for (const block of blocks) {
      if (typeof block === 'object' && block !== null && 'text' in block && typeof block.text === 'string') parts.push(block.text);
    }
    return parts.join('\n');
  }
  if (content === undefined || content === null) return '';
  return JSON.stringify(content, null, 2);
};

const userText = (content: string | { type: string }[]): string => {
  if (typeof content === 'string') return content;
  const parts: string[] = [];
  for (const block of content) {
    if (block.type === 'text' && 'text' in block && typeof block.text === 'string') parts.push(block.text);
  }
  return parts.join('\n');
};

export const buildRows = (records: TranscriptRecord[]): TranscriptRow[] => {
  const rows: TranscriptRow[] = [];
  const toolRowByUseId = new Map<string, ToolRow>();
  let startTime: number | undefined;

  const offsetOf = (timestamp: string | undefined): number | undefined => {
    if (timestamp === undefined) return undefined;
    const time = new Date(timestamp).getTime();
    if (Number.isNaN(time)) return undefined;
    startTime ??= time;
    return Math.max(0, time - startTime);
  };

  for (const [recordIndex, record] of records.entries()) {
    const { timestamp } = record;
    const offsetMs = offsetOf(timestamp);
    const base = { timestamp, offsetMs };

    if (isUserRecord(record)) {
      if (typeof record.message.content !== 'string') {
        // Block content: merge tool_results into their tool rows, and surface any
        // text blocks as a user row even when they ride alongside tool results.
        for (const block of record.message.content) {
          if (block.type === 'tool_result' && 'tool_use_id' in block && typeof block.tool_use_id === 'string') {
            const toolRow = toolRowByUseId.get(block.tool_use_id);
            if (toolRow !== undefined) {
              toolRow.result = toolResultText('content' in block ? block.content : undefined);
              toolRow.isError = 'is_error' in block && block.is_error === true;
            }
          }
        }
        const text = userText(record.message.content);
        if (text.trim() !== '') rows.push({ ...base, id: `r${recordIndex}`, kind: 'user', text });
        continue;
      }
      const text = record.message.content;
      if (record.isMeta === true) {
        rows.push({ ...base, id: `r${recordIndex}`, kind: 'meta', label: 'injected context', detail: text });
      } else if (text.trim() !== '') {
        rows.push({ ...base, id: `r${recordIndex}`, kind: 'user', text });
      }
      continue;
    }

    if (isAssistantRecord(record)) {
      const { model, usage, content } = record.message;
      const messageRows: TranscriptRow[] = [];
      for (const [blockIndex, block] of content.entries()) {
        const id = `r${recordIndex}b${blockIndex}`;
        if (block.type === 'thinking' && 'thinking' in block && typeof block.thinking === 'string') {
          if (block.thinking !== '') messageRows.push({ ...base, id, kind: 'thinking', text: block.thinking });
        } else if (block.type === 'text' && 'text' in block && typeof block.text === 'string') {
          if (block.text.trim() !== '') messageRows.push({ ...base, id, kind: 'assistant-text', markdown: block.text, model, usage: undefined });
        } else if (block.type === 'tool_use' && 'id' in block && typeof block.id === 'string' && 'name' in block && typeof block.name === 'string') {
          const input = 'input' in block ? block.input : undefined;
          const toolRow: ToolRow = {
            ...base,
            id,
            kind: 'tool',
            toolUseId: block.id,
            name: block.name,
            input,
            inputText: JSON.stringify(input) ?? '',
            result: undefined,
            isError: false,
          };
          toolRowByUseId.set(block.id, toolRow);
          messageRows.push(toolRow);
        }
      }
      // Attach usage to the last text row of the message so the badge appears once.
      for (let i = messageRows.length - 1; i >= 0; i -= 1) {
        const row = messageRows[i];
        if (row?.kind === 'assistant-text') {
          row.usage = usage;
          break;
        }
      }
      rows.push(...messageRows);
      continue;
    }

    if (record.type === 'system' && 'content' in record && typeof record.content === 'string' && record.content !== '') {
      rows.push({ ...base, id: `r${recordIndex}`, kind: 'meta', label: 'system', detail: record.content });
    }
  }

  return rows;
};

/** Case-insensitive in-memory search across row content (the DOM only holds the visible window). */
export const rowMatches = (row: TranscriptRow, needle: string): boolean => {
  const haystacks: string[] = [];
  switch (row.kind) {
    case 'user':
      haystacks.push(row.text);
      break;
    case 'assistant-text':
      haystacks.push(row.markdown);
      break;
    case 'thinking':
      haystacks.push(row.text);
      break;
    case 'tool':
      haystacks.push(row.name, row.inputText, row.result ?? '');
      break;
    case 'meta':
      haystacks.push(row.label, row.detail ?? '');
      break;
  }
  return haystacks.some(h => h.toLowerCase().includes(needle));
};
