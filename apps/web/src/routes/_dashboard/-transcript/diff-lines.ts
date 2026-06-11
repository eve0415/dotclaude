import { diffLines, diffWordsWithSpace } from 'diff';

/** Half-open [start, end) character range within a line. */
export type Mark = readonly [number, number];

export interface DiffLine {
  kind: 'context' | 'add' | 'remove';
  text: string;
  /** Line index into the side's source text, for picking syntax tokens. */
  sourceLine: number;
  /** Intraline changed-word ranges (git-style word highlight). */
  marks: Mark[];
}

const splitLines = (value: string): string[] => {
  const trimmed = value.endsWith('\n') ? value.slice(0, -1) : value;
  return trimmed.split('\n');
};

/** Below this shared-character ratio the lines are rewrites — word marks would just paint everything. */
const MIN_SIMILARITY = 0.3;

const wordMarks = (oldLine: string, newLine: string): { old: Mark[]; new: Mark[] } | null => {
  const parts = diffWordsWithSpace(oldLine, newLine);
  let common = 0;
  for (const part of parts) {
    if (!part.added && !part.removed) common += part.value.length;
  }
  if (common / Math.max(oldLine.length, newLine.length, 1) < MIN_SIMILARITY) return null;
  const oldMarks: Mark[] = [];
  const newMarks: Mark[] = [];
  let oldPos = 0;
  let newPos = 0;
  for (const part of parts) {
    const len = part.value.length;
    if (part.removed) oldMarks.push([oldPos, oldPos + len]);
    if (part.added) newMarks.push([newPos, newPos + len]);
    if (!part.added) oldPos += len;
    if (!part.removed) newPos += len;
  }
  return { old: oldMarks, new: newMarks };
};

/**
 * Turn an Edit old/new pair into a unified git-style line sequence: context
 * lines once, removals before the paired additions, with word-level marks on
 * index-paired changed lines.
 */
export const buildDiffLines = (oldText: string, newText: string): DiffLine[] => {
  const out: DiffLine[] = [];
  const changes = diffLines(oldText, newText);
  let oldLineNo = 0;
  let newLineNo = 0;
  let i = 0;
  while (i < changes.length) {
    const change = changes[i];
    if (change === undefined) break;
    if (change.removed) {
      const removedLines = splitLines(change.value);
      const next = changes[i + 1];
      const addedLines = next?.added === true ? splitLines(next.value) : [];
      const removeStart = out.length;
      for (const text of removedLines) {
        out.push({ kind: 'remove', text, sourceLine: oldLineNo, marks: [] });
        oldLineNo += 1;
      }
      for (const text of addedLines) {
        out.push({ kind: 'add', text, sourceLine: newLineNo, marks: [] });
        newLineNo += 1;
      }
      // Pair lines positionally for intraline word marks, like git's word-diff.
      for (let pair = 0; pair < Math.min(removedLines.length, addedLines.length); pair += 1) {
        const removed = out[removeStart + pair];
        const added = out[removeStart + removedLines.length + pair];
        if (removed === undefined || added === undefined) continue;
        const marks = wordMarks(removed.text, added.text);
        if (marks) {
          removed.marks = marks.old;
          added.marks = marks.new;
        }
      }
      i += addedLines.length > 0 ? 2 : 1;
      continue;
    }
    if (change.added) {
      for (const text of splitLines(change.value)) {
        out.push({ kind: 'add', text, sourceLine: newLineNo, marks: [] });
        newLineNo += 1;
      }
      i += 1;
      continue;
    }
    for (const text of splitLines(change.value)) {
      out.push({ kind: 'context', text, sourceLine: newLineNo, marks: [] });
      oldLineNo += 1;
      newLineNo += 1;
    }
    i += 1;
  }
  return out;
};

export interface Segment {
  text: string;
  marked: boolean;
}

/** Split `text` starting at column `offset` into marked/unmarked runs. */
export const splitByMarks = (text: string, offset: number, marks: Mark[]): Segment[] => {
  if (marks.length === 0 || text.length === 0) return [{ text, marked: false }];
  const segments: Segment[] = [];
  let pos = 0;
  const end = text.length;
  while (pos < end) {
    const abs = offset + pos;
    const active = marks.find(([s, e]) => abs >= s && abs < e);
    if (active) {
      const len = Math.min(active[1] - abs, end - pos);
      segments.push({ text: text.slice(pos, pos + len), marked: true });
      pos += len;
      continue;
    }
    let nextStart = Number.POSITIVE_INFINITY;
    for (const [start] of marks) {
      if (start > abs && start < nextStart) nextStart = start;
    }
    const len = nextStart === Number.POSITIVE_INFINITY ? end - pos : Math.min(nextStart - offset, end) - pos;
    segments.push({ text: text.slice(pos, pos + len), marked: false });
    pos += len;
  }
  return segments;
};
