import { useMemo } from 'react';
import { z } from 'zod';

import { langFromPath } from '#lib/highlight';

import { CodeBlock } from '../../-shared/code-block';
import { MarkdownBlock, markdownClasses } from '../../-shared/markdown-block';

import { TruncatedPre } from './primitives';

/**
 * Per-tool renderers for tool_result payloads. Read results keep their real
 * line numbers and get syntax color from the input's file path; Skill results
 * are the skill's markdown body. Everything else stays a plain pre.
 */

const readInputSchema = z.looseObject({ file_path: z.string() });

const NUMBERED_LINE = /^\s*(\d+)\t/;

interface NumberedContent {
  startLine: number;
  code: string;
  /** Anything after the numbered run (e.g. an appended system-reminder). */
  tail: string;
}

/** Parse the Read tool's `cat -n` shape: a run of `N<TAB>content` lines with consecutive numbers. */
export const parseNumberedResult = (result: string): NumberedContent | null => {
  const lines = result.split('\n');
  const first = NUMBERED_LINE.exec(lines[0] ?? '');
  if (!first) return null;
  let expected = Number(first[1]);
  const startLine = expected;
  const codeLines: string[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? '';
    const match = NUMBERED_LINE.exec(line);
    if (!match || Number(match[1]) !== expected) break;
    codeLines.push(line.slice(match[0].length));
    expected += 1;
    index += 1;
  }
  if (codeLines.length < 2) return null;
  return { startLine, code: codeLines.join('\n'), tail: lines.slice(index).join('\n').trim() };
};

const ReadResultBody = ({ filePath, result }: { filePath: string; result: string }) => {
  const parsed = useMemo(() => parseNumberedResult(result), [result]);
  if (!parsed) return <TruncatedPre flat text={result} label='result' />;
  return (
    <div className='flex flex-col gap-2'>
      <CodeBlock flat showLineNumbers startLine={parsed.startLine} code={parsed.code} lang={langFromPath(filePath)} label='result' />
      {parsed.tail === '' ? null : <TruncatedPre flat text={parsed.tail} label='result notes' className='text-muted-foreground' />}
    </div>
  );
};

export const ToolResultBody = ({ name, input, result }: { name: string; input: unknown; result: string }) => {
  if (name === 'Read') {
    const parsed = readInputSchema.safeParse(input);
    if (parsed.success) return <ReadResultBody filePath={parsed.data.file_path} result={result} />;
  }
  if (name === 'Skill') {
    return (
      <div className={`${markdownClasses} max-h-[32rem] overflow-auto`}>
        <MarkdownBlock markdown={result} />
      </div>
    );
  }
  return <TruncatedPre flat text={result} label='result' />;
};
