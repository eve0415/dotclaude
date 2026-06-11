import type { ComponentProps } from 'react';
import type { Components, ExtraProps } from 'react-markdown';

import { memo } from 'react';
import Markdown, { defaultUrlTransform } from 'react-markdown';

import { langFromAlias, useHighlightTokens } from '#lib/highlight';

import { LineTokens } from './code-block';

/**
 * Markdown content from transcripts/memories is attacker-controlled (any session
 * file can be opened). react-markdown's default pipeline already escapes raw HTML
 * and its default url transform drops `javascript:` — this wrapper makes that
 * guarantee explicit so a future `components`/library change can't silently lose it.
 * Memoized: virtualized rows remount on scroll, and re-parsing markdown per
 * remount is the expensive part.
 */
const safeUrlTransform = (url: string): string => {
  const transformed = defaultUrlTransform(url);
  return /^(?:javascript|vbscript|data):/i.test(transformed) ? '' : transformed;
};

/** Shared typography for markdown bodies (assistant text, skill output, memories). */
export const markdownClasses =
  'max-w-none text-sm leading-relaxed break-words [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_h1]:mt-3 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:my-2 [&_table]:text-xs [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5';

/**
 * Fenced code blocks (```lang) get syntax highlighting; inline code and fences
 * without a known language fall through to the default rendering. Highlighted
 * output is still plain text nodes inside spans — the XSS posture is unchanged.
 */
const HighlightedCode = ({ className, children }: ComponentProps<'code'> & ExtraProps) => {
  const fenceLang = /language-([\w+-]+)/.exec(className ?? '')?.[1];
  const code = typeof children === 'string' ? children.replace(/\n$/, '') : '';
  const lang = typeof children === 'string' && fenceLang !== undefined ? langFromAlias(fenceLang) : undefined;
  const tokens = useHighlightTokens(code, lang);
  if (tokens === null) return <code className={className}>{children}</code>;
  return (
    <code className={className}>
      {tokens.map((line, i) => (
        <span key={i}>
          {i > 0 ? '\n' : null}
          <LineTokens tokens={line} />
        </span>
      ))}
    </code>
  );
};

const markdownComponents: Components = { code: HighlightedCode };

export const MarkdownBlock = memo(({ markdown }: { markdown: string }) => (
  <Markdown urlTransform={safeUrlTransform} components={markdownComponents}>
    {markdown}
  </Markdown>
));

MarkdownBlock.displayName = 'MarkdownBlock';
