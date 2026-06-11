import { z } from 'zod';

/** Sidecar metadata for a subagent transcript (`agent-<id>.meta.json`). */
export const agentMetaSchema = z.looseObject({
  agentType: z.string().optional(),
  description: z.string().optional(),
  toolUseId: z.string().optional(),
});

export type AgentMeta = z.infer<typeof agentMetaSchema>;

/** Tolerant parse: malformed JSON or an unexpected shape means "no metadata", never an error. */
export const parseAgentMetaText = (text: string): AgentMeta => {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return {};
  }
  const result = agentMetaSchema.safeParse(json);
  return result.success ? result.data : {};
};
