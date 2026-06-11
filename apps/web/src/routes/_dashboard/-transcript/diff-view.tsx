import type { HighlightLang } from '#lib/highlight';
import type { DiffLine, Mark } from './diff-lines';
import type { ReactNode } from 'react';
import type { ThemedToken } from 'shiki/core';

import { Button } from '@dotclaude/ui/components/button';
import { cn } from '@dotclaude/ui/lib/utils';
import { useCallback, useMemo, useState } from 'react';

import { tokenColorClass, useHighlightTokens } from '#lib/highlight';

import { buildDiffLines, splitByMarks } from './diff-lines';

const COLLAPSED_DIFF_LINES = 40;

const MARK_CLASS = {
  add: 'bg-(--diff-add-hl) rounded-[2px] text-inherit',
  remove: 'bg-(--diff-remove-hl) rounded-[2px] text-inherit',
} as const;

const renderSegments = (text: string, offset: number, marks: Mark[], markClass: string, colorClass: string | undefined, key: number): ReactNode => {
  const segments = splitByMarks(text, offset, marks);
  return segments.map((segment, i) => {
    if (segment.marked) {
      return (
        <mark key={`${String(key)}.${String(i)}`} className={cn(markClass, colorClass)}>
          {segment.text}
        </mark>
      );
    }
    if (colorClass === undefined) return segment.text;
    return (
      <span key={`${String(key)}.${String(i)}`} className={colorClass}>
        {segment.text}
      </span>
    );
  });
};

const LineContent = ({ line, tokens }: { line: DiffLine; tokens: ThemedToken[] | undefined }) => {
  const markClass = line.kind === 'add' ? MARK_CLASS.add : MARK_CLASS.remove;
  if (tokens === undefined) {
    return renderSegments(line.text, 0, line.marks, markClass, undefined, 0);
  }
  let column = 0;
  const parts: ReactNode[] = [];
  for (const [i, token] of tokens.entries()) {
    parts.push(renderSegments(token.content, column, line.marks, markClass, tokenColorClass(token.color), i));
    column += token.content.length;
  }
  return parts;
};

const ROW_CLASS = {
  context: '',
  add: 'bg-(--diff-add-bg)',
  remove: 'bg-(--diff-remove-bg)',
} as const;

const MARKER_CLASS = {
  context: 'text-muted-foreground/50',
  add: 'text-(--diff-add-fg)',
  remove: 'text-(--diff-remove-fg)',
} as const;

const MARKER_GLYPH = { context: ' ', add: '+', remove: '-' } as const;

const DiffRow = ({ line, tokens }: { line: DiffLine; tokens: ThemedToken[] | undefined }) => {
  const content = <LineContent line={line} tokens={tokens} />;
  return (
    <span className={cn('flex min-h-[1lh] px-2', ROW_CLASS[line.kind])}>
      <span className={cn('w-4 shrink-0 font-semibold select-none', MARKER_CLASS[line.kind])}>{MARKER_GLYPH[line.kind]}</span>
      <span className='min-w-0 flex-1 break-all whitespace-pre-wrap'>
        {line.kind === 'remove' ? <del className='no-underline'>{content}</del> : null}
        {line.kind === 'add' ? <ins className='no-underline'>{content}</ins> : null}
        {line.kind === 'context' ? content : null}
      </span>
    </span>
  );
};

/**
 * Git-style unified diff for an Edit old/new pair: removals then additions,
 * word-level change marks, syntax highlighting layered per side. Colors are
 * design tokens; the +/- markers keep the diff readable without color alone.
 */
export const DiffView = ({ oldText, newText, lang }: { oldText: string; newText: string; lang: HighlightLang | undefined }) => {
  const lines = useMemo(() => buildDiffLines(oldText, newText), [oldText, newText]);
  const oldTokens = useHighlightTokens(oldText, lang);
  const newTokens = useHighlightTokens(newText, lang);
  const [showAll, setShowAll] = useState(false);
  const expand = useCallback(() => {
    setShowAll(true);
  }, []);
  const truncated = !showAll && lines.length > COLLAPSED_DIFF_LINES;
  const visible = truncated ? lines.slice(0, COLLAPSED_DIFF_LINES) : lines;

  return (
    <div className='min-w-0'>
      <pre className='border-border/60 max-h-[32rem] overflow-auto rounded-md border py-1 font-mono text-xs leading-relaxed'>
        <code className='block'>
          {visible.map((line, i) => (
            <DiffRow key={i} line={line} tokens={(line.kind === 'remove' ? oldTokens : newTokens)?.[line.sourceLine]} />
          ))}
        </code>
      </pre>
      {truncated ? (
        <Button variant='ghost' size='sm' className='mt-1 h-6 text-xs' onClick={expand}>
          Show all {lines.length} diff lines
        </Button>
      ) : null}
    </div>
  );
};
