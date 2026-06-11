import { describe, expect, it } from 'vitest';

import { agentIdFromFileName, decodeProjectDirName, isAgentFileName, isSessionFileName, projectLabel, sessionIdFromFileName } from './project';

describe('session file classification', () => {
  it('recognizes session uuid jsonl files', () => {
    expect(isSessionFileName('e9f1be6e-c805-4acc-869b-f51c2ffb570f.jsonl')).toBe(true);
    expect(isSessionFileName('agent-a3556687861849f.jsonl')).toBe(false);
    expect(isSessionFileName('notes.jsonl')).toBe(false);
  });

  it('recognizes subagent files and extracts ids', () => {
    expect(isAgentFileName('agent-a3556687861849f.jsonl')).toBe(true);
    expect(agentIdFromFileName('agent-a3556687861849f.jsonl')).toBe('a3556687861849f');
    expect(sessionIdFromFileName('e9f1be6e-c805-4acc-869b-f51c2ffb570f.jsonl')).toBe('e9f1be6e-c805-4acc-869b-f51c2ffb570f');
  });
});

describe('decodeProjectDirName', () => {
  it('decodes encoded absolute paths', () => {
    expect(decodeProjectDirName('-workspaces-dotclaude')).toBe('/workspaces/dotclaude');
  });

  it('leaves non-encoded names alone', () => {
    expect(decodeProjectDirName('plain')).toBe('plain');
  });
});

describe('projectLabel', () => {
  it('uses the last path segment', () => {
    expect(projectLabel('/workspaces/dotclaude')).toBe('dotclaude');
    expect(projectLabel('/')).toBe('/');
  });
});
