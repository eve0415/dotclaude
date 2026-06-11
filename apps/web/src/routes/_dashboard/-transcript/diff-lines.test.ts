import { describe, expect, it } from 'vitest';

import { buildDiffLines, splitByMarks } from './diff-lines';

describe('buildDiffLines', () => {
  it('emits removals before paired additions with context preserved', () => {
    const lines = buildDiffLines('keep\nold value\nkeep too', 'keep\nnew value\nkeep too');
    expect(lines.map(line => line.kind)).toEqual(['context', 'remove', 'add', 'context']);
    expect(lines[1]?.text).toBe('old value');
    expect(lines[2]?.text).toBe('new value');
  });

  it('marks only the changed words on similar paired lines', () => {
    const lines = buildDiffLines('const a = 1;', 'const a = 2;');
    const removed = lines.find(line => line.kind === 'remove');
    const added = lines.find(line => line.kind === 'add');
    expect(removed?.marks).toEqual([[10, 11]]);
    expect(added?.marks).toEqual([[10, 11]]);
  });

  it('skips word marks when lines are full rewrites', () => {
    const lines = buildDiffLines('alpha beta gamma', 'one two three four');
    const removed = lines.find(line => line.kind === 'remove');
    expect(removed?.marks).toEqual([]);
  });

  it('tracks source line indices per side for token lookup', () => {
    const lines = buildDiffLines('a\nb\nc', 'a\nB\nc');
    const removed = lines.find(line => line.kind === 'remove');
    const added = lines.find(line => line.kind === 'add');
    expect(removed?.sourceLine).toBe(1);
    expect(added?.sourceLine).toBe(1);
    const lastContext = lines.at(-1);
    expect(lastContext?.kind).toBe('context');
    expect(lastContext?.sourceLine).toBe(2);
  });

  it('handles pure insertion and pure deletion', () => {
    expect(buildDiffLines('', 'added').map(line => line.kind)).toContain('add');
    expect(buildDiffLines('removed', '').map(line => line.kind)).toContain('remove');
  });
});

describe('splitByMarks', () => {
  it('returns the whole text unmarked without marks', () => {
    expect(splitByMarks('hello', 0, [])).toEqual([{ text: 'hello', marked: false }]);
  });

  it('splits a token that straddles a mark boundary', () => {
    expect(splitByMarks('hello world', 0, [[6, 11]])).toEqual([
      { text: 'hello ', marked: false },
      { text: 'world', marked: true },
    ]);
  });

  it('respects the token offset within the line', () => {
    expect(splitByMarks('world', 6, [[6, 11]])).toEqual([{ text: 'world', marked: true }]);
  });

  it('handles multiple disjoint marks', () => {
    expect(
      splitByMarks('a b c', 0, [
        [0, 1],
        [4, 5],
      ]),
    ).toEqual([
      { text: 'a', marked: true },
      { text: ' b ', marked: false },
      { text: 'c', marked: true },
    ]);
  });
});
