import type { TranscriptRecord } from './transcript';
import type { UsageTotals } from './usage';

import { isAssistantRecord, isUserRecord } from './transcript';
import { addUsageTotals, emptyUsageTotals, usageToTotals } from './usage';

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

/** A human-authored turn: non-empty string content, or blocks with text and no tool_result. */
const isHumanTurn = (content: string | { type: string }[]): boolean => {
  if (typeof content === 'string') return content.trim() !== '';
  if (content.some(block => block.type === 'tool_result')) return false;
  return content.some(block => block.type === 'text');
};

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
  // Map, not object: model names and tool names come straight from the transcript,
  // so keys like "__proto__" must stay plain data instead of touching the prototype.
  const usageByModel = new Map<string, UsageTotals>();
  const toolCounts = new Map<string, number>();
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
    if (isUserRecord(record) && record.isMeta !== true && isHumanTurn(record.message.content)) {
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
          usageByModel.set(model, addUsageTotals(usageByModel.get(model) ?? emptyUsageTotals(), totals));
        }
      }
      for (const block of record.message.content) {
        if (block.type === 'tool_use' && 'name' in block && typeof block.name === 'string') {
          toolCounts.set(block.name, (toolCounts.get(block.name) ?? 0) + 1);
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
    // fromEntries defines own data properties, so hostile keys survive as plain entries.
    usageByModel: Object.fromEntries(usageByModel),
    toolCounts: Object.fromEntries(toolCounts),
    userMessageCount,
    assistantMessageCount,
    gitBranch,
    cwd,
    version,
  };
};
