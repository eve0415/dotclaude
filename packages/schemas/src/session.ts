import type { ToolResultBlock, ToolUseBlock, TranscriptRecord } from './transcript';
import type { UsageTotals } from './usage';

import { isAssistantRecord, isUserRecord } from './transcript';
import { addUsageTotals, emptyUsageTotals, usageToTotals } from './usage';

/** One paired tool invocation: the assistant's `tool_use` and (when present) the matching `tool_result`. */
export interface ToolCall {
  id: string;
  name: string;
  input: unknown;
  result: unknown;
  isError: boolean;
  /** uuid of the assistant record that issued the call. */
  recordUuid: string | undefined;
  timestamp: string | undefined;
}

export interface SessionSummary {
  sessionId: string | undefined;
  slug: string | undefined;
  firstUserPrompt: string | undefined;
  startedAt: string | undefined;
  endedAt: string | undefined;
  durationMs: number | undefined;
  models: string[];
  usage: UsageTotals;
  /** Per-model usage — cost must be priced per model, not on the blended total. */
  usageByModel: Record<string, UsageTotals>;
  toolCounts: Record<string, number>;
  userMessageCount: number;
  assistantMessageCount: number;
  gitBranch: string | undefined;
  cwd: string | undefined;
  version: string | undefined;
}

const firstMeaningfulUserText = (records: TranscriptRecord[]): string | undefined => {
  for (const record of records) {
    if (!isUserRecord(record) || record.isMeta === true) continue;
    const { content } = record.message;
    if (typeof content === 'string') {
      const trimmed = content.trim();
      // Skip harness-injected wrappers (local command output, system reminders).
      if (trimmed === '' || trimmed.startsWith('<')) continue;
      return trimmed;
    }
    for (const block of content) {
      if (block.type === 'text' && 'text' in block && typeof block.text === 'string') {
        const trimmed = block.text.trim();
        if (trimmed !== '' && !trimmed.startsWith('<')) return trimmed;
      }
    }
  }
  return undefined;
};

export const summarizeSession = (records: TranscriptRecord[]): SessionSummary => {
  let sessionId: string | undefined;
  let slug: string | undefined;
  let startedAt: string | undefined;
  let endedAt: string | undefined;
  let gitBranch: string | undefined;
  let cwd: string | undefined;
  let version: string | undefined;
  const models = new Set<string>();
  let usage = emptyUsageTotals();
  const usageByModel: Record<string, UsageTotals> = {};
  const toolCounts: Record<string, number> = {};
  let userMessageCount = 0;
  let assistantMessageCount = 0;

  for (const record of records) {
    sessionId ??= record.sessionId;
    slug ??= record.slug;
    gitBranch ??= record.gitBranch;
    cwd ??= record.cwd;
    version ??= record.version;
    if (record.timestamp !== undefined) {
      startedAt ??= record.timestamp;
      endedAt = record.timestamp;
    }
    if (isUserRecord(record) && record.isMeta !== true && typeof record.message.content === 'string') {
      userMessageCount += 1;
    }
    if (isAssistantRecord(record)) {
      assistantMessageCount += 1;
      const { model } = record.message;
      if (model !== undefined) models.add(model);
      if (record.message.usage !== undefined) {
        const totals = usageToTotals(record.message.usage);
        usage = addUsageTotals(usage, totals);
        if (model !== undefined) {
          usageByModel[model] = addUsageTotals(usageByModel[model] ?? emptyUsageTotals(), totals);
        }
      }
      for (const block of record.message.content) {
        if (block.type === 'tool_use' && 'name' in block && typeof block.name === 'string') {
          toolCounts[block.name] = (toolCounts[block.name] ?? 0) + 1;
        }
      }
    }
  }

  const durationMs = startedAt !== undefined && endedAt !== undefined ? Math.max(0, new Date(endedAt).getTime() - new Date(startedAt).getTime()) : undefined;

  return {
    sessionId,
    slug,
    firstUserPrompt: firstMeaningfulUserText(records),
    startedAt,
    endedAt,
    durationMs,
    models: [...models],
    usage,
    usageByModel,
    toolCounts,
    userMessageCount,
    assistantMessageCount,
    gitBranch,
    cwd,
    version,
  };
};

const isToolUseBlock = (block: { type: string }): block is ToolUseBlock => block.type === 'tool_use';
const isToolResultBlock = (block: { type: string }): block is ToolResultBlock => block.type === 'tool_result';

/** Pair every assistant `tool_use` with its `tool_result` from subsequent user records. */
export const extractToolCalls = (records: TranscriptRecord[]): ToolCall[] => {
  const calls = new Map<string, ToolCall>();
  for (const record of records) {
    if (isAssistantRecord(record)) {
      for (const block of record.message.content) {
        if (isToolUseBlock(block)) {
          calls.set(block.id, {
            id: block.id,
            name: block.name,
            input: block.input,
            result: undefined,
            isError: false,
            recordUuid: record.uuid,
            timestamp: record.timestamp,
          });
        }
      }
    } else if (isUserRecord(record) && typeof record.message.content !== 'string') {
      for (const block of record.message.content) {
        if (isToolResultBlock(block)) {
          const call = calls.get(block.tool_use_id);
          if (call !== undefined) {
            call.result = block.content;
            call.isError = block.is_error === true;
          }
        }
      }
    }
  }
  return [...calls.values()];
};
