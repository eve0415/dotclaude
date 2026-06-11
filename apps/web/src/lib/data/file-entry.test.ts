import { describe, expect, it } from 'vitest';

import { entriesFromFiles, fileEntryKey } from './file-entry';

const fakeFile = (name: string, relativePath: string): File => {
  const file = new File(['x'], name, { lastModified: 123 });
  Object.defineProperty(file, 'webkitRelativePath', { value: relativePath });
  return file;
};

describe('entriesFromFiles', () => {
  it('strips the picked root directory from webkitRelativePath', () => {
    const entries = entriesFromFiles([fakeFile('a.jsonl', '.claude/projects/-x/a.jsonl')]);
    expect(entries[0]?.path).toBe('projects/-x/a.jsonl');
  });

  it('uses the bare name for single files without a relative path', () => {
    const entries = entriesFromFiles([fakeFile('session.jsonl', '')]);
    expect(entries[0]?.path).toBe('session.jsonl');
  });

  it('skips files inside ignored bulky directories', () => {
    const entries = entriesFromFiles([fakeFile('snap.sh', '.claude/shell-snapshots/snap.sh'), fakeFile('a.jsonl', '.claude/projects/-x/a.jsonl')]);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.name).toBe('a.jsonl');
  });
});

describe('fileEntryKey', () => {
  it('embeds path, size, and mtime', () => {
    const entries = entriesFromFiles([fakeFile('a.jsonl', '.claude/projects/-x/a.jsonl')]);
    expect(entries.map(e => fileEntryKey(e))).toEqual(['projects/-x/a.jsonl:1:123']);
  });
});
