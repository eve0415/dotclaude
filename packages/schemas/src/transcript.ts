import { z } from 'zod';

import { tokenUsageSchema } from './usage';

/**
 * Schemas for Claude Code session transcripts (`projects/<dir>/<session>.jsonl`).
 * Deliberately tolerant: every record type Claude Code may add in the future must
 * still parse — unknown record types fall through to `unknownRecordSchema`, and all
 * objects are loose so new fields survive a round-trip.
 */

// --- assistant content blocks ---

export const thinkingBlockSchema = z.looseObject({
  type: z.literal('thinking'),
  thinking: z.string().default(''),
});

export const textBlockSchema = z.looseObject({
  type: z.literal('text'),
  text: z.string(),
});

export const toolUseBlockSchema = z.looseObject({
  type: z.literal('tool_use'),
  id: z.string(),
  name: z.string(),
  input: z.unknown(),
});

export const toolResultBlockSchema = z.looseObject({
  type: z.literal('tool_result'),
  tool_use_id: z.string(),
  content: z.unknown(),
  is_error: z.boolean().optional(),
});

export const unknownBlockSchema = z.looseObject({
  type: z.string(),
});

export const contentBlockSchema = z.union([thinkingBlockSchema, textBlockSchema, toolUseBlockSchema, toolResultBlockSchema, unknownBlockSchema]);

export type ThinkingBlock = z.infer<typeof thinkingBlockSchema>;
export type TextBlock = z.infer<typeof textBlockSchema>;
export type ToolUseBlock = z.infer<typeof toolUseBlockSchema>;
export type ToolResultBlock = z.infer<typeof toolResultBlockSchema>;
export type ContentBlock = z.infer<typeof contentBlockSchema>;

// --- record envelope ---

const envelopeFields = {
  uuid: z.string().optional(),
  parentUuid: z.string().nullable().optional(),
  sessionId: z.string().optional(),
  timestamp: z.string().optional(),
  isSidechain: z.boolean().optional(),
  isMeta: z.boolean().optional(),
  cwd: z.string().optional(),
  version: z.string().optional(),
  gitBranch: z.string().optional(),
  slug: z.string().optional(),
  agentId: z.string().optional(),
  promptId: z.string().optional(),
};

export const assistantMessageSchema = z.looseObject({
  model: z.string().optional(),
  id: z.string().optional(),
  role: z.literal('assistant').optional(),
  content: z.array(contentBlockSchema).default([]),
  stop_reason: z.string().nullable().optional(),
  usage: tokenUsageSchema.optional(),
});

export const assistantRecordSchema = z.looseObject({
  type: z.literal('assistant'),
  ...envelopeFields,
  message: assistantMessageSchema,
  requestId: z.string().optional(),
  attributionSkill: z.string().optional(),
  attributionAgent: z.string().optional(),
});

export const userMessageSchema = z.looseObject({
  role: z.literal('user').optional(),
  content: z.union([z.string(), z.array(contentBlockSchema)]).default(''),
});

export const userRecordSchema = z.looseObject({
  type: z.literal('user'),
  ...envelopeFields,
  message: userMessageSchema,
  toolUseResult: z.unknown().optional(),
  sourceToolAssistantUUID: z.string().optional(),
});

export const systemRecordSchema = z.looseObject({
  type: z.literal('system'),
  ...envelopeFields,
  subtype: z.string().optional(),
  content: z.string().optional(),
  level: z.string().optional(),
});

export const attachmentRecordSchema = z.looseObject({
  type: z.literal('attachment'),
  ...envelopeFields,
  attachment: z.looseObject({ type: z.string().optional() }).optional(),
});

/** Anything else (`file-history-snapshot`, `permission-mode`, `last-prompt`, future types). */
export const unknownRecordSchema = z.looseObject({
  type: z.string(),
  ...envelopeFields,
});

export type AssistantRecord = z.infer<typeof assistantRecordSchema>;
export type UserRecord = z.infer<typeof userRecordSchema>;
export type SystemRecord = z.infer<typeof systemRecordSchema>;
export type AttachmentRecord = z.infer<typeof attachmentRecordSchema>;
export type UnknownRecord = z.infer<typeof unknownRecordSchema>;

export type TranscriptRecord = AssistantRecord | UserRecord | SystemRecord | AttachmentRecord | UnknownRecord;

const recordSchema = z.union([assistantRecordSchema, userRecordSchema, systemRecordSchema, attachmentRecordSchema, unknownRecordSchema]);

/** Parse one JSONL line. Returns `undefined` for blank lines, corrupt JSON, or non-object payloads. */
export const parseTranscriptLine = (line: string): TranscriptRecord | undefined => {
  const trimmed = line.trim();
  if (trimmed === '') return undefined;
  let json: unknown;
  try {
    json = JSON.parse(trimmed);
  } catch {
    return undefined;
  }
  const result = recordSchema.safeParse(json);
  return result.success ? result.data : undefined;
};

export const isAssistantRecord = (r: TranscriptRecord): r is AssistantRecord => r.type === 'assistant';
export const isUserRecord = (r: TranscriptRecord): r is UserRecord => r.type === 'user';
