import { describe, expect, it } from 'vitest';

import { extractWikiLinks, parseMemoryFile } from './memory';

const fixture = `---
name: feedback-no-edit-entities
description: Never directly edit generated entity files
metadata:
  node_type: memory
  type: feedback
  originSessionId: 6b2db630-0000-0000-0000-000000000000
---

Never edit generated files directly.

**Why:** they get overwritten.

Related: [[project-codegen-pipeline]] and [[feedback-run-codegen]].
`;

describe('parseMemoryFile', () => {
  it('parses frontmatter, body, and wiki links', () => {
    const memory = parseMemoryFile(fixture);
    expect(memory.name).toBe('feedback-no-edit-entities');
    expect(memory.description).toBe('Never directly edit generated entity files');
    expect(memory.memoryType).toBe('feedback');
    expect(memory.originSessionId).toBe('6b2db630-0000-0000-0000-000000000000');
    expect(memory.body.startsWith('Never edit generated files')).toBe(true);
    expect(memory.links).toEqual(['project-codegen-pipeline', 'feedback-run-codegen']);
  });

  it('treats a file without frontmatter as pure body', () => {
    const memory = parseMemoryFile('# Memory Index\n\n- [A](a.md)');
    expect(memory.name).toBeUndefined();
    expect(memory.body.startsWith('# Memory Index')).toBe(true);
  });

  it('strips quotes from frontmatter values', () => {
    const memory = parseMemoryFile(`---\nname: 'quoted-name'\ndescription: "quoted description"\n---\nbody`);
    expect(memory.name).toBe('quoted-name');
    expect(memory.description).toBe('quoted description');
  });
});

describe('extractWikiLinks', () => {
  it('dedupes and ignores empty links', () => {
    expect(extractWikiLinks('[[a]] [[a]] [[ ]] [[b]]')).toEqual(['a', 'b']);
  });
});
