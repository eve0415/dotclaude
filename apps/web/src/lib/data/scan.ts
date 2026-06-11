import type { FileEntry } from './file-entry';

import { agentIdFromFileName, decodeProjectDirName, isAgentFileName, isSessionFileName, projectLabel, sessionIdFromFileName } from '@dotclaude/schemas/project';

export interface AgentFileRef {
  agentId: string;
  entry: FileEntry;
  metaEntry: FileEntry | undefined;
}

export interface SessionFileRef {
  sessionId: string;
  entry: FileEntry;
  agents: AgentFileRef[];
}

export interface ProjectRef {
  /** Encoded directory name — the stable id (`-workspaces-my-app`), or `'.'` for a bare project dir. */
  encodedName: string;
  displayPath: string;
  label: string;
  sessions: SessionFileRef[];
  memoryFiles: FileEntry[];
}

/** How the picked input maps onto ~/.claude's layout. */
export type RootKind = 'claude-root' | 'project-dir' | 'single-session';

export interface ClaudeIndex {
  rootKind: RootKind;
  projects: ProjectRef[];
  historyEntry: FileEntry | undefined;
  sessionCount: number;
  totalSessionBytes: number;
}

interface ProjectAccumulator {
  sessions: Map<string, SessionFileRef>;
  pendingAgents: { sessionId: string; agent: AgentFileRef }[];
  pendingMeta: { sessionId: string; agentId: string; entry: FileEntry }[];
  memoryFiles: FileEntry[];
}

const newAccumulator = (): ProjectAccumulator => ({ sessions: new Map(), pendingAgents: [], pendingMeta: [], memoryFiles: [] });

/** Route one file (path relative to its project directory) into the right accumulator bucket. */
const classify = (acc: ProjectAccumulator, relative: string[], entry: FileEntry): void => {
  const [head, ...rest] = relative;
  if (head === undefined) return;
  if (rest.length === 0) {
    if (isSessionFileName(head)) {
      const sessionId = sessionIdFromFileName(head);
      if (sessionId !== undefined) acc.sessions.set(sessionId, { sessionId, entry, agents: [] });
    }
    return;
  }
  if (head === 'memory') {
    if (entry.name.endsWith('.md')) acc.memoryFiles.push(entry);
    return;
  }
  // `<session-uuid>/subagents/agent-<id>.jsonl` and `agent-<id>.meta.json`
  if (rest[0] === 'subagents' && rest.length === 2) {
    const fileName = rest[1] ?? '';
    if (isAgentFileName(fileName)) {
      const agentId = agentIdFromFileName(fileName);
      if (agentId !== undefined) acc.pendingAgents.push({ sessionId: head, agent: { agentId, entry, metaEntry: undefined } });
    } else if (fileName.endsWith('.meta.json')) {
      const agentId = fileName.slice('agent-'.length, -'.meta.json'.length);
      acc.pendingMeta.push({ sessionId: head, agentId, entry });
    }
  }
};

/**
 * Classify a flat file listing into the ~/.claude structure. Handles three pick shapes:
 * the whole `~/.claude` directory (`projects/<encoded>/…`), a single project directory
 * (`<uuid>.jsonl` at the top level), and a single session `.jsonl` file.
 */
export const scanEntries = (entries: readonly FileEntry[]): ClaudeIndex => {
  const projects = new Map<string, ProjectAccumulator>();
  let historyEntry: FileEntry | undefined;

  const accumulatorFor = (encodedName: string): ProjectAccumulator => {
    let acc = projects.get(encodedName);
    if (acc === undefined) {
      acc = newAccumulator();
      projects.set(encodedName, acc);
    }
    return acc;
  };

  let rootKind: RootKind = 'project-dir';
  let sawProjectsDir = false;

  for (const entry of entries) {
    const segments = entry.path.split('/');
    if (segments[0] === 'projects' && segments.length >= 3) {
      sawProjectsDir = true;
      const encodedName = segments[1] ?? '';
      classify(accumulatorFor(encodedName), segments.slice(2), entry);
    } else if (segments.length === 1 && entry.name === 'history.jsonl') {
      historyEntry = entry;
    } else if (segments[0] !== 'projects') {
      classify(accumulatorFor('.'), segments, entry);
    }
  }

  if (sawProjectsDir) {
    rootKind = 'claude-root';
    projects.delete('.');
  } else {
    const bare = projects.get('.');
    if (bare?.sessions.size === 1 && bare.memoryFiles.length === 0 && entries.length === 1) {
      rootKind = 'single-session';
    }
  }

  const projectRefs: ProjectRef[] = [];
  let sessionCount = 0;
  let totalSessionBytes = 0;
  for (const [encodedName, acc] of projects) {
    for (const { sessionId, agent } of acc.pendingAgents) {
      acc.sessions.get(sessionId)?.agents.push(agent);
    }
    for (const { sessionId, agentId, entry } of acc.pendingMeta) {
      const agent = acc.sessions.get(sessionId)?.agents.find(a => a.agentId === agentId);
      if (agent !== undefined) agent.metaEntry = entry;
    }
    const sessions = [...acc.sessions.values()].sort((a, b) => b.entry.lastModified - a.entry.lastModified);
    if (sessions.length === 0 && acc.memoryFiles.length === 0) continue;
    sessionCount += sessions.length;
    for (const s of sessions) totalSessionBytes += s.entry.size;
    const displayPath = encodedName === '.' ? '.' : decodeProjectDirName(encodedName);
    projectRefs.push({
      encodedName,
      displayPath,
      label: encodedName === '.' ? 'project' : projectLabel(displayPath),
      sessions,
      memoryFiles: acc.memoryFiles.sort((a, b) => a.name.localeCompare(b.name)),
    });
  }
  projectRefs.sort((a, b) => (b.sessions[0]?.entry.lastModified ?? 0) - (a.sessions[0]?.entry.lastModified ?? 0));

  return { rootKind, projects: projectRefs, historyEntry, sessionCount, totalSessionBytes };
};
