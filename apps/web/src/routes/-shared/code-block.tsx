import type { HighlightLang } from '#lib/highlight';
import type { ThemedToken } from 'shiki/core';

import { cn } from '@dotclaude/ui/lib/utils';
import { useMemo } from 'react';

import { tokenColorClass, useHighlightTokens } from '#lib/highlight';

import { ShowAllButton, useTruncated } from './show-all';

export const LineTokens = ({ tokens }: { tokens: ThemedToken[] }) => (
  <>
    {tokens.map((token, i) => {
      const colorClass = tokenColorClass(token.color);
      // Plain tokens stay as bare text nodes — keeps the DOM light in big files.
      if (colorClass === undefined) return token.content;
      return (
        <span key={i} className={colorClass}>
          {token.content}
        </span>
      );
    })}
  </>
);

/**
 * Syntax-highlighted code with an optional line-number gutter. Paints as plain
 * text immediately and swaps colors in once the grammar loads — line count and
 * metrics never change, so virtualized row heights stay stable.
 */
export const CodeBlock = ({
  code,
  lang,
  label,
  showLineNumbers = false,
  startLine = 1,
  flat = false,
  className,
}: {
  code: string;
  lang: HighlightLang | undefined;
  label: string;
  showLineNumbers?: boolean;
  /** First gutter number — Read results start at their offset, not 1. */
  startLine?: number;
  flat?: boolean;
  className?: string;
}) => {
  const tokens = useHighlightTokens(code, lang);
  const lines = useMemo(() => code.split('\n'), [code]);
  const { visibleCount, truncated, expand } = useTruncated(lines.length);
  const gutterStyle = useMemo(() => ({ minWidth: `${String(String(startLine + lines.length - 1).length)}ch` }), [lines.length, startLine]);

  return (
    <div className='min-w-0'>
      <pre className={cn('max-h-[32rem] overflow-auto font-mono text-xs leading-relaxed', flat ? 'p-0' : 'bg-muted/60 rounded-md p-3', className)}>
        <code className='block'>
          {lines.slice(0, visibleCount).map((line, i) => (
            <span key={i} className='flex min-h-[1lh]'>
              {showLineNumbers ? (
                <span aria-hidden className='text-muted-foreground mr-3 shrink-0 text-right tabular-nums select-none' style={gutterStyle}>
                  {startLine + i}
                </span>
              ) : null}
              <span className='min-w-0 flex-1 break-all whitespace-pre-wrap'>{tokens?.[i] ? <LineTokens tokens={tokens[i]} /> : line}</span>
            </span>
          ))}
        </code>
      </pre>
      {truncated ? <ShowAllButton count={lines.length} label={`lines of ${label}`} onClick={expand} /> : null}
    </div>
  );
};
