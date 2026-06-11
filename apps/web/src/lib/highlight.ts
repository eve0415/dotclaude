import type { HighlighterCore, ThemedToken } from 'shiki/core';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { createCssVariablesTheme, createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

/**
 * Lazy singleton Shiki highlighter. Grammars load on demand per language so
 * the bundle only ever ships the engine plus the grammars a transcript needs.
 * Colors come out as `var(--code-token-*)` references (css-variables theme),
 * so the design system in globals.css owns every syntax color.
 */

const THEME_NAME = 'dotclaude';

/** Grammar loaders, keyed by Shiki language id. Add a line here to support a new language. */
const LANG_LOADERS = {
  typescript: () => import('@shikijs/langs/typescript'),
  tsx: () => import('@shikijs/langs/tsx'),
  javascript: () => import('@shikijs/langs/javascript'),
  jsx: () => import('@shikijs/langs/jsx'),
  json: () => import('@shikijs/langs/json'),
  jsonc: () => import('@shikijs/langs/jsonc'),
  css: () => import('@shikijs/langs/css'),
  html: () => import('@shikijs/langs/html'),
  markdown: () => import('@shikijs/langs/markdown'),
  shellscript: () => import('@shikijs/langs/shellscript'),
  python: () => import('@shikijs/langs/python'),
  rust: () => import('@shikijs/langs/rust'),
  go: () => import('@shikijs/langs/go'),
  yaml: () => import('@shikijs/langs/yaml'),
  toml: () => import('@shikijs/langs/toml'),
  sql: () => import('@shikijs/langs/sql'),
  xml: () => import('@shikijs/langs/xml'),
  swift: () => import('@shikijs/langs/swift'),
  kotlin: () => import('@shikijs/langs/kotlin'),
  java: () => import('@shikijs/langs/java'),
  ruby: () => import('@shikijs/langs/ruby'),
} satisfies Record<string, () => Promise<unknown>>;

export type HighlightLang = keyof typeof LANG_LOADERS;

const EXTENSION_LANG: Record<string, HighlightLang> = {
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'jsx',
  json: 'json',
  jsonl: 'json',
  jsonc: 'jsonc',
  css: 'css',
  html: 'html',
  htm: 'html',
  md: 'markdown',
  mdx: 'markdown',
  sh: 'shellscript',
  bash: 'shellscript',
  zsh: 'shellscript',
  py: 'python',
  rs: 'rust',
  go: 'go',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  sql: 'sql',
  xml: 'xml',
  svg: 'xml',
  swift: 'swift',
  kt: 'kotlin',
  java: 'java',
  rb: 'ruby',
};

/** Pick a highlight language from a file path; undefined means render plain. */
export const langFromPath = (filePath: string): HighlightLang | undefined => {
  const name = filePath.split('/').at(-1) ?? '';
  const ext = name.includes('.') ? (name.split('.').at(-1)?.toLowerCase() ?? '') : '';
  return EXTENSION_LANG[ext];
};

/** Above these sizes highlighting costs more than it helps — render plain. */
const MAX_HIGHLIGHT_CHARS = 100_000;

let highlighterPromise: Promise<HighlighterCore> | null = null;
let highlighter: HighlighterCore | null = null;
const loadedLangs = new Set<HighlightLang>();
const pendingLangs = new Map<HighlightLang, Promise<void>>();

/* Tiny external store: bumps once per grammar load so hooks re-tokenize. */
let storeVersion = 0;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getVersion = (): number => storeVersion;
const notifyLoaded = (): void => {
  storeVersion += 1;
  for (const listener of listeners) listener();
};

const getHighlighter = (): Promise<HighlighterCore> => {
  highlighterPromise ??= (async () => {
    const core = await createHighlighterCore({
      themes: [createCssVariablesTheme({ name: THEME_NAME, variablePrefix: '--code-' })],
      langs: [],
      engine: createJavaScriptRegexEngine({ forgiving: true }),
    });
    highlighter = core;
    return core;
  })();
  return highlighterPromise;
};

const ensureLang = (lang: HighlightLang): Promise<void> => {
  if (loadedLangs.has(lang)) return Promise.resolve();
  const pending = pendingLangs.get(lang);
  if (pending) return pending;
  const load = (async () => {
    const core = await getHighlighter();
    await core.loadLanguage(LANG_LOADERS[lang]());
    loadedLangs.add(lang);
    pendingLangs.delete(lang);
    notifyLoaded();
  })();
  pendingLangs.set(lang, load);
  return load;
};

const tokenCache = new Map<string, ThemedToken[][]>();
const TOKEN_CACHE_MAX = 256;

const tokenizeSync = (code: string, lang: HighlightLang): ThemedToken[][] | null => {
  if (highlighter === null || !loadedLangs.has(lang)) return null;
  const key = `${lang} ${code}`;
  const cached = tokenCache.get(key);
  if (cached) return cached;
  const { tokens } = highlighter.codeToTokens(code, { lang, theme: THEME_NAME });
  if (tokenCache.size >= TOKEN_CACHE_MAX) {
    const oldest = tokenCache.keys().next().value;
    if (oldest !== undefined) tokenCache.delete(oldest);
  }
  tokenCache.set(key, tokens);
  return tokens;
};

/**
 * Tokenize `code`, returning null until the grammar is ready (or when the
 * content is too large / the language unknown — callers render plain text).
 * Progressive: plain text paints first, colors swap in without layout shift.
 */
export const useHighlightTokens = (code: string, lang: HighlightLang | undefined): ThemedToken[][] | null => {
  const version = useSyncExternalStore(subscribe, getVersion, getVersion);
  const enabled = lang !== undefined && code.length <= MAX_HIGHLIGHT_CHARS;

  useEffect(() => {
    if (lang !== undefined && code.length <= MAX_HIGHLIGHT_CHARS && !loadedLangs.has(lang)) void ensureLang(lang);
  }, [code.length, lang]);

  // `version` ties the memo to grammar loads — tokenizeSync flips from null once the lang lands.
  return useMemo(() => (enabled && version >= 0 ? tokenizeSync(code, lang) : null), [code, enabled, lang, version]);
};

/**
 * Map a Shiki css-variables color to a static class so token spans never carry
 * inline styles. Unknown colors (incl. `--code-foreground`) inherit the pre's color.
 */
const TOKEN_COLOR_CLASS: Record<string, string> = {
  'var(--code-token-keyword)': 'text-(--code-token-keyword)',
  'var(--code-token-string)': 'text-(--code-token-string)',
  'var(--code-token-string-expression)': 'text-(--code-token-string-expression)',
  'var(--code-token-comment)': 'text-(--code-token-comment) italic',
  'var(--code-token-constant)': 'text-(--code-token-constant)',
  'var(--code-token-function)': 'text-(--code-token-function)',
  'var(--code-token-parameter)': 'text-(--code-token-parameter)',
  'var(--code-token-punctuation)': 'text-(--code-token-punctuation)',
  'var(--code-token-link)': 'text-(--code-token-link)',
};

export const tokenColorClass = (color: string | undefined): string | undefined => (color === undefined ? undefined : TOKEN_COLOR_CLASS[color]);
