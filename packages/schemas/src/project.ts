const SESSION_FILE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jsonl$/;
const AGENT_FILE_PATTERN = /^agent-[0-9a-f]+\.jsonl$/;

/** `<session-uuid>.jsonl` directly under a project directory. */
export const isSessionFileName = (name: string): boolean => SESSION_FILE_PATTERN.test(name);

/** `agent-<hex>.jsonl` under `<session-uuid>/subagents/`. */
export const isAgentFileName = (name: string): boolean => AGENT_FILE_PATTERN.test(name);

export const sessionIdFromFileName = (name: string): string | undefined => (isSessionFileName(name) ? name.slice(0, -'.jsonl'.length) : undefined);

export const agentIdFromFileName = (name: string): string | undefined => (isAgentFileName(name) ? name.slice('agent-'.length, -'.jsonl'.length) : undefined);

/**
 * Best-effort display path for an encoded project directory name
 * (`-workspaces-my-app` → `/workspaces/my-app`). The encoding replaces `/` with `-`,
 * which is lossy for names containing dashes — use the encoded name as the stable id
 * and prefer a `cwd` read from a transcript record when one is available.
 */
export const decodeProjectDirName = (encoded: string): string => {
  if (!encoded.startsWith('-')) return encoded;
  return `/${encoded.slice(1).replaceAll('-', '/')}`;
};

/** Short human label for a project: last path segment of the best display path. */
export const projectLabel = (displayPath: string): string => {
  const segments = displayPath.split('/').filter(s => s !== '');
  return segments.at(-1) ?? displayPath;
};
