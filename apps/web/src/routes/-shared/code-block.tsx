import type { HighlightLang } from '#lib/highlight';
import type { ThemedToken } from 'shiki/core';

import { Button } from '@dotclaude/ui/components/button';
import { cn } from '@dotclaude/ui/lib/utils';
import { useCallback, useMemo, useState } from 'react';

import { tokenColorClass, useHighlightTokens } from '#lib/highlight';

const COLLAPSED_LINES = 24;

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
  const [showAll, setShowAll] = useState(false);
  const expand = useCallback(() => {
    setShowAll(true);
  }, []);

  const tokens = useHighlightTokens(code, lang);
  const lines = useMemo(() => code.split('\n'), [code]);
  const truncated = !showAll && lines.length > COLLAPSED_LINES;
  const visibleCount = truncated ? COLLAPSED_LINES : lines.length;
  const gutterStyle = useMemo(() => ({ minWidth: `${String(String(startLine + lines.length - 1).length)}ch` }), [lines.length, startLine]);

  return (
    <div className='min-w-0'>
      <pre className={cn('max-h-[32rem] overflow-auto font-mono text-xs leading-relaxed', flat ? 'p-0' : 'bg-muted/60 rounded-md p-3', className)}>
        <code className='block'>
          {lines.slice(0, visibleCount).map((line, i) => (
            <span key={i} className='flex min-h-[1lh]'>
              {showLineNumbers ? (
                <span aria-hidden className='text-muted-foreground/60 mr-3 shrink-0 text-right tabular-nums select-none' style={gutterStyle}>
                  {startLine + i}
                </span>
              ) : null}
              <span className='min-w-0 flex-1 break-all whitespace-pre-wrap'>{tokens?.[i] ? <LineTokens tokens={tokens[i]} /> : line}</span>
            </span>
          ))}
        </code>
      </pre>
      {truncated ? (
        <Button variant='ghost' size='sm' className='mt-1 h-6 text-xs' onClick={expand}>
          Show all {lines.length} lines of {label}
        </Button>
      ) : null}
    </div>
  );
};
