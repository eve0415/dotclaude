import { memo } from 'react';
import Markdown, { defaultUrlTransform } from 'react-markdown';

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

export const MarkdownBlock = memo(({ markdown }: { markdown: string }) => <Markdown urlTransform={safeUrlTransform}>{markdown}</Markdown>);

MarkdownBlock.displayName = 'MarkdownBlock';
