import type { FileEntry } from './file-entry';

import { describe, expect, it } from 'vitest';

import { scanEntries } from './scan';

const entry = (path: string, size = 100, lastModified = 1_700_000_000_000): FileEntry => ({
  path,
  name: path.split('/').at(-1) ?? path,
  size,
  lastModified,
  getFile: () => Promise.reject(new Error('not needed in scan tests')),
});

const SESSION_A = 'e9f1be6e-c805-4acc-869b-f51c2ffb570f';
const SESSION_B = '6b2db630-1111-4222-8333-444455556666';

describe('scanEntries', () => {
  it('classifies a full ~/.claude root with projects, subagents, memory, and history', () => {
    const index = scanEntries([
      entry(`projects/-workspaces-demo/${SESSION_A}.jsonl`, 5000, 2000),
      entry(`projects/-workspaces-demo/${SESSION_A}/subagents/agent-a3556687861849f.jsonl`),
      entry(`projects/-workspaces-demo/${SESSION_A}/subagents/agent-a3556687861849f.meta.json`),
      entry(`projects/-workspaces-demo/memory/MEMORY.md`),
      entry(`projects/-workspaces-demo/memory/feedback-x.md`),
      entry(`projects/-home-user-app/${SESSION_B}.jsonl`, 300, 1000),
      entry('history.jsonl'),
      entry('settings.json'),
    ]);

    expect(index.projects).toHaveLength(2);
    expect(index.sessionCount).toBe(2);
    expect(index.totalSessionBytes).toBe(5300);
    expect(index.historyEntry?.name).toBe('history.jsonl');

    const demo = index.projects.find(p => p.encodedName === '-workspaces-demo');
    expect(demo?.displayPath).toBe('/workspaces/demo');
    expect(demo?.label).toBe('demo');
    expect(demo?.sessions[0]?.sessionId).toBe(SESSION_A);
    expect(demo?.sessions[0]?.agents).toHaveLength(1);
    expect(demo?.sessions[0]?.agents[0]?.agentId).toBe('a3556687861849f');
    expect(demo?.sessions[0]?.agents[0]?.metaEntry?.name).toBe('agent-a3556687861849f.meta.json');
    expect(demo?.memoryFiles.map(f => f.name)).toEqual(['feedback-x.md', 'MEMORY.md']);
  });

  it('classifies a single project directory', () => {
    const index = scanEntries([entry(`${SESSION_A}.jsonl`), entry(`${SESSION_A}/subagents/agent-ff00ff00ff00ff00.jsonl`), entry('memory/MEMORY.md')]);
    expect(index.projects).toHaveLength(1);
    expect(index.projects[0]?.sessions[0]?.agents).toHaveLength(1);
    expect(index.projects[0]?.memoryFiles).toHaveLength(1);
  });

  it('classifies a single dropped session file', () => {
    const index = scanEntries([entry(`${SESSION_A}.jsonl`)]);
    expect(index.sessionCount).toBe(1);
  });

  it('sorts projects and sessions by recency', () => {
    const index = scanEntries([entry(`projects/-old/${SESSION_A}.jsonl`, 10, 1000), entry(`projects/-new/${SESSION_B}.jsonl`, 10, 9000)]);
    expect(index.projects[0]?.encodedName).toBe('-new');
  });

  it('ignores non-session junk files', () => {
    const index = scanEntries([entry('projects/-x/notes.txt'), entry('daemon.log')]);
    expect(index.sessionCount).toBe(0);
  });
});
