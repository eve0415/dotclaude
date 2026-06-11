import { Badge } from '@dotclaude/ui/components/badge';
import { cn } from '@dotclaude/ui/lib/utils';
import { CircleCheck, CircleDashed, CircleDot } from 'lucide-react';
import { z } from 'zod';

import { formatLineCount } from '#lib/format';
import { langFromPath } from '#lib/highlight';

import { CodeBlock } from '../../-shared/code-block';

import { DiffView } from './diff-view';
import { Collapsible, TruncatedPre } from './primitives';

/**
 * Per-tool renderers for tool_use inputs. Each well-known Claude Code tool
 * gets a purpose-built body; unknown tools fall back to a key-value list
 * (never a raw JSON dump). New tools: add a schema + branch in ToolInputBody.
 */

const bashSchema = z.looseObject({ command: z.string(), description: z.string().optional(), run_in_background: z.boolean().optional() });
const filePathSchema = z.looseObject({ file_path: z.string(), offset: z.number().optional(), limit: z.number().optional() });
const writeSchema = z.looseObject({ file_path: z.string(), content: z.string() });
const editSchema = z.looseObject({ file_path: z.string(), old_string: z.string(), new_string: z.string(), replace_all: z.boolean().optional() });
const searchSchema = z.looseObject({ pattern: z.string(), path: z.string().optional(), glob: z.string().optional(), output_mode: z.string().optional() });
const agentSchema = z.looseObject({
  prompt: z.string(),
  description: z.string().optional(),
  subagent_type: z.string().optional(),
  model: z.string().optional(),
  isolation: z.string().optional(),
  run_in_background: z.boolean().optional(),
});
const skillSchema = z.looseObject({ skill: z.string(), args: z.string().optional() });
const webFetchSchema = z.looseObject({ url: z.string(), prompt: z.string().optional() });
const webSearchSchema = z.looseObject({ query: z.string() });
const todoSchema = z.looseObject({ content: z.string().optional(), subject: z.string().optional(), status: z.string().optional() });
const todoWriteSchema = z.looseObject({ todos: z.array(todoSchema) });

const MonoLine = ({ text, dim = false }: { text: string; dim?: boolean }) => (
  <p className={cn('font-mono text-xs leading-relaxed break-all', dim && 'text-muted-foreground')}>{text}</p>
);

const promptSummary = (prompt: string): string => `prompt · ${formatLineCount(prompt.split('\n').length)}`;

const AgentBody = ({ input }: { input: z.infer<typeof agentSchema> }) => (
  <div className='flex flex-col gap-2'>
    {input.description === undefined ? null : <p className='text-sm font-medium'>{input.description}</p>}
    <div className='flex flex-wrap items-center gap-1.5'>
      {input.isolation === undefined ? null : (
        <Badge variant='outline' className='text-[10px]'>
          {input.isolation}
        </Badge>
      )}
      {input.run_in_background === true ? (
        <Badge variant='outline' className='text-[10px]'>
          background
        </Badge>
      ) : null}
    </div>
    <Collapsible summary={<span>{promptSummary(input.prompt)}</span>}>
      <TruncatedPre flat text={input.prompt} label='prompt' />
    </Collapsible>
  </div>
);

const EditBody = ({ input }: { input: z.infer<typeof editSchema> }) => (
  <div className='flex flex-col gap-2'>
    <MonoLine text={input.file_path} />
    <DiffView oldText={input.old_string} newText={input.new_string} lang={langFromPath(input.file_path)} />
    {input.replace_all === true ? <p className='text-muted-foreground text-[10px]'>replaces every occurrence</p> : null}
  </div>
);

const todoStatusIcon = (status: string | undefined) => {
  if (status === 'completed') return <CircleCheck aria-hidden className='size-3.5 text-emerald-600 dark:text-emerald-500' />;
  if (status === 'in_progress') return <CircleDot aria-hidden className='text-primary size-3.5' />;
  return <CircleDashed aria-hidden className='text-muted-foreground/70 size-3.5' />;
};

const TodoListBody = ({ input }: { input: z.infer<typeof todoWriteSchema> }) => (
  <ul className='flex flex-col gap-1'>
    {input.todos.map((todo, i) => {
      const text = todo.content ?? todo.subject ?? '';
      return (
        <li key={`${String(i)}:${text}`} className='flex items-start gap-2 text-xs leading-relaxed'>
          <span className='mt-0.5 shrink-0'>{todoStatusIcon(todo.status)}</span>
          <span className={cn(todo.status === 'completed' && 'text-muted-foreground line-through')}>{text}</span>
          <span className='sr-only'>{todo.status ?? 'pending'}</span>
        </li>
      );
    })}
  </ul>
);

/** Generic object → definition list; anything else → pretty JSON. */
const FallbackBody = ({ input }: { input: unknown }) => {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return <TruncatedPre flat text={JSON.stringify(input, null, 2) ?? ''} label='input' />;
  }
  const entries = Object.entries(input);
  if (entries.length === 0) return <p className='text-muted-foreground text-xs'>no input</p>;
  return (
    <dl className='flex flex-col gap-1.5'>
      {entries.map(([key, value]) => (
        <div key={key} className='flex flex-col gap-0.5 sm:flex-row sm:gap-3'>
          <dt className='text-muted-foreground w-28 shrink-0 font-mono text-[11px] leading-relaxed'>{key}</dt>
          <dd className='min-w-0 flex-1'>
            {typeof value === 'string' ? (
              <TruncatedPre flat text={value} label={key} />
            ) : (
              <TruncatedPre flat text={JSON.stringify(value, null, 2) ?? ''} label={key} />
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
};

const SEARCH_TOOLS = new Set(['Grep', 'Glob']);
const AGENT_TOOLS = new Set(['Agent', 'Task']);

export const ToolInputBody = ({ name, input }: { name: string; input: unknown }) => {
  if (name === 'Bash') {
    const parsed = bashSchema.safeParse(input);
    if (parsed.success) {
      // The description already heads the card via toolSummary.
      return (
        <div className='flex flex-col gap-1.5'>
          <CodeBlock flat code={parsed.data.command} lang='shellscript' label='command' />
          {parsed.data.run_in_background === true ? <p className='text-muted-foreground text-[10px]'>runs in background</p> : null}
        </div>
      );
    }
  }
  if (AGENT_TOOLS.has(name)) {
    const parsed = agentSchema.safeParse(input);
    if (parsed.success) return <AgentBody input={parsed.data} />;
  }
  if (name === 'Edit') {
    const parsed = editSchema.safeParse(input);
    if (parsed.success) return <EditBody input={parsed.data} />;
  }
  if (name === 'Write') {
    const parsed = writeSchema.safeParse(input);
    if (parsed.success) {
      return (
        <div className='flex flex-col gap-1.5'>
          <MonoLine text={parsed.data.file_path} />
          <Collapsible summary={<span>content · {formatLineCount(parsed.data.content.split('\n').length)}</span>}>
            <CodeBlock showLineNumbers code={parsed.data.content} lang={langFromPath(parsed.data.file_path)} label='content' />
          </Collapsible>
        </div>
      );
    }
  }
  if (name === 'Read') {
    const parsed = filePathSchema.safeParse(input);
    if (parsed.success) {
      const range =
        parsed.data.offset === undefined && parsed.data.limit === undefined
          ? ''
          : ` · lines ${String(parsed.data.offset ?? 1)}–${parsed.data.limit === undefined ? 'end' : String((parsed.data.offset ?? 1) + parsed.data.limit - 1)}`;
      return <MonoLine text={`${parsed.data.file_path}${range}`} />;
    }
  }
  if (SEARCH_TOOLS.has(name)) {
    const parsed = searchSchema.safeParse(input);
    if (parsed.success) {
      const scope = [parsed.data.path, parsed.data.glob].filter(part => part !== undefined).join(' · ');
      return (
        <div className='flex flex-col gap-0.5'>
          <MonoLine text={parsed.data.pattern} />
          {scope === '' ? null : <MonoLine dim text={`in ${scope}`} />}
        </div>
      );
    }
  }
  if (name === 'Skill') {
    const parsed = skillSchema.safeParse(input);
    if (parsed.success) {
      return <MonoLine text={`/${parsed.data.skill}${parsed.data.args === undefined ? '' : ` ${parsed.data.args}`}`} />;
    }
  }
  if (name === 'WebFetch') {
    const parsed = webFetchSchema.safeParse(input);
    if (parsed.success) {
      return (
        <div className='flex flex-col gap-0.5'>
          <MonoLine text={parsed.data.url} />
          {parsed.data.prompt === undefined ? null : <p className='text-muted-foreground text-xs'>{parsed.data.prompt}</p>}
        </div>
      );
    }
  }
  if (name === 'WebSearch') {
    const parsed = webSearchSchema.safeParse(input);
    if (parsed.success) return <MonoLine text={parsed.data.query} />;
  }
  if (name === 'TodoWrite') {
    const parsed = todoWriteSchema.safeParse(input);
    if (parsed.success) return <TodoListBody input={parsed.data} />;
  }
  return <FallbackBody input={input} />;
};

/** Requested model of an Agent/Task call — shown as a badge in the card header. */
export const toolModel = (name: string, input: unknown): string | undefined => {
  if (!AGENT_TOOLS.has(name)) return undefined;
  const parsed = agentSchema.safeParse(input);
  return parsed.success ? parsed.data.model : undefined;
};

/** Short header summary shown next to the tool name while the card is scanned. */
export const toolSummary = (name: string, input: unknown): string | undefined => {
  if (name === 'Bash') {
    const parsed = bashSchema.safeParse(input);
    return parsed.success ? parsed.data.description : undefined;
  }
  if (AGENT_TOOLS.has(name)) {
    const parsed = agentSchema.safeParse(input);
    // The description heads the card body — surface the agent type up top.
    return parsed.success ? parsed.data.subagent_type : undefined;
  }
  if (name === 'Read' || name === 'Write' || name === 'Edit') {
    const parsed = filePathSchema.safeParse(input);
    return parsed.success ? (parsed.data.file_path.split('/').at(-1) ?? undefined) : undefined;
  }
  if (SEARCH_TOOLS.has(name)) {
    const parsed = searchSchema.safeParse(input);
    return parsed.success ? parsed.data.pattern : undefined;
  }
  if (name === 'Skill') {
    const parsed = skillSchema.safeParse(input);
    return parsed.success ? `/${parsed.data.skill}` : undefined;
  }
  if (name === 'WebSearch') {
    const parsed = webSearchSchema.safeParse(input);
    return parsed.success ? parsed.data.query : undefined;
  }
  if (name === 'WebFetch') {
    const parsed = webFetchSchema.safeParse(input);
    return parsed.success ? parsed.data.url : undefined;
  }
  if (name === 'TodoWrite') {
    const parsed = todoWriteSchema.safeParse(input);
    return parsed.success ? `${String(parsed.data.todos.length)} items` : undefined;
  }
  return undefined;
};
